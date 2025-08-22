import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import { Room, Message } from './models/index.js';
import { handleSocketConnection } from './socket/socketHandlers.js';
import googleDriveService from './services/googleDriveService.js';
import transcodingService from './services/transcodingService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Global error handlers to prevent server crashes
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('Stack:', error.stack);
  
  // Don't exit the process for EPIPE errors as they are expected
  if (error.code === 'EPIPE' || error.code === 'ECONNRESET') {
    console.log('🔌 Connection error handled, continuing...');
    return;
  }
  
  // For other uncaught exceptions, log but don't crash in production
  if (process.env.NODE_ENV === 'production') {
    console.error('🚨 Critical error in production, but continuing to serve...');
  } else {
    console.error('💥 Development mode - would normally exit');
    // In development, you might want to exit: process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Promise Rejection:', reason);
  console.error('Promise:', promise);
  
  // Don't crash for connection-related rejections
  if (reason && (reason.code === 'EPIPE' || reason.code === 'ECONNRESET')) {
    console.log('🔌 Connection promise rejection handled, continuing...');
    return;
  }
});

console.log('🚀 Starting Stream2Gether server...');

const app = express();
const httpServer = createServer(app);

// Production security and performance middleware
if (process.env.NODE_ENV === 'production') {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "https://www.youtube.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "wss:", "ws:"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'self'", "https://drive.google.com", "https://www.youtube.com"]
      }
    }
  }));
  app.use(compression());
}

// Rate limiting
const limiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX_REQUESTS || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', limiter);

// Socket.IO setup with CORS configuration
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? [process.env.CLIENT_URL] 
  : ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"];

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  maxHttpBufferSize: 1e6
});

// Middleware

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// MongoDB connection with better error handling and fallback
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/stream2gether';
    const conn = await mongoose.connect(mongoUri, {
      // Remove deprecated options that are now defaults in Mongoose 6+
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    console.log('🔄 Continuing without MongoDB - using in-memory storage only');
    // Don't exit, continue with socket functionality
  }
};

connectDB();

