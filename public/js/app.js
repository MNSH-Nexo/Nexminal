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
    curPath: 'مسیر فعلی',
    pathPlaceholder: 'یک مسیر دلخواه بنویسید یا رندوم بسازید',
    savePath: 'ذخیره مسیر',
    randomPath: 'ساخت رندوم',
    secSshTitle: 'اتصال SSH',
    saveSsh: 'ذخیره اتصال',
    secLangTitle: 'زبان',
    langFa: 'فارسی',
    langEn: 'English',
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
    reconnecting: 'در حال اتصال مجدد…',
    copied: 'کپی شد.',
    copiedAutomatic: 'متن انتخاب‌شده کپی شد.',
    menu: 'منو',
    copy: 'کپی',
    paste: 'چسباندن',
    fontDown: 'کوچک‌کردن متن',
    fontUp: 'بزرگ‌کردن متن',
    fontA: 'A',
    fullscreen: 'تمام‌صفحه',
    language: 'زبان',
    newSession: 'ترمینال جدید',
    close: 'بستن',
    deleteTitle: 'حذف ترمینال',
    deleteDesc: 'این ترمینال و تمام خروجی آن بسته و حذف می‌شود.',
    cancel: 'انصراف',
    deleteBtn: 'حذف',
    deleteSess: 'حذف ترمینال',
    deleteFail: 'حذف انجام نشد.',
    noSessions: 'هیچ ترمینالی باز نیست',
    noSessionsDesc: 'برای شروع، یک ترمینال جدید بسازید.',
    startTerminal: 'ساخت ترمینال جدید',
    sessionErr: 'خطا در اتصال'
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
    curPath: 'Current path',
    pathPlaceholder: 'Type a custom path or generate a random one',
    savePath: 'Save path',
    randomPath: 'Random',
    secSshTitle: 'SSH connection',
    saveSsh: 'Save connection',
    secLangTitle: 'Language',
    langFa: 'فارسی',
    langEn: 'English',
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
    reconnecting: 'Reconnecting…',
    copied: 'Copied.',
    copiedAutomatic: 'Selection copied.',
    menu: 'Menu',
    copy: 'Copy',
    paste: 'Paste',
    fontDown: 'Smaller text',
    fontUp: 'Larger text',
    fontA: 'A',
    fullscreen: 'Fullscreen',
    language: 'Language',
    newSession: 'New terminal',
    close: 'Close',
    deleteTitle: 'Delete terminal',
    deleteDesc: 'This terminal and all its output will be closed and removed.',
    cancel: 'Cancel',
    deleteBtn: 'Delete',
    deleteSess: 'Delete terminal',
    deleteFail: 'Delete failed.',
    noSessions: 'No open terminals',
    noSessionsDesc: 'Create a new terminal to get started.',
    startTerminal: 'Create new terminal',
    sessionErr: 'Connection error'
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
  // Static [data-i18n] texts.
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = T[el.dataset.i18n] || el.textContent;
  });
  // Placeholders.
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = T[el.dataset.i18nPlaceholder] || el.placeholder;
  });
  // Titles / tooltips.
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    el.title = T[el.dataset.i18nTitle] || el.title;
  });
  // Language toggle button shows the OTHER language code.
  const langBtn = $('btn-lang');
  if (langBtn) langBtn.textContent = lang === 'fa' ? 'EN' : 'FA';
  // Dynamic bits that depend on current screen.
  if (emptyBtn) emptyBtn.textContent = T.startTerminal;
  if (sessions.length === 0 && !activeId && $('screen-term').classList.contains('visible')) {
    $('mask-msg').textContent = T.noSessionsDesc;
  }
  renderTabs();
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
  el.className = 'toast show ' + (kind || '');
  el.hidden = false;
  clearTimeout(el._t);
  el._t = setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => { el.hidden = true; }, 300);
  }, 2400);
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
  else { showScreen('term'); initTerminal(); initAdmin(); initSessions(); }
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
/* Terminal — one shared xterm instance, attached to a session        */
/* ------------------------------------------------------------------ */
let term = null;
let fit = null;
let ws = null;
let wsToken = 0;
let sessions = [];
let activeId = null;
let emptyBtn = null;
let retry = null;
// Latched modifiers for the mobile keybar.
const mods = { ctrl: false, alt: false, shift: false };

