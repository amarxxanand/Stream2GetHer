import React, { useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Search } from 'lucide-react';

const VideoControls = ({ onLoadVideo, currentVideoId, isPlayerReady }) => {
  const [videoUrl, setVideoUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const extractVideoId = (url) => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const handleLoadVideo = async () => {
    const videoId = extractVideoId(videoUrl.trim());
    
    if (!videoId) {
      alert('Please enter a valid YouTube URL or video ID');
      return;
    }

    setIsLoading(true);
    try {
      onLoadVideo(videoId);
      setVideoUrl('');
    } catch (error) {
      console.error('Error loading video:', error);
      alert('Failed to load video');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLoadVideo();
    }
  };

  return (
    <div className="video-controls">
      <div className="controls-header">
        <h3>Video Controls</h3>
        <span className="host-only">Host Only</span>
      </div>
      
      <div className="load-video-section">
        <label htmlFor="video-url">Load YouTube Video</label>
        <div className="input-group">
          <input
            id="video-url"
            type="text"
            placeholder="Paste YouTube URL or Video ID"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <button
            onClick={handleLoadVideo}
            disabled={!videoUrl.trim() || isLoading}
            className="load-button"
          >
            {isLoading ? (
              <div className="spinner" />
            ) : (
              <Search size={16} />
            )}
            {isLoading ? 'Loading...' : 'Load'}
          </button>
        </div>
      </div>

      {currentVideoId && (
        <div className="current-video">
          <p>Current Video: <strong>{currentVideoId}</strong></p>
          <p className="video-status">
            Player: {isPlayerReady ? 'Ready' : 'Loading...'}
          </p>
        </div>
      )}

      <div className="instructions">
        <h4>Instructions:</h4>
        <ul>
          <li>Use the YouTube player controls above to play, pause, and seek</li>
          <li>All participants will automatically sync with your actions</li>
          <li>You can load any public YouTube video</li>
          <li>The system will automatically handle buffering and resync</li>
        </ul>
      </div>

      <style jsx>{`
        .video-controls {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .controls-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .controls-header h3 {
          margin: 0;
          color: #1e293b;
          font-size: 1.2rem;
          font-weight: 600;
        }

        .host-only {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .load-video-section {
          margin-bottom: 20px;
        }

        .load-video-section label {
          display: block;
          font-weight: 500;
          color: #374151;
          margin-bottom: 8px;
        }

        .input-group {
          display: flex;
          gap: 8px;
        }

        .input-group input {
          flex: 1;
          padding: 12px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 0.9rem;
          transition: border-color 0.2s;
        }

        .input-group input:focus {
          outline: none;
          border-color: #667eea;
        }

        .load-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
          white-space: nowrap;
        }

        .load-button:hover:not(:disabled) {
          background: #5a67d8;
        }

        .load-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid transparent;
          border-top: 2px solid currentColor;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .current-video {
          background: #f8fafc;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .current-video p {
          margin: 4px 0;
          font-size: 0.9rem;
          color: #475569;
        }

        .current-video strong {
          color: #1e293b;
        }

        .video-status {
          font-size: 0.8rem !important;
          color: #64748b !important;
        }

        .instructions {
          background: #f0f9ff;
          padding: 16px;
          border-radius: 8px;
          border-left: 4px solid #0ea5e9;
        }

        .instructions h4 {
          margin: 0 0 12px 0;
          color: #0c4a6e;
          font-size: 1rem;
        }

        .instructions ul {
          margin: 0;
          padding-left: 20px;
        }

        .instructions li {
          margin: 6px 0;
          color: #0369a1;
          font-size: 0.9rem;
          line-height: 1.4;
        }

        @media (max-width: 768px) {
          .input-group {
            flex-direction: column;
          }

          .load-button {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default VideoControls;
