import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  currentVideoUrl: {
    type: String,
    default: null
  },
  currentVideoTitle: {
    type: String,
    default: null
  },
  hostSocketId: {
    type: String,
    default: null
  },
  participants: [{
    type: String, // Socket IDs of connected users
  }],
  lastKnownTime: {
    type: Number,
    default: 0
  },
  lastKnownState: {
    type: Boolean,
    default: false // true for playing, false for paused
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastUpdatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update lastUpdatedAt on save
roomSchema.pre('save', function(next) {
  this.lastUpdatedAt = new Date();
  next();
});

export const Room = mongoose.model('Room', roomSchema);
