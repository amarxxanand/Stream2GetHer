# 🚀 Stream2GetHer Production Hosting Guide

## 📋 Pre-Hosting Checklist

### ✅ Required Updates Before Hosting

1. **Update Environment Variables**
   - Server: Update `server/.env.production`
   - Client: Update `client/.env.production`
   - Docker: Update `.env.docker` if using Docker

2. **Database Setup**
   - Set up MongoDB Atlas (recommended) or your own MongoDB server
   - Update `MONGODB_URI` in environment variables

3. **Domain Configuration**
   - Point your domain to your server
   - Update `CLIENT_URL` and API URLs in environment files

## 🔧 Hosting Options

### Option 1: Docker Deployment (Recommended)

**Requirements:**
- Docker and Docker Compose installed
- 1GB+ RAM, 1 CPU core minimum
- 10GB+ storage

**Steps:**
```bash
# 1. Clone your repository
git clone <your-repo-url>
cd Stream2GetHer

# 2. Update environment variables
cp .env.docker .env
# Edit .env with your production values

# 3. Deploy with Docker
./deploy-docker.sh
```

**Services will run on:**
- Frontend: http://yourserver:3001
- Backend: http://yourserver:3000
- Database: Internal Docker network

### Option 2: Traditional VPS/Server Deployment

**Requirements:**
- Node.js 16+
- MongoDB (local or cloud)
- Nginx (recommended)
- SSL certificate

**Steps:**

1. **Server Setup:**
```bash
# Install Node.js, MongoDB, and Nginx
sudo apt update
sudo apt install nodejs npm mongodb nginx

# Install PM2 for process management
npm install -g pm2
```

2. **Deploy Backend:**
```bash
# Upload server files
cd /var/www/stream2gether-server
npm ci --only=production

# Start with PM2
pm2 start index.js --name "stream2gether-backend"
pm2 save
pm2 startup
```

3. **Deploy Frontend:**
```bash
# Build frontend locally
cd client
npm run build

# Upload dist/ folder to server
scp -r dist/* user@server:/var/www/stream2gether-frontend/
```

4. **Nginx Configuration:**
```nginx
# /etc/nginx/sites-available/stream2gether
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend static files
    location / {
        root /var/www/stream2gether-frontend;
        try_files $uri $uri/ /index.html;
    }

    # Backend API proxy
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.IO proxy
    location /socket.io {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Option 3: Cloud Platform Deployment

#### A. Vercel (Frontend) + Railway/Render (Backend)

**Frontend on Vercel:**
1. Connect GitHub repository
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Add environment variables

**Backend on Railway/Render:**
1. Connect GitHub repository
2. Set start command: `npm start`
3. Add environment variables
4. Add MongoDB Atlas connection

#### B. Netlify (Frontend) + Heroku (Backend)

**Frontend on Netlify:**
1. Connect repository
2. Build command: `npm run build`
3. Publish directory: `client/dist`

**Backend on Heroku:**
1. Create new Heroku app
2. Add MongoDB Atlas add-on
3. Configure environment variables
4. Deploy from GitHub

#### C. AWS/Google Cloud/Azure

**Using Container Services:**
- AWS ECS/Fargate
- Google Cloud Run
- Azure Container Instances

**Using VM/Compute:**
- AWS EC2
- Google Compute Engine
- Azure Virtual Machines

## 🌐 Domain and SSL Setup

### DNS Configuration
```
A Record: yourdomain.com → your-server-ip
CNAME: www.yourdomain.com → yourdomain.com
```

### SSL Certificate (Let's Encrypt)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 🔒 Security Configuration

### Environment Variables

**Server (.env.production):**
```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/stream2gether
CLIENT_URL=https://yourdomain.com
JWT_SECRET=your-super-secret-key
RATE_LIMIT_MAX_REQUESTS=100
```

**Client (.env.production):**
```env
VITE_API_BASE_URL=https://yourdomain.com/api
VITE_SERVER_URL=https://yourdomain.com
```

### Firewall Rules
```bash
# Allow HTTP, HTTPS, SSH
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## 📊 Monitoring and Maintenance

### Health Checks
- Use `/api/health` endpoint for monitoring
- Set up uptime monitoring (UptimeRobot, Pingdom)

### Logging
```bash
# PM2 logs
pm2 logs stream2gether-backend

# Docker logs
docker-compose logs -f

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Backup Strategy
```bash
# MongoDB backup
mongodump --uri="mongodb+srv://..." --out=/backup/

# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --uri="$MONGODB_URI" --out="/backup/mongodb_$DATE"
```

## 🚀 Performance Optimization

### Production Checklist
- [ ] Enable gzip compression
- [ ] Set up CDN (Cloudflare)
- [ ] Optimize images and assets
- [ ] Enable browser caching
- [ ] Monitor memory and CPU usage
- [ ] Set up log rotation
- [ ] Configure rate limiting
- [ ] Enable HTTPS everywhere

### Scaling Considerations
- Load balancer for multiple server instances
- Redis for session sharing
- Database read replicas
- CDN for static assets

## 🆘 Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check CORS configuration
   - Verify proxy settings in Nginx
   - Ensure WebSocket transport is enabled

2. **Database Connection Error**
   - Verify MongoDB URI
   - Check network connectivity
   - Validate authentication credentials

3. **Build Failures**
   - Check Node.js version compatibility
   - Verify all dependencies are installed
   - Review build logs for specific errors

### Debug Commands
```bash
# Check service status
systemctl status nginx mongodb
pm2 status

# Test connections
curl http://localhost:3000/api/health
telnet mongodb-server 27017

# View real-time logs
tail -f /var/log/nginx/error.log
pm2 logs --lines 100
```

## 📞 Support

For deployment issues:
1. Check the logs first
2. Review environment variables
3. Verify network connectivity
4. Test API endpoints manually

This guide covers all major hosting scenarios. Choose the option that best fits your technical expertise and infrastructure requirements.
