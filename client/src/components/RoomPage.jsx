import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
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

    const handleConnect = () => {
      setIsConnected(true);
      socket.emit('join-room', { roomId, username });
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleSyncState = (data) => {
      const { videoUrl, videoTitle, time, isPlaying, isHost: hostStatus } = data;
      setIsHost(hostStatus);
      
      if (videoUrl && videoUrl !== currentVideoUrl) {
        setCurrentVideoUrl(videoUrl);
        setCurrentVideoTitle(videoTitle);
      }
      
      if (videoPlayerRef.current && time !== null) {
        const currentTime = videoPlayerRef.current.getCurrentTime();
        const timeDiff = Math.abs(currentTime - time);
        
        if (timeDiff > syncTolerance) {
          ignoreNextStateChange.current = true;
          videoPlayerRef.current.seekTo(time);
        }
      }
      
      if (videoPlayerRef.current && isPlaying !== null) {
        ignoreNextStateChange.current = true;
        if (isPlaying) {
          videoPlayerRef.current.play();
        } else {
          videoPlayerRef.current.pause();
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
      console.log(`${data.username} joined the room`);
    };

    const handleUserLeft = (data) => {
      console.log(`${data.username} left the room`);
    };

    const handleUserListUpdated = (userList) => {
      setUsers(userList);
    };

    const handleNewChatMessage = (message) => {
      setMessages(prev => [...prev, message]);
    };

    const handleError = (error) => {
      console.error('Socket error:', error);
      alert(error.message);
    };

    // Register event listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
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
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
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
    if (socket && message.trim()) {
      socket.emit('chat-message', { message: message.trim() });
    }
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
