# Phase 3: Frontend Development

**Duration**: Week 4-5  
**Goal**: React/Next.js frontend with responsive design  
**Status**: Pending  
**Prerequisites**: Phase 2 completed

## Overview

Phase 3 focuses on building the user-facing React/Next.js application using TDD methodology. This includes creating intuitive UI components, implementing state management, integrating with the backend API, and ensuring responsive design with accessibility compliance.

## Deliverables

### 3.1 Core UI Components (TDD)

**Objective**: Build reusable, tested UI components for the venue search and booking workflow

#### Component Architecture

**Component Hierarchy**:
```
App
├── SearchPage
│   ├── SearchInput
│   ├── EntityPreview
│   └── VenueResults
│       └── VenueCard
├── BookingPage
│   ├── BookingForm
│   ├── ContactForm
│   └── ConfirmationModal
└── Shared Components
    ├── LoadingSpinner
    ├── ErrorMessage
    ├── Button
    └── Modal
```

#### TDD Test Scenarios

**Test Suite 1: Search Input Component**
```javascript
describe('SearchInput Component', () => {
  test('should render input field with placeholder text', () => {
    render(<SearchInput onSearch={jest.fn()} />);
    
    const input = screen.getByPlaceholderText(/describe your venue needs/i);
    expect(input).toBeInTheDocument();
  });

  test('should call onSearch when user submits query', async () => {
    const mockOnSearch = jest.fn();
    render(<SearchInput onSearch={mockOnSearch} />);
    
    const input = screen.getByRole('textbox');
    const submitButton = screen.getByRole('button', { name: /search/i });
    
    await user.type(input, 'venue for 100 people in Madrid');
    await user.click(submitButton);
    
    expect(mockOnSearch).toHaveBeenCalledWith('venue for 100 people in Madrid');
  });

  test('should show loading state during search', () => {
    render(<SearchInput onSearch={jest.fn()} isLoading={true} />);
    
    const button = screen.getByRole('button', { name: /searching/i });
    expect(button).toBeDisabled();
    expect(screen.getByTestId('search-spinner')).toBeInTheDocument();
  });

  test('should validate minimum query length', async () => {
    const mockOnSearch = jest.fn();
    render(<SearchInput onSearch={mockOnSearch} minLength={10} />);
    
    const input = screen.getByRole('textbox');
    const submitButton = screen.getByRole('button', { name: /search/i });
    
    await user.type(input, 'too short');
    await user.click(submitButton);
    
    expect(mockOnSearch).not.toHaveBeenCalled();
    expect(screen.getByText(/please provide more details/i)).toBeInTheDocument();
  });
});
```

**Test Suite 2: Entity Preview Component**
```javascript
describe('EntityPreview Component', () => {
  const mockEntities = {
    location: "Madrid",
    capacity: 100,
    date: new Date('2024-03-15'),
    eventType: "conference",
    confidence: 0.95
  };

  test('should display extracted entities', () => {
    render(<EntityPreview entities={mockEntities} onEdit={jest.fn()} />);
    
    expect(screen.getByText('Madrid')).toBeInTheDocument();
    expect(screen.getByText('100 people')).toBeInTheDocument();
    expect(screen.getByText('March 15, 2024')).toBeInTheDocument();
    expect(screen.getByText('Conference')).toBeInTheDocument();
  });

  test('should allow editing entities', async () => {
    const mockOnEdit = jest.fn();
    render(<EntityPreview entities={mockEntities} onEdit={mockOnEdit} />);
    
    const editLocationButton = screen.getByLabelText(/edit location/i);
    await user.click(editLocationButton);
    
    const locationInput = screen.getByDisplayValue('Madrid');
    await user.clear(locationInput);
    await user.type(locationInput, 'Barcelona');
    
    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);
    
    expect(mockOnEdit).toHaveBeenCalledWith({
      ...mockEntities,
      location: 'Barcelona'
    });
  });

  test('should show confidence indicator', () => {
    render(<EntityPreview entities={mockEntities} onEdit={jest.fn()} />);
    
    const confidenceIndicator = screen.getByTestId('confidence-indicator');
    expect(confidenceIndicator).toHaveAttribute('aria-label', '95% confident');
  });

  test('should handle missing entities gracefully', () => {
    const incompleteEntities = { location: "Madrid" };
    render(<EntityPreview entities={incompleteEntities} onEdit={jest.fn()} />);
    
    expect(screen.getByText('Madrid')).toBeInTheDocument();
    expect(screen.getByText(/capacity not specified/i)).toBeInTheDocument();
    expect(screen.getByText(/date not specified/i)).toBeInTheDocument();
  });
});
```

