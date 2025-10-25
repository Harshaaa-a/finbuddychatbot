# 🚀 Deploy Backend to Heroku

## 🎯 Heroku Deployment Guide

Heroku is a classic, reliable platform for Node.js backends with a generous free tier.

---

## 🚀 Step 1: Sign up for Heroku

1. **Go to [heroku.com](https://heroku.com)**
2. **Sign up for free account**
3. **Verify your email**

---

## 🚀 Step 2: Create Heroku App

1. **Go to Dashboard → New → Create new app**
2. **Choose app name** (e.g., `finbuddy-backend`)
3. **Choose region** (US or Europe)
4. **Click "Create app"**

---

## 🚀 Step 3: Connect GitHub

1. **Go to Deploy tab**
2. **Connect to GitHub**
3. **Select your repository**: `finbuddy-chat-ai-main`
4. **Enable automatic deploys**

---

## 🚀 Step 4: Configure Build Settings

1. **Go to Settings tab**
2. **Click "Reveal Config Vars"**
3. **Add environment variables:**
   - **Key**: `NODE_ENV`
   - **Value**: `production`

---

## 🚀 Step 5: Set Buildpacks

1. **Go to Settings tab**
2. **Add buildpack**: `heroku/nodejs`

---

## 🚀 Step 6: Create Procfile

Create a `Procfile` in your backend folder:

```bash
# Create Procfile in backend directory
echo "web: npm run free" > backend/Procfile
```

---

## 🚀 Step 7: Deploy

1. **Go to Deploy tab**
2. **Click "Deploy Branch"**
3. **Wait for deployment (3-5 minutes)**

---

## 🔧 Update Frontend Connection

### Step 1: Get Heroku URL
Your backend will be available at: `https://your-app-name.herokuapp.com`

### Step 2: Update Netlify
1. **Go to Netlify dashboard**
2. **Site Settings → Environment Variables**
3. **Update `VITE_API_URL`:**
   - **New value**: `https://your-app-name.herokuapp.com`

### Step 3: Redeploy Frontend
1. **Go to Deployments tab**
2. **Click "Trigger deploy"**

---

## ✅ Test Your Backend

### Test 1: Health Check
```bash
curl https://your-app-name.herokuapp.com/health
```

### Test 2: Chat API
```bash
curl -X POST https://your-app-name.herokuapp.com/chat \
-H "Content-Type: application/json" \
-d '{"message": "Hello"}'
```

---

## 💰 Heroku Free Tier

- **550 hours/month** (covers 24/7 usage)
- **512MB RAM**
- **1GB storage**
- **Total cost: $0.00/month**

---

## 🎉 Expected Result

Once deployed:
- ✅ Backend running on Heroku
- ✅ Health check working
- ✅ Chat API responding
- ✅ Frontend connected to Heroku backend
- ✅ AI responses working perfectly

**Your FinBuddy AI will be live!** 🎉💰🤖




