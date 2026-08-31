#!/usr/bin/env bash
# WebTerm installer
# Usage:
#   sudo ./install.sh                 # self-signed HTTPS (IP-only install)
#   sudo ./install.sh yourdomain.com  # Let's Encrypt HTTPS
set -euo pipefail

DOMAIN="${1:-}"
APP_DIR="${APP_DIR:-/opt/webterm}"
SERVICE=webterm
WEBTERM_PORT="${WEBTERM_PORT:-}"
WEBTERM_HTTP_PORT="${WEBTERM_HTTP_PORT:-}"
DEFAULT_HTTPS_PORT=443
DEFAULT_HTTP_PORT=80

# --- Port helpers ------------------------------------------------
port_in_use() {
  local p="$1"
  if command -v ss >/dev/null 2>&1; then
    ss -ltn 2>/dev/null | awk '{print $4}' | grep -Eq "[:.]${p}$"
  else
    (exec 3<>/dev/tcp/127.0.0.1/"${p}") 2>/dev/null && { exec 3<&- 3>&-; return 0; } || return 1
  fi
}

choose_free_port() {
  local p="$1"
  while port_in_use "$p"; do p=$((p + 1)); done
  echo "$p"
}

echo "==> WebTerm installer"
echo "    app dir : ${APP_DIR}"
echo "    domain  : ${DOMAIN:-none (self-signed HTTPS)}"

# --- 0. Pick an HTTPS port (ask if interactive, else auto-detect) --
if [[ -z "${WEBTERM_PORT}" && -t 0 ]]; then
  read -p "HTTPS port [${DEFAULT_HTTPS_PORT}]: " WEBTERM_PORT
fi
WEBTERM_PORT="${WEBTERM_PORT:-${DEFAULT_HTTPS_PORT}}"
if port_in_use "${WEBTERM_PORT}"; then
  echo "    Port ${WEBTERM_PORT} is already in use."
  if [[ -t 0 ]]; then
    while port_in_use "${WEBTERM_PORT}"; do
      read -p "    Enter a free HTTPS port [auto]: " WEBTERM_PORT
      if [[ -z "${WEBTERM_PORT}" ]]; then
        WEBTERM_PORT=$(choose_free_port 8443)
        echo "    Auto-selected: ${WEBTERM_PORT}"
      fi
    done
  else
    WEBTERM_PORT=$(choose_free_port "${WEBTERM_PORT}")
    echo "    Auto-selected free HTTPS port: ${WEBTERM_PORT}"
  fi
fi
echo "    HTTPS port: ${WEBTERM_PORT}"

# --- 0b. Pick an HTTP redirect port (same logic, default 80) ------
if [[ -z "${WEBTERM_HTTP_PORT}" && -t 0 ]]; then
  read -p "HTTP redirect port [${DEFAULT_HTTP_PORT}]: " WEBTERM_HTTP_PORT
fi
WEBTERM_HTTP_PORT="${WEBTERM_HTTP_PORT:-${DEFAULT_HTTP_PORT}}"
if port_in_use "${WEBTERM_HTTP_PORT}"; then
  echo "    Port ${WEBTERM_HTTP_PORT} is already in use."
  if [[ -t 0 ]]; then
    while port_in_use "${WEBTERM_HTTP_PORT}"; do
      read -p "    Enter a free HTTP port [auto]: " WEBTERM_HTTP_PORT
      if [[ -z "${WEBTERM_HTTP_PORT}" ]]; then
        WEBTERM_HTTP_PORT=$(choose_free_port 8080)
        echo "    Auto-selected: ${WEBTERM_HTTP_PORT}"
      fi
    done
  else
    WEBTERM_HTTP_PORT=$(choose_free_port "${WEBTERM_HTTP_PORT}")
    echo "    Auto-selected free HTTP port: ${WEBTERM_HTTP_PORT}"
  fi
fi
echo "    HTTP port: ${WEBTERM_HTTP_PORT}"

# --- 1. Node.js ------------------------------------------------
if ! command -v node >/dev/null 2>&1; then
  echo "==> Installing Node.js 20 LTS..."
  apt-get update -y
  apt-get install -y ca-certificates curl gnupg
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
NODE_BIN="$(command -v node)"
echo "    using node: $("$NODE_BIN" -v)"

# --- 2. Obtain the app source -----------------------------------
# Works two ways:
#   a) Run from a local clone (source files are next to this script)
#   b) Run via `curl ... | bash` (source is fetched from GitHub on demand)
SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd)"
mkdir -p "${APP_DIR}/public" "${APP_DIR}/server" "${APP_DIR}/data"

if [[ -d "${SRC}/public" && -d "${SRC}/server" ]]; then
  if [[ "$SRC" != "$APP_DIR" ]]; then
    echo "==> Installing from local source"
    cp -r "${SRC}/public/." "${APP_DIR}/public/"
    cp -r "${SRC}/server/." "${APP_DIR}/server/"
    cp -f "${SRC}/package.json" "${APP_DIR}/package.json" 2>/dev/null || true
  else
    echo "==> Running in-place install (src = ${APP_DIR})"
  fi
