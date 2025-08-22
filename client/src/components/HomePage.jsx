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
    <div className={styles['home-container']}>
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

        <div className={styles['content-wrapper']}>
          <div className={styles['form-container']}>
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

            <div className={styles['actions-section']}>
              <div className={styles['action-group']}>
                <h3>
                  <Play size={20} />
                  Start a New Room
                </h3>
                <p>Create a new watch party and invite others</p>
                <button
                  onClick={createRoom}
                  disabled={isCreating || !username.trim()}
                  className={styles['primary-button']}
                >
                  {isCreating ? 'Creating...' : 'Create Room'}
                </button>
              </div>

              <div className={styles['divider']}>
                <span>OR</span>
              </div>

              <div className={styles['action-group']}>
                <h3>
                  <Users size={20} />
                  Join an Existing Room
                </h3>
                <p>Enter a room ID to join a watch party</p>
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
                <li>Real-time synchronized playback</li>
                <li>Live chat with other viewers</li>
                <li>Host controls for managing the session</li>
                <li>Automatic resync after buffering</li>
                <li>Works with YouTube videos AND Google Drive files</li>
                <li>Supports all video formats (MP4, AVI, MOV, WebM, etc.)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
