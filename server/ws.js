'use strict';
const WebSocket = require('ws');
const { isValid } = require('./auth');
const { load } = require('./config');
const sessions = require('./sessions');

function parseCookie(str) {
  const out = {};
  (str || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > -1) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

// Attach a WebSocket endpoint at <webpath>/ws?session=<id>. Only authenticated
// sessions may upgrade. Binary messages prefixed with '\u0000' carry a JSON
// {rows, cols} resize payload; everything else is terminal input.
function attachWSServer(server) {
  const wss = new WebSocket.Server({
    noServer: true,
    // Compress terminal output on the wire — big win on slow/limited networks
    // since shell output has lots of repeated whitespace and control chars.
    perMessageDeflate: {
      threshold: 128,
      zlibDeflateOptions: { chunkSize: 1024, memLevel: 7, level: 6 },
      zlibInflateOptions: { chunkSize: 16 * 1024 }
    }
  });
  const getCfg = () => load();
  const HEARTBEAT_MS = 45000; // ~75% of a typical 60s proxy/NAT timeout

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

  wss.on('connection', (ws, req) => {
    let u;
    try { u = new URL(req.url, 'http://localhost'); } catch (e) { u = null; }
    const sid = u ? u.searchParams.get('session') : null;

    // Without a session id we create a brand-new session and attach to it.
    let sess;
    if (sid) {
      sess = sessions.attach(ws, sid);
    } else {
      sess = sessions.create();
      sessions.attach(ws, sess.id);
    }
    if (!sess) return; // attach already sent an error and closed the socket.

    ws.on('message', (raw) => {
      const str = raw.toString('utf8');
      if (str.charCodeAt(0) === 0) {
        try {
          const dims = JSON.parse(str.slice(1));
          sessions.resize(sess.id, dims);
        } catch (e) {}
        return;
      }
      sessions.write(sess.id, str);
    });

    /* Heartbeat: keep the connection alive through NATs/proxies and detect
       half-open ("zombie") connections so we can free them and let the client
       reconnect. */
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
    const heartbeat = setInterval(() => {
      if (ws.isAlive === false) {
        try { ws.terminate(); } catch (e) {}
        return;
      }
      ws.isAlive = false;
      try { ws.ping(); } catch (e) {}
    }, HEARTBEAT_MS);
    ws.on('close', () => clearInterval(heartbeat));
    ws.on('error', () => clearInterval(heartbeat));
  });

  return wss;
}

module.exports = { attachWSServer };
