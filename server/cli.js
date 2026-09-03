#!/usr/bin/env node
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');
const config = require('./config');
const auth = require('./auth');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const cfg = config.load();
const SERVICE = process.env.WEBTERM_SERVICE || 'webterm';

function ask(q) { return new Promise((res) => rl.question(q, res)); }
function line(c = '-', n = 52) { console.log(c.repeat(n)); }
function title(t) { console.log('\n' + t); line('='); }

function lanIp() {
  try {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const it of nets[name] || []) {
        if (it && it.family === 'IPv4' && !it.internal) return it.address;
      }
    }
  } catch (e) {}
  return '<server-ip>';
}

function httpsPort() { return Number(process.env.WEBTERM_PORT) || 443; }

function accessUrl() {
  return `https://${lanIp()}:${httpsPort()}${cfg.webpath}`;
}

function run(cmd) {
  try {
    console.log(execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
  } catch (e) {
    const out = (e.stdout ? e.stdout.toString() : '') + (e.stderr ? e.stderr.toString() : '');
    console.log((out || String(e.message)).trim());
  }
}

function showInfo() {
  title('Nexminal access info');
  console.log('  HTTPS   : ' + accessUrl());
  console.log('  Webpath : ' + cfg.webpath);
  console.log('  Language: ' + (cfg.language === 'fa' ? 'Farsi' : 'English'));
  console.log('  Password: ' + (cfg.passwordHash ? 'set' : 'not set yet (first visit)'));
  const s = cfg.ssh || {};
  console.log('  SSH target: ' + s.username + '@' + s.host + ':' + (s.port || 22));
  console.log('  Service : ' + SERVICE + ' -> ' + (serviceActive() ? 'active' : 'inactive'));
  line();
}

function serviceActive() {
  try { return execSync(`systemctl is-active ${SERVICE}`, { encoding: 'utf8' }).trim() === 'active'; }
  catch (e) { return false; }
}

async function changePassword() {
  title('Change admin password');
  const pw = await ask('  New password (at least 6 characters): ');
  if (!pw || String(pw).length < 6) { console.log('  Password too short. (cancelled)'); return; }
  const again = await ask('  Confirm password: ');
  if (pw !== again) { console.log('  The two passwords do not match. (cancelled)'); return; }
  cfg.passwordHash = auth.hashPassword(pw);
  cfg.initialized = true;
  config.save(cfg);
  console.log('  Password saved. Log in with it next time.');
}

async function changeWebpath() {
  title('Change webpath');
  console.log('  Current path: ' + cfg.webpath);
  const choice = await ask('  [1] Generate random path   [2] Enter custom path   [0] Cancel: ');
  let np = null;
  if (choice === '1') np = config.generateWebpath();
  else if (choice === '2') {
    const custom = (await ask('  New path (starts with /, letters/numbers only): ')).trim();
    if (!/^\/[A-Za-z0-9_-]+$/.test(custom)) { console.log('  Invalid format. (cancelled)'); return; }
    np = custom;
  } else return;
  cfg.webpath = np;
  config.save(cfg);
  console.log('  New path saved: ' + np);
  console.log('  New URL: ' + accessUrl());
  console.log('  (The previous version is now invalid)');
}

async function changeSsh() {
  title('Change target SSH connection');
  const cur = cfg.ssh || {};
  const host = (await ask('  Host [' + (cur.host || '127.0.0.1') + ']: ')).trim() || cur.host || '127.0.0.1';
  const port = Number((await ask('  Port [' + (cur.port || 22) + ']: ')).trim()) || cur.port || 22;
  const username = (await ask('  Username [' + (cur.username || 'root') + ']: ')).trim() || cur.username || 'root';
  const password = (await ask('  SSH password (leave empty for no change): ')).trim() || cur.password || '';
  cfg.ssh = { host, port, username, authType: 'password', password };
  config.save(cfg);
  console.log('  SSH connection saved: ' + username + '@' + host + ':' + port);
}

function serviceMenu() {
  title('Service control (' + SERVICE + ')');
  console.log('  [1] Status   [2] Restart   [3] Stop   [4] Start   [0] Back');
  run(`systemctl status ${SERVICE} --no-pager | head -8`);
}

function destroy() {
  title('Completely delete Nexminal');
  const w = ask('  Type DELETE to confirm deletion: ');
  w.then(async (s) => {
    if (String(s).trim() !== 'DELETE') { console.log('  Cancelled.'); rl.close(); return; }
    run(`systemctl disable --now ${SERVICE} 2>/dev/null; rm -f /etc/systemd/system/${SERVICE}.service; systemctl daemon-reload`);
    config.destroy();
    console.log('  Service and config deleted. (Application files are untouched)');
    rl.close();
  });
  return; // keep reading until the DELETE flow resolves
}

async function main() {
  title('Nexminal — management menu');
  showInfo();
  while (true) {
    console.log('\n  [1] Access info');
    console.log('  [2] Change password');
    console.log('  [3] Change webpath');
    console.log('  [4] Change target SSH connection');
    console.log('  [5] Service control');
    console.log('  [6] Completely delete Nexminal');
    console.log('  [0] Exit');
    const choice = (await ask('\n  Choice: ')).trim();
    if (choice === '0' || choice === '' || choice === 'q' || choice === 'exit') break;
    if (choice === '1') showInfo();
    else if (choice === '2') await changePassword();
    else if (choice === '3') await changeWebpath();
    else if (choice === '4') await changeSsh();
    else if (choice === '5') serviceMenu();
    else if (choice === '6') { destroy(); return; }
    else console.log('  Invalid option.');
  }
  rl.close();
}

main();
