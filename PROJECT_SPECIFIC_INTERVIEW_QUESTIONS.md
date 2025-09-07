# Technical Interview Questions for Stream2GetHer Project
## Entry-Level Software Engineer/Developer Role

Based on your **Stream2GetHer** project - a real-time synchronized video streaming platform using the MERN stack with Socket.IO, Google Drive integration, and FFmpeg video processing.

## Table of Contents
1. [React & Frontend Development](#react--frontend-development)
2. [Node.js & Express Backend](#nodejs--express-backend)
3. [Socket.IO & Real-time Communication](#socketio--real-time-communication)
4. [MongoDB & Database Design](#mongodb--database-design)
5. [Google Drive API Integration](#google-drive-api-integration)
6. [Video Processing & FFmpeg](#video-processing--ffmpeg)
7. [Full-Stack Architecture](#full-stack-architecture)
8. [JavaScript & ES6+](#javascript--es6)
9. [Web Development Concepts](#web-development-concepts)
10. [Project-Specific Implementation](#project-specific-implementation)

---

## React & Frontend Development

### 1. Explain React Context API and why you used it in your project.
**Based on your SocketContext:** 

**Answer:** React Context API provides a way to share state across components without prop drilling. In my Stream2GetHer project, I used it specifically for managing Socket.IO connections:

```jsx
// contexts/SocketContext.jsx
const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const socket = getSocket(); // Singleton socket instance
  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
```

**Why I used it:**
- **Avoid Prop Drilling:** Socket connection needed in multiple components (VideoPlayer, Chat, UserList)
- **Singleton Pattern:** Ensures single socket connection across the entire app
- **Performance:** Prevents unnecessary re-renders when socket state changes
- **Clean Architecture:** Separates socket logic from component logic

**Alternative approaches:** Redux, Zustand, or prop drilling (which would be messy for deep component trees)

### 2. What are React Hooks? Explain useState and useEffect with examples from your project.
**Your custom hooks:** 

**Answer:** React Hooks are functions that let you use state and lifecycle features in functional components. 

**useState Example from my project:**
```jsx
// In VideoPlayer component
const [isPlaying, setIsPlaying] = useState(false);
const [currentTime, setCurrentTime] = useState(0);
const [duration, setDuration] = useState(0);
const [volume, setVolume] = useState(1);
```

**useEffect Example:**
```jsx
// Socket cleanup in App.jsx
useEffect(() => {
  return () => {
    if (socket) {
      socket.disconnect();
    }
  };
}, [socket]);

// Video sync in VideoPlayer
useEffect(() => {
  if (socket && roomId) {
    socket.on('video-sync', (syncData) => {
      // Synchronize video state across users
      setCurrentTime(syncData.currentTime);
      setIsPlaying(syncData.isPlaying);
    });
  }
}, [socket, roomId]);
```

**Custom Hooks I created:**
- **`useVideoPlayer`:** Manages video state, playback controls, and time tracking
- **`useYouTubePlayer`:** Handles YouTube API integration and player controls

**Benefits:**
- Reusable stateful logic
- Cleaner component code
- Better separation of concerns
- Easier testing

### 3. What is the difference between functional and class components?
**Your project uses functional components** - simpler syntax, built-in hooks, better performance.

### 4. How does React Router work? Explain your routing implementation.
**Your routes:** HomePage (`/`) and RoomPage (`/room/:roomId`) - client-side routing with URL parameters.

### 5. What are custom hooks and why did you create them?
**Your hooks:** Encapsulate video player logic, promote reusability, separate concerns from components.

### 6. Explain the useRef hook and its use cases.
**Video player references:** Direct DOM manipulation, accessing video elements without re-renders.

### 7. What is React's Virtual DOM and how does it work?
**Performance optimization:** Diffing algorithm, reconciliation, minimal DOM updates.

### 8. How do you handle events in React?
**Your event handlers:** onClick, onTimeUpdate, socket event listeners - SyntheticEvents vs native events.

### 9. What are React keys and why are they important?
**Your user lists:** Efficient list rendering, React's diffing algorithm optimization.

### 10. Explain React component lifecycle and useEffect dependencies.
**Your socket cleanup:** Mounting, updating, unmounting phases, dependency arrays for optimization.

---

## Node.js & Express Backend

### 11. What is Node.js and why is it suitable for real-time applications?
**Your streaming app:** 

**Answer:** Node.js is a JavaScript runtime built on Chrome's V8 engine that executes JavaScript on the server-side.

**Why it's perfect for my Stream2GetHer app:**

**1. Event-Driven Architecture:**
```javascript
// My socket implementation shows this
socket.on('video-sync', handleVideoSync);
socket.on('chat-message', handleChatMessage);
socket.on('user-join', handleUserJoin);
```

**2. Non-Blocking I/O:**
```javascript
// Multiple async operations don't block each other
app.get('/api/rooms/:id', async (req, res) => {
  const room = await Room.findOne({ roomId: req.params.id }); // DB query
  const driveInfo = await googleDriveService.getFileInfo(room.videoUrl); // API call
  // Both operations are non-blocking
});
```

**3. Single Language Stack:**
- Frontend: JavaScript/React
- Backend: JavaScript/Node.js
- Shared utilities and validation logic

**4. Excellent for I/O Intensive Tasks:**
- Real-time Socket.IO connections
- Database operations (MongoDB)
- API calls (Google Drive)
- File streaming

**5. Large Ecosystem:**
My package.json shows rich ecosystem usage:
- Express for web server
- Socket.IO for real-time communication
- Mongoose for MongoDB
- googleapis for Google Drive integration

**Event Loop Benefits:**
- Handles thousands of concurrent connections
- Perfect for chat and video synchronization
- Low memory footprint per connection

### 12. Explain Express.js middleware and show examples from your project.
**Your middleware:** 

**Answer:** Express middleware are functions that execute during the request-response cycle. They have access to request (req), response (res), and next middleware function (next).

**My Middleware Stack Implementation:**

**1. Security Middleware:**
```javascript
// index.js - Security-first approach
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

// Helmet - Sets various HTTP headers for security
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://www.youtube.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  },
  crossOriginEmbedderPolicy: false // Needed for video streaming
}));

// CORS - Cross-Origin Resource Sharing
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] 
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));
```

**2. Rate Limiting Middleware:**
```javascript
// Prevent abuse and DDoS attacks
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip successful requests to static files
  skip: (req) => {
    return req.url.startsWith('/assets/') || 
           req.url.startsWith('/favicon');
  }
});
app.use('/api/', limiter);

// Stricter rate limiting for room creation
const roomLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Max 5 room creations per minute
  message: { error: 'Too many rooms created, please wait' }
});
app.use('/api/rooms', roomLimiter);
```

**3. Compression and Performance Middleware:**
```javascript
import compression from 'compression';

// Compress responses to reduce bandwidth
app.use(compression({
  filter: (req, res) => {
    // Don't compress if client doesn't support it
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Compress everything else
    return compression.filter(req, res);
  },
  level: 6, // Compression level (1-9)
  threshold: 1024 // Only compress if > 1KB
}));
```

**4. Body Parsing Middleware:**
```javascript
// Parse JSON bodies with size limits
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    // Verify JSON integrity
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(400).json({ error: 'Invalid JSON' });
      return;
    }
  }
}));

// Parse URL-encoded bodies
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));
```

**5. Custom Authentication Middleware:**
```javascript
// middleware/auth.js
export const authenticateSocket = (socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication error'));
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    socket.username = decoded.username;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
};

// Apply to Socket.IO
io.use(authenticateSocket);
```

**6. Error Handling Middleware:**
```javascript
// Global error handler (must be last middleware)
app.use((error, req, res, next) => {
  console.error('❌ Error:', error);
  
  // Mongoose validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: Object.values(error.errors).map(e => e.message)
    });
  }
  
  // MongoDB duplicate key error
  if (error.code === 11000) {
    return res.status(409).json({
      error: 'Resource already exists'
    });
  }
  
  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token'
    });
  }
  
  // Generic server error
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});
```

**7. Logging Middleware:**
```javascript
// Custom request logger
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };
    
    console.log(`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
    
    // Log slow requests
    if (duration > 1000) {
      console.warn('🐌 Slow request:', logData);
    }
  });
  
  next();
};
app.use(requestLogger);
```

**8. Static File Serving with Caching:**
```javascript
import path from 'path';

// Serve static files with caching headers
app.use('/assets', express.static(
  path.join(__dirname, '../client/dist/assets'), 
  {
    maxAge: '1y', // Cache for 1 year
    etag: true,
    lastModified: true,
    setHeaders: (res, path) => {
      // Set CORS headers for assets
      res.set('Access-Control-Allow-Origin', '*');
      
      // Cache control for different file types
      if (path.endsWith('.js') || path.endsWith('.css')) {
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
      } else if (path.endsWith('.html')) {
        res.set('Cache-Control', 'public, max-age=0, must-revalidate');
      }
    }
  }
));
```

**Middleware Execution Order (Critical):**
```javascript
// Order matters! This is my exact middleware stack:
app.use(helmet());              // 1. Security headers first
app.use(cors(corsOptions));     // 2. CORS handling
app.use(compression());         // 3. Response compression
app.use(requestLogger);         // 4. Request logging
app.use(express.json());        // 5. Body parsing
app.use('/api', limiter);       // 6. Rate limiting for API routes
app.use('/assets', express.static(...)); // 7. Static files

// Routes
app.use('/api/rooms', roomRoutes);
app.use('/api/messages', messageRoutes);

// Error handling (must be last)
app.use(errorHandler);          // 8. Error handling last
app.use('*', notFoundHandler);  // 9. 404 handler last
```

**Benefits of This Middleware Architecture:**
- **Security:** Multiple layers of protection
- **Performance:** Compression and caching
- **Monitoring:** Request logging and error tracking
- **Scalability:** Rate limiting prevents abuse
- **Maintainability:** Clean separation of concerns
- **Debugging:** Detailed error handling and logging

**Common Middleware Patterns I Use:**
1. **Security-first:** Always apply security middleware first
2. **Fail-fast:** Validate early in the pipeline
3. **Logging:** Track requests for debugging and analytics
4. **Error boundaries:** Centralized error handling
5. **Performance:** Optimize with compression and caching

### 13. What is the difference between require() and import/export?
**Your ES6 modules:** Static analysis, tree shaking, cleaner syntax, top-level await support.

### 14. How do you handle errors in Node.js applications?
**Your error handling:** `process.on('uncaughtException')`, try-catch blocks, error middleware.

### 15. What is middleware in Express and how does it work?
**Your security stack:** Request-response cycle, next() function, order of execution matters.

### 16. Explain rate limiting and why you implemented it.
**Your rate limiter:** Prevent abuse, DDoS protection, API throttling, security best practice.

### 17. What is CORS and how did you configure it?
**Cross-origin requests:** Browser security, preflight requests, allowed origins configuration.

### 18. How do you secure a Node.js application?
**Your security measures:** Helmet for headers, rate limiting, input validation, environment variables.

---

## Socket.IO & Real-time Communication

### 19. What is WebSocket and how is it different from HTTP?
**Your real-time features:** 

**Answer:** WebSocket is a communication protocol that provides full-duplex communication over a single TCP connection.

**HTTP vs WebSocket Comparison:**

| Feature | HTTP | WebSocket |
|---------|------|-----------|
| Communication | Request-Response | Bidirectional |
| Connection | Stateless | Persistent |
| Overhead | High (headers each request) | Low (after handshake) |
| Real-time | Polling required | Native support |

**In my Stream2GetHer project:**

**HTTP Usage (Traditional):**
```javascript
// REST API endpoints
app.get('/api/rooms/:id', async (req, res) => {
  // Each request is separate, stateless
  const room = await Room.findOne({ roomId: req.params.id });
  res.json(room);
});
```

**WebSocket Usage (via Socket.IO):**
```javascript
// Real-time bidirectional communication
socket.on('video-play', (data) => {
  // Instantly notify all users in room
  socket.to(roomId).emit('video-sync', {
    isPlaying: true,
    currentTime: data.currentTime,
    timestamp: Date.now()
  });
});
```

**Why WebSocket for my video sync:**
1. **Instant Synchronization:** When host plays/pauses, all users sync immediately
2. **Low Latency:** No HTTP request overhead for each sync event
3. **Persistent Connection:** Maintains user presence in rooms
4. **Bidirectional:** Users can send chat messages, video controls simultaneously

**WebSocket Handshake Process:**
1. Client sends HTTP upgrade request
2. Server responds with 101 Switching Protocols
3. Connection upgraded to WebSocket
4. Full-duplex communication begins

**Challenges I handled:**
- Connection drops and reconnection
- Message ordering and delivery guarantees
- Scaling across multiple server instances

### 20. Explain Socket.IO and its advantages over raw WebSockets.
**Your implementation:** Fallback mechanisms, room management, event-based communication, automatic reconnection.

### 21. How do Socket.IO rooms work in your application?
**Your room system:** 

**Answer:** Socket.IO rooms are a way to group sockets together and broadcast events to specific groups. In my Stream2GetHer app, rooms are central to the video synchronization feature.

**My Room Implementation:**

**1. Joining a Room:**
```javascript
// Client-side (React)
socket.emit('join-room', { roomId, username });

// Server-side (socketHandlers.js)
socket.on('join-room', async (data) => {
  const { roomId, username } = data;
  
  // Add socket to room
  socket.join(roomId);
  
  // Update database
  await Room.findOneAndUpdate(
    { roomId },
    { $addToSet: { participants: socket.id } },
    { upsert: true }
  );
  
  // Notify others in room
  socket.to(roomId).emit('user-joined', { username });
});
```

**2. Broadcasting to Room:**
```javascript
// When host plays video, sync all users in room
socket.on('video-play', (data) => {
  // Broadcast to all OTHER sockets in the room
  socket.to(roomId).emit('video-sync', {
    isPlaying: true,
    currentTime: data.currentTime,
    timestamp: Date.now()
  });
});
```

**3. Room Management Features I Implemented:**

**Connection Tracking:**
```javascript
const activeRooms = new Map(); // roomId -> Set of socketIds
const activeConnections = new Map(); // "roomId:username" -> socketId

// Prevent duplicate connections
const connectionKey = `${roomId}:${username}`;
if (activeConnections.has(connectionKey)) {
  socket.emit('error', { message: 'Already connected from another device' });
  return;
}
```

**Cleanup on Disconnect:**
```javascript
socket.on('disconnect', async () => {
  // Remove from all rooms
  const rooms = Object.keys(socket.rooms);
  rooms.forEach(roomId => {
    socket.to(roomId).emit('user-left', { username: socket.username });
  });
  
  // Database cleanup
  await Room.updateMany(
    {},
    { $pull: { participants: socket.id } }
  );
});
```

**4. Advanced Room Features:**

**Host Management:**
```javascript
// First person to join becomes host
if (!room.hostSocketId) {
  room.hostSocketId = socket.id;
  room.hostUsername = username;
  socket.emit('host-assigned');
}
```

**Room State Synchronization:**
```javascript
// When someone joins, send current video state
const roomState = await Room.findOne({ roomId });
socket.emit('room-state', {
  currentVideoUrl: roomState.currentVideoUrl,
  currentTime: roomState.lastKnownTime,
  isPlaying: roomState.lastKnownState
});
```

**Benefits of This Architecture:**
- **Scalable:** Each room operates independently
- **Efficient:** Messages only sent to relevant users
- **Isolated:** Actions in one room don't affect others
- **Flexible:** Easy to add room-specific features

**Room Limitations I Handle:**
- Maximum users per room (configurable)
- Room expiration after inactivity
- Host migration when host leaves

### 22. What is the difference between emit() and broadcast()?
**Your event system:** Send to specific client vs all clients in room, targeted communication.

### 23. How do you handle connection management and cleanup?
**Your connection tracking:** Memory leaks prevention, disconnect events, active connections map.

### 24. Explain your video synchronization implementation.
**Your sync system:** 

**Answer:** Video synchronization is the core feature of my Stream2GetHer app. It ensures all users in a room watch the video at the same time, regardless of network delays or when they joined.

**My Synchronization Architecture:**

**1. Host-Based Synchronization:**
```javascript
// Host controls playback for entire room
const handlePlay = () => {
  const currentTime = videoRef.current.currentTime;
  
  // Update local state
  setIsPlaying(true);
  
  // Broadcast to all users in room
  socket.emit('video-play', {
    currentTime,
    timestamp: Date.now()
  });
};
```

**2. Server-Side Event Handling:**
```javascript
// socketHandlers.js
socket.on('video-play', async (data) => {
  const { currentTime, timestamp } = data;
  const roomId = getUserRoom(socket.id);
  
  // Update room state in database
  await Room.findOneAndUpdate(
    { roomId },
    {
      lastKnownTime: currentTime,
      lastKnownState: true, // playing
      lastUpdatedAt: new Date()
    }
  );
  
  // Broadcast to all other users in room
  socket.to(roomId).emit('video-sync', {
    isPlaying: true,
    currentTime,
    serverTimestamp: Date.now(),
    originalTimestamp: timestamp
  });
});
```

**3. Client-Side Sync Handling:**
```javascript
// VideoPlayer component
useEffect(() => {
  socket.on('video-sync', (syncData) => {
    const { isPlaying, currentTime, serverTimestamp, originalTimestamp } = syncData;
    
    // Calculate network delay
    const networkDelay = (Date.now() - serverTimestamp) / 1000;
    
    // Adjust for time elapsed during transmission
    const adjustedTime = currentTime + networkDelay;
    
    // Apply sync with tolerance check
    const timeDifference = Math.abs(videoRef.current.currentTime - adjustedTime);
    
    if (timeDifference > SYNC_TOLERANCE) { // 0.5 seconds
      videoRef.current.currentTime = adjustedTime;
    }
    
    // Sync play/pause state
    if (isPlaying && videoRef.current.paused) {
      videoRef.current.play();
    } else if (!isPlaying && !videoRef.current.paused) {
      videoRef.current.pause();
    }
  });
}, [socket]);
```

**4. Advanced Sync Features:**

**Periodic Sync (Drift Correction):**
```javascript
// Automatic sync every 10 seconds to handle drift
useEffect(() => {
  const syncInterval = setInterval(() => {
    if (isHost && isPlaying) {
      socket.emit('periodic-sync', {
        currentTime: videoRef.current.currentTime,
        timestamp: Date.now()
      });
    }
  }, 10000);
  
  return () => clearInterval(syncInterval);
}, [isHost, isPlaying]);
```

**Late Joiner Sync:**
```javascript
// When user joins room, sync with current state
socket.on('join-room', async (data) => {
  // ... room join logic ...
  
  // Send current video state to new user
  const room = await Room.findOne({ roomId });
  socket.emit('initial-sync', {
    videoUrl: room.currentVideoUrl,
    currentTime: room.lastKnownTime,
    isPlaying: room.lastKnownState,
    timestamp: Date.now()
  });
});
```

**5. Handling Edge Cases:**

**Network Interruption Recovery:**
```javascript
socket.on('reconnect', () => {
  // Re-sync after reconnection
  socket.emit('request-sync', { roomId });
});

socket.on('request-sync', (data) => {
  if (isHost) {
    // Host sends current state
    socket.emit('video-sync', {
      currentTime: videoRef.current.currentTime,
      isPlaying: !videoRef.current.paused,
      timestamp: Date.now()
    });
  }
});
```

**Seek Synchronization:**
```javascript
const handleSeek = (newTime) => {
  videoRef.current.currentTime = newTime;
  
  if (isHost) {
    socket.emit('video-seek', {
      currentTime: newTime,
      isPlaying: !videoRef.current.paused,
      timestamp: Date.now()
    });
  }
};
```

**6. Performance Optimizations:**

**Throttling Sync Events:**
```javascript
// Prevent spam during scrubbing
const throttledSync = useCallback(
  throttle((currentTime) => {
    socket.emit('video-sync', { currentTime, timestamp: Date.now() });
  }, 100), // Max 10 updates per second
  [socket]
);
```

**Sync Tolerance:**
```javascript
const SYNC_TOLERANCE = 0.5; // Only sync if difference > 0.5 seconds
const SEEK_THRESHOLD = 2.0;  // Force sync if difference > 2 seconds
```

**7. Challenges Solved:**

- **Network Latency:** Timestamp-based compensation
- **Clock Drift:** Periodic re-synchronization
- **Host Changes:** Seamless host migration
- **Multiple Video Sources:** YouTube vs direct files
- **Mobile Compatibility:** Touch controls and autoplay policies

**Technical Benefits:**
- Sub-second synchronization accuracy
- Resilient to network issues
- Scalable to multiple rooms
- Works across different devices/browsers

### 25. How do you prevent duplicate connections in your app?
**Your duplicate handling:** Connection tracking, user session management, cleanup strategies.

### 26. What are Socket.IO namespaces and when would you use them?
**Scalability concept:** Separate channels, different features isolation, resource organization.

---

## MongoDB & Database Design

### 27. What is MongoDB and why did you choose it over SQL databases?
**Your data model:** 

**Answer:** MongoDB is a NoSQL document database that stores data in flexible, JSON-like documents instead of rigid table structures.

**Why I chose MongoDB for Stream2GetHer:**

**1. Schema Flexibility:**
```javascript
// Room schema can evolve without migrations
const roomSchema = new mongoose.Schema({
  roomId: String,
  currentVideoUrl: String,
  currentVideoTitle: String,
  participants: [String], // Array of socket IDs
  lastKnownTime: Number,
  lastKnownState: Boolean,
  // Easy to add new fields without breaking existing data
  videoMetadata: {
    duration: Number,
    format: String,
    quality: String
  }
});
```

**2. Natural JSON Integration:**
```javascript
// Direct mapping between client/server data
const roomData = {
  roomId: "abc123",
  participants: ["user1", "user2"],
  currentVideoUrl: "https://drive.google.com/file/d/...",
  lastKnownTime: 125.5
};

// No ORM complexity - direct JSON storage
await Room.create(roomData);
```

**3. Rapid Development:**
- No need to design complex table relationships
- Easy to iterate on data structure
- Fast prototyping for real-time features

**4. Horizontal Scaling:**
```javascript
// MongoDB sharding for multiple rooms
// Can scale across multiple servers as user base grows
```

**Comparison with SQL for my use case:**

| Aspect | MongoDB (My Choice) | SQL Alternative |
|--------|---------------------|-----------------|
| Room Data | `{ participants: ["id1", "id2"] }` | Separate Users table with foreign keys |
| Video Metadata | Embedded in room document | Multiple joined tables |
| Schema Changes | Add fields dynamically | Require migrations |
| Real-time Data | Natural JSON structure | Complex JOIN queries |

**My MongoDB Data Models:**

**Room Model:**
```javascript
{
  _id: ObjectId,
  roomId: "unique-room-123",
  currentVideoUrl: "https://...",
  hostSocketId: "socket-abc",
  participants: ["socket1", "socket2", "socket3"],
  lastKnownTime: 125.5,
  lastKnownState: true,
  createdAt: ISODate,
  lastUpdatedAt: ISODate
}
```

**Message Model:**
```javascript
{
  _id: ObjectId,
  roomId: "unique-room-123",
  username: "john_doe",
  message: "Great movie!",
  timestamp: ISODate,
  messageType: "text" // or "emoji", "system"
}
```

**Benefits for Real-time Applications:**
1. **Fast Writes:** Perfect for frequent chat messages and sync updates
2. **Embedded Arrays:** Participants list without JOINs
3. **Atomic Updates:** Safe concurrent modifications
4. **Indexing:** Fast room lookups with compound indexes

**Mongoose Advantages:**
```javascript
// Built-in validation
const roomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
    index: true // Automatic indexing
  }
});

// Middleware for automatic timestamps
roomSchema.pre('save', function(next) {
  this.lastUpdatedAt = new Date();
  next();
});
```

**When SQL Would Be Better:**
- Complex multi-table relationships
- Strong ACID requirements
- Complex analytical queries
- Existing SQL infrastructure

**My Decision Factors:**
1. **Development Speed:** Faster iteration for MVP
2. **Data Structure:** Room/chat data naturally fits document model
3. **Scaling Pattern:** Horizontal scaling for multiple rooms
4. **Team Expertise:** JavaScript/JSON familiarity
5. **Real-time Needs:** Optimized for frequent updates

### 28. Explain Mongoose and its benefits.
**Your models:** Schema validation, middleware, type casting, query building, MongoDB abstraction.

### 29. How do you design schemas in Mongoose?
**Your Room/Message models:** Document structure, data types, indexes, relationships.

### 30. What are MongoDB indexes and why are they important?
**Your roomId index:** Query performance, unique constraints, compound indexes.

### 31. How do you handle database connections in Node.js?
**Your connection setup:** Connection pooling, error handling, environment-based configuration.

### 32. What is the difference between SQL and NoSQL databases?
**Your choice rationale:** Structured vs unstructured data, ACID vs BASE, scaling differences.

---

## Google Drive API Integration

### 33. How do you authenticate with Google APIs?
**Your service implementation:** 

**Answer:** I implemented Google API authentication using service account credentials for server-to-server communication in my Google Drive integration.

**My Authentication Implementation:**

**1. Service Account Setup:**
```javascript
// googleDriveService.js
class GoogleDriveService {
  constructor() {
    this.drive = null;
    this.auth = null;
    this.isConfigured = false;
    this.initialize();
  }

  async initialize() {
    try {
      if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        // Parse service account JSON from environment variable
        const serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
        
        this.auth = new google.auth.GoogleAuth({
          credentials: serviceAccountKey,
          scopes: ['https://www.googleapis.com/auth/drive.readonly']
        });
        
        this.drive = google.drive({ version: 'v3', auth: this.auth });
        this.isConfigured = true;
      }
    } catch (error) {
      console.error('Google Auth initialization failed:', error);
    }
  }
}
```

**2. Environment Variable Security:**
```javascript
// .env file (not committed to repo)
GOOGLE_SERVICE_ACCOUNT_KEY='{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...",
  "client_email": "service-account@project.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token"
}'
```

**3. API Usage with Authentication:**
```javascript
async getFileInfo(fileId) {
  try {
    if (!this.isConfigured) {
      throw new Error('Google Drive service not configured');
    }

    const response = await this.drive.files.get({
      fileId: fileId,
      fields: 'id,name,mimeType,size,webViewLink,webContentLink'
    });

    return response.data;
  } catch (error) {
    if (error.code === 404) {
      throw new Error('File not found or not accessible');
    }
    throw error;
  }
}

async getDownloadUrl(fileId) {
  try {
    // Get file metadata first
    const fileInfo = await this.getFileInfo(fileId);
    
    // Generate download URL with authentication
    const response = await this.drive.files.get({
      fileId: fileId,
      alt: 'media'
    }, { responseType: 'stream' });

    return response.config.url;
  } catch (error) {
    console.error('Download URL generation failed:', error);
    throw error;
  }
}
```

**Authentication Methods Comparison:**

| Method | Use Case | My Implementation |
|--------|----------|-------------------|
| **Service Account** | Server-to-server | ✅ Used for file access |
| **OAuth 2.0** | User authorization | Alternative for user files |
| **API Key** | Public data only | Not suitable for private files |

**4. OAuth 2.0 Alternative (for user files):**
```javascript
// Alternative OAuth implementation for user's personal files
async initializeOAuth() {
  this.auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  // Would require user consent flow
  const authUrl = this.auth.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive.readonly']
  });
}
```

**5. Error Handling and Security:**
```javascript
async authenticatedRequest(operation) {
  try {
    // Refresh token if needed
    const authClient = await this.auth.getClient();
    
    // Execute operation with fresh token
    return await operation(authClient);
  } catch (error) {
    if (error.code === 401) {
      // Token expired, refresh and retry
      await this.refreshAuth();
      return await operation(this.auth);
    }
    throw error;
  }
}
```

**6. Rate Limiting and Best Practices:**
```javascript
// Implement exponential backoff for rate limits
async makeRequest(requestFunction, retries = 3) {
  try {
    return await requestFunction();
  } catch (error) {
    if (error.code === 429 && retries > 0) {
      // Rate limited, wait and retry
      const waitTime = Math.pow(2, 3 - retries) * 1000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.makeRequest(requestFunction, retries - 1);
    }
    throw error;
  }
}
```

**Security Considerations:**

**1. Credential Protection:**
- Service account key in environment variables
- Never commit credentials to repository
- Use separate keys for development/production

**2. Scope Limitation:**
```javascript
// Minimal required scopes
scopes: ['https://www.googleapis.com/auth/drive.readonly']
// Not using drive.write or broader scopes
```

**3. Error Information Sanitization:**
```javascript
// Don't expose internal errors to client
catch (error) {
  console.error('Internal Google API error:', error);
  res.status(500).json({ 
    error: 'File access failed',
    // Don't expose: error.message, API keys, etc.
  });
}
```

**Advantages of Service Account:**
- **No User Interaction:** Seamless server-side operation
- **Consistent Access:** Not dependent on user tokens
- **Scalable:** Works for any number of users
- **Secure:** Limited scope, revocable credentials

**When to Use OAuth 2.0 Instead:**
- Accessing user's personal Google Drive files
- Requiring user consent for file access
- Building user-specific features

**My Choice Rationale:**
I chose service account authentication because my app processes shared video files that don't require individual user authorization, providing a smoother user experience without OAuth consent flows.

### 34. What are environment variables and why are they important?
**Your .env usage:** Security, configuration management, deployment flexibility, sensitive data protection.

### 35. How do you handle API rate limits and errors?
**Your error handling:** Retry mechanisms, exponential backoff, graceful degradation.

### 36. Explain the difference between service account and OAuth2 authentication.
**Your auth strategy:** Server-to-server vs user authorization, use cases, security implications.

---

## Video Processing & FFmpeg

### 37. What is FFmpeg and how does it work in web applications?
**Your transcoding service:** Video format conversion, codec support, streaming optimization.

### 38. How do you handle different video formats in your application?
**Your format detection:** URL parsing, format validation, player compatibility.

### 39. What are the challenges of video streaming in web applications?
**Your player implementation:** Buffering, format compatibility, performance, mobile support.

### 40. How do you detect and handle YouTube URLs vs direct video files?
**Your URL parsing:** Regex patterns, video ID extraction, different player implementations.

---

## Full-Stack Architecture

### 41. Explain the architecture of your full-stack application.
**Your MERN stack:** 

**Answer:** My Stream2GetHer application follows a modern full-stack architecture using the MERN stack with real-time capabilities. Here's the complete architectural breakdown:

**Overall Architecture Diagram:**
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React Client  │◄──►│   Node.js Server │◄──►│   MongoDB       │
│   (Frontend)    │    │   (Backend)      │    │   (Database)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
        │                       │                       
        │              ┌─────────────────┐              
        └──────────────►│   Socket.IO     │              
                       │   (Real-time)   │              
                       └─────────────────┘              
                               │                         
                       ┌─────────────────┐              
                       │  Google Drive   │              
                       │     API         │              
                       └─────────────────┘              
```

