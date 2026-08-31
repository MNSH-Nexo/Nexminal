'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const https = require('https');
const express = require('express');
const cookieParser = require('cookie-parser');
const config = require('./config');
const auth = require('./auth');
const sessions = require('./sessions');
const { attachWSServer } = require('./ws');

const cfg = config.load();
const SESSION_COOKIE = 'wt_session';
const APP_ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(APP_ROOT, 'public');
const INDEX_HTML = path.join(PUBLIC_DIR, 'index.html');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));
app.use(cookieParser());

function isAuthed(req) {
  const sid = req.cookies && req.cookies[SESSION_COOKIE];
  return Boolean(sid && auth.isValid(sid));
}

function clientIp(req) {
  return (req.headers['x-forwarded-for'] && String(req.headers['x-forwarded-for']).split(',')[0].trim()) || req.socket.remoteAddress || '0.0.0.0';
}

// ---------- Security headers ----------
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('Referrer-Policy', 'no-referrer');
  res.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' ws: wss:; img-src 'self' data:; font-src 'self' data:");
  next();
});

// ---------- Webpath guard: strip the secret prefix and route from there.
// Routes are defined ONCE relative to '/', so a webpath change takes effect
// immediately (the old path simply stops matching and returns 404). ----------
app.use((req, res, next) => {
  const base = cfg.webpath; // e.g. "/aB3xY..."
  const url = req.originalUrl.split('?')[0];
  if (url === base || url === base + '/') {
    req.url = '/';
    return next();
  }
  if (url.startsWith(base + '/')) {
    req.url = url.slice(base.length);
    return next();
  }
  res.status(404).type('text').send('Not found');
});

// ---------- Vendored xterm assets ----------
const xtermRoot = path.join(APP_ROOT, 'node_modules', '@xterm');
app.use('/vendor', express.static(xtermRoot, { index: false }));

// ---------- Frontend static assets (js, css, html) ----------
// index.html is served by serveIndex() below (webpath injected), so disable
// the automatic "index.html for /" behavior of express.static.
app.use('/', express.static(PUBLIC_DIR, { index: false }));

function serveIndex(res) {
  const html = fs
    .readFileSync(INDEX_HTML, 'utf8')
    .replace(/\{\{WEBPATH\}\}/g, cfg.webpath);
  res.type('html').send(html);
}

function loadPublic() {
  const s = config.load();
  return {
    initialized: s.initialized,
    language: s.language,
    webpath: s.webpath,
    ssh: s.ssh
  };
}

// ---------- State ----------
app.get('/api/state', (req, res) => {
  const s = loadPublic();
  res.json({ ok: true, initialized: cfg.initialized, authed: isAuthed(req), language: s.language, webpath: s.webpath });
});

// ---------- Setup (first run) ----------
app.post('/api/setup', (req, res) => {
  if (cfg.initialized) return res.status(400).json({ error: 'already-initialized' });
  const { password, ssh } = req.body || {};
  if (!password || String(password).length < 6) {
    return res.status(400).json({ error: 'weak-password', message: 'Password must be at least 6 characters.' });
  }
  const host = String((ssh && ssh.host) || '127.0.0.1').trim();
  const port = Number((ssh && ssh.port) || 22);
  const username = String((ssh && ssh.username) || 'root').trim();
  const sshPass = String((ssh && ssh.password) || '');
  if (!host || !username) return res.status(400).json({ error: 'bad-ssh' });

  cfg.initialized = true;
  cfg.passwordHash = auth.hashPassword(String(password));
  cfg.ssh = { host, port, username, authType: 'password', password: sshPass };
  config.save(cfg);

  const sid = auth.createSession();
  auth.clearFailures(clientIp(req));
  setSessionCookie(res, sid);
  res.json({ ok: true, webpath: cfg.webpath });
});

// ---------- Login ----------
app.post('/api/login', (req, res) => {
  if (!cfg.initialized) return res.status(400).json({ error: 'not-initialized' });
  const ip = clientIp(req);
  if (auth.rateBlocked(ip)) {
    return res.status(429).json({ error: 'rate-limited', message: 'Too many attempts. Try again later.' });
  }
  const { password } = req.body || {};
  if (!password || !auth.checkPassword(String(password), cfg.passwordHash)) {
    auth.recordFailure(ip);
    return res.status(401).json({ error: 'bad-credentials' });
  }
  auth.clearFailures(ip);
  const sid = auth.createSession();
  setSessionCookie(res, sid);
  res.json({ ok: true });
});

app.post('/api/logout', (req, res) => {
  const sid = req.cookies && req.cookies[SESSION_COOKIE];
  if (sid) auth.deleteSession(sid);
  res.clearCookie(SESSION_COOKIE, { path: cfg.webpath });
  res.json({ ok: true });
});

function setSessionCookie(res, sid) {
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: cfg.webpath,
    maxAge: 30 * 24 * 3600 * 1000
  });
}

// ---------- Authenticated admin API ----------
app.use('/api', (req, res, next) => {
  if (!isAuthed(req)) return res.status(401).json({ error: 'unauthorized' });
  next();
});

