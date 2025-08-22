import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Users, Video } from 'lucide-react';
import styles from './HomePage.module.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const HomePage = () => {
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const navigate = useNavigate();

  const createRoom = async () => {
    if (!username.trim()) {
      alert('Please enter a username');
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoUrl: '',
          videoTitle: ''
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create room');
      }

      const data = await response.json();
      navigate(`/room/${data.roomId}?username=${encodeURIComponent(username.trim())}`);
    } catch (error) {
      console.error('Error creating room:', error);
      alert('Failed to create room. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const joinRoom = async () => {
    if (!roomId.trim()) {
      alert('Please enter a room ID');
      return;
    }
    if (!username.trim()) {
      alert('Please enter a username');
      return;
    }

    setIsJoining(true);
    try {
      const response = await fetch(`${API_BASE_URL}/rooms/${roomId.trim()}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          alert('Room not found. Please check the room ID.');
        } else {
          alert('Failed to join room. Please try again.');
        }
        return;
      }

      navigate(`/room/${roomId.trim()}?username=${encodeURIComponent(username.trim())}`);
    } catch (error) {
      console.error('Error joining room:', error);
      alert('Failed to join room. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleKeyPress = (e, action) => {
    if (e.key === 'Enter') {
      action();
    }
  };

  return (
    <>
      <div className={styles['batman-background']}></div>
      <div className={styles['main-container']}>
        <div className={styles['home-content']}>
          <div className={styles['hero-section']}>
            <div className={styles['logo-container']}>
              <Video size={48} className={styles['logo-icon']} />
              <h1 className={styles['app-title']}>Stream2Gether</h1>
            </div>
            <p className={styles['app-description']}>
              Watch Google Drive videos together in real-time with friends and family
            </p>
          </div>

          <div className={styles['forms-section']}>
            <div className={styles['username-section']}>
              <label htmlFor="username">Your Display Name</label>
              <input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, createRoom)}
                maxLength={30}
              />
            </div>

            <div className={styles['action-group']}>
              <div className={styles['action-text']}>
                <h3>
                  <Play size={20} />
                  Start a New Room
                </h3>
                <p>Create a new watch party and invite others</p>
              </div>
              <div className={styles['action-buttons']}>
                <button
                  onClick={createRoom}
                  disabled={isCreating || !username.trim()}
                  className={styles['primary-button']}
                >
                  {isCreating ? 'Creating...' : 'Create Room'}
                </button>
              </div>
            </div>

            <div className={styles['divider']}>
              <span>OR</span>
            </div>

            <div className={styles['action-group']}>
              <div className={styles['action-text']}>
                <h3>
                  <Users size={20} />
                  Join an Existing Room
                </h3>
                <p>Enter a room ID to join a watch party</p>
              </div>
              <div className={styles['action-buttons']}>
                <input
                  type="text"
                  placeholder="Enter Room ID"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, joinRoom)}
                />
                <button
                  onClick={joinRoom}
                  disabled={isJoining || !roomId.trim() || !username.trim()}
                  className={styles['secondary-button']}
                >
                  {isJoining ? 'Joining...' : 'Join Room'}
                </button>
              </div>
            </div>
          </div>

          <div className={styles['features-section']}>
            <div className={styles['features-inner-box']}>
              <h3>Features</h3>
              <ul>
                <li>
                  <strong>Real-time synchronized playback:</strong> Everyone watches at exactly the same time - play, pause, seek, and the entire room stays perfectly in sync
                </li>
                <li>
                  <strong>Live chat with other viewers:</strong> Discuss scenes, share reactions, and connect with friends through our integrated real-time messaging system
                </li>
                <li>
                  <strong>Host controls for managing the session:</strong> Room creators have full control over playback, can kick users, and manage the viewing experience for everyone
                </li>
                <li>
                  <strong>Automatic resync after buffering:</strong> Smart technology automatically detects when viewers fall out of sync and brings everyone back together seamlessly
                </li>
                <li>
                  <strong>Works with YouTube videos AND Google Drive files:</strong> Stream content directly from YouTube links or upload your own movies and videos via Google Drive integration
                </li>
                <li>
                  <strong>Supports all video formats:</strong> Compatible with MP4, AVI, MOV, WebM, MKV, FLV, and many more - no conversion needed, just upload and watch
                </li>
                <li>
                  <strong>Cross-platform compatibility:</strong> Works seamlessly on desktop, tablet, and mobile devices with responsive design and touch controls
                </li>
                <li>
                  <strong>No registration required:</strong> Jump right in with just a username - no lengthy sign-up process or personal information needed
                </li>
              </ul>
            </div>
          </div>

          <footer className={styles.footer}>
            <p className={styles['footer-text']} style={{color: 'white'}}>
              © 2025 Stream2Gether - Watch together, stay connected
             
            </p>
            <p className={styles['footer-text']} style={{color: 'white', marginTop: '8px'}}>
              Made with ❤️ by 
               <a href="https://github.com/amarxxanand" target="_blank" rel="noopener noreferrer" style={{color: 'white', textDecoration: 'none', marginLeft: '8px'}}>
                amarxxanand
              </a>
              <span style={{margin: '0 8px'}}>•</span>
              <a href="https://github.com/amarxxanand" target="_blank" rel="noopener noreferrer" style={{color: 'white', textDecoration: 'none', marginLeft: '8px'}}>
                GitHub
              </a>
              <span style={{margin: '0 8px'}}>•</span>
              <a href="https://www.linkedin.com/in/amar--anand/" target="_blank" rel="noopener noreferrer" style={{color: 'white', textDecoration: 'none'}}>
                LinkedIn
              </a>
            </p>
          </footer>
        </div>
      </div>
    </>
  );
};

export default HomePage;
