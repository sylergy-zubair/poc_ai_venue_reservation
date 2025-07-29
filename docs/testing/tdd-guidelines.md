# Test-Driven Development Guidelines

## TDD Philosophy and Principles

### Core TDD Principles

This project follows **strict Test-Driven Development methodology** where no production code is written without first writing a failing test. The TDD cycle is fundamental to our development process.

**The Red-Green-Refactor Cycle:**
1. **Red**: Write a failing test that describes the desired functionality
2. **Green**: Write the minimal amount of code to make the test pass
3. **Refactor**: Clean up code while keeping all tests passing

### TDD Rules (Uncle Bob's Three Laws)

1. **First Law**: You are not allowed to write any production code unless it is to make a failing unit test pass
2. **Second Law**: You are not allowed to write any more of a unit test than is sufficient to fail; compilation failures are failures
3. **Third Law**: You are not allowed to write any more production code than is sufficient to pass the one failing unit test

### Benefits in Our Context

- **AI Integration Reliability**: Ensures Claude API integration handles all edge cases
- **External API Robustness**: Validates venue API integrations work correctly
- **User Experience Quality**: Guarantees UI components behave as expected
- **Regression Prevention**: Prevents breaking changes during rapid development
- **Documentation**: Tests serve as living documentation of system behavior

## Testing Strategy Overview

### Testing Pyramid

```
    /\
   /  \     E2E Tests (5%)
  /____\    - Full user workflows
 /      \   - Cross-browser compatibility
/________\  - Critical business paths

/          \  Integration Tests (20%)
/__________\  - API endpoint testing
              - Database interactions
              - External service mocking

/              \  Unit Tests (75%)
/________________\  - Individual functions
                    - Component behavior
                    - Business logic
                    - Edge cases
```

### Test Categories

**1. Unit Tests (75% of test suite)**
- Individual functions and methods
- React component rendering and interaction
- Business logic validation
- Error handling scenarios
- Edge cases and boundary conditions

**2. Integration Tests (20% of test suite)**  
- API endpoint functionality
- Database operations
- External service integrations (mocked)
- Service-to-service communication
- Data flow validation

**3. End-to-End Tests (5% of test suite)**
- Complete user workflows
- Critical business processes
- Cross-browser compatibility
- Performance validation
- Accessibility compliance

## Frontend TDD Guidelines

### React Component Testing

**Testing Structure for Components:**
```typescript
// SearchInput.test.tsx
describe('SearchInput Component', () => {
  describe('Rendering', () => {
    test('should render input field with placeholder');
    test('should render search button');
    test('should show loading state when isLoading is true');
  });

  describe('User Interactions', () => {
    test('should call onSearch when form is submitted');
    test('should validate minimum query length');
    test('should handle Enter key press');
  });

  describe('Error States', () => {
    test('should display validation error for short queries');
    test('should display network error messages');
  });

  describe('Accessibility', () => {
    test('should have proper ARIA labels');
    test('should support keyboard navigation');
  });
});
```

**TDD Component Development Process:**

1. **Write the First Test** (Red):
```typescript
test('should render input field with placeholder', () => {
  render(<SearchInput onSearch={jest.fn()} />);
  
  const input = screen.getByPlaceholderText(/describe your venue needs/i);
  expect(input).toBeInTheDocument();
});
```

2. **Create Minimal Component** (Green):
```typescript
interface SearchInputProps {
  onSearch: (query: string) => void;
}

const SearchInput: React.FC<SearchInputProps> = ({ onSearch }) => {
  return (
    <input 
      placeholder="Describe your venue needs in natural language..."
      type="text"
    />
  );
};
```

3. **Add Functionality Test** (Red):
```typescript
test('should call onSearch when form is submitted', async () => {
  const mockOnSearch = jest.fn();
  render(<SearchInput onSearch={mockOnSearch} />);
  
  const input = screen.getByRole('textbox');
  const submitButton = screen.getByRole('button', { name: /search/i });
  
  await user.type(input, 'venue for 100 people in Madrid');
  await user.click(submitButton);
  
  expect(mockOnSearch).toHaveBeenCalledWith('venue for 100 people in Madrid');
});
```

4. **Implement Functionality** (Green):
```typescript
const SearchInput: React.FC<SearchInputProps> = ({ onSearch }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input 
        placeholder="Describe your venue needs in natural language..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        type="text"
      />
      <button type="submit">Search</button>
    </form>
  );
};
```

### Custom Hooks Testing

**TDD Process for Custom Hooks:**