**Test Suite 3: Venue Card Component**
```javascript
describe('VenueCard Component', () => {
  const mockVenue = {
    id: "venue-1",
    name: "Madrid Convention Center",
    location: "Madrid, Spain",
    capacity: 500,
    availableDates: [new Date('2024-03-15')],
    pricePerHour: 200,
    amenities: ["WiFi", "A/V Equipment", "Parking"],
    images: ["image1.jpg", "image2.jpg"]
  };

  test('should display venue information', () => {
    render(<VenueCard venue={mockVenue} onBook={jest.fn()} />);
    
    expect(screen.getByText('Madrid Convention Center')).toBeInTheDocument();
    expect(screen.getByText('Madrid, Spain')).toBeInTheDocument();
    expect(screen.getByText('Up to 500 people')).toBeInTheDocument();
    expect(screen.getByText('€200/hour')).toBeInTheDocument();
  });

  test('should show amenities list', () => {
    render(<VenueCard venue={mockVenue} onBook={jest.fn()} />);
    
    expect(screen.getByText('WiFi')).toBeInTheDocument();
    expect(screen.getByText('A/V Equipment')).toBeInTheDocument();
    expect(screen.getByText('Parking')).toBeInTheDocument();
  });

  test('should call onBook when book button is clicked', async () => {
    const mockOnBook = jest.fn();
    render(<VenueCard venue={mockVenue} onBook={mockOnBook} />);
    
    const bookButton = screen.getByRole('button', { name: /book now/i });
    await user.click(bookButton);
    
    expect(mockOnBook).toHaveBeenCalledWith(mockVenue);
  });

  test('should display availability status', () => {
    const unavailableVenue = { ...mockVenue, availableDates: [] };
    render(<VenueCard venue={unavailableVenue} onBook={jest.fn()} />);
    
    expect(screen.getByText(/not available/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /book now/i })).toBeDisabled();
  });
});
```

#### Component Implementation Structure

**SearchInput Component**:
```typescript
interface SearchInputProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
  minLength?: number;
  placeholder?: string;
}

const SearchInput: React.FC<SearchInputProps> = ({
  onSearch,
  isLoading = false,
  minLength = 10,
  placeholder = "Describe your venue needs in natural language..."
}) => {
  // Implementation driven by tests
};
```

**EntityPreview Component**:
```typescript
interface EntityPreviewProps {
  entities: VenueQuery;
  onEdit: (updatedEntities: VenueQuery) => void;
  isEditable?: boolean;
}

const EntityPreview: React.FC<EntityPreviewProps> = ({
  entities,
  onEdit,
  isEditable = true
}) => {
  // Implementation driven by tests
};
```

**VenueCard Component**:
```typescript
interface VenueCardProps {
  venue: Venue;
  onBook: (venue: Venue) => void;
  selectedDate?: Date;
  isBookingDisabled?: boolean;
}

const VenueCard: React.FC<VenueCardProps> = ({
  venue,
  onBook,
  selectedDate,
  isBookingDisabled = false
}) => {
  // Implementation driven by tests
};
```

### 3.2 State Management and API Integration

**Objective**: Implement robust state management and seamless API integration

#### State Management Architecture

