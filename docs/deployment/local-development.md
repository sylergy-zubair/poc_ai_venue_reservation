# Local Development Environment Setup

## Overview

This guide provides step-by-step instructions for setting up a complete local development environment for the AI-powered venue booking application. It covers both Docker-based and native development setups.

## Prerequisites

### Required Software

**Essential Tools:**
- **Node.js**: Version 18.x or later
- **npm**: Version 8.x or later (comes with Node.js)
- **Git**: For version control
- **VS Code**: Recommended IDE with extensions

**Database & Services:**
- **MongoDB**: Version 6.x or later
- **Redis**: Version 7.x or later (optional, for caching)
- **Docker**: For containerized development (recommended)

**Optional Tools:**
- **MongoDB Compass**: GUI for MongoDB
- **Postman**: API testing
- **Chrome DevTools**: Frontend debugging

### System Requirements

**Minimum Specifications:**
- RAM: 8GB (16GB recommended)
- Storage: 10GB free space
- CPU: Multi-core processor (4+ cores recommended)
- OS: Windows 10+, macOS 10.15+, Ubuntu 18.04+

## Quick Start (Docker Method - Recommended)

### 1. Repository Setup

```bash
# Clone the repository
git clone <repository-url>
cd venue-booking-poc

# Copy environment template
cp .env.example .env

# Edit environment variables
code .env  # or your preferred editor
```

### 2. Environment Configuration

**Update .env file:**
```bash
# Database
MONGODB_URI=mongodb://localhost:27017/venue_booking_dev

# API Keys (get from respective providers)
CLAUDE_API_KEY=your_claude_api_key_here
VENUE_API_KEY=your_venue_api_key_here

# Development Settings
NODE_ENV=development
LOG_LEVEL=debug
CORS_ORIGIN=http://localhost:3000
JWT_SECRET=dev-secret-key-change-in-production

# Optional: Redis for caching
REDIS_URL=redis://localhost:6379
```

### 3. Start Development Environment

```bash
# Start all services with Docker Compose
docker-compose -f docker-compose.dev.yml up -d

# Verify services are running
docker-compose ps

# View logs
docker-compose logs -f
```

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/api-docs
- **MongoDB**: mongodb://localhost:27017

### 5. Development Workflow

```bash
# Install dependencies (if needed)
docker-compose exec frontend npm install
docker-compose exec backend npm install

# Run tests
docker-compose exec frontend npm test
docker-compose exec backend npm test

# Stop services
docker-compose down

# Rebuild after changes
docker-compose up --build
```

## Native Development Setup

### 1. Install Node.js and npm

**Using Node Version Manager (recommended):**
```bash
# Install nvm (Linux/macOS)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install Node.js
nvm install 18
nvm use 18
nvm alias default 18

# Verify installation
node --version  # Should show v18.x.x
npm --version   # Should show 8.x.x or later
```

**Direct Installation:**
- Download from [nodejs.org](https://nodejs.org/)
- Follow platform-specific installation instructions

### 2. Install MongoDB

**macOS (using Homebrew):**
```bash
# Install MongoDB
brew tap mongodb/brew
brew install mongodb-community@6.0

# Start MongoDB service
brew services start mongodb/brew/mongodb-community
```

**Ubuntu/Debian:**
```bash
# Import MongoDB public key
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Install MongoDB
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB service
sudo systemctl start mongod
sudo systemctl enable mongod
```

**Windows:**
- Download installer from [MongoDB Download Center](https://www.mongodb.com/try/download/community)
- Run installer and follow setup wizard
- MongoDB will start automatically as a Windows service

### 3. Install Redis (Optional)

**macOS:**
```bash
brew install redis
brew services start redis
```

**Ubuntu/Debian:**
```bash
sudo apt-get install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

**Windows:**
- Download from [Redis Windows releases](https://github.com/microsoftarchive/redis/releases)
- Extract and run redis-server.exe

### 4. Project Setup

```bash
# Clone repository
git clone <repository-url>
cd venue-booking-poc

# Copy environment file
cp .env.example .env

# Install frontend dependencies
cd frontend
npm install
cd ..

# Install backend dependencies
cd backend
npm install
cd ..
```

### 5. Database Initialization

```bash
# Start MongoDB (if not running as service)
mongod --dbpath /usr/local/var/mongodb --logpath /usr/local/var/log/mongodb/mongo.log --fork

# Create database and sample data
mongosh venue_booking_dev

# In MongoDB shell, create sample data:
use venue_booking_dev

db.venues.insertMany([
  {
    name: "Barcelona Convention Center",
    location: { city: "Barcelona", country: "Spain" },
    capacity: { min: 50, max: 500, recommended: 300 },
    pricing: { hourly: 250, currency: "EUR" },
    amenities: ["wifi", "av_equipment", "parking"],
    createdAt: new Date()
  },
  {
    name: "Madrid Business Hub", 
    location: { city: "Madrid", country: "Spain" },
    capacity: { min: 20, max: 200, recommended: 100 },
    pricing: { hourly: 150, currency: "EUR" },
    amenities: ["wifi", "catering", "parking"],
    createdAt: new Date()
  }
])

exit
```

### 6. Start Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

## VS Code Setup

### Recommended Extensions

**Essential Extensions:**
```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-jest",
    "ms-toolsai.jupyter",
    "mongodb.mongodb-vscode"
  ]
}
```

### Workspace Configuration

**Create .vscode/settings.json:**
```json
{
  "typescript.preferences.useAliasesForRenames": false,
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "jest.autoRun": "watch",
  "files.exclude": {
    "**/node_modules": true,
    "**/.next": true,
    "**/dist": true,
    "**/coverage": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/.next": true,
    "**/dist": true,
    "**/coverage": true
  },
  "emmet.includeLanguages": {
    "typescript": "html",
    "typescriptreact": "html"
  }
}
```

**Create .vscode/launch.json for debugging:**
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Backend",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/backend/src/server.ts",
      "outFiles": [
        "${workspaceFolder}/backend/dist/**/*.js"
      ],
      "env": {
        "NODE_ENV": "development"
      },
      "envFile": "${workspaceFolder}/.env",
      "runtimeArgs": ["-r", "ts-node/register"],
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "name": "Debug Frontend",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}/frontend",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"]
    }
  ]
}
```

