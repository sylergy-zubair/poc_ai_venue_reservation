# Common Testing Patterns and Examples

## Overview

This document provides common testing patterns, reusable examples, and best practices for testing the AI-powered venue booking application. These patterns ensure consistency across the codebase and help developers implement effective tests quickly.

## Frontend Testing Patterns

### React Component Testing Patterns

#### 1. Form Component Testing Pattern

**Pattern: Test user interactions, validation, and submission**

```typescript
// SearchForm.test.tsx
describe('SearchForm Component', () => {
  const defaultProps = {
    onSubmit: jest.fn(),
    isLoading: false,
    initialValues: {}
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Form Rendering', () => {
    test('should render all form fields', () => {
      render(<SearchForm {...defaultProps} />);
      
      expect(screen.getByLabelText(/venue query/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/capacity/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
    });

    test('should populate form with initial values', () => {
      const initialValues = {
        query: 'venue for conference',
        location: 'Barcelona',
        capacity: 300
      };

      render(<SearchForm {...defaultProps} initialValues={initialValues} />);
      
      expect(screen.getByDisplayValue('venue for conference')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Barcelona')).toBeInTheDocument();
      expect(screen.getByDisplayValue('300')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    test('should show validation error for empty query', async () => {
      const user = userEvent.setup();
      render(<SearchForm {...defaultProps} />);
      
      const submitButton = screen.getByRole('button', { name: /search/i });
      await user.click(submitButton);
      
      expect(screen.getByText(/please enter a venue query/i)).toBeInTheDocument();
      expect(defaultProps.onSubmit).not.toHaveBeenCalled();
    });

    test('should show validation error for invalid capacity', async () => {
      const user = userEvent.setup();
      render(<SearchForm {...defaultProps} />);
      
      await user.type(screen.getByLabelText(/query/i), 'venue search');
      await user.type(screen.getByLabelText(/capacity/i), 'invalid');
      await user.click(screen.getByRole('button', { name: /search/i }));
      
      expect(screen.getByText(/capacity must be a number/i)).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    test('should submit form with valid data', async () => {
      const user = userEvent.setup();
      render(<SearchForm {...defaultProps} />);
      
      await user.type(screen.getByLabelText(/query/i), 'venue for conference');
      await user.type(screen.getByLabelText(/location/i), 'Barcelona');
      await user.type(screen.getByLabelText(/capacity/i), '300');
      await user.click(screen.getByRole('button', { name: /search/i }));
      
      expect(defaultProps.onSubmit).toHaveBeenCalledWith({
        query: 'venue for conference',
        location: 'Barcelona',
        capacity: 300
      });
    });

    test('should disable submit button during loading', () => {
      render(<SearchForm {...defaultProps} isLoading={true} />);
      
      const submitButton = screen.getByRole('button', { name: /searching/i });
      expect(submitButton).toBeDisabled();
    });
  });
});
```

#### 2. List Component Testing Pattern

**Pattern: Test data display, filtering, and interactions**

