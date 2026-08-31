'use strict';
const { Client } = require('ssh2');
const WebSocket = require('ws');
const { isValid } = require('./auth');
const { load } = require('./config');

function parseCookie(str) {
  const out = {};
  (str || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > -1) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

// Attach a WebSocket endpoint at <webpath>/ws. Only authenticated sessions
// are allowed to upgrade. Binary messages prefixed with '\u0000' carry a JSON
// {rows, cols} resize payload; everything else is terminal input.
function attachWSServer(server) {
  const wss = new WebSocket.Server({ noServer: true });
  const getCfg = () => load();

  server.on('upgrade', (req, socket, head) => {
    const cfg = getCfg();
    const base = cfg.webpath + '/ws';
    if (!req.url.startsWith(base)) { socket.destroy(); return; }
    const cookie = parseCookie(req.headers.cookie);
    if (!cookie.wt_session || !isValid(cookie.wt_session)) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });

  wss.on('connection', (ws) => {
    const conn = new Client();
    let stream = null;

    const endAll = () => {
      if (stream) { try { stream.end(); } catch (e) {} stream = null; }
      try { conn.end(); } catch (e) {}
      if (ws.readyState === WebSocket.OPEN) ws.close();
    };

    conn.on('ready', () => {
      const s = getCfg().ssh;
      conn.shell((err, sh) => {
        if (err) {
          if (ws.readyState === WebSocket.OPEN) { ws.send(JSON.stringify({ err: 'shell: ' + err.message })); }
          endAll();
          return;
        }
        stream = sh;
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ ready: true }));
        sh.on('data', (d) => {
          if (ws.readyState === WebSocket.OPEN) ws.send(d.toString('utf8'));
        });
        sh.on('close', () => { endAll(); });
        sh.on('error', () => { endAll(); });
      });
    });

    conn.on('error', (err) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ err: 'connect: ' + err.message }));
      }
      endAll();
    });

    ws.on('message', (raw) => {
      const str = raw.toString('utf8');
      if (str.charCodeAt(0) === 0) {
        if (stream) {
          try {
            const dims = JSON.parse(str.slice(1));
            stream.setWindow(dims.rows, dims.cols, 0, 0);
          } catch (e) {}
        }
        return;
      }
      if (stream) stream.write(str);
    });

    ws.on('close', () => endAll());
    ws.on('error', () => endAll());

    const s = getCfg().ssh;
    conn.connect({
      host: s.host || '127.0.0.1',
      port: Number(s.port || 22),
      username: s.username || 'root',
      password: s.password || undefined,
      readyTimeout: 12000
    });
  });

  return wss;
}

module.exports = { attachWSServer };
