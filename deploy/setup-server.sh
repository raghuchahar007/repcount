#!/bin/bash
# Run this ONCE on the Vultr server as root
# Usage: ssh root@YOUR_IP 'bash -s' < deploy/setup-server.sh

set -e

echo "=== GymRep Server Setup ==="

# 1. Update system
apt update && apt upgrade -y

# 2. Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 3. Install Nginx
apt install -y nginx

# 4. Install PM2
npm install -g pm2

# 5. Create app user
id -u gymrep &>/dev/null || useradd -m -s /bin/bash gymrep

# 6. Create app directory
mkdir -p /var/www/gymrep
chown gymrep:gymrep /var/www/gymrep

# 7. Firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# 8. Nginx config (HTTP only — add SSL later with domain)
cat > /etc/nginx/sites-available/gymrep <<'NGINX'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    # Frontend static files
    root /var/www/gymrep/client/dist;
    index index.html;

    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # SPA fallback — all non-file routes go to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/gymrep /etc/nginx/sites-enabled/gymrep
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# 9. PM2 startup
pm2 startup systemd -u gymrep --hp /home/gymrep
systemctl enable pm2-gymrep

echo ""
echo "=== Setup complete ==="
echo "Now run: deploy/deploy.sh YOUR_IP"