**1. Frontend Architecture (React + Vite):**

**Component Structure:**
```
src/
├── components/
│   ├── HomePage.jsx          # Landing page
│   ├── RoomPage.jsx          # Main video streaming interface
│   ├── VideoPlayer.jsx       # Core video player with controls
│   ├── Chat.jsx              # Real-time chat component
│   ├── UserList.jsx          # Active users display
│   └── VideoControls.jsx     # Player control buttons
├── contexts/
│   └── SocketContext.jsx     # Global socket connection
├── hooks/
│   ├── useVideoPlayer.js     # Video state management
│   └── useYouTubePlayer.js   # YouTube API integration
├── services/
│   ├── socketManager.js      # Socket connection logic
│   └── ffmpegService.js      # Video processing
└── styles/
    └── *.module.css          # Component-scoped styling
```

**State Management Strategy:**
```javascript
// Global State (Context API)
├── Socket Connection (SocketContext)
├── User Authentication State
└── Room Connection State

// Local State (useState)
├── Video Player State (play/pause, time, volume)
├── Chat Messages
├── UI State (modals, loading)
└── Form Inputs
```

**2. Backend Architecture (Node.js + Express):**

**Server Structure:**
```
server/
├── index.js                  # Main server entry point
├── models/
│   ├── Room.js              # Room data schema
│   ├── Message.js           # Chat message schema
│   └── index.js             # Model exports
├── services/
│   ├── googleDriveService.js # Google Drive integration
│   └── transcodingService.js # Video processing
├── socket/
│   └── socketHandlers.js    # Real-time event handlers
└── middleware/
    ├── auth.js              # Authentication middleware
    ├── rateLimiter.js       # Rate limiting
    └── errorHandler.js      # Global error handling
```

