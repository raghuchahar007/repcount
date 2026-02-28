#!/bin/bash
# Deploy GymRep to Vultr server
# Usage: ./deploy/deploy.sh YOUR_SERVER_IP

set -e

SERVER_IP="${1:?Usage: ./deploy/deploy.sh SERVER_IP}"
SERVER_USER="root"
APP_DIR="/var/www/gymrep"

echo "=== Deploying GymRep to $SERVER_IP ==="

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
cd /var/www/gymrep/server

# Install production deps only
npm install --omit=dev

# Create .env if missing
if [ ! -f .env ]; then
  echo "WARNING: No .env file found!"
  echo "Create one at /var/www/gymrep/server/.env"
  echo "See .env.example for required variables"
fi

# Set ownership
chown -R gymrep:gymrep /var/www/gymrep

# Start/restart with PM2
su - gymrep -c "cd /var/www/gymrep/server && pm2 delete gymrep 2>/dev/null; pm2 start dist/server.js --name gymrep && pm2 save"

echo ""
echo "=== Deploy complete ==="
echo "App running at: http://$(curl -s ifconfig.me)"
REMOTE
