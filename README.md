# 🎬 Stream2GetHer - Real-Time Synchronized Video Streaming Platform

> **Watch videos together, perfectly synchronized** - A modern MERN stack application for collaborative video streaming with Google Drive integration, YouTube support, and real-time chat.


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
