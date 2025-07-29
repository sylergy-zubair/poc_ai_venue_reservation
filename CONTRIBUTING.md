# Contributing to AI-Powered Venue Search & Booking POC

Thank you for your interest in contributing to our AI-powered venue booking application! This guide will help you understand our development workflow, coding standards, and contribution process.

## 🚀 Quick Start for Contributors

### Prerequisites

- **Node.js** 18+ and npm
- **Docker** and Docker Compose
- **Git** with proper configuration
- **MongoDB** (or use Docker)
- **VS Code** (recommended) with suggested extensions

### Initial Setup

```bash
# 1. Fork and clone the repository
git clone https://github.com/your-username/venue-booking-poc.git
cd venue-booking-poc

# 2. Install dependencies
npm run dev:setup

# 3. Copy environment configuration
cp .env.example .env
# Edit .env with your API keys (see Environment Setup section)

# 4. Start development environment
docker-compose -f docker-compose.dev.yml up -d

# 5. Run tests to verify setup
npm run test:all
```

## 📋 Development Workflow

### Branch Strategy

We use **GitFlow** with feature branches:

```bash
# Create a new feature branch
git checkout -b feature/add-venue-filters

# Work on your feature with TDD approach
# Make commits following our commit conventions

# Push and create pull request
git push origin feature/add-venue-filters
```

**Branch Naming Conventions:**
- `feature/description` - New features
- `bugfix/description` - Bug fixes
- `hotfix/description` - Critical production fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Test improvements

### Commit Message Convention

We follow **Conventional Commits** specification:

```bash
# Format
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Examples:**
```bash
feat(api): add venue availability checking endpoint

- Implement real-time availability checking
- Add caching layer for performance
- Include rate limiting protection

Closes #123

fix(frontend): resolve search input validation bug

The search input was not properly validating minimum query length,
causing API errors for short queries.

test(backend): add integration tests for booking flow

- Cover happy path booking scenarios
- Test error handling for invalid requests
- Verify webhook delivery

docs(api): update endpoint documentation with new filters

refactor(claude): optimize entity extraction performance
```

**Commit Types:**
- `feat` - New features
- `fix` - Bug fixes
- `docs` - Documentation changes
- `style` - Code style changes (formatting, etc.)
- `refactor` - Code refactoring
- `test` - Adding or modifying tests
- `chore` - Maintenance tasks
- `perf` - Performance improvements
- `ci` - CI/CD changes

## 🧪 Test-Driven Development (TDD)

**We strictly follow TDD methodology. All contributions must include tests.**

### TDD Cycle

```bash
# 1. RED: Write a failing test
npm run test:watch

# 2. GREEN: Write minimal code to make it pass
# (Focus on making the test pass, not on perfect code)

# 3. REFACTOR: Improve the code while keeping tests green
# (Clean up, optimize, add error handling)
```

### Test Structure

```typescript
// Example: Testing a new venue filter feature
describe('VenueFilters', () => {
  describe('filterByCapacity', () => {
    it('should return venues with capacity >= minimum requirement', () => {
      // Arrange
      const venues = [
        { id: '1', capacity: 50 },
        { id: '2', capacity: 200 },
        { id: '3', capacity: 500 }
      ];
      const filter = { minCapacity: 100 };

      // Act
      const result = filterByCapacity(venues, filter);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('2');
      expect(result[1].id).toBe('3');
    });

    it('should handle edge case when no venues meet criteria', () => {
      // Arrange
      const venues = [{ id: '1', capacity: 50 }];
      const filter = { minCapacity: 100 };

      // Act
      const result = filterByCapacity(venues, filter);

      // Assert
      expect(result).toHaveLength(0);
    });
  });
});
```

### Test Commands

```bash
# Run all tests
npm run test:all

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode (TDD)
npm run test:watch

# Run specific test file
npm run test -- --testPathPattern=venue-filters

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e
```

### Coverage Requirements

- **Overall Coverage**: 85% minimum
- **Business Logic**: 95% minimum
- **UI Components**: 90% minimum
- **Utilities**: 100% required
- **Integration Points**: 95% minimum

## 🏗️ Code Standards

### TypeScript Guidelines

```typescript
// Use strict type definitions
interface VenueSearchRequest {
  readonly location: string;
  readonly capacity: number;
  readonly date: Date;
  readonly eventType?: EventType;
  readonly amenities?: readonly string[];
}

// Use proper error handling
async function searchVenues(request: VenueSearchRequest): Promise<Venue[]> {
  try {
    validateSearchRequest(request);
    const results = await venueService.search(request);
    return results;
  } catch (error) {
    logger.error('Venue search failed', { error, request });
    throw new VenueSearchError('Search failed', error);
  }
}