**Express Middleware Stack:**
```javascript
// Security and Performance Middleware
app.use(helmet());              // Security headers
app.use(cors(corsOptions));     // Cross-origin requests
app.use(compression());         // Response compression
app.use(rateLimit());          // Rate limiting
app.use(express.json());       // JSON parsing

// Custom Middleware
app.use('/api', authMiddleware);
app.use(errorHandler);
```

**3. Real-time Communication Layer (Socket.IO):**

**Event Architecture:**
```javascript
// Client → Server Events
'join-room'         → User joins a video room
'video-play'        → Host plays video
'video-pause'       → Host pauses video
'video-seek'        → Host seeks to time
'chat-message'      → User sends chat
'disconnect'        → User leaves

// Server → Client Events
'user-joined'       → New user notification
'user-left'         → User departure notification
'video-sync'        → Video synchronization
'chat-message'      → Broadcast chat message
'room-state'        → Current room status
'error'             → Error notifications
```

**Connection Management:**
```javascript
// Active connection tracking
const activeRooms = new Map();        // roomId → Set<socketId>
const userConnections = new Map();    // socketId → {roomId, username}
const activeConnections = new Map();  // "roomId:username" → socketId
```

**4. Database Architecture (MongoDB + Mongoose):**

**Data Models:**
```javascript
// Room Document
{
  roomId: "unique-string",
  currentVideoUrl: "https://...",
  hostSocketId: "socket-id",
  participants: ["socket1", "socket2"],
  lastKnownTime: 125.5,
  lastKnownState: true,
  createdAt: Date,
  lastUpdatedAt: Date
}

// Message Document
{
  roomId: "room-id",
  username: "user",
  message: "text",
  timestamp: Date,
  messageType: "text"
}
```

