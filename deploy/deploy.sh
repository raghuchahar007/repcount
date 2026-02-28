#!/bin/bash
# Deploy RepCount to Vultr server
# Usage: ./deploy/deploy.sh YOUR_SERVER_IP

set -e

SERVER_IP="${1:?Usage: ./deploy/deploy.sh SERVER_IP}"
SERVER_USER="root"
APP_DIR="/var/www/repcount"

echo "=== Deploying RepCount to $SERVER_IP ==="

# 1. Build client
echo ">> Building client..."
cd "$(dirname "$0")/../client"
npm run build
cd ..

# 2. Build server
echo ">> Building server..."
cd server
npx tsc
cd ..

# 3. Sync files to server
echo ">> Uploading files..."

# Client dist
rsync -avz --delete client/dist/ ${SERVER_USER}@${SERVER_IP}:${APP_DIR}/client/dist/

# Server code
rsync -avz --delete \
  --exclude='node_modules' \
  --exclude='.env' \
  --exclude='src' \
  server/ ${SERVER_USER}@${SERVER_IP}:${APP_DIR}/server/

# 4. Install server deps & restart
echo ">> Installing deps & restarting..."
ssh ${SERVER_USER}@${SERVER_IP} << 'REMOTE'
cd /var/www/repcount/server

# Install production deps only
npm install --omit=dev

# Create .env if missing
if [ ! -f .env ]; then
  echo "WARNING: No .env file found!"
  echo "Create one at /var/www/repcount/server/.env"
  echo "See .env.example for required variables"
fi

# Set ownership
chown -R repcount:repcount /var/www/repcount

# Start/restart with PM2
su - repcount -c "cd /var/www/repcount/server && pm2 delete repcount 2>/dev/null; pm2 start dist/server.js --name repcount && pm2 save"

echo ""
echo "=== Deploy complete ==="
echo "App running at: http://$(curl -s ifconfig.me)"
REMOTE
