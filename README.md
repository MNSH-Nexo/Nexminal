# Nexminal

**Nexminal** is a self-hosted, browser-based SSH terminal. Install it once on
any Linux server and reach that server's shell — or any machine it can reach
over SSH — from any browser or phone, with no client software to install.

It ships with HTTPS out of the box, a hidden access URL instead of a plain
login page, per-machine credential handling, and support for multiple parallel
terminal sessions. It is designed to feel fast even on slow, limited mobile
connections.

> **Farsi & English** — the interface is fully bilingual and can be switched
> in one click.

---

## Contents

- [Features](#features)
- [Quick start](#quick-start)
- [First-run setup](#first-run-setup)
- [Using Nexminal](#using-nexminal)
- [Managing the server](#managing-the-server)
- [Configuration](#configuration)
- [Security model](#security-model)
- [Performance on slow links](#performance-on-slow-links)
- [How it works](#how-it-works)
- [Tech stack](#tech-stack)

---

## Features

**Terminal experience**

- Real, full-featured SSH sessions rendered with **xterm.js** — colors,
  resize, fullscreen, and a dark theme.
- **Multiple parallel sessions** in tabbed views. Switch instantly, open new
  ones, and close any session individually.
- A session's recent output is **replayed** when you return or reconnect, so a
  dropped link never wipes what was on screen.
- Self-healing connection: if the socket goes stale, the client detects it and
  reconnects automatically — returning to the tab or coming back online
  triggers an immediate reconnect.

**Copy & paste**

- One-click **Copy** and **Paste** toolbar actions, plus familiar terminal
  shortcuts. No hidden clipboard surprises.
- Terminal **links are clickable** (web links open in a new tab).

**Mobile-first**

- A Termux-style **on-screen keybar** with modifier keys (Esc/Tab/Ctrl/Alt/
  Shift), arrow keys, Home/End/PgUp/PgDn, and session switching — sized for
  comfortable tapping.
- The on-screen keyboard stays open while you type; the terminal never fights
  the phone's UI.
- Smooth momentum touch-scrolling through terminal history.

**Administration**

- In-browser **admin panel** with live server status, password change, webpath
  management, SSH target editing, language switch, and keybar sizing.
- A server-side **`nexminal` CLI menu** for the same controls without a browser.

**Operations**

- **HTTPS by default** — automatic self-signed certificate when no domain is
  given, or **Let's Encrypt** when you provide a domain.
- Runs as a **systemd service** that restarts on failure and starts on boot.
- HTTP traffic is redirected to HTTPS automatically.

---

## Quick start

### Option A — one-line install (recommended)

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/MNSH-Nexo/Nexminal/main/install.sh)
```

### Option B — clone and run

```bash
git clone https://github.com/MNSH-Nexo/Nexminal.git
cd Nexminal
sudo ./install.sh                 # no domain → self-signed HTTPS
sudo ./install.sh yourdomain.com  # with a domain → Let's Encrypt
```

The installer installs Node.js 20 if needed, copies the app to `/opt/webterm`,
installs dependencies, registers the systemd service, and prints your access
URL.

> **Ports are chosen for you.** If 443/80 are already taken, the installer
> detects it and asks for a free port (or picks one automatically when run
> non-interactively). It therefore works on servers that already run another
> web panel or reverse proxy.

### Requirements

- Any modern **Linux** distribution with `systemd` (Ubuntu/Debian tested).
- `root` access.
- An **HTTPS-capable reachable address** — either a public IP or a domain name.

---

## First-run setup

Open the printed **HTTPS URL**. The first time you visit you are guided through:

1. an **admin password** — the password you log in with afterward, and
2. an **SSH target** — host, port, username, and password for the connection
   the terminal will open. The default target is the server itself
   (`127.0.0.1:22`, user `root`).

On later visits a secure cookie logs you in automatically.

> If you install with a bare IP and see a **browser certificate warning**, that
> is expected — self-signed certificates cannot be issued for IP addresses.
> Use a domain to get a trusted Let's Encrypt certificate instead.

---

## Using Nexminal

- **Toolbar** — copy, paste, reconnect, increase/decrease terminal font size,
  fullscreen, language toggle, and the admin menu (☰).
- **Session bar** — the tab strip above the terminal shows all open sessions.
  Use `+` to open a new terminal session; each session carries its own scroll
  history and color.
- **Mobile keybar** — when you tap into the terminal on a phone or tablet, a
  keybar appears with the keys terminals expect: modifiers, arrows, and paging.
  Its size is adjustable from the admin panel.

---

## Managing the server

### From the browser

Open the **☰ admin menu**:

| Section    | What it lets you do                                                        |
| ---------- | -------------------------------------------------------------------------- |
| Status     | See hostname, OS/platform, uptime, load, memory, current SSH target, and whether TLS is self-signed. |
| Password   | Change the admin login password (requires the current one).                |
| Webpath    | View, set, or randomly regenerate the secret access path.                  |
| SSH target | Change the machine/credentials the terminal connects to.                   |
| Language   | Switch the whole UI between فارسی and English.                             |
| Keybar     | Adjust the size of the mobile keybar buttons.                              |

### From the shell

```bash
sudo nexminal
```

The CLI menu shows your access URL and lets you change the admin password, the
secret webpath, the SSH target, control the service, or delete the project.

### Deleting

- **Per session:** close a terminal tab (confirmation is required).
- **The whole project:** use the CLI or the admin panel — this clears the
  configuration and stops/disables the service.

---

## Configuration

Most settings are managed from the app itself (password, webpath, SSH target,
language) and stored on disk under the app's data directory. Server-level
options are environment variables:

| Variable            | Default      | Meaning                                        |
| ------------------- | ------------ | ---------------------------------------------- |
| `WEBTERM_PORT`      | `443`        | HTTPS port the app listens on.                 |
| `WEBTERM_HTTP_PORT` | `80`         | Port used for the HTTP → HTTPS redirect.       |
| `WEBTERM_CONFIG_DIR`| `<app>/data` | Where configuration and keys are stored.       |
| `APP_DIR`           | `/opt/webterm` | Install directory (used by the installer).   |

The systemd unit is named **`webterm`**; manage it as usual with
`systemctl {status|restart|stop} webterm`.

---

## Security model

- **Hidden, not just password-protected.** The entire app lives under a secret
  **webpath** such as `/dM3fKx9QzT…`. Any other URL returns a plain `404`, so
  the app is effectively invisible to scanners. You can rotate the path at any
  time; the old one stops working immediately.
- **Admin password** is hashed with **bcrypt** and is separate from the SSH
  password used to open the shell.
- **Session cookie** is `httpOnly`, `Secure`, `SameSite=Strict`, scoped to the
  webpath, and expires after 30 days.
- **Brute-force protection** — repeated failed logins from an IP are
  rate-limited and blocked.
- **Hardened HTTP headers** — `X-Content-Type-Options`, `X-Frame-Options:
  DENY`, `Referrer-Policy`, and a restrictive `Content-Security-Policy`.
- **HTTPS is mandatory** — there is no plain-HTTP app; port 80 only redirects
  to HTTPS.
- Static frontend and vendored libraries are served with cache headers so slow
  devices don't re-download them, while `index.html` is always served fresh.

> Best practice: put Nexminal behind a domain with **Let's Encrypt** in
> production, keep your webpath private, and treat the admin password and SSH
> password as distinct secrets.

---

## Performance on slow links

Nexminal is tuned for 2G/mobile networks and low-spec servers:

- **HTTP compression** on every response — the bundled xterm.js (~289&nbsp;KB)
  drops to roughly a quarter of its transfer size.
- **Single round trip on load** — state and the session list are returned in
  one request instead of two.
- **Batched WebSocket output** — shell output is coalesced into small frames
  compressed with a shared deflate context, dramatically reducing the number of
  frames and bytes.
- **Backpressure** — if a slow client falls behind, the SSH stream pauses until
  the client catches up, instead of letting the server buffer unbounded output.
- **Aggressive caching** of immutable vendor assets (`immutable`, one year) with
  ETag revalidation for app assets.

---

## How it works

A small **Node.js** process terminates TLS, serves the frontend, and manages
SSH connections via `ssh2`. Each terminal session maps one SSH shell; output
flows to the browser over a compressed WebSocket and is rendered by xterm.js,
while a bounded ring buffer lets sessions be replayed after a reconnect. The
process runs under **systemd** and exposes both a JSON API and a CLI for
administration.

---

## Tech stack

| Layer      | Technology                                             |
| ---------- | ------------------------------------------------------ |
| Runtime    | Node.js 20+                                            |
| Server     | Express (HTTP/API) + `ws` (WebSocket)                  |
| SSH        | `ssh2`                                                 |
| Terminal   | `@xterm/xterm` with `fit` and `web-links` addons       |
| Security   | `bcryptjs`, cookie sessions, rate limiting             |
| Deployment | systemd unit + optional Let's Encrypt (`certbot`)      |

---

Nexminal is a self-hosted tool for people who want a terminal they can reach
from anywhere — reliably, and without a phone app or client.
