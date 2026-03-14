# Mariposa Finance - Production Deployment Guide

Complete guide to deploy Mariposa Finance from scratch on a RackNerd VPS.

## Prerequisites

- **VPS**: RackNerd KVM (or similar Ubuntu 24.04 server)
- **Network**: Root SSH access to the server
- **Domain**: DNS A record ready to point to VPS IP
- **Repository**: Access to `git@github.com:bulgiz/MariposaFinance.git`
- **Environment**: Local copy of `.env` with all API keys configured

## Deployment Steps

### STEP 1: Initial Server Setup (First Time Only)

Prepare the VPS with security hardening, Node.js, Redis, Nginx, and PM2.

#### On your local machine:

```bash
cd MariposaFinance
scp deploy/server-setup.sh root@192.3.165.128:~/
```

#### On the VPS:

```bash
ssh root@192.3.165.128
bash server-setup.sh
```

**After the script completes, SSH port will be changed to 2212.** All subsequent SSH connections must use `-p 2212`.

This script will:
- ✓ Update system packages
- ✓ Set timezone to UTC and hostname to `mariposa-finance`
- ✓ Create 2GB swap file
- ✓ Create `deploy` user with sudo NOPASSWD access
- ✓ Change SSH port to **2212** (from default 22)
- ✓ Configure firewall (UFW): allow 2212 (SSH), 80 (HTTP), 443 (HTTPS)
- ✓ Enable fail2ban
- ✓ Harden SSH (disable root login, password auth)
- ✓ Install Node.js 20 LTS
- ✓ Install Redis (bound to localhost only)
- ✓ Install Nginx
- ✓ Install PM2 globally
- ✓ Install Certbot

**⚠️ Important:**
- Root login is **disabled**
- SSH port is now **2212** (not 22)
- All future SSH commands must use: `ssh -p 2212 deploy@192.3.165.128`

---

### STEP 2: Set Up GitHub SSH Deploy Key

Generate SSH key for the deploy user to authenticate with GitHub.

#### On your local machine:

```bash
scp -P 2212 deploy/setup-github-ssh.sh deploy@192.3.165.128:~/
```

#### On the VPS:

```bash
ssh -p 2212 deploy@192.3.165.128
bash setup-github-ssh.sh
```

This script will:
- ✓ Generate ed25519 SSH key at `~/.ssh/github_mariposa`
- ✓ Configure SSH to use this key for github.com
- ✓ Print the public key

#### On GitHub:

1. Copy the public key from the output
2. Go to: https://github.com/bulgiz/MariposaFinance/settings/keys
3. Click **"Add deploy key"**
4. Fill in:
   - **Title**: `mariposa-vps-deploy`
   - **Key**: (paste the public key)
   - **✓ Allow write access** (check this box)
5. Click **"Add key"**

#### Verify on VPS:

```bash
ssh -T git@github.com
```

Expected output:
```
Hi bulgiz/MariposaFinance! You've successfully authenticated, but GitHub does not provide shell access.
```

---

### STEP 3: First Deployment

Deploy the application code to the VPS.

#### On your local machine:

```bash
scp -P 2212 deploy/deploy.sh deploy@192.3.165.128:~/
```

#### On the VPS:

```bash
ssh -p 2212 deploy@192.3.165.128
bash ~/deploy.sh
```

This script will:
- ✓ Clone the repo to `/var/www/mariposa` (if first time)
- ✓ Pull latest changes (if already cloned)
- ✓ Check `.env` file
- ✓ Install dependencies with `npm ci`
- ✓ Build all workspaces: `npx turbo run build`
- ✓ Start PM2 processes or reload if already running

**If `.env` doesn't exist:**

The script will copy `.env.example` to `.env` and exit. You must configure it before continuing.

---

### STEP 4: Configure Environment Variables

Edit the `.env` file with real API keys.

#### On the VPS:

```bash
nano /var/www/mariposa/.env
```

**Required variables:**

```env
# RPC URLs (or use public defaults)
BASE_RPC_URL=https://mainnet.base.org
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc

# API keys (optional, use public RPCs if not available)
ALCHEMY_API_KEY=your_alchemy_key_here
QUICKNODE_API_KEY=your_quicknode_key_here

# Frontend API URL (adjust if using different domain/port)
NEXT_PUBLIC_API_URL=https://mariposa.finance/api

# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# 1inch API (for swaps)
ONEINCH_API_KEY=your_oneinch_key

# Fee wallet configuration
MARIPOSA_FEE_WALLET=0x...
MARIPOSA_FEE_PERCENT=0.15
```

