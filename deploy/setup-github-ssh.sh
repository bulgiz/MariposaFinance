#!/bin/bash
set -euo pipefail

# Mariposa Finance - GitHub SSH Key Setup
# Run as: deploy user
# Usage: bash setup-github-ssh.sh

echo "=========================================="
echo "GitHub SSH Key Setup"
echo "=========================================="

YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

SSH_DIR="$HOME/.ssh"
SSH_KEY="$SSH_DIR/github_mariposa"
SSH_CONFIG="$SSH_DIR/config"

# Create .ssh directory if it doesn't exist
mkdir -p "$SSH_DIR"
chmod 700 "$SSH_DIR"

# Generate SSH key if it doesn't exist
if [ ! -f "$SSH_KEY" ]; then
  echo -e "\n${YELLOW}Generating SSH key for GitHub...${NC}"
  ssh-keygen -t ed25519 -f "$SSH_KEY" -N "" -C "mariposa-vps-deploy"
  chmod 600 "$SSH_KEY"
  chmod 644 "$SSH_KEY.pub"
  echo -e "${GREEN}✓ SSH key generated${NC}"
else
  echo -e "${GREEN}✓ SSH key already exists${NC}"
fi

# Configure SSH to use this key for github.com
if ! grep -q "Host github.com" "$SSH_CONFIG" 2>/dev/null; then
  echo -e "\n${YELLOW}Configuring SSH config...${NC}"
  cat >> "$SSH_CONFIG" << 'SSH_CONFIG_EOF'

Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/github_mariposa
  IdentitiesOnly yes
  StrictHostKeyChecking accept-new
SSH_CONFIG_EOF
  chmod 600 "$SSH_CONFIG"
  echo -e "${GREEN}✓ SSH config configured${NC}"
else
  echo -e "${GREEN}✓ SSH config already configured${NC}"
fi

# Print public key for user
echo ""
echo "=========================================="
echo "PUBLIC KEY - Add to GitHub:"
echo "=========================================="
echo ""
cat "$SSH_KEY.pub"
echo ""
echo "=========================================="
echo "NEXT STEPS:"
echo "=========================================="
echo ""
echo "1. Copy the public key above"
echo ""
echo "2. Go to GitHub deploy keys:"
echo "   https://github.com/bulgiz/MariposaFinance/settings/keys"
echo ""
echo "3. Click 'Add deploy key'"
echo ""
echo "4. Fill in:"
echo "   Title: mariposa-vps-deploy"
echo "   Key: (paste the public key above)"
echo "   ☑️  Allow write access (check this)"
echo ""
echo "5. Click 'Add key'"
echo ""
echo "6. Verify SSH connection:"
echo "   ssh -T git@github.com"
echo ""
echo "   Expected output:"
echo "   Hi bulgiz/MariposaFinance! You've successfully authenticated..."
echo ""
echo "=========================================="
