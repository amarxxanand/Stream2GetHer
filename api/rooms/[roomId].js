import mongoose from 'mongoose';

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    return;
  }

  try {
    const db = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/stream2gether');
    isConnected = db.connections[0].readyState === 1;
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// Room Schema
const roomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  host: { type: String, required: true },
  currentVideo: {
    videoId: String,
    title: String,
    thumbnail: String
  },
  isPlaying: { type: Boolean, default: false },
  currentTime: { type: Number, default: 0 },
  participants: [String],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Room = mongoose.models.Room || mongoose.model('Room', roomSchema);

export default async function handler(req, res) {
  await connectDB();

  const { method } = req;
  const { roomId } = req.query;

  try {
    switch (method) {
      case 'GET':
        if (roomId) {
          // Get specific room
          const room = await Room.findOne({ roomId });
          if (!room) {
            return res.status(404).json({ error: 'Room not found' });
          }
          return res.json(room);
        } else {
          // Get all rooms (optional: add pagination)
          const rooms = await Room.find({}).sort({ createdAt: -1 }).limit(20);
          return res.json(rooms);
        }

      case 'POST':
        // Create new room
        const { name, host } = req.body;
        const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        const room = new Room({
          roomId: newRoomId,
          name,
          host,
          participants: [host]
        });

        await room.save();
        return res.status(201).json(room);

      case 'PUT':
        // Update room
        const updateData = req.body;
        const updatedRoom = await Room.findOneAndUpdate(
          { roomId },
          { ...updateData, updatedAt: new Date() },
          { new: true }
        );

        if (!updatedRoom) {
          return res.status(404).json({ error: 'Room not found' });
        }

        return res.json(updatedRoom);

      case 'DELETE':
        // Delete room
        const deletedRoom = await Room.findOneAndDelete({ roomId });
        if (!deletedRoom) {
          return res.status(404).json({ error: 'Room not found' });
        }
        return res.json({ message: 'Room deleted successfully' });

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