Save with `Ctrl+X`, then `Y`, then `Enter`.

**Re-run deployment:**

```bash
bash ~/deploy.sh
```

---

### STEP 5: Configure DNS

Point your domain to the VPS.

**In your DNS provider (Namecheap, Cloudflare, etc.):**

Create/update an A record:
```
Type:  A
Name:  @
Value: 192.3.165.128
TTL:   3600 (or default)
```

Repeat for `www`:
```
Type:  A
Name:  www
Value: 192.3.165.128
TTL:   3600
```

**Verify DNS propagation:**

```bash
dig mariposa.finance
dig www.mariposa.finance
```

Wait until both return `192.3.165.128`. This can take up to 24 hours.

---

### STEP 6: Set Up HTTPS (SSL/TLS)

Once DNS has propagated, enable SSL certificates via Let's Encrypt.

#### On the VPS:

```bash
# Copy the Nginx config to the VPS first (port 2212)
scp -P 2212 deploy/nginx-mariposa.conf deploy@192.3.165.128:~/

# Then run the SSL setup
ssh -p 2212 deploy@192.3.165.128
bash ~/setup-ssl.sh
```

This script will:
- ✓ Verify DNS resolution
- ✓ Install Nginx reverse proxy config
- ✓ Test Nginx configuration
- ✓ Request SSL certificate from Let's Encrypt
- ✓ Set up automatic renewal (every 90 days)
- ✓ Enable HTTPS redirection

**Verify HTTPS:**

```bash
curl -I https://mariposa.finance
```

Should return `200 OK` with HTTPS headers.

---

### STEP 7: Verify the Deployment

Check that everything is running correctly.

#### On the VPS:

```bash
# Check PM2 status
pm2 status

# View live logs (press Ctrl+C to exit)
pm2 logs

# Check specific service logs
pm2 logs mariposa-web
pm2 logs mariposa-api

# Monitor memory and CPU
pm2 monit
```

#### In your browser:

- **Site**: https://mariposa.finance
- **API Health**: https://mariposa.finance/api/health

---

## Subsequent Deployments

For updates to the codebase, simply pull the latest changes and redeploy.

### Quick Redeploy

```bash
ssh -p 2212 deploy@192.3.165.128
bash /var/www/mariposa/deploy/deploy.sh
```

This will:
- Pull the latest code from `origin`
- Rebuild with Turborepo
- Reload PM2 processes (zero downtime)

---

## Useful Commands

### View Logs

```bash
# All processes
pm2 logs

# Specific process
pm2 logs mariposa-web
pm2 logs mariposa-api

# Last N lines
pm2 logs --lines 100

# Clear logs
pm2 flush
```

### Process Management

```bash
# Restart all processes
pm2 restart all

# Stop all processes
pm2 stop all

# Start processes
pm2 start /var/www/mariposa/ecosystem.config.js

# Delete processes
pm2 delete all

# Save PM2 state
pm2 save

# Resurrect PM2 state
pm2 resurrect
```

### Monitoring

```bash
# View real-time resource usage
pm2 monit

# System info
htop
free -h
df -h

# Network
netstat -tulpn | grep -E ':80|:443|:3000|:3001'
```

### Redis

```bash
# Check Redis connection
redis-cli ping

# View memory usage
redis-cli info memory

# Clear cache (⚠️ destructive)
redis-cli flushdb
```

### Nginx

```bash
# Test config
sudo nginx -t

# Reload (zero downtime)
sudo systemctl reload nginx

# Restart (brief downtime)
sudo systemctl restart nginx

# View status
sudo systemctl status nginx

# View error log
sudo tail -f /var/log/nginx/error.log

# View access log
sudo tail -f /var/log/nginx/access.log
```

### SSL Certificates

```bash
# View certificates
sudo certbot certificates

# Renew manually
sudo certbot renew

# Test auto-renewal
sudo certbot renew --dry-run

# Force renew (if needed)
sudo certbot renew --force-renewal
```

### System Updates

```bash
# Check for updates
sudo apt update

# List upgradeable packages
sudo apt list --upgradable

# Upgrade packages
sudo apt upgrade -y

# Full distribution upgrade (be careful)
sudo apt dist-upgrade -y

# Clean up
sudo apt autoremove -y
```

---

## Troubleshooting

### Site not loading / 502 Bad Gateway

**Check PM2 processes:**
```bash
pm2 status
pm2 logs
```

**Restart processes:**
```bash
pm2 restart all
```

