// Singleton socket connection manager to prevent duplicate connections
class SocketManager {
  constructor() {
    this.activeConnections = new Map(); // roomId -> connection info
    this.joinAttempts = new Map(); // roomId -> timestamp
  }

  canJoinRoom(roomId, username) {
    const now = Date.now();
    const connectionKey = `${roomId}:${username}`;
    const lastAttempt = this.joinAttempts.get(connectionKey) || 0;
    const timeSinceLastAttempt = now - lastAttempt;
    
    // Check if already connected to this room with this username
    const existingConnection = this.activeConnections.get(connectionKey);
    if (existingConnection) {
      console.log(`🚫 SocketManager: Already connected to room ${roomId} as ${username}`);
      return false;
    }
    
    // Prevent rapid join attempts (must be at least 2 seconds apart, reduced from 5)
    if (timeSinceLastAttempt < 2000) {
      console.log(`🚫 SocketManager: Preventing rapid join for ${roomId}, only ${timeSinceLastAttempt}ms since last attempt`);
      return false;
    }
    
    return true;
  }

  recordJoinAttempt(roomId, username) {
    const now = Date.now();
    const connectionKey = `${roomId}:${username}`;
    this.joinAttempts.set(connectionKey, now);
    this.activeConnections.set(connectionKey, { username, timestamp: now });
    console.log(`📝 SocketManager: Recorded join attempt for ${roomId} as ${username}`);
  }

  clearConnection(roomId, username) {
    const connectionKey = `${roomId}:${username}`;
    this.activeConnections.delete(connectionKey);
    console.log(`🧹 SocketManager: Cleared connection for ${roomId} as ${username}`);
  }

  getConnectionInfo(roomId, username) {
    const connectionKey = `${roomId}:${username}`;
    return this.activeConnections.get(connectionKey);
  }
}

// Export singleton instance
export const socketManager = new SocketManager();