```typescript
// VenueList.test.tsx
describe('VenueList Component', () => {
  const mockVenues = [
    createMockVenue({ id: '1', name: 'Venue A', capacity: { max: 100 } }),
    createMockVenue({ id: '2', name: 'Venue B', capacity: { max: 200 } }),
    createMockVenue({ id: '3', name: 'Venue C', capacity: { max: 300 } })
  ];

  const defaultProps = {
    venues: mockVenues,
    onVenueSelect: jest.fn(),
    onLoadMore: jest.fn(),
    loading: false,
    hasMore: false
  };

  describe('List Rendering', () => {
    test('should render all venues', () => {
      render(<VenueList {...defaultProps} />);
      
      expect(screen.getByText('Venue A')).toBeInTheDocument();
      expect(screen.getByText('Venue B')).toBeInTheDocument();
      expect(screen.getByText('Venue C')).toBeInTheDocument();
    });

    test('should show empty state when no venues', () => {
      render(<VenueList {...defaultProps} venues={[]} />);
      
      expect(screen.getByText(/no venues found/i)).toBeInTheDocument();
      expect(screen.getByText(/try adjusting your search criteria/i)).toBeInTheDocument();
    });

    test('should show loading state', () => {
      render(<VenueList {...defaultProps} loading={true} />);
      
      expect(screen.getByTestId('venue-list-loading')).toBeInTheDocument();
    });
  });

  describe('Venue Interactions', () => {
    test('should call onVenueSelect when venue is clicked', async () => {
      const user = userEvent.setup();
      render(<VenueList {...defaultProps} />);
      
      await user.click(screen.getByText('Venue A'));
      
      expect(defaultProps.onVenueSelect).toHaveBeenCalledWith(mockVenues[0]);
    });

    test('should load more venues when button clicked', async () => {
      const user = userEvent.setup();
      render(<VenueList {...defaultProps} hasMore={true} />);
      
      await user.click(screen.getByRole('button', { name: /load more/i }));
      
      expect(defaultProps.onLoadMore).toHaveBeenCalled();
    });
  });

  describe('Filtering and Sorting', () => {
    test('should filter venues by capacity', async () => {
      const user = userEvent.setup();
      render(<VenueList {...defaultProps} showFilters={true} />);
      
      await user.selectOptions(screen.getByLabelText(/capacity/i), '200+');
      
      expect(screen.getByText('Venue B')).toBeInTheDocument();
      expect(screen.getByText('Venue C')).toBeInTheDocument();
      expect(screen.queryByText('Venue A')).not.toBeInTheDocument();
    });

    test('should sort venues by name', async () => {
      const user = userEvent.setup();
      render(<VenueList {...defaultProps} showFilters={true} />);
      
      await user.selectOptions(screen.getByLabelText(/sort by/i), 'name');
      
      const venueElements = screen.getAllByTestId(/venue-card/);
      expect(venueElements[0]).toHaveTextContent('Venue A');
      expect(venueElements[1]).toHaveTextContent('Venue B');
      expect(venueElements[2]).toHaveTextContent('Venue C');
    });
  });
});
```

#### 3. Modal Component Testing Pattern

**Pattern: Test modal visibility, content, and interactions**

```typescript
// BookingModal.test.tsx
describe('BookingModal Component', () => {
  const mockVenue = createMockVenue({
    id: 'venue-1',
    name: 'Test Venue',
    pricing: { hourly: 200, currency: 'EUR' }
  });

  const defaultProps = {
    venue: mockVenue,
    isOpen: true,
    onClose: jest.fn(),
    onSubmit: jest.fn()
  };

  describe('Modal Behavior', () => {
    test('should render when open', () => {
      render(<BookingModal {...defaultProps} />);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Book Test Venue')).toBeInTheDocument();
    });

    test('should not render when closed', () => {
      render(<BookingModal {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('should close when escape key pressed', async () => {
      const user = userEvent.setup();
      render(<BookingModal {...defaultProps} />);
      
      await user.keyboard('{Escape}');
      
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    test('should close when clicking outside', async () => {
      const user = userEvent.setup();
      render(<BookingModal {...defaultProps} />);
      
      await user.click(screen.getByTestId('modal-backdrop'));
      
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('Form Interactions', () => {
    test('should submit booking with form data', async () => {
      const user = userEvent.setup();
      render(<BookingModal {...defaultProps} />);
      
      await user.type(screen.getByLabelText(/event date/i), '2024-03-15');
      await user.type(screen.getByLabelText(/start time/i), '14:00');
      await user.type(screen.getByLabelText(/duration/i), '4');
      await user.type(screen.getByLabelText(/contact name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email/i), 'john@example.com');
      
      await user.click(screen.getByRole('button', { name: /book venue/i }));
      
      expect(defaultProps.onSubmit).toHaveBeenCalledWith({
        venueId: 'venue-1',
        eventDate: '2024-03-15',
        startTime: '14:00',
        duration: 4,
        contactName: 'John Doe',
        email: 'john@example.com'
      });
    });
  });
});
```

### Custom Hook Testing Patterns

#### 1. API Hook Testing Pattern

**Pattern: Test loading states, success, and error scenarios**

