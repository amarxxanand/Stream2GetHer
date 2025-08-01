import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { useYouTubePlayer } from '../hooks/useYouTubePlayer';
import VideoControls from './VideoControls';
import Chat from './Chat';
import UserList from './UserList';
import { Home, Copy, Check } from 'lucide-react';

const RoomPage = () => {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const socket = useSocket();
  const username = searchParams.get('username') || `User-${Math.random().toString(36).substr(2, 6)}`;

  const [isHost, setIsHost] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState(null);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [roomInfo, setRoomInfo] = useState(null);
  const [syncTolerance] = useState(1.5); // seconds
  const [copied, setCopied] = useState(false);
  
  const ignoreNextStateChange = useRef(false);
  const lastSyncTime = useRef(0);

  // YouTube player integration
  const onPlayerStateChange = useCallback((event) => {
    if (ignoreNextStateChange.current) {
      ignoreNextStateChange.current = false;
      return;
    }

    if (!isHost || !socket || !isConnected) return;

    const currentTime = getCurrentTime();
    const state = event.data;
    const { PLAYER_STATES } = useYouTubePlayer();

    switch (state) {
      case PLAYER_STATES.PLAYING:
        socket.emit('host:play', { time: currentTime });
        break;
      case PLAYER_STATES.PAUSED:
        socket.emit('host:pause', { time: currentTime });
        break;
      case PLAYER_STATES.BUFFERING:
        // Handle buffering - client will request resync when ready
        break;
      default:
        break;
    }
  }, [isHost, socket, isConnected]);

  const onPlayerReady = useCallback(() => {
    console.log('YouTube player is ready');
  }, []);

  const {
    isReady,
    play,
    pause,
    seekTo,
    loadVideoById,
    getCurrentTime,
    getPlayerState,
    PLAYER_STATES
  } = useYouTubePlayer('youtube-player', onPlayerStateChange, onPlayerReady);

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
      const { videoId, time, isPlaying, isHost: hostStatus } = data;
      setIsHost(hostStatus);
      
      if (videoId && videoId !== currentVideoId) {
        setCurrentVideoId(videoId);
        loadVideoById(videoId, time);
      } else if (time !== null) {
        const currentTime = getCurrentTime();
        const timeDiff = Math.abs(currentTime - time);
        
        if (timeDiff > syncTolerance) {
          ignoreNextStateChange.current = true;
          seekTo(time);
        }
      }
      
      if (isPlaying !== null) {
        ignoreNextStateChange.current = true;
        if (isPlaying) {
          play();
        } else {
          pause();
        }
      }
    };

    const handleHostAssigned = (data) => {
      setIsHost(data.isHost);
    };

    const handleServerPlay = (data) => {
      const { time } = data;
      const currentTime = getCurrentTime();
      const timeDiff = Math.abs(currentTime - time);
      
      if (timeDiff > syncTolerance) {
        seekTo(time);
      }
      
      ignoreNextStateChange.current = true;
      play();
    };

    const handleServerPause = (data) => {
      const { time } = data;
      const currentTime = getCurrentTime();
      const timeDiff = Math.abs(currentTime - time);
      
      if (timeDiff > syncTolerance) {
        seekTo(time);
      }
      
      ignoreNextStateChange.current = true;
      pause();
    };

    const handleServerSeek = (data) => {
      const { time } = data;
      ignoreNextStateChange.current = true;
      seekTo(time);
    };

    const handleServerChangeVideo = (data) => {
      const { videoId } = data;
      setCurrentVideoId(videoId);
      loadVideoById(videoId, 0);
    };

    const handleServerSyncTime = (data) => {
      const { time: authoritativeTime } = data;
      const currentTime = getCurrentTime();
      const timeDiff = Math.abs(currentTime - authoritativeTime);
      
      if (timeDiff > syncTolerance) {
        ignoreNextStateChange.current = true;
        seekTo(authoritativeTime);
      }
      
      lastSyncTime.current = Date.now();
    };

    const handleRequestHostTime = () => {
      if (isHost) {
        const currentTime = getCurrentTime();
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
  }, [socket, roomId, username, isHost, getCurrentTime, play, pause, seekTo, loadVideoById, currentVideoId, syncTolerance]);

  // Handle buffering recovery
  useEffect(() => {
    if (!socket || !isConnected) return;

    const checkBuffering = () => {
      const state = getPlayerState();
      if (state === PLAYER_STATES.PLAYING && lastSyncTime.current > 0) {
        // Check if we need to resync after buffering
        const timeSinceLastSync = Date.now() - lastSyncTime.current;
        if (timeSinceLastSync > 5000) { // 5 seconds since last sync
          socket.emit('client:request-sync');
        }
      }
    };

    const interval = setInterval(checkBuffering, 2000);
    return () => clearInterval(interval);
  }, [socket, isConnected, getPlayerState, PLAYER_STATES.PLAYING]);

  // Load video function for host
  const handleLoadVideo = (videoId) => {
    if (!isHost || !socket) return;
    
    setCurrentVideoId(videoId);
    loadVideoById(videoId, 0);
    socket.emit('host:change-video', { videoId });
  };

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
    <div className="room-page">
      <header className="room-header">
        <div className="header-left">
          <button onClick={() => navigate('/')} className="home-button">
            <Home size={20} />
            Home
          </button>
          <div className="room-info">
            <h1>Room: {roomId}</h1>
            {isHost && <span className="host-badge">HOST</span>}
          </div>
        </div>
        <div className="header-right">
          <button onClick={copyRoomLink} className="copy-button">
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
          <div className="connection-status">
            <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`} />
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
      </header>

      <div className="room-content">
        <div className="video-section">
          <div className="video-container">
            <div id="youtube-player" className="youtube-player" />
            {!currentVideoId && (
              <div className="no-video-placeholder">
                <p>No video loaded</p>
                {isHost && <p>Load a YouTube video to get started!</p>}
              </div>
            )}
          </div>
          {isHost && (
            <VideoControls
              onLoadVideo={handleLoadVideo}
              currentVideoId={currentVideoId}
              isPlayerReady={isReady}
            />
          )}
        </div>

        <div className="sidebar">
          <UserList users={users} currentUsername={username} />
          <Chat
            messages={messages}
            onSendMessage={sendMessage}
            username={username}
          />
        </div>
      </div>

      <style jsx>{`
        .room-page {
          min-height: 100vh;
          background: #f8fafc;
          display: flex;
          flex-direction: column;
        }

        .room-header {
          background: white;
          border-bottom: 1px solid #e2e8f0;
          padding: 16px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .home-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: #f1f5f9;
          border: none;
          border-radius: 8px;
          color: #475569;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .home-button:hover {
          background: #e2e8f0;
        }

        .room-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .room-info h1 {
          font-size: 1.5rem;
          font-weight: 600;
          color: #1e293b;
          margin: 0;
        }

        .host-badge {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .copy-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .copy-button:hover {
          background: #5a67d8;
        }

        .connection-status {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.9rem;
          color: #64748b;
        }

        .status-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .status-indicator.connected {
          background: #10b981;
        }

        .status-indicator.disconnected {
          background: #ef4444;
        }

        .room-content {
          flex: 1;
          display: grid;
          grid-template-columns: 1fr 350px;
          gap: 24px;
          padding: 24px;
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
        }

        .video-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .video-container {
          position: relative;
          background: #000;
          border-radius: 12px;
          overflow: hidden;
          aspect-ratio: 16/9;
        }

        .youtube-player {
          width: 100%;
          height: 100%;
        }

        .no-video-placeholder {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: white;
          text-align: center;
          background: rgba(0, 0, 0, 0.8);
        }

        .no-video-placeholder p {
          margin: 4px 0;
          font-size: 1.1rem;
        }

        .sidebar {
          display: flex;
          flex-direction: column;
          gap: 16px;
          height: fit-content;
        }

        @media (max-width: 1024px) {
          .room-content {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .sidebar {
            order: -1;
          }
        }

        @media (max-width: 768px) {
          .room-header {
            flex-direction: column;
            gap: 12px;
            align-items: flex-start;
          }

          .header-right {
            width: 100%;
            justify-content: space-between;
          }

          .room-content {
            padding: 16px;
          }
        }
      `}</style>
    </div>
  );
};

export default RoomPage;