**5. External Service Integration:**

**Google Drive API:**
```javascript
// File access and streaming
googleDriveService.getFileInfo(fileId)
googleDriveService.getDownloadUrl(fileId)
googleDriveService.getStreamingUrl(fileId)
```

**FFmpeg Integration:**
```javascript
// Video format conversion and optimization
ffmpegService.convertToWebFormat(inputUrl)
ffmpegService.generateThumbnail(videoUrl)
ffmpegService.extractMetadata(videoUrl)
```

**6. Communication Flow:**

**Video Synchronization Flow:**
```
1. User joins room → Socket connection established
2. User loads video → Video URL broadcast to room
3. Host plays video → Play event sent to server
4. Server broadcasts → All clients receive sync data
5. Clients adjust → Video players synchronize
6. Database updated → Room state persisted
```

**Chat Message Flow:**
```
1. User types message → Form submission
2. Socket emission → Message sent to server
3. Server validation → Rate limiting, sanitization
4. Database storage → Message persisted
5. Room broadcast → All users receive message
6. UI update → Message appears in chat
```

**7. Deployment Architecture:**

**Development Environment:**
```
├── Client (Vite dev server) → localhost:5173
├── Server (nodemon) → localhost:5000
└── MongoDB (local/Atlas) → localhost:27017
```

