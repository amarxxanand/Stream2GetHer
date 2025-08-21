import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { socketManager } from '../services/socketManager';
import VideoPlayer from './VideoPlayer';
import VideoControls from './VideoControls';
import Chat from './Chat';
import UserList from './UserList';
import { Home, Copy, Check } from 'lucide-react';
import styles from './RoomPage.module.css';

const RoomPage = () => {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const socket = useSocket();
  const username = searchParams.get('username') || `User-${Math.random().toString(36).substr(2, 6)}`;

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

  // Socket connection and event handlers
  useEffect(() => {
    if (!socket) return;

    // Create a unique instance ID for this component instance
    const instanceId = Math.random().toString(36).substr(2, 9);
    let connectionTimeout = null;
    let hasConnected = false;

    const handleConnect = () => {
      setIsConnected(true);
      
      // If we already successfully joined, don't try again
      if (hasJoinedRoomRef.current) {
        console.log(`✅ Instance ${instanceId} already joined, skipping duplicate connect`);
        return;
      }
      
      // Use singleton socket manager to prevent duplicate connections
      if (!socketManager.canJoinRoom(roomId, username)) {
        console.log(`🚫 Instance ${instanceId} blocked by SocketManager - will retry in 2.5 seconds`);
        
        // Retry after a short delay if blocked (only if we haven't joined yet)
        setTimeout(() => {
          if (socket.connected && !hasJoinedRoomRef.current) {
            console.log(`🔄 Instance ${instanceId} retrying join after delay`);
            handleConnect();
          }
        }, 2500);
        return;
      }
      
      hasConnected = true;
      
      // Clear any existing connection timeout
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
      }
      
      // Record this join attempt in the singleton manager
      socketManager.recordJoinAttempt(roomId, username);
      
      // Delay join to ensure socket is fully ready
      connectionTimeout = setTimeout(() => {
        if (socket.connected && !hasJoinedRoomRef.current) {
          console.log(`🚪 Instance ${instanceId} joining room: ${roomId} as ${username}`);
          socket.emit('join-room', { roomId, username });
          
          // Request user list after join
          setTimeout(() => {
            if (socket.connected) {
              console.log(`🔄 Instance ${instanceId} requesting user list`);
              socket.emit('request-user-list');
            }
          }, 1000);
        }
      }, 500); // Reduced delay
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      hasConnected = false;
      hasJoinedRoomRef.current = false;
      
      // Clear singleton manager state
      socketManager.clearConnection(roomId, username);
      
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
        connectionTimeout = null;
      }
    };

    const handleSyncState = (data) => {
      const { videoUrl, videoTitle, time, isPlaying, isHost: hostStatus } = data;
      console.log('🔄 Received sync state:', data);
      
      // Mark that we successfully joined the room - this confirms server accepted our join
      hasJoinedRoomRef.current = true;
      console.log(`✅ Instance ${instanceId} confirmed joined room successfully`);
      
      setIsHost(hostStatus);
      
      if (videoUrl && videoUrl !== currentVideoUrl) {
        console.log('📺 Setting video URL:', videoUrl);
        setCurrentVideoUrl(videoUrl);
        setCurrentVideoTitle(videoTitle);
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
        console.log(`✅ User list state updated with ${userList.length} users`);
      } else {
        console.error('❌ Invalid user list received:', userList);
      }
    };

    const handleNewChatMessage = (message) => {
      console.log('💬 New chat message:', message);
      if (message && message.message && message.author) {
        setMessages(prev => [...prev, message]);
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

    socket.connect();

    return () => {
      // Clear any pending connection timeout
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
        connectionTimeout = null;
      }
      
      // Clear singleton manager state on cleanup
      socketManager.clearConnection(roomId, username);
      
      // Reset local state
      hasConnected = false;
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
      socket.disconnect();
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
};

export default RoomPage;
