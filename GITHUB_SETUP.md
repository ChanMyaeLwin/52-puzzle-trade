# 🐙 GitHub Setup & Deployment Guide

## Step 1: Initialize Git Repository

Open your terminal in the `52-puzzle-trade` directory and run:

```bash
cd 52-puzzle-trade

# Initialize git repository
git init

# Configure git with your email
git config user.email "lwin.chanmyae4@gmail.com"
git config user.name "Your Name"  # Replace with your name
```

## Step 2: Create .gitignore Files

The project already has `.gitignore` files, but let's verify:

### Root .gitignore
```
node_modules/
.DS_Store
.env
*.log
.vscode/
```

### Client .gitignore (already exists)
```
# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
dist
dist-ssr
*.local

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?
```

### Server .gitignore
```
node_modules/
.env
*.log
data/*.sqlite-shm
data/*.sqlite-wal
```

## Step 3: Create GitHub Repository

1. **Go to GitHub**: https://github.com
2. **Sign in** with your account (lwin.chanmyae4@gmail.com)
3. **Click** the "+" icon in top right → "New repository"
4. **Fill in details**:
   - Repository name: `52-puzzle-trade`
   - Description: `A fast-paced multiplayer card trading game`
   - Visibility: Public (or Private if you prefer)
   - **DO NOT** initialize with README (we already have files)
5. **Click** "Create repository"

## Step 4: Push Code to GitHub

After creating the repository, GitHub will show you commands. Use these:

```bash
# Add all files
git add .

# Commit
git commit -m "Initial commit: Complete 52 Puzzle Trade game"

# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/52-puzzle-trade.git

# Push to GitHub
git branch -M main
git push -u origin main
```

If you get authentication errors, you'll need to:
1. Create a Personal Access Token (PAT) on GitHub
2. Use it as your password when pushing

### Creating Personal Access Token:
1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a name: "52-puzzle-trade-deploy"
4. Select scopes: `repo` (full control)
5. Click "Generate token"
6. **Copy the token** (you won't see it again!)
7. Use this token as your password when pushing

## Step 5: Deploy to Vercel (Frontend)

### Option A: Using Vercel Website (Easiest)

1. **Go to**: https://vercel.com
2. **Sign up/Login** with GitHub
3. **Click** "Add New" → "Project"
4. **Import** your `52-puzzle-trade` repository
5. **Configure**:
   - Framework Preset: `Vite`
   - Root Directory: `client`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
6. **Environment Variables**:
   - Click "Environment Variables"
   - Add: `VITE_API_URL` = `https://your-backend-url.railway.app` (we'll get this in next step)
   - For now, use: `http://localhost:3001`
7. **Click** "Deploy"

### Option B: Using Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy from client directory
cd client
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? 52-puzzle-trade
# - Directory? ./
# - Override settings? No

# After deployment, you'll get a URL like:
# https://52-puzzle-trade.vercel.app
```

## Step 6: Deploy to Railway (Backend)

### Option A: Using Railway Website (Easiest)

1. **Go to**: https://railway.app
2. **Sign up/Login** with GitHub
3. **Click** "New Project"
4. **Select** "Deploy from GitHub repo"
5. **Choose** your `52-puzzle-trade` repository
6. **Configure**:
   - Click "Add variables" (if needed)
   - Railway will auto-detect Node.js
7. **Settings**:
   - Root Directory: `server`
   - Start Command: `node index.js`
8. **Deploy** will start automatically
9. **Get your URL**:
   - Click "Settings" → "Domains"
   - Click "Generate Domain"
   - Copy the URL (e.g., `https://52-puzzle-trade-production.up.railway.app`)

### Option B: Using Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
cd server
railway init

# Deploy
railway up

# Get URL
railway domain
```

## Step 7: Connect Frontend to Backend

Now that you have both URLs, update the frontend:

1. **Go to Vercel Dashboard**
2. **Select your project** (52-puzzle-trade)
3. **Go to Settings** → "Environment Variables"
4. **Update** `VITE_API_URL` with your Railway URL
5. **Redeploy** (Vercel will auto-redeploy on env change)

OR update locally and push:

```bash
# client/.env.production
VITE_API_URL=https://your-railway-url.railway.app
```

Then commit and push:
```bash
git add .
git commit -m "Update API URL for production"
git push
```

## Step 8: Update Server CORS

Update your server to allow requests from Vercel:

```javascript
// server/index.js
const cors = require('cors');

app.use(cors({
  origin: [
    'https://your-vercel-app.vercel.app',
    'http://localhost:5173'
  ],
  credentials: true
}));

const io = new Server(server, { 
  cors: { 
    origin: [
      'https://your-vercel-app.vercel.app',
      'http://localhost:5173'
    ],
    credentials: true
  } 
});
```

Commit and push:
```bash
git add .
git commit -m "Update CORS for production"
git push
```

Railway will auto-deploy the changes.

## Step 9: Update Client Socket Connection

```javascript
// client/src/sockets.js
import { io } from 'socket.io-client'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export const socket = io(API_URL, {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
})
```

## Step 10: Test Your Deployment

1. **Visit your Vercel URL**: `https://your-app.vercel.app`
2. **Create a room**
3. **Open in another browser/device** and join
4. **Play a game** to test everything works!

## 🎉 You're Live!

Your game is now deployed and accessible worldwide!

**Share your URL**: `https://your-app.vercel.app`

---

## 📝 Quick Reference

### Your URLs:
- **Frontend (Vercel)**: https://your-app.vercel.app
- **Backend (Railway)**: https://your-api.railway.app
- **GitHub Repo**: https://github.com/YOUR_USERNAME/52-puzzle-trade

### Useful Commands:

```bash
# Update code
git add .
git commit -m "Your message"
git push

# View logs (Railway)
railway logs

# View logs (Vercel)
vercel logs

# Redeploy (Vercel)
vercel --prod

# Redeploy (Railway)
railway up
```

---

## 🐛 Troubleshooting

### "Failed to connect to server"
- Check Railway logs: `railway logs`
- Verify CORS settings in server
- Check VITE_API_URL in Vercel

### "WebSocket connection failed"
- Ensure Railway URL uses HTTPS
- Check Socket.IO configuration
- Verify firewall/network settings

### "Database errors"
- Railway provides persistent storage
- Check Railway volume settings
- Verify data directory permissions

---

## 🔄 Making Updates

When you make changes:

1. **Test locally** first
2. **Commit changes**: `git add . && git commit -m "Description"`
3. **Push to GitHub**: `git push`
4. **Vercel** will auto-deploy frontend
5. **Railway** will auto-deploy backend

---

## 💰 Cost Estimate

### Free Tier (Perfect for starting):
- **Vercel**: Free (100GB bandwidth/month)
- **Railway**: $5 credit/month (enough for small traffic)
- **GitHub**: Free (unlimited public repos)
- **Total**: FREE to start!

### Paid Tier (For more traffic):
- **Vercel Pro**: $20/month (unlimited bandwidth)
- **Railway**: Pay as you go (~$5-20/month)
- **Total**: ~$25-40/month

---

## 🎮 Next Steps

1. **Share your game** with friends
2. **Monitor usage** on Vercel/Railway dashboards
3. **Collect feedback** and iterate
4. **Add features** from FUTURE_FEATURES.md
5. **Scale up** when needed

---

## 📧 Support

If you need help:
- **Vercel Docs**: https://vercel.com/docs
- **Railway Docs**: https://docs.railway.app
- **GitHub Docs**: https://docs.github.com

**Your game is ready to share with the world!** 🚀✨