**Production Environment:**
```
├── Client (Static build) → CDN/Nginx
├── Server (PM2/Docker) → Node.js server
├── Database → MongoDB Atlas
└── Load Balancer → Multiple server instances
```

**8. Security Architecture:**

**Authentication & Authorization:**
```javascript
// JWT tokens for user sessions
// Socket connection authentication
// Room access validation
// Rate limiting per user/IP
```

**Data Validation:**
```javascript
// Input sanitization
// XSS prevention
// CSRF protection
// SQL injection prevention (NoSQL)
```

**9. Performance Optimizations:**

**Frontend:**
- Code splitting with React.lazy()
- Component memoization with React.memo()
- Debounced user inputs
- Optimized re-renders with useCallback/useMemo

**Backend:**
- Connection pooling for MongoDB
- Caching frequently accessed data
- Compressed responses
- Efficient database queries with indexes

**10. Scalability Considerations:**

**Horizontal Scaling:**
- Stateless server design
- Session storage in database
- Load balancing with sticky sessions
- Socket.IO Redis adapter for multiple instances

**This architecture provides:**
- **Real-time synchronization** across multiple users
- **Scalable design** for growing user base
- **Maintainable code** with clear separation of concerns
- **Secure implementation** with multiple security layers
- **Performance optimization** for smooth video streaming

