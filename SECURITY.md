# Security Policy

## Overview

Security is a top priority for the AI-Powered Venue Search & Booking POC. This document outlines our security policies, vulnerability reporting procedures, and best practices for maintaining a secure application.

## 🛡️ Supported Versions

We provide security updates for the following versions:

| Version | Supported          | Status |
| ------- | ------------------ | ------ |
| 1.0.x   | ✅ Current Release | Active security updates |
| 0.9.x   | ✅ Beta            | Critical fixes only |
| < 0.9   | ❌ Deprecated      | No security updates |

## 🚨 Reporting Security Vulnerabilities

### How to Report

**Please DO NOT report security vulnerabilities through public GitHub issues.**

Instead, please report security vulnerabilities through one of the following channels:

1. **Email**: Send detailed vulnerability reports to `security@venue-booking-poc.com`
2. **Private GitHub Security Advisory**: Use GitHub's [security advisory feature](https://github.com/your-username/venue-booking-poc/security/advisories)
3. **Encrypted Communication**: For sensitive issues, request our PGP key

### What to Include

When reporting security vulnerabilities, please provide:

```
Subject: [SECURITY] Brief description of the vulnerability

1. VULNERABILITY DETAILS:
   - Type of vulnerability (e.g., XSS, CSRF, SQL injection)
   - Affected component/endpoint
   - Severity assessment (Critical/High/Medium/Low)

2. REPRODUCTION STEPS:
   - Detailed steps to reproduce the issue
   - Required conditions or prerequisites
   - Expected vs actual behavior

3. IMPACT ASSESSMENT:
   - Potential damage or exposure
   - Affected user data or functionality
   - Business impact

4. ADDITIONAL INFORMATION:
   - Screenshots or proof-of-concept (if applicable)
   - Suggested mitigation or fix
   - Any relevant logs or error messages

5. REPORTER INFORMATION:
   - Your name and contact information
   - Preferred method of communication
   - Disclosure timeline preferences
```

### Response Timeline

- **Initial Response**: Within 24 hours
- **Detailed Analysis**: Within 72 hours
- **Fix Development**: Within 7 days for critical issues
- **Patch Release**: Within 14 days for high/critical issues
- **Public Disclosure**: 90 days after fix deployment (coordinated)

## 🔐 Security Architecture

### Data Protection

**Personal Information Handling:**
- Minimal data collection (contact info for bookings only)
- No storage of sensitive payment information
- Data encryption in transit and at rest
- Automatic data purging after booking completion

**API Security:**
- Rate limiting on all endpoints
- Input validation and sanitization
- Authentication tokens with expiration
- CORS policies properly configured

**Infrastructure Security:**
- HTTPS enforcement in production
- Security headers implementation
- Regular dependency updates
- Container security scanning

### Authentication & Authorization

```typescript
// Example: Secure API endpoint implementation
app.use('/api', [
  helmet(), // Security headers
  cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') }),
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  }),
  validateApiKey,
  sanitizeInput
]);

// Input validation middleware
const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Remove HTML tags and dangerous characters
  const sanitize = (obj: any): any => {
    if (typeof obj === 'string') {
      return obj.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/[<>\"']/g, '');
    }
    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        obj[key] = sanitize(obj[key]);
      }
    }
    return obj;
  };

  req.body = sanitize(req.body);
  req.query = sanitize(req.query);
  next();
};
```

## 🏛️ Security Best Practices

### For Developers

**Code Security:**
```typescript
// ✅ Good: Parameterized queries
const venues = await db.query(
  'SELECT * FROM venues WHERE city = $1 AND capacity >= $2',
  [city, minCapacity]
);

// ❌ Bad: String concatenation (SQL injection risk)
const venues = await db.query(
  `SELECT * FROM venues WHERE city = '${city}'`
);

// ✅ Good: Input validation
const validateBookingRequest = (request: BookingRequest): void => {
  const schema = joi.object({
    venueId: joi.string().uuid().required(),
    date: joi.date().min('now').required(),
    attendeeCount: joi.number().integer().min(1).max(10000).required(),
    contactEmail: joi.string().email().required()
  });

  const { error } = schema.validate(request);
  if (error) {
    throw new ValidationError(error.details[0].message);
  }
};

// ✅ Good: Secure error handling
try {
  const result = await processBooking(request);
  res.json({ success: true, data: result });
} catch (error) {
  logger.error('Booking processing failed', { 
    error: error.message,
    requestId: req.id,
    // Don't log sensitive data
    sanitizedRequest: sanitizeForLogging(request)
  });
  
  // Don't expose internal errors to clients
  res.status(500).json({
    success: false,
    error: {
      code: 'PROCESSING_ERROR',
      message: 'Unable to process booking request'
    }
  });
}
```

