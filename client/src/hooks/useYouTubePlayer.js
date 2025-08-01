import { useState, useEffect, useRef, useCallback } from 'react';

// YouTube Player States
const PLAYER_STATES = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5
};

export const useYouTubePlayer = (containerId, onStateChange, onReady) => {
  const [isReady, setIsReady] = useState(false);
  const [playerState, setPlayerState] = useState(PLAYER_STATES.UNSTARTED);
  const [isAPILoaded, setIsAPILoaded] = useState(false);
  const playerRef = useRef(null);
  const lastUserActionRef = useRef(null);

  // Load YouTube IFrame API
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setIsAPILoaded(true);
      return;
    }

    if (document.querySelector('script[src*="iframe_api"]')) {
      // Script is already loading, wait for it
      const checkYT = setInterval(() => {
        if (window.YT && window.YT.Player) {
          setIsAPILoaded(true);
          clearInterval(checkYT);
        }
      }, 100);
      return () => clearInterval(checkYT);
    }

    // Load the API script
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    document.head.appendChild(script);

    window.onYouTubeIframeAPIReady = () => {
      setIsAPILoaded(true);
    };

    return () => {
      if (window.onYouTubeIframeAPIReady) {
        delete window.onYouTubeIframeAPIReady;
      }
    };
  }, []);

  // Initialize player when API is loaded
  useEffect(() => {
    if (!isAPILoaded || !containerId) return;

    const initializePlayer = () => {
      try {
        playerRef.current = new window.YT.Player(containerId, {
          height: '100%',
          width: '100%',
          playerVars: {
            autoplay: 0,
            controls: 1,
            disablekb: 0,
            enablejsapi: 1,
            fs: 1,
            modestbranding: 1,
            playsinline: 1,
            rel: 0
          },
          events: {
            onReady: (event) => {
              setIsReady(true);
              if (onReady) onReady(event);
            },
            onStateChange: (event) => {
              setPlayerState(event.data);
              if (onStateChange) onStateChange(event);
            }
          }
        });
      } catch (error) {
        console.error('Error initializing YouTube player:', error);
      }
    };

    // Small delay to ensure DOM element exists
    const timeout = setTimeout(initializePlayer, 100);
    return () => clearTimeout(timeout);
  }, [isAPILoaded, containerId, onStateChange, onReady]);

  // Control functions
  const play = useCallback(() => {
    if (playerRef.current && isReady) {
      lastUserActionRef.current = 'play';
      playerRef.current.playVideo();
    }
  }, [isReady]);

  const pause = useCallback(() => {
    if (playerRef.current && isReady) {
      lastUserActionRef.current = 'pause';
      playerRef.current.pauseVideo();
    }
  }, [isReady]);

  const seekTo = useCallback((seconds, allowSeekAhead = true) => {
    if (playerRef.current && isReady) {
      lastUserActionRef.current = 'seek';
      playerRef.current.seekTo(seconds, allowSeekAhead);
    }
  }, [isReady]);

  const loadVideoById = useCallback((videoId, startSeconds = 0) => {
    if (playerRef.current && isReady) {
      lastUserActionRef.current = 'loadVideo';
      playerRef.current.loadVideoById({
        videoId,
        startSeconds
      });
    }
  }, [isReady]);

  const getCurrentTime = useCallback(() => {
    if (playerRef.current && isReady) {
      return playerRef.current.getCurrentTime();
    }
    return 0;
  }, [isReady]);

  const getDuration = useCallback(() => {
    if (playerRef.current && isReady) {
      return playerRef.current.getDuration();
    }
    return 0;
  }, [isReady]);

  const getPlayerState = useCallback(() => {
    if (playerRef.current && isReady) {
      return playerRef.current.getPlayerState();
    }
    return PLAYER_STATES.UNSTARTED;
  }, [isReady]);

  const getVideoUrl = useCallback(() => {
    if (playerRef.current && isReady) {
      return playerRef.current.getVideoUrl();
    }
    return '';
  }, [isReady]);

  const getVideoId = useCallback(() => {
    if (playerRef.current && isReady) {
      const url = playerRef.current.getVideoUrl();
      const match = url.match(/[?&]v=([^&]+)/);
      return match ? match[1] : null;
    }
    return null;
  }, [isReady]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy();
      }
    };
  }, []);

  return {
    player: playerRef.current,
    isReady,
    playerState,
    isAPILoaded,
    lastUserAction: lastUserActionRef.current,
    // Control methods
    play,
    pause,
    seekTo,
    loadVideoById,
    getCurrentTime,
    getDuration,
    getPlayerState,
    getVideoUrl,
    getVideoId,
    // Constants
    PLAYER_STATES
  };
};
