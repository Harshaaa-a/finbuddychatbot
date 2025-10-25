# 🌐 How to Connect Frontend and Backend in Netlify

## 🔗 The Connection Process

To connect your Netlify frontend with your backend, you need to set the `VITE_API_URL` environment variable in Netlify.

---

## 📋 Prerequisites

1. **Backend deployed** (Render, Railway, or any hosting service)
2. **Backend URL** (e.g., `https://your-backend.onrender.com`)
3. **Netlify project** created and deployed

---

## 🚀 Step-by-Step: Connect Frontend to Backend

### Step 1: Get Your Backend URL

First, make sure your backend is deployed and running:

1. **If using Render**: Go to your Render dashboard → Copy your service URL
2. **If using Railway**: Go to your Railway dashboard → Copy your service URL
3. **Test your backend**: Visit `https://your-backend-url/health`

**Example backend URL**: `https://finbuddy-backend.onrender.com`

### Step 2: Set Environment Variable in Netlify

1. **Go to your Netlify dashboard**
2. **Click on your project**
3. **Go to Site Settings → Environment Variables**
4. **Click "Add Variable"**
5. **Fill in:**
   - **Key**: `VITE_API_URL`
   - **Value**: `https://your-backend-url.onrender.com`
   - **Scopes**: Check all boxes (Production, Preview, Branch deploys)

### Step 3: Redeploy Your Site

1. **Go to Deployments tab**
2. **Click "Trigger deploy" → "Deploy site"**
3. **Wait for deployment to complete**

---

## 🔧 Alternative: Set Environment Variable During Initial Setup

If you haven't deployed to Netlify yet:

### During Netlify Setup:
1. **Go to [netlify.com](https://netlify.com)**
2. **New site from Git → GitHub**
3. **Select your repository**
4. **Build settings:**
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: `18`
5. **Click "Show advanced"**
6. **Add environment variable:**
   - Key: `VITE_API_URL`
   - Value: `https://your-backend-url.onrender.com`
7. **Click "Deploy site"**

---

## ✅ Verify the Connection

### Test 1: Check Environment Variable
1. **Go to Site Settings → Environment Variables**
2. **Verify `VITE_API_URL` is set correctly**
3. **Make sure there's no trailing slash**

### Test 2: Test Your App
1. **Visit your Netlify site**
2. **Open browser developer tools (F12)**
3. **Go to Console tab**
4. **Send a chat message**
5. **Check if requests go to your backend URL**

### Test 3: Check Network Requests
1. **Open browser developer tools (F12)**
2. **Go to Network tab**
3. **Send a chat message**
4. **Look for requests to your backend URL**
5. **Should see successful API calls**

---

## 🔧 Troubleshooting

### Problem: Frontend can't connect to backend
**Solution:**
- Check `VITE_API_URL` is set correctly
- Make sure backend URL has no trailing slash
- Verify backend is running (test `/health` endpoint)

### Problem: CORS errors
**Solution:**
- Backend already has CORS enabled
- Check backend logs for errors
- Verify backend URL is correct

### Problem: Environment variable not working
**Solution:**
- Redeploy your Netlify site after setting the variable
- Check variable name is exactly `VITE_API_URL`
- Make sure variable is set for all scopes

---

## 🎯 Example Configuration

### Backend (Render)
```
URL: https://finbuddy-backend.onrender.com
Health check: https://finbuddy-backend.onrender.com/health
```

### Frontend (Netlify)
```
Environment Variable:
VITE_API_URL = https://finbuddy-backend.onrender.com
```

### Result
- Frontend will make API calls to your backend
- Chat messages will be processed by your AI
- Everything works seamlessly!

---

## 🚀 Quick Commands

```bash
# Test backend locally
curl https://your-backend-url.onrender.com/health

# Test frontend locally (if backend is running)
npm run dev
```

---

## 🎉 Success!

Once connected:
- ✅ Frontend deployed on Netlify
- ✅ Backend deployed on Render/Railway
- ✅ Environment variable set correctly
- ✅ Chat functionality working
- ✅ AI responses coming from your backend

**Your FinBuddy AI chatbot is now fully connected and live!** 🎉💰🤖




