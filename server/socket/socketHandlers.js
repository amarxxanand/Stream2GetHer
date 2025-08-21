import { Room, Message } from '../models/index.js';

// Store active rooms and their sync intervals
const activeRooms = new Map();
const syncIntervals = new Map();

// Rate limiting for join attempts
const joinAttempts = new Map(); // socketId -> { count, lastAttempt }
const JOIN_RATE_LIMIT = 3; // max 3 attempts
const JOIN_RATE_WINDOW = 10000; // per 10 seconds

export const handleSocketConnection = (socket, io) => {
  console.log(`🔌 Socket connected: ${socket.id} from ${socket.handshake.address}`);
  
  // Add connection timestamp to track rapid reconnections
  socket.connectionTime = Date.now();
  
  // Handle room joining
  socket.on('join-room', async (data) => {
    try {
      const { roomId, username } = data;
      
      // Rate limiting check
      const now = Date.now();
      const attempts = joinAttempts.get(socket.id) || { count: 0, lastAttempt: 0 };
      
      // Reset counter if window has passed
      if (now - attempts.lastAttempt > JOIN_RATE_WINDOW) {
        attempts.count = 0;
      }
      
      // Check rate limit
      if (attempts.count >= JOIN_RATE_LIMIT) {
        console.log(`🚫 Rate limit exceeded for ${socket.id}, ignoring join attempt`);
        socket.emit('error', { message: 'Too many join attempts. Please wait.' });
        return;
      }
      
      // Update attempts
      attempts.count++;
      attempts.lastAttempt = now;
      joinAttempts.set(socket.id, attempts);
      
      // Prevent rapid rejoining - if socket was just created, wait a moment
      const timeSinceConnection = Date.now() - socket.connectionTime;
      if (timeSinceConnection < 2000) {
        console.log(`⚠️ Socket ${socket.id} trying to join too quickly after connection, delaying...`);
        await new Promise(resolve => setTimeout(resolve, 2000 - timeSinceConnection));
      }
      
      // Find the room in database
      const room = await Room.findOne({ roomId });
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }
      
      // Check if this socket is already in the room (prevent double joins)
      if (socket.roomId === roomId) {
        console.log(`⚠️ Socket ${socket.id} already in room ${roomId}, ignoring duplicate join`);
        return;
      }
      
      // Join the socket.io room
      socket.join(roomId);
      socket.roomId = roomId;
      socket.username = username || `User-${socket.id.substring(0, 6)}`;
      
      // Initialize room in memory if not exists
      if (!activeRooms.has(roomId)) {
        activeRooms.set(roomId, {
          hostSocketId: null,
          users: new Map()
        });
      }
      
      const activeRoom = activeRooms.get(roomId);
      
      // Check if user already exists (in case of reconnection)
      if (activeRoom.users.has(socket.id)) {
        console.log(`⚠️ User ${socket.username} already exists in room ${roomId}, updating...`);
      }
      
      activeRoom.users.set(socket.id, {
        username: socket.username,
        isHost: false
      });
      
      // Assign host if no host exists
      if (!activeRoom.hostSocketId || !activeRoom.users.has(activeRoom.hostSocketId)) {
        activeRoom.hostSocketId = socket.id;
        activeRoom.users.get(socket.id).isHost = true;
        room.hostSocketId = socket.id;
        await room.save();
        
        socket.emit('host-assigned', { isHost: true });
        
        // Start sync interval for this room if not already started
        if (!syncIntervals.has(roomId)) {
          startSyncInterval(roomId, io);
        }
      }
      
      // Send current state to the new user
      const syncState = {
        videoUrl: room.currentVideoUrl,
        videoTitle: room.currentVideoTitle,
        time: room.lastKnownTime,
        isPlaying: room.lastKnownState,
        isHost: activeRoom.hostSocketId === socket.id
      };
      
      console.log(`📤 Sending sync state to ${socket.username}:`, syncState);
      socket.emit('sync-state', syncState);
      
      // Send existing chat messages to the new user
      try {
        const existingMessages = await Message.find({ roomId })
          .sort({ timestamp: 1 })
          .limit(50); // Last 50 messages
        
        if (existingMessages.length > 0) {
          console.log(`💬 Sending ${existingMessages.length} existing messages to ${socket.username}`);
          for (const msg of existingMessages) {
            socket.emit('new-chat-message', {
              author: msg.author,
              message: msg.message,
              timestamp: msg.timestamp
            });
          }
        }
      } catch (error) {
        console.error('Error sending existing messages:', error);
      }
      
      // Notify other users about new participant
      socket.to(roomId).emit('user-joined', {
        username: socket.username,
        userId: socket.id
      });
      
      // Send updated user list
      const userList = Array.from(activeRoom.users.values());
      console.log(`👥 Sending user list to room ${roomId}:`, userList);
      io.to(roomId).emit('user-list-updated', userList);
      
      console.log(`✅ ${socket.username} joined room ${roomId} (${activeRoom.users.size} users total)`);
      
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });
  
  // Host playback control events
  socket.on('host:play', async (data) => {
    if (!isHost(socket)) return;
    
    try {
      const { time } = data;
      const room = await Room.findOne({ roomId: socket.roomId });
      if (room) {
        room.lastKnownTime = time;
        room.lastKnownState = true;
        await room.save();
      }
      
      socket.to(socket.roomId).emit('server:play', { time });
      console.log(`Host ${socket.username} played at time ${time}`);
    } catch (error) {
      console.error('Error handling host:play:', error);
    }
  });
  
  socket.on('host:pause', async (data) => {
    if (!isHost(socket)) return;
    
    try {
      const { time } = data;
      const room = await Room.findOne({ roomId: socket.roomId });
      if (room) {
        room.lastKnownTime = time;
        room.lastKnownState = false;
        await room.save();
      }
      
      socket.to(socket.roomId).emit('server:pause', { time });
      console.log(`Host ${socket.username} paused at time ${time}`);
    } catch (error) {
      console.error('Error handling host:pause:', error);
    }
  });
  
  socket.on('host:seek', async (data) => {
    if (!isHost(socket)) return;
    
    try {
      const { time } = data;
      const room = await Room.findOne({ roomId: socket.roomId });
      if (room) {
        room.lastKnownTime = time;
        await room.save();
      }
      
      socket.to(socket.roomId).emit('server:seek', { time });
      console.log(`Host ${socket.username} seeked to time ${time}`);
    } catch (error) {
      console.error('Error handling host:seek:', error);
    }
  });
  
  socket.on('host:change-video', async (data) => {
    if (!isHost(socket)) return;
    
    try {
      const { videoUrl, videoTitle } = data;
      const room = await Room.findOne({ roomId: socket.roomId });
      if (room) {
        room.currentVideoUrl = videoUrl;
        room.currentVideoTitle = videoTitle || null;
        room.lastKnownTime = 0;
        room.lastKnownState = false;
        await room.save();
      }
      
      io.to(socket.roomId).emit('server:change-video', { videoUrl, videoTitle });
      console.log(`Host ${socket.username} changed video to ${videoUrl}`);
    } catch (error) {
      console.error('Error handling host:change-video:', error);
    }
  });
  
  // Host time reporting for synchronization
  socket.on('host:report-time', (data) => {
    if (!isHost(socket)) return;
    
    const { time } = data;
    io.to(socket.roomId).emit('server:sync-time', { time });
  });
  
  // Client requesting resync after buffering
  socket.on('client:request-sync', async () => {
    try {
      const room = await Room.findOne({ roomId: socket.roomId });
      if (room) {
        socket.emit('sync-state', {
          videoUrl: room.currentVideoUrl,
          videoTitle: room.currentVideoTitle,
          time: room.lastKnownTime,
          isPlaying: room.lastKnownState,
          isHost: false
        });
      }
    } catch (error) {
      console.error('Error handling client:request-sync:', error);
    }
  });
  
  // Chat message handling
  socket.on('chat-message', async (data) => {
    try {
      const { message } = data;
      
      if (!socket.roomId) {
        console.error(`❌ User ${socket.id} trying to send message without being in a room`);
        socket.emit('error', { message: 'You must join a room to send messages' });
        return;
      }
      
      if (!message || !message.trim()) {
        console.error(`❌ Empty message from ${socket.username}`);
        return;
      }
      
      const author = socket.username || `User-${socket.id.substring(0, 6)}`;
      const timestamp = new Date();
      
      console.log(`💬 Chat message from ${author} in room ${socket.roomId}: ${message.trim()}`);
      
      // Save to database
      const chatMessage = new Message({
        roomId: socket.roomId,
        author,
        message: message.trim(),
        timestamp
      });
      await chatMessage.save();
      
      // Broadcast to all users in room
      const messageData = {
        author,
        message: message.trim(),
        timestamp
      };
      
      io.to(socket.roomId).emit('new-chat-message', messageData);
      console.log(`📤 Broadcasted message to room ${socket.roomId}`);
      
    } catch (error) {
      console.error('Error handling chat message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', async (reason) => {
    const disconnectTime = Date.now();
    const connectionDuration = disconnectTime - socket.connectionTime;
    
    console.log(`🔌 Socket disconnected: ${socket.id}, reason: ${reason}, duration: ${connectionDuration}ms`);
    
    // Clean up rate limiting data
    joinAttempts.delete(socket.id);
    
    // If connection was very short (less than 5 seconds), it might be a connection issue
    if (connectionDuration < 5000) {
      console.log(`⚠️ Very short connection duration for ${socket.id}, might be a connection issue`);
    }
    
    if (socket.roomId) {
      const activeRoom = activeRooms.get(socket.roomId);
      if (activeRoom && activeRoom.users.has(socket.id)) {
        activeRoom.users.delete(socket.id);
        
        // If this was the host, assign new host
        if (activeRoom.hostSocketId === socket.id) {
          const remainingUsers = Array.from(activeRoom.users.keys());
          if (remainingUsers.length > 0) {
            const newHostSocketId = remainingUsers[0];
            activeRoom.hostSocketId = newHostSocketId;
            activeRoom.users.get(newHostSocketId).isHost = true;
            
            // Update database
            try {
              const room = await Room.findOne({ roomId: socket.roomId });
              if (room) {
                room.hostSocketId = newHostSocketId;
                await room.save();
              }
            } catch (error) {
              console.error('Error updating host in database:', error);
            }
            
            // Notify new host
            io.to(newHostSocketId).emit('host-assigned', { isHost: true });
            console.log(`👑 New host assigned: ${newHostSocketId}`);
          } else {
            // No users left, clean up room
            activeRooms.delete(socket.roomId);
            if (syncIntervals.has(socket.roomId)) {
              clearInterval(syncIntervals.get(socket.roomId));
              syncIntervals.delete(socket.roomId);
            }
            console.log(`🧹 Room ${socket.roomId} cleaned up - no users remaining`);
          }
        }
        
        // Notify remaining users
        socket.to(socket.roomId).emit('user-left', {
          username: socket.username,
          userId: socket.id
        });
        
        // Send updated user list
        if (activeRoom.users.size > 0) {
          const userList = Array.from(activeRoom.users.values());
          io.to(socket.roomId).emit('user-list-updated', userList);
        }
        
        console.log(`📤 ${socket.username || socket.id} left room ${socket.roomId} (${activeRoom.users.size} users remaining)`);
      }
    }
  });
};

// Helper function to check if socket is host
const isHost = (socket) => {
  if (!socket.roomId) return false;
  
  const activeRoom = activeRooms.get(socket.roomId);
  return activeRoom && activeRoom.hostSocketId === socket.id;
};

// Start synchronization interval for a room
const startSyncInterval = (roomId, io) => {
  const interval = setInterval(() => {
    const activeRoom = activeRooms.get(roomId);
    if (!activeRoom || activeRoom.users.size === 0) {
      clearInterval(interval);
      syncIntervals.delete(roomId);
      activeRooms.delete(roomId);
      return;
    }
    
    // Request time from host
    if (activeRoom.hostSocketId && activeRoom.users.has(activeRoom.hostSocketId)) {
      io.to(activeRoom.hostSocketId).emit('server:request-host-time');
    }
  }, 10000); // Every 10 seconds
  
  syncIntervals.set(roomId, interval);
};
