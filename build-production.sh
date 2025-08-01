#!/bin/bash

echo "🚀 Building Stream2GetHer for Production..."

# Set production environment
export NODE_ENV=production

echo "📦 Installing production dependencies..."
cd server && npm ci --only=production
cd ../client && npm ci

echo "🔨 Building client for production..."
npm run build

echo "✅ Production build completed!"
echo ""
echo "📋 Next steps:"
echo "1. Update environment variables in server/.env.production"
echo "2. Update environment variables in client/.env.production"
echo "3. Deploy to your hosting platform"
echo ""
echo "🐳 Docker deployment:"
echo "   docker-compose up -d"
echo ""
echo "☁️  Manual deployment:"
echo "   - Upload server/ folder to your backend server"
echo "   - Upload client/dist/ folder to your frontend server"
echo "   - Configure nginx/apache to serve static files and proxy API"
