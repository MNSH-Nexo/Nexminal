'use strict';

/* ------------------------------------------------------------------ */
/* i18n                                                               */
/* ------------------------------------------------------------------ */
const I18N = {
  fa: {
    dir: 'rtl', lang: 'fa',
    setupTitle: 'تنظیم اولیه',
    setupDesc: 'رمز عبور مدیریت را تعیین کنید تا دفعات بعد خودکار وارد شوید.',
    setupPassLabel: 'رمز عبور مدیریت',
    setupSshLabel: 'اتصال SSH (پیش‌فرض: خود سرور)',
    setupBtn: 'ایجاد و ورود',
    loginTitle: 'ورود',
    loginDesc: 'رمز عبور مدیریت را وارد کنید.',
    loginPassLabel: 'رمز عبور',
    loginBtn: 'ورود',
    errWeakPass: 'رمز عبور باید حداقل ۶ کاراکتر باشد.',
    errBadCred: 'رمز عبور اشتباه است.',
    errRate: 'تلاش بیش از حد؛ کمی بعد دوباره امتحان کنید.',
    errSsh: 'تنظیمات SSH نامعتبر است.',
    menuTitle: 'مدیریت',
    statusTitle: 'وضعیت سرور',
    secPassTitle: 'تغییر رمز عبور',
    curPass: 'رمز فعلی',
    newPass: 'رمز جدید',
    savePass: 'ذخیره رمز',
    secPathTitle: 'مسیر (Webpath)',
    secSshTitle: 'اتصال SSH',
    secLangTitle: 'زبان',
    wrongPass: 'رمز فعلی اشتباه است.',
    saved: 'ذخیره شد.',
    pathChanged: 'مسیر تغییر کرد. در حال انتقال…',
    need8: 'مسیر باید حداقل ۸ کاراکتر (حروف/عدد/-/_) باشد.',
    sslSelf: 'گواهی self-signed',
    sslCert: 'گواهی معتبر',
    connecting: 'در حال اتصال…',
    connected: 'متصل',
    disconnected: 'قطع',
    reconnect: 'اتصال دوباره',
    copied: 'کپی شد.',
    copiedAutomatic: 'متن انتخاب‌شده کپی شد.',
    menu: 'منو'
  },
  en: {
    dir: 'ltr', lang: 'en',
    setupTitle: 'Initial setup',
    setupDesc: 'Set an admin password. Next visits will auto-login via a cookie.',
    setupPassLabel: 'Admin password',
    setupSshLabel: 'SSH target (default: this server)',
    setupBtn: 'Create & enter',
    loginTitle: 'Login',
    loginDesc: 'Enter the admin password.',
    loginPassLabel: 'Password',
    loginBtn: 'Login',
    errWeakPass: 'Password must be at least 6 characters.',
    errBadCred: 'Wrong password.',
    errRate: 'Too many attempts; try again later.',
    errSsh: 'Invalid SSH settings.',
    menuTitle: 'Admin',
    statusTitle: 'Server status',
    secPassTitle: 'Change password',
    curPass: 'Current password',
    newPass: 'New password',
    savePass: 'Save password',
    secPathTitle: 'Path (webpath)',
    secSshTitle: 'SSH connection',
    secLangTitle: 'Language',
    wrongPass: 'Current password is wrong.',
    saved: 'Saved.',
    pathChanged: 'Path changed. Redirecting…',
    need8: 'Path needs at least 8 chars (letters/digits/-/_).',
    sslSelf: 'self-signed cert',
    sslCert: 'valid cert',
    connecting: 'Connecting…',
    connected: 'Connected',
    disconnected: 'Disconnected',
    reconnect: 'Reconnect',
    copied: 'Copied.',
    copiedAutomatic: 'Selection copied.',
    menu: 'Menu'
  }
};

let T = I18N.fa;
let state = null;
const $ = (id) => document.getElementById(id);