**Custom Hooks for API Integration**:
```typescript
// useVenueSearch hook
const useVenueSearch = () => {
  const [state, setState] = useState({
    isLoading: false,
    venues: [],
    error: null,
    searchId: null
  });

  const searchVenues = useCallback(async (entities: VenueQuery) => {
    // Implementation
  }, []);

  return { ...state, searchVenues };
};

// useEntityExtraction hook
const useEntityExtraction = () => {
  const [state, setState] = useState({
    isLoading: false,
    entities: null,
    error: null,
    sessionId: null
  });

  const extractEntities = useCallback(async (query: string) => {
    // Implementation
  }, []);

  return { ...state, extractEntities };
};
```

#### TDD Test Scenarios for State Management

**Test Suite 4: useVenueSearch Hook**
```javascript
describe('useVenueSearch Hook', () => {
  test('should initialize with default state', () => {
    const { result } = renderHook(() => useVenueSearch());
    
    expect(result.current.isLoading).toBe(false);
    expect(result.current.venues).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  test('should handle successful venue search', async () => {
    const mockVenues = [{ id: '1', name: 'Test Venue' }];
    mockApiClient.searchVenues.mockResolvedValue({ venues: mockVenues });
    
    const { result } = renderHook(() => useVenueSearch());
    
    act(() => {
      result.current.searchVenues({ location: 'Madrid' });
    });
    
    expect(result.current.isLoading).toBe(true);
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.venues).toEqual(mockVenues);
    });
  });

  test('should handle API errors', async () => {
    const mockError = new Error('API Error');
    mockApiClient.searchVenues.mockRejectedValue(mockError);
    
    const { result } = renderHook(() => useVenueSearch());
    
    act(() => {
      result.current.searchVenues({ location: 'Madrid' });
    });
    
    await waitFor(() => {
      expect(result.current.error).toBe('Failed to search venues');
      expect(result.current.isLoading).toBe(false);
    });
  });
});
```

#### API Client Implementation

