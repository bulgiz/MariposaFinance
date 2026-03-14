#!/bin/bash
set -euo pipefail

# Mariposa Finance - VPS Server Setup Script
# Run as: root user on fresh Ubuntu 24.04 VPS
# Usage: bash server-setup.sh

echo "=========================================="
echo "Mariposa Finance - Server Setup"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. System base
echo -e "\n${YELLOW}[1/13] Updating system packages...${NC}"
apt update
apt upgrade -y

echo -e "\n${YELLOW}[2/13] Setting timezone to UTC...${NC}"
timedatectl set-timezone UTC

echo -e "\n${YELLOW}[3/13] Setting hostname to mariposa-finance...${NC}"
hostnamectl set-hostname mariposa-finance
echo "127.0.0.1 mariposa-finance" >> /etc/hosts

echo -e "\n${YELLOW}[4/13] Installing base packages...${NC}"
apt install -y curl wget git unzip htop ufw fail2ban software-properties-common build-essential

# 2. Swap
echo -e "\n${YELLOW}[5/13] Creating swap file...${NC}"
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo "/swapfile none swap sw 0 0" >> /etc/fstab
  echo "vm.swappiness=10" >> /etc/sysctl.conf
  sysctl -p > /dev/null
  echo "✓ Swap created (2GB)"
else
  echo "✓ Swap already exists"
fi

# 3. Create deploy user
echo -e "\n${YELLOW}[6/13] Creating deploy user...${NC}"
if ! id deploy &>/dev/null; then
  useradd -m -s /bin/bash deploy
  usermod -aG sudo deploy
  echo "deploy ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/deploy
  chmod 0440 /etc/sudoers.d/deploy

  # Copy SSH keys from root if they exist
  mkdir -p /home/deploy/.ssh
  if [ -f /root/.ssh/authorized_keys ]; then
    cp /root/.ssh/authorized_keys /home/deploy/.ssh/
    chmod 600 /home/deploy/.ssh/authorized_keys
  fi
  chmod 700 /home/deploy/.ssh
  chown -R deploy:deploy /home/deploy/.ssh
  echo "✓ Deploy user created"
else
  echo "✓ Deploy user already exists"
fi

# 4. Change SSH port to 2212
echo -e "\n${YELLOW}[7/13] Changing SSH port to 2212...${NC}"
sed -i 's/^#Port.*/Port 2212/' /etc/ssh/sshd_config
sed -i 's/^Port .*/Port 2212/' /etc/ssh/sshd_config
systemctl restart ssh
echo "✓ SSH port changed to 2212"

# 5. Firewall (UFW)
echo -e "\n${YELLOW}[8/13] Configuring firewall...${NC}"
ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow 2212/tcp  # SSH on custom port
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
# NOTE: Redis (6379), Next.js (3000), and API (3001) are localhost-only.
# Nginx proxies all external traffic — do NOT open these ports publicly.
echo "✓ Firewall configured (ports 2212, 80, 443 open)"

# 6. Fail2ban
echo -e "\n${YELLOW}[9/13] Enabling fail2ban...${NC}"
systemctl enable fail2ban
systemctl restart fail2ban
echo "✓ Fail2ban enabled"

# 7. SSH hardening
echo -e "\n${YELLOW}[10/13] Hardening SSH...${NC}"
sed -i 's/^#PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart ssh
echo "✓ SSH hardened (root login disabled, password auth disabled)"

# 8. Node.js 20 LTS
echo -e "\n${YELLOW}[11/13] Installing Node.js 20 LTS...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
echo "✓ Node.js installed: $(node -v)"
echo "✓ NPM: $(npm -v)"

