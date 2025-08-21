import { io } from 'socket.io-client';

const URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

export const socket = io(URL, {
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