// The secret webpath is the first segment of the current URL.
const WEBPATH = '/' + (location.pathname.split('/').filter(Boolean)[0] || '');

function setLang(lang) {
  T = I18N[lang] || I18N.fa;
  document.documentElement.lang = T.lang;
  document.documentElement.dir = T.dir;
  const m = {
    'setup-title': 'setupTitle', 'setup-desc': 'setupDesc',
    'setup-pass-label': 'setupPassLabel', 'setup-ssh-label': 'setupSshLabel',
    'setup-btn': 'setupBtn', 'login-title': 'loginTitle', 'login-desc': 'loginDesc',
    'login-pass-label': 'loginPassLabel', 'login-btn': 'loginBtn',
    'menu-title': 'menuTitle', 'status-title': 'statusTitle',
    'sec-pass-title': 'secPassTitle', 'sec-path-title': 'secPathTitle',
    'sec-ssh-title': 'secSshTitle', 'sec-lang-title': 'secLangTitle'
  };
  Object.keys(m).forEach((id) => { if ($(id)) $(id).textContent = T[m[id]]; });
  $('cur-pass').placeholder = T.curPass;
  $('new-pass').placeholder = T.newPass;
  $('btn-change-pass').textContent = T.savePass;
}

async function post(url, body) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {})
  });
  let data = null;
  try { data = await r.json(); } catch (e) {}
  return { status: r.status, data: data || {} };
}

function toast(msg, kind) {
  const el = $('toast');
  el.textContent = msg;
  el.className = 'toast ' + (kind || '');
  el.hidden = false;
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.hidden = true; }, 2500);
}

/* ------------------------------------------------------------------ */
/* Screens                                                            */
/* ------------------------------------------------------------------ */
function showScreen(name) {
  ['setup', 'login', 'term'].forEach((s) => {
    const el = $('screen-' + s);
    el.classList.toggle('visible', s === name);
    el.classList.toggle('centered', s !== 'term');
  });
}

async function boot() {
  const r = await fetch(WEBPATH + '/api/state');
  state = await r.json();
  setLang(state.language || 'fa');
  if (!state.initialized) { showScreen('setup'); bindSetup(); }
  else if (!state.authed) { showScreen('login'); bindLogin(); }
  else { showScreen('term'); initTerminal(); initAdmin(); }
}

/* ------------------------------------------------------------------ */
/* Setup / Login                                                      */
/* ------------------------------------------------------------------ */
function bindSetup() {
  $('setup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('setup-error');
    err.hidden = true;
    const password = $('setup-pass').value;
    const body = {
      password,
      ssh: {
        host: $('setup-host').value.trim() || '127.0.0.1',
        port: Number($('setup-port').value) || 22,
        username: $('setup-user').value.trim() || 'root',
        password: $('setup-sshpass').value
      }
    };
    const { status, data } = await post(WEBPATH + '/api/setup', body);
    if (status === 400) {
      err.textContent = data.error === 'weak-password' ? T.errWeakPass : T.errSsh;
      err.hidden = false; return;
    }
    location.href = WEBPATH + '/';
  });
}

function bindLogin() {
  $('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('login-error');
    err.hidden = true;
    const { status, data } = await post(WEBPATH + '/api/login', { password: $('login-pass').value });
    if (status === 200) { location.reload(); return; }
    err.textContent = data.error === 'rate-limited' ? T.errRate : T.errBadCred;
    err.hidden = false;
  });
}

/* ------------------------------------------------------------------ */
/* Terminal                                                           */
/* ------------------------------------------------------------------ */
let term = null;
let fit = null;
let ws = null;
let wantOpen = true;

