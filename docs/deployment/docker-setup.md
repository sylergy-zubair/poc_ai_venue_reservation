# Docker Setup and Containerization Guide

## Overview

This guide provides comprehensive instructions for containerizing the AI-powered venue booking application using Docker. The setup includes multi-stage builds, production optimizations, and development-friendly configurations.

## Docker Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Compose Stack                     │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   Frontend      │  │    Backend      │  │   MongoDB   │ │
│  │   (Next.js)     │  │   (Node.js)     │  │             │ │
│  │   Port: 3000    │  │   Port: 3001    │  │ Port: 27017 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
│           │                     │                   │       │
│           └─────────────────────┼───────────────────┘       │
│                                 │                           │
│  ┌─────────────────┐  ┌─────────▼─────────┐               │
│  │     Redis       │  │     Networks      │               │
│  │   (Optional)    │  │   - app-network   │               │
│  │   Port: 6379    │  │   - bridge        │               │
│  └─────────────────┘  └───────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

## Dockerfile Configurations

### Frontend Dockerfile (Production)

```dockerfile
# frontend/Dockerfile
# Multi-stage build for optimized production image

# Stage 1: Dependencies installation
FROM node:18-alpine AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Stage 2: Build stage
FROM node:18-alpine AS builder
WORKDIR /app

# Copy package files and install all dependencies (including dev)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY . .

# Set environment variables for build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application
RUN npm run build

# Stage 3: Production runtime
FROM node:18-alpine AS runner
WORKDIR /app

# Set environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Set hostname
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application
CMD ["node", "server.js"]
```

### Backend Dockerfile (Production)

```dockerfile
# backend/Dockerfile
# Multi-stage build for Node.js backend

# Stage 1: Dependencies installation
FROM node:18-alpine AS deps
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache libc6-compat python3 make g++

# Copy package files
COPY package.json package-lock.json ./

# Install production dependencies
RUN npm ci --only=production && npm cache clean --force

# Stage 2: Build stage
FROM node:18-alpine AS builder
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache libc6-compat python3 make g++

# Copy package files and install all dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Stage 3: Production runtime
FROM node:18-alpine AS runner
WORKDIR /app

# Set environment
ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Copy production dependencies
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

# Create logs directory
RUN mkdir -p logs && chown nodejs:nodejs logs

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start the application
CMD ["node", "dist/server.js"]
```

### Development Dockerfiles

**Frontend Development Dockerfile:**
```dockerfile
# frontend/Dockerfile.dev
FROM node:18-alpine

WORKDIR /app

# Install dependencies for hot reload
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies (including dev)
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Enable hot reload
ENV WATCHPACK_POLLING=true

# Start development server
CMD ["npm", "run", "dev"]
```

**Backend Development Dockerfile:**
```dockerfile
# backend/Dockerfile.dev
FROM node:18-alpine

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache libc6-compat python3 make g++

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 3001

# Enable debugging
ENV NODE_OPTIONS="--inspect=0.0.0.0:9229"

# Start development server with nodemon
CMD ["npm", "run", "dev"]
```

## Docker Compose Configurations

### Production Docker Compose

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      target: runner
    container_name: venue-booking-frontend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=http://backend:3001
      - NEXT_PUBLIC_SENTRY_DSN=${SENTRY_DSN}
    depends_on:
      backend:
        condition: service_healthy
    networks:
      - app-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
      target: runner
    container_name: venue-booking-backend
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - MONGODB_URI=mongodb://mongo:27017/venue_booking_prod
      - REDIS_URL=redis://redis:6379
      - CLAUDE_API_KEY=${CLAUDE_API_KEY}
      - VENUE_API_KEY=${VENUE_API_KEY}
      - JWT_SECRET=${JWT_SECRET}
      - CORS_ORIGIN=http://frontend:3000
      - LOG_LEVEL=info
      - SENTRY_DSN=${SENTRY_DSN}
    depends_on:
      mongo:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - app-network
    restart: unless-stopped
    volumes:
      - backend-logs:/app/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  mongo:
    image: mongo:6
    container_name: venue-booking-mongo
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_ROOT_USERNAME=${MONGO_ROOT_USERNAME}
      - MONGO_INITDB_ROOT_PASSWORD=${MONGO_ROOT_PASSWORD}
      - MONGO_INITDB_DATABASE=venue_booking_prod
    networks:
      - app-network
    restart: unless-stopped
    volumes:
      - mongo-data:/data/db
      - mongo-config:/data/configdb
      - ./mongo/init.js:/docker-entrypoint-initdb.d/init.js:ro
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  redis:
    image: redis:7-alpine
    container_name: venue-booking-redis
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    networks:
      - app-network
    restart: unless-stopped
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    container_name: venue-booking-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - frontend
      - backend
    networks:
      - app-network
    restart: unless-stopped

