# 🚀 Production Deployment Guide

## Overview
This guide covers deploying the Crypto Wallet application using Docker in production.

## Prerequisites

- Docker installed (v20.10+)
- Docker Compose installed (v2.0+)
- Domain name (optional, for HTTPS)
- SSL certificates (for HTTPS)
- Supabase account and credentials

## Quick Start

### 1. Clone and Setup

```bash
git clone <repository-url>
cd cryptowallet
cp .env.example .env
```

### 2. Configure Environment

Edit `.env` file with your production values:

```env
# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here

# JWT
JWT_SECRET=your_very_long_secure_random_string_min_32_chars

# Email (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# URLs
FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://api.yourdomain.com

# Environment
NODE_ENV=production
```

### 3. Build and Deploy

```bash
# Using Docker Compose
docker-compose build
docker-compose up -d

# Or using Makefile
make build
make up
```

### 4. Verify Deployment

```bash
# Check service status
docker-compose ps

# Check logs
docker-compose logs -f

# Health check
curl http://localhost:5000/health
curl http://localhost:3001/
```

## Docker Commands

### Basic Operations

```bash
# Build images
docker-compose build --no-cache

# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Remove everything (including volumes)
docker-compose down -v --rmi all
```

### Individual Services

```bash
# Backend only
docker-compose up -d backend

# Frontend only
docker-compose up -d frontend

# View backend logs
docker-compose logs -f backend

# View frontend logs
docker-compose logs -f frontend

# Shell access
docker-compose exec backend sh
docker-compose exec frontend sh
```

## Development vs Production

### Development Mode

```bash
# Uses docker-compose.dev.yml
docker-compose -f docker-compose.dev.yml up

# Or
make dev
```

**Features:**
- Hot reload enabled
- Source code mounted as volume
- Debug mode on
- No optimization

### Production Mode

```bash
# Uses docker-compose.yml
docker-compose up -d

# Or
make prod
```

**Features:**
- Optimized builds
- Minified code
- Security headers
- Health checks
- Automatic restarts

## Nginx Reverse Proxy

The included Nginx configuration provides:

- Load balancing
- SSL termination
- Rate limiting (10 req/s for API, 30 req/s general)
- Gzip compression
- Security headers
- CORS handling

### SSL Setup (HTTPS)

1. **Get SSL Certificate:**

```bash
# Using Let's Encrypt (certbot)
sudo apt-get install certbot
sudo certbot certonly --standalone -d yourdomain.com -d api.yourdomain.com
```

2. **Copy certificates:**

```bash
mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/
```

3. **Update nginx.conf** to use HTTPS (port 443)

4. **Restart Nginx:**

```bash
docker-compose restart nginx
```

## Environment Variables

### Backend (.env)

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `production` |
| `PORT` | Backend port | `5000` |
| `SUPABASE_URL` | Supabase URL | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anon key | `eyJ...` |
| `JWT_SECRET` | JWT secret (32+ chars) | `your_secret` |
| `SMTP_HOST` | Email server | `smtp.gmail.com` |
| `SMTP_PORT` | Email port | `587` |
| `SMTP_USER` | Email username | `user@gmail.com` |
| `SMTP_PASS` | Email password | `app_password` |
| `FRONTEND_URL` | Frontend URL | `https://yourdomain.com` |

### Frontend (.env.local)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | API endpoint | `https://api.yourdomain.com/api` |

## Database Setup

### 1. Supabase Configuration

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  password_hash TEXT NOT NULL,
  wallet_id VARCHAR(50) UNIQUE NOT NULL,
  balance DECIMAL(18, 2) DEFAULT 0.00,
  role VARCHAR(20) DEFAULT 'user',
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Transactions table
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id VARCHAR(100) UNIQUE NOT NULL,
  from_user_id UUID REFERENCES users(id),
  to_user_id UUID REFERENCES users(id),
  amount DECIMAL(18, 2) NOT NULL,
  type VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- OTPs table
CREATE TABLE otps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  otp VARCHAR(10) NOT NULL,
  purpose VARCHAR(50) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 2. Create Admin User