function initTerminal() {
  term = new Terminal({
    cursorBlink: true,
    fontSize: 14,
    fontFamily: 'Menlo, Consolas, "Courier New", monospace',
    theme: { background: '#04060b', foreground: '#e7ecf6', cursor: '#4d8bff', selectionBackground: '#3d5a99' }
  });
  fit = new FitAddon.FitAddon();
  const links = new WebLinksAddon.WebLinksAddon();
  term.loadAddon(fit);
  term.loadAddon(links);
  term.open($('term'));
  fit.fit();

  /* Keystrokes → the active session. Registered ONCE so reconnects never
     stack duplicate listeners. sendInput() applies any latched mobile keybar
     modifiers (CTRL/ALT/SHIFT) before forwarding. */
  term.onData((data) => sendInput(data));

  /* Native paste support: let xterm's hidden textarea handle Ctrl+V. */
  term.attachCustomKeyEventHandler((e) => {
    if (e.type === 'keydown' && (e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
      return false;
    }
    return true;
  });

  /* Bitvise-style auto-copy on selection. */
  term.onSelectionChange(() => {
    if (term.hasSelection()) {
      navigator.clipboard.writeText(term.getSelection())
        .then(() => toast(T.copiedAutomatic, 'ok'))
        .catch(() => {});
    }
  });

  /* Paste button + Shift+Insert. */
  $('btn-paste').addEventListener('click', () => pasteText());
  document.addEventListener('keydown', (e) => {
    if (e.shiftKey && e.key === 'Insert') { e.preventDefault(); pasteText(); }
  });
  $('btn-copy').addEventListener('click', () => {
    if (term.hasSelection()) {
      navigator.clipboard.writeText(term.getSelection())
        .then(() => toast(T.copied, 'ok')).catch(() => {});
    }
  });

  /* Resize handling. */
  const onResize = () => { if (fit) fit.fit(); };
  window.addEventListener('resize', onResize);
  const ro = new ResizeObserver(() => fit && fit.fit());
  ro.observe($('term'));

  /* Toolbar. */
  $('btn-reconnect').addEventListener('click', () => { if (activeId) attach(activeId); });
  $('btn-font-up').addEventListener('click', () => { term.options.fontSize = Math.min(28, (term.options.fontSize || 14) + 1); onResize(); });
  $('btn-font-down').addEventListener('click', () => { term.options.fontSize = Math.max(9, (term.options.fontSize || 14) - 1); onResize(); });
  $('btn-fullscreen').addEventListener('click', toggleFullscreen);
  $('btn-lang').addEventListener('click', () => {
    const next = T.lang === 'fa' ? 'en' : 'fa';
    post(WEBPATH + '/api/language', { lang: next }).then(() => setLang(next));
  });
  $('btn-menu').addEventListener('click', openMenu);

  /* Session tabs. */
  $('btn-add-session').addEventListener('click', createSession);
  $('session-tabs').addEventListener('click', (e) => {
    const del = e.target.closest('.sess-del');
    const tab = e.target.closest('.sess-tab');
    if (del) { e.stopPropagation(); confirmDelete(del.dataset.id); return; }
    if (tab && tab.dataset.id && tab.dataset.id !== activeId) attach(tab.dataset.id);
  });

  /* Empty-state "create" button inside the mask. */
  const maskInner = document.querySelector('#term-mask .mask-inner');
  emptyBtn = document.createElement('button');
  emptyBtn.className = 'btn primary empty-start';
  emptyBtn.textContent = T.startTerminal;
  emptyBtn.addEventListener('click', createSession);
  maskInner.appendChild(emptyBtn);

  initKeybar();
  updateKeybar();
  window.addEventListener('resize', updateKeybar);
}

/* --- Mobile keybar (Termux-style) --- */
function initKeybar() {
  const kb = $('keybar');
  if (!kb) return;
  kb.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.mod === 'ctrl') { toggleMod('ctrl'); return; }
    if (b.dataset.mod === 'alt') { toggleMod('alt'); return; }
    if (b.dataset.mod === 'shift') { toggleMod('shift'); return; }
    if (b.dataset.mod === 'esc') { clearMods(); sendRaw('\x1b'); return; }
    if (b.dataset.mod === 'tab') { clearMods(); sendRaw('\t'); return; }
    if (b.dataset.chr) { sendWithMods(b.dataset.chr); return; }
    if (b.dataset.key) {
      if (b.dataset.key === 'clear') { clearMods(); term.clear(); return; }
      sendNav(b.dataset.key); return;
    }
    if (b.dataset.sess === 'prev') { cycleSession(-1); return; }
    if (b.dataset.sess === 'next') { cycleSession(1); return; }
    if (b.dataset.sess === 'new') { createSession(); return; }
  });
}