```typescript
// useVenueSearch.test.ts
describe('useVenueSearch Hook', () => {
  const mockApiClient = {
    searchVenues: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should initialize with default state', () => {
    const { result } = renderHook(() => useVenueSearch(mockApiClient));
    
    expect(result.current.venues).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.hasSearched).toBe(false);
  });

  test('should handle successful search', async () => {
    const mockVenues = [createMockVenue()];
    mockApiClient.searchVenues.mockResolvedValue({
      venues: mockVenues,
      totalCount: 1
    });

    const { result } = renderHook(() => useVenueSearch(mockApiClient));
    
    act(() => {
      result.current.searchVenues({ location: 'Barcelona' });
    });

    expect(result.current.loading).toBe(true);
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.venues).toEqual(mockVenues);
      expect(result.current.hasSearched).toBe(true);
    });
  });

  test('should handle search error', async () => {
    const mockError = new Error('API Error');
    mockApiClient.searchVenues.mockRejectedValue(mockError);

    const { result } = renderHook(() => useVenueSearch(mockApiClient));
    
    act(() => {
      result.current.searchVenues({ location: 'Barcelona' });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('Failed to search venues');
      expect(result.current.venues).toEqual([]);
    });
  });

  test('should clear results when reset called', async () => {
    const mockVenues = [createMockVenue()];
    mockApiClient.searchVenues.mockResolvedValue({
      venues: mockVenues,
      totalCount: 1
    });

    const { result } = renderHook(() => useVenueSearch(mockApiClient));
    
    // Perform search
    act(() => {
      result.current.searchVenues({ location: 'Barcelona' });
    });

    await waitFor(() => {
      expect(result.current.venues).toEqual(mockVenues);
    });

    // Reset
    act(() => {
      result.current.reset();
    });

    expect(result.current.venues).toEqual([]);
    expect(result.current.hasSearched).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
```

#### 2. State Management Hook Testing Pattern

**Pattern: Test complex state transitions and side effects**

```typescript
// useBookingFlow.test.ts
describe('useBookingFlow Hook', () => {
  test('should progress through booking steps', () => {
    const { result } = renderHook(() => useBookingFlow());
    
    expect(result.current.currentStep).toBe('venue-selection');
    expect(result.current.canProceed).toBe(false);

    // Select venue
    act(() => {
      result.current.selectVenue(createMockVenue());
    });

    expect(result.current.currentStep).toBe('venue-selection');
    expect(result.current.canProceed).toBe(true);

    // Move to next step
    act(() => {
      result.current.nextStep();
    });

    expect(result.current.currentStep).toBe('booking-details');
    expect(result.current.canProceed).toBe(false);

    // Fill booking details
    act(() => {
      result.current.updateBookingDetails({
        date: '2024-03-15',
        startTime: '14:00',
        duration: 4
      });
    });

    expect(result.current.canProceed).toBe(true);
  });

  test('should handle booking submission', async () => {
    const mockApiClient = { createBooking: jest.fn() };
    mockApiClient.createBooking.mockResolvedValue({
      bookingId: 'booking-123',
      status: 'confirmed'
    });

    const { result } = renderHook(() => useBookingFlow(mockApiClient));
    
    // Setup booking data
    act(() => {
      result.current.selectVenue(createMockVenue());
      result.current.updateBookingDetails({
        date: '2024-03-15',
        duration: 4
      });
      result.current.updateContactInfo({
        name: 'John Doe',
        email: 'john@example.com'
      });
    });

    // Submit booking
    await act(async () => {
      await result.current.submitBooking();
    });

    expect(result.current.currentStep).toBe('confirmation');
    expect(result.current.bookingResult).toEqual({
      bookingId: 'booking-123',
      status: 'confirmed'
    });
  });
});
```

## Backend Testing Patterns

### API Route Testing Patterns

#### 1. CRUD Operations Testing Pattern

**Pattern: Test all HTTP methods with validation and error handling**

```typescript
// venues.routes.test.ts
describe('Venues API Routes', () => {
  let app: Express;
  let mockVenueService: jest.Mocked<VenueService>;

  beforeAll(async () => {
    app = await createTestApp();
    mockVenueService = createMockVenueService();
  });

  describe('POST /api/venues/search', () => {
    test('should return venues for valid search criteria', async () => {
      const mockVenues = [createMockVenue()];
      mockVenueService.searchVenues.mockResolvedValue({
        venues: mockVenues,
        totalCount: 1
      });

      const response = await request(app)
        .post('/api/venues/search')
        .send({
          entities: {
            location: 'Barcelona',
            capacity: 100
          }
        })
        .expect(200);

      expect(response.body.venues).toHaveLength(1);
      expect(response.body.venues[0]).toMatchObject({
        name: expect.any(String),
        location: expect.objectContaining({
          city: expect.any(String)
        })
      });
    });

    test('should return 400 for missing location', async () => {
      const response = await request(app)
        .post('/api/venues/search')
        .send({
          entities: {
            capacity: 100
          }
        })
        .expect(400);

      expect(response.body.error.code).toBe('MISSING_REQUIRED_FIELD');
      expect(response.body.error.message).toContain('location');
    });

    test('should return 500 for service errors', async () => {
      mockVenueService.searchVenues.mockRejectedValue(
        new Error('Service unavailable')
      );

      const response = await request(app)
        .post('/api/venues/search')
        .send({
          entities: {
            location: 'Barcelona'
          }
        })
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  describe('POST /api/venues/book', () => {
    test('should create booking with valid data', async () => {
      const mockBooking = {
        bookingId: 'booking-123',
        status: 'confirmed'
      };
      mockVenueService.createBooking.mockResolvedValue(mockBooking);

      const response = await request(app)
        .post('/api/venues/book')
        .send({
          venueId: 'venue-1',
          bookingDetails: {
            date: '2024-03-15',
            startTime: '14:00',
            duration: 4
          },
          contactInfo: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            phone: '+1234567890'
          }
        })
        .expect(201);

      expect(response.body).toMatchObject(mockBooking);
    });

    test('should return 409 for booking conflicts', async () => {
      mockVenueService.createBooking.mockRejectedValue(
        new BookingConflictError('Venue not available')
      );

      const response = await request(app)
        .post('/api/venues/book')
        .send(createValidBookingRequest())
        .expect(409);

      expect(response.body.error.code).toBe('BOOKING_CONFLICT');
    });
  });
});
```

