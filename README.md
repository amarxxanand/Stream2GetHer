# Stream2Gether - Real-Time Synchronized Media Platform

A full-stack MERN application that enables real-time synchronized video watching experiences supporting both YouTube videos and Google Drive files with WebSocket communication.

## 🚀 Features

- **Multi-Source Video Support**: Watch YouTube videos AND Google Drive files together in perfect sync
- **Universal Format Support**: All video formats supported (MP4, MKV, AVI, MOV, WebM, FLV, WMV, etc.)
- **Real-time Synchronization**: Perfect sync across all participants
- **Host Authority Model**: Designated host controls playback for all participants
- **Advanced Sync Mechanisms**: 
  - Automatic drift correction every 10 seconds
  - Buffer recovery with automatic resync
  - Latency compensation with configurable tolerance
- **Live Chat**: Real-time messaging with all participants
- **User Management**: See who's in the room with host indicators
- **Responsive Design**: Works on desktop and mobile devices
- **Room-based Sessions**: Create and join rooms with unique IDs

## 🏗️ Architecture

### Technology Stack
- **Frontend**: React 18, React Router, Socket.IO Client
- **Backend**: Node.js, Express.js, Socket.IO
- **Database**: MongoDB with Mongoose ODM
- **Video Player**: Multi-source support (YouTube IFrame API + Custom HTML5 Player)
- **Real-time Communication**: WebSocket (Socket.IO)

### System Architecture
```
┌─────────────────┐    WebSocket    ┌──────────────────┐    HTTP/DB    ┌─────────────┐
│  React Client   │ ◄─────────────► │  Node.js Server │ ◄───────────► │  MongoDB    │
│                 │                 │                  │               │             │
│ - Multi Player  │                 │ - Socket.IO      │               │ - Rooms     │
│ - Chat UI       │                 │ - Express API    │               │ - Messages  │
│ - User List     │                 │ - Room Logic     │               │ - Indexes   │
└─────────────────┘                 └──────────────────┘               └─────────────┘
```

## 📁 Project Structure

```
Stream2GetHer/
├── server/                 # Backend Node.js application
│   ├── models/            # MongoDB schemas (Room, Message)
│   ├── socket/            # Socket.IO event handlers
│   ├── index.js           # Main server file
│   └── package.json       # Server dependencies
├── client/                # Frontend React application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── contexts/      # React contexts (Socket)
│   │   ├── hooks/         # Custom hooks (YouTube Player)
│   │   └── socket.js      # Socket.IO client setup
│   └── package.json       # Client dependencies
└── README.md              # This file
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- Modern web browser with WebSocket support

### 1. Clone the Repository
```bash
git clone <repository-url>
cd Stream2GetHer
```

### 2. Server Setup
```bash
cd server
npm install
```

Create `.env` file in server directory:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/stream2gether
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

Start the server:
```bash
npm run dev
```

### 3. Client Setup
```bash
cd client
npm install
```

Create `.env` file in client directory:
```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_SERVER_URL=http://localhost:3000
```

Start the client:
```bash
npm run dev
```

### 4. Database Setup
Make sure MongoDB is running on your system. The application will automatically create the necessary collections and indexes.

## 🎯 Usage

1. **Access the Application**: Open `http://localhost:5173` in your browser
2. **Create a Room**: Enter your username and click "Create Room"
3. **Invite Others**: Share the room URL or room ID with friends
4. **Load a Video**: As the host, paste a YouTube URL, video ID, or Google Drive URL to start watching
5. **Enjoy Together**: Use the chat to communicate while watching synchronized content

## 🔧 API Endpoints

### REST API
- `GET /api/health` - Server health check
- `POST /api/rooms` - Create a new room
- `GET /api/rooms/:roomId` - Get room information
- `GET /api/rooms/:roomId/messages` - Get chat history

### WebSocket Events
- `join-room` - Join a specific room
- `host:play/pause/seek` - Host playback controls
- `server:play/pause/seek` - Server broadcasts to clients
- `chat-message` - Send chat message
- `sync-state` - Synchronize new users

## 🎨 Key Features Implementation

### Real-time Synchronization
- **Host Authority**: First user becomes host, controls playback
- **Event Broadcasting**: Socket.IO rooms for targeted communication
- **State Persistence**: MongoDB stores current video and playback state

### Advanced Sync Mechanisms
- **Periodic Sync**: Server requests host time every 10 seconds
- **Drift Correction**: Clients auto-correct if more than 1.5s out of sync
- **Buffer Recovery**: Automatic resync after buffering events

### Multi-Source Video Integration
- **YouTube Integration**: Custom hook wrapping YouTube IFrame API
- **Google Drive Integration**: Direct video streaming from Google Drive
- **Universal Format Support**: All video formats supported with smart detection
- **Adaptive Playback**: Automatic source detection and player selection
- **Programmatic Control**: Play, pause, seek, load video operations
- **State Management**: React state synchronized with player events

## 🚀 Production Deployment

### Environment Variables
Set the following for production:

**Server:**
```env
NODE_ENV=production
PORT=3000
MONGODB_URI=<your-mongodb-connection-string>
CLIENT_URL=<your-frontend-domain>
```

**Client:**
```env
VITE_API_BASE_URL=<your-backend-api-url>
VITE_SERVER_URL=<your-backend-websocket-url>
```

### Build Commands
```bash
# Build client
cd client && npm run build

# Start production server
cd server && npm start
```

## 🔍 Advanced Configuration

### Sync Tolerance
Adjust the sync tolerance in `RoomPage.jsx`:
```javascript
const [syncTolerance] = useState(1.5); // seconds
```

### Sync Interval
Modify the sync interval in `socketHandlers.js`:
```javascript
const interval = setInterval(() => {
  // Sync logic
}, 10000); // 10 seconds
```

## 🐛 Troubleshooting

### Common Issues
1. **Connection Failed**: Check if server is running and ports are correct
2. **Video Not Loading**: 
   - For YouTube: Ensure video is public and embeddable
   - For Google Drive: Check file permissions and sharing settings
   - For other formats: Verify file format compatibility
3. **Sync Issues**: Check network latency and sync tolerance settings
4. **Database Errors**: Verify MongoDB connection and permissions

### Debug Mode
Enable debug logging:
```javascript
// In socket.js
export const socket = io(URL, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
  debug: true // Add this for debugging
});
```

## 📈 Performance Considerations

- **Connection Pooling**: MongoDB connection pooling enabled
- **Message Queuing**: Socket.IO handles message queuing automatically
- **Memory Management**: Automatic cleanup of inactive rooms
- **Scalability**: Stateless server design allows horizontal scaling

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- YouTube IFrame API for video playback
- Socket.IO for real-time communication
- React team for the excellent framework
- MongoDB for flexible data storage
