import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    index: true
  },
  author: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Compound index for efficient room-based queries
messageSchema.index({ roomId: 1, timestamp: 1 });

export const Message = mongoose.model('Message', messageSchema);
