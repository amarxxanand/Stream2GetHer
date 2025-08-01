// MongoDB initialization script
db = db.getSiblingDB('stream2gether');

// Create collections with proper indexes
db.createCollection('rooms');
db.createCollection('messages');

// Create indexes for better performance
db.rooms.createIndex({ "roomId": 1 }, { unique: true });
db.messages.createIndex({ "roomId": 1, "timestamp": 1 });

console.log('MongoDB initialized with collections and indexes');
