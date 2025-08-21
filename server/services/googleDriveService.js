import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

class GoogleDriveService {
  constructor() {
    this.drive = null;
    this.auth = null;
    this.isConfigured = false;
    this.initialize();
  }

  async initialize() {
    try {
      // Initialize Google Auth with service account or OAuth2
      if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        // Using service account (recommended for server-side)
        const serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
        this.auth = new google.auth.GoogleAuth({
          credentials: serviceAccountKey,
          scopes: ['https://www.googleapis.com/auth/drive.readonly']
        });
      } else if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
        // Using OAuth2 (requires additional setup)
        this.auth = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback'
        );
        
        if (process.env.GOOGLE_REFRESH_TOKEN) {
          this.auth.setCredentials({
            refresh_token: process.env.GOOGLE_REFRESH_TOKEN
          });
        }
      } else {
        console.warn('⚠️  Google Drive credentials not configured. Video streaming will not work until you set up Google Drive API credentials.');
        console.warn('📖 Please follow the setup guide in MIGRATION-GUIDE.md to configure Google Drive API');
        this.isConfigured = false;
        return;
      }

      this.drive = google.drive({ version: 'v3', auth: this.auth });
      this.isConfigured = true;
      console.log('✅ Google Drive service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Google Drive service:', error);
      console.warn('📖 Please check your Google Drive API configuration in .env file');
      this.isConfigured = false;
    }
  }

  /**
   * Check if Google Drive service is properly configured
   */
  isServiceConfigured() {
    return this.isConfigured && this.drive !== null;
  }

  /**
   * Extract file ID from Google Drive URL
   * Supports various Google Drive URL formats
   */
  extractFileId(url) {
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
  }

  /**
   * Get file metadata from Google Drive
   */
  async getFileMetadata(fileId) {
    if (!this.isServiceConfigured()) {
      throw new Error('Google Drive service is not configured. Please set up Google Drive API credentials.');
    }
    
    try {
      const response = await this.drive.files.get({
        fileId: fileId,
        fields: 'id,name,mimeType,size,videoMediaMetadata'
      });
      return response.data;
    } catch (error) {
      console.error('Error getting file metadata:', error);
      throw error;
    }
  }

  /**
   * Stream video file from Google Drive with range support
   */
  async streamFile(fileId, range = null) {
    if (!this.isServiceConfigured()) {
      throw new Error('Google Drive service is not configured. Please set up Google Drive API credentials.');
    }
    
    try {
      // Get auth client for manual request
      const authClient = await this.auth.getClient();
      
      // Build download URL manually  
      const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
      
      // Set up request options
      const requestOptions = {
        url: downloadUrl,
        responseType: 'stream'
      };

      // Add range header if provided
      if (range) {
        requestOptions.headers = {
          'Range': range
        };
      }

      const response = await authClient.request(requestOptions);
      return response.data; // Return the stream directly
    } catch (error) {
      console.error('Error streaming file:', error);
      throw error;
    }
  }

  /**
   * Validate if file is accessible and is a video
   */
  async validateVideoFile(fileId) {
    try {
      const metadata = await this.getFileMetadata(fileId);
      
      // Check if it's a video file
      if (!metadata.mimeType || !metadata.mimeType.startsWith('video/')) {
        throw new Error('File is not a video');
      }

      // Check for potentially problematic formats
      const problematicFormats = ['video/x-matroska', 'video/mkv'];
      if (problematicFormats.includes(metadata.mimeType)) {
        console.warn(`⚠️ Video format ${metadata.mimeType} detected. This format may have seeking issues in browsers.`);
        console.warn('Consider converting to MP4 for better browser compatibility.');
      }

      // Check if file size is reasonable (optional)
      const maxSize = process.env.MAX_VIDEO_SIZE_GB ? 
        parseInt(process.env.MAX_VIDEO_SIZE_GB) * 1024 * 1024 * 1024 : 
        5 * 1024 * 1024 * 1024; // 5GB default

      if (metadata.size && parseInt(metadata.size) > maxSize) {
        throw new Error('Video file too large');
      }

      return metadata;
    } catch (error) {
      if (error.code === 404) {
        throw new Error('Video file not found or not accessible');
      }
      throw error;
    }
  }

  /**
   * Parse range header for partial content requests
   */
  parseRange(rangeHeader, fileSize) {
    if (!rangeHeader) return null;

    const parts = rangeHeader.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    return {
      start: isNaN(start) ? 0 : start,
      end: isNaN(end) ? fileSize - 1 : end
    };
  }

  /**
   * Get the appropriate MIME type for video streaming
   */
  getStreamingMimeType(originalMimeType) {
    // Map Google Drive MIME types to appropriate streaming types
    const mimeTypeMap = {
      'video/mp4': 'video/mp4',
      'video/webm': 'video/webm',
      'video/ogg': 'video/ogg',
      'video/avi': 'video/mp4', // Browsers often handle AVI as MP4
      'video/mov': 'video/mp4',
      'video/wmv': 'video/mp4'
    };

    return mimeTypeMap[originalMimeType] || 'video/mp4';
  }
}

// Export singleton instance
export const googleDriveService = new GoogleDriveService();
export default googleDriveService;