### 42. How do you handle state management across your application?
**Your state strategy:** Local state, context API, server state synchronization.

### 43. What is the difference between client-side and server-side rendering?
**Your SPA approach:** SEO implications, performance trade-offs, user experience.

### 44. How do you deploy a full-stack application?
**Your deployment config:** Build process, environment setup, server configuration.

### 45. Explain your project's folder structure and organization.
**Your architecture:** Separation of concerns, modular design, maintainability.

---

## JavaScript & ES6+

### 46. What are Promises and async/await? Show examples from your code.
**Your async operations:** Database queries, API calls, error handling patterns.

### 47. Explain destructuring and template literals with examples.
**Your modern JS:** Object/array destructuring, string interpolation, cleaner syntax.

### 48. What are ES6 modules and how do they work?
**Your import/export:** Static module system, named vs default exports, tree shaking.

### 49. How do you handle asynchronous operations in JavaScript?
**Your real-time app:** Callbacks, promises, async/await, event listeners.

---

## Web Development Concepts

### 50. How would you optimize the performance of your streaming application?
**Your optimization strategies:** 

**Answer:** Performance optimization is crucial for a real-time video streaming application. Here are the comprehensive optimizations I've implemented and would implement:

## Frontend Performance Optimizations

**1. Code Splitting and Lazy Loading:**
```javascript
// React.lazy for route-based code splitting
const RoomPage = lazy(() => import('./components/RoomPage'));
const HomePage = lazy(() => import('./components/HomePage'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/room/:roomId" element={<RoomPage />} />
      </Routes>
    </Suspense>
  );
}

// Component-level lazy loading
const VideoFormatTester = lazy(() => import('./VideoFormatTester'));
```

**2. React Performance Optimizations:**
```javascript
// Memoization for expensive components
const VideoPlayer = memo(({ videoUrl, roomId }) => {
  // Component logic
}, (prevProps, nextProps) => {
  return prevProps.videoUrl === nextProps.videoUrl &&
         prevProps.roomId === nextProps.roomId;
});

// useCallback for event handlers
const handlePlayPause = useCallback(() => {
  socket.emit('video-toggle', { 
    currentTime: videoRef.current.currentTime,
    isPlaying: !isPlaying 
  });
}, [socket, isPlaying]);

// useMemo for expensive calculations
const sortedMessages = useMemo(() => {
  return messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}, [messages]);
```

