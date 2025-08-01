#!/bin/bash

echo "🐳 Deploying Stream2GetHer with Docker..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating environment file..."
    cp .env.docker .env
    echo "⚠️  Please update the .env file with your production values before continuing."
    echo "   - Update MONGO_ROOT_PASSWORD"
    echo "   - Update CLIENT_URL to your domain"
    read -p "Press Enter to continue after updating .env file..."
fi

echo "🔥 Building and starting containers..."
docker-compose down
docker-compose build --no-cache
docker-compose up -d

echo "⏳ Waiting for services to start..."
sleep 10

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    echo "✅ Deployment successful!"
    echo ""
    echo "🌐 Services running:"
    echo "   - Frontend: http://localhost:3001"
    echo "   - Backend:  http://localhost:3000"
    echo "   - MongoDB:  localhost:27017"
    echo ""
    echo "📊 Check logs with: docker-compose logs -f"
    echo "🛑 Stop services with: docker-compose down"
else
    echo "❌ Deployment failed. Check logs with: docker-compose logs"
    exit 1
fi
