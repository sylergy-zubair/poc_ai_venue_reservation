# Troubleshooting Guide

This comprehensive troubleshooting guide helps you diagnose and resolve common issues in the AI-Powered Venue Search & Booking POC application.

## 🚀 Quick Diagnosis

### Health Check Commands

Run these commands first to get an overview of system health:

```bash
# Check overall application health
curl http://localhost:3001/health

# Detailed health check (requires API key)
curl -H "X-API-Key: your-api-key" http://localhost:3001/health/detailed

# Check service status
docker-compose ps

# View recent logs
docker-compose logs --tail=50

# Check resource usage
docker stats
```

### System Requirements Verification

```bash
# Verify Node.js version (18+ required)
node --version

# Verify npm version
npm --version

# Verify Docker version
docker --version
docker-compose --version

# Check available disk space (minimum 5GB recommended)
df -h

# Check available memory (minimum 4GB recommended)
free -h
```

## 🔧 Environment Setup Issues

### Port Conflicts

**Problem**: "Port 3000/3001 is already in use"

**Diagnosis:**
```bash
# Find process using port
lsof -ti:3000
lsof -ti:3001

# Check what's running on ports
netstat -tulpn | grep :3000
netstat -tulpn | grep :3001
```

**Solutions:**
```bash
# Option 1: Kill processes using ports
kill -9 $(lsof -ti:3000)
kill -9 $(lsof -ti:3001)

# Option 2: Use different ports
export FRONTEND_PORT=3002
export BACKEND_PORT=3003
npm run dev

# Option 3: Docker port mapping
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml up -d
```

### Docker Issues

**Problem**: Docker containers won't start

**Common Solutions:**
```bash
# Clean Docker environment
docker-compose down -v
docker system prune -f
docker volume prune -f

# Rebuild containers
docker-compose build --no-cache
docker-compose up -d

# Check Docker daemon
sudo systemctl status docker
sudo systemctl restart docker

# Increase Docker resources (Docker Desktop)
# Settings > Resources > Memory: 4GB+, CPU: 2+
```

**Problem**: "No space left on device"

**Solution:**
```bash
# Clean Docker images and containers
docker system df
docker system prune -a

# Remove unused volumes
docker volume prune

# Remove unused networks
docker network prune
```

### Node.js and npm Issues

**Problem**: "Module not found" or dependency issues

**Solutions:**
```bash
# Clean install
rm -rf node_modules package-lock.json
rm -rf frontend/node_modules frontend/package-lock.json
rm -rf backend/node_modules backend/package-lock.json

# Reinstall
npm install
cd frontend && npm install && cd ..
cd backend && npm install && cd ..

# Clear npm cache
npm cache clean --force

# Check for conflicting global packages
npm list -g --depth=0
```

**Problem**: Permission errors on npm install

**Solutions:**
```bash
# Fix npm permissions (Linux/Mac)
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules

# Use npx instead of global installs
npx create-next-app@latest

# Set npm prefix
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
```

## 🗄️ Database Issues

### MongoDB Connection Issues

**Problem**: "Failed to connect to MongoDB"

**Diagnosis:**
```bash
# Check MongoDB status
brew services list | grep mongodb  # Mac
sudo systemctl status mongod       # Linux
net start MongoDB                  # Windows

# Test connection directly
mongo --eval "db.runCommand('ping')"
mongosh --eval "db.runCommand('ping')"  # MongoDB 5+

# Check logs
tail -f /usr/local/var/log/mongodb/mongo.log  # Mac
sudo tail -f /var/log/mongodb/mongod.log      # Linux
```

**Solutions:**
```bash
# Start MongoDB service
brew services start mongodb/brew/mongodb-community  # Mac
sudo systemctl start mongod                         # Linux
net start MongoDB                                   # Windows

# Reset MongoDB
brew services restart mongodb/brew/mongodb-community  # Mac
sudo systemctl restart mongod                         # Linux

# Check MongoDB configuration
cat /usr/local/etc/mongod.conf  # Mac
cat /etc/mongod.conf             # Linux
```

**Problem**: "Authentication failed"

**Solution:**
```bash
# Create admin user (if needed)
mongo admin --eval "db.createUser({user: 'admin', pwd: 'password', roles: ['root']})"

# Update connection string in .env
MONGODB_URI=mongodb://admin:password@localhost:27017/venue_booking_dev?authSource=admin
```

### Database Migration Issues

**Problem**: "Migration failed" or schema errors

**Solutions:**
```bash
# Reset database
mongo venue_booking_dev --eval "db.dropDatabase()"

# Run migrations manually
cd backend
npm run migrate

# Check migration status
npm run migrate:status

# Rollback migrations
npm run migrate:rollback
```

## 🧠 Claude AI Integration Issues

### API Authentication Issues

**Problem**: "Invalid API key" or authentication errors

