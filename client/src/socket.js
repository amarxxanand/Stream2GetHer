import { io } from 'socket.io-client';

const URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

export const socket = io(URL, {
  autoConnect: false,
  transports: ['websocket', 'polling'], // Try websocket first, fallback to polling
  timeout: 60000, // Increase timeout to 60 seconds
  pingTimeout: 60000, // Increase ping timeout
  pingInterval: 25000, // Increase ping interval
  reconnection: true,
  reconnectionAttempts: 5, // Reduce attempts to prevent rapid reconnections
  reconnectionDelay: 2000, // Increase initial delay
  reconnectionDelayMax: 10000, // Increase max delay
  randomizationFactor: 0.5, // Add randomization to prevent thundering herd
  forceNew: false // Reuse connection if possible
});
