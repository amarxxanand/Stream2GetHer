import { Server } from 'socket.io';

let io;

export default function handler(req, res) {
  if (!res.socket.server.io) {
    console.log('*First use, starting socket.io');

    const io = new Server(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['polling'] // Force polling for Vercel compatibility
    });

    // Import your socket handlers
    io.on('connection', (socket) => {
      console.log('User connected:', socket.id);

      // Join room handler
      socket.on('join-room', async (data) => {
        const { roomId, username } = data;
        
        try {
          // Join the socket room
          socket.join(roomId);
          
          // Broadcast to others in the room
          socket.to(roomId).emit('user-joined', {
            username,
            message: `${username} joined the room`
          });
          
          socket.emit('join-success', { roomId });
        } catch (error) {
          socket.emit('join-error', { message: 'Failed to join room' });
        }
      });

      // Video control handlers
      socket.on('video-play', (data) => {
        socket.to(data.roomId).emit('video-play', data);
      });

      socket.on('video-pause', (data) => {
        socket.to(data.roomId).emit('video-pause', data);
      });

      socket.on('video-seek', (data) => {
        socket.to(data.roomId).emit('video-seek', data);
      });

      socket.on('video-change', (data) => {
        socket.to(data.roomId).emit('video-change', data);
      });

      // Chat handlers
      socket.on('chat-message', (data) => {
        io.to(data.roomId).emit('chat-message', data);
      });

      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
      });
    });

    res.socket.server.io = io;
  }
  
  res.end();
}
