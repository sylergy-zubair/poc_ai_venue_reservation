# Cloud Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the AI-powered venue booking application to various cloud platforms. Each platform section includes specific configurations, best practices, and troubleshooting tips.

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloud Infrastructure                     │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   Load Balancer │  │   CDN/Assets    │  │   SSL/TLS   │ │
│  │   (nginx/ALB)   │  │   (CloudFront)  │  │ Certificate │ │
│  └─────────┬───────┘  └─────────────────┘  └─────────────┘ │
│            │                                               │
│  ┌─────────▼───────┐                                       │
│  │   Web Services  │                                       │
│  │  ┌─────────────┐│  ┌─────────────────┐                 │
│  │  │  Frontend   ││  │    Backend      │                 │
│  │  │  (Next.js)  ││  │   (Node.js)     │                 │
│  │  └─────────────┘│  └─────────────────┘                 │
│  └─────────────────┘                                       │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │    Database     │  │     Cache       │  │  Monitoring │ │
│  │   (MongoDB)     │  │    (Redis)      │  │   (Logs)    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Heroku Deployment

### Prerequisites

**Heroku CLI Installation:**
```bash
# macOS
brew tap heroku/brew && brew install heroku

# Ubuntu/Debian
curl https://cli-assets.heroku.com/install.sh | sh

# Windows - Download installer from heroku.com

# Verify installation
heroku --version
```

### Application Setup

**1. Heroku Configuration Files**

**Create heroku.yml:**
```yaml
build:
  docker:
    web: frontend/Dockerfile
    api: backend/Dockerfile
release:
  image: api
  command:
    - npm run db:migrate
run:
  web: npm start
  api: npm start
addons:
  - plan: heroku-postgresql:hobby-dev
  - plan: heroku-redis:hobby-dev
```

**Create Procfile:**
```
web: npm start
api: npm start
release: npm run db:migrate
```

**2. Environment Configuration**

```bash
# Login to Heroku
heroku login

# Create Heroku applications
heroku create venue-booking-frontend --region us
heroku create venue-booking-backend --region us

# Set environment variables for backend
heroku config:set NODE_ENV=production -a venue-booking-backend
heroku config:set CLAUDE_API_KEY=your_claude_api_key -a venue-booking-backend
heroku config:set VENUE_API_KEY=your_venue_api_key -a venue-booking-backend
heroku config:set JWT_SECRET=your_jwt_secret_256_bit -a venue-booking-backend

# Set environment variables for frontend
heroku config:set NODE_ENV=production -a venue-booking-frontend
heroku config:set NEXT_PUBLIC_API_URL=https://venue-booking-backend.herokuapp.com -a venue-booking-frontend

# Add MongoDB add-on
heroku addons:create mongolab:sandbox -a venue-booking-backend

# Add Redis add-on
heroku addons:create heroku-redis:hobby-dev -a venue-booking-backend
```

**3. Deployment Script**

**Create scripts/deploy-heroku.sh:**
```bash
#!/bin/bash
set -e

echo "🚀 Deploying to Heroku..."

# Set stack to container for Docker deployment
heroku stack:set container -a venue-booking-frontend
heroku stack:set container -a venue-booking-backend

# Deploy backend
echo "Deploying backend..."
cd backend
git add .
git commit -m "Deploy backend to Heroku"
heroku git:remote -a venue-booking-backend
git push heroku main
cd ..

# Deploy frontend
echo "Deploying frontend..."
cd frontend
git add .
git commit -m "Deploy frontend to Heroku"
heroku git:remote -a venue-booking-frontend
git push heroku main
cd ..

# Run database migrations
heroku run npm run db:migrate -a venue-booking-backend

echo "✅ Deployment completed!"
echo "Frontend: https://venue-booking-frontend.herokuapp.com"
echo "Backend: https://venue-booking-backend.herokuapp.com"
```

**4. Health Checks and Monitoring**

