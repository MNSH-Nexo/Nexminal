'use strict';
/*
 * Nexminal session manager.
 *
 * Each "session" is a persistent SSH shell that stays alive independently of
 * any single WebSocket. The server keeps a ring buffer of every chunk the
 * shell has printed, so when the browser reconnects (page refresh, or the user
 * switches between tabs) we replay the output instead of losing it.
 *
 * Sessions live in memory for the lifetime of the process. A service restart
 * drops them (acceptable for now; a tmux backend would survive restarts).
 */
const crypto = require('crypto');
const { Client } = require('ssh2');
const { load } = require('./config');

// Curated, muted accent palette — distinct but not garish, readable on dark.
const PALETTE = [
  '#4d8bff', // blue
  '#3ad6d6', // teal
  '#b18cff', // violet
  '#f2b05e', // amber
  '#6fdc8c', // green
  '#ff7d9a', // rose
  '#7fb3d9', // sky
  '#e28ad8'  // orchid
];

// Per-session output ring buffer cap (~600KB).
const BUFFER_CAP = 600000;

const sessions = {}; // id -> session
let counter = 0;

function sendCtrl(ws, obj) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
}

function pushOut(sess, str) {
  sess.buffer.push(str);
  sess.bufferLen += str.length;
  while (sess.bufferLen > BUFFER_CAP && sess.buffer.length) {
    const dropped = sess.buffer.shift();
    sess.bufferLen -= dropped.length;
  }
}

function create() {
  const cfg = load();
  counter += 1;
  const id = crypto.randomBytes(8).toString('hex');
  const sess = {
    id,
    number: counter,
    color: PALETTE[(counter - 1) % PALETTE.length],
    host: cfg.ssh.host + ':' + cfg.ssh.port,
    user: cfg.ssh.username,
    buffer: [],
    bufferLen: 0,
    conn: new Client(),
    stream: null,
    ws: null,
    createdAt: Date.now(),
    ready: false,
    error: null
  };
  sessions[id] = sess;

  const notify = () => {
    if (sess.ws && sess.ws.readyState === 1) sess.ws.send(JSON.stringify({ session: id }));
  };

  sess.conn.on('ready', () => {
    sess.conn.shell((err, sh) => {
      if (err) {
        sess.error = 'shell: ' + err.message;
        sendCtrl(sess.ws, { session: id, err: sess.error });
        return;
      }
      sess.stream = sh;
      sess.ready = true;
      notify();
      sh.on('data', (d) => {
        const str = d.toString('utf8');
        pushOut(sess, str);
        if (sess.ws && sess.ws.readyState === 1) sess.ws.send(str);
      });
      sh.on('close', () => { sess.ready = false; });
      sh.on('error', () => { sess.ready = false; });
    });
  });

  sess.conn.on('error', (err) => {
    sess.error = 'connect: ' + err.message;
    sendCtrl(sess.ws, { session: id, err: sess.error });
  });

  const s = cfg.ssh;
  sess.conn.connect({
    host: s.host || '127.0.0.1',
    port: Number(s.port || 22),
    username: s.username || 'root',
    password: s.password || undefined,
    readyTimeout: 12000
  });

  return sess;
}

// Attach a WebSocket to an existing session. Replays buffered output first so
// the client sees the full scrollback (including everything printed while the
// page was closed or another tab was active).
function attach(ws, id) {
  const sess = sessions[id];
  if (!sess) {
    sendCtrl(ws, { err: 'session-not-found' });
    try { ws.close(); } catch (e) {}
    return null;
  }
  // A session can only have one live client at a time — detach any previous.
  if (sess.ws && sess.ws !== ws) {
    try { sess.ws.close(); } catch (e) {}
  }
  sess.ws = ws;

  sendCtrl(ws, { session: sess.id, replay: true });
  if (sess.buffer.length) ws.send(sess.buffer.join(''));
  if (sess.error) sendCtrl(ws, { err: sess.error });
  else if (sess.ready) sendCtrl(ws, { ready: true });

  ws.on('close', () => { if (sess.ws === ws) sess.ws = null; });
  ws.on('error', () => { if (sess.ws === ws) sess.ws = null; });
  return sess;
}

function write(id, str) {
  const sess = sessions[id];
  if (sess && sess.stream) {
    try { sess.stream.write(str); } catch (e) {}
  }
}

function resize(id, dims) {
  const sess = sessions[id];
  if (sess && sess.stream && dims) {
    try { sess.stream.setWindow(dims.rows, dims.cols, 0, 0); } catch (e) {}
  }
}

function remove(id) {
  const sess = sessions[id];
  if (!sess) return false;
  try { if (sess.ws && sess.ws.readyState === 1) sess.ws.close(); } catch (e) {}
  try { if (sess.stream) sess.stream.end(); } catch (e) {}
  try { sess.conn.end(); } catch (e) {}
  delete sessions[id];
  return true;
}

function list() {
  return Object.values(sessions).map((s) => ({
    id: s.id,
    number: s.number,
    color: s.color,
    host: s.host,
    user: s.user,
    ready: s.ready,
    error: s.error,
    createdAt: s.createdAt
  }));
}

function count() {
  return Object.keys(sessions).length;
}

module.exports = { create, attach, write, resize, remove, list, count };
