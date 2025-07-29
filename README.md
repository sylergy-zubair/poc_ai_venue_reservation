# AI-Powered Venue Search & Booking POC

A proof-of-concept application that uses natural language processing to simplify venue search and booking. Users can describe their venue needs in plain English, and the system uses Claude AI to extract relevant details and find matching venues through integrated booking APIs.

## 🚀 Quick Start

### Using Docker (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd venue-booking-poc

# Copy environment configuration
cp .env.example .env
# Edit .env with your API keys (Claude, venue providers)

# Start all services
docker-compose -f docker-compose.dev.yml up -d

# Access the application
# Frontend: http://localhost:3000
# Backend: http://localhost:3001
# API Docs: http://localhost:3001/api-docs
```

### Native Development Setup

```bash
# Prerequisites: Node.js 18+, MongoDB, Redis (optional)

# Install dependencies
cd frontend && npm install && cd ..
cd backend && npm install && cd ..

# Start MongoDB
mongod --dbpath /usr/local/var/mongodb

# Start backend (Terminal 1)
cd backend && npm run dev

# Start frontend (Terminal 2)  
cd frontend && npm run dev
```

## 🎯 Features

- **Natural Language Search**: "I need a venue for 300 people in Barcelona next month"
- **AI-Powered Entity Extraction**: Automatically extracts location, date, capacity, event type
- **Multi-Provider Integration**: Searches across multiple venue booking platforms
- **Real-Time Availability**: Checks venue availability and pricing
- **Streamlined Booking**: Simple booking flow with contact information
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API    │    │  External APIs  │
│   (Next.js)     │◄──►│   (Node.js)      │◄──►│  Claude AI      │
│   Port: 3000    │    │   Port: 3001     │    │  Venue Providers│
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │      MongoDB          │
                    │   (Session & Logs)    │
                    └───────────────────────┘
```

**Tech Stack:**
- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: MongoDB (session data, audit logs)
- **AI**: Claude API (Anthropic) for natural language processing
- **External APIs**: Multiple venue booking providers
- **Testing**: Jest, React Testing Library, Playwright
- **Deployment**: Docker, Docker Compose

## 📚 Documentation

### For Developers
- **[Development Setup](docs/deployment/local-development.md)** - Complete local development guide
- **[Architecture Overview](docs/architecture/system-overview.md)** - System design and components  
- **[API Documentation](docs/api/endpoint-documentation.md)** - Complete API reference
- **[TDD Guidelines](docs/testing/tdd-guidelines.md)** - Test-driven development standards

### For DevOps
- **[Docker Setup](docs/deployment/docker-setup.md)** - Containerization guide
- **[Cloud Deployment](docs/deployment/cloud-deployment.md)** - Production deployment guides
- **[Monitoring & Health](docs/phases/phase-4-integration.md)** - System monitoring setup

### For Project Managers
- **[Project Phases](docs/phases/)** - Complete development roadmap
- **[Phase 1: Foundation](docs/phases/phase-1-foundation.md)** - Project setup and infrastructure
- **[Phase 2: Backend](docs/phases/phase-2-backend.md)** - API development with TDD
- **[Phase 3: Frontend](docs/phases/phase-3-frontend.md)** - UI/UX development
- **[Phase 4: Integration](docs/phases/phase-4-integration.md)** - End-to-end testing
- **[Phase 5: Deployment](docs/phases/phase-5-deployment.md)** - Production deployment

### 📖 [Complete Documentation Index](docs/README.md)

## 🧪 Testing

This project follows **strict Test-Driven Development (TDD)** methodology:

```bash
# Run all tests
npm run test:all

# Frontend tests
cd frontend && npm run test:coverage

# Backend tests  
cd backend && npm run test:coverage

# End-to-end tests
npm run test:e2e

# Integration tests
cd backend && npm run test:integration
```

**Coverage Requirements:**
- Overall: 85%+
- Business Logic: 95%+
- UI Components: 90%+
- Utilities: 100%

## 🚢 Deployment

### Development
```bash
docker-compose -f docker-compose.dev.yml up
```