networks:
  app-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16

volumes:
  mongo-data:
    driver: local
  mongo-config:
    driver: local
  redis-data:
    driver: local
  backend-logs:
    driver: local
```

### Development Docker Compose

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    container_name: venue-booking-frontend-dev
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - NEXT_PUBLIC_API_URL=http://localhost:3001
      - WATCHPACK_POLLING=true
    volumes:
      - ./frontend:/app
      - /app/node_modules
      - /app/.next
    networks:
      - app-network
    stdin_open: true
    tty: true

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    container_name: venue-booking-backend-dev
    ports:
      - "3001:3001"
      - "9229:9229"  # Debug port
    environment:
      - NODE_ENV=development
      - PORT=3001
      - MONGODB_URI=mongodb://mongo:27017/venue_booking_dev
      - CLAUDE_API_KEY=${CLAUDE_API_KEY}
      - VENUE_API_KEY=${VENUE_API_KEY}
      - JWT_SECRET=dev-secret-key
      - CORS_ORIGIN=http://localhost:3000
      - LOG_LEVEL=debug
    volumes:
      - ./backend:/app
      - /app/node_modules
    depends_on:
      - mongo
    networks:
      - app-network
    stdin_open: true
    tty: true

  mongo:
    image: mongo:6
    container_name: venue-booking-mongo-dev
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_DATABASE=venue_booking_dev
    networks:
      - app-network
    volumes:
      - mongo-dev-data:/data/db

networks:
  app-network:
    driver: bridge

volumes:
  mongo-dev-data:
    driver: local
```

## Docker Commands and Scripts

### Build Scripts

**Production Build Script:**
```bash
#!/bin/bash
# scripts/docker-build-prod.sh

set -e

echo "Building production Docker images..."

# Build frontend
echo "Building frontend..."
docker build -f frontend/Dockerfile -t venue-booking-frontend:latest ./frontend

# Build backend
echo "Building backend..."
docker build -f backend/Dockerfile -t venue-booking-backend:latest ./backend

echo "Production images built successfully!"

# Tag images with version
VERSION=$(git describe --tags --always)
docker tag venue-booking-frontend:latest venue-booking-frontend:$VERSION
docker tag venue-booking-backend:latest venue-booking-backend:$VERSION

echo "Images tagged with version: $VERSION"
```

**Development Setup Script:**
```bash
#!/bin/bash
# scripts/docker-dev-setup.sh

set -e

echo "Setting up development environment..."

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "Please update .env file with your configuration"
fi

# Build and start development containers
echo "Building and starting development containers..."
docker-compose -f docker-compose.dev.yml up --build -d

echo "Development environment is ready!"
echo "Frontend: http://localhost:3000"
echo "Backend: http://localhost:3001"
echo "MongoDB: mongodb://localhost:27017"
```

### Utility Scripts

**Database Seed Script:**
```bash
#!/bin/bash
# scripts/seed-database.sh

docker-compose exec mongo mongosh venue_booking_dev --eval "
  db.venues.insertMany([
    {
      name: 'Barcelona Convention Center',
      location: { city: 'Barcelona', country: 'Spain' },
      capacity: { min: 50, max: 500, recommended: 300 }
    },
    {
      name: 'Madrid Business Hub',
      location: { city: 'Madrid', country: 'Spain' },
      capacity: { min: 20, max: 200, recommended: 100 }
    }
  ])
"

echo "Database seeded with sample data"
```

**Logs Monitoring Script:**
```bash
#!/bin/bash
# scripts/logs.sh

SERVICE=${1:-all}

case $SERVICE in
  frontend)
    docker-compose logs -f frontend
    ;;
  backend)
    docker-compose logs -f backend
    ;;
  mongo)
    docker-compose logs -f mongo
    ;;
  redis)
    docker-compose logs -f redis
    ;;
  all)
    docker-compose logs -f
    ;;
  *)
    echo "Usage: $0 [frontend|backend|mongo|redis|all]"
    exit 1
    ;;
esac
```