else
  echo "==> Fetching Nexminal source from GitHub..."
  if ! command -v git >/dev/null 2>&1; then
    echo "ERROR: 'git' is required for a remote (curl | bash) install." >&2
    exit 1
  fi
  TMP="$(mktemp -d)"
  if ! git clone --depth 1 https://github.com/MNSH-Nexo/Nexminal.git "${TMP}/Nexminal" >/dev/null 2>&1; then
    echo "ERROR: could not download the Nexminal source." >&2
    rm -rf "$TMP"
    exit 1
  fi
  cp -r "${TMP}/Nexminal/public/." "${APP_DIR}/public/"
  cp -r "${TMP}/Nexminal/server/." "${APP_DIR}/server/"
  cp -f "${TMP}/Nexminal/package.json" "${APP_DIR}/package.json"
  rm -rf "$TMP"
fi

cd "${APP_DIR}"
echo "==> npm install..."
npm install --omit=dev --no-audit --no-fund >/dev/null 2>&1 || npm install --omit=dev --no-audit --no-fund

# --- 3. systemd service ----------------------------------------
echo "==> Installing systemd service"
cat > /etc/systemd/system/${SERVICE}.service <<UNIT
[Unit]
Description=WebTerm - secure SSH terminal in the browser
After=network.target

[Service]
Type=simple
ExecStart=${NODE_BIN} ${APP_DIR}/server/index.js
WorkingDirectory=${APP_DIR}
Restart=on-failure
RestartSec=3
Environment=WEBTERM_CONFIG_DIR=${APP_DIR}/data
Environment=WEBTERM_PORT=${WEBTERM_PORT}
Environment=WEBTERM_HTTP_PORT=${WEBTERM_HTTP_PORT}

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable ${SERVICE} >/dev/null 2>&1 || true

# --- 3b. `nexminal` CLI management command ----------------------
echo "==> Installing 'nexminal' command"
cat > /usr/local/bin/nexminal <<CLI
#!/usr/bin/env bash
# Nexminal management menu
export WEBTERM_CONFIG_DIR=${APP_DIR}/data
export WEBTERM_PORT=${WEBTERM_PORT}
exec ${NODE_BIN} ${APP_DIR}/server/cli.js "\$@"
CLI
chmod +x /usr/local/bin/nexminal

# --- 4. Let's Encrypt (only when a domain is given) ------------
if [[ -n "${DOMAIN}" ]]; then
  echo "==> Obtaining Let's Encrypt certificate for ${DOMAIN}"
  if ! command -v certbot >/dev/null 2>&1; then
    apt-get install -y certbot >/dev/null
  fi
  # stop the app first so port 80 is free for certbot standalone
  systemctl stop ${SERVICE} 2>/dev/null || true
  certbot certonly --standalone --non-interactive --agree-tos \
    --register-unsafely-without-email -d "${DOMAIN}" >/dev/null
  systemctl start ${SERVICE} || true
  # point the app at the cert after its first boot creates config.json
  sleep 1
  "$NODE_BIN" -e "
    const fs=require('fs');
    const f='${APP_DIR}/data/config.json';
    if(fs.existsSync(f)){
      const c=JSON.parse(fs.readFileSync(f,'utf8'));
      c.https={certFile:'/etc/letsencrypt/live/${DOMAIN}/fullchain.pem',keyFile:'/etc/letsencrypt/live/${DOMAIN}/privkey.pem'};
      fs.writeFileSync(f,JSON.stringify(c,null,2));
    }
  " || true
  systemctl restart ${SERVICE} 2>/dev/null || systemctl start ${SERVICE}
fi

# --- 5. Start ----------------------------------------------
systemctl restart ${SERVICE} 2>/dev/null || systemctl start ${SERVICE}
sleep 2

WEBPATH=""
if [[ -f "${APP_DIR}/data/config.json" ]]; then
  WEBPATH="$("$NODE_BIN" -e "
    try{console.log(JSON.parse(require('fs').readFileSync('${APP_DIR}/data/config.json','utf8')).webpath||'');}catch(e){console.log('');}
  ")"
fi

echo ""
echo "==========================================================="
echo " WebTerm installed successfully."
echo " HTTPS  : $([ -n "${DOMAIN}" ] && echo "https://${DOMAIN}" || echo "https://<server-ip>:${WEBTERM_PORT}")"
echo " Webpath: ${WEBPATH:-/ (open the browser to set it up)}"
echo ""
echo " Open the HTTPS URL. On first visit you will set the"
echo " admin password and SSH target, then use the terminal."
echo " (self-signed certs show a browser warning - expected)"
echo ""
echo " Run 'sudo nexminal' at any time for the management menu"
echo " (show URL, change password/webpath/SSH target, service)."
echo "==========================================================="
