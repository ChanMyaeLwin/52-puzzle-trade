# 🚀 Deployment Guide - 52 Puzzle Trade

## Overview
This guide will help you deploy the 52 Puzzle Trade game to a shared server.

---

## 📋 Prerequisites

### Server Requirements
- Node.js 18+ installed
- npm or yarn package manager
- Domain name (optional but recommended)
- SSL certificate (for HTTPS - recommended for WebSocket connections)

### Recommended Hosting Providers
1. **DigitalOcean** - $6/month droplet
2. **Heroku** - Free tier available
3. **Railway** - Free tier available
4. **Render** - Free tier available
5. **AWS EC2** - Free tier for 1 year
6. **Vercel** (Frontend) + Railway/Render (Backend)

---

## 🎯 Deployment Options

### Option 1: Single Server Deployment (Recommended for Small Scale)

Deploy both frontend and backend on the same server.

#### Step 1: Prepare the Server
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Nginx (reverse proxy)
sudo apt install -y nginx
```

#### Step 2: Upload Your Code
```bash
# On your local machine, create a production build
cd 52-puzzle-trade/client
npm run build

# Upload to server (replace with your server details)
scp -r ../52-puzzle-trade user@your-server-ip:/var/www/
```

#### Step 3: Configure Backend
```bash
# SSH into your server
ssh user@your-server-ip

# Navigate to server directory
cd /var/www/52-puzzle-trade/server

# Install dependencies
npm install --production

