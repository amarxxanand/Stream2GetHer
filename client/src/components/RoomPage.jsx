import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { connectSocket } from '../socket';
import { socketManager } from '../services/socketManager';
import { componentRegistry } from '../services/componentRegistry';
import VideoPlayer from './VideoPlayer';
import VideoControls from './VideoControls';
import Chat from './Chat';
import UserList from './UserList';
import { Home, Copy, Check } from 'lucide-react';
import styles from './RoomPage.module.css';

// Global component instance manager to prevent multiple instances
const componentInstances = new Map();
const componentStates = new Map();
const persistentComponents = new Map();

// Global username manager to ensure stable usernames
if (!window.userManager) {
  window.userManager = {
    usernames: new Map(),
    getUsernameForRoom: (roomId, searchParamsUsername) => {
      if (searchParamsUsername) {
        return searchParamsUsername;
      }
      
      const key = `room-${roomId}`;
      if (!window.userManager.usernames.has(key)) {
        const newUsername = `User-${Math.random().toString(36).substr(2, 6)}`;
        window.userManager.usernames.set(key, newUsername);
        console.log(`🎭 Generated stable username ${newUsername} for room ${roomId}`);
      }
      return window.userManager.usernames.get(key);
    },
    clearRoom: (roomId) => {
      const key = `room-${roomId}`;
      window.userManager.usernames.delete(key);
    }
  };
}

// Global window-level protection against multiple instances
if (!window.roomPageManager) {
  window.roomPageManager = {
    activeRooms: new Set(),
    mountCounts: new Map(),
    isRoomActive: (roomKey) => window.roomPageManager.activeRooms.has(roomKey),
    registerRoom: (roomKey) => {
      const count = window.roomPageManager.mountCounts.get(roomKey) || 0;
      window.roomPageManager.mountCounts.set(roomKey, count + 1);
      window.roomPageManager.activeRooms.add(roomKey);
      console.log(`🔢 Room ${roomKey} mount count: ${count + 1}`);
      return count === 0; // Only allow the first mount
    },
    unregisterRoom: (roomKey) => {
      const count = window.roomPageManager.mountCounts.get(roomKey) || 1;
      if (count <= 1) {
        window.roomPageManager.activeRooms.delete(roomKey);
        window.roomPageManager.mountCounts.delete(roomKey);
        console.log(`🗑️ Room ${roomKey} fully cleaned up`);
      } else {
        window.roomPageManager.mountCounts.set(roomKey, count - 1);
        console.log(`🔢 Room ${roomKey} mount count decreased to: ${count - 1}`);
      }
    }
  };
}

