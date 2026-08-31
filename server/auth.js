'use strict';
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { randomToken, CONFIG_DIR } = require('./config');

const SESSIONS_FILE = path.join(CONFIG_DIR, 'sessions.json');
const SESSION_TTL_MS = 30 * 24 * 3600 * 1000; // 30 days

// In-memory rate limiting (brute-force guard).
const RATE_MAX = 8;
const RATE_WINDOW_MS = 15 * 60 * 1000;

let sessions = {};
function loadSessions() {
  try { sessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8')); }
  catch (e) { sessions = {}; }
}
function saveSessions() {
  try { fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf8'); }
  catch (e) { /* ignore */ }
}
loadSessions();

const failed = {}; // ip -> { count, first }

function hashPassword(pw) { return bcrypt.hashSync(pw, 10); }
function checkPassword(pw, hash) { return bcrypt.compareSync(pw, hash); }

function createSession() {
  const sid = randomToken();
  const now = Date.now();
  sessions[sid] = { createdAt: now, expiresAt: now + SESSION_TTL_MS };
  saveSessions();
  return sid;
}

function isValid(sid) {
  const s = sessions[sid];
  if (!s) return false;
  if (Date.now() > s.expiresAt) {
    delete sessions[sid];
    saveSessions();
    return false;
  }
  return true;
}

function deleteSession(sid) {
  if (sid && sessions[sid]) {
    delete sessions[sid];
    saveSessions();
  }
}

function rateBlocked(ip) {
  const r = failed[ip];
  if (!r) return false;
  if (Date.now() - r.first > RATE_WINDOW_MS) { delete failed[ip]; return false; }
  return r.count >= RATE_MAX;
}

function recordFailure(ip) {
  failed[ip] = {
    count: (failed[ip] ? failed[ip].count : 0) + 1,
    first: failed[ip] ? failed[ip].first : Date.now()
  };
}

function clearFailures(ip) { delete failed[ip]; }

module.exports = {
  hashPassword, checkPassword, createSession, isValid, deleteSession,
  rateBlocked, recordFailure, clearFailures
};
