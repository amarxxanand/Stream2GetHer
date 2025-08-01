#!/bin/bash

# Stream2GetHer Startup Script
echo "🚀 Starting Stream2GetHer Development Environment..."

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️  MongoDB is not running. Please start MongoDB first."
    echo "   Run: sudo systemctl start mongod"
    echo "   Or: brew services start mongodb-community (on macOS)"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ] || [ ! -d "server/node_modules" ] || [ ! -d "client/node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm run install-all
fi

echo "🔥 Starting development servers..."
echo "   - Server will run on http://localhost:3000"
echo "   - Client will run on http://localhost:5173"
echo "   - Press Ctrl+C to stop both servers"

# Start both server and client
npm run dev
