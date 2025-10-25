# 🎯 FinBuddy AI - Quick Deploy Reference

## 🚀 100% FREE Deployment (Vercel + Netlify + Railway)

### ⚡ Quick Start (5 minutes)

1. **Backend**: [railway.app](https://railway.app) → Deploy from GitHub → Select repo → Root: `backend` → Start: `npm run free`
2. **Frontend Vercel**: [vercel.com](https://vercel.com) → Import from GitHub → Select repo → Framework: Vite
3. **Frontend Netlify**: [netlify.com](https://netlify.com) → New site from Git → Select repo → Build: `npm run build` → Publish: `dist`

### 🔧 Environment Variables

**Backend (Railway):**
```
PORT=3001
NODE_ENV=production
```

**Frontend (Vercel + Netlify):**
```
VITE_API_URL=https://your-backend-url.railway.app
```

### 💰 Cost Breakdown
- **Railway**: 500 hours/month (FREE)
- **Vercel**: 100GB bandwidth/month (FREE)  
- **Netlify**: 100GB bandwidth/month (FREE)
- **Total**: $0.00/month

### 🎉 Result URLs
- Backend: `https://your-project.up.railway.app`
- Frontend Vercel: `https://your-project.vercel.app`
- Frontend Netlify: `https://your-project.netlify.app`

### 🛠️ Helper Commands
```bash
# Run deployment helper
./deploy-free.sh

# Build locally
npm run build

# Test locally
cd backend && npm run free-dev
npm run dev
```

### ✅ Verification
- Backend health: `https://your-backend-url/health`
- Chat test: Send message in frontend
- Should return: `{"status":"OK (FREE)","cost":"$0.00"}`

**Ready to deploy!** 🚀💰🤖




