# Stream2Gether - Real-Time Google Drive Video Streaming Platform

A real-time, synchronized video streaming application that allows multiple users to watch Google Drive videos together in virtual rooms. Built with the MERN stack and Socket.IO for seamless real-time communication.

## 🚀 Features

- **Real-time Synchronization**: All participants' video playback is perfectly synchronized
- **Google Drive Integration**: Stream videos directly from Google Drive with proper seeking support
- **Host Authority Model**: Room creator controls playback for all participants
- **Live Chat**: Real-time messaging within each room
- **Custom Video Player**: HTML5-based player with custom controls and full-screen support
- **Responsive Design**: Works seamlessly across desktop and mobile devices
- **Automatic Reconnection**: Handles network interruptions gracefully
- **Participant Management**: See who's in your room in real-time

## 🛠 Technology Stack

- **Frontend**: React 18, Vite, React Router
- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Real-time Communication**: Socket.IO
- **Video Streaming**: Google Drive API with custom proxy server
- **Authentication**: Google OAuth2 / Service Account

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- Google Cloud Platform account with Drive API enabled
- npm or yarn package manager

## 🔧 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/amarxxanand/Stream2GetHer.git
cd Stream2GetHer
```

### 2. Install Dependencies

```bash
# Install all dependencies (root, server, and client)
npm run install-all
```

### 3. Google Drive API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Drive API
4. Create credentials:

#### Option A: Service Account (Recommended for Production)
- Create a Service Account
- Download the JSON key file
- Copy the entire JSON content

#### Option B: OAuth2 (For Development)
- Create OAuth2 credentials
- Note down Client ID and Client Secret
- Set up redirect URI: `http://localhost:3000/auth/google/callback`

### 4. Environment Configuration

```bash
# Copy the example environment file
cp .env.example .env
```

Edit `.env` and configure your settings:

```env
# Server Configuration
NODE_ENV=development
PORT=3000
CLIENT_URL=http://localhost:5173

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/stream2gether

# Google Drive API Configuration (Choose one option)

# Option A: Service Account
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"your-project",...}

# Option B: OAuth2
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REFRESH_TOKEN=your-refresh-token
```

### 5. Start the Application

```bash
# Development mode (runs both client and server)
npm run dev

# Or start individually
npm run server  # Backend only
npm run client  # Frontend only
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## 🎯 How to Use

### Creating a Room

1. Open the application in your browser
2. Enter your display name
3. Click "Start a New Room"
4. Share the room link with friends

### Adding a Video (Host Only)

1. Upload your video to Google Drive
2. Right-click the video file and select "Share"
3. Change access to "Anyone with the link"
4. Copy the share link
5. In your room, paste the link in the video controls section
6. Click "Load" to start streaming

### Supported Video Sources

✅ **Multiple video sources now supported!**

#### YouTube Videos
- **YouTube URLs**: Full support for youtube.com and youtu.be links
- **Video IDs**: Direct video ID input (11-character YouTube IDs)
- **Native Integration**: Uses YouTube's official player for best quality
- **Features**: Full YouTube functionality including quality selection, captions, etc.

#### Google Drive & Local Files
- **Google Drive**: Direct streaming from Google Drive URLs
- **All File Formats**: Universal format support

**Video Formats:**
- **MP4** - Direct streaming (recommended for best performance)
- **MKV** - Direct streaming (⚠️ seeking may be limited or slow)
- **AVI** - Direct streaming
- **MOV** - Direct streaming
- **WebM** - Direct streaming
- **FLV** - Direct streaming
- **WMV** - Direct streaming
- **And many more...**

**Note about MKV files:** While MKV files now play directly without transcoding, seeking (jumping to specific times) may not work properly or may be very slow. This is a browser limitation with MKV format. For best seeking performance, convert MKV files to MP4.

## 🏗 Architecture Overview

### Backend Architecture

```
server/
├── index.js                 # Main server file with Express setup
├── services/
│   └── googleDriveService.js # Google Drive API integration
├── socket/
│   └── socketHandlers.js    # Socket.IO event handlers
└── models/
    ├── Room.js              # Room data model
    └── Message.js           # Chat message model
```

### Key Backend Features

- **Video Proxy Service**: Streams Google Drive videos with HTTP Range support for seeking
- **Socket.IO Server**: Manages real-time communication and room synchronization
- **RESTful API**: Handles room creation, metadata, and chat history

### Frontend Architecture

```
client/src/
├── components/
│   ├── VideoPlayer.jsx      # Custom HTML5 video player
│   ├── VideoControls.jsx    # Host video management controls
│   ├── RoomPage.jsx         # Main room interface
│   ├── Chat.jsx             # Real-time chat component
│   └── UserList.jsx         # Participants list
├── hooks/
│   └── useVideoPlayer.js    # Video player state management
└── contexts/
    └── SocketContext.jsx    # Socket.IO context provider
```

### Synchronization Strategy

1. **Host Authority**: Only the room creator can control playback
2. **Event Broadcasting**: Host actions are broadcast to all participants
3. **Automatic Sync**: New users are synchronized to current playback state
4. **Latency Compensation**: Smart buffering and drift correction

## 🔐 Security Considerations

- Google Drive API credentials are server-side only
- Rate limiting on API endpoints
- CORS protection
- Input validation and sanitization
- Secure WebSocket connections

## 📊 Performance Features

- **Efficient Streaming**: Direct proxy streaming without full file download
- **Memory Optimization**: Stream piping prevents memory bottlenecks
- **Caching Headers**: Proper HTTP caching for video content
- **Adaptive Loading**: Progressive video loading based on network conditions

## 🚀 Deployment

### Production Build

```bash
# Build the client
npm run build

# Start production server
npm start
```

### Environment Variables for Production

```env
NODE_ENV=production
CLIENT_URL=https://yourdomain.com
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/stream2gether
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
```

### Deployment Platforms

- **Backend**: Railway, Heroku, DigitalOcean, AWS
- **Frontend**: Vercel, Netlify, AWS S3+CloudFront
- **Database**: MongoDB Atlas, AWS DocumentDB

## 🔧 Troubleshooting

### Common Issues

1. **Video Not Loading**
   - Ensure Google Drive link has "Anyone with the link" access
   - Check that the file is a supported video format
   - Verify Google Drive API credentials

2. **Synchronization Issues**
   - Check network connection
   - Ensure WebSocket connection is established
   - Try refreshing the room

3. **API Quota Exceeded**
   - Monitor Google Drive API usage
   - Consider implementing caching
   - Upgrade to higher quotas if needed

### Debug Mode

Enable debug logging:

```env
DEBUG=stream2gether:*
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with the powerful MERN stack
- Socket.IO for real-time communication
- Google Drive API for video streaming
- React ecosystem for modern UI development

## 📞 Support

For support, please open an issue on GitHub or contact the development team.

---

**Note**: This application is designed for educational and personal use. For production deployments serving many users, consider migrating to a professional Video-on-Demand (VOD) platform like AWS Media Services, Mux, or Cloudinary for better performance and features like Adaptive Bitrate Streaming.
