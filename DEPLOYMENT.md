# Deploying FinBuddy to Railway

This guide will help you deploy both the frontend and backend to Railway.

## Prerequisites

1. A [Railway account](https://railway.app/) (sign up with GitHub)
2. Your code pushed to a GitHub repository
3. Railway CLI (optional): `npm install -g @railway/cli`

## Deployment Steps

### Step 1: Deploy Backend

1. **Go to Railway Dashboard**
   - Visit [railway.app/dashboard](https://railway.app/dashboard)
   - Click "New Project"

2. **Connect GitHub Repository**
   - Select "Deploy from GitHub repo"
   - Choose your `finbuddy-chat-ai-main` repository
   - Railway will detect it's a Node.js project

3. **Configure Backend Service**
   - Railway should auto-detect the backend
   - If not, set these manually:
     - **Root Directory**: `backend`
     - **Start Command**: `npm start` or `node freeServer.js` (for free version)
     - **Build Command**: `npm install`

4. **Set Environment Variables**
   Click on your service → Variables → Add these:
   
   **For Free Version (freeServer.js):**
   ```
   PORT=3001
   NODE_ENV=production
   ```
   
   **For Full Version (server.js):**
   ```
   PORT=3001
   NODE_ENV=production
   OPENAI_API_KEY=your_openai_api_key_here
   ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key_here
   FINNHUB_API_KEY=your_finnhub_key_here
   ```

5. **Deploy & Get Backend URL**
   - Railway will automatically deploy
   - Once deployed, click on your service → Settings → "Generate Domain"
   - Copy your backend URL (e.g., `https://finbuddy-backend-production.up.railway.app`)

### Step 2: Deploy Frontend

1. **Create New Service in Same Project**
   - In your Railway project, click "New Service"
   - Select "Deploy from GitHub repo"
   - Choose the same repository

2. **Configure Frontend Service**
   - **Root Directory**: `.` (root)
   - **Build Command**: `npm run build`
   - **Start Command**: `npm run preview`

3. **Set Frontend Environment Variable**
   Add this variable to your frontend service:
   ```
   VITE_API_URL=https://your-backend-url.railway.app
   ```
   (Use the backend URL from Step 1.5)

4. **Generate Domain**
   - Go to Settings → Generate Domain
   - Your app will be live at the generated URL!

### Step 3: Verify Deployment

1. Visit your frontend URL
2. Open the chat interface
3. Send a test message
4. If it works, you're done! 🎉

### Troubleshooting

**Backend won't start:**
- Check logs in Railway dashboard
- Verify environment variables are set correctly
- Make sure `PORT` is set to `3001` or remove it (Railway auto-assigns)

**Frontend can't connect to backend:**
- Verify `VITE_API_URL` is set correctly (no trailing slash)
- Check backend service is running (green status in Railway)
- Look at browser console for CORS errors

**CORS issues:**
- Backend already has CORS enabled via `cors()` middleware
- If issues persist, check Railway service logs

### Cost

- Railway free tier: **500 hours/month** (plenty for both services)
- Should stay within free tier with normal usage
- Monitor usage in Railway dashboard

### Using the Free Version

To avoid API costs, use `freeServer.js`:

1. In backend environment variables, don't set API keys
2. Change start command to: `node freeServer.js`
3. Everything else remains the same

The free version uses intelligent pattern matching and free APIs - no paid services required!

## Local Development

To test locally with the new configuration:

1. **Backend:**
   ```bash
   cd backend
   npm install
   npm run free  # or npm start for full version
   ```

2. **Frontend:**
   ```bash
   npm install
   npm run dev
   ```

The frontend will use `http://localhost:3001` by default when `VITE_API_URL` is not set.
