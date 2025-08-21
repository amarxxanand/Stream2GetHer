import { spawn } from 'child_process';
import { PassThrough } from 'stream';
import path from 'path';

class TranscodingService {
  constructor() {
    this.activeTranscodings = new Map();
    this.transcodingQueue = new Map();
  }

  // Check if FFmpeg is available
  async checkFFmpegAvailability() {
    return new Promise((resolve) => {
      const ffmpeg = spawn('ffmpeg', ['-version'], { stdio: 'pipe' });
      
      let output = '';
      ffmpeg.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      ffmpeg.on('close', (code) => {
        if (code === 0) {
          const versionMatch = output.match(/ffmpeg version ([^\s]+)/);
          const version = versionMatch ? versionMatch[1] : 'unknown';
          console.log('✅ FFmpeg is available - version:', version);
          resolve(true);
        } else {
          console.error('❌ FFmpeg is not available or not working properly');
          console.error('Install FFmpeg with: sudo apt-get install ffmpeg');
          resolve(false);
        }
      });
      
      ffmpeg.on('error', (error) => {
        console.error('❌ FFmpeg check failed:', error.message);
        console.error('Install FFmpeg with: sudo apt-get install ffmpeg');
        resolve(false);
      });
    });
  }

  // Check if a file format needs transcoding
  needsTranscoding(mimeType, fileName) {
    // Allow all formats to play directly - transcoding is optional
    // Users can manually request transcoding if needed
    return false;
    
    // Keep the original logic commented for reference
    /*
    const needsTranscodingTypes = [
      'video/x-matroska', // MKV
      'video/mkv',
      'video/avi',
      'video/x-msvideo',
      'video/mov',
      'video/quicktime',
      'video/x-flv',
      'video/wmv',
      'video/webm' // Sometimes needs transcoding for better compatibility
    ];
    
    const needsTranscodingExtensions = ['.mkv', '.avi', '.mov', '.flv', '.wmv'];
    
    return needsTranscodingTypes.includes(mimeType) || 
           needsTranscodingExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
    */
  }

  // Check if a file is MKV format (for seeking limitations warning)
  isMKVFile(mimeType, fileName) {
    const mkvTypes = [
      'video/x-matroska',
      'video/mkv'
    ];
    
    const mkvExtensions = ['.mkv'];
    
    return mkvTypes.includes(mimeType) || 
           mkvExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
  }

