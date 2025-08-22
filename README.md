# 🎬 Stream2GetHer - Real-Time Synchronized Video Streaming Platform

> **Watch videos together, perfectly synchronized** - A modern MERN stack application for collaborative video streaming with Google Drive integration, YouTube support, and real-time chat.

[![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen)](https://stream2gether.onrender.com)
[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18.2.0-blue)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-green)](https://nodejs.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-Real--time-orange)](https://socket.io/)

## 🌟 What is Stream2GetHer?

Stream2GetHer is a sophisticated real-time synchronized media platform that enables multiple users to watch videos together with perfect synchronization. Whether it's a movie night with friends, educational content sharing, or team presentations, Stream2GetHer brings people together through shared viewing experiences.

### 🎯 Perfect For:
- **Virtual Movie Nights** with friends and family
- **Educational Content** sharing and learning
- **Team Presentations** and video reviews
- **Long-distance Relationships** sharing moments
- **Community Events** and watch parties

## ✨ Key Features

### 🎥 **Multi-Source Video Support**
- **Google Drive Integration**: Stream any video file directly from Google Drive
- **YouTube Support**: Full YouTube video playback with native controls
- **Universal Format Support**: MP4, MKV, AVI, MOV, WebM, FLV, WMV, and more
- **Direct URL Support**: Load videos from any direct video URL

### 🔄 **Perfect Synchronization**
- **Real-time Sync**: Perfect synchronization across all participants
- **Host Authority**: Designated host controls playback for everyone
- **Auto-correction**: Automatic drift correction every 10 seconds
- **Buffer Recovery**: Smart resync after buffering or network issues
- **Latency Compensation**: Configurable sync tolerance (default: 1.5s)

### 💬 **Interactive Features**
- **Live Chat**: Real-time messaging with color-coded messages
  - 🟢 **Green bubbles** for your messages
  - 🔵 **Blue bubbles** for incoming messages
- **User Management**: See who's in the room with host indicators
- **Room System**: Create and join rooms with unique IDs
- **Connection Status**: Real-time connection indicators

### 🎨 **Modern Dark UI**
- **Sleek Black Theme**: Professional dark interface
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Glassmorphism Effects**: Modern visual design with backdrop blur
- **Smooth Animations**: Fluid user experience with CSS transitions

## 🏗️ Technical Architecture

### **Technology Stack**
```
Frontend: React 18 + Vite + React Router + Socket.IO Client
Backend:  Node.js + Express + Socket.IO + MongoDB
UI:       CSS Modules + Lucide Icons + Modern Design System
```

### **System Flow**
```
┌─────────────────┐    WebSocket    ┌──────────────────┐    MongoDB    ┌─────────────┐
│  React Client   │ ◄─────────────► │  Node.js Server │ ◄───────────► │  Database   │
│                 │                 │                  │               │             │
│ • Video Player  │                 │ • Socket.IO      │               │ • Rooms     │
│ • Chat System   │                 │ • Google Drive   │               │ • Messages  │
│ • User Lists    │                 │ • Room Logic     │               │ • Sessions  │
│ • Sync Engine   │                 │ • FFmpeg Service │               │ • Metadata  │
└─────────────────┘                 └──────────────────┘               └─────────────┘
```

## 🚀 Quick Start

### **Prerequisites**
- Node.js 16+ and npm
- MongoDB (local or cloud)
- Modern web browser
- Google Drive API credentials (for Google Drive integration)

### **1. Clone & Install**
```bash
git clone https://github.com/amarxxanand/Stream2GetHer.git
cd Stream2GetHer
npm run install-all
```

### **2. Environment Setup**

**Server Configuration** (`server/.env`):
```env
# Server Configuration
PORT=3000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Database
MONGODB_URI=mongodb://localhost:27017/stream2gether

# Google Drive API (Optional but recommended)
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# FFmpeg Configuration
FFMPEG_PATH=/usr/bin/ffmpeg
ENABLE_TRANSCODING=true
```

**Client Configuration** (`client/.env`):
```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_SERVER_URL=http://localhost:3000
```

### **3. Start Development**
```bash
# Start both server and client concurrently
npm run dev

# Or start individually
npm run server  # Server: http://localhost:3000
npm run client  # Client: http://localhost:5173
```

### **4. Production Build**
```bash
# Build for production
npm run build

# Start production server
npm start
```

## 📁 Project Structure

```
Stream2GetHer/
├── 📦 server/                     # Backend Node.js application
│   ├── 📁 models/                # MongoDB schemas (Room, Message)
│   ├── 📁 socket/                # Socket.IO event handlers
│   ├── 📁 services/              # Business logic services
│   │   ├── googleDriveService.js # Google Drive integration
│   │   └── transcodingService.js # Video transcoding with FFmpeg
│   ├── 📄 index.js               # Main server file
│   └── 📄 package.json           # Server dependencies
├── 📦 client/                     # Frontend React application
│   ├── 📁 src/
│   │   ├── 📁 components/        # React components
│   │   │   ├── HomePage.jsx      # Landing page
│   │   │   ├── RoomPage.jsx      # Main room interface
│   │   │   ├── VideoPlayer.jsx   # Multi-source video player
│   │   │   ├── Chat.jsx          # Real-time chat
│   │   │   └── VideoControls.jsx # Host video controls
│   │   ├── 📁 contexts/          # React contexts (Socket)
│   │   ├── 📁 hooks/             # Custom hooks
│   │   ├── 📁 services/          # Client services
│   │   └── 📁 styles/            # CSS modules and global styles
│   └── 📄 package.json           # Client dependencies
├── 📄 README.md                  # This documentation
├── 📄 FEATURES.md                # Detailed features documentation
└── 📄 render.yaml               # Production deployment config
```

## 🎮 How to Use

### **Creating a Room**
1. Open the application in your browser
2. Enter your display name (max 30 characters)
3. Click **"Create Room"** to generate a unique room
4. Share the room URL or ID with friends

### **Joining a Room**
1. Get the room ID from the host
2. Enter your display name
3. Enter the room ID and click **"Join Room"**

### **Loading Videos (Host Only)**
1. **Google Drive**: Share a video file with "Anyone with the link" and paste the URL
2. **YouTube**: Paste any YouTube video URL or ID
3. **Direct URLs**: Use direct video file URLs (.mp4, .mkv, etc.)

### **Chat & Interaction**
- Use the chat panel to communicate with other viewers
- Green bubbles show your messages, blue bubbles show others'
- Host controls appear in the video controls section

## 🔧 Advanced Configuration

### **Google Drive API Setup**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google Drive API
4. Create service account credentials
5. Download JSON key file
6. Add the JSON content to `GOOGLE_SERVICE_ACCOUNT_KEY` environment variable

### **FFmpeg Integration**
For advanced video transcoding and format support:
```bash
# Install FFmpeg (Ubuntu/Debian)
sudo apt update && sudo apt install ffmpeg

# Set FFmpeg path in server/.env
FFMPEG_PATH=/usr/bin/ffmpeg
ENABLE_TRANSCODING=true
```

### **Performance Tuning**
```javascript
// Adjust sync tolerance (client/src/components/RoomPage.jsx)
const [syncTolerance] = useState(1.5); // seconds

// Modify sync interval (server/socket/socketHandlers.js)
const SYNC_INTERVAL = 10000; // 10 seconds
```

## 🌐 Production Deployment

### **Render.com Deployment**
The project includes `render.yaml` for one-click deployment on Render:

1. Fork this repository
2. Connect to Render.com
3. Add environment variables in Render dashboard
4. Deploy automatically

### **Manual Deployment**
```bash
# Build the application
npm run build

# Set production environment variables
export NODE_ENV=production
export MONGODB_URI=your_mongodb_connection_string
export CLIENT_URL=your_frontend_domain

# Start production server
npm start
```

## 🛠️ API Reference

### **REST Endpoints**
```http
GET    /api/health                    # Server health check
POST   /api/rooms                     # Create new room
GET    /api/rooms/:roomId             # Get room information
GET    /api/rooms/:roomId/messages    # Get chat history
GET    /api/video/metadata            # Get video metadata
```

### **WebSocket Events**
```javascript
// Client to Server
'join-room'           // Join a specific room
'host:play'           // Host play command
'host:pause'          // Host pause command
'host:seek'           // Host seek command
'chat-message'        // Send chat message

// Server to Client
'sync-state'          // Initial state synchronization
'server:play'         // Broadcast play command
'server:pause'        // Broadcast pause command
'user-joined'         // User joined notification
'new-chat-message'    // New chat message
```

## 🎨 Features in Detail

### **Video Player Engine**
- **Multi-source Architecture**: Seamlessly switches between YouTube, Google Drive, and direct URLs
- **Format Detection**: Automatic detection of video formats and optimal player selection
- **Error Recovery**: Graceful handling of playback errors and format issues
- **Mobile Optimization**: Touch-friendly controls and responsive video scaling

### **Synchronization Engine**
- **Precision Timing**: Sub-second synchronization accuracy
- **Network Adaptation**: Adjusts sync tolerance based on network conditions
- **State Management**: Persistent room state with MongoDB
- **Recovery Mechanisms**: Multiple fallback strategies for sync failures

### **Chat System**
- **Real-time Messaging**: WebSocket-based instant messaging
- **Message Persistence**: Chat history stored in MongoDB
- **User Identification**: Color-coded messages with timestamps
- **Emoji Support**: Full emoji support with proper rendering

## 🐛 Troubleshooting

### **Common Issues**

**🔴 Connection Problems**
```bash
# Check if server is running
curl http://localhost:3000/api/health

# Verify WebSocket connection
# Browser Console: Check for Socket.IO connection logs
```

**🔴 Video Loading Issues**
- **YouTube**: Ensure video is public and embeddable
- **Google Drive**: Check file permissions ("Anyone with the link")
- **Direct URLs**: Verify CORS headers and file accessibility

**🔴 Sync Problems**
- Check network latency (high latency requires higher sync tolerance)
- Verify all users are in the same room
- Restart the room if sync issues persist

**🔴 Chat Not Working**
- Ensure WebSocket connection is established
- Check for firewall blocking WebSocket traffic
- Verify MongoDB connection for message persistence

### **Debug Mode**
Enable detailed logging:
```javascript
// client/src/socket.js
const socket = io(SERVER_URL, {
  transports: ['websocket', 'polling'],
  forceNew: true,
  debug: true // Enable debug logs
});
```

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### **Development Guidelines**
- Follow the existing code style
- Add comments for complex logic
- Test your changes thoroughly
- Update documentation as needed

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **YouTube IFrame API** for video playback capabilities
- **Socket.IO** for real-time communication infrastructure
- **React Team** for the excellent frontend framework
- **MongoDB** for flexible data storage solutions
- **Google Drive API** for seamless file integration
- **FFmpeg** for advanced video processing
- **Render.com** for hosting and deployment

## 🔗 Links

- **Live Demo**: [https://stream2gether.onrender.com](https://stream2gether.onrender.com)
- **GitHub Repository**: [https://github.com/amarxxanand/Stream2GetHer](https://github.com/amarxxanand/Stream2GetHer)
- **Documentation**: [FEATURES.md](FEATURES.md)

---

**Made with ❤️ for bringing people together through shared experiences**

*Stream2GetHer - Where distance doesn't matter, moments do.*