1. **Test Hook Behavior** (Red):
```typescript
describe('useEntityExtraction Hook', () => {
  test('should initialize with default state', () => {
    const { result } = renderHook(() => useEntityExtraction());
    
    expect(result.current.isLoading).toBe(false);
    expect(result.current.entities).toBeNull();
    expect(result.current.error).toBeNull();
  });

  test('should handle successful entity extraction', async () => {
    const mockEntities = { location: 'Madrid', capacity: 100 };
    mockApiClient.extractEntities.mockResolvedValue({ entities: mockEntities });
    
    const { result } = renderHook(() => useEntityExtraction());
    
    act(() => {
      result.current.extractEntities('venue for 100 people in Madrid');
    });
    
    expect(result.current.isLoading).toBe(true);
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.entities).toEqual(mockEntities);
    });
  });
});
```

2. **Implement Hook** (Green):
```typescript
const useEntityExtraction = () => {
  const [state, setState] = useState({
    isLoading: false,
    entities: null,
    error: null
  });

  const extractEntities = useCallback(async (query: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await apiClient.extractEntities(query);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        entities: response.entities 
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error.message 
      }));
    }
  }, []);

  return { ...state, extractEntities };
};
```

## Backend TDD Guidelines

### API Endpoint Testing

**TDD Process for API Endpoints:**

1. **Test API Contract** (Red):
```typescript
describe('POST /api/extract', () => {
  test('should extract entities from natural language query', async () => {
    const requestBody = {
      query: 'I need a venue for 300 people in Barcelona next month'
    };

    const response = await request(app)
      .post('/api/extract')
      .send(requestBody)
      .expect(200);

    expect(response.body).toMatchObject({
      sessionId: expect.any(String),
      entities: {
        location: 'Barcelona',
        capacity: 300,
        date: expect.any(String)
      },
      confidence: {
        overall: expect.any(Number),
        location: expect.any(Number),
        capacity: expect.any(Number)
      }
    });
  });
});
```

2. **Implement Route Handler** (Green):
```typescript
router.post('/extract', async (req, res) => {
  try {
    const { query } = req.body;
    
    const result = await entityExtractionService.extractEntities(query);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

3. **Test Error Handling** (Red):
```typescript
test('should return 400 for invalid query', async () => {
  const response = await request(app)
    .post('/api/extract')
    .send({ query: '' })
    .expect(400);

  expect(response.body.error.code).toBe('INVALID_QUERY');
});
```

4. **Implement Validation** (Green):
```typescript
router.post('/extract', validateQuery, async (req, res) => {
  // Implementation...
});

const validateQuery = (req, res, next) => {
  const { query } = req.body;
  
  if (!query || query.length < 10) {
    return res.status(400).json({
      error: {
        code: 'INVALID_QUERY',
        message: 'Query must be at least 10 characters long'
      }
    });
  }
  
  next();
};
```

### Service Layer Testing

**TDD Process for Business Logic:**

1. **Test Service Behavior** (Red):
```typescript
describe('EntityExtractionService', () => {
  let service: EntityExtractionService;
  let mockClaudeClient: jest.Mocked<ClaudeApiClient>;

  beforeEach(() => {
    mockClaudeClient = createMockClaudeClient();
    service = new EntityExtractionService(mockClaudeClient);
  });

  test('should extract location from query', async () => {
    mockClaudeClient.extractEntities.mockResolvedValue({
      entities: { location: 'Barcelona' },
      confidence: { location: 0.95 }
    });

    const result = await service.extractEntities('venue in Barcelona');

    expect(result.entities.location).toBe('Barcelona');
    expect(result.confidence.location).toBe(0.95);
  });

  test('should handle Claude API errors gracefully', async () => {
    mockClaudeClient.extractEntities.mockRejectedValue(
      new Error('API unavailable')
    );

    const result = await service.extractEntities('venue in Barcelona');

    expect(result.entities.location).toBe('Barcelona'); // Fallback extraction
    expect(result.confidence.overall).toBeLessThan(0.5);
    expect(result.metadata.fallback).toBe(true);
  });
});
```

2. **Implement Service** (Green):
```typescript
class EntityExtractionService {
  constructor(private claudeClient: ClaudeApiClient) {}

  async extractEntities(query: string): Promise<EntityExtractionResult> {
    try {
      const claudeResponse = await this.claudeClient.extractEntities(
        this.buildPrompt(query)
      );
      
      return this.processClaudeResponse(claudeResponse);
    } catch (error) {
      return this.fallbackExtraction(query);
    }
  }