**Diagnosis:**
```bash
# Test API key directly
curl -H "Authorization: Bearer $CLAUDE_API_KEY" \
     -H "Content-Type: application/json" \
     https://api.anthropic.com/v1/messages

# Check environment variables
echo $CLAUDE_API_KEY
printenv | grep CLAUDE
```

**Solutions:**
```bash
# Verify API key format
# Should start with: sk-ant-api03-...

# Check key permissions in Anthropic console
# Ensure key has Messages API access

# Update .env file
CLAUDE_API_KEY=sk-ant-api03-your-actual-key-here

# Restart application
docker-compose restart backend
```

### Rate Limiting Issues

**Problem**: "Rate limit exceeded" errors

**Diagnosis:**
```bash
# Check rate limit headers in logs
grep "rate.limit" backend/logs/app.log

# Monitor API usage
curl -H "X-API-Key: admin-key" http://localhost:3001/api/admin/usage
```

**Solutions:**
```bash
# Implement exponential backoff
# Update backend/src/services/claude/rateLimiter.ts

# Add caching layer
# Configure Redis for response caching

# Use fallback extraction
# Enable pattern-based extraction in config
```

### Entity Extraction Issues

**Problem**: Poor extraction accuracy or unexpected results

**Diagnosis:**
```bash
# Test extraction directly
curl -X POST http://localhost:3001/api/extract \
     -H "Content-Type: application/json" \
     -d '{"query": "I need a venue for 100 people in Madrid tomorrow"}'

# Check confidence scores
# Look for confidence < 0.7 indicating low quality
```

**Solutions:**
```bash
# Improve prompts in backend/src/services/claude/prompts.ts
# Add more examples and constraints

# Update context data
# Provide better location/date context

# Enhance fallback extraction
# Improve pattern matching in fallbackExtraction()
```

## 🖥️ Frontend Issues

### Next.js Build Issues

**Problem**: "Build failed" or compilation errors

**Diagnosis:**
```bash
# Check for TypeScript errors
cd frontend
npm run type-check

# Check for linting errors
npm run lint

# Verbose build output
npm run build -- --debug
```

**Solutions:**
```bash
# Fix TypeScript errors
# Update type definitions in frontend/src/types/

# Fix import issues
# Use absolute imports: import { Component } from '@/components'

# Clear Next.js cache
rm -rf frontend/.next
rm -rf frontend/out
npm run build
```

**Problem**: "Module not found" in frontend

**Solutions:**
```bash
# Check path mappings in tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"]
    }
  }
}

# Update next.config.js if needed
module.exports = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src')
    };
    return config;
  }
};
```

### React Runtime Issues

**Problem**: "Hydration failed" or React errors

**Solutions:**
```bash
# Check for SSR/client mismatch
# Ensure server and client render same content

# Clear browser cache and localStorage
# Use incognito mode for testing

# Update React strict mode handling
# Wrap components properly in pages/_app.tsx
```

**Problem**: "Too many re-renders" error

**Solutions:**
```bash
# Fix infinite render loops
# Use useCallback and useMemo appropriately

# Check dependency arrays in hooks
useEffect(() => {
  // effect
}, []); // Add proper dependencies

# Avoid state updates in render
// Move to useEffect or event handlers
```

## ⚡ Performance Issues

### Slow API Responses

**Problem**: API endpoints responding slowly (>5 seconds)

**Diagnosis:**
```bash
# Check response times
curl -w "@curl-format.txt" -s -o /dev/null http://localhost:3001/api/venues/search

# Monitor database queries
mongo venue_booking_dev --eval "db.setProfilingLevel(2)"

# Check Claude API latency
grep "claude.*processing.*time" backend/logs/app.log
```

**Solutions:**
```bash
# Add database indexes
mongo venue_booking_dev --eval "db.venues.createIndex({location: 1, capacity: 1})"

# Implement caching
# Configure Redis in docker-compose.dev.yml

# Optimize Claude prompts
# Reduce token usage and response size

# Add request timeout
# Configure timeouts in HTTP clients
```

### High Memory Usage

**Problem**: Application consuming excessive memory

**Diagnosis:**
```bash
# Monitor memory usage
docker stats --format "table {{.Container}}\t{{.MemUsage}}\t{{.MemPerc}}"

# Check for memory leaks
node --inspect backend/src/server.js
# Use Chrome DevTools > Memory tab

# Analyze heap dumps
node --max-old-space-size=4096 backend/src/server.js
```

**Solutions:**
```bash
# Implement proper cleanup
// Clear intervals and timeouts
// Remove event listeners
// Close database connections

# Optimize data structures
// Use streaming for large datasets
// Implement pagination

# Configure Docker memory limits
deploy:
  resources:
    limits:
      memory: 512M
```

## 🔐 Security Issues

### CORS Issues

**Problem**: "CORS policy" errors in browser

**Solutions:**
```bash
# Update CORS configuration in backend/src/app.ts
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

# For development, allow all origins temporarily
app.use(cors({ origin: true }));

# Check environment variables
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3001
```

### SSL/TLS Issues

