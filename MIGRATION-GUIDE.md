# Quick Setup Guide - Google Drive Video Streaming

This guide will help you quickly migrate from YouTube to Google Drive video streaming.

## 🎯 What Changed

Your Stream2Gether application now streams videos from Google Drive instead of YouTube, providing:
- More control over video content
- Support for any video format
- No dependency on YouTube's API
- Custom video player with full feature control

## ⚡ Quick Start

### 1. Install New Dependencies

```bash
# Navigate to your project
cd /home/jack/Stream2GetHer

# Install server dependencies
cd server && npm install googleapis

# Install client dependencies  
cd ../client && npm install react-player

# Go back to root
cd ..
```

### 2. Set Up Google Drive API

#### Option A: Quick Setup with Service Account (Recommended)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing)
3. Enable Google Drive API
4. Go to "Credentials" → "Create Credentials" → "Service Account"
5. Create the service account and download the JSON key
6. Copy the ENTIRE JSON content

#### Option B: OAuth2 Setup (Alternative)

1. In Google Cloud Console, create OAuth2 credentials
2. Set authorized redirect URI: `http://localhost:3000/auth/google/callback`
3. Note down Client ID and Client Secret

### 3. Configure Environment

```bash
# Copy the example environment file
cp .env.example .env
```

Edit `.env` file:

```env
# Basic Configuration
NODE_ENV=development
PORT=3000
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb://localhost:27017/stream2gether

# Option A: Service Account (paste the entire JSON)
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"your-project","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}

# Option B: OAuth2 (alternative to service account)
# GOOGLE_CLIENT_ID=your-client-id
# GOOGLE_CLIENT_SECRET=your-client-secret
# GOOGLE_REFRESH_TOKEN=your-refresh-token
```

### 4. Start the Application

```bash
# Start both client and server
npm run dev
```

Visit http://localhost:5173 to use your application!

## 🎬 How to Use Videos

### For Video Hosts:

1. **Upload video to Google Drive**
   - Any format: MP4, WebM, AVI, MOV, etc.

2. **Share the video**
   - Right-click video → "Share"
   - Change to "Anyone with the link"
   - Copy the share link

3. **Load in your room**
   - Paste the Google Drive link
   - Add optional title
   - Click "Load"

### Supported URL Formats:
- `https://drive.google.com/file/d/FILE_ID/view?usp=sharing`
- `https://drive.google.com/open?id=FILE_ID`
- `FILE_ID` (just the ID)

## 🔧 Key Changes Made

### Backend Changes:
- ✅ Added Google Drive API service (`googleDriveService.js`)
- ✅ Implemented video streaming proxy (`/api/video/stream`)
- ✅ Updated Room model for Google Drive URLs
- ✅ Modified socket handlers for new video system

### Frontend Changes:
- ✅ Replaced YouTube player with custom HTML5 video player
- ✅ Updated video controls for Google Drive URLs
- ✅ New video player hook (`useVideoPlayer.js`)
- ✅ Updated UI text and instructions

### New Features:
- ✅ HTTP Range request support for video seeking
- ✅ Custom video player with full control
- ✅ Metadata validation for video files
- ✅ Better error handling and user feedback

## 🚨 Troubleshooting

### Video Won't Load
1. **Check sharing permissions**: Ensure "Anyone with the link" access
2. **Verify file format**: Use common video formats (MP4 recommended)
3. **Check API credentials**: Ensure Google Drive API is properly configured

### API Errors
1. **Check credentials**: Verify your service account key is correct
2. **Enable API**: Make sure Google Drive API is enabled in your project
3. **Check quotas**: Monitor your API usage in Google Cloud Console

### Connection Issues
1. **Check MongoDB**: Ensure MongoDB is running
2. **Port conflicts**: Make sure ports 3000 and 5173 are available
3. **Firewall**: Check if ports are not blocked

## 📋 Testing Checklist

- [ ] Application starts without errors
- [ ] Can create a room
- [ ] Can load a Google Drive video
- [ ] Video plays and syncs between users
- [ ] Chat works correctly
- [ ] Video controls work (play, pause, seek)
- [ ] Video quality is good

## 🔮 Next Steps

1. **Test with different video formats**
2. **Try with multiple users in a room**
3. **Test video seeking and synchronization**
4. **Customize the video player styling**
5. **Add more features like volume sync, playlist support**

## 📞 Need Help?

1. Check the full README-GOOGLE-DRIVE.md for detailed documentation
2. Verify your Google Cloud Console setup
3. Check browser console for errors
4. Ensure all environment variables are set correctly

---

🎉 **Congratulations!** Your Stream2Gether application now supports Google Drive video streaming with full synchronization capabilities!