function updateKeybar() {
  // Keybar visibility is handled entirely by CSS (@media (hover:none),(max-width:1024px))
  // so it always shows on phones/tablets even before/without JS. Here we only
  // release any latched modifier when the keybar isn't actually on screen.
  const shown = window.matchMedia('(hover: none) and (pointer: coarse)').matches ||
                window.innerWidth < 1024;
  if (!shown) clearMods();
}

function toggleMod(k) { mods[k] = !mods[k]; updateMods(); }
function clearMods() { mods.ctrl = mods.alt = mods.shift = false; updateMods(); }
function updateMods() {
  ['ctrl', 'alt', 'shift'].forEach((k) => {
    document.querySelectorAll('[data-mod="' + k + '"]').forEach((b) => b.classList.toggle('active', mods[k]));
  });
}

function sendRaw(str) {
  if (ws && ws.readyState === 1) ws.send(str);
}

/* Apply latched modifiers to a physical-key string and send it. */
function sendInput(data) {
  if (!data) return;
  const active = mods.ctrl || mods.alt || mods.shift;
  if (!active) { sendRaw(data); return; }
  if (data.length === 1) { sendWithMods(data); return; }
  // Multi-char (Enter, Backspace, …): drop latched modifiers and pass through.
  clearMods();
  sendRaw(data);
}

/* Apply latched modifiers to a single character (from the physical keyboard
   or a keybar symbol key) and send the resulting sequence. */
function sendWithMods(ch) {
  if (mods.ctrl) {
    mods.ctrl = false;
    const cc = ch.toLowerCase().charCodeAt(0);
    if (cc >= 97 && cc <= 122) { sendRaw(String.fromCharCode(cc - 96)); } // a→^A … z→^Z
    else { sendRaw(ch); } // Ctrl+non-letter: pass through
  } else if (mods.alt) {
    mods.alt = false;
    sendRaw('\x1b' + ch); // Alt+key = ESC then key
  } else if (mods.shift) {
    mods.shift = false;
    sendRaw(ch.toUpperCase());
  } else {
    sendRaw(ch);
  }
  updateMods();
}

/* Navigation keys from the keybar. CTRL/ALT latched → word/line/page jumps. */
function sendNav(key) {
  const m = mods.ctrl || mods.alt;
  const map = {
    up: m ? '\x1b[1;5A' : '\x1b[A',
    down: m ? '\x1b[1;5B' : '\x1b[B',
    right: m ? '\x1b[1;5C' : '\x1b[C',
    left: m ? '\x1b[1;5D' : '\x1b[D',
    home: m ? '\x1b[1;5H' : '\x1b[H',
    end: m ? '\x1b[1;5F' : '\x1b[F',
    pgup: m ? '\x1b[5;5~' : '\x1b[5~',
    pgdn: m ? '\x1b[6;5~' : '\x1b[6~'
  };
  if (m) clearMods();
  sendRaw(map[key] || '');
}