**Problem**: SSL certificate errors in production

**Solutions:**
```bash
# Check certificate validity
openssl x509 -in certificate.crt -text -noout

# Update certificate
certbot renew --dry-run

# Force HTTPS redirect
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});
```

## 🧪 Testing Issues

### Test Failures

**Problem**: Tests failing unexpectedly

**Diagnosis:**
```bash
# Run tests with verbose output
npm run test -- --verbose

# Run specific test file
npm run test -- VenueCard.test.tsx

# Check test environment
NODE_ENV=test npm run test
```

**Solutions:**
```bash
# Update test setup
// jest.setup.ts
import '@testing-library/jest-dom';

# Mock external dependencies
jest.mock('../services/claudeApi', () => ({
  extractEntities: jest.fn()
}));

# Clear test database between tests
beforeEach(async () => {
  await TestDatabase.clear();
});
```

### Coverage Issues

**Problem**: Low test coverage

**Solutions:**
```bash
# Generate coverage report
npm run test:coverage

# Check uncovered lines
open coverage/lcov-report/index.html

# Add missing tests for uncovered code
# Focus on business logic and utilities
```

## 📊 Monitoring and Logging

### Log Analysis

**Accessing Logs:**
```bash
# Application logs
docker-compose logs backend
docker-compose logs frontend

# Follow logs in real-time
docker-compose logs -f backend

# Filter logs by level
docker-compose logs backend | grep ERROR
docker-compose logs backend | grep WARN
```

**Common Log Patterns:**
```bash
# Authentication failures
grep "authentication.*failed" backend/logs/app.log

# Database connection issues
grep "mongodb.*connection" backend/logs/app.log

# Claude API errors
grep "claude.*error" backend/logs/app.log

# Rate limiting
grep "rate.*limit" backend/logs/app.log
```

### Performance Monitoring

**System Metrics:**
```bash
# Monitor system resources
htop
iostat -x 1
netstat -i

# Application performance
curl -w "@curl-format.txt" -s -o /dev/null http://localhost:3001/health/detailed

# Database performance
mongo venue_booking_dev --eval "db.runCommand({serverStatus: 1})"
```

## 🚨 Emergency Procedures

### System Down

**Immediate Actions:**
```bash
# 1. Check service status
curl -I http://localhost:3001/health

# 2. Restart services
docker-compose restart

# 3. Check logs for errors
docker-compose logs --tail=100

# 4. Verify database connectivity
mongo --eval "db.runCommand('ping')"

# 5. Test external dependencies
curl -I https://api.anthropic.com/v1/messages
```

### Data Recovery

**Database Issues:**
```bash
# Create backup before recovery
mongodump --db venue_booking_prod --out /backup/$(date +%Y%m%d_%H%M%S)

# Restore from backup
mongorestore --db venue_booking_prod /backup/latest

# Check data integrity
mongo venue_booking_prod --eval "db.runCommand({validate: 'venues'})"
```

### Security Incident

**Immediate Response:**
```bash
# 1. Isolate affected systems
docker-compose down

# 2. Check for suspicious activity
grep -i "suspicious\|attack\|breach" backend/logs/security.log

# 3. Review access logs
tail -f /var/log/nginx/access.log | grep -E "POST|PUT|DELETE"

# 4. Contact security team
# Follow procedures in SECURITY.md
```

## 📞 Getting Help

### Internal Resources

1. **Documentation**: Check [docs/README.md](README.md) for detailed guides
2. **Architecture**: Review [architecture/system-overview.md](architecture/system-overview.md)
3. **API Docs**: Consult [api/endpoint-documentation.md](api/endpoint-documentation.md)

### External Support

1. **GitHub Issues**: [Report bugs and issues](https://github.com/your-username/venue-booking-poc/issues)
2. **Discussions**: [Community help](https://github.com/your-username/venue-booking-poc/discussions)
3. **Email**: technical-support@venue-booking-poc.com

### Debug Information Template

When seeking help, include this information:

```
**Environment:**
- OS: [e.g., macOS 12.6, Ubuntu 20.04]
- Node.js version: [e.g., 18.19.0]
- Docker version: [e.g., 24.0.6]
- Browser: [e.g., Chrome 119.0]

**Issue Description:**
[Clear description of the problem]

**Steps to Reproduce:**
1. [First step]
2. [Second step]
3. [...]

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Error Messages:**
```
[Paste error messages here]
```

**Configuration:**
- Environment: [development/staging/production]
- Docker Compose file used: [dev/prod]
- Custom configuration: [any modifications]

**Troubleshooting Attempted:**
- [ ] Checked logs
- [ ] Restarted services
- [ ] Cleared cache
- [ ] Verified environment variables
- [ ] Tested with minimal configuration
```

---

**Remember**: When troubleshooting, always work systematically from the most common causes to the most complex. Document your solutions to help others and prevent recurring issues.

This troubleshooting guide is updated regularly based on community feedback and newly discovered issues.