#### 2. Authentication Testing Pattern

**Pattern: Test protected routes with various auth scenarios**

```typescript
// auth.routes.test.ts
describe('Authentication Routes', () => {
  describe('Protected Routes', () => {
    test('should allow access with valid token', async () => {
      const token = generateValidJWT();

      const response = await request(app)
        .get('/api/admin/bookings')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.bookings).toBeDefined();
    });

    test('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/admin/bookings')
        .expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    test('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/admin/bookings')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    test('should reject request with expired token', async () => {
      const expiredToken = generateExpiredJWT();

      const response = await request(app)
        .get('/api/admin/bookings')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.error.code).toBe('TOKEN_EXPIRED');
    });
  });
});
```

### Service Layer Testing Patterns

#### 1. External API Integration Testing Pattern

**Pattern: Test service with mocked external dependencies**

```typescript
// EntityExtractionService.test.ts
describe('EntityExtractionService', () => {
  let service: EntityExtractionService;
  let mockClaudeClient: jest.Mocked<ClaudeApiClient>;
  let mockCache: jest.Mocked<CacheInterface>;

  beforeEach(() => {
    mockClaudeClient = createMockClaudeClient();
    mockCache = createMockCache();
    service = new EntityExtractionService(mockClaudeClient, mockCache);
  });

  describe('extractEntities', () => {
    test('should extract entities from natural language', async () => {
      const mockClaudeResponse = {
        entities: {
          location: 'Barcelona',
          capacity: 300,
          eventType: 'conference'
        },
        confidence: {
          overall: 0.95,
          location: 0.98,
          capacity: 0.92
        }
      };

      mockClaudeClient.extractEntities.mockResolvedValue(mockClaudeResponse);

      const result = await service.extractEntities(
        'I need a venue for 300 people in Barcelona for a conference'
      );

      expect(result.entities.location).toBe('Barcelona');
      expect(result.entities.capacity).toBe(300);
      expect(result.entities.eventType).toBe('conference');
      expect(result.confidence.overall).toBe(0.95);
    });

    test('should use cached result when available', async () => {
      const cachedResult = createMockEntityResult();
      mockCache.get.mockResolvedValue(cachedResult);

      const result = await service.extractEntities('cached query');

      expect(result).toEqual(cachedResult);
      expect(mockClaudeClient.extractEntities).not.toHaveBeenCalled();
    });

    test('should fallback on Claude API failure', async () => {
      mockClaudeClient.extractEntities.mockRejectedValue(
        new Error('Claude API unavailable')
      );

      const result = await service.extractEntities(
        'venue for 100 people in Madrid'
      );

      expect(result.entities.location).toBe('Madrid');
      expect(result.entities.capacity).toBe(100);
      expect(result.confidence.overall).toBeLessThan(0.5);
      expect(result.metadata.fallback).toBe(true);
    });

    test('should handle rate limiting', async () => {
      mockClaudeClient.extractEntities.mockRejectedValue(
        new RateLimitError('Rate limit exceeded', 60)
      );

      const result = await service.extractEntities('test query');

      expect(result.error).toContain('rate limit');
      expect(result.retryAfter).toBe(60);
    });
  });

  describe('validation', () => {
    test('should validate query length', async () => {
      await expect(
        service.extractEntities('short')
      ).rejects.toThrow('Query must be at least 10 characters');
    });

    test('should sanitize query input', async () => {
      const maliciousQuery = '<script>alert("xss")</script>venue search';
      
      await service.extractEntities(maliciousQuery);

      expect(mockClaudeClient.extractEntities).toHaveBeenCalledWith(
        expect.not.stringContaining('<script>')
      );
    });
  });
});
```

