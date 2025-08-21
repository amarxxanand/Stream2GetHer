import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward, Settings, Languages } from 'lucide-react';
import { useVideoPlayer } from '../hooks/useVideoPlayer';
import { useYouTubePlayer } from '../hooks/useYouTubePlayer';
import styles from './VideoPlayer.module.css';

// Utility functions for video type detection
const isYouTubeUrl = (url) => {
  if (!url) return false;
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]+)/,
    /^[a-zA-Z0-9_-]{11}$/ // Direct video ID
  ];
  return patterns.some(pattern => pattern.test(url));
};

const extractYouTubeId = (url) => {
  if (!url) return null;
  
  // Direct video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
    return url;
  }
  
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
};

const isGoogleDriveUrl = (url) => {
  if (!url) return false;
  return url.includes('drive.google.com') || url.includes('docs.google.com');
};

const VideoPlayer = forwardRef(({ 
  videoUrl, 
  isHost, 
  onStateChange, 
  onReady,
  className = '',
  ...props 
}, ref) => {
  const [showControls, setShowControls] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [audioTracks, setAudioTracks] = useState([]);
  const [subtitleTracks, setSubtitleTracks] = useState([]);
  const [selectedAudioTrack, setSelectedAudioTrack] = useState(0);
  const [selectedSubtitleTrack, setSelectedSubtitleTrack] = useState(-1); // -1 means no subtitles
  const [skipFeedback, setSkipFeedback] = useState(null); // For showing skip feedback
  
  // Detect video type
  const [videoType, setVideoType] = useState(null); // 'youtube', 'googledrive', or null
  const [youtubeVideoId, setYoutubeVideoId] = useState(null);
  
  const controlsTimeoutRef = useRef(null);
  const progressRef = useRef(null);
  const volumeRef = useRef(null);
  const youtubeContainerRef = useRef(null);
  const videoRef = useRef(null);

  // Detect video type when URL changes
  useEffect(() => {
    if (!videoUrl) {
      setVideoType(null);
      setYoutubeVideoId(null);
      return;
    }

    if (isYouTubeUrl(videoUrl)) {
      const videoId = extractYouTubeId(videoUrl);
      setVideoType('youtube');
      setYoutubeVideoId(videoId);
      console.log('🎬 YouTube video detected:', videoId);
    } else if (isGoogleDriveUrl(videoUrl)) {
      setVideoType('googledrive');
      setYoutubeVideoId(null);
      console.log('🎬 Google Drive video detected');
    } else {
      setVideoType('googledrive'); // Default to Google Drive for unknown URLs
      setYoutubeVideoId(null);
      console.log('🎬 Unknown video type, defaulting to Google Drive');
    }
  }, [videoUrl]);

  // Initialize Google Drive video player
  const {
    isReady: gdIsReady,
    isPlaying: gdIsPlaying,
    duration: gdDuration,
    currentTime: gdCurrentTime,
    volume: gdVolume,
    error: gdError,
    isLoading: gdIsLoading,
    play: gdPlay,
    pause: gdPause,
    seekTo: gdSeekTo,
    setVolume: gdSetVolume,
    loadVideo: gdLoadVideo,
    getCurrentTime: gdGetCurrentTime,
    formatTime: gdFormatTime,
    getVideoProps: gdGetVideoProps,
    videoRef: gdVideoRef
  } = useVideoPlayer(
    videoType === 'googledrive' ? onStateChange : null,
    videoType === 'googledrive' ? onReady : null
  );

  // Initialize YouTube player
  const {
    isReady: ytIsReady,
    playerState: ytPlayerState,
    play: ytPlay,
    pause: ytPause,
    seekTo: ytSeekTo,
    loadVideoById: ytLoadVideo,
    getCurrentTime: ytGetCurrentTime,
    getDuration: ytGetDuration,
    PLAYER_STATES
  } = useYouTubePlayer(
    videoType === 'youtube' ? videoRef : null,
    videoType === 'youtube' ? (event) => {
      // Convert YouTube events to our standard format
      const state = event.data;
      if (onStateChange) {
        let type;
        switch (state) {
          case PLAYER_STATES.PLAYING:
            type = 'play';
            break;
          case PLAYER_STATES.PAUSED:
            type = 'pause';
            break;
          default:
            return;
        }
        onStateChange({ type, currentTime: ytGetCurrentTime() });
      }
    } : null,
    videoType === 'youtube' ? () => {
      if (onReady) onReady();
    } : null
  );

  // Unified player state based on active video type
  const isReady = videoType === 'youtube' ? ytIsReady : gdIsReady;
  const isPlaying = videoType === 'youtube' ? 
    (ytPlayerState === PLAYER_STATES?.PLAYING) : gdIsPlaying;
  const duration = videoType === 'youtube' ? ytGetDuration() : gdDuration;
  const currentTime = videoType === 'youtube' ? ytGetCurrentTime() : gdCurrentTime;
  const volume = videoType === 'youtube' ? 1 : gdVolume; // YouTube doesn't expose volume
  const error = videoType === 'youtube' ? null : gdError;
  const isLoading = videoType === 'youtube' ? false : gdIsLoading;

  // Unified control functions
  const play = () => {
    if (videoType === 'youtube') {
      ytPlay();
    } else {
      gdPlay();
    }
  };

  const pause = () => {
    if (videoType === 'youtube') {
      ytPause();
    } else {
      gdPause();
    }
  };

  const seekTo = (time) => {
    if (videoType === 'youtube') {
      ytSeekTo(time);
    } else {
      gdSeekTo(time);
    }
  };

  const setVolume = (vol) => {
    if (videoType === 'googledrive') {
      gdSetVolume(vol);
    }
    // Note: YouTube player volume is controlled by the user
  };

  const getCurrentTime = () => {
    if (videoType === 'youtube') {
      return ytGetCurrentTime();
    } else {
      return gdGetCurrentTime();
    }
  };

  const formatTime = (time) => {
    if (!time || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const loadVideo = (url) => {
    if (videoType === 'youtube' && youtubeVideoId) {
      ytLoadVideo(youtubeVideoId);
    } else if (videoType === 'googledrive') {
      gdLoadVideo(url);
    }
  };

  // Load video when URL changes
  useEffect(() => {
    if (videoUrl && videoType) {
      if (videoType === 'youtube' && youtubeVideoId) {
        console.log('🎬 Loading YouTube video:', youtubeVideoId);
        // YouTube player will load automatically when ready
      } else if (videoType === 'googledrive') {
        console.log('🎬 Loading Google Drive video:', videoUrl);
        gdLoadVideo(videoUrl);
      }
    }
  }, [videoUrl, videoType, youtubeVideoId, gdLoadVideo]);

  // Load YouTube video when player is ready
  useEffect(() => {
    if (videoType === 'youtube' && ytIsReady && youtubeVideoId) {
      ytLoadVideo(youtubeVideoId);
    }
  }, [videoType, ytIsReady, youtubeVideoId, ytLoadVideo]);

  // Enhanced track detection - runs when video loads and periodically checks for new tracks
  useEffect(() => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    let trackCheckInterval;
    
    const detectTracks = () => {
      try {
        // Enhanced audio track detection
        const audioTrackList = [];
        
        // Check HTML5 audio tracks
        if (video.audioTracks && video.audioTracks.length > 0) {
          for (let i = 0; i < video.audioTracks.length; i++) {
            const track = video.audioTracks[i];
            audioTrackList.push({
              id: track.id || `audio-${i}`,
              label: track.label || `Audio Track ${i + 1}`,
              language: track.language || 'unknown',
              enabled: track.enabled,
              type: 'html5'
            });
          }
        }
        
        // Check for additional metadata from video file
        if (video.duration && video.videoWidth && video.videoHeight) {
          // Try to detect multiple audio streams through codec info
          const hasMultipleAudio = video.mozHasAudio !== undefined ? video.mozHasAudio : 
                                   video.webkitAudioDecodedByteCount !== undefined;
          
          if (hasMultipleAudio && audioTrackList.length === 0) {
            // Fallback: assume at least one audio track if video has audio
            audioTrackList.push({
              id: 'default-audio',
              label: 'Default Audio',
              language: 'unknown',
              enabled: true,
              type: 'default'
            });
          }
        }
        
        // Enhanced subtitle/caption track detection
        const subtitleTrackList = [];
        
        if (video.textTracks && video.textTracks.length > 0) {
          for (let i = 0; i < video.textTracks.length; i++) {
            const track = video.textTracks[i];
            
            // Include all text track types that could be subtitles/captions
            if (['subtitles', 'captions', 'chapters', 'descriptions', 'metadata'].includes(track.kind)) {
              subtitleTrackList.push({
                id: track.id || `text-${i}`,
                label: track.label || `${track.kind.charAt(0).toUpperCase() + track.kind.slice(1)} ${i + 1}`,
                language: track.language || 'unknown',
                kind: track.kind,
                track: track,
                mode: track.mode
              });
            }
          }
        }
        
        // Update state only if tracks have changed
        setAudioTracks(prevTracks => {
          const tracksChanged = JSON.stringify(prevTracks) !== JSON.stringify(audioTrackList);
          return tracksChanged ? audioTrackList : prevTracks;
        });
        
        setSubtitleTracks(prevTracks => {
          const tracksChanged = JSON.stringify(prevTracks) !== JSON.stringify(subtitleTrackList);
          return tracksChanged ? subtitleTrackList : prevTracks;
        });
        
        // Enhanced logging with more details
        if (audioTrackList.length > 0 || subtitleTrackList.length > 0) {
          console.log('🎬 Enhanced Track Detection:', {
            videoInfo: {
              duration: video.duration,
              dimensions: `${video.videoWidth}x${video.videoHeight}`,
              hasAudio: video.mozHasAudio !== undefined ? video.mozHasAudio : !!video.webkitAudioDecodedByteCount
            },
            audioTracks: audioTrackList.map(t => ({ 
              label: t.label, 
              language: t.language, 
              type: t.type,
              enabled: t.enabled 
            })),
            subtitleTracks: subtitleTrackList.map(t => ({ 
              label: t.label, 
              language: t.language, 
              kind: t.kind,
              mode: t.mode 
            }))
          });
        }
        
      } catch (error) {
        console.warn('⚠️ Error detecting tracks:', error);
      }
    };
    
    // Initial detection when video is ready
    if (isReady) {
      detectTracks();
    }
    
    // Set up periodic checking for dynamically loaded tracks
    // Some videos load tracks after initial load
    if (isReady && video.duration) {
      trackCheckInterval = setInterval(detectTracks, 2000); // Check every 2 seconds
      
      // Stop checking after 30 seconds to avoid infinite polling
      setTimeout(() => {
        if (trackCheckInterval) {
          clearInterval(trackCheckInterval);
        }
      }, 30000);
    }
    
    // Listen for track changes
    const handleTrackChange = () => {
      setTimeout(detectTracks, 100); // Small delay to ensure tracks are ready
    };
    
    if (video.textTracks) {
      video.textTracks.addEventListener('addtrack', handleTrackChange);
      video.textTracks.addEventListener('removetrack', handleTrackChange);
    }
    
    if (video.audioTracks) {
      video.audioTracks.addEventListener('addtrack', handleTrackChange);
      video.audioTracks.addEventListener('removetrack', handleTrackChange);
    }
    
    // Cleanup
    return () => {
      if (trackCheckInterval) {
        clearInterval(trackCheckInterval);
      }
      
      if (video.textTracks) {
        video.textTracks.removeEventListener('addtrack', handleTrackChange);
        video.textTracks.removeEventListener('removetrack', handleTrackChange);
      }
      
      if (video.audioTracks) {
        video.audioTracks.removeEventListener('addtrack', handleTrackChange);
        video.audioTracks.removeEventListener('removetrack', handleTrackChange);
      }
    };
  }, [isReady, videoUrl]);

  // Auto-hide controls
  useEffect(() => {
    const resetControlsTimeout = () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      setShowControls(true);
      controlsTimeoutRef.current = setTimeout(() => {
        if (isPlaying && !isDragging) {
          setShowControls(false);
        }
      }, 3000);
    };

    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying, isDragging]);

  // Handle play/pause
  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  // Skip controls
  const skip = (seconds) => {
    if (!isHost) return;
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    seekTo(newTime);
    
    // Show skip feedback
    setSkipFeedback(seconds > 0 ? `+${seconds}s` : `${seconds}s`);
    setTimeout(() => setSkipFeedback(null), 1000);
  };

  const toggleMute = () => {
    if (isMuted) {
      setVolume(0.5);
      setIsMuted(false);
    } else {
      setVolume(0);
      setIsMuted(true);
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!isHost || !isReady) return;
      
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          handlePlayPause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skip(-10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          skip(10);
          break;
        case 'j':
          e.preventDefault();
          skip(-10);
          break;
        case 'l':
          e.preventDefault();
          skip(10);
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'a':
          e.preventDefault();
          cycleAudioTrack();
          break;
        case 's':
          e.preventDefault();
          cycleSubtitleTrack();
          break;
        case 'c':
          e.preventDefault();
          cycleSubtitleTrack(); // Alternative for subtitles
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isHost, isReady, handlePlayPause, skip, toggleMute, toggleFullscreen]);

  // Cycle through audio tracks
  const cycleAudioTrack = () => {
    if (audioTracks.length <= 1) return;
    
    const nextTrack = (selectedAudioTrack + 1) % audioTracks.length;
    selectAudioTrack(nextTrack);
    
    // Show feedback
    setSkipFeedback(`🎵 ${audioTracks[nextTrack]?.label || `Audio ${nextTrack + 1}`}`);
    setTimeout(() => setSkipFeedback(null), 2000);
  };

  // Cycle through subtitle tracks (including "off")
  const cycleSubtitleTrack = () => {
    const totalOptions = subtitleTracks.length + 1; // +1 for "off" option
    if (totalOptions <= 1) return;
    
    let nextTrack;
    if (selectedSubtitleTrack === -1) {
      nextTrack = 0; // Go to first subtitle
    } else if (selectedSubtitleTrack >= subtitleTracks.length - 1) {
      nextTrack = -1; // Go to "off"
    } else {
      nextTrack = selectedSubtitleTrack + 1; // Go to next subtitle
    }
    
    selectSubtitleTrack(nextTrack);
    
    // Show feedback
    const feedbackText = nextTrack === -1 ? 
      '📝 Subtitles Off' : 
      `📝 ${subtitleTracks[nextTrack]?.label || `Subtitle ${nextTrack + 1}`}`;
    
    setSkipFeedback(feedbackText);
    setTimeout(() => setSkipFeedback(null), 2000);
  };

  // Handle progress bar interaction
  const handleProgressClick = (e) => {
    if (!isHost || !progressRef.current) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;
    seekTo(newTime);
  };

  const handleProgressMouseDown = (e) => {
    if (!isHost) return;
    setIsDragging(true);
    handleProgressClick(e);
  };

  const handleProgressMouseMove = (e) => {
    if (!isDragging || !isHost) return;
    handleProgressClick(e);
  };

  const handleProgressMouseUp = () => {
    setIsDragging(false);
  };

  // Handle volume
  const handleVolumeClick = (e) => {
    if (!volumeRef.current) return;
    
    const rect = volumeRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newVolume = Math.max(0, Math.min(1, clickX / rect.width));
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  // Enhanced audio and subtitle track controls
  const selectAudioTrack = (trackIndex) => {
    if (!videoRef.current) return;
    
    try {
      const video = videoRef.current;
      
      if (video.audioTracks && video.audioTracks.length > 0) {
        // Disable all audio tracks first
        for (let i = 0; i < video.audioTracks.length; i++) {
          video.audioTracks[i].enabled = false;
        }
        
        // Enable selected track
        if (trackIndex >= 0 && trackIndex < video.audioTracks.length) {
          video.audioTracks[trackIndex].enabled = true;
          setSelectedAudioTrack(trackIndex);
          
          const selectedTrack = audioTracks[trackIndex];
          console.log('🎵 Audio track changed to:', {
            label: selectedTrack?.label,
            language: selectedTrack?.language,
            type: selectedTrack?.type
          });
          
          // Notify other users in the room about track change
          if (onStateChange) {
            onStateChange({
              type: 'audioTrackChange',
              trackIndex,
              track: selectedTrack
            });
          }
        }
      } else {
        console.warn('⚠️ No audio tracks available for selection');
      }
    } catch (error) {
      console.error('❌ Error selecting audio track:', error);
    }
  };

  const selectSubtitleTrack = (trackIndex) => {
    if (!videoRef.current) return;
    
    try {
      const video = videoRef.current;
      
      if (video.textTracks && video.textTracks.length > 0) {
        // Disable all text tracks first
        for (let i = 0; i < video.textTracks.length; i++) {
          const track = video.textTracks[i];
          if (['subtitles', 'captions', 'chapters', 'descriptions'].includes(track.kind)) {
            track.mode = 'disabled';
          }
        }
        
        // Enable selected track
        if (trackIndex >= 0 && trackIndex < subtitleTracks.length) {
          const selectedTrack = subtitleTracks[trackIndex];
          const textTrack = selectedTrack.track;
          
          if (textTrack) {
            textTrack.mode = 'showing';
            setSelectedSubtitleTrack(trackIndex);
            
            console.log('📝 Subtitle track changed to:', {
              label: selectedTrack.label,
              language: selectedTrack.language,
              kind: selectedTrack.kind
            });
            
            // Notify other users in the room about subtitle change
            if (onStateChange) {
              onStateChange({
                type: 'subtitleTrackChange',
                trackIndex,
                track: selectedTrack
              });
            }
          }
        } else {
          // No subtitles selected
          setSelectedSubtitleTrack(-1);
          console.log('📝 Subtitles disabled');
          
          if (onStateChange) {
            onStateChange({
              type: 'subtitleTrackChange',
              trackIndex: -1,
              track: null
            });
          }
        }
      } else if (trackIndex === -1) {
        // User wants to disable subtitles but no tracks exist
        setSelectedSubtitleTrack(-1);
        console.log('📝 Subtitles disabled (no tracks available)');
      } else {
        console.warn('⚠️ No subtitle tracks available for selection');
      }
    } catch (error) {
      console.error('❌ Error selecting subtitle track:', error);
    }
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  const volumePercentage = volume * 100;

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    play,
    pause,
    seekTo,
    getCurrentTime,
    getDuration: () => duration,
    getVolume: () => volume
  }), [play, pause, seekTo, getCurrentTime, duration, volume]);

  if (error) {
    const isDecodeError = error.includes('PIPELINE_ERROR_DECODE') || error.includes('decode error');
    const isMkvInfo = error.includes('MKV file detected') || error.includes('ℹ️ MKV');
    const isMkvSeekingError = error.includes('MKV seeking') || error.includes('taking too long');
    
    // For MKV info messages (not actual errors), display them as overlay instead
    if (isMkvInfo && !isMkvSeekingError) {
      return (
        <div 
          className={`${styles.videoPlayer} ${className}`}
          onMouseMove={() => setShowControls(true)}
          onMouseLeave={() => !isDragging && setShowControls(false)}
        >
          <video 
            {...gdGetVideoProps()}
            className={styles.videoElement}
            poster="/api/placeholder/800/450"
          />
          
          {/* MKV info overlay */}
          <div className={styles.mkvInfoOverlay}>
            <div className={styles.mkvInfoMessage}>
              🎬 MKV File Detected: All video formats are now supported! However, seeking (jumping to specific times) may not work properly in MKV files.
            </div>
          </div>
          
          {isLoading && (
            <div className={styles.loadingOverlay}>
              <div className={styles.loadingSpinner}></div>
              <p>{isReady ? 'Seeking...' : 'Loading video...'}</p>
              <div>
                <p className={styles.loadingHint}>
                  MKV seeking can take 15-60 seconds for large jumps
                </p>
                <p className={styles.loadingTip}>
                  💡 Tip: Seek in smaller increments for faster response
                </p>
              </div>
            </div>
          )}

          {!isReady && videoUrl && !error && (
            <div className={styles.placeholder}>
              <Play size={64} />
              <p>Click to load video</p>
            </div>
          )}

          {skipFeedback && (
            <div className={styles.skipFeedback}>
              {skipFeedback}
            </div>
          )}

          {showControls && isReady && (
            <div className={styles.videoControls}>
              <div className="controls-background"></div>
              
              {/* Enhanced format indicator for any format */}
              {videoUrl && (
                <div className={styles.formatIndicator}>
                  🎬 Playing all video formats - MKV seeking may be limited
                </div>
              )}
              
              {/* Rest of controls... */}
              {/* Keyboard shortcuts help */}
              {isHost && (
                <div className={styles.keyboardHelp}>
                  <span>⌨️ Space/K: Play/Pause • ←/J: -10s • →/L: +10s • M: Mute • F: Fullscreen • A: Audio Track • S/C: Subtitles</span>
                </div>
              )}
              
              {/* Progress bar */}
              <div className={styles.progressContainer}>
                <div 
                  ref={progressRef}
                  className={styles.progressBar}
                  onClick={handleProgressClick}
                  onMouseDown={handleProgressMouseDown}
                  onMouseMove={handleProgressMouseMove}
                  onMouseUp={handleProgressMouseUp}
                >
                  <div 
                    className={styles.progressFilled}
                    style={{ width: `${progressPercentage}%` }}
                  />
                  <div 
                    className={styles.progressThumb}
                    style={{ left: `${progressPercentage}%` }}
                  />
                </div>
              </div>

              {/* Control buttons */}
              <div className={styles.controlsRow}>
                <div className={styles.controlsLeft}>
                  {isHost && (
                    <>
                      <button 
                        className={`${styles.controlButton} ${styles.skipButton}`}
                        onClick={() => skip(-10)}
                        title="Skip back 10s (←/J)"
                      >
                        <SkipBack size={20} />
                        <span className={styles.skipLabel}>10</span>
                      </button>
                      
                      <button 
                        className={`${styles.controlButton} ${styles.playPause}`}
                        onClick={handlePlayPause}
                        title={isPlaying ? 'Pause (Space/K)' : 'Play (Space/K)'}
                      >
                        {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                      </button>
                      
                      <button 
                        className={`${styles.controlButton} ${styles.skipButton}`}
                        onClick={() => skip(10)}
                        title="Skip forward 10s (→/L)"
                      >
                        <SkipForward size={20} />
                        <span className={styles.skipLabel}>10</span>
                      </button>
                    </>
                  )}
                  
                  {!isHost && (
                    <div className={styles.followerIndicator}>
                      <span>{isPlaying ? '▶' : '⏸'} Following host</span>
                    </div>
                  )}
                  
                  <div className={styles.timeDisplay}>
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </div>
                </div>

                <div className={styles.controlsRight}>
                  <div 
                    className={styles.volumeControl}
                    onMouseEnter={() => setShowVolumeSlider(true)}
                    onMouseLeave={() => setShowVolumeSlider(false)}
                  >
                    <button 
                      className={styles.controlButton}
                      onClick={toggleMute}
                      title={isMuted ? 'Unmute' : 'Mute'}
                    >
                      {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                    </button>
                    
                    {showVolumeSlider && (
                      <div className={styles.volumeSlider}>
                        <div 
                          ref={volumeRef}
                          className={styles.volumeBar}
                          onClick={handleVolumeClick}
                        >
                          <div 
                            className={styles.volumeFilled}
                            style={{ width: `${volumePercentage}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Settings Menu */}
                  <div 
                    className={styles.settingsControl}
                    onClick={() => setShowSettingsMenu((prev) => !prev)}
                  >
                    <button 
                      className={styles.controlButton}
                      title="Audio & Subtitles"
                    >
                      <Settings size={20} />
                    </button>
                    {showSettingsMenu && (
                      <div className={styles.settingsMenu}>
                        {/* Track Detection Status */}
                        <div className={styles.settingsSection}>
                          <div className={styles.settingsTitle}>
                            🔍 Track Detection Status
                          </div>
                          <div className={styles.settingsNote}>
                            Audio: {audioTracks.length} track{audioTracks.length !== 1 ? 's' : ''} • 
                            Subtitles: {subtitleTracks.length} track{subtitleTracks.length !== 1 ? 's' : ''}
                          </div>
                          {audioTracks.length > 0 && (
                            <div className={styles.settingsNote}>
                              🎵 Use 'A' key to cycle audio tracks
                            </div>
                          )}
                          {subtitleTracks.length > 0 && (
                            <div className={styles.settingsNote}>
                              📝 Use 'S' or 'C' key to cycle subtitles
                            </div>
                          )}
                        </div>
                        
                        {/* Audio Tracks */}
                        {audioTracks.length > 0 && (
                          <div className={styles.settingsSection}>
                            <div className={styles.settingsTitle}>
                              🎵 Audio Tracks
                            </div>
                            {audioTracks.map((track, index) => (
                              <button
                                key={track.id || index}
                                className={`${styles.settingsOption} ${selectedAudioTrack === index ? styles.selected : ''}`}
                                onClick={() => selectAudioTrack(index)}
                                title={`Type: ${track.type || 'unknown'}, Language: ${track.language}`}
                              >
                                <span className={styles.trackIcon}>
                                  {track.enabled ? '🔊' : '🔇'}
                                </span>
                                {track.label}
                                {track.language !== 'unknown' && (
                                  <span className={styles.trackLanguage}>({track.language})</span>
                                )}
                                {track.type && track.type !== 'html5' && (
                                  <span className={styles.trackType}>[{track.type}]</span>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                        
                        {/* Subtitle Tracks */}
                        <div className={styles.settingsSection}>
                          <div className={styles.settingsTitle}>
                            📝 Subtitle Tracks
                          </div>
                          <button
                            className={`${styles.settingsOption} ${selectedSubtitleTrack === -1 ? styles.selected : ''}`}
                            onClick={() => selectSubtitleTrack(-1)}
                          >
                            <span className={styles.trackIcon}>❌</span>
                            Off
                          </button>
                          {subtitleTracks.map((track, index) => (
                            <button
                              key={track.id || index}
                              className={`${styles.settingsOption} ${selectedSubtitleTrack === index ? styles.selected : ''}`}
                              onClick={() => selectSubtitleTrack(index)}
                              title={`Kind: ${track.kind}, Language: ${track.language}, Mode: ${track.mode}`}
                            >
                              <span className={styles.trackIcon}>
                                {track.kind === 'captions' ? '📹' : 
                                 track.kind === 'chapters' ? '📚' : 
                                 track.kind === 'descriptions' ? '🗣️' : '📝'}
                              </span>
                              {track.label}
                              {track.language !== 'unknown' && (
                                <span className={styles.trackLanguage}>({track.language})</span>
                              )}
                              {track.kind && track.kind !== 'subtitles' && (
                                <span className={styles.trackType}>[{track.kind}]</span>
                              )}
                            </button>
                          ))}
                        </div>
                        
                        {audioTracks.length === 0 && subtitleTracks.length === 0 && (
                          <div className={styles.settingsSection}>
                            <div className={styles.settingsTitle}>
                              🔍 No Additional Tracks Detected
                            </div>
                            <p className={styles.settingsNote}>
                              This video appears to have only the default audio track.<br/>
                              Track detection runs automatically when the video loads.
                            </p>
                            <p className={styles.settingsNote}>
                              📹 <strong>For multiple tracks:</strong><br/>
                              • Video file must have embedded audio/subtitle tracks<br/>
                              • All formats (MKV, MP4, AVI, MOV, WebM) now supported<br/>
                              • Some tracks may load after initial detection
                            </p>
                            <p className={styles.settingsNote}>
                              💡 <strong>External subtitles:</strong><br/>
                              Use video editing software or media players that support external .srt/.vtt files
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <button 
                    className={styles.controlButton}
                    onClick={toggleFullscreen}
                    title="Fullscreen"
                  >
                    <Maximize size={20} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }
    
    return (
      <div className={`${styles.videoPlayer} error ${className}`}>
        <div className={styles.errorMessage}>
          <h3>Video Error</h3>
          <p>{error}</p>
          {isMkvSeekingError ? (
            <div className={styles.errorActions}>
              <p className={styles.errorHint}>
                🎬 <strong>MKV seeking is taking too long.</strong>
              </p>
              <p className={styles.formatHint}>
                • Large seeks in MKV files can be very slow<br/>
                • Try seeking to smaller increments (10-20% at a time)<br/>
                • Or restart from beginning for faster access
              </p>
              <div className={styles.buttonGroup}>
                <button 
                  className={styles.retryButton}
                  onClick={() => {
                    if (videoUrl) {
                      console.log('Restarting MKV video from beginning');
                      // Pass the original Google Drive URL to loadVideo
                      loadVideo(videoUrl);
                      setTimeout(() => {
                        if (videoRef.current) {
                          videoRef.current.currentTime = 0;
                        }
                      }, 1000);
                    }
                  }}
                >
                  🔄 Restart from Beginning
                </button>
                <button 
                  className={`${styles.retryButton} ${styles.secondaryButton}`}
                  onClick={() => {
                    // Clear error and continue with current position
                    setError(null);
                    setIsLoading(false);
                  }}
                >
                  ⏭️ Continue Anyway
                </button>
              </div>
            </div>
          ) : isDecodeError ? (
            <div className={styles.errorActions}>
              <p className={styles.errorHint}>
                This error often occurs when seeking in video files. Try:
              </p>
              <button 
                className={styles.retryButton}
                onClick={() => {
                  if (videoUrl) {
                    console.log('Manual recovery: Reloading video from start');
                    // Pass the original Google Drive URL to loadVideo
                    loadVideo(videoUrl);
                    setTimeout(() => {
                      if (videoRef.current) {
                        videoRef.current.currentTime = 0;
                      }
                    }, 1000);
                  }
                }}
              >
                🔄 Reload Video from Start
              </button>
              <p className={styles.formatHint}>
                💡 All video formats are now supported - seeking issues are mainly with MKV files
              </p>
            </div>
          ) : (
            <div className={styles.errorActions}>
              <p className={styles.errorHint}>
                Please check if the Google Drive video URL is correct and the file is accessible.
              </p>
              <p className={styles.formatHint}>
                ✅ All video formats are now supported: MP4, MKV, AVI, MOV, WebM, FLV, WMV, etc.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`${styles.videoPlayer} ${className}`}
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => !isDragging && setShowControls(false)}
    >
      {/* Render appropriate video player based on type */}
      {videoType === 'youtube' ? (
        <div
          id="youtube-player"
          ref={youtubeContainerRef}
          className={styles.videoElement}
        />
      ) : (
        <video 
          {...gdGetVideoProps()}
          className={styles.videoElement}
          poster="/api/placeholder/800/450"
        />
      )}
      
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingSpinner}></div>
          <p>{isReady ? 'Seeking...' : `Loading ${videoType || 'video'}...`}</p>
          {isReady && (
            <div>
              <p className={styles.loadingHint}>
                {videoType === 'youtube' ? 
                  'YouTube video loading...' :
                  (videoUrl && videoUrl.includes('matroska') ? 
                    'MKV seeking can take 15-60 seconds for large jumps' : 
                    'Please wait while video buffers')
                }
              </p>
              {videoType === 'googledrive' && videoUrl && videoUrl.includes('matroska') && (
                <p className={styles.loadingTip}>
                  💡 Tip: Seek in smaller increments for faster response
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {!isReady && videoUrl && !error && (
        <div className={styles.placeholder}>
          <Play size={64} />
          <p>Click to load {videoType === 'youtube' ? 'YouTube' : 'video'}</p>
        </div>
      )}

      {skipFeedback && (
        <div className={styles.skipFeedback}>
          {skipFeedback}
        </div>
      )}

      {showControls && isReady && (
        <div className={styles.videoControls}>
          <div className="controls-background"></div>
          
          {/* Enhanced format indicator */}
          {videoUrl && (
            <div className={styles.formatIndicator}>
              {videoType === 'youtube' ? 
                '🎬 YouTube Video' : 
                '🎬 All formats supported - MKV seeking may be limited'
              }
            </div>
          )}
          
          {/* Keyboard shortcuts help */}
          {isHost && (
            <div className={styles.keyboardHelp}>
              <span>⌨️ Space/K: Play/Pause • ←/J: -10s • →/L: +10s • M: Mute • F: Fullscreen • A: Audio Track • S/C: Subtitles</span>
            </div>
          )}
          
          {/* Progress bar */}
          <div className={styles.progressContainer}>
            <div 
              ref={progressRef}
              className={styles.progressBar}
              onClick={handleProgressClick}
              onMouseDown={handleProgressMouseDown}
              onMouseMove={handleProgressMouseMove}
              onMouseUp={handleProgressMouseUp}
            >
              <div 
                className={styles.progressFilled}
                style={{ width: `${progressPercentage}%` }}
              />
              <div 
                className={styles.progressThumb}
                style={{ left: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Control buttons */}
          <div className={styles.controlsRow}>
            <div className={styles.controlsLeft}>
              {isHost && (
                <>
                  <button 
                    className={`${styles.controlButton} ${styles.skipButton}`}
                    onClick={() => skip(-10)}
                    title="Skip back 10s (←/J)"
                  >
                    <SkipBack size={20} />
                    <span className={styles.skipLabel}>10</span>
                  </button>
                  
                  <button 
                    className={`${styles.controlButton} ${styles.playPause}`}
                    onClick={handlePlayPause}
                    title={isPlaying ? 'Pause (Space/K)' : 'Play (Space/K)'}
                  >
                    {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                  </button>
                  
                  <button 
                    className={`${styles.controlButton} ${styles.skipButton}`}
                    onClick={() => skip(10)}
                    title="Skip forward 10s (→/L)"
                  >
                    <SkipForward size={20} />
                    <span className={styles.skipLabel}>10</span>
                  </button>
                </>
              )}
              
              {!isHost && (
                <div className={styles.followerIndicator}>
                  <span>{isPlaying ? '▶' : '⏸'} Following host</span>
                </div>
              )}
              
              <div className={styles.timeDisplay}>
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            <div className={styles.controlsRight}>
              {/* Volume control - only show for Google Drive videos */}
              {videoType === 'googledrive' && (
                <div 
                  className={styles.volumeControl}
                  onMouseEnter={() => setShowVolumeSlider(true)}
                  onMouseLeave={() => setShowVolumeSlider(false)}
                >
                  <button 
                    className={styles.controlButton}
                    onClick={toggleMute}
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </button>
                  
                  {showVolumeSlider && (
                    <div className={styles.volumeSlider}>
                      <div 
                        ref={volumeRef}
                        className={styles.volumeBar}
                        onClick={handleVolumeClick}
                      >
                        <div 
                          className={styles.volumeFilled}
                          style={{ width: `${volumePercentage}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* YouTube volume note */}
              {videoType === 'youtube' && (
                <div className={styles.youtubeVolumeNote}>
                  🎵 Use YouTube player controls for volume
                </div>
              )}
              
              {/* Settings Menu */}
              <div 
                className={styles.settingsControl}
                onClick={() => setShowSettingsMenu((prev) => !prev)}
              >
                <button 
                  className={styles.controlButton}
                  title="Audio & Subtitles"
                >
                  <Settings size={20} />
                </button>
                
                {showSettingsMenu && (
                  <div className={styles.settingsMenu}>
                    {/* Video Type Information */}
                    <div className={styles.settingsSection}>
                      <div className={styles.settingsTitle}>
                        🎬 Video Source
                      </div>
                      <div className={styles.settingsNote}>
                        {videoType === 'youtube' ? 
                          '🔗 YouTube Video' : 
                          '📁 Google Drive / Direct Video File'
                        }
                      </div>
                      {videoType === 'youtube' && (
                        <div className={styles.settingsNote}>
                          💡 YouTube videos use native YouTube player controls for best quality
                        </div>
                      )}
                    </div>

                    {/* Track Detection Status - only for Google Drive videos */}
                    {videoType === 'googledrive' && (
                      <div className={styles.settingsSection}>
                        <div className={styles.settingsTitle}>
                          🔍 Track Detection Status
                        </div>
                        <div className={styles.settingsNote}>
                          Audio: {audioTracks.length} track{audioTracks.length !== 1 ? 's' : ''} • 
                          Subtitles: {subtitleTracks.length} track{subtitleTracks.length !== 1 ? 's' : ''}
                        </div>
                        {audioTracks.length > 0 && (
                          <div className={styles.settingsNote}>
                            🎵 Use 'A' key to cycle audio tracks
                          </div>
                        )}
                        {subtitleTracks.length > 0 && (
                          <div className={styles.settingsNote}>
                            📝 Use 'S' or 'C' key to cycle subtitles
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Audio Tracks - only for Google Drive videos */}
                    {videoType === 'googledrive' && audioTracks.length > 0 && (
                      <div className={styles.settingsSection}>
                        <div className={styles.settingsTitle}>
                          🎵 Audio Tracks
                        </div>
                        {audioTracks.map((track, index) => (
                          <button
                            key={track.id || index}
                            className={`${styles.settingsOption} ${selectedAudioTrack === index ? styles.selected : ''}`}
                            onClick={() => selectAudioTrack(index)}
                            title={`Type: ${track.type || 'unknown'}, Language: ${track.language}`}
                          >
                            <span className={styles.trackIcon}>
                              {track.enabled ? '🔊' : '🔇'}
                            </span>
                            {track.label}
                            {track.language !== 'unknown' && (
                              <span className={styles.trackLanguage}>({track.language})</span>
                            )}
                            {track.type && track.type !== 'html5' && (
                              <span className={styles.trackType}>[{track.type}]</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* Subtitle Tracks - only for Google Drive videos */}
                    {videoType === 'googledrive' && (
                      <div className={styles.settingsSection}>
                        <div className={styles.settingsTitle}>
                          📝 Subtitle Tracks
                        </div>
                        <button
                          className={`${styles.settingsOption} ${selectedSubtitleTrack === -1 ? styles.selected : ''}`}
                          onClick={() => selectSubtitleTrack(-1)}
                        >
                          <span className={styles.trackIcon}>❌</span>
                          Off
                        </button>
                        {subtitleTracks.map((track, index) => (
                          <button
                            key={track.id || index}
                            className={`${styles.settingsOption} ${selectedSubtitleTrack === index ? styles.selected : ''}`}
                            onClick={() => selectSubtitleTrack(index)}
                            title={`Kind: ${track.kind}, Language: ${track.language}, Mode: ${track.mode}`}
                          >
                            <span className={styles.trackIcon}>
                              {track.kind === 'captions' ? '📹' : 
                               track.kind === 'chapters' ? '📚' : 
                               track.kind === 'descriptions' ? '🗣️' : '📝'}
                            </span>
                            {track.label}
                            {track.language !== 'unknown' && (
                              <span className={styles.trackLanguage}>({track.language})</span>
                            )}
                            {track.kind && track.kind !== 'subtitles' && (
                              <span className={styles.trackType}>[{track.kind}]</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* YouTube info */}
                    {videoType === 'youtube' && (
                      <div className={styles.settingsSection}>
                        <div className={styles.settingsTitle}>
                          📹 YouTube Features
                        </div>
                        <div className={styles.settingsNote}>
                          • Audio/subtitle tracks managed by YouTube<br/>
                          • Use YouTube's built-in controls for quality settings<br/>
                          • Captions available via YouTube player menu<br/>
                          • Volume controlled through YouTube interface
                        </div>
                      </div>
                    )}
                    
                    {/* No tracks message - only for Google Drive videos */}
                    {videoType === 'googledrive' && audioTracks.length === 0 && subtitleTracks.length === 0 && (
                      <div className={styles.settingsSection}>
                        <div className={styles.settingsTitle}>
                          🔍 No Additional Tracks Detected
                        </div>
                        <p className={styles.settingsNote}>
                          This video appears to have only the default audio track.<br/>
                          Track detection runs automatically when the video loads.
                        </p>
                        <p className={styles.settingsNote}>
                          📹 <strong>For multiple tracks:</strong><br/>
                          • Video file must have embedded audio/subtitle tracks<br/>
                          • MKV, MP4, and WebM formats support multiple tracks<br/>
                          • Some tracks may load after initial detection
                        </p>
                        <p className={styles.settingsNote}>
                          💡 <strong>External subtitles:</strong><br/>
                          Use video editing software or media players that support external .srt/.vtt files
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <button 
                className={styles.controlButton}
                onClick={toggleFullscreen}
                title="Fullscreen"
              >
                <Maximize size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default VideoPlayer;
