# 🚀 Stream2GetHer Development Guide

## Overview
Stream2GetHer is a real-time synchronized media platform built with the MERN stack that allows users to watch YouTube videos together in perfect synchronization.

## 📋 Prerequisites

### Required Software
- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **MongoDB** - [Download](https://www.mongodb.com/try/download/community)
- **Git** - [Download](https://git-scm.com/)

### Recommended Tools
- **VS Code** with extensions:
  - ES7+ React/Redux/React-Native snippets
  - Prettier - Code formatter
  - ESLint
  - Thunder Client (for API testing)

## 🚀 Quick Start

### 1. Clone and Setup
```bash
git clone <repository-url>
cd Stream2GetHer

# Make scripts executable
chmod +x start-dev.sh test-system.sh

# Test your system setup
./test-system.sh

# Start development environment
./start-dev.sh
```

### 2. Manual Setup (Alternative)
```bash
# Install all dependencies
npm run install-all

# Start both server and client
npm run dev

# Or start individually:
# Terminal 1: npm run server
# Terminal 2: npm run client
```

### 3. Access the Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000/api
- **Health Check**: http://localhost:3000/api/health

## 🏗️ Architecture Deep Dive

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Stream2GetHer Architecture               │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React)          Backend (Node.js)    Database   │
│  ┌─────────────────┐      ┌─────────────────┐  ┌─────────┐ │
│  │ React Router    │      │ Express.js      │  │ MongoDB │ │
│  │ Socket.IO Client│◄────►│ Socket.IO Server│◄─┤ Rooms   │ │
│  │ YouTube Player  │      │ REST API        │  │ Messages│ │
│  │ Chat UI         │      │ Room Logic      │  │ Indexes │ │
│  │ User Management │      │ Sync Engine     │  └─────────┘ │
│  └─────────────────┘      └─────────────────┘              │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Patterns

1. **Singleton Pattern**: Single Socket.IO connection managed by React Context
2. **Observer Pattern**: Event-driven communication with Socket.IO
3. **Host-Authority Pattern**: Designated host controls room state
4. **Self-Correcting Pattern**: Automatic sync drift correction

### Real-Time Synchronization Logic

```javascript
// Synchronization Flow
User Action (Host) → Socket Event → Server Validation → Broadcast → Client Updates

// Drift Correction (Every 10 seconds)
Server Timer → Request Host Time → Host Reports → Server Broadcasts → Clients Adjust

// Buffer Recovery
Client Buffering → Wait for Ready → Request Sync → Server Sends Current State → Client Catches Up
```

## 🔧 Development Workflow

### File Structure Overview
```
Stream2GetHer/
├── 📁 server/                    # Backend Node.js application
│   ├── 📁 models/               # MongoDB schemas
│   │   ├── Room.js              # Room state schema
│   │   ├── Message.js           # Chat message schema
│   │   └── index.js             # Model exports
│   ├── 📁 socket/               # WebSocket handlers
│   │   └── socketHandlers.js    # All Socket.IO event logic
│   ├── index.js                 # Main server entry point
│   ├── package.json             # Server dependencies
│   └── .env                     # Server environment config
├── 📁 client/                   # Frontend React application
│   ├── 📁 src/
│   │   ├── 📁 components/       # React components
│   │   │   ├── HomePage.jsx     # Landing page
│   │   │   ├── RoomPage.jsx     # Main room interface
│   │   │   ├── VideoControls.jsx# Host video controls
│   │   │   ├── Chat.jsx         # Chat component
│   │   │   └── UserList.jsx     # Active users display
│   │   ├── 📁 contexts/         # React contexts
│   │   │   └── SocketContext.jsx# Socket.IO context provider
│   │   ├── 📁 hooks/            # Custom React hooks
│   │   │   └── useYouTubePlayer.js # YouTube API integration
│   │   ├── socket.js            # Socket.IO client setup
│   │   ├── App.jsx              # Main app component
│   │   └── main.jsx             # React entry point
│   ├── package.json             # Client dependencies
│   └── .env                     # Client environment config
├── README.md                    # Main documentation
├── DEPLOYMENT.md               # Production deployment guide
├── DEVELOPMENT.md              # This file
├── start-dev.sh               # Development startup script
├── test-system.sh             # System validation script
└── package.json               # Root project config
```

### Key Development Commands

```bash
# Development
npm run dev                    # Start both server and client
npm run server                # Start only server
npm run client                # Start only client

# Production
npm run build                 # Build client for production
npm start                     # Start production server

# Maintenance
npm run install-all           # Install all dependencies
./test-system.sh             # Run system tests
```

## 🧩 Key Components Explained

### 1. YouTube Player Integration (`useYouTubePlayer.js`)

```javascript
// Custom hook that wraps YouTube IFrame API
const useYouTubePlayer = (containerId, onStateChange, onReady) => {
  // Handles API loading, player initialization, and provides control methods
  return {
    play, pause, seekTo, loadVideoById, getCurrentTime,
    isReady, playerState, PLAYER_STATES
  };
};
```

**Key Features:**
- Dynamic API script loading
- Imperative to declarative bridge
- Stable control function references
- State synchronization with React

### 2. Socket.IO Communication (`SocketContext.jsx`)

```javascript
// Singleton pattern for connection management
const SocketProvider = ({ children }) => {
  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
```

**Event Flow:**
```
Client → emit('host:play') → Server → broadcast('server:play') → Other Clients
```

### 3. Room State Management (`socketHandlers.js`)

```javascript
// Server-side room management
const activeRooms = new Map(); // In-memory room state
const syncIntervals = new Map(); // Periodic sync timers

// Host authority pattern
socket.on('host:play', async (data) => {
  if (!isHost(socket)) return; // Authority validation
  // Update database and broadcast to others
});
```

### 4. Real-Time Synchronization

**Drift Correction Algorithm:**
```javascript
// Client-side drift correction
const handleServerSyncTime = (data) => {
  const { time: authoritativeTime } = data;
  const currentTime = getCurrentTime();
  const timeDiff = Math.abs(currentTime - authoritativeTime);
  
  if (timeDiff > syncTolerance) { // Default: 1.5 seconds
    seekTo(authoritativeTime); // Correct the drift
  }
};
```

## 🔍 Common Development Tasks

### Adding New Socket Events

1. **Define Event in Server** (`socketHandlers.js`):
```javascript
socket.on('new-event', (data) => {
  // Handle the event
  io.to(roomId).emit('response-event', responseData);
});
```

2. **Handle Event in Client** (`RoomPage.jsx`):
```javascript
useEffect(() => {
  socket.on('response-event', handleResponseEvent);
  return () => socket.off('response-event', handleResponseEvent);
}, []);
```

### Adding New API Endpoints

1. **Server Route** (`index.js`):
```javascript
app.get('/api/new-endpoint', async (req, res) => {
  try {
    // Handle request
    res.json({ data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

2. **Client Usage**:
```javascript
const response = await fetch(`${API_BASE_URL}/new-endpoint`);
const data = await response.json();
```

### Adding New Database Models

1. **Create Schema** (`models/NewModel.js`):
```javascript
import mongoose from 'mongoose';

const newSchema = new mongoose.Schema({
  field: { type: String, required: true, index: true }
});

export const NewModel = mongoose.model('NewModel', newSchema);
```

2. **Export in Index** (`models/index.js`):
```javascript
export { NewModel } from './NewModel.js';
```

## 🐛 Debugging Guide

### Common Issues and Solutions

#### 1. Connection Issues
```bash
# Check if servers are running
curl http://localhost:3000/api/health
curl http://localhost:5173

# Check MongoDB connection
mongo --eval "db.runCommand('ping')"
```

#### 2. Socket.IO Issues
```javascript
// Enable debug mode in client
export const socket = io(URL, {
  debug: true, // Add this line
  transports: ['websocket', 'polling']
});
```

#### 3. YouTube Player Issues
- Check browser console for API errors
- Ensure video is public and embeddable
- Verify YouTube API script is loaded

#### 4. Sync Issues
```javascript
// Adjust sync tolerance for testing
const [syncTolerance] = useState(0.5); // More sensitive
```

### Debug Tools

1. **Browser DevTools**:
   - Network tab: WebSocket messages
   - Console: Error messages and logs
   - Application tab: LocalStorage/SessionStorage

2. **Server Logs**:
   - MongoDB queries: Enable Mongoose debug
   - Socket.IO events: Add console.log statements

3. **MongoDB Compass**: Visual database explorer

## 🧪 Testing Strategy

### Manual Testing Checklist

- [ ] Room creation and joining
- [ ] Host controls (play, pause, seek)
- [ ] Video loading and changing
- [ ] Chat functionality
- [ ] User list updates
- [ ] Sync after buffering
- [ ] Host transfer on disconnect
- [ ] Mobile responsiveness

### Load Testing

```bash
# Use Artillery or similar tools
npm install -g artillery
artillery quick --count 10 --num 5 http://localhost:3000
```

## 🔒 Security Considerations

### Current Implementation
- CORS configuration for cross-origin requests
- Input validation for chat messages
- Room ID generation with UUID for unpredictability

### Production Recommendations
- Rate limiting for API endpoints
- WebSocket connection limits
- Input sanitization and validation
- HTTPS enforcement
- Database authentication

## 📈 Performance Optimization

### Client-Side
- React.memo for expensive components
- useCallback for stable function references
- Lazy loading for large components
- Efficient re-rendering patterns

### Server-Side
- Connection pooling (MongoDB)
- Memory cleanup for inactive rooms
- Efficient database queries with indexes
- WebSocket connection management

### Database
- Compound indexes for frequent queries
- TTL indexes for temporary data
- Query optimization with aggregation

## 🚀 Future Enhancements

### Planned Features
- Voice/video chat integration
- Playlist management
- User authentication
- Room persistence settings
- Mobile app development
- Screen sharing capabilities

### Technical Improvements
- Redis for session management
- Microservices architecture
- CDN integration
- Advanced analytics
- Automated testing suite

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Follow existing code style and patterns
4. Add tests for new functionality
5. Submit pull request with detailed description

### Code Style Guidelines
- Use ESLint and Prettier configurations
- Follow React Hooks best practices
- Write descriptive commit messages
- Add JSDoc comments for complex functions
- Maintain consistent naming conventions

This development guide provides everything you need to understand, modify, and extend the Stream2GetHer platform. Happy coding! 🎉
