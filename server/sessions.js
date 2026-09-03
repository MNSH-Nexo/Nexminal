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

// ------- Weak-network output handling (see below) -------
// The WebSocket to a phone on 2G is narrow and bursty. Forwarding every tiny
// ssh2 'data' chunk as its own WebSocket frame would mean dozens of frames and
// a freshly-emptied per-message deflate per frame. Instead we coalesce chunks
// into one frame per short window: fewer, larger frames compress far better
// because the deflate context is kept across messages (RFC 7692), and frame
// overhead drops. We also apply real backpressure so a slow client never makes
// the server buffer unbounded output into memory.
const BATCH_MS = 20;            // hold output up to this long before sending
const FLUSH_HI = 96 * 1024;     // flush immediately if this much is pending
const PAUSE_HI = 256 * 1024;    // pause the ssh stream above this queued amount
const PAUSE_LO = 48 * 1024;     // resume the stream once queued drains below it
const DRAIN_MS = 150;           // poll frequency for resuming while paused

const sessions = {}; // id -> session

function sendCtrl(ws, obj) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
}

// Bytes queued toward this client = unsent batched text + ws' internal buffer.
function queuedOut(sess) {
  let q = sess.pendLen;
  if (sess.ws && sess.ws.readyState === 1) q += sess.ws.bufferedAmount;
  return q;
}

// Resume the ssh stream once the queue drains low enough. Also clears the poll
// timer when we are no longer paused.
function resumeIfLow(sess) {
  if (!sess.paused) return;
  if (sess.stream && queuedOut(sess) < PAUSE_LO) {
    sess.paused = false;
    try { sess.stream.resume(); } catch (e) {}
  }
  if (!sess.paused) {
    if (sess.drainTimer) { clearInterval(sess.drainTimer); sess.drainTimer = null; }
  }
}

// Send everything currently batched as one WebSocket frame, then try to resume.
function flushOut(sess) {
  if (sess.pendTimer) { clearTimeout(sess.pendTimer); sess.pendTimer = null; }
  if (sess.pend.length) {
    const data = sess.pend.join('');
    sess.pend = [];
    sess.pendLen = 0;
    if (sess.ws && sess.ws.readyState === 1) {
      try { sess.ws.send(data); } catch (e) {}
    }
  }
  resumeIfLow(sess);
}

// Coalesce a new ssh output chunk into the pending batch and arm the timer.
function scheduleFlush(sess) {
  if (!sess.pendTimer) sess.pendTimer = setTimeout(() => flushOut(sess), BATCH_MS);
  if (sess.pendLen >= FLUSH_HI) flushOut(sess); // big chunk -> send at once
}

// Called for every live output chunk. Batches for the wire; pauses the ssh
// stream when the (2G) client can't keep up, resuming when it catches up.
function acceptOut(sess, str) {
  if (!sess.ws || sess.ws.readyState !== 1) return; // no live socket -> history only
  sess.pend.push(str);
  sess.pendLen += str.length;
  scheduleFlush(sess);
  if (!sess.paused && queuedOut(sess) > PAUSE_HI && sess.stream) {
    sess.paused = true;
    try { sess.stream.pause(); } catch (e) {}
    sess.drainTimer = setInterval(() => resumeIfLow(sess), DRAIN_MS);
  }
}

function pushOut(sess, str) {
  sess.buffer.push(str);
  sess.bufferLen += str.length;
  while (sess.bufferLen > BUFFER_CAP && sess.buffer.length) {
    const dropped = sess.buffer.shift();
    sess.bufferLen -= dropped.length;
  }
}

// Reuse the lowest free number so tabs stay 1,2,3… instead of climbing forever
// as sessions are opened and closed. Color follows the number, so #1 is always
// the same hue and a reused number keeps its color.
function nextNumber() {
  const used = new Set(Object.values(sessions).map((s) => s.number));
  let n = 1;
  while (used.has(n)) n++;
  return n;
}

function create() {
  const cfg = load();
  const id = crypto.randomBytes(8).toString('hex');
  const number = nextNumber();
  const sess = {
    id,
    number,
    color: PALETTE[(number - 1) % PALETTE.length],
    host: cfg.ssh.host + ':' + cfg.ssh.port,
    user: cfg.ssh.username,
    buffer: [],
    bufferLen: 0,
    pend: [],
    pendLen: 0,
    pendTimer: null,
    paused: false,
    drainTimer: null,
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
        pushOut(sess, str);       // keep it in the replay ring buffer
        acceptOut(sess, str);     // coalesce + backpressure for the live client
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

  // A fresh client means our previous pause/backlog no longer applies: clear it
  // and let the ssh stream run again (attach replays the ring buffer below).
  if (sess.pendTimer) { clearTimeout(sess.pendTimer); sess.pendTimer = null; }
  if (sess.drainTimer) { clearInterval(sess.drainTimer); sess.drainTimer = null; }
  sess.pend = []; sess.pendLen = 0;
  if (sess.paused && sess.stream) {
    sess.paused = false;
    try { sess.stream.resume(); } catch (e) {}
  }

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
  if (sess.pendTimer) { clearTimeout(sess.pendTimer); sess.pendTimer = null; }
  if (sess.drainTimer) { clearInterval(sess.drainTimer); sess.drainTimer = null; }
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
