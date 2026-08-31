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
  title('اطلاعات دسترسی Nexminal');
  console.log('  HTTPS : ' + accessUrl());
  console.log('  Webpath: ' + cfg.webpath);
  console.log('  زبان   : ' + (cfg.language === 'fa' ? 'فارسی' : 'English'));
  console.log('  رمزعبور: ' + (cfg.passwordHash ? 'تنظیم شده' : 'هنوز تنظیم نشده (اولین بازدید)'));
  const s = cfg.ssh || {};
  console.log('  SSH مقصد: ' + s.username + '@' + s.host + ':' + (s.port || 22));
  console.log('  سرویس  : ' + SERVICE + ' -> ' + (serviceActive() ? 'فعال' : 'غیرفعال'));
  line();
}

function serviceActive() {
  try { return execSync(`systemctl is-active ${SERVICE}`, { encoding: 'utf8' }).trim() === 'active'; }
  catch (e) { return false; }
}

async function changePassword() {
  title('تغییر رمز عبور مدیریت');
  const pw = await ask('  رمز عبور جدید (حداقل ۶ کاراکتر): ');
  if (!pw || String(pw).length < 6) { console.log('  رمز خیلی کوتاه است. (لغو شد)'); return; }
  const again = await ask('  تکرار رمز عبور: ');
  if (pw !== again) { console.log('  دو رمز یکسان نیستند. (لغو شد)'); return; }
  cfg.passwordHash = auth.hashPassword(pw);
  cfg.initialized = true;
  config.save(cfg);
  console.log('  رمز عبور ذخیره شد. دفعهٔ بعد با همین رمز وارد شوید.');
}

async function changeWebpath() {
  title('تغییر مسیر (Webpath)');
  console.log('  مسیر فعلی: ' + cfg.webpath);
  const choice = await ask('  [1] ساخت مسیر رندوم   [2] وارد کردن دلخواه   [0] انصراف: ');
  let np = null;
  if (choice === '1') np = config.generateWebpath();
  else if (choice === '2') {
    const custom = (await ask('  مسیر جدید (با / شروع شود، فقط حروف/اعداد): ')).trim();
    if (!/^\/[A-Za-z0-9_-]+$/.test(custom)) { console.log('  فرمت نامعتبر. (لغو شد)'); return; }
    np = custom;
  } else return;
  cfg.webpath = np;
  config.save(cfg);
  console.log('  مسیر جدید ذخیره شد: ' + np);
  console.log('  آدرس جدید: ' + accessUrl());
  console.log('  (نسخهٔ قبلی از همین حالا بی‌اعتبار است)');
}

async function changeSsh() {
  title('تغییر اتصال SSH مقصد');
  const cur = cfg.ssh || {};
  const host = (await ask('  Host [' + (cur.host || '127.0.0.1') + ']: ')).trim() || cur.host || '127.0.0.1';
  const port = Number((await ask('  Port [' + (cur.port || 22) + ']: ')).trim()) || cur.port || 22;
  const username = (await ask('  Username [' + (cur.username || 'root') + ']: ')).trim() || cur.username || 'root';
  const password = (await ask('  SSH password (فقط پسورد، خالی=بدون تغییر): ')).trim() || cur.password || '';
  cfg.ssh = { host, port, username, authType: 'password', password };
  config.save(cfg);
  console.log('  اتصال SSH ذخیره شد: ' + username + '@' + host + ':' + port);
}

function serviceMenu() {
  title('کنترل سرویس (' + SERVICE + ')');
  console.log('  [1] وضعیت   [2] ریاستارت   [3] توقف   [4] شروع   [0] بازگشت');
  run(`systemctl status ${SERVICE} --no-pager | head -8`);
}

function destroy() {
  title('حذف کامل Nexminal');
  const w = ask('  برای حذف کلیدواژهٔ DELETE را تایپ کنید: ');
  w.then(async (s) => {
    if (String(s).trim() !== 'DELETE') { console.log('  لغو شد.'); rl.close(); return; }
    run(`systemctl disable --now ${SERVICE} 2>/dev/null; rm -f /etc/systemd/system/${SERVICE}.service; systemctl daemon-reload`);
    config.destroy();
    console.log('  سرویس و تنظیمات حذف شد. (فایل‌های برنامه دست‌نخورده‌اند)');
    rl.close();
  });
  return; // keep reading until the DELETE flow resolves
}

async function main() {
  title('Nexminal — منوی مدیریت');
  showInfo();
  while (true) {
    console.log('\n  [1] اطلاعات دسترسی');
    console.log('  [2] تغییر رمز عبور');
    console.log('  [3] تغییر مسیر (Webpath)');
    console.log('  [4] تغییر اتصال SSH مقصد');
    console.log('  [5] کنترل سرویس');
    console.log('  [6] حذف کامل Nexminal');
    console.log('  [0] خروج');
    const choice = (await ask('\n  انتخاب: ')).trim();
    if (choice === '0' || choice === '' || choice === 'q' || choice === 'exit') break;
    if (choice === '1') showInfo();
    else if (choice === '2') await changePassword();
    else if (choice === '3') await changeWebpath();
    else if (choice === '4') await changeSsh();
    else if (choice === '5') serviceMenu();
    else if (choice === '6') { destroy(); return; }
    else console.log('  گزینهٔ نامعتبر.');
  }
  rl.close();
}

main();