**Environment Security:**
```bash
# .env.example - Never commit actual secrets
# API Keys (Required)
CLAUDE_API_KEY=your_claude_api_key_here
VENUE_API_KEY=your_venue_api_key_here

# Database
MONGODB_URI=mongodb://localhost:27017/venue_booking_dev

# Security
JWT_SECRET=generate_strong_256_bit_key_here
SESSION_SECRET=generate_another_strong_key_here

# Optional: External services
REDIS_URL=redis://localhost:6379
```

### For DevOps/Infrastructure

**Container Security:**
```dockerfile
# Use specific version tags, not 'latest'
FROM node:18.19.0-alpine

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Set proper file permissions
COPY --chown=nextjs:nodejs . .
USER nextjs

# Expose only necessary ports
EXPOSE 3000

# Use security scanning
RUN npm audit --audit-level moderate
```

**Docker Compose Security:**
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    # Don't run as root
    user: "1001:1001"
    # Read-only root filesystem
    read_only: true
    tmpfs:
      - /tmp
    # Resource limits
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
```

**Network Security:**
```bash
# Production deployment checklist
✅ HTTPS enabled with valid SSL certificates
✅ Firewall configured (only ports 80, 443 open)
✅ Database not exposed to public internet
✅ API rate limiting implemented
✅ CORS properly configured
✅ Security headers enabled
✅ Regular security updates automated
```

## 🛠️ Security Tools and Monitoring

### Required Security Tools

**Development:**
```bash
# Install security audit tools
npm install --save-dev audit-ci eslint-plugin-security

# Run security checks
npm audit --audit-level high
npx audit-ci --high

# Dependency scanning
npm run security:scan
```

**Production Monitoring:**
```typescript
// Security event logging
const securityLogger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: 'security.log',
      level: 'warn'
    })
  ]
});

// Log suspicious activities
const logSecurityEvent = (event: SecurityEvent) => {
  securityLogger.warn('Security event detected', {
    type: event.type,
    severity: event.severity,
    source: event.source,
    timestamp: new Date().toISOString(),
    metadata: event.metadata
  });
};

// Rate limiting violations
app.use((req, res, next) => {
  if (req.rateLimit?.remaining === 0) {
    logSecurityEvent({
      type: 'RATE_LIMIT_EXCEEDED',
      severity: 'MEDIUM',
      source: req.ip,
      metadata: {
        endpoint: req.path,
        userAgent: req.get('User-Agent')
      }
    });
  }
  next();
});
```

### Security Monitoring Checklist

**Real-time Monitoring:**
- [ ] Failed authentication attempts
- [ ] Rate limiting violations
- [ ] Unusual traffic patterns
- [ ] SQL injection attempts
- [ ] XSS attack attempts
- [ ] CSRF token violations
- [ ] Suspicious user behavior

**Regular Security Audits:**
- [ ] Weekly dependency vulnerability scans
- [ ] Monthly security code reviews
- [ ] Quarterly penetration testing
- [ ] Annual third-party security assessment

## 🚧 Common Security Vulnerabilities and Mitigations

### 1. Injection Attacks

**SQL Injection Prevention:**
```typescript
// ✅ Use parameterized queries
const venue = await db.query(
  'SELECT * FROM venues WHERE id = $1',
  [venueId]
);

// ✅ Use ORM/ODM with built-in protection
const venue = await Venue.findById(venueId);

// ✅ Validate input types
const venueId = joi.string().uuid().validate(req.params.id);
```

**NoSQL Injection Prevention:**
```typescript
// ✅ Sanitize MongoDB queries
const sanitizeMongoQuery = (query: any) => {
  if (typeof query !== 'object' || query === null) return query;
  
  const sanitized: any = {};
  for (const [key, value] of Object.entries(query)) {
    if (key.startsWith('$')) continue; // Remove MongoDB operators
    sanitized[key] = typeof value === 'string' ? value : String(value);
  }
  return sanitized;
};
```

### 2. Cross-Site Scripting (XSS)

**Content Security Policy:**
```typescript
// Implement CSP headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
      fontSrc: ["'self'", 'fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'api.venue-booking.com']
    }
  }
}));

// Sanitize user input
import DOMPurify from 'isomorphic-dompurify';

const sanitizeHtml = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong'],
    ALLOWED_ATTR: []
  });
};
```

### 3. Cross-Site Request Forgery (CSRF)

**CSRF Protection:**
```typescript
import csrf from 'csurf';

// Enable CSRF protection
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});

app.use('/api', csrfProtection);