**Check Nginx:**
```bash
sudo systemctl status nginx
sudo nginx -t
sudo systemctl restart nginx
```

### Build fails with memory error

**Check available memory:**
```bash
free -h
```

The VPS has 4GB RAM + 2GB swap. If memory is still insufficient:
- Stop other services: `pm2 stop all`
- Clear npm cache: `npm cache clean --force`
- Try build again: `cd /var/www/mariposa && npx turbo run build`

### API returning errors

**Check API logs:**
```bash
pm2 logs mariposa-api --lines 50
```

**Verify `.env` file:**
```bash
cat /var/www/mariposa/.env
```

**Check Redis connection:**
```bash
redis-cli ping
```

### HTTPS not working / SSL errors

**Verify DNS:**
```bash
dig mariposa.finance
dig www.mariposa.finance
```

**Check certificate status:**
```bash
sudo certbot certificates
```

**View Certbot logs:**
```bash
sudo journalctl -u certbot -n 50
```

**Manual renew:**
```bash
sudo certbot renew --force-renewal --nginx
```

### SSH connection issues

**Verify SSH access:**
```bash
ssh -v -p 2212 deploy@192.3.165.128  # Verbose output
```

**Check firewall:**
```bash
sudo ufw status
sudo ufw allow 22/tcp
```

**Verify SSH daemon:**
```bash
sudo systemctl status ssh
sudo systemctl restart ssh
```

### Firewall / port access issues

**Check firewall status:**
```bash
sudo ufw status
```

**Enable ports if needed:**
```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
```

---

## Security Best Practices

✓ **Root login disabled** — use `deploy` user
✓ **SSH key auth only** — password auth disabled
✓ **Firewall enabled (UFW)** — only 2212 (SSH), 80, 443
✓ **Fail2ban running** — auto-blocks brute force
✓ **Redis bound to localhost** — not exposed
✓ **HTTPS enforced** — all HTTP redirects to HTTPS
✓ **Security headers set** — X-Frame-Options, CSP, HSTS
✓ **Rate limiting on API** — 30 req/sec per IP
✓ **SSL auto-renewal enabled** — certificates stay current

---

## Backup & Recovery

### Backup .env and logs

```bash
# Backup .env (contains secrets!)
scp deploy@192.3.165.128:/var/www/mariposa/.env ~/backups/

# Backup logs
scp -r deploy@192.3.165.128:/var/www/mariposa/logs ~/backups/
```

**⚠️ Important:** `.env` contains API keys. Store backups securely.

---

## Monitoring & Alerts

### Check server health regularly

```bash
# SSH into VPS (port 2212)
ssh -p 2212 deploy@192.3.165.128

# Quick health check
pm2 status
pm2 monit
free -h
df -h
```

### Monitor logs for errors

```bash
# Tail web logs
pm2 logs mariposa-web --lines 100

# Tail API logs
pm2 logs mariposa-api --lines 100

# Check Nginx errors
sudo tail -f /var/log/nginx/error.log
```

---

## Scaling & Performance

### If memory usage is high

1. Check what's consuming memory:
   ```bash
   pm2 monit
   ```

2. Options:
   - Increase VPS size (more RAM/CPU)
   - Enable Redis persistence and increase maxmemory
   - Optimize Turbo cache on build
   - Profile with `node --prof` and analyze output

### If disk space is low

```bash
# Check disk usage
df -h

# Clean npm cache
npm cache clean --force

# Clean Docker/build artifacts
rm -rf /var/www/mariposa/.next
rm -rf /var/www/mariposa/apps/*/dist
rm -rf /var/www/mariposa/node_modules
npm ci --production  # Reinstall without devDeps
```

---

## Support & Further Help

- **Logs**: Check PM2 logs for application errors
- **Nginx**: Check `/var/log/nginx/error.log`
- **System**: Use `htop`, `free -h`, `df -h`
- **Certbot**: Check renewal with `sudo certbot renew --dry-run`

---

## Summary Checklist

- [ ] Server setup complete (`server-setup.sh`)
- [ ] GitHub SSH key added
- [ ] Repository cloned and built
- [ ] `.env` configured with API keys
- [ ] DNS A records pointing to server
- [ ] SSL certificates obtained (`setup-ssl.sh`)
- [ ] Site accessible at https://mariposa.finance
- [ ] PM2 processes running (`pm2 status`)
- [ ] Logs monitored (`pm2 logs`)
- [ ] Backups created (`.env`, logs)

---

**Deployed by Claude Code** • Last updated: 2026-03-13