# 9. Redis
echo -e "\n${YELLOW}[12/13] Installing and configuring Redis...${NC}"
apt install -y redis-server
cat > /etc/redis/redis.conf << 'REDIS_EOF'
bind 127.0.0.1 ::1
protected-mode yes
port 6379
tcp-backlog 511
timeout 0
tcp-keepalive 300
daemonize no
supervised systemd
pidfile /var/run/redis_6379.pid
loglevel notice
logfile ""
databases 16
save 900 1
save 300 10
save 60 10000
stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes
dbfilename dump.rdb
replica-serve-stale-data yes
replica-read-only yes
repl-diskless-sync no
repl-diskless-sync-delay 5
disable-tcp-keepalives no
replica-priority 100
maxclients 10000
maxmemory 512mb
maxmemory-policy allkeys-lru
lazyfree-lazy-eviction no
lazyfree-lazy-expire no
lazyfree-lazy-server-del no
replica-lazy-flush no
appendonly no
appendfilename "appendonly.aof"
appendfsync everysec
no-appendfsync-on-rewrite no
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
aof-load-truncated yes
aof-use-rdb-preamble yes
lua-time-limit 5000
slowlog-log-slower-than 10000
slowlog-max-len 128
latency-monitor-threshold 0
notify-keyspace-events ""
hash-max-ziplist-entries 512
hash-max-ziplist-value 64
list-max-ziplist-size -2
list-compress-depth 0
set-max-intset-entries 512
zset-max-ziplist-entries 128
zset-max-ziplist-value 64
hll-sparse-max-bytes 3000
stream-node-max-bytes 4096
stream-node-max-entries 100
activerehashing yes
client-output-buffer-limit normal 0 0 0
client-output-buffer-limit replica 256mb 64mb 60
client-output-buffer-limit pubsub 32mb 8mb 60
hz 10
dynamic-hz yes
aof-rewrite-incremental-fsync yes
rdb-save-incremental-fsync yes
REDIS_EOF
systemctl enable redis-server
systemctl restart redis-server
echo "✓ Redis installed and configured"

# 10. Nginx
echo -e "\n${YELLOW}[13/13] Installing Nginx...${NC}"
apt install -y nginx
rm -f /etc/nginx/sites-enabled/default
systemctl enable nginx
systemctl start nginx
echo "✓ Nginx installed"

# 11. PM2 global
echo -e "\n${YELLOW}[14/14] Installing PM2 globally...${NC}"
npm install -g pm2
pm2 startup systemd -u deploy --hp /home/deploy > /dev/null 2>&1 || true
echo "✓ PM2 installed"

# 12. Certbot
echo -e "\n${YELLOW}Installing Certbot...${NC}"
apt install -y certbot python3-certbot-nginx

# 13. Create app directory
echo -e "\n${YELLOW}Creating application directory...${NC}"
mkdir -p /var/www/mariposa/logs
chown -R deploy:deploy /var/www/mariposa
chmod -R 755 /var/www/mariposa

# Print summary
cat << 'SUMMARY_EOF'

========================================
✓ SERVER SETUP COMPLETE
========================================

Installed Versions:
  • Ubuntu: 24.04 LTS
  • Node.js: 20.x LTS
  • NPM: (installed)
  • Redis: 7.x
  • Nginx: Latest
  • PM2: Global
  • Certbot: Latest

Server Details:
  • Hostname: mariposa-finance
  • Timezone: UTC
  • Firewall: UFW (enabled)
  • SSH: Hardened (custom port 2212, no root, no passwords)
  • Swap: 2GB created

Open Ports:
  • 2212/tcp - SSH (custom port)
  • 80/tcp   - HTTP
  • 443/tcp  - HTTPS
  • 6379/tcp - Redis (bound to localhost only)
  • 3000/tcp - Next.js (internal only)
  • 3001/tcp - Fastify API (internal only)

========================================
NEXT STEPS:
========================================

1. Make sure DNS A record points to this server:
   mariposa.finance → 192.3.165.128

2. SSH as deploy user on custom port 2212:
   ssh -p 2212 deploy@192.3.165.128

3. Run the GitHub SSH setup:
   bash setup-github-ssh.sh

4. Run the deployment script:
   bash ~/deploy.sh

5. Configure .env if needed and rerun deploy.sh

6. After DNS propagation, run:
   bash /var/www/mariposa/deploy/setup-ssl.sh

For questions or issues, check logs with:
  pm2 logs mariposa-web
  pm2 logs mariposa-api
  tail -f /var/log/nginx/error.log

========================================
SUMMARY_EOF

echo -e "\n${GREEN}✓ Server setup completed successfully!${NC}"
echo -e "${RED}⚠️  Important:${NC}"
echo -e "  • Root SSH login is now DISABLED"
echo -e "  • SSH port is now 2212 (not 22)"
echo -e "  • Use: ssh -p 2212 deploy@192.3.165.128"
