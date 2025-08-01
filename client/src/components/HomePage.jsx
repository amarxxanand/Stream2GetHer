import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Users, Video } from 'lucide-react';

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
    <div className="home-container">
      <div className="home-content">
        <div className="hero-section">
          <div className="logo-container">
            <Video size={48} className="logo-icon" />
            <h1 className="app-title">Stream2Gether</h1>
          </div>
          <p className="app-description">
            Watch YouTube videos together in real-time with friends and family
          </p>
        </div>

        <div className="form-container">
          <div className="username-section">
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

          <div className="actions-section">
            <div className="action-group">
              <h3>
                <Play size={20} />
                Start a New Room
              </h3>
              <p>Create a new watch party and invite others</p>
              <button
                onClick={createRoom}
                disabled={isCreating || !username.trim()}
                className="primary-button"
              >
                {isCreating ? 'Creating...' : 'Create Room'}
              </button>
            </div>

            <div className="divider">
              <span>OR</span>
            </div>

            <div className="action-group">
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
                className="secondary-button"
              >
                {isJoining ? 'Joining...' : 'Join Room'}
              </button>
            </div>
          </div>
        </div>

        <div className="features-section">
          <h3>Features</h3>
          <ul>
            <li>Real-time synchronized playback</li>
            <li>Live chat with other viewers</li>
            <li>Host controls for managing the session</li>
            <li>Automatic resync after buffering</li>
            <li>Works with any YouTube video</li>
          </ul>
        </div>
      </div>

      <style jsx>{`
        .home-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .home-content {
          max-width: 500px;
          width: 100%;
          background: white;
          border-radius: 20px;
          padding: 40px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        }

        .hero-section {
          text-align: center;
          margin-bottom: 40px;
        }

        .logo-container {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .logo-icon {
          color: #667eea;
        }

        .app-title {
          font-size: 2.5rem;
          font-weight: 800;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0;
        }

        .app-description {
          font-size: 1.1rem;
          color: #6b7280;
          margin: 0;
          line-height: 1.5;
        }

        .form-container {
          margin-bottom: 30px;
        }

        .username-section {
          margin-bottom: 30px;
        }

        .username-section label {
          display: block;
          font-weight: 600;
          color: #374151;
          margin-bottom: 8px;
        }

        .username-section input {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 1rem;
          transition: border-color 0.2s;
        }

        .username-section input:focus {
          outline: none;
          border-color: #667eea;
        }

        .actions-section {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .action-group {
          text-align: center;
        }

        .action-group h3 {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 1.2rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 8px;
        }

        .action-group p {
          color: #6b7280;
          margin-bottom: 16px;
          font-size: 0.95rem;
        }

        .action-group input {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 1rem;
          margin-bottom: 12px;
          transition: border-color 0.2s;
        }

        .action-group input:focus {
          outline: none;
          border-color: #667eea;
        }

        .primary-button {
          width: 100%;
          padding: 14px 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .primary-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(102, 126, 234, 0.3);
        }

        .primary-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .secondary-button {
          width: 100%;
          padding: 14px 24px;
          background: white;
          color: #667eea;
          border: 2px solid #667eea;
          border-radius: 12px;
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .secondary-button:hover:not(:disabled) {
          background: #667eea;
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(102, 126, 234, 0.3);
        }

        .secondary-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .divider {
          display: flex;
          align-items: center;
          text-align: center;
          margin: 20px 0;
        }

        .divider::before,
        .divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #e5e7eb;
        }

        .divider span {
          padding: 0 16px;
          color: #9ca3af;
          font-weight: 500;
          font-size: 0.9rem;
        }

        .features-section {
          background: #f9fafb;
          border-radius: 12px;
          padding: 20px;
          margin-top: 20px;
        }

        .features-section h3 {
          font-size: 1.1rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 12px;
        }

        .features-section ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .features-section li {
          padding: 4px 0;
          color: #6b7280;
          font-size: 0.95rem;
          position: relative;
          padding-left: 20px;
        }

        .features-section li::before {
          content: '✓';
          position: absolute;
          left: 0;
          color: #10b981;
          font-weight: bold;
        }

        @media (max-width: 600px) {
          .home-content {
            padding: 30px 20px;
            margin: 10px;
          }

          .app-title {
            font-size: 2rem;
          }
        }
      `}</style>
    </div>
  );
};

export default HomePage;