```javascript
// backend/src/middleware/heroku.ts
export const herokuHealthCheck = (req: Request, res: Response, next: NextFunction) => {
  // Heroku sends health checks to /
  if (req.path === '/' && req.method === 'GET') {
    return res.status(200).json({
      status: 'healthy',
      service: 'venue-booking-api',
      timestamp: new Date().toISOString()
    });
  }
  next();
};
```

## Render Deployment

### Configuration Files

**1. Create render.yaml:**
```yaml
services:
  - type: web
    name: venue-booking-frontend
    env: node
    plan: starter
    buildCommand: npm ci && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: NEXT_PUBLIC_API_URL
        fromService:
          type: web
          name: venue-booking-backend
          property: host
    routes:
      - type: rewrite
        source: /*
        destination: /index.html

  - type: web
    name: venue-booking-backend
    env: node
    plan: starter
    buildCommand: npm ci && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: MONGODB_URI
        fromDatabase:
          name: venue-booking-db
          property: connectionString
      - key: CLAUDE_API_KEY
        sync: false  # Set manually in Render dashboard
      - key: VENUE_API_KEY
        sync: false  # Set manually in Render dashboard
      - key: JWT_SECRET
        generateValue: true
    healthCheckPath: /health

databases:
  - name: venue-booking-db
    databaseName: venue_booking
    user: venue_user
    plan: starter
```

**2. Deployment Script**

```bash
#!/bin/bash
# scripts/deploy-render.sh

echo "🚀 Deploying to Render..."

# Ensure we're on the main branch
git checkout main
git pull origin main

# Create deployment commit
git add .
git commit -m "Deploy to Render - $(date)"
git push origin main

echo "✅ Code pushed to repository"
echo "Render will automatically deploy the application"
echo "Monitor deployment at: https://dashboard.render.com"
```

**3. Build Configuration**

**Create render-build.sh:**
```bash
#!/bin/bash
# Build script for Render

set -e

echo "Building application for Render..."

# Install dependencies
npm ci

# Run type checking
npm run type-check

# Run tests
npm run test -- --passWithNoTests

# Build application
npm run build

echo "Build completed successfully!"
```

## Digital Ocean App Platform

### Configuration

**1. Create .do/app.yaml:**
```yaml
name: venue-booking-app
region: nyc
services:
  - name: frontend
    source_dir: /frontend
    github:
      repo: your-username/venue-booking-poc
      branch: main
    run_command: npm start
    build_command: npm ci && npm run build
    environment_slug: node-js
    instance_count: 1
    instance_size_slug: basic-xxs
    routes:
      - path: /
    envs:
      - key: NODE_ENV
        value: production
      - key: NEXT_PUBLIC_API_URL
        value: ${backend.PUBLIC_URL}

  - name: backend
    source_dir: /backend
    github:
      repo: your-username/venue-booking-poc
      branch: main
    run_command: npm start
    build_command: npm ci && npm run build
    environment_slug: node-js
    instance_count: 1
    instance_size_slug: basic-xxs
    routes:
      - path: /api
    envs:
      - key: NODE_ENV
        value: production
      - key: MONGODB_URI
        value: ${venue-booking-db.DATABASE_URL}
      - key: REDIS_URL
        value: ${venue-booking-redis.DATABASE_URL}
      - key: CLAUDE_API_KEY
        value: your_claude_api_key
        type: SECRET
      - key: VENUE_API_KEY
        value: your_venue_api_key
        type: SECRET
      - key: JWT_SECRET
        value: your_jwt_secret
        type: SECRET
    health_check:
      http_path: /health

databases:
  - name: venue-booking-db
    engine: MONGODB
    size: db-s-1vcpu-1gb
    num_nodes: 1
    version: "6"

  - name: venue-booking-redis
    engine: REDIS
    size: db-s-1vcpu-1gb
    num_nodes: 1
    version: "7"
```

**2. Deployment with doctl CLI:**

