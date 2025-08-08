Summary of the app (verified from your codebase)
Two Node servers:
dhl_login (Express + sessions + EJS), default port = 3000
Entry: dhl_login/app.js (lines 369–372 start the server; honors PORT env)
Serves protected frontend under /app from repo Public/ (lines 259–260)
Serves additional assets under /Delivery from repo root Delivery/ (lines 211–213)
Static under dhl_login/public (line 209)
Uses sessions and secure cookies behind proxy (lines 161–171, 18–20)
Issues JWTs at /api/auth/issue-jwt-for-session (dhl_login/routes/auth.js)
backend (API), default port = 3001
Entry: backend/server.js (lines 436–441; binds 0.0.0.0; honors PORT env)
Accepts JWT Bearer token (passport-jwt)
Email via Gmail SMTP (lines 214–231)
BASE_URL controls links sent in emails (lines 197–200)
Frontend calls:
Calls to backend via relative URLs prefixed with /backend/*, expecting nginx to proxy to backend:3001 (Public/scripts.js lines 376–383; Public/validate-checklist.html lines 890, 1028, 1126)
Calls to dhl_login API relative to same host (/api/auth/… etc.)
SQLite database: dhl_login/config/config.json points to dhl_login/data/auth.db for production; ensure this directory is writable.
What we’ll set up
Production env variables (for both apps) and ports
Process management via PM2 (auto-restart, boot)
Nginx reverse proxy: / -> dhl_login:3000, /backend/ -> backend:3001; headers; optional SSL
Ubuntu server dependencies, permissions, firewall
1) Application setup
Required environment variables
Must match across both apps:
JWT_SECRET (used by both servers; dhl_login generates, backend verifies)
dhl_login (port 3000 by default)
PORT
SESSION_SECRET
JWT_SECRET (same as backend)
BASE_URL (the public URL of the site, used by backend for email links)
backend (port 3001 by default)
PORT
JWT_SECRET (same as dhl_login)
BASE_URL (public URL of dhl_login, used to form validation URLs)
EMAIL_USER, EMAIL_PASS (Gmail App Password or other SMTP)
Example production .env values
Create these on the server (do NOT commit them):

For dhl_login/.env

PORT=3000
NODE_ENV=production
SESSION_SECRET=change-me-to-a-long-random-string
JWT_SECRET=change-me-same-value-in-both-apps
BASE_URL=https://your-domain.example
For backend/.env

Notes:

The repo’s SQLite config stores DB at dhl_login/data/auth.db in production. Ensure that directory exists and is writable by the app user.
If you change BASE_URL to HTTPS and use nginx TLS termination, dhl_login/app.js already sets trust proxy, so secure cookies will work.
Install dependencies (production)
At project root: npm install (root has only dev/test utils)
dhl_login: cd dhl_login && npm ci --omit=dev
backend: cd backend && npm ci --omit=dev
Database initialization
Ensure directory exists: mkdir -p dhl_login/data
Optionally create/update tables: cd dhl_login && npm run sync-db
2) Process management with PM2
Install PM2 globally:

sudo npm i -g pm2
Create an ecosystem file (at repo root, e.g., /var/www/sanitation-app/ecosystem.config.js):

module.exports = {
  apps: [
    {
      name: 'dhl_login',
      cwd: './dhl_login',
      script: 'app.js',
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
        // PM2 will also read dhl_login/.env 
Start and persist:

From repo root: pm2 start ecosystem.config.js
Verify: pm2 status
Persist across reboots: pm2 save
Set up startup for your OS:
pm2 startup systemd
Follow the printed command (e.g., sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u youruser --hp /home/youruser)
pm2 save
Logs:

pm2 logs dhl_login
pm2 logs backend
3) Nginx reverse proxy
We’ll proxy:

/ → http://127.0.0.1:3000 (dhl_login)
/backend/ → http://127.0.0.1:3001/ (strip the prefix so backend sees /submit-form etc.)
Create file: /etc/nginx/sites-available/sanitation-app

HTTP-only (you can start with this, then add SSL later):

Enable and test:

sudo ln -s /etc/nginx/sites-available/sanitation-app /etc/nginx/sites-enabled/sanitation-app
sudo nginx -t
sudo systemctl reload nginx
Add HTTPS with Let’s Encrypt (optional but recommended)

sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.example
This will create a 443 server block, add ssl_certificate config, and set automatic renewal. Nginx will then pass X-Forwarded-Proto=https to the apps, and your session cookie “secure” logic will work as written.
If you prefer manual SSL, create a server block for 443 with ssl_certificate and ssl_certificate_key paths and add:

add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
And a port 80 server to redirect to https:
return 301 https://$host$request_uri;
Important: Do not serve /app static directly via Nginx. dhl_login protects /app with ensureWebAuthenticated; proxying all of / through dhl_login preserves that protection.

4) Ubuntu server setup
Install dependencies:
sudo apt-get update
Install Node LTS (NodeSource recommended):
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
Build tools for native deps (sqlite3):
sudo apt-get install -y build-essential python3 pkg-config libsqlite3-dev
Nginx:
sudo apt-get install -y nginx
PM2:
sudo npm i -g pm2
Deploy code:
Choose a deployment dir, e.g., /var/www/sanitation-app
sudo mkdir -p /var/www/sanitation-app
sudo chown -R $USER:$USER /var/www/sanitation-app
Copy or git clone your repo there
Create .env files as above:
dhl_login/.env
backend/.env
Create SQLite directories:
mkdir -p dhl_login/data backend/data
Install deps:
npm install # at repo root (optional for tests)
cd dhl_login && npm ci --omit=dev
cd ../backend && npm ci --omit=dev
Start with PM2:
cd /var/www/sanitation-app
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd (follow instructions)
File permissions:
Ensure the runtime user running PM2 can write to:
dhl_login/data/ (SQLite db)
backend/data/ (JSON submission storage)
If you run PM2 under a dedicated user (recommended), chown the repo to that user:
sudo useradd -m -s /bin/bash sanitation
sudo chown -R sanitation:sanitation /var/www/sanitation-app
sudo -u sanitation pm2 start /var/www/sanitation-app/ecosystem.config.js
sudo -u sanitation pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u sanitation --hp /home/sanitation
Firewall (UFW):
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full' # opens 80/443
sudo ufw enable
Do NOT open ports 3000/3001 to the world; they should only be accessed via nginx.
Email (Gmail):
Use a Gmail App Password (2FA-enabled account).
Set EMAIL_USER and EMAIL_PASS accordingly in backend/.env.
BASE_URL:
Set this to your public origin (e.g., https://your-domain.example) in both .env files so email links point to the right host.
Delivery assets (optional):
If you use fonts/assets under /Delivery (dhl_login/app.js lines 211–213), ensure that directory exists in the repo root and contains the expected assets.
Sanity checks after deployment
Check processes:
pm2 status
Check logs:
pm2 logs dhl_login
pm2 logs backend
Nginx:
sudo nginx -t && sudo systemctl reload nginx
curl -I http://your-domain.example/
curl -s http://your-domain.example/backend/health
App flow:
Visit https://your-domain.example/login-page
Login, navigate to /app/*
Submit a form; observe backend logs and email delivery
Optional: systemd instead of PM2