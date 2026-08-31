'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Config lives in a data directory so the app can be installed anywhere.
const CONFIG_DIR = process.env.WEBTERM_CONFIG_DIR || path.join(__dirname, '..', 'data');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const CERTS_DIR = path.join(CONFIG_DIR, 'certs');

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

// A long, unpredictable path segment. Served only under this path.
function generateWebpath() {
  return '/' + crypto.randomBytes(18).toString('base64url');
}

function defaultConfig() {
  return {
    version: 1,
    initialized: false,
    webpath: generateWebpath(),
    passwordHash: null,
    ssh: { host: '127.0.0.1', port: 22, username: 'root', authType: 'password', password: '' },
    language: 'fa',
    https: { certFile: '', keyFile: '' },
    createdAt: Date.now()
  };
}

function ensureDir() {
  if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

function load() {
  ensureDir();
  if (!fs.existsSync(CONFIG_FILE)) {
    const cfg = defaultConfig();
    save(cfg);
    return cfg;
  }
  try {
    const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    if (!cfg.webpath) cfg.webpath = generateWebpath();
    if (!cfg.ssh) cfg.ssh = defaultConfig().ssh;
    if (!cfg.https) cfg.https = { certFile: '', keyFile: '' };
    return cfg;
  } catch (e) {
    const cfg = defaultConfig();
    save(cfg);
    return cfg;
  }
}

function save(cfg) {
  ensureDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
}

function destroy() {
  ensureDir();
  if (fs.existsSync(CONFIG_FILE)) fs.unlinkSync(CONFIG_FILE);
}

// Generate (or use) a TLS certificate. For IP-only installs we create a
// self-signed cert so HTTPS works out of the box; for a real domain the
// installer obtains a Let's Encrypt cert and points config.https at it.
function ensureCert() {
  const key = path.join(CERTS_DIR, 'key.pem');
  const cert = path.join(CERTS_DIR, 'cert.pem');
  fs.mkdirSync(CERTS_DIR, { recursive: true });
  if (fs.existsSync(key) && fs.existsSync(cert)) {
    return { key, cert, selfSigned: true };
  }
  const { execSync } = require('child_process');
  const subject = `/CN=webterm`;
  try {
    execSync(
      `openssl req -x509 -nodes -newkey rsa:2048 -keyout ${JSON.stringify(key)} ` +
      `-out ${JSON.stringify(cert)} -days 3650 -subj ${JSON.stringify(subject)} -sha256`,
      { stdio: 'ignore' }
    );
  } catch (e) {
    throw new Error('Could not generate TLS certificate. Is openssl installed?');
  }
  return { key, cert, selfSigned: true };
}

module.exports = { load, save, destroy, randomToken, generateWebpath, ensureCert, CONFIG_DIR, CONFIG_FILE, CERTS_DIR };
