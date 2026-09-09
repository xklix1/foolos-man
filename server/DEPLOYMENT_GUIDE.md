# 🚀 Hostinger VPS Production Deployment Guide
## Ras ALmal Tycoon — Server-Authoritative Engine

This guide provides the exact commands and steps to deploy and activate the **Server-Authoritative Game Engine** on your Hostinger VPS (`rasalmal.online`).

---

## Architecture Overview on the VPS
```
[User Browser / PWA]
        │
        ▼ (HTTPS)
[Nginx Reverse Proxy on Hostinger VPS]
        ├── /api/*   ──────► [Node.js Fastify Daemon (Port 3001)]
        │                                  │ (service_role)
        │                                  ▼
        └── /* (Static Web)         [Supabase PostgreSQL (Docker)]
```

---

## Step 1: Upload / Pull Code to VPS
On your Hostinger VPS terminal, navigate to your game root (e.g. `/var/www/rasalmal` or where your repository is cloned):

```bash
cd /var/www/rasalmal
git pull origin main
cd server
npm install --production
```

---

## Step 2: Environment Configuration
Create `/var/www/rasalmal/server/.env` (or set environment variables in `ecosystem.config.js`):

```bash
cat << 'EOF' > /var/www/rasalmal/server/.env
PORT=3001
HOST=127.0.0.1
NODE_ENV=production
SUPABASE_URL=https://rasalmal.online
# Copy the service_role key from your Supabase Studio or Docker .env:
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
AUTOSAVE_INTERVAL_MS=30000
EOF
```

---

## Step 3: Run with PM2 (Recommended)
PM2 ensures 24/7 uptime, automatic restarts on failure, and zero-downtime reloads.

```bash
# Install PM2 globally if not already installed
npm install -g pm2

# Start the game server daemon
cd /var/www/rasalmal/server
pm2 start ecosystem.config.js

# Save process list so it starts automatically on server reboot
pm2 save
pm2 startup
```

*To check status and live logs:*
```bash
pm2 status
pm2 logs rasalmal-core
```

---

## Step 4: Configure Nginx Reverse Proxy
Add the `/api/` reverse proxy block to your Nginx configuration for `rasalmal.online` (usually in `/etc/nginx/sites-available/rasalmal`):

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    proxy_read_timeout 60s;
}

location /health {
    proxy_pass http://127.0.0.1:3001/health;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
}
```

*Test and reload Nginx:*
```bash
nginx -t && systemctl reload nginx
```

---

## Step 5: Apply Row Level Security (RLS) Hardening
Once the Node.js server is confirmed running, execute the security script in your **Supabase SQL Editor** (or via `psql`):

1. Open **Supabase Studio** at `https://rasalmal.online` (or port `8000`).
2. Navigate to **SQL Editor**.
3. Paste and run the contents of [`server/scripts/harden-rls.sql`](file:///c:/Users/khale/.gemini/antigravity-ide/scratch/foolos-man-tycoon/server/scripts/harden-rls.sql).

This instantly blocks public browser modifications of the `players` table while allowing the internal Node.js server (`service_role`) full authoritative control.

---

## Step 6: Health Verification
Test that the public endpoint responds correctly:

```bash
curl -I https://rasalmal.online/health
# Expected: HTTP/1.1 200 OK
# Response: {"status":"ok","service":"Ras ALmal Core Engine",...}
```

Open [https://rasalmal.online](https://rasalmal.online) in your browser:
- Open Developer Tools Console (F12).
- You will observe:
  `[ServerBridge] Connected to Authoritative Server. Offline report: ...`
- Every purchase, click, and offline accumulation is now validated and enforced 100% on the server!
