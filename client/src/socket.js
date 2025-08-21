import { io } from 'socket.io-client';

const URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

export const socket = io(URL, {
  autoConnect: false,
  transports: ['polling', 'websocket'], // Prioritize polling for Vercel compatibility
  timeout: 60000, // Increase timeout to 60 seconds
  pingTimeout: 60000, // Increase ping timeout
  pingInterval: 25000, // Increase ping interval
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000
});