**Frontend API Client**:
```typescript
class VenueApiClient {
  constructor(private baseUrl: string) {}

  async extractEntities(query: string): Promise<EntityExtractionResponse> {
    const response = await fetch(`${this.baseUrl}/api/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      throw new Error('Failed to extract entities');
    }

    return response.json();
  }

  async searchVenues(criteria: VenueSearchCriteria): Promise<VenueSearchResponse> {
    // Implementation
  }

  async createBooking(booking: BookingRequest): Promise<BookingResponse> {
    // Implementation
  }
}
```

### 3.3 Responsive Design and Accessibility

**Objective**: Ensure the application works on all devices and meets accessibility standards

#### Responsive Design Requirements
- Mobile-first approach (320px+)
- Tablet optimization (768px+)
- Desktop experience (1024px+)
- Touch-friendly interactive elements
- Optimized images and assets

#### Accessibility Requirements
- WCAG 2.1 AA compliance
- Screen reader support
- Keyboard navigation
- Proper ARIA labels
- Color contrast compliance
- Focus management

#### TDD Test Scenarios for Accessibility

**Test Suite 5: Accessibility**
```javascript
describe('Accessibility', () => {
  test('should have proper ARIA labels', () => {
    render(<SearchInput onSearch={jest.fn()} />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-label', 'Venue search query');
    
    const button = screen.getByRole('button', { name: /search venues/i });
    expect(button).toBeInTheDocument();
  });

  test('should support keyboard navigation', async () => {
    const mockOnSearch = jest.fn();
    render(<SearchInput onSearch={mockOnSearch} />);
    
    const input = screen.getByRole('textbox');
    input.focus();
    
    await user.type(input, 'venue for 100 people');
    await user.keyboard('{Enter}');
    
    expect(mockOnSearch).toHaveBeenCalled();
  });

  test('should have proper focus management', async () => {
    render(<VenueResults venues={mockVenues} onBook={jest.fn()} />);
    
    const firstCard = screen.getAllByRole('article')[0];
    const bookButton = within(firstCard).getByRole('button');
    
    await user.tab();
    expect(bookButton).toHaveFocus();
  });

  test('should provide screen reader announcements', async () => {
    render(<SearchPage />);
    
    const searchButton = screen.getByRole('button', { name: /search/i });
    await user.click(searchButton);
    
    await waitFor(() => {
      const announcement = screen.getByRole('status');
      expect(announcement).toHaveTextContent(/searching for venues/i);
    });
  });
});
```

## Page-Level Components and Routing

### Main Application Pages

**1. Search Page (`/`)**
- Search input with natural language support
- Entity preview and editing
- Venue results display
- Pagination and filtering

**2. Booking Page (`/book/:venueId`)**
- Venue details display
- Booking form with date/time selection
- Contact information form
- Booking confirmation

**3. Error Pages**
- 404 Not Found
- 500 Internal Server Error
- Network Error

#### Next.js Routing Structure
```
pages/
├── index.tsx              # Search page
├── book/
│   └── [venueId].tsx     # Booking page
├── _app.tsx              # App wrapper
├── _document.tsx         # HTML document
└── api/                  # API routes (proxy to backend)
    ├── extract.ts
    ├── venues/
    │   ├── search.ts
    │   └── book.ts
```

## Performance Optimization

### Frontend Performance Requirements
- First Contentful Paint < 1.5s
- Largest Contentful Paint < 2.5s
- Cumulative Layout Shift < 0.1
- First Input Delay < 100ms

### Optimization Strategies
- Image optimization with Next.js
- Code splitting and lazy loading
- API response caching
- Debounced search input
- Virtual scrolling for large result sets

## Error Handling and User Experience

### Error Types and UI Patterns
1. **Network Errors**: Retry mechanism with exponential backoff
2. **Validation Errors**: Inline form validation with clear messages
3. **API Errors**: User-friendly error messages with suggestions
4. **Loading States**: Skeleton screens and progress indicators

### Error Boundaries
```typescript
class VenueSearchErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to monitoring service
    console.error('Venue search error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}
```

## Styling and Design System

### CSS-in-JS with Styled Components
- Component-scoped styling
- Theme provider for consistent design
- Responsive breakpoints
- Design tokens for colors, spacing, typography

### Design System Components
- Typography scale
- Color palette
- Spacing system
- Button variants
- Form components
- Card layouts

## Testing Strategy

### Testing Levels
1. **Unit Tests**: Individual components and hooks
2. **Integration Tests**: Component interactions and API integration
3. **E2E Tests**: Complete user workflows (Cypress/Playwright)
4. **Visual Regression Tests**: UI consistency across browsers

### Test Coverage Requirements
- Components: 90% coverage
- Hooks: 95% coverage
- Utils: 100% coverage
- E2E: All critical user paths

## Acceptance Criteria

- [ ] All UI components pass TDD tests with required coverage
- [ ] Responsive design works on mobile, tablet, and desktop
- [ ] Accessibility standards (WCAG 2.1 AA) are met
- [ ] API integration handles all success and error scenarios
- [ ] Performance requirements are achieved
- [ ] Error handling provides clear user feedback
- [ ] State management is robust and predictable
- [ ] E2E tests cover complete user workflows

## Dependencies

- React 18+ with Next.js 13+
- TypeScript for type safety
- Styled Components for styling
- React Testing Library and Jest
- MSW for API mocking in tests
- Cypress or Playwright for E2E testing

## Risk Mitigation

- **Risk**: Complex state management leading to bugs
  - **Mitigation**: Custom hooks with comprehensive testing
  
- **Risk**: Poor performance on mobile devices
  - **Mitigation**: Performance budgets and continuous monitoring
  
- **Risk**: Accessibility issues
  - **Mitigation**: Automated accessibility testing and manual audits

## Phase 3 Completion Checklist

- [ ] All core UI components implemented with TDD
- [ ] State management and API integration complete
- [ ] Responsive design tested across devices
- [ ] Accessibility compliance verified
- [ ] Performance optimization implemented
- [ ] Error handling and loading states functional
- [ ] E2E tests cover all user workflows
- [ ] Code review and quality assurance completed