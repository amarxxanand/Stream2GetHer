import { useState, useEffect, useRef, useCallback } from 'react';

export const useVideoPlayer = (onStateChange, onReady, onTimeUpdate) => {
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const videoRef = useRef(null);
  const lastUserActionRef = useRef(null);
  const syncTimeRef = useRef(0);

  // Video event handlers
  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setIsReady(true);
      onReady && onReady();
    }
  }, [onReady]);

  const handleCanPlay = useCallback(() => {
    setIsLoading(false);
    // Clear any previous errors when video successfully loads
    setError(null);
  }, []);

  const handleWaiting = useCallback(() => {
    setIsLoading(true);
    console.log('🔄 Video buffering...');
  }, []);

  const handleCanPlayThrough = useCallback(() => {
    setIsLoading(false);
    console.log('✅ Video ready to play through');
  }, []);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    if (onStateChange && lastUserActionRef.current !== 'programmatic') {
      onStateChange({ type: 'play', currentTime: videoRef.current?.currentTime || 0 });
    }
    lastUserActionRef.current = null;
  }, [onStateChange]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    if (onStateChange && lastUserActionRef.current !== 'programmatic') {
      onStateChange({ type: 'pause', currentTime: videoRef.current?.currentTime || 0 });
    }
    lastUserActionRef.current = null;
  }, [onStateChange]);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      setCurrentTime(current);
      if (onTimeUpdate) {
        onTimeUpdate(current);
      }
    }
  }, [onTimeUpdate]);

  const handleSeeked = useCallback(() => {
    setIsLoading(false);
    if (onStateChange && lastUserActionRef.current !== 'programmatic') {
      onStateChange({ 
        type: 'seek', 
        currentTime: videoRef.current?.currentTime || 0 
      });
    }
    lastUserActionRef.current = null;
    console.log('✅ Seek completed successfully');
  }, [onStateChange]);

  const handleError = useCallback((e) => {
    const error = e.target.error;
    let errorMessage = 'An error occurred while loading the video';
    
    if (error) {
      errorMessage = `Video error: ${error.message}`;
      
      // Log specific details for debugging
      console.error('Video player error details:', {
        code: error.code,
        message: error.message,
        currentTime: e.target.currentTime,
        readyState: e.target.readyState,
        networkState: e.target.networkState,
        src: e.target.src
      });
      
      // Specific handling for decode errors during seeking
      if (error.code === 3 && error.message.includes('PIPELINE_ERROR_DECODE')) {
        console.warn('Decode error detected - this may be due to seeking to a non-keyframe position');
        
        const videoSrc = e.target.src || '';
        const isMkvStream = videoSrc.includes('matroska') || videoSrc.includes('mkv');
        
        if (isMkvStream) {
          errorMessage = 'MKV decode error during seeking. Attempting quick recovery...';
          
          // For MKV files, implement faster recovery
          setTimeout(() => {
            if (videoRef.current && videoRef.current.src) {
              console.log('🚀 Quick MKV recovery: Reloading current position');
              
              const currentTime = e.target.currentTime || 0;
              const src = videoRef.current.src;
              
              // Clear error and show loading briefly
              setError(null);
              setIsLoading(true);
              
              // Quick reload without full restart
              videoRef.current.load();
              
              videoRef.current.addEventListener('loadeddata', () => {
                if (videoRef.current) {
                  // Try to seek to a nearby safe position (round down to 10-second intervals)
                  const safeTime = Math.floor(currentTime / 10) * 10;
                  videoRef.current.currentTime = safeTime;
                  setIsLoading(false);
                  console.log(`✅ Quick recovery complete - seeked to ${safeTime}s`);
                }
              }, { once: true });
              
              // Fallback timeout
              setTimeout(() => {
                setIsLoading(false);
              }, 3000);
            }
          }, 500); // Much faster recovery - only 500ms delay
        } else {
          errorMessage = 'Video decode error during seeking. Try seeking to a different position.';
        }
      }
    }
    
    setError(errorMessage);
    setIsLoading(false);
    console.error('Video player error:', error);
  }, []);

  const handleVolumeChange = useCallback(() => {
    if (videoRef.current) {
      setVolume(videoRef.current.volume);
    }
  }, []);

  // Player control methods
  const play = useCallback(() => {
    if (videoRef.current) {
      lastUserActionRef.current = 'programmatic';
      const playPromise = videoRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error('Error playing video:', error);
          setError('Failed to play video');
        });
      }
    }
  }, []);

  const pause = useCallback(() => {
    if (videoRef.current) {
      lastUserActionRef.current = 'programmatic';
      videoRef.current.pause();
    }
  }, []);

    const seekTo = useCallback((time, allowSeekAhead = true) => {
    if (videoRef.current && typeof time === 'number' && !isNaN(time)) {
      lastUserActionRef.current = 'programmatic';
      
      // Clear any previous error before seeking
      setError(null);
      
      // Clamp time to valid range
      const clampedTime = Math.max(0, Math.min(time, duration));
      
      try {
        // For MKV files, show warning but still allow seeking
        const videoSrc = videoRef.current.src || '';
        const isMkvStream = videoSrc.includes('matroska') || videoSrc.includes('mkv');
        
        if (isMkvStream) {
          // For MKV files, warn about potential seeking issues but still allow it
          const currentTime = videoRef.current.currentTime;
          const seekDistance = Math.abs(clampedTime - currentTime);
          const seekPercentage = (clampedTime / duration) * 100;
          
          // For large seeks, show a helpful message
          if (seekPercentage > 10 || seekDistance > 30) {
            console.log(`🎬 Large MKV seek to ${seekPercentage.toFixed(1)}% (${seekDistance.toFixed(1)}s) - may be slow`);
            setError(`ℹ️ MKV seeking: Jumping to ${seekPercentage.toFixed(1)}% may be slow or not work properly. Please be patient.`);
            setIsLoading(true);
            
            // Set a timeout for seek feedback
            const seekTimeout = setTimeout(() => {
              setIsLoading(false);
              setError('ℹ️ MKV file: Seeking may not work as expected. This is normal for MKV files in browsers.');
            }, 10000); // 10 second timeout
            
            // Try the seek
            videoRef.current.currentTime = clampedTime;
            syncTimeRef.current = clampedTime;
            
            // Clear timeout if seek succeeds
            const handleSeekSuccess = () => {
              clearTimeout(seekTimeout);
              setIsLoading(false);
              setError('ℹ️ MKV file detected: Seeking may not work properly or may be slow.');
              videoRef.current.removeEventListener('seeked', handleSeekSuccess);
              videoRef.current.removeEventListener('canplay', handleSeekSuccess);
            };
            
            videoRef.current.addEventListener('seeked', handleSeekSuccess, { once: true });
            videoRef.current.addEventListener('canplay', handleSeekSuccess, { once: true });
            
          } else {
            // Quick seeks work normally, but still show MKV info
            console.log(`🎬 Quick MKV seek: ${seekDistance.toFixed(1)}s`);
            videoRef.current.currentTime = clampedTime;
            syncTimeRef.current = clampedTime;
            if (!error || !error.includes('MKV file detected')) {
              setError('ℹ️ MKV file detected: Seeking may not work properly or may be slow.');
            }
          }
        } else {
          // Normal seeking for other formats
          videoRef.current.currentTime = clampedTime;
          syncTimeRef.current = clampedTime;
        }
        
        console.log(`Seeking to ${clampedTime}s (${Math.round(clampedTime/duration*100)}% of video)`);
      } catch (err) {
        console.error('Error during seek operation:', err);
        setError('Failed to seek to the requested position');
      }
    }
  }, [duration]);

  const setVideoVolume = useCallback((vol) => {
    if (videoRef.current && typeof vol === 'number' && vol >= 0 && vol <= 1) {
      videoRef.current.volume = vol;
    }
  }, []);

    const loadVideo = useCallback((videoUrl) => {
    if (!videoRef.current || !videoUrl) return;
    
    // Prevent multiple concurrent loading attempts
    if (isLoading) {
      console.log('🔄 Video already loading, ignoring duplicate request');
      return;
    }
    
    setError(null);
    setIsLoading(true);
    
    console.log('🎬 Loading video:', videoUrl);
    
    const video = videoRef.current;
    
    // Reset video state
    video.removeAttribute('src');
    video.load();
    
    // Check video info and determine best streaming method
    const checkVideoInfo = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_SERVER_URL || 'http://localhost:3000'}/api/video/info?url=${encodeURIComponent(videoUrl)}`);
        
        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`);
        }
        
        const info = await response.json();
        
        // Validate info object structure
        if (!info || typeof info !== 'object') {
          throw new Error('Invalid video info response');
        }
        
        console.log('📋 Video info received:', {
          name: info.name,
          mimeType: info.mimeType,
          size: info.sizeFormatted,
          needsTranscoding: info.needsTranscoding,
          ffmpegAvailable: info.ffmpegAvailable,
          browserCompatible: info.browserCompatible,
          isMKVFile: info.isMKVFile
        });
        
        let streamUrl;
        let isTranscoded = false;
        const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';
        
        // Always try direct streaming first, with transcoding as fallback
        console.log('✅ Using direct video stream for all formats');
        streamUrl = (info.streamUrl && info.streamUrl.startsWith('http')) ? info.streamUrl : `${serverUrl}${info.streamUrl || ''}`;
        
        // Show MKV seeking warning if applicable
        if (info.isMKVFile) {
          setError('ℹ️ MKV file detected: Video will play normally, but seeking (jumping to specific times) may not work properly or may be slow.');
        }
        
        return { streamUrl, isTranscoded, info };
      } catch (error) {
        console.warn('⚠️ Could not get video info, falling back to direct stream:', error);
        const fallbackUrl = `${import.meta.env.VITE_SERVER_URL || 'http://localhost:3000'}/api/video/stream?url=${encodeURIComponent(videoUrl)}`;
        return { streamUrl: fallbackUrl, isTranscoded: false, info: null };
      }
    };
    
    // Load video with appropriate stream URL
    checkVideoInfo().then(({ streamUrl, isTranscoded, info }) => {
      // Add debugging event listeners
      const onCanPlay = () => {
        console.log('✅ Video can start playing');
        setIsReady(true);
        setIsLoading(false);
        
        // Keep MKV warning visible even when video is ready
        if (info?.isMKVFile && !error?.includes('ℹ️ MKV file detected')) {
          setError('ℹ️ MKV file detected: Video will play normally, but seeking (jumping to specific times) may not work properly or may be slow.');
        } else if (!info?.isMKVFile) {
          setError(null); // Clear other errors for non-MKV files
        }
        
        if (isTranscoded) {
          console.log('🎉 Successfully loaded transcoded video');
        }
      };
      
      const onLoadStart = () => {
        console.log('� Video loading started');
        if (isTranscoded) {
          setError('🔄 Real-time transcoding in progress... Please wait for the video to start.');
        }
      };
      
      const onProgress = () => {
        const buffered = video.buffered.length > 0 ? video.buffered.end(0) : 0;
        const duration = video.duration || 0;
        const bufferedPercent = duration > 0 ? (buffered / duration * 100).toFixed(1) : 0;
        
        console.log('📊 Video loading progress:', {
          buffered: buffered.toFixed(1) + 's',
          duration: duration.toFixed(1) + 's',
          percent: bufferedPercent + '%',
          transcoded: isTranscoded
        });
        
        // For transcoded videos, show progress in the error message
        if (isTranscoded && bufferedPercent > 0) {
          setError(`🔄 Transcoding: ${bufferedPercent}% buffered. Please wait...`);
        }
      };
      
      const onLoadedMetadata = () => {
        console.log('📋 Video metadata loaded:', {
          duration: video.duration,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          transcoded: isTranscoded,
          originalFormat: info?.mimeType
        });
        
        if (isTranscoded) {
          console.log('✅ Transcoded video metadata ready');
          setError('🔄 Transcoding complete! Video should start playing shortly...');
        }
      };
      
      const onWaiting = () => {
        console.log('⏳ Video buffering...');
        setIsLoading(true);
        
        if (isTranscoded) {
          setError('🔄 Transcoding more content... Please wait.');
        }
      };
      
      const onCanPlayThrough = () => {
        console.log('✅ Video can play through');
        setIsLoading(false);
        setError(null);
        
        if (isTranscoded) {
          console.log('🎉 Transcoded video ready to play through');
        }
      };
      
      const onVideoError = (e) => {
        console.error('❌ Video playback error:', e);
        console.error('❌ Error details:', {
          error: e.target.error,
          code: e.target.error?.code,
          message: e.target.error?.message,
          src: e.target.src,
          readyState: e.target.readyState,
          networkState: e.target.networkState,
          transcoded: isTranscoded,
          originalFormat: info?.mimeType
        });
        
        let errorMessage = '❌ Video playback failed.';
        
        if (e.target.error) {
          const errorCode = e.target.error.code;
          const errorMsg = e.target.error.message;
          
          switch (errorCode) {
            case 1: // MEDIA_ERR_ABORTED
              errorMessage = '❌ Video loading was aborted. Try refreshing the page.';
              break;
            case 2: // MEDIA_ERR_NETWORK
              errorMessage = '❌ Network error while loading video. Check your internet connection.';
              break;
            case 3: // MEDIA_ERR_DECODE
              errorMessage = '❌ Video decode error. The video format may be corrupted or unsupported.';
              break;
            case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
              if (isTranscoded) {
                errorMessage = '❌ Transcoded video source not supported. This may be a server issue.';
              } else if (info?.needsTranscoding) {
                errorMessage = '❌ Video format not supported by browser. Transcoding failed or unavailable.';
              } else {
                errorMessage = '❌ Video format not supported by browser.';
              }
              break;
            default:
              errorMessage = `❌ Video error (${errorCode}): ${errorMsg}`;
          }
        }
        
        if (isTranscoded) {
          errorMessage += ' (Transcoded stream)';
        }
        
        setError(errorMessage);
        setIsLoading(false);
      };
      
      // Add temporary event listeners for debugging
      video.addEventListener('loadstart', onLoadStart, { once: true });
      video.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
      video.addEventListener('canplay', onCanPlay, { once: true });
      video.addEventListener('waiting', onWaiting);
      video.addEventListener('canplaythrough', onCanPlayThrough);
      video.addEventListener('error', onVideoError);
      video.addEventListener('progress', onProgress);
      
      // Clean up listeners after timeout
      const fileSizeGB = info?.size ? info.size / (1024 * 1024 * 1024) : 0;
      let timeoutDuration;
      
      if (isTranscoded) {
        if (fileSizeGB > 3) {
          timeoutDuration = 300000; // 5 minutes for very large files (>3GB)
        } else if (fileSizeGB > 1.5) {
          timeoutDuration = 180000; // 3 minutes for large files (>1.5GB)
        } else {
          timeoutDuration = 120000; // 2 minutes for regular transcoded files
        }
      } else {
        timeoutDuration = 30000; // 30s for direct streaming
      }
      
      setTimeout(() => {
        video.removeEventListener('progress', onProgress);
        video.removeEventListener('waiting', onWaiting);
        video.removeEventListener('canplaythrough', onCanPlayThrough);
        video.removeEventListener('error', onVideoError);
      }, timeoutDuration);
      
      // Set source and start loading
      console.log(`📡 Starting ${isTranscoded ? 'transcoded' : 'direct'} video stream:`);
      console.log('🔗 Stream URL:', streamUrl);
      console.log('🎬 Video element ready state before load:', video.readyState);
      video.src = streamUrl;
      video.load();
      
      // Extended timeout for transcoded videos
      const loadTimeout = setTimeout(() => {
        if (video.readyState < 3) {
          console.warn('⏰ Video loading timeout - readyState:', video.readyState);
          console.warn('Network state:', video.networkState);
          
          if (isTranscoded) {
            const fileSizeInfo = info?.sizeFormatted || 'large';
            const expectedTime = fileSizeGB > 3 ? '5-8 minutes' : fileSizeGB > 1.5 ? '3-5 minutes' : '2-3 minutes';
            setError(`⏰ Large file transcoding in progress (${fileSizeInfo}). This can take ${expectedTime} to start playing. The server is actively processing - please be patient and avoid refreshing.`);
          } else if (video.networkState === 3) {
            setError('❌ Video source could not be loaded - check the video URL and your internet connection');
          } else if (video.networkState === 2) {
            setError('⏳ Video is loading slowly - please wait or try a different video');
          } else {
            setError('⏰ Video loading timeout - the video may be too large or the connection is slow');
          }
          setIsLoading(false);
        }
      }, timeoutDuration);
      
      // Clear timeout when video loads
      const clearTimeoutOnLoad = () => {
        clearTimeout(loadTimeout);
      };
      
      video.addEventListener('canplay', clearTimeoutOnLoad, { once: true });
      video.addEventListener('error', clearTimeoutOnLoad, { once: true });
    }).catch(error => {
      console.error('Failed to load video:', error);
      setError('Failed to load video information');
      setIsLoading(false);
    });
    
  }, []);

  const getCurrentTime = useCallback(() => {
    return videoRef.current ? videoRef.current.currentTime : 0;
  }, []);

  const getDuration = useCallback(() => {
    return videoRef.current ? videoRef.current.duration : 0;
  }, []);

  const getVolume = useCallback(() => {
    return videoRef.current ? videoRef.current.volume : 1;
  }, []);

  // Format time for display
  const formatTime = useCallback((time) => {
    if (!time || isNaN(time)) return '0:00';
    
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Video element props
  const getVideoProps = useCallback(() => ({
    ref: videoRef,
    onLoadedMetadata: handleLoadedMetadata,
    onCanPlay: handleCanPlay,
    onCanPlayThrough: handleCanPlayThrough,
    onWaiting: handleWaiting,
    onPlay: handlePlay,
    onPause: handlePause,
    onTimeUpdate: handleTimeUpdate,
    onSeeked: handleSeeked,
    onError: handleError,
    onVolumeChange: handleVolumeChange,
    controls: false, // We'll use custom controls
    preload: 'metadata',
    crossOrigin: 'anonymous', // Allow CORS requests
    playsInline: true, // Needed for mobile devices
    autoPlay: false,
    muted: false
  }), [
    handleLoadedMetadata,
    handleCanPlay, 
    handleCanPlayThrough,
    handleWaiting,
    handlePlay,
    handlePause,
    handleTimeUpdate,
    handleSeeked,
    handleError,
    handleVolumeChange
  ]);

  return {
    // State
    isReady,
    isPlaying,
    duration,
    currentTime,
    volume,
    error,
    isLoading,
    
    // Control methods
    play,
    pause,
    seekTo,
    setVolume: setVideoVolume,
    loadVideo,
    
    // Getters
    getCurrentTime,
    getDuration,
    getVolume,
    
    // Utilities
    formatTime,
    getVideoProps,
    
    // Ref for direct access
    videoRef
  };
};