**3. Event Throttling and Debouncing:**
```javascript
// Throttle video sync events to prevent spam
const throttledSync = useCallback(
  throttle((currentTime) => {
    socket.emit('video-sync', { 
      currentTime, 
      timestamp: Date.now() 
    });
  }, 100), // Max 10 updates per second
  [socket]
);

// Debounce chat input
const debouncedTyping = useCallback(
  debounce(() => {
    socket.emit('typing-stopped', { roomId });
  }, 1000),
  [socket, roomId]
);
```

**4. Bundle Optimization:**
```javascript
// vite.config.js
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          socket: ['socket.io-client'],
          video: ['react-player'],
          utils: ['lodash', 'date-fns']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
});
```

## Backend Performance Optimizations

**5. Database Optimizations:**
```javascript
// Compound indexes for frequent queries
roomSchema.index({ roomId: 1, 'participants': 1 });
messageSchema.index({ roomId: 1, timestamp: -1 });

// Efficient queries with projections
const room = await Room.findOne(
  { roomId }, 
  { participants: 1, currentVideoUrl: 1, lastKnownTime: 1 }
);

// Aggregation pipeline for analytics
const roomStats = await Room.aggregate([
  { $match: { createdAt: { $gte: yesterday } } },
  { $group: { _id: null, totalRooms: { $sum: 1 } } }
]);
```

**6. Connection Pooling and Caching:**
```javascript
// MongoDB connection optimization
mongoose.connect(mongoUri, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  bufferCommands: false,
  bufferMaxEntries: 0
});

// In-memory caching for room data
const roomCache = new Map();

const getCachedRoom = async (roomId) => {
  if (roomCache.has(roomId)) {
    return roomCache.get(roomId);
  }
  
  const room = await Room.findOne({ roomId });
  roomCache.set(roomId, room);
  
  // Cache expiry
  setTimeout(() => roomCache.delete(roomId), 300000); // 5 minutes
  return room;
};
```

**7. Socket.IO Optimizations:**
```javascript
// Efficient room management
const activeRooms = new Map(); // In-memory room tracking

// Batch operations for multiple socket events
const batchUpdates = [];
socket.on('video-sync', (data) => {
  batchUpdates.push(data);
  
  // Process batch every 50ms
  if (batchUpdates.length === 1) {
    setTimeout(() => {
      processBatch(batchUpdates.splice(0));
    }, 50);
  }
});

// Connection optimization
const io = new Server(server, {
  transports: ['websocket'], // Skip polling fallback
  upgradeTimeout: 30000,
  pingTimeout: 60000,
  pingInterval: 25000
});
```

## Video Streaming Optimizations

**8. Adaptive Streaming:**
```javascript
// Dynamic quality adjustment
const adjustVideoQuality = (bandwidth) => {
  const qualities = [
    { bandwidth: 5000000, quality: '1080p' },
    { bandwidth: 2500000, quality: '720p' },
    { bandwidth: 1000000, quality: '480p' },
    { bandwidth: 500000, quality: '360p' }
  ];
  
  return qualities.find(q => bandwidth >= q.bandwidth) || qualities[qualities.length - 1];
};

// Progressive video loading
const preloadVideoSegments = async (videoUrl) => {
  const segments = await getVideoSegments(videoUrl);
  segments.slice(0, 3).forEach(segment => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = segment.url;
    document.head.appendChild(link);
  });
};
```

**9. Video Format Optimization:**
```javascript
// FFmpeg optimizations for web streaming
const optimizeForWeb = (inputPath, outputPath) => {
  return ffmpeg(inputPath)
    .videoCodec('libx264')
    .audioCodec('aac')
    .format('mp4')
    .addOptions([
      '-movflags', 'faststart', // Enable progressive download
      '-preset', 'fast',        // Encoding speed vs compression
      '-crf', '23',             // Quality setting
      '-maxrate', '2000k',      // Maximum bitrate
      '-bufsize', '4000k'       // Buffer size
    ])
    .output(outputPath);
};
```

## Network Optimizations

**10. CDN and Asset Optimization:**
```javascript
// Static asset optimization
const assetOptimization = {
  images: {
    format: 'webp',
    quality: 80,
    progressive: true
  },
  videos: {
    codec: 'h264',
    bitrate: '2000k',
    faststart: true
  }
};

// Service Worker for caching
self.addEventListener('fetch', (event) => {
  if (event.request.destination === 'video') {
    event.respondWith(
      caches.open('video-cache').then(cache => {
        return cache.match(event.request) || fetch(event.request);
      })
    );
  }
});
```

**11. Request Optimization:**
```javascript
// HTTP/2 Server Push
app.get('/room/:id', (req, res) => {
  // Push critical resources
  res.push('/assets/video-player.js');
  res.push('/assets/video-player.css');
  res.render('room');
});

// Request batching
const batchRequests = (requests) => {
  return Promise.all(requests.map(req => 
    fetch(req.url, { method: req.method, body: req.body })
  ));
};
```

## Monitoring and Analytics

**12. Performance Monitoring:**
```javascript
// Client-side performance tracking
const trackVideoPerformance = () => {
  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach(entry => {
      if (entry.name.includes('video')) {
        analytics.track('video-load-time', {
          duration: entry.duration,
          url: entry.name
        });
      }
    });
  });
  
  observer.observe({ entryTypes: ['resource'] });
};

// Server-side monitoring
const monitorSocketPerformance = () => {
  const startTime = process.hrtime();
  
  socket.on('video-sync', (data) => {
    const diff = process.hrtime(startTime);
    const latency = diff[0] * 1000 + diff[1] * 1e-6;
    
    if (latency > 100) { // Log slow operations
      console.warn(`Slow video sync: ${latency}ms`);
    }
  });
};
```

## Scalability Optimizations

**13. Load Balancing:**
```javascript
// Sticky sessions for Socket.IO
const sessionAffinity = (req) => {
  return req.headers['x-forwarded-for'] || req.connection.remoteAddress;
};

// Redis adapter for multi-instance Socket.IO
io.adapter(createAdapter(redisClient, redisClient.duplicate()));
```

**14. Microservices Architecture:**
```javascript
// Separate services for different concerns
const services = {
  videoProcessing: 'http://video-service:3001',
  chatService: 'http://chat-service:3002',
  userService: 'http://user-service:3003'
};

// Service mesh communication
const makeServiceCall = async (service, endpoint, data) => {
  const response = await fetch(`${services[service]}${endpoint}`, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' }
  });
  return response.json();
};
```

