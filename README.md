# Nexminal

A secure **SSH terminal that runs in your browser** (WebTerm), with Bitvise-style
copy/paste. Install it on any Linux server and reach its shell from any
browser — no SSH client needed.

## Features

- Terminal in the browser (xterm.js, dark theme, resize, fullscreen)
- Bitvise-style copy/paste:
  - Highlight text → it is **copied automatically**
  - **Ctrl+V** / **Shift+Insert** to paste
  - **Paste button** in the toolbar
- Security:
  - **Random webpath** — the app is only reachable at a long random URL
    (e.g. `/dM3fKx9QzT…`); everything else returns 404
  - **Password setup on first visit**, stored as a bcrypt hash on the server
  - **Cookie auto-login** (httpOnly + Secure) so you don't retype the
    password every time
  - Brute-force rate limiting, security headers (CSP, X-Frame-Options)
- **Admin menu**: change password, change webpath, edit SSH target, change
  language (فارسی / English), delete the project
- **HTTPS out of the box**:
  - With a domain → automatic **Let's Encrypt** certificate
  - With only an IP → automatic **self-signed** certificate (browser shows a
    warning — expected, since valid certs can't be issued for bare IPs)
- Portable: installs on any server with one script, runs as a systemd service

## Install (easy)

```bash
git clone https://github.com/MNSH-Nexo/Nexminal.git Nexminal
cd Nexminal
sudo ./install.sh          # IP only → self-signed HTTPS
# or with a domain:
sudo ./install.sh yourdomain.com   # automatic Let's Encrypt HTTPS
```

> Note: this repository is **private**, so cloning requires your GitHub
> credentials to be available on the machine (e.g. `gh auth login` or a
> configured SSH key / PAT).

**The installer picks the ports itself.** If port 80 or 443 is already taken
on your server, it detects it and asks you for a free port (or picks one
automatically in non-interactive mode). So it works even on servers that
already run another panel.

After install, open the printed **HTTPS URL**. On the first visit you:

1. set the **admin password** (this is what you log in with),
2. set the **SSH target** (default `127.0.0.1:22`, user `root`) — the
   credentials used to open the shell.

On later visits you are logged in automatically via cookie.

## Manage

- **Admin menu** (☰ in the toolbar): change password, change the webpath,
  edit the SSH connection, switch language, or delete the project.
- Deleting the project clears its config and stops the service.

## Security notes

- The webpath is your secret entry point — keep it private.
- The admin password protects the app; the SSH password you enter in setup is
  what the terminal uses to open a shell on the target machine.
- Use a valid domain + Let's Encrypt in production for a trusted certificate.

## Tech

Node.js · Express · ssh2 · ws · xterm.js · bcryptjs. Runs as a systemd service.
