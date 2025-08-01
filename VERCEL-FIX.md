# Quick Fix for Vercel Deployment

## The Issue
Vercel is trying to run `vite` command but it's not installed in the root directory. The dependencies are in the `client` folder.

## Solution 1: Configure Vercel Project Settings (Recommended)

In your Vercel dashboard:

1. Go to your project settings
2. Set **Root Directory** to `client`
3. Set **Build Command** to `npm run build`
4. Set **Output Directory** to `dist`
5. Set **Install Command** to `npm install`

This tells Vercel to treat the `client` folder as the root of your project.

## Solution 2: Alternative vercel.json (if Solution 1 doesn't work)

Replace the current `vercel.json` with:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "client/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/client/$1"
    }
  ]
}
```

## Solution 3: Deploy Only Client Folder

Instead of deploying the entire repo, deploy only the `client` folder:

1. Create a new repo with just the client code
2. Copy everything from `Stream2GetHer/client/` to the new repo
3. Deploy the new repo to Vercel

## Environment Variables for Vercel

After deployment, add these environment variables in Vercel dashboard:

- `VITE_SERVER_URL`: Your backend server URL (you'll need to deploy the backend separately)

## Next Steps

1. Deploy the backend to Railway, Render, or another platform that supports WebSockets
2. Update the `VITE_SERVER_URL` in Vercel to point to your backend
3. Test the connection between frontend and backend