// Use proper async/await patterns
const processBooking = async (booking: BookingRequest): Promise<BookingResult> => {
  const venue = await venueService.getById(booking.venueId);
  const availability = await checkAvailability(venue, booking.date);
  
  if (!availability.available) {
    throw new BookingConflictError('Venue not available');
  }
  
  return await bookingService.create(booking);
};
```

### React Component Guidelines

```tsx
// Use functional components with TypeScript
interface SearchInputProps {
  readonly onSearch: (query: string) => void;
  readonly placeholder?: string;
  readonly isLoading?: boolean;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  onSearch,
  placeholder = "Describe your venue needs...",
  isLoading = false
}) => {
  const [query, setQuery] = useState<string>('');
  
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length >= 5) {
      onSearch(query);
    }
  }, [query, onSearch]);

  return (
    <form onSubmit={handleSubmit} className="search-form">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        disabled={isLoading}
        className="search-input"
        data-testid="venue-search-input"
      />
      <button 
        type="submit" 
        disabled={isLoading || query.length < 5}
        className="search-button"
        data-testid="search-submit-button"
      >
        {isLoading ? 'Searching...' : 'Search'}
      </button>
    </form>
  );
};
```

### API Endpoint Guidelines

```typescript
// Use proper validation and error handling
export const searchVenuesHandler = async (
  req: Request<{}, VenueSearchResponse, VenueSearchRequest>,
  res: Response<VenueSearchResponse>
) => {
  try {
    // Input validation
    const validatedRequest = await validateSearchRequest(req.body);
    
    // Rate limiting
    await rateLimiter.checkLimit(req.ip, 'venue-search');
    
    // Business logic
    const searchResult = await venueService.search(validatedRequest);
    
    // Response formatting
    res.status(200).json({
      success: true,
      data: {
        venues: searchResult.venues,
        totalCount: searchResult.total,
        pagination: searchResult.pagination
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: req.id,
        processingTime: Date.now() - req.startTime
      }
    });
  } catch (error) {
    await errorHandler.handle(error, req, res);
  }
};
```

### CSS/Styling Guidelines

```css
/* Use BEM methodology for CSS classes */
.venue-card {
  @apply bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow;
}

.venue-card__header {
  @apply flex justify-between items-start mb-4;
}

.venue-card__title {
  @apply text-xl font-semibold text-gray-900;
}

.venue-card__price {
  @apply text-lg font-bold text-blue-600;
}

.venue-card--featured {
  @apply border-2 border-blue-500;
}

/* Use Tailwind CSS utilities where appropriate */
.search-results {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6;
}
```

## 📁 Project Structure

```
venue-booking-poc/
├── frontend/                 # Next.js frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Next.js pages
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API services
│   │   ├── utils/          # Utility functions
│   │   └── types/          # TypeScript definitions
│   ├── __tests__/          # Frontend tests
│   └── public/             # Static assets
├── backend/                 # Node.js/Express backend
│   ├── src/
│   │   ├── controllers/    # Route controllers
│   │   ├── services/       # Business logic
│   │   ├── models/         # Database models
│   │   ├── middleware/     # Express middleware
│   │   ├── routes/         # API routes
│   │   └── utils/          # Utility functions
│   ├── __tests__/          # Backend tests
│   └── migrations/         # Database migrations
├── docs/                    # Documentation
├── docker/                  # Docker configurations
└── scripts/                # Build and deployment scripts
```

## 🔍 Code Review Process

### Before Submitting a Pull Request

1. **Self-Review Checklist:**
   - [ ] All tests pass (`npm run test:all`)
   - [ ] Code coverage meets requirements
   - [ ] TypeScript compilation succeeds
   - [ ] Linting passes (`npm run lint`)
   - [ ] Code is formatted (`npm run format`)
   - [ ] Documentation is updated
   - [ ] Commit messages follow conventions

2. **Performance Check:**
   ```bash
   # Run performance benchmarks
   npm run test:performance
   
   # Check bundle size impact
   npm run build:analyze
   ```

3. **Manual Testing:**
   - Test your changes in development environment
   - Verify API endpoints with tools like Postman
   - Test responsive design on different screen sizes
   - Verify accessibility requirements

### Pull Request Template

```markdown
## Description
Brief description of the changes and their purpose.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots for UI changes.

## Checklist
- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
```

### Review Criteria

**Code Quality:**
- Code follows project conventions
- Proper error handling implemented
- Performance considerations addressed
- Security best practices followed

**Tests:**
- Comprehensive test coverage
- Tests are meaningful and test behavior, not implementation
- Integration tests cover user workflows
- Edge cases are handled

**Documentation:**
- Code is self-documenting
- Complex logic is explained
- API documentation is updated
- User-facing features have usage examples

## 🛠️ Development Tools

### Required VS Code Extensions

```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "ms-vscode.vscode-jest",
    "streetsidesoftware.code-spell-checker",
    "ms-vscode.vscode-docker"
  ]
}
```

### Recommended Settings

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "jest.autoRun": "watch"
}
```

