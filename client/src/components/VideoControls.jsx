import React, { useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Search, Upload } from 'lucide-react';
import styles from './VideoControls.module.css';

const VideoControls = ({ onLoadVideo, currentVideoUrl, currentVideoTitle, isPlayerReady, isHost = true }) => {
  const [videoUrl, setVideoUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  const extractFileId = (url) => {
    const patterns = [
      /\/file\/d\/([a-zA-Z0-9-_]+)/, // Standard share URL
      /id=([a-zA-Z0-9-_]+)/, // URL with id parameter
      /^([a-zA-Z0-9-_]+)$/ // Direct file ID
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const validateGoogleDriveUrl = async (url) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SERVER_URL || 'http://localhost:3000'}/api/video/metadata?url=${encodeURIComponent(url)}`
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Invalid video URL');
      }
      
      const metadata = await response.json();
      return metadata;
    } catch (error) {
      throw error;
    }
  };

  const handleLoadVideo = async () => {
    if (!isHost) {
      alert('Only the room host can load videos');
      return;
    }
    
    const trimmedUrl = videoUrl.trim();
    
    if (!trimmedUrl) {
      alert('Please enter a video URL');
      return;
    }

    setIsLoading(true);
    setIsValidating(true);
    
    try {
      // Check if it's a Google Drive URL or direct video URL
      const isGoogleDriveUrl = trimmedUrl.includes('drive.google.com') || extractFileId(trimmedUrl);
      
      if (isGoogleDriveUrl) {
        const fileId = extractFileId(trimmedUrl);
        if (!fileId) {
          alert('Please enter a valid Google Drive URL or file ID');
          return;
        }
        
        // Validate the Google Drive video file
        const metadata = await validateGoogleDriveUrl(trimmedUrl);
        
        // Show warning for potentially problematic formats
        if (metadata.mimeType && (metadata.mimeType.includes('matroska') || metadata.mimeType.includes('mkv'))) {
          const proceed = confirm(`🎬 MKV Format Detected\n\nThis video is in MKV format, which has limited browser support:\n\n• ⚠️ Seeking (skipping to different parts) will often cause errors\n• 🔄 Video may restart from beginning when seeking\n• ⏸️ Pausing and playing works normally\n• 📱 Mobile devices may have more issues\n\nRecommendation: Convert to MP4 for best experience.\n\nContinue loading this MKV video?`);
          if (!proceed) {
            return;
          }
        }
        
        // Show warning if Google Drive API is not configured
        if (metadata.warning) {
          const proceed = confirm(`${metadata.warning}\n\nVideo may not play correctly. Continue anyway?`);
          if (!proceed) {
            return;
          }
        }
        
        // Use provided title or fallback to file name
        const finalTitle = videoTitle.trim() || metadata.name || `Video ${fileId.substring(0, 8)}`;
        onLoadVideo(trimmedUrl, finalTitle);
      } else {
        // Direct video URL - bypass Google Drive validation
        console.log('🎬 Loading direct video URL:', trimmedUrl);
        const finalTitle = videoTitle.trim() || 'Direct Video';
        onLoadVideo(trimmedUrl, finalTitle);
      }
      
      setVideoUrl('');
      setVideoTitle('');
    } catch (error) {
      console.error('Error loading video:', error);
      
      // Check if this was a Google Drive URL that failed
      const isGoogleDriveUrl = trimmedUrl.includes('drive.google.com') || extractFileId(trimmedUrl);
      
      if (isGoogleDriveUrl) {
        // Provide specific error messages for Google Drive URLs
        if (error.message.includes('Google Drive API not configured') || error.message.includes('service not configured')) {
          alert(`❌ Google Drive API Setup Required\n\nTo play Google Drive videos, you need to:\n\n1. Set up Google Drive API credentials\n2. Add them to your .env file\n3. Restart the server\n\nAlternatively, you can use direct video URLs (like .mp4 files from other hosting services) for testing.\n\nSee the console or MIGRATION-GUIDE.md for detailed setup instructions.`);
        } else if (error.message.includes('Invalid Google Drive URL')) {
          alert(`❌ Invalid URL\n\nPlease make sure you're using a valid Google Drive share link or file ID.\n\nExpected formats:\n• https://drive.google.com/file/d/FILE_ID/view\n• https://drive.google.com/open?id=FILE_ID\n• Just the FILE_ID`);
        } else if (error.message.includes('not accessible')) {
          alert(`❌ Access Denied\n\nThe video file cannot be accessed. Please ensure:\n\n1. The file sharing is set to "Anyone with the link"\n2. The file exists and hasn't been deleted\n3. You have the correct permissions`);
        } else if (error.message.includes('not a video')) {
          alert(`❌ Invalid File Type\n\nThe file is not a supported video format.\n\nSupported formats: MP4, WebM, AVI, MOV, OGG`);
        } else {
          alert(`Failed to load Google Drive video: ${error.message}`);
        }
      } else {
        // For direct URLs, try to load anyway with a warning
        const proceed = confirm(`⚠️ Could not validate video URL\n\n"${trimmedUrl}"\n\nThis might be a direct video link that will work in the player, or it might not be a valid video URL.\n\nTry loading it anyway?`);
        if (proceed) {
          const finalTitle = videoTitle.trim() || 'Direct Video';
          onLoadVideo(trimmedUrl, finalTitle);
          setVideoUrl('');
          setVideoTitle('');
        }
      }
    } finally {
      setIsLoading(false);
      setIsValidating(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLoadVideo();
    }
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setVideoUrl(newValue);
  };

  const handleInputFocus = (e) => {
    if (!isHost) {
      alert('Only the room host can load videos');
      e.target.blur();
    }
  };

  const generateShareableLink = (url) => {
    const fileId = extractFileId(url);
    if (fileId) {
      return `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
    }
    return url;
  };

  return (
    <div className={styles.videoControls}>
      <div className={styles.controlsHeader}>
        <h3>Video Controls</h3>
        {!isHost && <span className={styles.hostOnly}>Host Only</span>}
        {isHost && <span className={styles.hostBadge}>You are Host</span>}
      </div>
      
      <div className={styles.loadVideoSection}>
        <label htmlFor="video-url">
          {isHost ? '🎬 Load Video URL' : '🔒 Video Controls (Host Only)'}
        </label>
        
        <div className={styles.inputGroup}>
          <input
            id="video-url"
            type="text"
            placeholder={isHost ? "Paste Google Drive video URL, YouTube URL, or direct video file URL" : "Only host can load videos"}
            value={videoUrl}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyPress={handleKeyPress}
            disabled={!isHost}
            style={{ 
              opacity: !isHost ? 0.6 : 1,
              cursor: !isHost ? 'not-allowed' : 'text'
            }}
            autoComplete="off"
            spellCheck="false"
          />
          <input
            id="video-title"
            type="text"
            placeholder={isHost ? "Video title (optional)" : "Host controls only"}
            value={videoTitle}
            onChange={(e) => setVideoTitle(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={!isHost}
            style={{ opacity: !isHost ? 0.6 : 1 }}
          />
          <button
            onClick={handleLoadVideo}
            disabled={!videoUrl.trim() || isLoading || !isHost}
            className={styles.loadButton}
          >
            {isValidating ? (
              <div className={styles.spinner} />
            ) : (
              <Upload size={16} />
            )}
            {isLoading ? 'Loading...' : 'Load'}
          </button>
        </div>
      </div>

      {currentVideoUrl && (
        <div className={styles.currentVideo}>
          <div className={styles.currentVideoHeader}>
            <h4>📹 Currently Playing:</h4>
            {isHost && (
              <button 
                onClick={() => onLoadVideo('', '')}
                className={styles.clearButton}
                title="Clear current video"
              >
                Clear Video
              </button>
            )}
          </div>
          <p><strong>{currentVideoTitle || 'Untitled Video'}</strong></p>
          <p className={styles.videoStatus}>
            Player: {isPlayerReady ? '✅ Ready' : '⏳ Loading...'}
          </p>
          <details className={styles.videoDetails}>
            <summary>Video URL</summary>
            <p className={styles.videoUrl}>
              <code>{generateShareableLink(currentVideoUrl)}</code>
            </p>
          </details>
        </div>
      )}

      <div className={styles.instructions}>
        <h4>📋 How to Play Videos:</h4>
        <ul>
          <li>Paste a video URL in the input above (YouTube, Google Drive, or direct video links)</li>
          <li>Use the video player controls to play, pause, and seek</li>
          <li>All participants will automatically sync with your actions</li>
          <li>Supported formats: MP4, WebM, AVI, MOV, and other common video formats</li>
        </ul>
      </div>

      <div className={styles.googleDriveHelp}>
        <h4>🎬 How to Share Google Drive Videos:</h4>
        <ol>
          <li>Upload your video file to Google Drive</li>
          <li>Right-click the file and select "Share"</li>
          <li>Change access to "Anyone with the link"</li>
          <li>Copy the share link and paste it above</li>
        </ol>
        <p><em>💡 Alternative: You can also use YouTube URLs or direct video file links (.mp4, .webm, etc.)</em></p>
      </div>
    </div>
  );
};

export default VideoControls;