### Code Snippets

**Create .vscode/snippets.code-snippets:**
```json
{
  "React Test Component": {
    "prefix": "rtest",
    "body": [
      "import { render, screen } from '@testing-library/react';",
      "import userEvent from '@testing-library/user-event';",
      "import { ${1:ComponentName} } from './${1:ComponentName}';",
      "",
      "describe('${1:ComponentName}', () => {",
      "  test('should render correctly', () => {",
      "    render(<${1:ComponentName} />);",
      "    ",
      "    expect(screen.getByText('${2:expected text}')).toBeInTheDocument();",
      "  });",
      "});"
    ],
    "description": "Create a React component test"
  },
  "API Route Test": {
    "prefix": "apitest",
    "body": [
      "import request from 'supertest';",
      "import { app } from '../app';",
      "",
      "describe('${1:Route} API', () => {",
      "  test('should ${2:description}', async () => {",
      "    const response = await request(app)",
      "      .${3:method}('${4:endpoint}')",
      "      .expect(${5:statusCode});",
      "    ",
      "    expect(response.body).toEqual(${6:expectedResponse});",
      "  });",
      "});"
    ],
    "description": "Create an API route test"
  }
}
```

## Development Scripts

### Package.json Scripts

**Frontend scripts:**
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "type-check": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test",
    "storybook": "start-storybook -p 6006",
    "build-storybook": "build-storybook"
  }
}
```

**Backend scripts:**
```json
{
  "scripts": {
    "dev": "nodemon src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "type-check": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:integration": "jest --config jest.integration.config.js",
    "db:seed": "node scripts/seed-database.js",
    "db:migrate": "node scripts/migrate-database.js"
  }
}
```

### Custom Development Scripts

**Create scripts/dev-setup.sh:**
```bash
#!/bin/bash
# Initial development setup script

echo "🚀 Setting up development environment..."

# Check Node.js version
NODE_VERSION=$(node --version)
echo "Node.js version: $NODE_VERSION"

if [[ ! "$NODE_VERSION" =~ ^v18\. ]]; then
    echo "❌ Node.js version 18.x is required"
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please update .env with your API keys"
fi

# Install dependencies
echo "📦 Installing dependencies..."
cd frontend && npm install && cd ..
cd backend && npm install && cd ..

# Setup database
echo "🗄️  Setting up database..."
if command -v mongosh &> /dev/null; then
    mongosh venue_booking_dev --eval "
      db.venues.countDocuments() === 0 && db.venues.insertMany([
        {
          name: 'Sample Venue',
          location: { city: 'Test City', country: 'Test Country' },
          capacity: { min: 10, max: 100, recommended: 50 }
        }
      ])
    "
    echo "✅ Sample data created"
else
    echo "⚠️  MongoDB not found. Please install MongoDB manually."
fi

# Run tests to verify setup
echo "🧪 Running tests..."
cd frontend && npm test -- --passWithNoTests && cd ..
cd backend && npm test -- --passWithNoTests && cd ..

echo "✅ Development environment setup complete!"
echo ""
echo "To start development:"
echo "  Terminal 1: cd backend && npm run dev"
echo "  Terminal 2: cd frontend && npm run dev"
echo ""
echo "Access points:"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:3001"
echo "  API Docs: http://localhost:3001/api-docs"
```

**Create scripts/test-all.sh:**
```bash
#!/bin/bash
# Run all tests across the project

echo "🧪 Running all tests..."

