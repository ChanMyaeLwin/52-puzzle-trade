# 🚀 Vercel Deployment Guide

## Quick Setup

### Step 1: Push to GitHub
```bash
cd 52-puzzle-trade
git add .
git commit -m "Add Vercel configuration"
git push
```

### Step 2: Deploy to Vercel

#### Option A: Using Vercel Website (Recommended)

1. **Go to**: https://vercel.com
2. **Sign in** with GitHub
3. **Click** "Add New" → "Project"
4. **Import** your repository: `ChanMyaeLwin/52-puzzle-trade`
5. **Configure Project**:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `client` ⚠️ IMPORTANT!
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

6. **Environment Variables** (Add these):
   - Name: `VITE_API_URL`
   - Value: `https://your-railway-url.railway.app` (get this from Railway)
   - For now, you can use: `http://localhost:3001`

7. **Click** "Deploy"

#### Option B: Using Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
cd client
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? 52-puzzle-trade
# - Directory? ./ (current directory)
# - Override settings? No

# Set environment variable
vercel env add VITE_API_URL production
# Enter your Railway URL when prompted

# Deploy to production
vercel --prod
```

## Step 3: Get Your URLs

After deployment:

### Vercel URL (Frontend)
- You'll get a URL like: `https://52-puzzle-trade.vercel.app`
- Or custom domain: `https://your-domain.com`

### Railway URL (Backend)
1. Go to Railway dashboard
2. Click your project
3. Go to Settings → Domains
4. Click "Generate Domain"
5. Copy the URL (e.g., `https://52-puzzle-trade-production.up.railway.app`)

## Step 4: Update Environment Variables

### In Vercel:
1. Go to your project dashboard
2. Click "Settings" → "Environment Variables"
3. Update `VITE_API_URL` with your Railway URL
4. Click "Save"
5. Redeploy (Vercel will auto-redeploy)

### In Railway (Update CORS):
Update your server to allow Vercel domain:

```javascript
// server/index.js
const cors = require('cors');

app.use(cors({
  origin: [
    'https://52-puzzle-trade.vercel.app',  // Your Vercel URL
    'https://your-custom-domain.com',      // If you have custom domain
    'http://localhost:5173'                // For local development
  ],
  credentials: true
}));

const io = new Server(server, { 
  cors: { 
    origin: [
      'https://52-puzzle-trade.vercel.app',
      'https://your-custom-domain.com',
      'http://localhost:5173'
    ],
    credentials: true
  } 
});
```

Then commit and push:
```bash
git add .
git commit -m "Update CORS for Vercel"
git push
```

Railway will auto-deploy the changes.

## Step 5: Test Your Deployment

1. Visit your Vercel URL: `https://52-puzzle-trade.vercel.app`
2. Create a room
3. Open in another browser/device and join with the code
4. Play a game!

## 🎉 You're Live!

Your game is now deployed and accessible worldwide!

**Share your URL**: `https://52-puzzle-trade.vercel.app`

---

## 🔧 Troubleshooting

### Build Fails on Vercel

**Error**: "Cannot find module"
- **Solution**: Make sure Root Directory is set to `client`

**Error**: "Build command failed"
- **Solution**: Check that `npm run build` works locally first

### WebSocket Connection Issues

**Error**: "Failed to connect to server"
- **Solution**: 
  1. Check VITE_API_URL is set correctly
  2. Verify Railway backend is running
  3. Check CORS settings in server

### Environment Variables Not Working

**Error**: API URL is undefined
- **Solution**:
  1. Make sure variable name is `VITE_API_URL` (with VITE_ prefix)
  2. Redeploy after adding variables
  3. Check browser console for the actual URL being used

---

## 📝 Useful Commands

```bash
# View deployment logs
vercel logs

# List deployments
vercel ls

# Deploy to production
vercel --prod

# Remove deployment
vercel rm [deployment-url]

# Open project in browser
vercel open
```

---

## 🔄 Making Updates

When you make changes:

1. **Test locally**
2. **Commit**: `git add . && git commit -m "Your message"`
3. **Push**: `git push`
4. **Vercel auto-deploys** from GitHub

Or deploy manually:
```bash
cd client
vercel --prod
```

---

## 💰 Vercel Pricing

### Hobby (Free)
- ✅ Unlimited deployments
- ✅ 100GB bandwidth/month
- ✅ Automatic HTTPS
- ✅ Custom domains
- ✅ Perfect for this project!

### Pro ($20/month)
- Everything in Hobby
- Unlimited bandwidth
- Team collaboration
- Advanced analytics

---

## 🌐 Custom Domain (Optional)

1. **Buy a domain** (Namecheap, GoDaddy, etc.)
2. **In Vercel**:
   - Go to Settings → Domains
   - Add your domain
   - Follow DNS instructions
3. **Update CORS** in server with new domain
4. **Done!**

---

## ✅ Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] Vercel project created
- [ ] Root directory set to `client`
- [ ] VITE_API_URL environment variable added
- [ ] Railway backend deployed
- [ ] CORS updated in server
- [ ] Tested on multiple devices
- [ ] Shared with friends!

---

## 🎮 Your Live URLs

- **Frontend**: https://52-puzzle-trade.vercel.app
- **Backend**: https://your-app.railway.app
- **GitHub**: https://github.com/ChanMyaeLwin/52-puzzle-trade

**Enjoy your deployed game!** 🚀✨
