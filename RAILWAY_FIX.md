# Railway Configuration for FinBuddy Full-Stack App

## Current Issue
Railway is trying to run `npm run free` from root directory, but:
- Root package.json has `"type": "module"` (ES modules)
- Backend uses CommonJS `require()` syntax
- Dependencies aren't installed in root

## Solution: Update Railway Settings

### Option 1: Railway Dashboard Settings (RECOMMENDED)

1. **Go to your Railway project dashboard**
2. **Click on your service**
3. **Go to Settings tab**
4. **Update these settings:**

```
Root Directory: backend
Build Command: cd .. && npm install && npm run build
Start Command: node freeServer.js
```

### Option 2: Use railway.json (CURRENT)

The `railway.json` file has been updated to:
```json
{
  "deploy": {
    "startCommand": "cd backend && node freeServer.js"
  }
}
```

### Option 3: Manual Railway Configuration

If the above doesn't work, configure manually:

1. **Root Directory:** `backend`
2. **Build Command:** `cd .. && npm install && npm run build`
3. **Start Command:** `node freeServer.js`

## Why This Works

- ✅ Railway runs from `backend` directory
- ✅ Build command goes up one level, builds frontend, comes back
- ✅ Start command runs `freeServer.js` directly
- ✅ No ES module conflicts
- ✅ All dependencies are in the right place

## Expected Result

After redeployment:
- 🌐 **Frontend:** Serves React app
- 💬 **Backend:** API endpoints work
- ✅ **Health:** `/health` returns OK
- 🔗 **Connection:** Frontend connects to backend

## Test Commands

```bash
# Test backend locally
cd backend
node freeServer.js

# Test health endpoint
curl http://localhost:3001/health

# Test chat endpoint
curl -X POST http://localhost:3001/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello"}'
```

## Redeploy on Railway

1. **Push your changes to GitHub**
2. **Railway will auto-deploy**
3. **Check the logs** for any errors
4. **Test the endpoints** once deployed

The connection issue should be resolved! 🚀