```bash
# Install doctl
curl -sL https://github.com/digitalocean/doctl/releases/download/v1.94.0/doctl-1.94.0-linux-amd64.tar.gz | tar -xzv
sudo mv doctl /usr/local/bin

# Authenticate
doctl auth init

# Deploy application
doctl apps create .do/app.yaml

# Monitor deployment
doctl apps list
doctl apps get <app-id>
```

## AWS Deployment (EC2 + RDS)

### Infrastructure Setup

**1. Launch EC2 Instance:**

```bash
# Launch EC2 instance with Docker
aws ec2 run-instances \
  --image-id ami-0c02fb55956c7d316 \
  --instance-type t3.medium \
  --key-name your-key-pair \
  --security-group-ids sg-xxxxxxxxx \
  --subnet-id subnet-xxxxxxxxx \
  --user-data file://ec2-userdata.sh
```

**Create ec2-userdata.sh:**
```bash
#!/bin/bash
yum update -y
yum install -y docker git

# Start Docker
systemctl start docker
systemctl enable docker
usermod -a -G docker ec2-user

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Clone repository
cd /home/ec2-user
git clone https://github.com/your-username/venue-booking-poc.git
cd venue-booking-poc

# Create environment file
cat > .env << EOF
NODE_ENV=production
MONGODB_URI=mongodb://your-rds-endpoint:27017/venue_booking
CLAUDE_API_KEY=your_claude_api_key
VENUE_API_KEY=your_venue_api_key
JWT_SECRET=your_jwt_secret
EOF

# Start application
docker-compose -f docker-compose.prod.yml up -d
```

**2. RDS MongoDB Setup:**

```bash
# Create MongoDB cluster
aws docdb create-db-cluster \
  --db-cluster-identifier venue-booking-cluster \
  --engine docdb \
  --master-username admin \
  --master-user-password SecurePassword123 \
  --vpc-security-group-ids sg-xxxxxxxxx \
  --db-subnet-group-name your-subnet-group
```

**3. Application Load Balancer:**

```bash
# Create ALB
aws elbv2 create-load-balancer \
  --name venue-booking-alb \
  --subnets subnet-xxxxxxx subnet-yyyyyyy \
  --security-groups sg-xxxxxxxxx
```

### SSL Certificate Setup

**1. Request Certificate:**
```bash
# Request SSL certificate
aws acm request-certificate \
  --domain-name your-domain.com \
  --domain-name www.your-domain.com \
  --validation-method DNS
```

**2. Configure NGINX for SSL:**