/* Cycle to the previous/next open session — a direct, reliable alternative to
   Termux's swipe-open session drawer (which users report as finicky). */
function cycleSession(dir) {
  if (!sessions.length) return;
  const idx = sessions.findIndex((s) => s.id === activeId);
  const n = sessions[(idx + dir + sessions.length) % sessions.length];
  if (n && n.id !== activeId) attach(n.id);
}

async function pasteText() {
  try {
    const ta = term && term.textarea;
    if (ta && document.activeElement !== ta) ta.focus();
  } catch (e) {}
  try {
    const t = await navigator.clipboard.readText();
    if (t) { term.paste(t); return; }
  } catch (e) {}
  try { document.execCommand('paste'); } catch (e) {}
}

function toggleFullscreen() {
  if (!document.fullscreenElement) { document.documentElement.requestFullscreen().catch(() => {}); }
  else { document.exitFullscreen().catch(() => {}); }
}

/* --- Session lifecycle --- */
async function initSessions() {
  const r = await fetch(WEBPATH + '/api/sessions');
  if (r.ok) {
    const d = await r.json();
    sessions = d.sessions || [];
  }
  if (sessions.length) {
    const last = localStorage.getItem('nex_last');
    const target = sessions.find((s) => s.id === last) || sessions[0];
    attach(target.id);
  } else {
    createSession();
  }
}

function closeWs() {
  wsToken++;
  if (ws) { try { ws.close(); } catch (e) {} ws = null; }
}

function attach(id, attempt) {
  if (!id) return;
  if (retry) { clearTimeout(retry); retry = null; }
  closeWs();
  const t = ++wsToken;
  activeId = id;
  localStorage.setItem('nex_last', id);
  renderTabs();
  setStatus('connecting');
  maskShow(T.connecting, true);
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(proto + '//' + location.host + WEBPATH + '/ws?session=' + encodeURIComponent(id));

  ws.onopen = () => { sendResize(); };
  ws.onmessage = (ev) => {
    if (wsToken !== t) return;
    const raw = ev.data;
    if (typeof raw === 'string' && raw[0] === '{') {
      try {
        const j = JSON.parse(raw);
        if (j.session && j.replay) { term.reset(); setStatus('connecting'); maskShow(T.connecting, true); }
        else if (j.err) { setStatus('err'); maskShow(j.err, false); }
        else if (j.ready || j.session) { maskHide(); setStatus('on'); }
        return;
      } catch (e) {}
    }
    term.write(typeof raw === 'string' ? raw : new Uint8Array(raw));
  };
  ws.onclose = () => {
    if (wsToken !== t) return;
    ws = null;
    // Only auto-reconnect if this session is still open AND is the active one.
    if (sessions.some((s) => s.id === id) && activeId === id) {
      setStatus('err');
      maskShow(T.disconnected, false);
      scheduleReconnect(id, (attempt || 0) + 1);
    }
  };
  ws.onerror = () => {};
}

/* Exponential backoff with jitter (1s → 2s → 4s … cap 30s), so a flaky
   connection self-heals without hammering the server. Buffered output on the
   server is replayed on reconnect, so nothing is lost. */
function scheduleReconnect(id, attempt) {
  if (retry) { clearTimeout(retry); retry = null; }
  const cap = 30000;
  const base = attempt <= 1 ? 1000 : Math.min(cap, 2000 * Math.pow(2, attempt - 1));
  const delay = base + Math.round(Math.random() * 500);
  setStatus('connecting');
  maskShow(T.reconnecting, true);
  retry = setTimeout(() => {
    retry = null;
    if (activeId === id) attach(id, attempt);
  }, delay);
}

function sendResize() {
  if (!term || !ws || ws.readyState !== 1) return;
  const dims = { cols: term.cols, rows: term.rows };
  ws.send('\u0000' + JSON.stringify(dims));
}

