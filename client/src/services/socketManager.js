// Singleton socket connection manager to prevent duplicate connections
class SocketManager {
  constructor() {
    this.activeConnections = new Map(); // roomId -> connection info
    this.joinAttempts = new Map(); // roomId -> timestamp
  }

  canJoinRoom(roomId, username) {
    const now = Date.now();
    const lastAttempt = this.joinAttempts.get(roomId) || 0;
    const timeSinceLastAttempt = now - lastAttempt;
    
    // Prevent rapid join attempts (must be at least 5 seconds apart)
    if (timeSinceLastAttempt < 5000) {
      console.log(`🚫 SocketManager: Preventing rapid join for ${roomId}, only ${timeSinceLastAttempt}ms since last attempt`);
      return false;
    }
    
    // Check if already connected to this room
    const existingConnection = this.activeConnections.get(roomId);
    if (existingConnection && existingConnection.username === username) {
      console.log(`🚫 SocketManager: Already connected to room ${roomId} as ${username}`);
      return false;
    }
    
    return true;
  }

  recordJoinAttempt(roomId, username) {
    const now = Date.now();
    this.joinAttempts.set(roomId, now);
    this.activeConnections.set(roomId, { username, timestamp: now });
    console.log(`📝 SocketManager: Recorded join attempt for ${roomId} as ${username}`);
  }

  clearConnection(roomId) {
    this.activeConnections.delete(roomId);
    console.log(`🧹 SocketManager: Cleared connection for ${roomId}`);
  }

  getConnectionInfo(roomId) {
    return this.activeConnections.get(roomId);
  }
}

// Export singleton instance
export const socketManager = new SocketManager();