# Frontend tests
echo "Testing frontend..."
cd frontend
npm run test:coverage
FRONTEND_EXIT_CODE=$?
cd ..

# Backend tests  
echo "Testing backend..."
cd backend
npm run test:coverage
BACKEND_EXIT_CODE=$?
cd ..

# Integration tests
echo "Running integration tests..."
cd backend
npm run test:integration
INTEGRATION_EXIT_CODE=$?
cd ..

# Report results
echo ""
echo "📊 Test Results:"
if [ $FRONTEND_EXIT_CODE -eq 0 ]; then
    echo "✅ Frontend tests passed"
else
    echo "❌ Frontend tests failed"
fi

if [ $BACKEND_EXIT_CODE -eq 0 ]; then
    echo "✅ Backend tests passed"
else
    echo "❌ Backend tests failed"
fi

if [ $INTEGRATION_EXIT_CODE -eq 0 ]; then
    echo "✅ Integration tests passed"
else
    echo "❌ Integration tests failed"
fi

# Exit with error if any tests failed
if [ $FRONTEND_EXIT_CODE -ne 0 ] || [ $BACKEND_EXIT_CODE -ne 0 ] || [ $INTEGRATION_EXIT_CODE -ne 0 ]; then
    exit 1
fi

echo "🎉 All tests passed!"
```

## Hot Reload and Live Development

### Backend Hot Reload with Nodemon

**nodemon.json:**
```json
{
  "watch": ["src"],
  "ext": "ts,js,json",
  "ignore": ["src/**/*.test.ts", "src/**/*.spec.ts"],
  "exec": "ts-node src/server.ts",
  "env": {
    "NODE_ENV": "development"
  },
  "delay": "1000"
}
```

### Frontend Hot Reload with Next.js

**next.config.js:**
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    // Enable fast refresh
    fastRefresh: true,
  },
  // API rewrites for development
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
    ];
  },
  // Watch for changes in these directories
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
```

## Database Management

### MongoDB Development Tools

**Connection via MongoDB Compass:**
- Connection String: `mongodb://localhost:27017/venue_booking_dev`
- No authentication required for local development

**Command Line Operations:**
```bash
# Connect to development database
mongosh venue_booking_dev

# Common operations
db.sessions.find()              # View sessions
db.venues.find()               # View venues
db.audit_logs.find().limit(10) # View recent logs

# Clear collections for testing
db.sessions.deleteMany({})
db.audit_logs.deleteMany({})

# Create indexes
db.sessions.createIndex({ "sessionId": 1 })
db.venues.createIndex({ "location.city": 1 })
```

### Database Backup and Restore

**Backup Script:**
```bash
#!/bin/bash
# scripts/backup-db.sh

BACKUP_DIR="./backups"
DATE=$(date +"%Y%m%d_%H%M%S")
DB_NAME="venue_booking_dev"

mkdir -p $BACKUP_DIR

echo "Creating backup of $DB_NAME..."
mongodump -d $DB_NAME -o "$BACKUP_DIR/backup_$DATE"

echo "Backup created: $BACKUP_DIR/backup_$DATE"
```

**Restore Script:**
```bash
#!/bin/bash
# scripts/restore-db.sh

if [ -z "$1" ]; then
    echo "Usage: $0 <backup_directory>"
    exit 1
fi

BACKUP_DIR=$1
DB_NAME="venue_booking_dev"

echo "Restoring $DB_NAME from $BACKUP_DIR..."
mongorestore -d $DB_NAME --drop "$BACKUP_DIR/$DB_NAME"

echo "Database restored successfully"
```

## Troubleshooting Common Issues

### Port Conflicts

**Check what's using a port:**
```bash
# macOS/Linux
lsof -ti:3000
lsof -ti:3001

# Windows
netstat -ano | findstr :3000
```

**Kill process using port:**
```bash
# macOS/Linux
kill -9 $(lsof -ti:3000)

# Windows
taskkill /PID <PID> /F
```

### Node.js Version Issues

**Switch Node.js versions:**
```bash
# With nvm
nvm list
nvm use 18
nvm alias default 18

# Verify version
node --version
```

### MongoDB Connection Issues

**Check MongoDB status:**
```bash
# macOS
brew services list | grep mongodb

# Linux
sudo systemctl status mongod

# Windows
sc query MongoDB
```

**Start MongoDB:**
```bash
# macOS
brew services start mongodb/brew/mongodb-community

# Linux
sudo systemctl start mongod

# Windows
net start MongoDB
```

### Permission Issues

**Fix npm permissions:**
```bash
# Set npm prefix to avoid sudo
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.profile
source ~/.profile
```

### Clear Node.js Cache

**Clear npm and Node.js caches:**
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Next.js cache
rm -rf .next

# Clear Jest cache
npx jest --clearCache
```

This comprehensive local development setup ensures a smooth development experience with proper tooling, debugging capabilities, and troubleshooting resources.