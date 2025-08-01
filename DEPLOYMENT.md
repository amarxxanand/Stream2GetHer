# Stream2GetHer Production Deployment Guide

## 🚀 Quick Production Setup

### 1. Environment Setup

**Server Environment Variables (.env in server folder):**
```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/stream2gether
CLIENT_URL=https://yourfrontend.com
```

**Client Environment Variables (.env in client folder):**
```env
VITE_API_BASE_URL=https://yourbackend.com/api
VITE_SERVER_URL=https://yourbackend.com
```

### 2. Build Process

```bash
# Build the client for production
cd client
npm run build

# The build files will be in client/dist/
# Serve these static files with your web server
```

### 3. Deployment Options

#### Option A: Traditional VPS/Server
```bash
# On your server
git clone <your-repo>
cd Stream2GetHer

# Install dependencies
npm run install-all

# Build client
cd client && npm run build

# Start server with PM2 (recommended)
npm install -g pm2
cd ../server
pm2 start index.js --name "stream2gether"

# Setup nginx to serve static files and proxy API calls
```

#### Option B: Docker Deployment
Create `docker-compose.yml`:
```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:latest
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: password
    volumes:
      - mongodb_data:/data/db
    ports:
      - "27017:27017"

  server:
    build: ./server
    environment:
      NODE_ENV: production
      PORT: 3000
      MONGODB_URI: mongodb://root:password@mongodb:27017/stream2gether
      CLIENT_URL: http://localhost:3001
    ports:
      - "3000:3000"
    depends_on:
      - mongodb

  client:
    build: ./client
    ports:
      - "3001:80"
    depends_on:
      - server

volumes:
  mongodb_data:
```

#### Option C: Cloud Platforms

**Vercel (Client) + Railway/Heroku (Server):**
1. Deploy client to Vercel
2. Deploy server to Railway/Heroku
3. Use MongoDB Atlas for database
4. Update environment variables accordingly

**AWS/Google Cloud:**
1. Use EC2/Compute Engine for server
2. Use S3/Cloud Storage + CloudFront for client
3. Use DocumentDB/MongoDB Atlas for database

### 4. nginx Configuration (if using traditional server)

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Serve client static files
    location / {
        root /path/to/Stream2GetHer/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API calls to Node.js server
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket proxy for Socket.IO
    location /socket.io {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 5. SSL/HTTPS Setup

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal (add to crontab)
0 12 * * * /usr/bin/certbot renew --quiet
```

### 6. Monitoring & Logging

```bash
# PM2 monitoring
pm2 monit

# View logs
pm2 logs stream2gether

# Setup log rotation
pm2 install pm2-logrotate
```

### 7. Database Backup

```bash
# Backup MongoDB
mongodump --uri="mongodb://user:password@host:port/stream2gether" --out=/backup/

# Restore MongoDB
mongorestore --uri="mongodb://user:password@host:port/stream2gether" /backup/stream2gether
```

### 8. Performance Optimization

1. **Enable gzip compression** in nginx
2. **Use CDN** for static assets
3. **Implement Redis** for session storage (if scaling)
4. **Database indexing** (already implemented in schemas)
5. **Rate limiting** for API endpoints

### 9. Security Checklist

- [ ] Use HTTPS everywhere
- [ ] Set secure environment variables
- [ ] Enable MongoDB authentication
- [ ] Implement rate limiting
- [ ] Use CORS properly
- [ ] Keep dependencies updated
- [ ] Regular security audits

### 10. Scaling Considerations

For high traffic, consider:
- Load balancer for multiple server instances
- Redis for session sharing between servers
- Database sharding for large datasets
- CDN for static content delivery
- Separate chat service for better scalability
