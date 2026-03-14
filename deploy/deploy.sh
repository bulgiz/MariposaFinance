#!/bin/bash
set -euo pipefail

# Mariposa Finance - Deployment Script
# Run as: deploy user
# Usage: bash deploy.sh
# Purpose: Clone/pull, build, and start the application with zero downtime

# Configuration
APP_DIR="/var/www/mariposa"
REPO="git@github.com:bulgiz/MariposaFinance.git"
BRANCH="claude/upload-document-files-XyUGm"
LOG_DIR="$APP_DIR/logs"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Helper functions
log_step() {
  echo -e "\n${BLUE}▶ $1${NC}"
}

log_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

log_error() {
  echo -e "${RED}✗ $1${NC}"
  exit 1
}

log_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

# Print header
echo "=========================================="
echo "Mariposa Finance - Deployment"
echo "=========================================="

# Step 1: Clone or pull repository
log_step "Cloning or updating repository..."

if [ ! -d "$APP_DIR/.git" ]; then
  log_step "First time setup - cloning repository"
  git clone -b "$BRANCH" "$REPO" "$APP_DIR"
  log_success "Repository cloned"
else
  log_step "Repository exists - updating"
  cd "$APP_DIR"
  git fetch origin
  git reset --hard origin/"$BRANCH"
  log_success "Repository updated to latest commit on $BRANCH"
fi

cd "$APP_DIR"

# Step 2: Check .env file
log_step "Checking .env configuration..."

if [ ! -f "$APP_DIR/.env" ]; then
  log_warning ".env not found!"
  log_warning "Copying .env.example to .env"
  cp .env.example .env

  cat << 'ENV_MSG'

========================================
⚠️  CONFIGURATION REQUIRED
========================================

The .env file has been created from .env.example.

You MUST edit it with your actual API keys:

  nano /var/www/mariposa/.env

Required variables to configure:
  * BASE_RPC_URL
  * ARBITRUM_RPC_URL
  * ALCHEMY_API_KEY (or use public RPCs)
  * QUICKNODE_API_KEY (optional)
  * NEXT_PUBLIC_API_URL=https://mariposa.finance/api
  * NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
  * ONEINCH_API_KEY (for swaps)
  * MARIPOSA_FEE_WALLET
  * MARIPOSA_FEE_PERCENT

After editing, run this script again:

  bash /var/www/mariposa/deploy/deploy.sh

========================================
ENV_MSG
  exit 1
else
  log_success ".env file exists"
fi

# Step 3: Install dependencies
log_step "Installing dependencies with npm ci..."
npm ci
log_success "Dependencies installed"

# Step 4: Build all workspaces with Turborepo
log_step "Building all workspaces (this may take a few minutes)..."
npx turbo run build --force
log_success "Build completed"

# Step 5: Create log directory
log_step "Setting up log directory..."
mkdir -p "$LOG_DIR"
log_success "Log directory ready"

# Step 6: Copy ecosystem config to app root
log_step "Copying PM2 configuration..."
cp "$APP_DIR/deploy/ecosystem.config.js" "$APP_DIR/ecosystem.config.js"
log_success "PM2 config copied"

# Step 7: Start or reload with PM2
log_step "Managing PM2 processes..."

# Check if processes are already running
if pm2 list | grep -q "mariposa"; then
  log_step "Reloading existing PM2 processes..."
  pm2 reload "$APP_DIR/ecosystem.config.js"
  pm2 save > /dev/null 2>&1 || true
  log_success "Processes reloaded"
else
  log_step "Starting new PM2 processes..."
  pm2 start "$APP_DIR/ecosystem.config.js"
  pm2 save > /dev/null 2>&1 || true
  log_success "Processes started"
fi

# Wait for services to be ready
log_step "Waiting for services to be ready..."
sleep 3

# Step 8: Print status
echo ""
echo "=========================================="
echo "✓ DEPLOYMENT COMPLETE"
echo "=========================================="
echo ""

log_success "Mariposa Finance is live!"

echo "Website:"
echo "  https://mariposa.finance"
echo ""

echo "Process Status:"
pm2 status
echo ""

echo "Useful Commands:"
echo "  View logs:        pm2 logs mariposa-web"
echo "  View API logs:    pm2 logs mariposa-api"
echo "  Monitor:          pm2 monit"
echo "  Restart:          pm2 restart all"
echo "  Stop:             pm2 stop all"
echo ""

echo "System Info:"
echo "  Node version:     $(node -v)"
echo "  NPM version:      $(npm -v)"
echo "  Memory:           $(free -h | grep Mem | awk '{print $2, "available, using", $3}')"
echo "  Disk:             $(df -h / | tail -1 | awk '{print $4, "available"}')"
echo ""

# Check if services are healthy
log_step "Checking service health..."
sleep 2

if curl -sf http://localhost:3001/health > /dev/null 2>&1; then
  log_success "API health check passed"
else
  log_warning "API health check failed (this is normal during startup)"
fi

echo ""
echo "=========================================="
echo "Next steps:"
echo "=========================================="
echo "1. Verify the site loads: https://mariposa.finance"
echo "2. Check logs if there are issues: pm2 logs"
echo "3. For SSL setup: bash /var/www/mariposa/deploy/setup-ssl.sh"
echo "=========================================="