function initTerminal() {
  term = new Terminal({
    cursorBlink: true,
    fontSize: 14,
    fontFamily: 'Menlo, Consolas, "Courier New", monospace',
    theme: { background: '#0a0c10', foreground: '#e6edf3', cursor: '#2f81f7', selectionBackground: '#2f81f7' }
  });
  fit = new FitAddon.FitAddon();
  const links = new WebLinksAddon.WebLinksAddon();
  term.loadAddon(fit);
  term.loadAddon(links);
  term.open($('term'));
  fit.fit();

  /* Send keystrokes to the server. Registered ONCE here so reconnects never
     stack duplicate listeners (which would double every typed character). */
  term.onData((data) => { if (ws && ws.readyState === 1) ws.send(data); });

  /* --- Bitvise-style copy: auto-copy on selection --- */
  term.onSelectionChange(() => {
    if (term.hasSelection()) {
      navigator.clipboard.writeText(term.getSelection())
        .then(() => toast(T.copiedAutomatic, 'ok'))
        .catch(() => {});
    }
  });

  /* --- Paste: button + Ctrl+V / Shift+Insert --- */
  $('btn-paste').addEventListener('click', () => pasteText());
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
      e.preventDefault();
      pasteText();
    } else if (e.shiftKey && e.key === 'Insert') {
      e.preventDefault();
      pasteText();
    }
  });
  $('btn-copy').addEventListener('click', () => {
    if (term.hasSelection()) {
      navigator.clipboard.writeText(term.getSelection())
        .then(() => toast(T.copied, 'ok')).catch(() => {});
    }
  });

  /* --- Resize handling --- */
  const onResize = () => { if (fit) fit.fit(); };
  window.addEventListener('resize', onResize);
  const ro = new ResizeObserver(() => fit && fit.fit());
  ro.observe($('term'));

  /* --- Toolbar --- */
  $('btn-reconnect').addEventListener('click', () => { wantOpen = true; connect(); });
  $('btn-font-up').addEventListener('click', () => { term.options.fontSize = Math.min(28, (term.options.fontSize || 14) + 1); onResize(); });
  $('btn-font-down').addEventListener('click', () => { term.options.fontSize = Math.max(9, (term.options.fontSize || 14) - 1); onResize(); });
  $('btn-fullscreen').addEventListener('click', toggleFullscreen);
  $('btn-lang').addEventListener('click', () => {
    const next = T.lang === 'fa' ? 'en' : 'fa';
    post(WEBPATH + '/api/language', { lang: next }).then(() => setLang(next));
  });
  $('btn-menu').addEventListener('click', openMenu);

  connect();
}

async function pasteText() {
  try {
    const t = await navigator.clipboard.readText();
    if (t) term.paste(t);
  } catch (e) {
    /* clipboard permissions denied — fall back to prompt-free via execCommand */
    const ta = document.createElement('textarea');
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.focus();
    document.execCommand('paste');
    const val = ta.value;
    ta.remove();
    if (val) term.paste(val);
  }
}

function toggleFullscreen() {
  if (!document.fullscreenElement) { document.documentElement.requestFullscreen().catch(() => {}); }
  else { document.exitFullscreen().catch(() => {}); }
}

function connect() {
  if (ws) { try { ws.close(); } catch (e) {} }
  setStatus('connecting');
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(proto + '//' + location.host + WEBPATH + '/ws');

  ws.onopen = () => {
    $('term-mask').hidden = false;
    $('mask-msg').textContent = T.connecting;
    term.reset();
    sendResize();
  };

  ws.onmessage = (ev) => {
    const raw = ev.data;
    if (typeof raw === 'string' && raw[0] === '{') {
      try {
        const j = JSON.parse(raw);
        if (j.ready) { $('term-mask').hidden = true; setStatus('on'); }
        if (j.err) { setStatus('err'); $('mask-msg').textContent = j.err; $('term-mask').hidden = false; }
        return;
      } catch (e) {}
    }
    term.write(typeof raw === 'string' ? raw : new Uint8Array(raw));
  };

  ws.onclose = () => {
    if (wantOpen) { setStatus('err'); $('mask-msg').textContent = T.disconnected; $('term-mask').hidden = false; }
  };
  ws.onerror = () => {};
}