  private async fallbackExtraction(query: string): Promise<EntityExtractionResult> {
    const basicEntities = this.basicPatternExtraction(query);
    
    return {
      entities: basicEntities,
      confidence: { overall: 0.3, ...basicConfidence },
      metadata: { fallback: true, processingTime: 50 }
    };
  }
}
```

## Database Testing Patterns

### Repository Pattern Testing

**TDD Process for Data Layer:**

1. **Test Repository Operations** (Red):
```typescript
describe('SessionRepository', () => {
  let repository: SessionRepository;
  let testDb: MongoMemoryServer;

  beforeAll(async () => {
    testDb = await MongoMemoryServer.create();
    await connectToTestDatabase(testDb.getUri());
    repository = new SessionRepository();
  });

  afterAll(async () => {
    await disconnectFromDatabase();
    await testDb.stop();
  });

  test('should create and retrieve session', async () => {
    const sessionData = {
      sessionId: 'test-session-123',
      query: 'venue for 100 people',
      entities: { location: 'Madrid', capacity: 100 }
    };

    await repository.createSession(sessionData);
    const retrieved = await repository.getSession('test-session-123');

    expect(retrieved).toMatchObject(sessionData);
  });

  test('should handle session expiration', async () => {
    const sessionData = {
      sessionId: 'expired-session',
      query: 'test query'
    };

    await repository.createSession(sessionData);
    
    // Mock time passage
    jest.advanceTimersByTime(25 * 60 * 60 * 1000); // 25 hours
    
    const retrieved = await repository.getSession('expired-session');
    expect(retrieved).toBeNull();
  });
});
```

2. **Implement Repository** (Green):
```typescript
class SessionRepository {
  async createSession(sessionData: SessionData): Promise<void> {
    const session = new SessionModel(sessionData);
    await session.save();
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    const session = await SessionModel.findOne({ sessionId });
    return session ? session.toObject() : null;
  }
}
```

## Testing External Integrations

### Mocking External Services

**TDD Process for External API Integration:**

1. **Test with Mocked Responses** (Red):
```typescript
describe('VenueSearchService', () => {
  let service: VenueSearchService;
  let mockVenueApi: jest.Mocked<VenueApiClient>;

  beforeEach(() => {
    mockVenueApi = createMockVenueApi();
    service = new VenueSearchService(mockVenueApi);
  });

  test('should search venues by location and capacity', async () => {
    const mockVenues = [
      { id: '1', name: 'Test Venue', capacity: 300, location: 'Barcelona' }
    ];
    
    mockVenueApi.searchVenues.mockResolvedValue({ venues: mockVenues });

    const criteria = { location: 'Barcelona', capacity: 250 };
    const result = await service.searchVenues(criteria);

    expect(result.venues).toHaveLength(1);
    expect(result.venues[0].name).toBe('Test Venue');
    expect(mockVenueApi.searchVenues).toHaveBeenCalledWith(
      expect.objectContaining(criteria)
    );
  });

  test('should handle API errors with fallback', async () => {
    mockVenueApi.searchVenues.mockRejectedValue(
      new Error('Venue API unavailable')
    );

    const criteria = { location: 'Barcelona' };
    const result = await service.searchVenues(criteria);

    expect(result.venues).toEqual([]);
    expect(result.error).toBe('Venue API temporarily unavailable');
    expect(result.fallbackUsed).toBe(true);
  });
});
```

2. **Implement Service with Error Handling** (Green):
```typescript
class VenueSearchService {
  constructor(private venueApi: VenueApiClient) {}

  async searchVenues(criteria: SearchCriteria): Promise<SearchResult> {
    try {
      const response = await this.venueApi.searchVenues(criteria);
      return {
        venues: response.venues,
        totalCount: response.totalCount
      };
    } catch (error) {
      return {
        venues: [],
        totalCount: 0,
        error: 'Venue API temporarily unavailable',
        fallbackUsed: true
      };
    }
  }
}
```

## Test Organization and Structure

### File Organization

```
src/
├── components/
│   ├── SearchInput/
│   │   ├── SearchInput.tsx
│   │   ├── SearchInput.test.tsx
│   │   └── index.ts
│   └── VenueCard/
│       ├── VenueCard.tsx
│       ├── VenueCard.test.tsx
│       └── index.ts
├── services/
│   ├── entityExtraction/
│   │   ├── EntityExtractionService.ts
│   │   ├── EntityExtractionService.test.ts
│   │   └── index.ts
│   └── venueSearch/
│       ├── VenueSearchService.ts
│       ├── VenueSearchService.test.ts
│       └── index.ts
└── __tests__/
    ├── integration/
    │   ├── api/
    │   └── database/
    ├── e2e/
    │   ├── search-workflow.test.ts
    │   └── booking-workflow.test.ts
    └── helpers/
        ├── testDb.ts
        ├── mockClaudeApi.ts
        └── testUtils.tsx