### Development Scripts

```bash
# Setup development environment
npm run dev:setup

# Start development servers
npm run dev

# Run linting
npm run lint
npm run lint:fix

# Run type checking
npm run type-check

# Format code
npm run format

# Run security audit
npm run audit

# Clean build artifacts
npm run clean

# Generate API documentation
npm run docs:api
```

## 🐛 Debugging Guidelines

### Frontend Debugging

```typescript
// Use React Developer Tools
// Add debugging props for development
const VenueCard = ({ venue, debug = false }) => {
  if (debug) {
    console.log('VenueCard props:', { venue });
  }
  
  return (
    <div className="venue-card" data-venue-id={venue.id}>
      {/* Component content */}
    </div>
  );
};

// Use data attributes for testing and debugging
<button 
  data-testid="search-button"
  data-action="venue-search"
  onClick={handleSearch}
>
  Search
</button>
```

### Backend Debugging

```typescript
// Use structured logging
import { logger } from '../utils/logger';

const searchVenues = async (criteria: SearchCriteria) => {
  logger.info('Starting venue search', { 
    criteria,
    requestId: context.requestId 
  });
  
  try {
    const results = await venueService.search(criteria);
    
    logger.info('Venue search completed', {
      resultCount: results.length,
      processingTime: Date.now() - startTime,
      requestId: context.requestId
    });
    
    return results;
  } catch (error) {
    logger.error('Venue search failed', {
      error: error.message,
      stack: error.stack,
      criteria,
      requestId: context.requestId
    });
    throw error;
  }
};
```

## 🚨 Common Issues and Solutions

### Setup Issues

**Port conflicts:**
```bash
# Find and kill processes using ports
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```

**Docker issues:**
```bash
# Reset Docker environment
docker-compose down -v
docker system prune -f
docker-compose -f docker-compose.dev.yml up --build
```

**Node modules issues:**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### Test Issues

**Jest configuration:**
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.tsx',
  ],
};
```

## 🔐 Security Guidelines

### Input Validation

```typescript
// Always validate and sanitize inputs
import joi from 'joi';

const venueSearchSchema = joi.object({
  location: joi.string().min(2).max(100).required(),
  capacity: joi.number().integer().min(1).max(10000),
  date: joi.date().min('now').required(),
  eventType: joi.string().valid('conference', 'meeting', 'wedding', 'party'),
});

const validateSearchRequest = (request: any): VenueSearchRequest => {
  const { error, value } = venueSearchSchema.validate(request);
  if (error) {
    throw new ValidationError(error.details[0].message);
  }
  return value;
};
```

### API Security

```typescript
// Implement rate limiting
import rateLimit from 'express-rate-limit';

const searchRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many search requests, please try again later',
});

// Sanitize responses
const sanitizeVenueData = (venue: any) => {
  const { internalId, adminNotes, ...publicData } = venue;
  return publicData;
};
```

## 📊 Performance Guidelines

### Frontend Performance

```typescript
// Use React.memo for expensive components
const VenueCard = React.memo(({ venue }: VenueCardProps) => {
  return (
    <div className="venue-card">
      {/* Component content */}
    </div>
  );
});

// Use useCallback for event handlers
const SearchForm = () => {
  const handleSearch = useCallback((query: string) => {
    // Search logic
  }, []);
  
  return <SearchInput onSearch={handleSearch} />;
};

// Lazy load components
const VenueDetails = lazy(() => import('./VenueDetails'));
```

### Backend Performance

```typescript
// Use caching strategically
const getCachedVenues = async (searchKey: string) => {
  const cached = await redis.get(`venues:${searchKey}`);
  if (cached) {
    return JSON.parse(cached);
  }
  
  const results = await venueService.search(criteria);
  await redis.setex(`venues:${searchKey}`, 300, JSON.stringify(results));
  return results;
};

// Optimize database queries
const getVenuesWithFilters = async (filters: VenueFilters) => {
  return await Venue.find(filters)
    .select('name location capacity pricing rating images')
    .limit(20)
    .lean(); // Use lean() for read-only operations
};
```

## 🤝 Getting Help

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and general discussion
- **Code Reviews**: Pull request discussions

### Documentation

- **[Architecture Guide](docs/architecture/system-overview.md)**: System design
- **[API Documentation](docs/api/endpoint-documentation.md)**: API reference
- **[Testing Guide](docs/testing/tdd-guidelines.md)**: Testing standards
- **[Deployment Guide](docs/deployment/local-development.md)**: Setup instructions

### Mentorship

New contributors are welcome! Don't hesitate to:
- Ask questions in pull request discussions
- Request code review feedback
- Suggest improvements to this contributing guide

---

**Thank you for contributing to making venue booking smarter and more accessible! 🎉**

By following these guidelines, you help us maintain high code quality, ensure reliable functionality, and create a great experience for users and fellow developers.