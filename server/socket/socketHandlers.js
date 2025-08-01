import { Room, Message } from '../models/index.js';

// Store active rooms and their sync intervals
const activeRooms = new Map();
const syncIntervals = new Map();

export const handleSocketConnection = (socket, io) => {
  // Handle room joining
  socket.on('join-room', async (data) => {
    try {
      const { roomId, username } = data;
      
      // Find the room in database
      const room = await Room.findOne({ roomId });
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
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
      socket.emit('sync-state', {
        videoId: room.currentVideoId,
        time: room.lastKnownTime,
        isPlaying: room.lastKnownState,
        isHost: activeRoom.hostSocketId === socket.id
      });
      
      // Notify other users about new participant
      socket.to(roomId).emit('user-joined', {
        username: socket.username,
        userId: socket.id
      });
      
      // Send updated user list
      const userList = Array.from(activeRoom.users.values());
      io.to(roomId).emit('user-list-updated', userList);
      
      console.log(`${socket.username} joined room ${roomId}`);
      
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
      const { videoId } = data;
      const room = await Room.findOne({ roomId: socket.roomId });
      if (room) {
        room.currentVideoId = videoId;
        room.lastKnownTime = 0;
        room.lastKnownState = false;
        await room.save();
      }
      
      io.to(socket.roomId).emit('server:change-video', { videoId });
      console.log(`Host ${socket.username} changed video to ${videoId}`);
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
          videoId: room.currentVideoId,
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
      const author = socket.username;
      const timestamp = new Date();
      
      // Save to database
      const chatMessage = new Message({
        roomId: socket.roomId,
        author,
        message,
        timestamp
      });
      await chatMessage.save();
      
      // Broadcast to all users in room
      io.to(socket.roomId).emit('new-chat-message', {
        author,
        message,
        timestamp
      });
      
    } catch (error) {
      console.error('Error handling chat message:', error);
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', async () => {
    console.log(`User disconnected: ${socket.id}`);
    
    if (socket.roomId) {
      const activeRoom = activeRooms.get(socket.roomId);
      if (activeRoom) {
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
            console.log(`New host assigned: ${newHostSocketId}`);
          } else {
            // No users left, clean up room
            activeRooms.delete(socket.roomId);
            if (syncIntervals.has(socket.roomId)) {
              clearInterval(syncIntervals.get(socket.roomId));
              syncIntervals.delete(socket.roomId);
            }
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
