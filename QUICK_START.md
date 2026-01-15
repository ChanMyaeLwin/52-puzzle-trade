# 🎮 52 Puzzle Trade - Quick Start Guide

## 🚨 IMPORTANT: Complete These Steps Now!

Your game is almost ready! Just 3 quick steps to get it live:

---

## Step 1: Get Your Railway Backend URL (2 minutes)

1. Open Railway: https://railway.app/dashboard
2. Click your `52-puzzle-trade` project
3. Click the `server` service
4. Go to **Settings** → **Domains**
5. If no domain, click **"Generate Domain"**
6. **Copy the URL** (looks like: `https://52-puzzle-trade-production.up.railway.app`)

---

## Step 2: Set Environment Variable in Vercel (2 minutes)

1. Open Vercel: https://vercel.com/dashboard
2. Click your `52-puzzle-trade` project
3. Go to **Settings** → **Environment Variables**
4. Click **"Add New"**
5. Enter:
   - **Name**: `VITE_API_URL`
   - **Value**: Paste your Railway URL from Step 1
   - **Environment**: Check all boxes (Production, Preview, Development)
6. Click **"Save"**

---

## Step 3: Redeploy Vercel (2 minutes)

1. Go to **Deployments** tab
2. Click the **three dots (...)** on the latest deployment
3. Click **"Redeploy"**
4. Wait 2-3 minutes for deployment to complete

---

## ✅ Test Your Game!

1. Visit: **https://52-puzzle-trade1.vercel.app**
2. Press **F12** to open browser console
3. Look for: `Socket connected` or similar message
4. **Create a room**
5. **Join from another device/browser** with the room code
6. **Play a game** until the timer expires
7. **Verify** the final results show correctly

---

## 🎉 You're Done!

Your game is now live and ready to share!

**Share this URL**: https://52-puzzle-trade1.vercel.app

---

## 🐛 Troubleshooting

### "Cannot connect to server"
- Did you set `VITE_API_URL` in Vercel? (Step 2)
- Did you redeploy after setting it? (Step 3)
- Check Railway logs to verify backend is running

### "Room not found"
- Check Railway backend is running
- Look at Railway logs for errors

### Game crashes when timer ends
- This is already fixed in the latest code
- Make sure you pushed and Vercel redeployed

---

## 📚 More Documentation

- **Deployment Status**: See `DEPLOYMENT_STATUS.md`
- **Recent Fixes**: See `FIXES_APPLIED.md`
- **Vercel Guide**: See `VERCEL_SETUP.md`
- **Railway Guide**: See `DEPLOYMENT_GUIDE.md`
- **Game Rules**: See `GAME_RULES.md`

---

## 🔗 Your Links

- **Game**: https://52-puzzle-trade1.vercel.app
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Railway Dashboard**: https://railway.app/dashboard
- **GitHub**: https://github.com/ChanMyaeLwin/52-puzzle-trade

---

**Need help?** Check the troubleshooting section above or review the detailed documentation files.

**Ready to play?** Complete the 3 steps above and start gaming! 🚀
