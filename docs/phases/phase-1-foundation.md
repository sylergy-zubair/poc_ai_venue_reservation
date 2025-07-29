# Phase 1: Project Foundation & Setup

**Duration**: Week 1  
**Goal**: Establish project structure, testing framework, and CI/CD pipeline  
**Status**: Pending

## Overview

This phase establishes the foundational infrastructure for the AI-powered venue search and booking POC. We'll set up the project structure, configure TDD testing frameworks, and create Docker containers for consistent development and deployment.

## Deliverables

### 1.1 Project Structure Setup

**Objective**: Create a well-organized monorepo structure with proper tooling

#### Directory Structure
```
/
├── frontend/                 # Next.js/React application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Next.js pages
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API client services
│   │   ├── utils/          # Utility functions
│   │   └── types/          # TypeScript type definitions
│   ├── __tests__/          # Frontend tests
│   ├── public/             # Static assets
│   ├── package.json
│   ├── next.config.js
│   ├── tsconfig.json
│   └── jest.config.js
├── backend/                 # Node.js/Express API server
│   ├── src/
│   │   ├── routes/         # API route handlers
│   │   ├── services/       # Business logic services
│   │   ├── models/         # Data models
│   │   ├── middleware/     # Express middleware
│   │   ├── utils/          # Utility functions
│   │   └── types/          # TypeScript type definitions
│   ├── __tests__/          # Backend tests
│   ├── package.json
│   ├── tsconfig.json
│   └── jest.config.js
├── shared/                  # Shared types and utilities
│   ├── types/              # Common TypeScript types
│   └── utils/              # Shared utility functions
├── docs/                   # Project documentation
├── docker-compose.yml      # Multi-container Docker setup
├── .env.example           # Environment variables template
└── README.md              # Project overview and setup
```

#### TDD Test Configuration

**Frontend Testing Stack**:
- Jest: Test runner and assertion library
- React Testing Library: Component testing utilities
- MSW (Mock Service Worker): API mocking for tests
- Cypress: End-to-end testing

**Backend Testing Stack**:
- Jest: Test runner and assertion library
- Supertest: HTTP assertions for API testing
- MongoDB Memory Server: In-memory database for tests
- Sinon: Mocking and stubbing utilities

#### Configuration Files

**Frontend jest.config.js**:
```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

**Backend jest.config.js**:
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

### 1.2 Docker & Infrastructure

**Objective**: Containerize the application for consistent development and deployment

#### Docker Configuration

**Backend Dockerfile**:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

**Frontend Dockerfile**:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

**docker-compose.yml**:
```yaml
version: '3.8'
services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:3001
    depends_on:
      - backend

  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
      - MONGODB_URI=mongodb://mongo:27017/venue-booking
      - CLAUDE_API_KEY=${CLAUDE_API_KEY}
      - VENUE_API_KEY=${VENUE_API_KEY}
    depends_on:
      - mongo

  mongo:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

volumes:
  mongo_data:
```

#### Environment Configuration

**.env.example**:
```
# Database
MONGODB_URI=mongodb://localhost:27017/venue-booking

# API Keys
CLAUDE_API_KEY=your_claude_api_key_here
VENUE_API_KEY=your_venue_api_key_here

# Server Configuration
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000

# Logging
LOG_LEVEL=debug
LOG_FILE=logs/app.log
```

### 1.3 Documentation Structure

**Objective**: Create comprehensive project documentation

The complete documentation structure has been created with the following organization:

- **phases/**: Detailed breakdown of each development phase
- **architecture/**: System design and technical architecture
- **testing/**: TDD guidelines and testing patterns
- **deployment/**: Docker and cloud deployment guides
- **api/**: API documentation and integration guides

## TDD Test Scenarios for Phase 1

### Test 1: Project Structure Validation
```javascript
describe('Project Structure', () => {
  test('should have all required directories', () => {
    expect(fs.existsSync('./frontend/src')).toBe(true);
    expect(fs.existsSync('./backend/src')).toBe(true);
    expect(fs.existsSync('./shared')).toBe(true);
    expect(fs.existsSync('./docs')).toBe(true);
  });

  test('should have proper package.json in each module', () => {
    expect(fs.existsSync('./frontend/package.json')).toBe(true);
    expect(fs.existsSync('./backend/package.json')).toBe(true);
  });
});
```

### Test 2: Docker Configuration
```javascript
describe('Docker Setup', () => {
  test('should build docker images successfully', async () => {
    const frontendBuild = await exec('docker build ./frontend');
    const backendBuild = await exec('docker build ./backend');
    
    expect(frontendBuild.exitCode).toBe(0);
    expect(backendBuild.exitCode).toBe(0);
  });

  test('should start all services with docker-compose', async () => {
    const composeUp = await exec('docker-compose up -d');
    expect(composeUp.exitCode).toBe(0);
  });
});
```

### Test 3: Testing Framework Configuration
```javascript
describe('Testing Framework', () => {
  test('should run frontend tests', async () => {
    const frontendTests = await exec('npm test', { cwd: './frontend' });
    expect(frontendTests.exitCode).toBe(0);
  });

  test('should run backend tests', async () => {
    const backendTests = await exec('npm test', { cwd: './backend' });
    expect(backendTests.exitCode).toBe(0);
  });
});
```

## Acceptance Criteria

- [ ] Project structure follows monorepo pattern with clear separation
- [ ] TDD testing framework configured for both frontend and backend
- [ ] Docker containers build and run successfully
- [ ] All tests pass and coverage thresholds are met
- [ ] Environment variables properly configured
- [ ] Documentation structure is complete and organized
- [ ] ESLint and Prettier configured for consistent code style
- [ ] TypeScript configured with strict settings

## Dependencies and Prerequisites

- Node.js 18+ installed locally for development
- Docker and Docker Compose for containerization
- MongoDB for data persistence
- Access to Claude API (Anthropic)
- Access to venue booking API (TBD)

## Risk Mitigation

- **Risk**: Docker setup complexity for developer new to containers
  - **Mitigation**: Comprehensive documentation with step-by-step instructions
  
- **Risk**: TDD setup overhead
  - **Mitigation**: Pre-configured test templates and examples

- **Risk**: API key management
  - **Mitigation**: Clear .env.example and security guidelines

## Next Phase Dependencies

Phase 1 completion is required before starting Phase 2. All tests must pass and infrastructure must be validated.