function sendResize() {
  const dims = { cols: term.cols, rows: term.rows };
  if (ws && ws.readyState === 1) ws.send('\u0000' + JSON.stringify(dims));
}

function setStatus(kind) {
  const el = $('conn-status');
  el.className = 'badge ' + kind;
  el.textContent = kind === 'on' ? T.connected : kind === 'connecting' ? T.connecting : T.disconnected;
}

/* ------------------------------------------------------------------ */
/* Admin menu                                                         */
/* ------------------------------------------------------------------ */
function openMenu() {
  $('menu').classList.add('open');
  $('overlay').hidden = false;
  loadStatus();
}

function closeMenu() {
  $('menu').classList.remove('open');
  $('overlay').hidden = true;
}

function initAdmin() {
  $('menu-close').addEventListener('click', closeMenu);
  $('overlay').addEventListener('click', closeMenu);

  $('btn-change-pass').addEventListener('click', async () => {
    const { status, data } = await post(WEBPATH + '/api/password', { current: $('cur-pass').value, new: $('new-pass').value });
    const m = $('msg-pass');
    m.hidden = false;
    if (status === 200) { m.className = 'mini-msg'; m.textContent = T.saved; $('cur-pass').value = $('new-pass').value = ''; }
    else { m.className = 'mini-msg warn'; m.textContent = data.error === 'wrong-password' ? T.wrongPass : T.errWeakPass; }
  });

  $('btn-random-path').addEventListener('click', async () => {
    const { status, data } = await post(WEBPATH + '/api/webpath', {});
    if (status === 200 && data.webpath) { toast(T.pathChanged, 'ok'); setTimeout(() => location.href = data.webpath + '/', 400); }
  });
  $('btn-set-path').addEventListener('click', async () => {
    const val = $('new-path').value.trim();
    if (!val) return;
    const { status, data } = await post(WEBPATH + '/api/webpath', { value: val });
    if (status === 200 && data.webpath) { toast(T.pathChanged, 'ok'); setTimeout(() => location.href = data.webpath + '/', 400); }
    else { $('msg-path').textContent = T.need8; }
  });

  $('btn-save-ssh').addEventListener('click', async () => {
    const body = {
      host: $('ssh-host').value.trim(),
      port: Number($('ssh-port').value) || 22,
      username: $('ssh-user').value.trim(),
      password: $('ssh-pass').value
    };
    const { status } = await post(WEBPATH + '/api/ssh', body);
    const m = $('msg-ssh');
    m.hidden = false;
    if (status === 200) { m.className = 'mini-msg'; m.textContent = T.saved; $('ssh-pass').value = ''; wantOpen = true; connect(); }
    else { m.className = 'mini-msg warn'; m.textContent = T.errSsh; }
  });

  $('btn-lang-fa').addEventListener('click', () => post(WEBPATH + '/api/language', { lang: 'fa' }).then(() => setLang('fa')));
  $('btn-lang-en').addEventListener('click', () => post(WEBPATH + '/api/language', { lang: 'en' }).then(() => setLang('en')));
}

async function loadStatus() {
  const r = await fetch(WEBPATH + '/api/status');
  if (!r.ok) return;
  const s = await r.json();
  $('st-hostname').textContent = s.hostname;
  $('st-platform').textContent = s.platform;
  $('st-uptime').textContent = Math.floor(s.uptime / 3600) + 'h ' + Math.floor((s.uptime % 3600) / 60) + 'm';
  $('st-load').textContent = 'load ' + s.load.join(' ');
  $('st-ssh').textContent = s.ssh.host + ':' + s.ssh.port + ' (' + s.ssh.username + ')';
  $('st-ssl').textContent = s.sslSelfSigned ? T.sslSelf : T.sslCert;
  $('cur-path-val').textContent = s.webpath;
  $('ssh-host').value = s.ssh.host;
  $('ssh-port').value = s.ssh.port;
  $('ssh-user').value = s.ssh.username;
}

boot();