# Start with PM2
pm2 start index.js --name "puzzle-trade-server"
pm2 save
pm2 startup
```

#### Step 4: Configure Nginx
```bash
sudo nano /etc/nginx/sites-available/puzzle-trade
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain

    # Frontend (static files)
    location / {
        root /var/www/52-puzzle-trade/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket (Socket.IO)
    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/puzzle-trade /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Step 5: Add SSL (HTTPS) - Recommended
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com
```

---

### Option 2: Separate Frontend/Backend Deployment

#### Frontend: Vercel (Free)

1. **Push to GitHub**
```bash
cd 52-puzzle-trade
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/52-puzzle-trade.git
git push -u origin main
```

2. **Deploy to Vercel**
- Go to [vercel.com](https://vercel.com)
- Import your GitHub repository
- Set build settings:
  - Framework: Vite
  - Root Directory: `client`
  - Build Command: `npm run build`
  - Output Directory: `dist`
- Add environment variable:
  - `VITE_API_URL`: Your backend URL (e.g., `https://api.yourdomain.com`)

3. **Update Client Socket Connection**
```javascript
// client/src/sockets.js
import { io } from 'socket.io-client'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
export const socket = io(API_URL, {
  transports: ['websocket', 'polling']
})
```

#### Backend: Railway (Free Tier)

1. **Create `railway.json`**
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "cd server && npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

2. **Update `server/package.json`**
```json
{
  "scripts": {
    "start": "node index.js"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

3. **Deploy to Railway**
- Go to [railway.app](https://railway.app)
- Create new project from GitHub repo
- Set root directory: `server`
- Add environment variables if needed
- Deploy!

4. **Update CORS in Server**
```javascript
// server/index.js
const cors = require('cors');

app.use(cors({
  origin: ['https://your-vercel-app.vercel.app', 'http://localhost:5173'],
  credentials: true
}));

const io = new Server(server, { 
  cors: { 
    origin: ['https://your-vercel-app.vercel.app', 'http://localhost:5173'],
    credentials: true
  } 
});
```

---

### Option 3: Docker Deployment

#### Create `Dockerfile` for Server
```dockerfile
# server/Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3001

CMD ["node", "index.js"]
```

#### Create `Dockerfile` for Client
```dockerfile
# client/Dockerfile
FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

#### Create `docker-compose.yml`
```yaml
version: '3.8'

services:
  server:
    build: ./server
    ports:
      - "3001:3001"
    volumes:
      - ./server/data:/app/data
    restart: unless-stopped

  client:
    build: ./client
    ports:
      - "80:80"
    depends_on:
      - server
    restart: unless-stopped
```

#### Deploy
```bash
docker-compose up -d
```

---

## 🔧 Environment Variables

### Server (.env)
```env
PORT=3001
NODE_ENV=production
```

### Client (.env)
```env
VITE_API_URL=https://api.yourdomain.com
```

---

## 📊 Database

The game uses SQLite for persistence. The database file is stored in `server/data/game.sqlite`.

**Important:** Make sure this directory is:
- Writable by the Node.js process
- Backed up regularly
- Not deleted on deployment

For production, consider:
- Regular backups (cron job)
- Moving to PostgreSQL for better concurrency
- Using a managed database service

---

## 🔒 Security Checklist

- [ ] Enable HTTPS (SSL certificate)
- [ ] Set up firewall (UFW on Ubuntu)
- [ ] Use environment variables for sensitive data
- [ ] Enable rate limiting (add to server)
- [ ] Set up CORS properly
- [ ] Keep Node.js and dependencies updated
- [ ] Use PM2 or similar for process management
- [ ] Set up monitoring (PM2 Plus, New Relic, etc.)
- [ ] Regular backups of database
- [ ] Use strong passcodes for rooms

---

## 📈 Monitoring & Maintenance

### PM2 Monitoring
```bash
# View logs
pm2 logs puzzle-trade-server

# Monitor resources
pm2 monit

# Restart if needed
pm2 restart puzzle-trade-server

# View status
pm2 status
```

### Nginx Logs
```bash
# Access logs
sudo tail -f /var/log/nginx/access.log

# Error logs
sudo tail -f /var/log/nginx/error.log
```

### Database Backup
```bash
# Create backup script
nano /var/www/backup-db.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
cp /var/www/52-puzzle-trade/server/data/game.sqlite /var/www/backups/game_$DATE.sqlite
# Keep only last 7 days
find /var/www/backups -name "game_*.sqlite" -mtime +7 -delete
```

```bash
# Make executable
chmod +x /var/www/backup-db.sh

# Add to crontab (daily at 2 AM)
crontab -e
0 2 * * * /var/www/backup-db.sh
```

---

## 🚀 Quick Deploy Commands

### For DigitalOcean/VPS:
```bash
# 1. Clone repo on server
git clone https://github.com/yourusername/52-puzzle-trade.git
cd 52-puzzle-trade

# 2. Install server dependencies
cd server
npm install --production

# 3. Build client
cd ../client
npm install
npm run build

# 4. Start server with PM2
cd ../server
pm2 start index.js --name puzzle-trade
pm2 save

# 5. Configure Nginx (see above)
```

### For Heroku:
```bash
# 1. Create Heroku app
heroku create your-app-name

# 2. Add buildpack
heroku buildpacks:add heroku/nodejs

# 3. Set root directory
echo "web: cd server && npm start" > Procfile

# 4. Deploy
git push heroku main
```

---

## 🌐 Domain Setup

1. **Point domain to server IP**
   - Add A record: `@` → `your-server-ip`
   - Add A record: `www` → `your-server-ip`

2. **Wait for DNS propagation** (up to 48 hours)

3. **Update Nginx config** with your domain

4. **Get SSL certificate** with Certbot

---

## 📱 Testing Deployment

1. **Test frontend**: Visit `https://your-domain.com`
2. **Test backend**: Visit `https://your-domain.com/health`
3. **Test WebSocket**: Create a room and join from another device
4. **Test game flow**: Play a complete game

---

## 🐛 Troubleshooting

### WebSocket Connection Issues
- Check CORS settings
- Verify Nginx WebSocket proxy config
- Check firewall rules (port 3001)
- Ensure SSL is working

### Database Issues
- Check file permissions on `data` directory
- Verify SQLite is installed
- Check disk space

### Performance Issues
- Monitor with `pm2 monit`
- Check Nginx logs
- Consider upgrading server resources
- Add Redis for session management (future)

---

## 📞 Support

If you encounter issues:
1. Check server logs: `pm2 logs`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Check browser console for client errors
4. Verify all environment variables are set

---

## 🎉 You're Ready!

Your 52 Puzzle Trade game is now deployed and ready for players worldwide!

**Share your game URL and enjoy!** 🎮✨
