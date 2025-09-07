import { Room, Message } from '../models/index.js';

// Store active rooms and their sync intervals
const activeRooms = new Map();
const syncIntervals = new Map();

// Enhanced tracking for connection management
const joinAttempts = new Map(); // socketId -> { count, lastAttempt }
const activeConnections = new Map(); // roomId+username -> socketId
const userConnections = new Map(); // socketId -> { roomId, username }

const JOIN_RATE_LIMIT = 5; // max 5 attempts
const JOIN_RATE_WINDOW = 15000; // per 15 seconds

export const handleSocketConnection = (socket, io) => {
  console.log(`🔌 Socket connected: ${socket.id} from ${socket.handshake.address}`);
  
  // Add connection timestamp to track rapid reconnections
  socket.connectionTime = Date.now();
  
  // Handle room joining
  socket.on('join-room', async (data) => {
    try {
      const { roomId, username } = data;
      
      // Check for duplicate connections (same user already in same room)
      const connectionKey = `${roomId}:${username}`;
      const existingSocketId = activeConnections.get(connectionKey);
      
      if (existingSocketId && existingSocketId !== socket.id) {
        // Check if existing socket is still connected
        const existingSocket = io.sockets.sockets.get(existingSocketId);
        if (existingSocket && existingSocket.connected) {
          console.log(`🚫 Duplicate connection detected: ${username} already in ${roomId} with socket ${existingSocketId}`);
          socket.emit('error', { message: 'You are already connected to this room from another tab/device.' });
          return;
        } else {
          // Clean up stale connection
          console.log(`🧹 Cleaning up stale connection for ${username} in ${roomId}`);
          activeConnections.delete(connectionKey);
        }
      }
      
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
      if (timeSinceConnection < 1000) {
        console.log(`⚠️ Socket ${socket.id} trying to join too quickly after connection, delaying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 - timeSinceConnection));
      }
      
      // Find the room in database (fallback to in-memory if DB unavailable)
      let room;
      let isRoomCreator = false;
      
      try {
        room = await Room.findOne({ roomId });
        if (!room) {
          // Create room in database if not exists - this user is the creator/host
          room = await Room.create({
            roomId,
            hostUserId: socket.id,
            hostUsername: username || `User-${socket.id.substring(0, 6)}`,
            createdAt: new Date()
          });
          isRoomCreator = true;
          console.log(`👑 ${username} created room ${roomId} and became host`);
        } else {
          console.log(`🚪 ${username} joining existing room ${roomId} (host: ${room.hostUsername})`);
        }
      } catch (error) {
        console.log('⚠️ MongoDB not available, using in-memory room management');
        // Continue without database - use in-memory room management only
        room = { roomId }; // Minimal room object
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
      
      // Track this connection
      const userConnectionKey = `${roomId}:${socket.username}`;
      activeConnections.set(userConnectionKey, socket.id);
      userConnections.set(socket.id, { roomId, username: socket.username });
      
      // Initialize room in memory if not exists
      if (!activeRooms.has(roomId)) {
        activeRooms.set(roomId, {
          hostSocketId: null,
          hostUsername: null,
          users: new Map()
        });
      }

      const activeRoom = activeRooms.get(roomId);
      
      // Determine if this user should be host
      let shouldBeHost = false;
      
      if (isRoomCreator) {
        // This user created the room, they should be host
        shouldBeHost = true;
        activeRoom.hostSocketId = socket.id;
        activeRoom.hostUsername = socket.username;
      } else if (room.hostUsername && room.hostUsername === socket.username) {
        // This user is the original room creator reconnecting
        shouldBeHost = true;
        activeRoom.hostSocketId = socket.id;
        activeRoom.hostUsername = socket.username;
        console.log(`👑 ${socket.username} reconnected as original host`);
      } else if (activeRoom.hostUsername === socket.username) {
        // This user is the current host reconnecting (critical for rapid reconnects)
        shouldBeHost = true;
        activeRoom.hostSocketId = socket.id;
        activeRoom.hostUsername = socket.username;
        console.log(`👑 ${socket.username} reconnected as active room host`);
      } else if (!activeRoom.hostSocketId) {
        // Fallback: if no host exists in memory, first user becomes host
        shouldBeHost = true;
        activeRoom.hostSocketId = socket.id;
        activeRoom.hostUsername = socket.username;
        console.log(`👑 ${socket.username} became host (no existing host found)`);
      } else {
        // Room has an existing host, this user joins as regular user
        shouldBeHost = false;
        console.log(`👤 ${socket.username} joined as regular user (host is ${activeRoom.hostUsername})`);
      }
      
      // Check if user already exists (in case of reconnection)
      if (activeRoom.users.has(socket.id)) {
        console.log(`⚠️ User ${socket.username} already exists in room ${roomId}, updating...`);
      }

      activeRoom.users.set(socket.id, {
        username: socket.username,
        isHost: shouldBeHost
      });

      // Send host assignment FIRST and immediately
      if (shouldBeHost) {
        console.log(`👑 Assigning ${socket.username} as host for room ${roomId}`);
        socket.emit('host-assigned', { isHost: true });
        
        // Start sync interval for this room if not already started
        if (!syncIntervals.has(roomId)) {
          startSyncInterval(roomId, io);
        }
      } else {
        // Explicitly send non-host assignment
        console.log(`👤 Assigning ${socket.username} as regular user for room ${roomId}`);
        socket.emit('host-assigned', { isHost: false });
      }
      
      // Send current state to the new user AFTER host assignment
      // Note: We don't include isHost in sync-state as that's handled by host-assigned event
      const syncState = {
        videoUrl: room.currentVideoUrl,
        videoTitle: room.currentVideoTitle,
        time: room.lastKnownTime,
        isPlaying: room.lastKnownState
      };

      console.log(`📤 Sending sync state to ${socket.username}:`, syncState);
      
      // Add a small delay to ensure host-assigned is processed first
      setTimeout(() => {
        socket.emit('sync-state', syncState);
      }, 100);
      
      // If there's an active video, notify all users about the current state
      if (room.currentVideoUrl) {
        console.log(`📺 Broadcasting current video state to all users in room ${roomId}`);
        io.to(roomId).emit('server:sync-time', { time: room.lastKnownTime });
        
        // If video is playing, sync play state
        if (room.lastKnownState) {
          io.to(roomId).emit('server:play', { time: room.lastKnownTime });
        } else {
          io.to(roomId).emit('server:pause', { time: room.lastKnownTime });
        }
      }
      
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
        console.log('⚠️ Could not load existing messages (MongoDB unavailable)');
        // Continue without historical messages
      }
      
      // Notify other users about new participant FIRST
      console.log(`📢 Notifying existing users about ${socket.username} joining room ${roomId}`);
      socket.to(roomId).emit('user-joined', {
        username: socket.username,
        userId: socket.id
      });
      
      // Send updated user list to ALL users in the room (including the new joiner)
      const userList = Array.from(activeRoom.users.values());
      console.log(`👥 Broadcasting updated user list to ALL users in room ${roomId}:`, userList);
      console.log(`👥 Room has ${activeRoom.users.size} users total`);
      
      // Use io.to() to send to ALL users in the room
      io.to(roomId).emit('user-list-updated', userList);
      
      // Also emit to the new user specifically to ensure they get it
      socket.emit('user-list-updated', userList);
      
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
          isPlaying: room.lastKnownState
        });
      }
    } catch (error) {
      console.error('Error handling client:request-sync:', error);
    }
  });
  
  // Handle request for fresh user list
  socket.on('request-user-list', () => {
    if (socket.roomId) {
      const activeRoom = activeRooms.get(socket.roomId);
      if (activeRoom) {
        const userList = Array.from(activeRoom.users.values());
        console.log(`🔄 User list requested by ${socket.username}, sending ${userList.length} users`);
        socket.emit('user-list-updated', userList);
      }
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
    
    // Clean up connection tracking
    const userConnection = userConnections.get(socket.id);
    if (userConnection) {
      const connectionKey = `${userConnection.roomId}:${userConnection.username}`;
      activeConnections.delete(connectionKey);
      userConnections.delete(socket.id);
      console.log(`🧹 Cleaned up connection tracking for ${userConnection.username} in ${userConnection.roomId}`);
    }
    
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
        
        // Notify remaining users about the departure
        console.log(`📢 Notifying remaining users about ${socket.username || socket.id} leaving room ${socket.roomId}`);
        socket.to(socket.roomId).emit('user-left', {
          username: socket.username,
          userId: socket.id
        });
        
        // Send updated user list to ALL remaining users
        if (activeRoom.users.size > 0) {
          const userList = Array.from(activeRoom.users.values());
          console.log(`👥 Broadcasting updated user list after ${socket.username || socket.id} left room ${socket.roomId}:`, userList);
          console.log(`👥 Room now has ${activeRoom.users.size} users remaining`);
          io.to(socket.roomId).emit('user-list-updated', userList);
        } else {
          console.log(`🏠 Room ${socket.roomId} is now empty`);
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
