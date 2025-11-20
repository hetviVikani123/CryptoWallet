# 🚀 Quick Deployment Commands

## Using Makefile (Recommended)

```bash
# View all available commands
make help

# Build and start production
make build
make up

# View logs
make logs

# Check health
make health

# Stop services
make down

# Complete cleanup
make clean
```

## Using Docker Compose Directly

### Production

```bash
# Build images
docker-compose build --no-cache

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Restart services
docker-compose restart
```

### Development

```bash
# Start in development mode
docker-compose -f docker-compose.dev.yml up

# Or rebuild
docker-compose -f docker-compose.dev.yml up --build
```

## Individual Services

```bash
# Backend only
docker-compose up -d backend
docker-compose logs -f backend

# Frontend only
docker-compose up -d frontend
docker-compose logs -f frontend

# Nginx only
docker-compose up -d nginx
docker-compose logs -f nginx
```

## Health Checks

```bash
# Check all services
docker-compose ps

# Backend health
curl http://localhost:5000/health

# Frontend health
curl http://localhost:3001/

# Via Nginx
curl http://localhost/
```

## Shell Access

```bash
# Backend shell
docker-compose exec backend sh

# Frontend shell
docker-compose exec frontend sh

# Nginx shell
docker-compose exec nginx sh
```

## Database Operations

```bash
# Create admin user
docker-compose exec backend npm run ts-node src/scripts/createAdmin.ts

# Seed database (if needed)
docker-compose exec backend npm run seed
```

## Maintenance

```bash
# Update images
docker-compose pull

# Rebuild specific service
docker-compose build backend
docker-compose up -d backend

# Clean up
docker system prune -a
docker volume prune
```

## Monitoring

```bash
# View resource usage
docker stats

# Container inspect
docker inspect cryptowallet-backend
docker inspect cryptowallet-frontend

# Network inspect
docker network inspect cryptowallet_cryptowallet-network
```

---

**Default Ports:**
- Frontend: http://localhost:3001
- Backend: http://localhost:5000
- Nginx: http://localhost:80

**Admin Credentials:**
- Email: admin@gmail.com
- Password: Admin@123