const RoomPage = React.memo(() => {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const socket = useSocket();
  
  // Use stable username generation
  const username = window.userManager.getUsernameForRoom(roomId, searchParams.get('username'));

  // Create a stable component key for this exact room-username combination
  const componentKey = `${roomId}-${username}`;
  
  console.log(`🏗️ RoomPage component rendering for ${componentKey}`);

  const [isHost, setIsHost] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState(null);
  const [currentVideoTitle, setCurrentVideoTitle] = useState(null);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [roomInfo, setRoomInfo] = useState(null);
  const [syncTolerance] = useState(1.5); // seconds
  const [copied, setCopied] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  
  const ignoreNextStateChange = useRef(false);
  const lastSyncTime = useRef(0);
  const videoPlayerRef = useRef(null);
  
  // Simplified join state tracking
  const hasJoinedRoomRef = useRef(false);

  // Video player event handlers
  const onVideoStateChange = useCallback((event) => {
    if (ignoreNextStateChange.current) {
      ignoreNextStateChange.current = false;
      return;
    }

    if (!isHost || !socket || !isConnected) return;

    const { type, currentTime } = event;

    switch (type) {
      case 'play':
        socket.emit('host:play', { time: currentTime });
        break;
      case 'pause':
        socket.emit('host:pause', { time: currentTime });
        break;
      case 'seek':
        socket.emit('host:seek', { time: currentTime });
        break;
      default:
        break;
    }
  }, [isHost, socket, isConnected]);

  const onVideoReady = useCallback(() => {
    console.log('Video player is ready');
    setIsVideoReady(true);
  }, []);

  // Load video handler
  const handleLoadVideo = useCallback((videoUrl, videoTitle) => {
    if (!isHost) return;
    
    setCurrentVideoUrl(videoUrl);
    setCurrentVideoTitle(videoTitle);
    
    if (socket) {
      socket.emit('host:change-video', { videoUrl, videoTitle });
    }
  }, [isHost, socket]);

  // Socket connection and event handlers with enhanced protection
  useEffect(() => {
    // Create a component key based on roomId and username
    const componentKey = `${roomId}-${username}`;
    
    // Check component registry first - this is the most reliable protection
    if (!componentRegistry.canMount(componentKey)) {
      console.log(`🚫 ComponentRegistry: Mount blocked for ${componentKey}`);
      
      // Return a cleanup function that does nothing
      return () => {
        console.log(`🔄 Blocked mount cleanup for ${componentKey}`);
      };
    }
    
    // Create instance ID and register with component registry
    const instanceId = Math.random().toString(36).substr(2, 9);
    if (!componentRegistry.register(componentKey, instanceId)) {
      console.log(`🚫 ComponentRegistry: Registration failed for ${componentKey}`);
      return () => {
        console.log(`� Failed registration cleanup for ${componentKey}`);
      };
    }
    
    console.log(`🆔 RoomPage instance ${instanceId} successfully registered for ${componentKey} (attempt #${componentRegistry.getMountAttempts(componentKey)})`);
    
    // CRITICAL: Register in legacy componentInstances map for join logic compatibility
    componentInstances.set(componentKey, instanceId);
    
    // Additional window-level protection
    const isFirstMount = window.roomPageManager.registerRoom(componentKey);
    if (!isFirstMount) {
      console.log(`� Window-level: Room ${componentKey} already has an active mount`);
      componentRegistry.unregister(componentKey);
      return () => {
        console.log(`🔄 Window-blocked mount cleanup for ${componentKey}`);
        window.roomPageManager.unregisterRoom(componentKey);
      };
    }
    
    // Use singleton socket connection
    const socket = connectSocket();
    
    let hasJoinedRoom = false;
    let connectionTimeout = null;

    const updateSharedState = () => {
      componentStates.set(componentKey, {
        isConnected,
        users,
        messages,
        isHost,
        currentVideoUrl,
        currentVideoTitle
      });
    };

    const handleConnect = () => {
      setIsConnected(true);
      updateSharedState();
      
      // Prevent multiple joins from the same component instance
      if (hasJoinedRoom) {
        console.log(`✅ Instance ${instanceId} already joined, skipping duplicate connect`);
        return;
      }
      
      // Use singleton socket manager to prevent duplicate connections
      if (!socketManager.canJoinRoom(roomId, username)) {
        console.log(`🚫 Instance ${instanceId} blocked by SocketManager - will retry in 3 seconds`);
        
        // Retry after delay, but only if this is still the primary instance
        setTimeout(() => {
          if (socket.connected && !hasJoinedRoom && componentInstances.get(componentKey) === instanceId) {
            console.log(`🔄 Instance ${instanceId} retrying join after delay`);
            handleConnect();
          }
        }, 3000);
        return;
      }
      
      // Clear any existing connection timeout
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
      }
      
      // Record this join attempt in the singleton manager
      socketManager.recordJoinAttempt(roomId, username);
      
      // Join with a small delay to ensure socket is ready
      connectionTimeout = setTimeout(() => {
        if (socket.connected && !hasJoinedRoom && componentInstances.get(componentKey) === instanceId) {
          console.log(`🚪 Instance ${instanceId} joining room: ${roomId} as ${username}`);
          socket.emit('join-room', { roomId, username });
          hasJoinedRoom = true;
          hasJoinedRoomRef.current = true;
          
          // Request user list after join
          setTimeout(() => {
            if (socket.connected && componentInstances.get(componentKey) === instanceId) {
              console.log(`🔄 Instance ${instanceId} requesting user list`);
              socket.emit('request-user-list');
            }
          }, 1000);
        }
      }, 1000);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      updateSharedState();
      hasJoinedRoom = false;
      hasJoinedRoomRef.current = false;
      
      // Only clear connection if this is the primary instance
      if (componentInstances.get(componentKey) === instanceId) {
        socketManager.clearConnection(roomId, username);
      }
      
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
        connectionTimeout = null;
      }
    };

    const handleSyncState = (data) => {
      const { videoUrl, videoTitle, time, isPlaying, isHost: hostStatus } = data;
      console.log('🔄 Received sync state:', data);
      
      // Mark that we successfully joined the room - this confirms server accepted our join
      hasJoinedRoom = true;
      hasJoinedRoomRef.current = true;
      console.log(`✅ Instance ${instanceId} confirmed joined room successfully`);
      
      setIsHost(hostStatus);
      updateSharedState();
      
      if (videoUrl && videoUrl !== currentVideoUrl) {
        console.log('📺 Setting video URL:', videoUrl);
        setCurrentVideoUrl(videoUrl);
        setCurrentVideoTitle(videoTitle);
        updateSharedState();
      }
      
      // Wait for video to be ready before applying time/play state
      if (videoPlayerRef.current && time !== null && time !== undefined) {
        const applyTimeAndPlayState = () => {
          const currentTime = videoPlayerRef.current.getCurrentTime();
          const timeDiff = Math.abs(currentTime - time);
          
          console.log(`⏰ Syncing time: current=${currentTime}, target=${time}, diff=${timeDiff}`);
          
          if (timeDiff > syncTolerance) {
            ignoreNextStateChange.current = true;
            videoPlayerRef.current.seekTo(time);
          }
          
          if (isPlaying !== null && isPlaying !== undefined) {
            console.log(`▶️ Syncing play state: ${isPlaying}`);
            ignoreNextStateChange.current = true;
            if (isPlaying) {
              videoPlayerRef.current.play();
            } else {
              videoPlayerRef.current.pause();
            }
          }
        };
        
        // Apply immediately if video is ready, otherwise wait a bit
        if (videoPlayerRef.current.getVideoInfo) {
          applyTimeAndPlayState();
        } else {
          setTimeout(applyTimeAndPlayState, 2000);
        }
      }
    };

    const handleHostAssigned = (data) => {
      setIsHost(data.isHost);
    };

    const handleServerPlay = (data) => {
      const { time } = data;
      
      if (videoPlayerRef.current) {
        const currentTime = videoPlayerRef.current.getCurrentTime();
        const timeDiff = Math.abs(currentTime - time);
        
        if (timeDiff > syncTolerance) {
          videoPlayerRef.current.seekTo(time);
        }
        
        ignoreNextStateChange.current = true;
        videoPlayerRef.current.play();
      }
    };

    const handleServerPause = (data) => {
      const { time } = data;
      
      if (videoPlayerRef.current) {
        const currentTime = videoPlayerRef.current.getCurrentTime();
        const timeDiff = Math.abs(currentTime - time);
        
        if (timeDiff > syncTolerance) {
          videoPlayerRef.current.seekTo(time);
        }
        
        ignoreNextStateChange.current = true;
        videoPlayerRef.current.pause();
      }
    };

    const handleServerSeek = (data) => {
      const { time } = data;
      if (videoPlayerRef.current) {
        ignoreNextStateChange.current = true;
        videoPlayerRef.current.seekTo(time);
      }
    };

    const handleServerChangeVideo = (data) => {
      const { videoUrl, videoTitle } = data;
      setCurrentVideoUrl(videoUrl);
      setCurrentVideoTitle(videoTitle);
    };

    const handleServerSyncTime = (data) => {
      const { time: authoritativeTime } = data;
      
      if (videoPlayerRef.current) {
        const currentTime = videoPlayerRef.current.getCurrentTime();
        const timeDiff = Math.abs(currentTime - authoritativeTime);
        
        if (timeDiff > syncTolerance) {
          ignoreNextStateChange.current = true;
          videoPlayerRef.current.seekTo(authoritativeTime);
        }
      }
      
      lastSyncTime.current = Date.now();
    };

    const handleRequestHostTime = () => {
      if (isHost && videoPlayerRef.current) {
        const currentTime = videoPlayerRef.current.getCurrentTime();
        socket.emit('host:report-time', { time: currentTime });
      }
    };

    const handleUserJoined = (data) => {
      console.log(`👋 ${data.username} joined the room`);
      // Note: User list will be updated via separate user-list-updated event
    };

    const handleUserLeft = (data) => {
      console.log(`👋 ${data.username} left the room`);
      // Note: User list will be updated via separate user-list-updated event
    };

    const handleUserListUpdated = (userList) => {
      console.log(`👥 User list updated - received ${userList?.length || 0} users:`, userList);
      if (Array.isArray(userList)) {
        setUsers(userList);
        updateSharedState();
        console.log(`✅ User list state updated with ${userList.length} users`);
      } else {
        console.error('❌ Invalid user list received:', userList);
      }
    };

    const handleNewChatMessage = (message) => {
      console.log('💬 New chat message:', message);
      if (message && message.message && message.author) {
        setMessages(prev => {
          const newMessages = [...prev, message];
          // Update shared state with new messages
          const currentSharedState = componentStates.get(componentKey) || {};
          componentStates.set(componentKey, {
            ...currentSharedState,
            messages: newMessages
          });
          return newMessages;
        });
      } else {
        console.error('❌ Invalid chat message format:', message);
      }
    };

    const handleError = (error) => {
      console.error('🚨 Socket error:', error);
      alert(`Connection Error: ${error.message}`);
    };

    // Add connection status logging
    const handleConnectError = (error) => {
      console.error('🚨 Connection error:', error);
    };

    const handleReconnect = (attemptNumber) => {
      console.log(`🔄 Reconnecting... attempt ${attemptNumber}`);
    };

    // Register event listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('reconnect', handleReconnect);
    socket.on('sync-state', handleSyncState);
    socket.on('host-assigned', handleHostAssigned);
    socket.on('server:play', handleServerPlay);
    socket.on('server:pause', handleServerPause);
    socket.on('server:seek', handleServerSeek);
    socket.on('server:change-video', handleServerChangeVideo);
    socket.on('server:sync-time', handleServerSyncTime);
    socket.on('server:request-host-time', handleRequestHostTime);
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);
    socket.on('user-list-updated', handleUserListUpdated);
    socket.on('new-chat-message', handleNewChatMessage);
    socket.on('error', handleError);

    // Connect if not already connected
    if (!socket.connected) {
      console.log(`🔄 Instance ${instanceId} initiating connection`);
      socket.connect();
    } else {
      console.log(`✅ Instance ${instanceId} using existing connection`);
      // Trigger connect handler if already connected
      handleConnect();
    }

    return () => {
      console.log(`🧹 Instance ${instanceId} cleaning up for ${componentKey}`);
      
      // Always unregister from component registry first
      const wasRegistered = componentRegistry.unregister(componentKey);
      
      // Only do full cleanup if this was the registered instance
      if (wasRegistered) {
        console.log(`🔥 Primary instance ${instanceId} for ${componentKey} cleaning up - clearing all state`);
        
        // Clear any pending connection timeout
        if (connectionTimeout) {
          clearTimeout(connectionTimeout);
          connectionTimeout = null;
        }
        
        // Clear singleton manager state on cleanup
        socketManager.clearConnection(roomId, username);
        
        // Clear component instance tracking
        componentInstances.delete(componentKey);
        componentStates.delete(componentKey);
        
        // Clear window-level protection
        window.roomPageManager.unregisterRoom(componentKey);
        
        // Clear stable username for this room (only if no searchParams username)
        if (!searchParams.get('username')) {
          window.userManager.clearRoom(roomId);
        }
        
        // Reset local state
        hasJoinedRoom = false;
        hasJoinedRoomRef.current = false;

        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
        socket.off('connect_error', handleConnectError);
        socket.off('reconnect', handleReconnect);
        socket.off('sync-state', handleSyncState);
        socket.off('host-assigned', handleHostAssigned);
        socket.off('server:play', handleServerPlay);
        socket.off('server:pause', handleServerPause);
        socket.off('server:seek', handleServerSeek);
        socket.off('server:change-video', handleServerChangeVideo);
        socket.off('server:sync-time', handleServerSyncTime);
        socket.off('server:request-host-time', handleRequestHostTime);
        socket.off('user-joined', handleUserJoined);
        socket.off('user-left', handleUserLeft);
        socket.off('user-list-updated', handleUserListUpdated);
        socket.off('new-chat-message', handleNewChatMessage);
        socket.off('error', handleError);
      } else {
        console.log(`🔄 Secondary/blocked instance ${instanceId} for ${componentKey} cleaning up - no state to clear`);
        // Still clear window protection for blocked instances
        window.roomPageManager.unregisterRoom(componentKey);
      }
      
      // Don't disconnect the socket here as other components might be using it
      // The singleton socket will handle its own lifecycle
    };
  }, [socket, roomId, username, isHost, currentVideoUrl, syncTolerance]);

  // Handle buffering recovery for video player
  useEffect(() => {
    if (!socket || !isConnected) return;

    const checkBuffering = () => {
      // Request resync if we haven't received updates for a while
      const timeSinceLastSync = Date.now() - lastSyncTime.current;
      if (timeSinceLastSync > 10000) { // 10 seconds since last sync
        socket.emit('client:request-sync');
        lastSyncTime.current = Date.now();
      }
    };

    const interval = setInterval(checkBuffering, 2000);
    return () => clearInterval(interval);
  }, [socket, isConnected]);

  // Copy room link
  const copyRoomLink = () => {
    const roomLink = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(roomLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Send chat message
  const sendMessage = (message) => {
    if (!socket) {
      console.error('❌ Socket not available for sending message');
      return;
    }
    
    if (!socket.connected) {
      console.error('❌ Socket not connected for sending message');
      return;
    }
    
    if (!message || !message.trim()) {
      console.error('❌ Empty message cannot be sent');
      return;
    }
    
    console.log('💬 Sending message:', message.trim());
    socket.emit('chat-message', { message: message.trim() });
  };

  if (!roomId) {
    return <div>Invalid room</div>;
  }

  return (
    <div className={styles.roomPage}>
      <header className={styles.roomHeader}>
        <div className={styles.headerLeft}>
          <button onClick={() => navigate('/')} className={styles.homeButton}>
            <Home size={20} />
            Home
          </button>
          <div className={styles.roomInfo}>
            <h1>Room: {roomId}</h1>
            {isHost && <span className={styles.hostBadge}>HOST</span>}
          </div>
        </div>
        <div className={styles.headerRight}>
          <button onClick={copyRoomLink} className={styles.copyButton}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
          <div className={styles.connectionStatus}>
            <div className={`${styles.statusIndicator} ${isConnected ? styles.connected : styles.disconnected}`} />
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
      </header>

      <div className={styles.roomContent}>
        <div className={styles.videoSection}>
          <div className={styles.videoContainer}>
            <VideoPlayer
              ref={videoPlayerRef}
              videoUrl={currentVideoUrl}
              isHost={isHost}
              onStateChange={onVideoStateChange}
              onReady={onVideoReady}
              className="main-video-player"
            />
            {!currentVideoUrl && (
              <div className={styles.noVideoPlaceholder}>
                <p>No video loaded</p>
                {isHost && <p>Load a Google Drive video to get started!</p>}
              </div>
            )}
          </div>
          {isHost && (
            <VideoControls
              onLoadVideo={handleLoadVideo}
              currentVideoUrl={currentVideoUrl}
              currentVideoTitle={currentVideoTitle}
              isPlayerReady={isVideoReady}
            />
          )}
        </div>

        <div className={styles.sidebar}>
          <UserList users={users} currentUsername={username} />
          <Chat
            messages={messages}
            onSendMessage={sendMessage}
            username={username}
          />
        </div>
      </div>
    </div>
  );
});

export default RoomPage;