```

### Test Naming Conventions

**Test Suite Names:**
- Use descriptive names that indicate what is being tested
- Group related tests with `describe` blocks
- Use nested `describe` blocks for different aspects

**Test Names:**
- Use "should" statements that describe expected behavior
- Be specific about the scenario being tested
- Include context when necessary

**Examples:**
```typescript
describe('SearchInput Component', () => {
  describe('when user types a query', () => {
    test('should enable search button for valid queries');
    test('should show validation error for queries under 10 characters');
  });

  describe('when API call is in progress', () => {
    test('should show loading spinner');
    test('should disable search button');
  });
});
```

## Test Data Management

### Test Fixtures

**Create Reusable Test Data:**
```typescript
// testFixtures.ts
export const mockEntities = {
  valid: {
    location: 'Barcelona',
    capacity: 300,
    date: new Date('2024-03-15'),
    eventType: 'conference'
  },
  incomplete: {
    location: 'Madrid',
    capacity: null,
    date: null,
    eventType: null
  }
};

export const mockVenues = {
  barcelona: [
    {
      id: 'venue-bcn-001',
      name: 'Barcelona Convention Center',
      location: 'Barcelona, Spain',
      capacity: { min: 50, max: 500, recommended: 350 }
    }
  ]
};
```

### Factory Functions

**Create Dynamic Test Data:**
```typescript
// testFactories.ts
export const createMockSession = (overrides = {}) => ({
  sessionId: `sess_${Date.now()}`,
  createdAt: new Date(),
  queries: [],
  ...overrides
});

export const createMockVenue = (overrides = {}) => ({
  id: `venue_${Math.random().toString(36).substr(2, 9)}`,
  name: 'Test Venue',
  location: 'Test City',
  capacity: { min: 10, max: 100, recommended: 50 },
  pricing: { hourly: 100, currency: 'EUR' },
  ...overrides
});
```

## Coverage Requirements and Quality Gates

### Coverage Thresholds

```javascript
// jest.config.js
module.exports = {
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/services/': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './src/components/': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    }
  }
};
```

### Quality Gates

**Pre-commit Hooks:**
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged && npm run test:coverage"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write",
      "jest --findRelatedTests --passWithNoTests"
    ]
  }
}
```

**CI/CD Pipeline Gates:**
- All tests must pass
- Coverage thresholds must be met
- No linting errors
- Type checking must pass
- E2E tests must pass in staging

## TDD Best Practices

### Do's

1. **Write Tests First**: Always write the test before the implementation
2. **Keep Tests Simple**: Each test should verify one specific behavior
3. **Use Descriptive Names**: Test names should clearly describe what is being tested
4. **Test Edge Cases**: Include boundary conditions and error scenarios
5. **Mock External Dependencies**: Isolate the code under test
6. **Refactor Regularly**: Clean up code while keeping tests green
7. **Test Behavior, Not Implementation**: Focus on what the code does, not how

### Don'ts

1. **Don't Skip the Red Phase**: Always see the test fail first
2. **Don't Write Too Much Code**: Only write enough to make the test pass
3. **Don't Test Implementation Details**: Focus on public interfaces
4. **Don't Share State Between Tests**: Each test should be independent
5. **Don't Ignore Failing Tests**: Fix them immediately or remove them
6. **Don't Mock Everything**: Only mock external dependencies
7. **Don't Write Tests After Code**: This defeats the purpose of TDD

### Common Anti-Patterns to Avoid

1. **Testing Implementation Details**:
   ```typescript
   // Bad: Testing internal state
   expect(component.state.isLoading).toBe(true);
   
   // Good: Testing user-visible behavior
   expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
   ```

2. **Overly Complex Tests**:
   ```typescript
   // Bad: Testing multiple behaviors
   test('should handle user input and search and display results', () => {
     // 50 lines of test code...
   });
   
   // Good: Separate focused tests
   test('should handle user input');
   test('should perform search when button clicked');
   test('should display search results');
   ```

3. **Brittle Tests**:
   ```typescript
   // Bad: Tightly coupled to implementation
   expect(mockApi.search).toHaveBeenCalledWith('exact string match');
   
   // Good: Focus on behavior
   expect(mockApi.search).toHaveBeenCalledWith(
     expect.objectContaining({ query: expect.any(String) })
   );
   ```

By following these TDD guidelines, we ensure that the AI-powered venue booking application is thoroughly tested, reliable, and maintainable while supporting rapid development and refactoring.