## Testing Utilities and Helpers

### Mock Factory Functions

```typescript
// testFactories.ts
export const createMockVenue = (overrides: Partial<Venue> = {}): Venue => ({
  id: `venue-${Math.random().toString(36).substr(2, 9)}`,
  name: 'Test Venue',
  description: 'A test venue for events',
  location: {
    address: '123 Test Street',
    city: 'Test City',
    country: 'Test Country',
    coordinates: { lat: 41.3851, lng: 2.1734 }
  },
  capacity: { min: 10, max: 100, recommended: 50 },
  pricing: { hourly: 100, daily: 800, currency: 'EUR' },
  amenities: ['wifi', 'parking'],
  images: {
    thumbnail: 'https://example.com/thumb.jpg',
    gallery: ['https://example.com/gallery1.jpg']
  },
  rating: { average: 4.5, reviewCount: 42 },
  ...overrides
});

export const createMockEntityResult = (overrides = {}): EntityExtractionResult => ({
  sessionId: 'test-session-123',
  entities: {
    location: 'Test City',
    date: new Date('2024-03-15'),
    capacity: 100,
    eventType: 'conference',
    duration: 4,
    budget: null,
    amenities: ['wifi']
  },
  confidence: {
    overall: 0.9,
    location: 0.95,
    date: 0.85,
    capacity: 0.9,
    eventType: 0.8
  },
  suggestions: [],
  metadata: {
    processingTime: 1200,
    claudeTokens: 150,
    timestamp: new Date().toISOString(),
    fallback: false
  },
  ...overrides
});
```

### Test Database Setup

```typescript
// testDatabase.ts
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer: MongoMemoryServer;

export const setupTestDatabase = async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  await mongoose.connect(mongoUri);
};

export const teardownTestDatabase = async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
};

export const clearTestDatabase = async () => {
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};
```

### API Client Mocks

```typescript
// mockApiClients.ts
export const createMockClaudeClient = (): jest.Mocked<ClaudeApiClient> => ({
  extractEntities: jest.fn(),
  testConnection: jest.fn(),
  getRateLimitStatus: jest.fn()
});

export const createMockVenueApiClient = (): jest.Mocked<VenueApiClient> => ({
  searchVenues: jest.fn(),
  getVenueDetails: jest.fn(),
  createBooking: jest.fn(),
  checkAvailability: jest.fn()
});
```

### Custom Render Functions

```typescript
// testUtils.tsx
import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[];
  queryClient?: QueryClient;
}

const createWrapper = ({ initialEntries, queryClient }: CustomRenderOptions) => {
  const testQueryClient = queryClient || new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={testQueryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export const customRender = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { initialEntries, queryClient, ...renderOptions } = options;
  
  return render(ui, {
    wrapper: createWrapper({ initialEntries, queryClient }),
    ...renderOptions
  });
};

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };
```

## Performance Testing Patterns

### Load Testing with Jest

```typescript
// performance.test.ts
describe('Performance Tests', () => {
  test('should handle concurrent entity extractions', async () => {
    const service = new EntityExtractionService(mockClaudeClient);
    const concurrentRequests = 10;
    
    const promises = Array.from({ length: concurrentRequests }, (_, i) =>
      service.extractEntities(`venue query ${i}`)
    );

    const startTime = Date.now();
    const results = await Promise.all(promises);
    const endTime = Date.now();

    expect(results).toHaveLength(concurrentRequests);
    expect(endTime - startTime).toBeLessThan(5000); // 5 seconds max
    
    results.forEach(result => {
      expect(result.entities).toBeDefined();
    });
  });

  test('should maintain response time under load', async () => {
    const iterations = 50;
    const responseTimes: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      await service.extractEntities('performance test query');
      const endTime = Date.now();
      
      responseTimes.push(endTime - startTime);
    }

    const avgResponseTime = responseTimes.reduce((a, b) => a + b) / iterations;
    const p95ResponseTime = responseTimes.sort()[Math.floor(iterations * 0.95)];

    expect(avgResponseTime).toBeLessThan(2000); // Average under 2s
    expect(p95ResponseTime).toBeLessThan(3000); // P95 under 3s
  });
});
```

These testing patterns provide a comprehensive foundation for maintaining high code quality and reliability throughout the development of the AI-powered venue booking application.