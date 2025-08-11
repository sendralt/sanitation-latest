# On‑Prem Ubuntu Deployment Strategy (Immutable, Rollback‑Ready)

This guide converts the repo into a production deployment on a single Ubuntu host using PM2 + Nginx + Let’s Encrypt with immutable releases and a one‑command rollback.

Key repo files:
- PM2 process config: [ecosystem.config.js](ecosystem.config.js)
- Nginx example: [sanitation-latest.conf](sanitation-latest.conf)
- App entry: [dhl_login/app.js](dhl_login/app.js)
- Migrations: [dhl_login/migrations](dhl_login/migrations)
- Tests/Jest config: [dhl_login/jest.config.js](dhl_login/jest.config.js)

Prereqs on server
- Ubuntu 22.04+; sudo user “deploy” with SSH keys (no passwords).
- Node.js 18 LTS: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -; sudo apt -y install nodejs
- PM2: sudo npm i -g pm2
- Nginx: sudo apt -y install nginx
- Let’s Encrypt: sudo apt -y install certbot python3-certbot-nginx
- Firewall: sudo ufw allow OpenSSH; sudo ufw allow 80/tcp; sudo ufw allow 443/tcp; sudo ufw enable

Directory layout (immutable releases)
- Base path: /opt/sanitation
  - /opt/sanitation/releases/<timestamp>  (new release extracted here)
  - /opt/sanitation/current -> symlink to active release
  - /opt/sanitation/data  (persistent DB and uploads)
  - /opt/sanitation/env   (environment files; secrets kept here)

Create base dirs
sudo mkdir -p /opt/sanitation/{releases,data,env}
sudo chown -R deploy:deploy /opt/sanitation

Environment files (never commit secrets)
- Create these on server (examples shown; tune to your needs):
/opt/sanitation/env/.env.production
  NODE_ENV=production
  PORT=3000
  SESSION_SECRET=<long-random>
  JWT_SECRET=<long-random>
  RATE_LIMIT_WINDOW_MS=60000
  RATE_LIMIT_MAX=300
  SQLITE_STORAGE=/opt/sanitation/data/app.sqlite

/opt/sanitation/env/.env.staging
  NODE_ENV=staging
  PORT=3001
  SESSION_SECRET=<..>
  JWT_SECRET=<..>
  SQLITE_STORAGE=/opt/sanitation/data/app-staging.sqlite

Ensure dotenv is loaded at app bootstrap (top of [dhl_login/app.js](dhl_login/app.js)):
  require('dotenv').config();

Nginx reverse proxy + TLS
1) Copy provided config to server:
   sudo cp sanitation-latest.conf /etc/nginx/sites-available/sanitation-latest
   sudo ln -s /etc/nginx/sites-available/sanitation-latest /etc/nginx/sites-enabled/sanitation-latest
   sudo nginx -t && sudo systemctl reload nginx
2) Issue cert:
   sudo certbot --nginx -d your.domain
3) Confirm systemd timer handles renewal (default).

PM2 setup (systemd)
pm2 startup systemd
# Follow printed instructions (sudo env PATH=... pm2 startup systemd -u deploy --hp /home/deploy)

Build + deploy (immutable)
On your workstation/CI (with SSH access to server):
- Create release directory:
  TS=$(date -u +%Y%m%d_%H%M%S)
  ssh deploy@server "mkdir -p /opt/sanitation/releases/$TS"
- Rsync repo:
  rsync -az --delete --exclude ".git" ./ deploy@server:/opt/sanitation/releases/$TS/
- Install prod deps:
  ssh deploy@server "cd /opt/sanitation/releases/$TS/dhl_login && npm ci --omit=dev"
- Link current:
  ssh deploy@server "ln -sfn /opt/sanitation/releases/$TS /opt/sanitation/current"
- Link env file:
  ssh deploy@server "ln -sfn /opt/sanitation/env/.env.production /opt/sanitation/current/.env"

Database migrations (Sequelize)
Run after linking current:
ssh deploy@server "cd /opt/sanitation/current/dhl_login && npx sequelize db:migrate --env production"

Start or reload app (PM2)
# Uses [ecosystem.config.js](ecosystem.config.js) in repo root
ssh deploy@server "cd /opt/sanitation/current && pm2 startOrReload ecosystem.config.js --env production && pm2 save"

Health check and smoke test
- Add a simple /health endpoint in your app that returns 200 with {status:"ok"} and optional DB ping.
- curl -fsS https://your.domain/health

Rollback procedure (instant)
# Find previous release
ssh deploy@server 'ls -dt /opt/sanitation/releases/* | sed -n "1,2p"'
# Symlink to previous and reload
ssh deploy@server "ln -sfn /opt/sanitation/releases/<previous> /opt/sanitation/current && pm2 reload all && pm2 save"
# If schema change caused issues, also:
ssh deploy@server "cd /opt/sanitation/current/dhl_login && npx sequelize db:migrate:undo --env production"

Backups (sqlite)
- Script: [dhl_login/backup-db.js](dhl_login/backup-db.js)
- Cron (server):
  crontab -e
  0 2 * * * /usr/bin/node /opt/sanitation/current/dhl_login/backup-db.js >> /var/log/sanitation-backup.log 2>&1
- Periodically copy backups off‑server; test restore quarterly.

Monitoring & logging
- PM2 logs/retention:
  pm2 logs
  pm2 install pm2-logrotate
  pm2 set pm2-logrotate:retain 30
- Nginx access/error logs (logrotate default).
- Uptime checks: external monitor for HTTPS + /health.
- Optional: Sentry for error tracking; inject DSN via env.

CI/CD hooks (already present)
- Tests + coverage: [ .github/workflows/ci.yml ](.github/workflows/ci.yml)
- Lint + audit: [ .github/workflows/quality.yml ](.github/workflows/quality.yml)
- Coverage gates: see [dhl_login/jest.config.js](dhl_login/jest.config.js)

Release checklist
1) CI green (tests/coverage/lint/audit).
2) Deploy new release (rsync + npm ci --omit=dev).
3) Link env + current; run migrations.
4) pm2 startOrReload; verify /health and Nginx 200 OK.
5) Monitor logs/alerts; be ready to rollback.

Security notes
- No secrets in repo; use /opt/sanitation/env and GitHub Actions Secrets.
- SSH key‑only for deploy user; least privilege.
- Rotate SESSION_SECRET/JWT_SECRET periodically.