## Performance Metrics I Track:

**Client-side:**
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Video start time
- Socket connection latency
- Bundle size and load times

**Server-side:**
- Response times for API endpoints
- Socket event processing time
- Database query performance
- Memory usage and CPU utilization
- Concurrent user capacity

**Business Metrics:**
- Room join success rate
- Video sync accuracy
- User retention in rooms
- Chat message delivery rate

These optimizations ensure my Stream2GetHer application can handle hundreds of concurrent users while maintaining smooth video synchronization and responsive chat functionality.

---

## Project-Specific Deep Dive Questions

### Additional Questions Interviewers Might Ask:

**Architecture Questions:**
- "Walk me through how a user joins a room and video synchronization works"
- "How do you handle edge cases like network disconnections?"
- "What happens when the host leaves the room?"

**Scaling Questions:**
- "How would you scale this application for 1000+ concurrent users?"
- "What database optimizations would you implement?"
- "How would you handle multiple video rooms?"

**Security Questions:**
- "How do you prevent unauthorized access to rooms?"
- "What security measures did you implement?"
- "How do you validate user inputs?"

**Problem-Solving Questions:**
- "What was the most challenging bug you fixed?"
- "How did you debug Socket.IO connection issues?"
- "What would you do differently if you rebuilt this project?"

---

## Interview Preparation Tips

### Technical Demonstration:
1. **Be ready to run your project live** and explain the code step-by-step
2. **Prepare to discuss specific implementation decisions** with concrete examples
3. **Know your dependencies** and why you chose them over alternatives
4. **Understand the complete data flow** from user action to database and back
5. **Practice explaining complex concepts** like video synchronization in simple terms

### Common Deep-Dive Questions:
**Architecture Questions:**
- "Walk me through what happens when a user clicks play and how all connected users get synchronized"
- "How do you handle edge cases like network disconnections during video playback?"
- "What happens when the host leaves the room? How do you handle host migration?"
- "Explain your database schema design decisions for the Room and Message models"

**Scaling Questions:**
- "How would you scale this application to handle 10,000+ concurrent users across 1,000+ rooms?"
- "What database optimizations would you implement for better query performance?"
- "How would you handle video streaming for users with different bandwidth capabilities?"
- "What caching strategies would you implement to reduce database load?"

**Security Questions:**
- "How do you prevent unauthorized access to private video rooms?"
- "What measures did you implement to prevent XSS and injection attacks?"
- "How do you validate and sanitize user inputs, especially chat messages?"
- "Explain your rate limiting strategy and why those specific limits?"

**Problem-Solving Questions:**
- "What was the most challenging technical problem you solved in this project?"
- "How did you debug and fix Socket.IO connection issues?"
- "If you had to rebuild this project today, what would you do differently?"
- "How do you handle video format compatibility across different browsers?"

### Code Review Preparation:
Be ready to walk through and explain any part of your codebase, especially:

**Critical Code Sections:**
- **Socket event handlers** in `socketHandlers.js`
- **Video synchronization logic** in `VideoPlayer.jsx`
- **React Context implementation** in `SocketContext.jsx`
- **Database models** and schema design
- **Error handling strategies** throughout the application
- **Middleware stack** configuration in `index.js`

**Performance Discussion Points:**
- Why you chose certain React patterns (hooks, context, memo)
- Database indexing strategies for room and message queries
- Socket.IO room management and memory optimization
- Video player optimization techniques

### Technical Storytelling:
Prepare compelling narratives around:

1. **"The Synchronization Challenge"**
   - Problem: Multiple users watching same video out of sync
   - Solution: Timestamp-based synchronization with network delay compensation
   - Result: Sub-second accuracy across different network conditions

2. **"The Scale Solution"**
   - Problem: Managing multiple concurrent video rooms
   - Solution: Efficient room management with Socket.IO namespaces
   - Result: Isolated room operations without cross-interference

3. **"The Real-time Chat Implementation"**
   - Problem: Instant messaging alongside video streaming
   - Solution: WebSocket events with rate limiting and message persistence
   - Result: Smooth chat experience without affecting video performance

### Key Technical Accomplishments to Highlight:

**Advanced Features You Built:**
- Real-time video synchronization across multiple users
- Google Drive API integration for seamless file access
- FFmpeg integration for video format conversion
- Comprehensive error handling and reconnection logic
- Production-ready security middleware implementation

**Modern Development Practices:**
- ES6+ JavaScript with module system
- React hooks and context patterns
- RESTful API design with proper status codes
- Environment-based configuration management
- Git version control with meaningful commit messages

**Full-Stack Competency:**
- Frontend: React, modern CSS, responsive design
- Backend: Node.js, Express, MongoDB integration
- Real-time: Socket.IO WebSocket implementation
- DevOps: Build processes, environment management
- External APIs: Google Drive integration, authentication

### Questions to Ask Interviewers:
Show your engagement and technical curiosity:

**Technical Questions:**
- "What's the current tech stack, and how does it compare to what I've used?"
- "What are the biggest technical challenges the team is currently facing?"
- "How do you handle code reviews and deployment processes?"
- "What testing strategies does the team follow?"

**Learning Questions:**
- "What opportunities are there for learning new technologies?"
- "How does the team stay updated with modern development practices?"
- "What would success look like in this role after 6 months?"

**Project Questions:**
- "Are there any similarities between my project and the work I'd be doing here?"
- "How do you approach real-time features in your applications?"
- "What performance considerations are most important in your current products?"

### Final Preparation Checklist:

**Before the Interview:**
- [ ] Test your project demo thoroughly
- [ ] Prepare your development environment for live coding
- [ ] Review your Git commit history for discussion points
- [ ] Practice explaining technical concepts without jargon
- [ ] Prepare specific examples of problem-solving from your project

**During the Interview:**
- [ ] Think out loud while solving problems
- [ ] Ask clarifying questions before diving into solutions
- [ ] Reference your actual project code when possible
- [ ] Admit knowledge gaps honestly but show eagerness to learn
- [ ] Connect interview questions back to your real experience

**Remember:** Your Stream2GetHer project demonstrates real-world full-stack development skills that many entry-level candidates lack. You've solved complex problems around real-time synchronization, built a complete MERN stack application, integrated external APIs, and implemented production-ready features. Be confident in your technical abilities while remaining humble and eager to learn!

---

**Remember:** Your project demonstrates real-world full-stack development skills. Be confident in explaining your technical decisions and ready to discuss how you'd improve or scale the application!