  // Get optimal transcoding settings based on file characteristics
  getTranscodingSettings(metadata) {
    const {
      mimeType = '',
      size = 0,
      name = ''
    } = metadata;

    // Base settings for real-time transcoding
    let settings = {
      videoCodec: 'libx264',
      audioCodec: 'aac',
      preset: 'ultrafast', // Fastest encoding
      crf: '28', // Higher CRF for faster encoding (lower quality but acceptable)
      audioChannels: 2,
      audioSampleRate: '44100',
      movflags: 'frag_keyframe+empty_moov+faststart',
      bufferSize: '2M',
      maxrate: '5000k', // Limit bitrate for streaming
      tune: 'zerolatency' // Optimize for low latency
    };

    // Adjust settings based on file size
    const fileSizeGB = size / (1024 * 1024 * 1024);
    const estimatedDuration = metadata.duration || (size / (1024 * 1024 * 5)); // Rough estimate: 5MB per second
    
    // Special settings for very short videos (under 10 seconds)
    if (estimatedDuration < 10) {
      settings.preset = 'ultrafast'; // Fastest possible for short videos
      settings.crf = '30'; // Higher CRF for speed
      settings.maxrate = '1000k'; // Lower bitrate for immediate output
      settings.bufferSize = '512k'; // Very small buffer for instant output
      settings.movflags = 'frag_keyframe+empty_moov+faststart'; // Minimal flags for speed
      settings.tune = 'zerolatency'; // Prioritize speed over quality
      console.log('⚡ Short video detected - using ultra-fast transcoding settings');
    } else if (fileSizeGB > 2) {
      // For large files, prioritize speed and better streaming for big MKV files
      settings.preset = 'ultrafast'; // Use ultrafast for maximum speed
      settings.crf = '30'; // Better quality for large files (reduced from 32)
      settings.maxrate = '3000k'; // Higher bitrate for better quality on large files
      settings.bufferSize = '2M'; // Larger buffer for large files (increased from 1M)
      settings.movflags = 'frag_keyframe+empty_moov+faststart+dash'; // Better progressive streaming
      settings.tune = 'film'; // Better for movie content typically found in large files
      console.log('🎬 Large file detected - using optimized settings for better quality/speed balance');
    } else if (fileSizeGB < 0.5) {
      // For small files, we can afford slightly better quality
      settings.preset = 'veryfast';
      settings.crf = '26';
      settings.maxrate = '8000k';
    }

    // Specific adjustments for MKV files
    if (mimeType.includes('matroska') || name.toLowerCase().endsWith('.mkv')) {
      if (fileSizeGB > 2) {
        // Large MKV files need special handling for better browser compatibility
        settings.tune = 'film'; // Better for movie content
        settings.bufferSize = '4M'; // Large buffer for MKV (increased)
        settings.maxrate = '4000k'; // Higher bitrate for large MKV files
        settings.crf = '28'; // Better balance for large MKV files
        console.log('🎭 Large MKV file detected - using movie-optimized settings');
      } else {
        settings.tune = 'film'; // Better for MKV content
        settings.bufferSize = '2M'; // Standard buffer for smaller MKV
      }
    }

    return settings;
  }