## Environment Configuration

### Environment Variables

**.env.example:**
```bash
# Database Configuration
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=secure_password_here
MONGODB_URI=mongodb://admin:secure_password_here@mongo:27017/venue_booking_prod?authSource=admin

# Redis Configuration
REDIS_PASSWORD=redis_password_here
REDIS_URL=redis://:redis_password_here@redis:6379

# API Keys
CLAUDE_API_KEY=your_claude_api_key_here
VENUE_API_KEY=your_venue_api_key_here

# Security
JWT_SECRET=your_jwt_secret_256_bit_key_here
SESSION_SECRET=your_session_secret_here

# Monitoring
SENTRY_DSN=https://your_sentry_dsn@sentry.io/project_id

# Application Configuration
NODE_ENV=production
LOG_LEVEL=info
CORS_ORIGIN=https://your-domain.com
```

### Docker Secrets (for Production)

```yaml
# docker-compose.secrets.yml
version: '3.8'

services:
  backend:
    secrets:
      - claude_api_key
      - venue_api_key
      - jwt_secret
      - mongo_password
    environment:
      - CLAUDE_API_KEY_FILE=/run/secrets/claude_api_key
      - VENUE_API_KEY_FILE=/run/secrets/venue_api_key
      - JWT_SECRET_FILE=/run/secrets/jwt_secret
      - MONGO_PASSWORD_FILE=/run/secrets/mongo_password

secrets:
  claude_api_key:
    external: true
  venue_api_key:
    external: true
  jwt_secret:
    external: true
  mongo_password:
    external: true
```

## Production Optimizations

### Multi-stage Build Benefits

1. **Reduced Image Size**: Remove build dependencies from final image
2. **Security**: Smaller attack surface with fewer packages
3. **Performance**: Faster image pulls and container starts
4. **Layer Caching**: Efficient rebuilds with proper layer ordering

### Resource Limits

```yaml
# Resource constraints for production
services:
  frontend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M

  backend:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 1G
        reservations:
          cpus: '1.0'
          memory: 512M

  mongo:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 1G
```

### Health Checks and Monitoring

**Custom Health Check Script:**
```bash
#!/bin/bash
# scripts/health-check.sh

check_service() {
    local service=$1
    local url=$2
    local expected_status=$3
    
    response=$(curl -s -o /dev/null -w "%{http_code}" $url)
    
    if [ "$response" = "$expected_status" ]; then
        echo "✅ $service is healthy"
        return 0
    else
        echo "❌ $service is unhealthy (HTTP $response)"
        return 1
    fi
}

# Check all services
check_service "Frontend" "http://localhost:3000/api/health" "200"
check_service "Backend" "http://localhost:3001/health" "200"

# Check database connectivity
if docker-compose exec -T mongo mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    echo "✅ MongoDB is healthy"
else
    echo "❌ MongoDB is unhealthy"
    exit 1
fi

echo "🎉 All services are healthy!"
```

## Troubleshooting

### Common Docker Issues

**Issue: Container Out of Memory**
```yaml
# Solution: Increase memory limits
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 2G  # Increase from 1G
```

**Issue: Permission Denied**
```bash
# Solution: Fix file permissions
sudo chown -R $(id -u):$(id -g) ./
```

**Issue: Port Already in Use**
```bash
# Solution: Find and kill process using port
sudo lsof -ti:3000 | xargs kill -9
```

**Issue: MongoDB Connection Failed**
```bash
# Solution: Check container logs
docker-compose logs mongo

# Restart MongoDB container
docker-compose restart mongo
```

### Performance Monitoring

**Container Resource Usage:**
```bash
# Monitor resource usage
docker stats

# Monitor specific container
docker stats venue-booking-backend

# Export metrics
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
```

**Log Analysis:**
```bash
# Follow logs in real-time
docker-compose logs -f --tail=100

# Search logs for errors
docker-compose logs | grep -i error

# Export logs
docker-compose logs > application.log
```

This Docker setup provides a robust, scalable, and maintainable containerization solution for the AI-powered venue booking application, supporting both development and production environments.