```bash
# Run inside backend container
docker-compose exec backend npm run ts-node src/scripts/createAdmin.ts
```

Or manually:
- Email: `admin@gmail.com`
- Password: `Admin@123`
- Wallet: `ADMIN-PANEL`

## Monitoring & Logs

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f nginx

# Last 100 lines
docker-compose logs --tail=100
```

### Health Checks

```bash
# Backend health
curl http://localhost:5000/health

# Frontend health (via Nginx)
curl http://localhost/

# Check with Docker
docker inspect --format='{{.State.Health.Status}}' cryptowallet-backend
docker inspect --format='{{.State.Health.Status}}' cryptowallet-frontend
```

### Resource Usage

```bash
# Container stats
docker stats

# Disk usage
docker system df

# Clean up unused resources
docker system prune -a
```

## Backup & Recovery

### Database Backup (Supabase)

Supabase provides automatic backups. Manual backup:

```bash
# Backup via Supabase CLI
supabase db dump > backup_$(date +%Y%m%d).sql
```

### Volume Backup

```bash
# Backup logs volume
docker run --rm -v cryptowallet_backend-logs:/data -v $(pwd):/backup ubuntu tar czf /backup/logs-backup.tar.gz -C /data .
```

## Scaling

### Horizontal Scaling

Update `docker-compose.yml`:

```yaml
backend:
  deploy:
    replicas: 3
    
frontend:
  deploy:
    replicas: 2
```

### Load Balancing

Nginx is already configured for load balancing. Add more backend instances:

```yaml
upstream backend {
    least_conn;
    server backend:5000;
    server backend-2:5000;
    server backend-3:5000;
}
```

## Security Checklist

- ✅ Use strong JWT_SECRET (32+ characters)
- ✅ Enable HTTPS (SSL/TLS)
- ✅ Set secure environment variables
- ✅ Enable rate limiting
- ✅ Use security headers (Helmet)
- ✅ Keep dependencies updated
- ✅ Use non-root users in containers
- ✅ Enable health checks
- ✅ Set up firewall rules
- ✅ Regular backups
- ✅ Monitor logs

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs backend

# Check environment
docker-compose exec backend env

# Rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Port Already in Use

```bash
# Find process
netstat -ano | findstr :5000
netstat -ano | findstr :3001

# Kill process (Windows)
taskkill /PID <process_id> /F

# Or change ports in docker-compose.yml
```

### Database Connection Issues

```bash
# Test Supabase connection
curl -H "apikey: YOUR_ANON_KEY" https://your-project.supabase.co/rest/v1/

# Check environment variables
docker-compose exec backend printenv | grep SUPABASE
```

### Email Not Sending

```bash
# Check SMTP settings
docker-compose logs backend | grep -i email

# Test SMTP connection
telnet smtp.gmail.com 587
```

## Performance Optimization

1. **Enable Caching:**
   - Static assets cached in Nginx
   - API responses cached (5 min TTL)

2. **CDN Integration:**
   - Serve static assets via CDN
   - Use Cloudflare or similar

3. **Database Optimization:**
   - Add indexes on frequently queried columns
   - Use connection pooling

4. **Monitoring:**
   - Set up monitoring (Prometheus, Grafana)
   - Track metrics (CPU, memory, requests)

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Build images
        run: docker-compose build
      
      - name: Push to registry
        run: |
          docker-compose push
      
      - name: Deploy to server
        run: |
          ssh user@server "cd /app && docker-compose pull && docker-compose up -d"
```

## Production URL Structure

- Frontend: `https://yourdomain.com`
- API: `https://yourdomain.com/api/` or `https://api.yourdomain.com`
- Admin: `https://yourdomain.com/admin`

## Support

For issues:
1. Check logs: `docker-compose logs -f`
2. Verify environment variables
3. Test health endpoints
4. Review error messages

## Makefile Commands

```bash
make help          # Show all available commands
make build         # Build all images
make up            # Start all services
make down          # Stop all services
make logs          # View logs
make restart       # Restart services
make clean         # Remove everything
make status        # Show service status
make health        # Check health
```

---

**🎉 Your application is now production-ready!**
