# Complete Deployment Guide for Stream2Gether

## The Problem with Vercel
Vercel is primarily a frontend hosting platform and doesn't support WebSocket/Socket.IO connections well. Your app needs both frontend AND backend deployment.

## Recommended Deployment Strategy

### Step 1: Deploy Backend to Railway (Free Tier Available)

1. **Create Railway Account**: Visit [railway.app](https://railway.app)
2. **Connect GitHub**: Link your GitHub repository
3. **Deploy Backend**:
   - Select your repository
   - Choose "Deploy from GitHub repo"
   - Railway will automatically detect the `railway.toml` configuration
   - Set environment variables:
     - `MONGODB_URI`: Your MongoDB Atlas connection string
     - `CLIENT_URL`: Will be your Vercel URL (add later)
     - `NODE_ENV`: production

4. **Note the Backend URL**: Railway will provide a URL like `https://your-app.up.railway.app`

### Step 2: Deploy Frontend to Vercel

1. **Configure Vercel Project**:
   - Go to Vercel dashboard
   - Import your GitHub repository
   - **IMPORTANT**: Set Root Directory to `client` (not the root folder)
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

2. **Set Environment Variables in Vercel**:
   - `VITE_SERVER_URL`: Your Railway backend URL from Step 1
   - `VITE_API_BASE_URL`: Your Railway backend URL + `/api`

### Step 3: Update Backend CORS

Update your backend's CLIENT_URL environment variable in Railway to match your Vercel URL.

## Alternative: Deploy Backend to Render

If Railway doesn't work, use Render:

1. **Create Render Account**: Visit [render.com](https://render.com)
2. **Connect GitHub**: Link your repository
3. **Create Web Service**:
   - Build Command: `cd server && npm install`
   - Start Command: `cd server && npm start`
   - Set environment variables (same as Railway)

## Quick Fix for Current Vercel Error

The immediate error is because Vercel can't find the `vite` command. Here's the fastest fix:

### Option A: Change Vercel Project Settings
1. In Vercel dashboard, go to Project Settings
2. Set **Root Directory** to `client`
3. Redeploy

### Option B: Use the Updated vercel.json
The `vercel.json` file has been updated to handle the client directory properly.

## Environment Variables Summary

### Backend (Railway/Render):
```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/stream2gether
CLIENT_URL=https://your-vercel-app.vercel.app
NODE_ENV=production
PORT=(automatically set by platform)
```

### Frontend (Vercel):
```
VITE_SERVER_URL=https://your-railway-app.up.railway.app
VITE_API_BASE_URL=https://your-railway-app.up.railway.app/api
```

## Testing the Deployment

1. Frontend should load on Vercel URL
2. Backend should be accessible at Railway/Render URL
3. Test real-time features by opening the app in multiple browsers

## Troubleshooting

- **CORS errors**: Make sure CLIENT_URL in backend matches your Vercel URL
- **Connection issues**: Verify VITE_SERVER_URL in frontend matches backend URL
- **Build failures**: Ensure Root Directory is set to `client` in Vercel