app.get('/api/status', (req, res) => {
  const s = config.load();
  res.json({
    ok: true,
    hostname: os.hostname(),
    platform: os.platform() + ' ' + os.release(),
    uptime: Math.floor(os.uptime()),
    load: os.loadavg().map((x) => +x.toFixed(2)),
    memTotal: os.totalmem(),
    memFree: os.freemem(),
    ssh: s.ssh,
    webpath: s.webpath,
    sslSelfSigned: !(s.https && s.https.certFile)
  });
});

app.post('/api/password', (req, res) => {
  const { current, new: np } = req.body || {};
  if (!current || !auth.checkPassword(String(current), cfg.passwordHash)) {
    return res.status(400).json({ error: 'wrong-password' });
  }
  if (!np || String(np).length < 6) return res.status(400).json({ error: 'weak-password' });
  cfg.passwordHash = auth.hashPassword(String(np));
  config.save(cfg);
  res.json({ ok: true });
});

app.post('/api/webpath', (req, res) => {
  const { value } = req.body || {};
  let next = value && String(value).trim();
  if (next) {
    next = next.replace(/^\/+/, '');
    if (!/^[A-Za-z0-9_-]{8,}$/.test(next)) {
      return res.status(400).json({ error: 'bad-webpath', message: 'Use 8+ characters: letters, numbers, - or _.' });
    }
    next = '/' + next;
  } else {
    next = config.generateWebpath();
  }
  const old = cfg.webpath;
  cfg.webpath = next;
  config.save(cfg);
  res.clearCookie(SESSION_COOKIE, { path: old });
  const sid = auth.createSession();
  setSessionCookie(res, sid);
  res.json({ ok: true, webpath: cfg.webpath });
});

app.post('/api/ssh', (req, res) => {
  const b = req.body || {};
  const host = String(b.host || '').trim();
  const username = String(b.username || '').trim();
  const port = Number(b.port || 22);
  if (!host || !username) return res.status(400).json({ error: 'bad-ssh' });
  cfg.ssh = {
    host, port, username,
    authType: 'password',
    password: (b.password !== undefined ? String(b.password) : cfg.ssh.password)
  };
  config.save(cfg);
  res.json({ ok: true });
});

app.post('/api/language', (req, res) => {
  const lang = (req.body && req.body.lang) === 'en' ? 'en' : 'fa';
  cfg.language = lang;
  config.save(cfg);
  res.json({ ok: true, language: cfg.language });
});

// ---------- Persistent terminal sessions ----------
app.get('/api/sessions', (req, res) => {
  res.json({ ok: true, sessions: sessions.list() });
});

app.post('/api/sessions', (req, res) => {
  const s = sessions.create();
  res.json({ ok: true, id: s.id, number: s.number, color: s.color, host: s.host, user: s.user });
});

app.delete('/api/sessions/:id', (req, res) => {
  const removed = sessions.remove(req.params.id);
  res.json({ ok: true, removed });
});

app.post('/api/delete', (req, res) => {
  const { confirm } = req.body || {};
  if (String(confirm) !== 'DELETE') {
    return res.status(400).json({ error: 'confirm-required' });
  }
  res.json({ ok: true, deleted: true });
  setTimeout(() => {
    try { config.destroy(); } catch (e) {}
    try { process.exit(0); } catch (e) {}
  }, 300);
});

// ---------- Frontend ----------
app.get('/', (req, res) => serveIndex(res));
app.get('/favicon.ico', (req, res) => res.status(204).end());

// ---------- Boot ----------
const PORT = Number(process.env.PORT || process.env.WEBTERM_PORT || 443);

function boot() {
  let key, cert;
  if (cfg.https && cfg.https.certFile && cfg.https.keyFile &&
      fs.existsSync(cfg.https.certFile) && fs.existsSync(cfg.https.keyFile)) {
    key = fs.readFileSync(cfg.https.keyFile);
    cert = fs.readFileSync(cfg.https.certFile);
  } else {
    const c = config.ensureCert();
    key = fs.readFileSync(c.key);
    cert = fs.readFileSync(c.cert);
  }

  const server = https.createServer({ key, cert }, app);
  attachWSServer(server);

  // Optional plain-HTTP redirect to HTTPS. Not fatal if the port is busy
  // (some servers already run a reverse proxy on 80).
  const httpPort = Number(process.env.WEBTERM_HTTP_PORT || 80);
  try {
    const httpSrv = http.createServer((req, res) => {
      res.writeHead(302, { Location: 'https://' + req.headers.host + req.url });
      res.end();
    });
    httpSrv.listen(httpPort);
  } catch (e) {
    console.log('HTTP redirect skipped (port ' + httpPort + ' busy): ' + e.message);
  }

  server.listen(PORT, () => {
    const lan = Object.values(os.networkInterfaces()).flat().find((i) => i && i.family === 'IPv4' && !i.internal);
    console.log('WebTerm running on https://' + (lan ? lan.address : '127.0.0.1') + ':' + PORT);
    console.log('Access path (webpath): ' + cfg.webpath);
  });
}

boot();
