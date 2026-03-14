#!/bin/bash
set -euo pipefail

# Mariposa Finance - SSL Certificate Setup
# Run as: deploy user (with sudo access)
# Usage: bash setup-ssl.sh
# Prerequisites: DNS A record for mariposa.finance must already point to this server

# Configuration
DOMAIN="mariposa.finance"
DOMAIN_WWW="www.mariposa.finance"
EMAIL="admin@mariposa.finance"
NGINX_CONFIG="/etc/nginx/sites-available/$DOMAIN"
NGINX_ENABLED="/etc/nginx/sites-enabled/$DOMAIN"
CERTBOT_CONFIG_DIR="/etc/letsencrypt"

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
echo "Mariposa Finance - SSL Setup"
echo "=========================================="

# Verify DNS
log_step "Checking DNS resolution..."
DNS_IP=$(dig +short $DOMAIN | tail -n1)
if [ -z "$DNS_IP" ]; then
  log_error "DNS not resolving for $DOMAIN"
  log_warning "Make sure DNS A record points to this server's IP"
  echo "Check with: dig $DOMAIN"
  exit 1
else
  log_success "DNS resolves to: $DNS_IP"
fi

# Copy Nginx config
log_step "Installing Nginx configuration..."
if [ ! -f "$NGINX_CONFIG" ]; then
  if [ -f "$(pwd)/nginx-mariposa.conf" ]; then
    sudo cp "$(pwd)/nginx-mariposa.conf" "$NGINX_CONFIG"
    log_success "Nginx config copied"
  elif [ -f "/var/www/mariposa/deploy/nginx-mariposa.conf" ]; then
    sudo cp "/var/www/mariposa/deploy/nginx-mariposa.conf" "$NGINX_CONFIG"
    log_success "Nginx config copied"
  else
    log_error "Could not find nginx-mariposa.conf"
  fi
else
  log_success "Nginx config already exists"
fi

# Enable site
log_step "Enabling Nginx site..."
if [ ! -L "$NGINX_ENABLED" ]; then
  sudo ln -s "$NGINX_CONFIG" "$NGINX_ENABLED"
  log_success "Site symlink created"
else
  log_success "Site already enabled"
fi

# Test Nginx config
log_step "Testing Nginx configuration..."
sudo nginx -t > /dev/null || log_error "Nginx config test failed"
log_success "Nginx config valid"

# Reload Nginx
log_step "Reloading Nginx..."
sudo systemctl reload nginx
log_success "Nginx reloaded"

# Request SSL certificate
log_step "Requesting SSL certificate from Let's Encrypt..."
log_warning "You must replace YOUR_EMAIL@example.com with a real email address"
echo ""
echo "IMPORTANT: Replace this email with a real one for renewal notifications:"
echo "  $EMAIL"
echo ""

# Check if certificate already exists
if sudo test -d "$CERTBOT_CONFIG_DIR/live/$DOMAIN"; then
  log_warning "Certificate already exists for $DOMAIN"
  log_step "Renewing certificate..."
  sudo certbot renew --nginx --quiet
  log_success "Certificate renewed"
else
  log_step "Requesting new certificate..."
  sudo certbot --nginx \
    -d "$DOMAIN" \
    -d "$DOMAIN_WWW" \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    --redirect \
    --expand

  log_success "Certificate obtained"
fi

# Test auto-renewal
log_step "Testing certificate auto-renewal..."
sudo certbot renew --dry-run --quiet
log_success "Auto-renewal test passed"

# Set up renewal timer
log_step "Setting up automatic renewal..."
sudo systemctl enable certbot.timer > /dev/null 2>&1 || true
sudo systemctl start certbot.timer > /dev/null 2>&1 || true
log_success "Auto-renewal enabled"

# Display certificate info
log_step "Certificate Information:"
sudo certbot certificates

# Final verification
echo ""
echo "=========================================="
echo "✓ SSL SETUP COMPLETE"
echo "=========================================="
echo ""

log_success "HTTPS is now enabled for mariposa.finance"
echo ""
echo "Verification:"
echo "  Website:  https://mariposa.finance"
echo "  Redirect: http://mariposa.finance → https"
echo ""
echo "Certificate Details:"
echo "  Domain:    $DOMAIN, $DOMAIN_WWW"
echo "  Auto-renew: Enabled (every 90 days)"
echo ""
echo "Troubleshooting:"
echo "  Check logs:    sudo journalctl -u nginx -n 50"
echo "  Test renewal:  sudo certbot renew --dry-run"
echo "  Force renew:   sudo certbot renew --force-renewal"
echo ""
echo "Next: Visit https://mariposa.finance"
echo "=========================================="