### Production
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Cloud Platforms
- **[Heroku](docs/deployment/cloud-deployment.md#heroku-deployment)** - Simple deployment
- **[Render](docs/deployment/cloud-deployment.md#render-deployment)** - Modern alternative  
- **[Digital Ocean](docs/deployment/cloud-deployment.md#digital-ocean-app-platform)** - App Platform
- **[AWS/GCP](docs/deployment/cloud-deployment.md#aws-deployment-ec2--rds)** - Full cloud deployment

## 🔧 Configuration

### Required Environment Variables

```bash
# API Keys (Required)
CLAUDE_API_KEY=your_claude_api_key_here
VENUE_API_KEY=your_venue_api_key_here

# Database
MONGODB_URI=mongodb://localhost:27017/venue_booking_dev

# Security  
JWT_SECRET=your_jwt_secret_256_bit_key_here

# Optional: Redis for caching
REDIS_URL=redis://localhost:6379
```

### Optional Configuration
```bash
# Logging
LOG_LEVEL=debug
NODE_ENV=development

# Performance
CACHE_TTL=3600
RATE_LIMIT_MAX=100
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow
1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Follow TDD**: Write tests first, then implementation
4. **Ensure** all tests pass and coverage requirements are met
5. **Commit** changes (`git commit -m 'Add amazing feature'`)
6. **Push** to branch (`git push origin feature/amazing-feature`)
7. **Open** a Pull Request

### Quick Development Commands
```bash
# Setup development environment
npm run dev:setup

# Run tests with coverage
npm run test:coverage

# Lint and format code
npm run lint:fix

# Type checking
npm run type-check
```

## 🔐 Security

Security is a top priority. Please see our [Security Policy](SECURITY.md) for:
- Vulnerability reporting process
- Security best practices
- Supported versions

**Key Security Features:**
- Input validation and sanitization
- Rate limiting on all endpoints
- Secure API key management
- No PII stored beyond session duration
- HTTPS enforcement in production

## 📈 Performance

**Target Performance Metrics:**
- Entity extraction: < 2 seconds
- Venue search: < 5 seconds  
- Database queries: < 500ms
- Frontend loading: < 1.5s First Contentful Paint
- Test coverage: 85%+ overall

## 🔍 Monitoring

**Health Check Endpoints:**
- `GET /health` - Basic health status
- `GET /health/detailed` - Comprehensive system health
- `GET /api-docs` - Interactive API documentation

**Monitoring Features:**
- Application performance monitoring (APM)
- Error tracking and alerting
- Database performance metrics
- External API dependency monitoring

## 🐛 Troubleshooting

Common issues and solutions:

**Port Conflicts:**
```bash
# Kill process using port 3000
kill -9 $(lsof -ti:3000)
```

**Database Connection Issues:**
```bash
# Check MongoDB status
brew services list | grep mongodb

# Restart MongoDB
brew services restart mongodb/brew/mongodb-community
```

**More solutions in [Troubleshooting Guide](docs/troubleshooting.md)**

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

- **Documentation**: [docs/README.md](docs/README.md)  
- **Issues**: [GitHub Issues](https://github.com/your-username/venue-booking-poc/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/venue-booking-poc/discussions)

## 🎯 Project Status

**Current Phase**: Documentation and Planning Complete ✅  
**Next Steps**: Begin Phase 1 - Foundation & Setup

**Development Roadmap:**
- [x] **Phase 0**: Documentation and Planning (Week 0)
- [ ] **Phase 1**: Foundation & Setup (Week 1)
- [ ] **Phase 2**: Backend API Development (Weeks 2-3)  
- [ ] **Phase 3**: Frontend Development (Weeks 4-5)
- [ ] **Phase 4**: Integration & Testing (Week 6)
- [ ] **Phase 5**: Deployment & Go-Live (Week 7)

---

**Built with ❤️ using Claude Code and Test-Driven Development**

*This project demonstrates modern full-stack development practices with AI integration, comprehensive testing, and production-ready deployment strategies.*