import { io } from 'socket.io-client';

const URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

// Global connection state to prevent multiple connections
let globalSocket = null;
let connectionState = 'disconnected'; // 'disconnected', 'connecting', 'connected'

export const getSocket = () => {
  if (!globalSocket) {
    console.log('🔌 Creating new socket instance');
    globalSocket = io(URL, {
      autoConnect: false,
      transports: ['websocket', 'polling'], // Try websocket first, fallback to polling
      timeout: 60000, // Increase timeout to 60 seconds
      pingTimeout: 60000, // Increase ping timeout
      pingInterval: 25000, // Increase ping interval
      reconnection: true,
      reconnectionAttempts: 3, // Further reduce attempts to prevent rapid reconnections
      reconnectionDelay: 5000, // Increase initial delay to 5 seconds
      reconnectionDelayMax: 15000, // Increase max delay to 15 seconds
      randomizationFactor: 0.8, // Increase randomization to prevent thundering herd
      forceNew: false // Reuse connection if possible
    });

    // Track connection state
    globalSocket.on('connect', () => {
      connectionState = 'connected';
      console.log('🟢 Socket connected globally');
    });

    globalSocket.on('disconnect', () => {
      connectionState = 'disconnected';
      console.log('🔴 Socket disconnected globally');
    });

    globalSocket.on('connect_error', () => {
      connectionState = 'disconnected';
      console.log('❌ Socket connection error globally');
    });
  }
  
  return globalSocket;
};

export const connectSocket = () => {
  const socket = getSocket();
  if (connectionState === 'disconnected' && !socket.connected) {
    console.log('🔄 Connecting socket...');
    connectionState = 'connecting';
    socket.connect();
  } else if (connectionState === 'connected') {
    console.log('✅ Socket already connected');
  } else {
    console.log('⏳ Socket connection in progress...');
  }
  return socket;
};

export const disconnectSocket = () => {
  if (globalSocket && globalSocket.connected) {
    console.log('🔌 Disconnecting socket...');
    globalSocket.disconnect();
  }
};

// Backward compatibility
export const socket = getSocket();