// REST API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Placeholder API for video poster images
app.get('/api/placeholder/:width/:height', (req, res) => {
  const { width, height } = req.params;
  // Generate a simple SVG placeholder
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#1e1e1e"/>
      <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#888" font-family="Arial, sans-serif" font-size="16">
        Video Poster ${width}×${height}
      </text>
    </svg>
  `;
  
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
  res.send(svg);
});

// Create a new room
app.post('/api/rooms', async (req, res) => {
  try {
    const { videoUrl, videoTitle } = req.body;
    const roomId = uuidv4();
    
    const room = new Room({
      roomId,
      currentVideoUrl: videoUrl || null,
      currentVideoTitle: videoTitle || null,
      hostSocketId: null,
      participants: [],
      lastKnownTime: 0,
      lastKnownState: false
    });
    
    await room.save();
    res.json({ roomId, message: 'Room created successfully' });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// Get room information
app.get('/api/rooms/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findOne({ roomId });
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    res.json({
      roomId: room.roomId,
      currentVideoUrl: room.currentVideoUrl,
      currentVideoTitle: room.currentVideoTitle,
      lastKnownTime: room.lastKnownTime,
      lastKnownState: room.lastKnownState,
      createdAt: room.createdAt
    });
  } catch (error) {
    console.error('Error fetching room:', error);
    res.status(500).json({ error: 'Failed to fetch room' });
  }
});

// Get chat history for a room
app.get('/api/rooms/:roomId/messages', async (req, res) => {
  try {
    const { roomId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    
    const messages = await Message
      .find({ roomId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
    
    res.json(messages.reverse()); // Return in chronological order
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Google Drive Video Streaming Proxy
app.get('/api/video/stream', async (req, res) => {
  try {
    // Check if Google Drive service is configured
    if (!googleDriveService.isServiceConfigured()) {
      return res.status(503).json({ 
        error: 'Google Drive service not configured',
        message: 'To use Google Drive videos, make sure your video is shared properly: Upload to Google Drive → Right-click → Share → Anyone with the link → Copy link.'
      });
    }

    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'Video URL is required' });
    }

    // Extract file ID from Google Drive URL
    const fileId = googleDriveService.extractFileId(url);
    if (!fileId) {
      return res.status(400).json({ error: 'Invalid Google Drive URL' });
    }

    // Validate the video file
    const metadata = await googleDriveService.validateVideoFile(fileId);
    
    // Handle range requests for video seeking
    const range = req.headers.range;
    const fileSize = parseInt(metadata.size);
    
    // For large files (>100MB), always use range requests even if not requested
    // This prevents memory issues with streaming very large files
    const isLargeFile = fileSize > 100 * 1024 * 1024; // 100MB threshold
    const isMkvFile = metadata.mimeType && metadata.mimeType.includes('matroska');
    
    if (range || isLargeFile) {
      let start, end;
      
      if (range) {
        // Parse range header
        const rangeData = googleDriveService.parseRange(range, fileSize);
        start = rangeData.start;
        end = rangeData.end;
        
        // For MKV files, use adaptive chunking strategy based on seek distance
        if (isMkvFile) {
          // Get the original requested position to determine seek strategy
          const originalRangeData = googleDriveService.parseRange(range, fileSize);
          const seekPosition = originalRangeData.start;
          const seekPercentage = (seekPosition / fileSize) * 100;
          
          // For large seeks (>10% into file), use much smaller chunks for faster response
          if (seekPercentage > 10) {
            const fastSeekChunkSize = 5 * 1024 * 1024; // 5MB for fast seeking
            console.log(`🚀 Fast MKV seek to ${seekPercentage.toFixed(1)}% - using ${fastSeekChunkSize/1024/1024}MB chunk`);
            
            // Use smaller alignment for faster seeks
            const alignSize = 256 * 1024; // 256KB alignment
            const alignedStart = Math.floor(seekPosition / alignSize) * alignSize;
            end = Math.min(alignedStart + fastSeekChunkSize - 1, fileSize - 1);
            start = alignedStart;
          } else {
            // For seeks near beginning, use standard 15MB chunks
            const mkvChunkSize = 15 * 1024 * 1024;
            const alignSize = 512 * 1024;
            const alignedStart = Math.floor(start / alignSize) * alignSize;
            end = Math.min(alignedStart + mkvChunkSize - 1, fileSize - 1);
            start = alignedStart;
          }
          
          console.log(`📹 MKV chunk: ${Math.round(start/1024/1024)}MB - ${Math.round(end/1024/1024)}MB (${Math.round((end-start+1)/1024/1024)}MB)`);
        } else {
          // For other formats, ensure minimum 5MB chunks
          const minChunkSize = 5 * 1024 * 1024; // 5MB minimum chunk
          if ((end - start + 1) < minChunkSize) {
            end = Math.min(start + minChunkSize - 1, fileSize - 1);
          }
        }
      } else {
        // For large files without range, serve appropriate initial chunk
        start = 0;
        if (isMkvFile) {
          // Smaller initial chunk for faster loading, but still sufficient for MKV compatibility
          end = Math.min(10 * 1024 * 1024 - 1, fileSize - 1); // 10MB initial chunk
        } else {
          end = Math.min(10 * 1024 * 1024 - 1, fileSize - 1); // 10MB initial chunk
        }
      }
      
      const chunkSize = end - start + 1;
      const rangeHeader = `bytes=${start}-${end}`;

      // Stream the requested range
      const streamResponse = await googleDriveService.streamFile(fileId, rangeHeader);
      
      // Set appropriate headers for partial content
      res.status(206);
      res.set({
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': googleDriveService.getStreamingMimeType(metadata.mimeType),
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Expose-Headers': 'Content-Length, Content-Range',
        // Additional headers for better video streaming
        'X-Content-Type-Options': 'nosniff',
        'Connection': 'keep-alive'
      });
      
      // Add error handling for client disconnects
      res.on('error', (error) => {
        if (error.code === 'EPIPE' || error.code === 'ECONNRESET') {
          console.log('🔌 Client disconnected during streaming');
        } else {
          console.error('❌ Streaming response error:', error);
        }
      });
      
      // Pipe the stream to response (streamResponse is now the stream directly)
      streamResponse.pipe(res);
    } else {
      // Stream entire file (only for small files)
      const streamResponse = await googleDriveService.streamFile(fileId);
      
      // Set headers for full content
      res.set({
        'Content-Length': fileSize,
        'Content-Type': googleDriveService.getStreamingMimeType(metadata.mimeType),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Expose-Headers': 'Content-Length'
      });
      
      // Add error handling for client disconnects
      res.on('error', (error) => {
        if (error.code === 'EPIPE' || error.code === 'ECONNRESET') {
          console.log('🔌 Client disconnected during streaming');
        } else {
          console.error('❌ Streaming response error:', error);
        }
      });
      
      // Pipe the stream to response (streamResponse is now the stream directly)
      streamResponse.pipe(res);
    }
  } catch (error) {
    console.error('Video streaming error:', error);
    console.error('Error stack:', error.stack);
    
    if (error.message.includes('not configured')) {
      return res.status(503).json({ 
        error: 'Google Drive service not configured',
        message: 'To use Google Drive videos, make sure your video is shared properly: Upload to Google Drive → Right-click → Share → Anyone with the link → Copy link.'
      });
    }
    
    if (error.message.includes('not found') || error.message.includes('not accessible')) {
      return res.status(404).json({ error: 'Video file not found or not accessible' });
    }
    
    if (error.message.includes('not a video')) {
      return res.status(400).json({ error: 'File is not a video' });
    }
    
    if (error.message.includes('too large')) {
      return res.status(413).json({ error: 'Video file too large' });
    }
    
    res.status(500).json({ error: 'Failed to stream video' });
  }
});

// Real-time transcoding endpoint
app.get('/api/video/transcode', async (req, res) => {
  try {
    // Check if Google Drive service is configured
    if (!googleDriveService.isServiceConfigured()) {
      return res.status(503).json({ 
        error: 'Google Drive service not configured',
        message: 'To use Google Drive videos, make sure your video is shared properly: Upload to Google Drive → Right-click → Share → Anyone with the link → Copy link.'
      });
    }

    // Check if FFmpeg is available
    const ffmpegAvailable = await transcodingService.checkFFmpegAvailability();
    if (!ffmpegAvailable) {
      return res.status(503).json({
        error: 'FFmpeg not available',
        message: 'Real-time transcoding requires FFmpeg. Install with: sudo apt-get install ffmpeg'
      });
    }

    const { url, force = false } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'Video URL is required' });
    }

    // Extract file ID from Google Drive URL
    const fileId = googleDriveService.extractFileId(url);
    if (!fileId) {
      return res.status(400).json({ error: 'Invalid Google Drive URL' });
    }

    // Validate the video file and get metadata
    const metadata = await googleDriveService.validateVideoFile(fileId);
    
    console.log('🎬 Transcoding request for:', metadata.name);
    console.log('📋 File metadata:', {
      mimeType: metadata.mimeType,
      size: `${Math.round(metadata.size / 1024 / 1024)}MB`
    });

    // Check if transcoding is actually needed
    const needsTranscode = force === 'true' || transcodingService.needsTranscoding(metadata.mimeType, metadata.name);
    
    if (!needsTranscode) {
      console.log('✅ File is already browser-compatible, redirecting to direct stream');
      return res.redirect(`/api/video/stream?url=${encodeURIComponent(url)}`);
    }

    console.log('🔄 File needs transcoding, starting real-time conversion');

    // Get the original video stream from Google Drive
    const inputStream = await googleDriveService.streamFile(fileId);

    // Start transcoding
    const transcodedStream = await transcodingService.startTranscoding(
      fileId, 
      inputStream, 
      metadata,
      {
        // Override settings for real-time streaming if needed
        preset: req.query.preset || 'ultrafast',
        crf: req.query.crf || '28'
      }
    );

    // Set appropriate headers for transcoded MP4
    res.set({
      'Content-Type': 'video/mp4',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache', // Don't cache transcoded content
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Expose-Headers': 'Content-Length, Content-Range',
      'X-Transcoded': 'true',
      'X-Original-Format': metadata.mimeType,
      'X-Transcoding-Settings': `preset=${req.query.preset || 'ultrafast'},crf=${req.query.crf || '28'}`,
      'Connection': 'keep-alive'
    });

    console.log('📡 Starting transcoded stream transmission');

    // Handle client disconnect - don't immediately cleanup, let the transcoding service handle it
    req.on('close', () => {
      console.log('🔌 Client disconnected during transcoding - stream will auto-cleanup if no reconnection');
      // Don't immediately call cleanup - let the transcoding service's grace period handle it
    });

    req.on('aborted', () => {
      console.log('🔌 Request aborted during transcoding - stream will auto-cleanup if no reconnection');
      // Don't immediately call cleanup - let the transcoding service's grace period handle it
    });

    // Handle transcoding errors
    transcodedStream.on('error', (error) => {
      console.error('❌ Transcoding stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'Transcoding failed',
          details: error.message 
        });
      }
    });

    // Handle response errors (like EPIPE when client disconnects)
    res.on('error', (error) => {
      if (error.code === 'EPIPE' || error.code === 'ECONNRESET') {
        console.log('🔌 Client connection dropped during response - keeping transcoding alive for reconnection');
        // Don't immediately cleanup - browsers often reconnect for buffering
      } else {
        console.error('❌ Response error:', error);
        // Only cleanup for actual errors
        if (transcodedStream.cleanup) {
          transcodedStream.cleanup();
        }
      }
    });

    // Handle response close - don't immediately cleanup for short videos
    res.on('close', () => {
      console.log('🔌 Response closed - transcoding service will handle cleanup with grace period');
      // Don't immediately call cleanup - let the transcoding service decide based on file type and timing
    });

    // Pipe transcoded stream to response
    transcodedStream.pipe(res);

  } catch (error) {
    console.error('Transcoding endpoint error:', error);
    
    if (!res.headersSent) {
      if (error.message.includes('not configured')) {
        return res.status(503).json({ 
          error: 'Google Drive service not configured',
          message: 'To use Google Drive videos, make sure your video is shared properly: Upload to Google Drive → Right-click → Share → Anyone with the link → Copy link.'
        });
      }
      
      if (error.message.includes('not found') || error.message.includes('not accessible')) {
        return res.status(404).json({ error: 'Video file not found or not accessible' });
      }
      
      if (error.message.includes('not a video')) {
        return res.status(400).json({ error: 'File is not a video' });
      }
      
      res.status(500).json({ 
        error: 'Failed to start transcoding',
        details: error.message 
      });
    }
  }
});

// Video info endpoint (enhanced with transcoding info)
app.get('/api/video/info', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'Video URL is required' });
    }

    // Check if Google Drive service is configured
    if (!googleDriveService.isServiceConfigured()) {
      return res.status(503).json({ 
        error: 'Google Drive API not configured',
        message: 'To use Google Drive videos, make sure your video is shared properly: Upload to Google Drive → Right-click → Share → Anyone with the link → Copy link.'
      });
    }

    const fileId = googleDriveService.extractFileId(url);
    if (!fileId) {
      return res.status(400).json({ error: 'Invalid Google Drive URL' });
    }

    const metadata = await googleDriveService.validateVideoFile(fileId);
    const needsTranscode = transcodingService.needsTranscoding(metadata.mimeType, metadata.name);
    const ffmpegAvailable = await transcodingService.checkFFmpegAvailability();
    const isMKVFile = transcodingService.isMKVFile(metadata.mimeType, metadata.name);

    const info = {
      fileId: fileId,
      name: metadata.name,
      mimeType: metadata.mimeType,
      size: metadata.size,
      sizeFormatted: `${Math.round(metadata.size / 1024 / 1024)}MB`,
      needsTranscoding: needsTranscode,
      ffmpegAvailable: ffmpegAvailable,
      browserCompatible: true, // All formats are now considered compatible
      isMKVFile: isMKVFile, // Include MKV detection for seeking warning
      streamUrl: `/api/video/stream?url=${encodeURIComponent(url)}`,
      transcodedUrl: needsTranscode && ffmpegAvailable ? 
        `/api/video/transcode?url=${encodeURIComponent(url)}` : null,
      recommendedUrl: `/api/video/stream?url=${encodeURIComponent(url)}`, // Always use direct stream first
      transcodingStats: transcodingService.getStats()
    };

    res.json(info);

  } catch (error) {
    console.error('Error getting video info:', error);
    res.status(500).json({ 
      error: 'Failed to get video info',
      details: error.message 
    });
  }
});

// Video metadata endpoint
app.get('/api/video/metadata', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'Video URL is required' });
    }

    // Check if Google Drive service is configured
    if (!googleDriveService.isServiceConfigured()) {
      // Extract file ID from Google Drive URL for error message
      const fileId = googleDriveService.extractFileId(url);
      
      return res.status(503).json({ 
        error: 'Google Drive API not configured',
        message: 'To play Google Drive videos, share your video properly on Google Drive.',
        fileId: fileId || 'unknown',
        howToShare: {
          step1: 'Upload your video file to Google Drive',
          step2: 'Right-click the file and select "Share"', 
          step3: 'Change access to "Anyone with the link"',
          step4: 'Copy the share link and paste it in the video URL field'
        },
        alternatives: 'You can also use direct video URLs from other platforms (like direct MP4 links from file hosting services) for testing.'
      });
    }

    const fileId = googleDriveService.extractFileId(url);
    if (!fileId) {
      return res.status(400).json({ error: 'Invalid Google Drive URL' });
    }

    const metadata = await googleDriveService.validateVideoFile(fileId);
    
    res.json({
      fileId,
      name: metadata.name,
      mimeType: metadata.mimeType,
      size: metadata.size,
      duration: metadata.videoMediaMetadata?.durationMillis ? 
        parseInt(metadata.videoMediaMetadata.durationMillis) / 1000 : null
    });
  } catch (error) {
    console.error('Error getting video metadata:', error);
    
    if (error.message.includes('not configured')) {
      return res.status(503).json({ 
        error: 'Google Drive service not configured',
        message: 'To use Google Drive videos, make sure your video is shared properly: Upload to Google Drive → Right-click → Share → Anyone with the link → Copy link.'
      });
    }
    
    res.status(400).json({ error: error.message });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  handleSocketConnection(socket, io);
});

// Serve static files from client build (for production single deployment)
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '../client/dist');
  app.use(express.static(clientBuildPath));
  
  // Handle React Router - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    // Skip API routes
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 3000;

// Graceful shutdown
const gracefulShutdown = () => {
  console.log('Received shutdown signal, closing server gracefully...');
  
  // Clean up transcoding processes
  console.log('🧹 Cleaning up transcoding processes...');
  transcodingService.cleanup();
  
  httpServer.close(() => {
    console.log('HTTP server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Initialize services and start server
const startServer = async () => {
  try {
    // Check FFmpeg availability
    const ffmpegAvailable = await transcodingService.checkFFmpegAvailability();
    
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Client URL: ${process.env.CLIENT_URL || 'http://localhost:5175'}`);
      console.log(`📹 Google Drive API: ${googleDriveService.isServiceConfigured() ? '✅ Configured' : '❌ Not configured'}`);
      console.log(`🔄 Real-time transcoding: ${ffmpegAvailable ? '✅ Enabled (FFmpeg available)' : '❌ Disabled (FFmpeg not found)'}`);
      
      if (!ffmpegAvailable) {
        console.log('💡 To enable real-time MKV transcoding, install FFmpeg:');
        console.log('   sudo apt-get update && sudo apt-get install ffmpeg');
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export { io };