// Frontend CSRF token handling
const fetchWithCSRF = async (url: string, options: RequestInit = {}) => {
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
  
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'X-CSRF-Token': csrfToken,
      'Content-Type': 'application/json'
    }
  });
};
```

### 4. Insecure Direct Object Reference

**Access Control:**
```typescript
// ✅ Validate user permissions
const getBookingDetails = async (bookingId: string, userEmail: string) => {
  const booking = await Booking.findById(bookingId);
  
  if (!booking) {
    throw new NotFoundError('Booking not found');
  }
  
  // Verify user owns this booking
  if (booking.contactEmail !== userEmail) {
    throw new ForbiddenError('Access denied');
  }
  
  return booking;
};

// ✅ Use UUIDs instead of sequential IDs
const booking = new Booking({
  id: uuidv4(), // Non-predictable ID
  venueId,
  contactEmail,
  // ... other fields
});
```

## 🔒 Data Privacy and Compliance

### GDPR Compliance

**Data Minimization:**
- Collect only necessary booking information
- Automatic data deletion after booking completion
- User consent for data processing
- Right to data portability and deletion

**Implementation:**
```typescript
// Data retention policy
const cleanupExpiredBookings = async () => {
  const expiryDate = new Date();
  expiryDate.setDays(expiryDate.getDate() - 30); // 30 days retention
  
  await Booking.deleteMany({
    status: 'completed',
    completedAt: { $lt: expiryDate }
  });
};

// Data export for GDPR requests
const exportUserData = async (email: string) => {
  const bookings = await Booking.find({ contactEmail: email })
    .select('venueId date attendeeCount status createdAt');
  
  return {
    bookings,
    exportedAt: new Date().toISOString(),
    dataRetentionPolicy: '30 days after booking completion'
  };
};
```

### PII (Personally Identifiable Information) Handling

**Data Classification:**
- **Public**: Venue information, availability
- **Internal**: Booking IDs, session data
- **Restricted**: Contact information, preferences
- **Confidential**: Payment information (not stored)

**Secure Logging:**
```typescript
// ✅ Safe logging (no PII)
logger.info('Booking created', {
  bookingId: booking.id,
  venueId: booking.venueId,
  attendeeCount: booking.attendeeCount,
  // contactEmail: booking.contactEmail, // ❌ Don't log PII
});

// PII sanitization for logs
const sanitizeForLogging = (data: any): any => {
  const sensitiveFields = ['email', 'phone', 'name', 'address'];
  const sanitized = { ...data };
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  return sanitized;
};
```

## 📋 Security Incident Response

### Incident Classification

**Critical (P0):**
- Data breach or exposure
- System compromise
- Service completely unavailable

**High (P1):**
- Authentication bypass
- Privilege escalation
- Significant functionality impact

**Medium (P2):**
- XSS or injection vulnerabilities
- Information disclosure
- Partial service degradation

**Low (P3):**
- Security misconfigurations
- Minor information leaks
- Non-exploitable vulnerabilities

### Response Procedures

**Immediate Response (0-2 hours):**
1. Assess incident severity
2. Contain the threat (isolate affected systems)
3. Notify security team and stakeholders
4. Document initial findings

**Investigation (2-24 hours):**
1. Forensic analysis of affected systems
2. Determine scope and impact
3. Identify root cause
4. Develop remediation plan

**Recovery (24-72 hours):**
1. Implement fixes and patches
2. Test remediation thoroughly
3. Restore services gradually
4. Monitor for recurring issues

**Post-Incident (1-2 weeks):**
1. Conduct post-mortem review
2. Update security policies
3. Implement additional safeguards
4. Train team on lessons learned

### Communication Plan

**Internal Stakeholders:**
- Security team (immediate)
- Development team (within 2 hours)
- Management (within 4 hours)
- Legal team (within 8 hours)

**External Communication:**
- Users (if data is affected)
- Regulatory bodies (if required)
- Security community (coordinated disclosure)

## 📚 Security Resources and Training

### Required Reading

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [React Security Best Practices](https://snyk.io/blog/10-react-security-best-practices/)

### Security Training

**For Developers:**
- Secure coding practices
- Common vulnerability patterns
- Security testing methodologies
- Incident response procedures

**For DevOps:**
- Infrastructure security
- Container security
- Monitoring and alerting
- Backup and recovery

### Security Testing

```bash
# Security testing commands
npm run test:security
npm run test:penetration
npm run scan:dependencies
npm run audit:security
```

## 📞 Contact Information

**Security Team:**
- **Email**: security@venue-booking-poc.com
- **Response Time**: 24 hours for critical issues
- **PGP Key**: Available upon request

**Emergency Contact:**
- **Phone**: +1-XXX-XXX-XXXX (24/7 for critical incidents)
- **Escalation**: security-escalation@venue-booking-poc.com

---

**Remember: Security is everyone's responsibility. When in doubt, err on the side of caution and report potential issues.**

This security policy is reviewed quarterly and updated as needed. Last updated: February 2024.