**Create nginx/ssl.conf:**
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate /etc/ssl/certs/your-domain.crt;
    ssl_certificate_key /etc/ssl/private/your-domain.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;

    location / {
        proxy_pass http://frontend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api {
        proxy_pass http://backend:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

## Google Cloud Platform (GCP)

### Cloud Run Deployment

**1. Build and Push Images:**
```bash
# Configure Docker for GCR
gcloud auth configure-docker

# Build and tag images
docker build -t gcr.io/your-project-id/venue-booking-frontend:latest ./frontend
docker build -t gcr.io/your-project-id/venue-booking-backend:latest ./backend

# Push images
docker push gcr.io/your-project-id/venue-booking-frontend:latest
docker push gcr.io/your-project-id/venue-booking-backend:latest
```

**2. Deploy to Cloud Run:**
```bash
# Deploy backend
gcloud run deploy venue-booking-backend \
  --image gcr.io/your-project-id/venue-booking-backend:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production,CLAUDE_API_KEY=your_key

# Deploy frontend
gcloud run deploy venue-booking-frontend \
  --image gcr.io/your-project-id/venue-booking-frontend:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production
```

**3. Cloud Build Configuration:**

**Create cloudbuild.yaml:**
```yaml
steps:
  # Build frontend image
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'gcr.io/$PROJECT_ID/venue-booking-frontend:$COMMIT_SHA'
      - './frontend'

  # Build backend image
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'gcr.io/$PROJECT_ID/venue-booking-backend:$COMMIT_SHA'
      - './backend'

  # Push frontend image
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - 'gcr.io/$PROJECT_ID/venue-booking-frontend:$COMMIT_SHA'

  # Push backend image
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - 'gcr.io/$PROJECT_ID/venue-booking-backend:$COMMIT_SHA'

  # Deploy to Cloud Run
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'venue-booking-backend'
      - '--image'
      - 'gcr.io/$PROJECT_ID/venue-booking-backend:$COMMIT_SHA'
      - '--region'
      - 'us-central1'
      - '--platform'
      - 'managed'
      - '--allow-unauthenticated'

images:
  - 'gcr.io/$PROJECT_ID/venue-booking-frontend:$COMMIT_SHA'
  - 'gcr.io/$PROJECT_ID/venue-booking-backend:$COMMIT_SHA'
```

## Monitoring and Logging

### Application Performance Monitoring

**1. Sentry Integration:**
```javascript
// Sentry configuration
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
});

// Error tracking middleware
export const sentryErrorHandler = Sentry.Handlers.errorHandler();
```

**2. Logging Configuration:**
```javascript
// winston logger for production
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});
```

### Health Checks

**Create comprehensive health check:**
```javascript
// backend/src/routes/health.ts
import { Router } from 'express';
import mongoose from 'mongoose';

const router = Router();

router.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    uptime: process.uptime(),
    checks: {
      database: 'unknown',
      memory: 'unknown',
      claude: 'unknown'
    }
  };

  try {
    // Database check
    await mongoose.connection.db.admin().ping();
    health.checks.database = 'healthy';
  } catch (error) {
    health.checks.database = 'unhealthy';
    health.status = 'degraded';
  }

  // Memory check
  const memUsage = process.memoryUsage();
  const memoryUtilization = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  health.checks.memory = memoryUtilization < 90 ? 'healthy' : 'warning';

  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});

export default router;
```

## Deployment Automation

### GitHub Actions CI/CD

**Create .github/workflows/deploy.yml:**
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install and test
        run: |
          npm ci
          npm run test:coverage
          npm run lint
          npm run type-check

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Heroku
        uses: akhileshns/heroku-deploy@v3.12.12
        with:
          heroku_api_key: ${{secrets.HEROKU_API_KEY}}
          heroku_app_name: "venue-booking-backend"
          heroku_email: ${{secrets.HEROKU_EMAIL}}
          usedocker: true
          docker_heroku_process_type: web
```

### Deployment Checklist

**Pre-deployment:**
- [ ] All tests pass
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] SSL certificates configured
- [ ] Monitoring tools configured
- [ ] Backup strategy in place

**Post-deployment:**
- [ ] Health checks pass
- [ ] Application accessible
- [ ] Database connectivity verified
- [ ] External API integrations working
- [ ] Monitoring alerts configured
- [ ] Performance metrics baseline established

### Rollback Strategy

**Create rollback script:**
```bash
#!/bin/bash
# scripts/rollback.sh

PLATFORM=$1
PREVIOUS_VERSION=$2

if [ -z "$PLATFORM" ] || [ -z "$PREVIOUS_VERSION" ]; then
    echo "Usage: $0 <platform> <version>"
    echo "Example: $0 heroku v1.2.3"
    exit 1
fi

case $PLATFORM in
    heroku)
        heroku rollback $PREVIOUS_VERSION -a venue-booking-backend
        heroku rollback $PREVIOUS_VERSION -a venue-booking-frontend
        ;;
    render)
        echo "Manual rollback required in Render dashboard"
        ;;
    aws)
        # Rollback ECS service
        aws ecs update-service --cluster venue-booking --service backend --task-definition venue-booking-backend:$PREVIOUS_VERSION
        ;;
    *)
        echo "Unsupported platform: $PLATFORM"
        exit 1
        ;;
esac

echo "Rollback to $PREVIOUS_VERSION completed for $PLATFORM"
```

This comprehensive cloud deployment guide ensures reliable, scalable, and maintainable deployments across multiple cloud platforms while maintaining security and performance standards.