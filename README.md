# Nexminal

A secure **SSH terminal that runs in your browser**. Install it once on any
Linux server and reach its shell from any browser — no SSH client, no desktop
app, and nothing to install on the client side. Light, portable, and HTTPS
out of the box.

<p align="center"><em>Terminal in the browser · Bitvise-style copy/paste · Mobile-friendly · Bilingual (فارسی / English)</em></p>

## Highlights

- **Real SSH in a tab** — built on xterm.js with resize, fullscreen and dark theme.
- **Bitvise-style copy/paste** — highlight to copy automatically; paste with
  **Ctrl+V** / **Shift+Insert** or the toolbar button.
- **Truly hidden, not just password-guarded** — the app lives only at a
  **long random webpath** (e.g. `/dM3fKx9QzT…`); every other URL returns 404.
- **First-visit password** stored as a bcrypt hash, plus httpOnly + Secure
  cookie auto-login, brute-force rate limiting and hardened security headers.
- **HTTPS automatically** — Let's Encrypt if you give a domain, otherwise a
  self-signed certificate for bare-IP installs.
- **Fast even on weak/limited connections** (see [Performance](#performance)).
- **Mobile-first touch UX** — on-screen keybar, momentum scrollback, no keyboard
  flicker.
- **Works everywhere** — installs with one command and runs as a systemd service.

## Install

### One line (recommended)

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/MNSH-Nexo/Nexminal/main/install.sh)
```

### Or clone & run

```bash
git clone https://github.com/MNSH-Nexo/Nexminal.git
cd Nexminal
sudo ./install.sh            # IP only -> self-signed HTTPS
sudo ./install.sh yourdomain.com   # with a domain -> Let's Encrypt
```

**Customise** via environment variables, for example:

```bash
APP_DIR=/opt/webterm WEBTERM_PORT=9443 bash <(curl -fsSL https://raw.githubusercontent.com/MNSH-Nexo/Nexminal/main/install.sh)
```

> The installer **picks the ports itself**: if 80 or 443 are already taken it
> detects it and offers a free port (or picks one automatically when
> non-interactive), so it works even on servers already running another panel.

## First run

Open the **HTTPS URL** the installer prints. On the very first visit you:

1. set the **admin password** — this is what you log in with, and
2. set the **SSH target** (default `127.0.0.1:22`, user `root`) — the
   credentials used to open your shell.

On later visits the cookie logs you in automatically.

## Manage

- **Server-side:** run `sudo nexminal` for a menu that shows your access URL and
  lets you change the admin password, the secret webpath, the SSH target and the
  service status — or delete the whole project.
- **In the browser:** open the **☰ admin menu** in the toolbar to change the
  password or webpath, edit the SSH connection, switch language
  (فارسی / English), or delete the project (clears config and stops the service).

## Performance

Nexminal is tuned for **slow and limited links** (2G, mobile networks):

- **HTTP compression** on every response — the bundled xterm.js (~289&nbsp;KB)
  drops to roughly a quarter of its size over the wire.
- **One round trip on load** — the terminal page fetches its state and the
  session list in a single request.
- **Batched, compressed WebSocket output** — terminal data is coalesced into
  small frames and compressed with a shared deflate context.
- **Real backpressure** — if a slow client falls behind, the SSH stream pauses
  instead of letting the server buffer unbounded output into memory.
- **Mobile UX** — an on-screen keybar that doesn't steal focus, momentum touch
  scrolling for scrollback, and smart keyboard handling.

## Security notes

- Your **webpath is the entry point** — treat it as a secret and keep it private.
- The **admin password** protects the app; the **SSH password** you set during
  setup is what opens the shell on the target machine. They are distinct.
- For production, use a real **domain + Let's Encrypt** so you get a trusted
  certificate instead of the self-signed warning.

## Tech

Built with Node.js · Express · ssh2 · ws · xterm.js · bcryptjs, and shipped as a
systemd service.