async function createSession() {
  const { status, data } = await post(WEBPATH + '/api/sessions', {});
  if (status !== 200) { toast(T.sessionErr, 'err'); return; }
  sessions.push({ id: data.id, number: data.number, color: data.color, host: data.host, user: data.user, ready: false });
  attach(data.id);
}

let pendingDelete = null;
function confirmDelete(id) {
  pendingDelete = id;
  $('confirm').hidden = false;
}

function bindConfirm() {
  $('confirm-cancel').addEventListener('click', () => { $('confirm').hidden = true; pendingDelete = null; });
  $('confirm-ok').addEventListener('click', async () => {
    const id = pendingDelete; pendingDelete = null;
    $('confirm').hidden = true;
    if (!id) return;
    const r = await fetch(WEBPATH + '/api/sessions/' + encodeURIComponent(id), { method: 'DELETE' });
    if (!r.ok) { toast(T.deleteFail, 'err'); return; }
    const wasActive = id === activeId;
    sessions = sessions.filter((s) => s.id !== id);
    if (sessions.length === 0) { closeWs(); activeId = null; showEmpty(); renderTabs(); }
    else if (wasActive) { attach(sessions[0].id); }
    else renderTabs();
  });
}

/* --- Tab rendering + empty state --- */
function renderTabs() {
  const el = $('session-tabs');
  if (!el) return;
  el.innerHTML = '';
  sessions.forEach((s) => {
    const b = document.createElement('button');
    b.className = 'sess-tab' + (s.id === activeId ? ' active' : '');
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', s.id === activeId ? 'true' : 'false');
    b.dataset.id = s.id;
    const dot = document.createElement('span');
    dot.className = 'dot'; dot.style.setProperty('--c', s.color);
    const num = document.createElement('span');
    num.className = 'sess-num'; num.textContent = '#' + s.number;
    const host = document.createElement('span');
    host.className = 'sess-host'; host.textContent = s.host;
    const del = document.createElement('span');
    del.className = 'sess-del'; del.dataset.id = s.id; del.title = T.deleteSess;
    del.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    b.appendChild(dot); b.appendChild(num); b.appendChild(host); b.appendChild(del);
    el.appendChild(b);
  });
  const has = sessions.length > 0;
  if (!has) showEmpty(); else hideEmpty();
}

function showEmpty() {
  const spinner = document.querySelector('#term-mask .spinner');
  if (spinner) spinner.style.display = 'none';
  if (emptyBtn) emptyBtn.style.display = 'inline-flex';
  $('mask-msg').textContent = T.noSessionsDesc;
  $('term-mask').hidden = false;
  setStatus('idle');
}

function hideEmpty() {
  const spinner = document.querySelector('#term-mask .spinner');
  if (spinner) spinner.style.display = '';
  if (emptyBtn) emptyBtn.style.display = 'none';
}

function maskShow(msg, spinner) {
  const sp = document.querySelector('#term-mask .spinner');
  if (sp) sp.style.display = spinner ? '' : 'none';
  if (emptyBtn) emptyBtn.style.display = 'none';
  $('mask-msg').textContent = msg;
  $('term-mask').hidden = false;
}

function maskHide() {
  $('term-mask').hidden = true;
}

function setStatus(kind) {
  const el = $('conn-status');
  el.className = 'badge ' + kind;
  if (kind === 'on') el.textContent = T.connected;
  else if (kind === 'connecting') el.textContent = T.connecting;
  else if (kind === 'err') el.textContent = T.disconnected;
  else el.textContent = '—';
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
  bindConfirm();

  $('btn-change-pass').addEventListener('click', async () => {
    const { status, data } = await post(WEBPATH + '/api/password', { current: $('cur-pass').value, new: $('new-pass').value });
    const m = $('msg-pass');
    m.hidden = false;
    if (status === 200) { m.className = 'mini-msg ok'; m.textContent = T.saved; $('cur-pass').value = $('new-pass').value = ''; }
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
    if (status === 200) { m.className = 'mini-msg ok'; m.textContent = T.saved; $('ssh-pass').value = ''; }
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