  // Create a real-time transcoding stream
  createTranscodingStream(inputStream, metadata, options = {}) {
    const settings = this.getTranscodingSettings(metadata);
    const finalSettings = { ...settings, ...options };

    // Check if this is a short video for optimized arguments
    const estimatedDuration = metadata.duration || (metadata.size / (1024 * 1024 * 5));
    const isShortVideo = estimatedDuration < 10;

    // FFmpeg arguments for real-time transcoding
    const ffmpegArgs = [
      '-i', 'pipe:0', // Input from stdin
      '-c:v', finalSettings.videoCodec,
      '-c:a', finalSettings.audioCodec,
      '-preset', finalSettings.preset,
      '-crf', finalSettings.crf,
      '-ac', finalSettings.audioChannels.toString(),
      '-ar', finalSettings.audioSampleRate,
      '-tune', finalSettings.tune,
      '-bufsize', finalSettings.bufferSize,
      '-maxrate', finalSettings.maxrate,
      '-f', 'mp4',
      '-movflags', finalSettings.movflags,
      '-avoid_negative_ts', 'make_zero',
      '-fflags', '+genpts+flush_packets', // Force packet flushing for immediate output
      '-reset_timestamps', '1',
      '-g', isShortVideo ? '5' : '15', // Smaller keyframe interval for short videos
      '-sc_threshold', '0', // Disable scene change detection for consistent keyframes
      '-muxdelay', '0', // No mux delay for real-time
      '-muxpreload', '0', // No preload delay
      '-flush_packets', '1', // Force packet flushing
      '-strict', 'experimental', // Allow experimental features for better compatibility
      '-pix_fmt', 'yuv420p', // Ensure compatible pixel format
      '-loglevel', 'warning', // Reduce FFmpeg output
    ];

    // Add additional flags for short videos and better browser compatibility
    if (isShortVideo) {
      ffmpegArgs.push(
        '-shortest', // Stop when shortest stream ends
        '-copyts', // Copy timestamps for faster processing
        '-vsync', '0', // Disable video sync for faster processing
        '-probesize', '32M', // Smaller probe size for faster start
        '-analyzeduration', '1M' // Less analysis time for faster start
      );
    } else {
      // For longer videos, ensure better compatibility
      ffmpegArgs.push(
        '-probesize', '100M', // Larger probe size for better analysis
        '-analyzeduration', '10M' // More analysis for better quality
      );
      
      // Additional optimizations for large MKV files
      const fileSizeGB = metadata.size / (1024 * 1024 * 1024);
      const isLargeMKV = (metadata.mimeType?.includes('matroska') || metadata.name?.toLowerCase().endsWith('.mkv')) && fileSizeGB > 2;
      
      if (isLargeMKV) {
        ffmpegArgs.push(
          '-threads', '0', // Use all available CPU cores
          '-thread_type', 'slice', // Parallel processing
          '-max_muxing_queue_size', '1024', // Larger muxing queue for complex files
          '-fpsmax', '60', // Limit max fps to prevent excessive processing
          '-max_interleave_delta', '0' // Better interleaving for streaming
        );
        console.log('🎭 Applied large MKV optimizations for better streaming performance');
      }
    }

    ffmpegArgs.push('pipe:1'); // Output to stdout

    console.log('🔄 Starting FFmpeg transcoding:', {
      preset: finalSettings.preset,
      crf: finalSettings.crf,
      maxrate: finalSettings.maxrate,
      tune: finalSettings.tune,
      isShortVideo: isShortVideo
    });

    const ffmpeg = spawn('ffmpeg', ffmpegArgs, {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Create output stream with larger buffer
    const outputStream = new PassThrough({ highWaterMark: 1024 * 1024 }); // 1MB buffer

    // Track transcoding start time to prevent premature cleanup
    const transcodingStartTime = Date.now();
    
    // Pipe input to FFmpeg
    inputStream.pipe(ffmpeg.stdin);

    // Pipe FFmpeg output to our output stream
    ffmpeg.stdout.pipe(outputStream);
    
    // Add first data notification and buffer tracking
    let firstDataReceived = false;
    let totalDataReceived = 0;
    
    ffmpeg.stdout.on('data', (chunk) => {
      totalDataReceived += chunk.length;
      
      if (!firstDataReceived) {
        console.log('📺 First transcoded data received - video should start loading soon');
        firstDataReceived = true;
      }
      
      // Log data flow progress for large files more frequently during initial phase
      const logInterval = totalDataReceived < 50 * 1024 * 1024 ? 5 * 1024 * 1024 : 10 * 1024 * 1024; // 5MB then 10MB intervals
      
      if (metadata.size > 2 * 1024 * 1024 * 1024 && totalDataReceived % logInterval === 0) {
        const totalMB = Math.round(totalDataReceived / 1024 / 1024);
        const fileMB = Math.round(metadata.size / 1024 / 1024);
        const percent = Math.round((totalDataReceived / metadata.size) * 100);
        console.log(`📊 Transcoded data flow: ${totalMB}MB streamed (${percent}% of ${fileMB}MB file)`);
      }
    });

    // Handle FFmpeg stderr for progress and errors
    let lastProgressTime = Date.now();
    let firstOutput = true;
    let progressCount = 0;
    
    ffmpeg.stderr.on('data', (data) => {
      const output = data.toString();
      
      // Log first output to show transcoding has started
      if (firstOutput && output.includes('Stream mapping:')) {
        console.log('🎬 FFmpeg transcoding started - stream mapping established');
        firstOutput = false;
      }
      
      // Log errors
      if (output.includes('error') || output.includes('Error')) {
        console.error('FFmpeg error:', output.trim());
      } 
      // Log progress more frequently initially, then less frequently
      else if (output.includes('time=')) {
        const now = Date.now();
        progressCount++;
        
        // More frequent progress for first 2 minutes of transcoding (critical buffering phase)
        let progressInterval;
        if (progressCount <= 12) { // First 12 progress reports (about 2 minutes)
          progressInterval = 10000; // Every 10 seconds initially
        } else {
          progressInterval = metadata.size > 2 * 1024 * 1024 * 1024 ? 30000 : 15000; // Then 30s for >2GB, 15s for smaller
        }
        
        if (now - lastProgressTime > progressInterval) {
          const timeMatch = output.match(/time=([\d:.]+)/);
          const fpsMatch = output.match(/fps=\s*([\d.]+)/);
          const speedMatch = output.match(/speed=\s*([\d.]+)x/);
          const bitrateMatch = output.match(/bitrate=\s*([\d.]+)kbits\/s/);
          
          if (timeMatch) {
            console.log('📊 Transcoding progress:', {
              time: timeMatch[1],
              fps: fpsMatch ? fpsMatch[1] : 'N/A',
              speed: speedMatch ? speedMatch[1] + 'x' : 'N/A',
              bitrate: bitrateMatch ? bitrateMatch[1] + 'kbps' : 'N/A',
              fileSize: `${Math.round(metadata.size / 1024 / 1024)}MB`,
              progressReport: progressCount
            });
          }
          lastProgressTime = now;
        }
      }
    });

    // Handle FFmpeg process events
    ffmpeg.on('error', (error) => {
      console.error('FFmpeg process error:', error);
      if (!outputStream.destroyed) {
        outputStream.destroy(error);
      }
    });

    // Handle input stream errors
    inputStream.on('error', (error) => {
      console.error('Input stream error:', error);
      try {
        if (!ffmpeg.killed) {
          ffmpeg.kill('SIGKILL');
        }
      } catch (killError) {
        console.error('Error killing FFmpeg process:', killError);
      }
      if (!outputStream.destroyed) {
        outputStream.destroy(error);
      }
    });

    // Handle output stream errors (like EPIPE when client disconnects)
    outputStream.on('error', (error) => {
      if (error.code === 'EPIPE' || error.code === 'ECONNRESET') {
        console.log('🔌 Output stream disconnected (client buffering or brief disconnect) - keeping transcoding alive');
        // Don't immediately kill FFmpeg - browsers often disconnect briefly during buffering
        // For short videos, this is especially common as they buffer quickly
        if (isShortVideo) {
          console.log('⚡ Short video detected - maintaining transcoding for browser buffering behavior');
        } else if (metadata.size > 2 * 1024 * 1024 * 1024) {
          console.log('📡 Large file: maintaining transcoding process for browser reconnections');
        }
        // Don't call cleanup immediately - let the natural grace period handle it
      } else {
        console.error('Output stream error:', error);
        // Only cleanup for actual errors, not connection issues
        try {
          if (!ffmpeg.killed) {
            ffmpeg.kill('SIGTERM');
          }
          if (!inputStream.destroyed) {
            inputStream.destroy();
          }
        } catch (cleanupError) {
          console.error('Error during output stream cleanup:', cleanupError);
        }
      }
    });

    // Handle stdin pipe errors
    ffmpeg.stdin.on('error', (error) => {
      if (error.code === 'EPIPE' || error.code === 'ECONNRESET') {
        console.log('🔌 FFmpeg stdin disconnected');
      } else {
        console.error('FFmpeg stdin error:', error);
      }
    });

    // Handle stdout pipe errors  
    ffmpeg.stdout.on('error', (error) => {
      if (error.code === 'EPIPE' || error.code === 'ECONNRESET') {
        console.log('🔌 FFmpeg stdout disconnected');
      } else {
        console.error('FFmpeg stdout error:', error);
      }
    });

    // Cleanup function with grace period
    let cleanupTimeout = null;
    let isCleaningUp = false;
    let ffmpegCompleted = false;
    
    // Track when FFmpeg actually completes
    ffmpeg.on('close', (code) => {
      ffmpegCompleted = true;
      if (code === 0) {
        console.log('✅ FFmpeg transcoding completed successfully');
      } else {
        console.error(`❌ FFmpeg process closed with code ${code}`);
      }
      if (!outputStream.destroyed) {
        outputStream.end();
      }
    });
    
    outputStream.cleanup = () => {
      const transcodingDuration = Date.now() - transcodingStartTime;
      
      // Calculate file characteristics once for use throughout the cleanup function
      const estimatedDuration = metadata.duration || (metadata.size / (1024 * 1024 * 5)); // Rough estimate: 5MB per second
      const isShortVideo = estimatedDuration < 10;
      const fileSizeGB = metadata.size / (1024 * 1024 * 1024);
      const isLargeMKV = (metadata.mimeType?.includes('matroska') || metadata.name?.toLowerCase().endsWith('.mkv')) && fileSizeGB > 2;
      
      // Adjust minimum transcoding time based on video characteristics
      let minTranscodingTime;
      
      if (ffmpegCompleted) {
        minTranscodingTime = 2000; // Only 2 seconds if FFmpeg has completed
        console.log(`✅ FFmpeg completed - using minimal protection time`);
      } else if (isShortVideo) {
        minTranscodingTime = 20000; // 20 seconds for short videos (browsers need time to buffer)
        console.log(`⚡ Short video detected - using extended protection time for browser buffering`);
      } else if (isLargeMKV) {
        minTranscodingTime = 60000; // 60 seconds for large MKV files (they need more time to establish proper streaming)
        console.log(`🎭 Large MKV file detected - using extended protection time for proper streaming setup`);
      } else if (metadata.size > 1024 * 1024 * 1024) {
        minTranscodingTime = 45000; // 45 seconds for other large files
      } else {
        minTranscodingTime = 25000; // 25 seconds for medium files
      }
      
      // Apply protection for all videos that are still transcoding
      if (!ffmpegCompleted && transcodingDuration < minTranscodingTime) {
        const remainingTime = minTranscodingTime - transcodingDuration;
        console.log(`🔒 Transcoding protection active: ${Math.round(remainingTime/1000)}s remaining before cleanup allowed`);
        
        setTimeout(() => {
          console.log('🔄 Minimum transcoding time elapsed, cleanup now allowed');
          outputStream.cleanup();
        }, remainingTime);
        return;
      }
      
      if (isCleaningUp) {
        console.log('� Cleanup already in progress, skipping...');
        return;
      }
      
      console.log('�🗑️ Cleaning up transcoding resources');
      isCleaningUp = true;
      
      // Clear any existing cleanup timeout
      if (cleanupTimeout) {
        clearTimeout(cleanupTimeout);
      }
      
      // Adjust grace period based on video characteristics
      let graceTime;
      
      if (isShortVideo) {
        // Short videos need longer grace periods because browsers disconnect frequently during buffering
        graceTime = ffmpegCompleted ? 5000 : 30000; // 30s for buffering, 5s if completed
        console.log(`⚡ Short video - using ${graceTime/1000}s grace period (browsers buffer aggressively)`);
      } else if (ffmpegCompleted) {
        graceTime = 5000; // 5 seconds for completed transcoding
        console.log(`✅ Transcoding completed - using minimal grace period`);
      } else if (isLargeMKV) {
        graceTime = 90000; // 90 seconds for large MKV files (they need more reconnection time)
        console.log(`🎭 Large MKV file - using ${graceTime/1000}s grace period (complex format needs stable connection)`);
      } else if (metadata.size > 1024 * 1024 * 1024) {
        graceTime = 60000; // 60s for other large files still transcoding
      } else {
        graceTime = 25000; // 25s for medium files
      }
      
      console.log(`⏱️ Starting cleanup in ${graceTime/1000}s (grace period for reconnections)`);
      
      cleanupTimeout = setTimeout(() => {
        try {
          if (!ffmpeg.killed) {
            console.log('🔄 Gracefully terminating FFmpeg process');
            ffmpeg.kill('SIGTERM'); // Use SIGTERM first, then SIGKILL if needed
            
            // Force kill after 8 seconds if still running
            setTimeout(() => {
              if (!ffmpeg.killed) {
                console.log('🔄 Force killing FFmpeg process');
                ffmpeg.kill('SIGKILL');
              }
            }, 8000);
          }
        } catch (error) {
          console.error('Error killing FFmpeg process:', error);
        }
        
        try {
          if (!inputStream.destroyed) {
            inputStream.destroy();
          }
        } catch (error) {
          console.error('Error destroying input stream:', error);
        }
        
        try {
          if (!outputStream.destroyed) {
            outputStream.destroy();
          }
        } catch (error) {
          console.error('Error destroying output stream:', error);
        }
        
        isCleaningUp = false;
      }, graceTime);
    };

    return outputStream;
  }

    // Start transcoding with caching
  async startTranscoding(fileId, inputStream, metadata, options = {}) {
    const transcodingKey = `${fileId}_${JSON.stringify(options)}`;
    
    // Check if transcoding is already in progress
    if (this.activeTranscodings.has(transcodingKey)) {
      const existingTranscoding = this.activeTranscodings.get(transcodingKey);
      
      // Check if the existing stream is still usable and has been running for a reasonable time
      if (existingTranscoding && !existingTranscoding.destroyed && existingTranscoding.readable) {
        const fileSizeGB = metadata.size / (1024 * 1024 * 1024);
        console.log('🔄 Reusing active transcoding for:', metadata.name, `(${Math.round(fileSizeGB * 100)/100}GB)`);
        
        // For large files, always return the same stream to avoid multiple concurrent transcodings
        if (fileSizeGB > 1) {
          console.log('📡 Large file: reusing existing transcoding process to avoid resource conflicts');
          return existingTranscoding; // Direct reuse for large files
        }
        
        // For smaller files, create a new PassThrough stream for this client to avoid conflicts
        const clientStream = new PassThrough();
        
        // Pipe the existing transcoding to this client's stream
        existingTranscoding.pipe(clientStream, { end: false });
        
        // Add cleanup for this client stream
        clientStream.cleanup = existingTranscoding.cleanup;
        
        return clientStream;
      } else {
        console.log('🗑️ Removing stale transcoding for:', fileId);
        this.activeTranscodings.delete(transcodingKey);
      }
    }

    console.log('🚀 Starting new transcoding for:', metadata.name);
    
    try {
      const transcodedStream = this.createTranscodingStream(inputStream, metadata, options);
      
      // Store in active transcodings
      this.activeTranscodings.set(transcodingKey, transcodedStream);
      
      // Clean up when transcoding is done
      transcodedStream.on('end', () => {
        this.activeTranscodings.delete(transcodingKey);
        console.log('🗑️ Cleaned up completed transcoding for:', fileId);
      });

      transcodedStream.on('error', (error) => {
        this.activeTranscodings.delete(transcodingKey);
        console.log('🗑️ Cleaned up failed transcoding for:', fileId, 'Error:', error.message);
      });

      transcodedStream.on('close', () => {
        this.activeTranscodings.delete(transcodingKey);
        console.log('🗑️ Cleaned up closed transcoding for:', fileId);
      });

      return transcodedStream;
    } catch (error) {
      this.activeTranscodings.delete(transcodingKey);
      throw error;
    }
  }

  // Clean up all active transcodings
  cleanup() {
    console.log(`🧹 Cleaning up ${this.activeTranscodings.size} active transcodings`);
    
    for (const [key, stream] of this.activeTranscodings) {
      try {
        if (stream.cleanup) {
          stream.cleanup();
        } else {
          stream.destroy();
        }
      } catch (error) {
        console.error('Error cleaning up transcoding:', error);
      }
    }
    
    this.activeTranscodings.clear();
  }

  // Get transcoding statistics
  getStats() {
    return {
      activeTranscodings: this.activeTranscodings.size,
      queuedTranscodings: this.transcodingQueue.size
    };
  }
}

// Create singleton instance
const transcodingService = new TranscodingService();

export default transcodingService;
