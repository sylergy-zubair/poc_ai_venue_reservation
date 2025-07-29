import { test, expect, Page } from '@playwright/test';

/**
 * End-to-End Search Workflow Integration Tests
 * Phase 4: Testing complete user workflows from search to results
 */

test.describe('Search Workflow Integration', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('/');
  });

  test('should complete full search workflow with natural language query', async () => {
    // Navigate to search page and verify initial state
    await expect(page.locator('[data-testid="search-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="search-button"]')).toBeVisible();
    
    // Enter natural language query
    const searchInput = page.locator('[data-testid="search-input"]');
    await searchInput.fill('I need a venue for 300 people in Barcelona next month');
    
    // Submit search
    await page.click('[data-testid="search-button"]');
    
    // Verify entity extraction preview appears
    await expect(page.locator('[data-testid="entity-preview"]')).toBeVisible({ timeout: 10000 });
    
    // Verify extracted entities are displayed correctly
    await expect(page.locator('[data-testid="extracted-location"]')).toContainText('Barcelona');
    await expect(page.locator('[data-testid="extracted-capacity"]')).toContainText('300');
    
    // Verify edit buttons are present
    await expect(page.locator('[data-testid="edit-location-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="edit-capacity-btn"]')).toBeVisible();
    
    // Confirm search with extracted entities
    await page.click('[data-testid="confirm-search"]');
    
    // Wait for venue results to load
    await expect(page.locator('[data-testid="venue-results"]')).toBeVisible({ timeout: 15000 });
    
    // Verify venue cards are displayed
    const venueCards = page.locator('[data-testid="venue-card"]');
    await expect(venueCards).toHaveCountGreaterThan(0);
    
    // Verify venue details on first card
    const firstVenue = venueCards.first();
    await expect(firstVenue.locator('[data-testid="venue-name"]')).toBeVisible();
    await expect(firstVenue.locator('[data-testid="venue-capacity"]')).toBeVisible();
    await expect(firstVenue.locator('[data-testid="venue-price"]')).toBeVisible();
    await expect(firstVenue.locator('[data-testid="venue-location"]')).toContainText('Barcelona');
    
    // Verify booking button is present
    await expect(firstVenue.locator('[data-testid="book-venue-btn"]')).toBeVisible();
  });

  test('should handle entity editing workflow', async () => {
    // Enter search query with incomplete information
    await page.fill('[data-testid="search-input"]', 'venue for party in Madrid');
    await page.click('[data-testid="search-button"]');
    
    // Wait for entity preview
    await expect(page.locator('[data-testid="entity-preview"]')).toBeVisible();
    
    // Verify initial extracted entities
    await expect(page.locator('[data-testid="extracted-location"]')).toContainText('Madrid');
    
    // Edit capacity (which may not have been extracted)
    await page.click('[data-testid="edit-capacity-btn"]');
    await expect(page.locator('[data-testid="capacity-input"]')).toBeVisible();
    await page.fill('[data-testid="capacity-input"]', '150');
    await page.click('[data-testid="save-capacity-btn"]');
    
    // Verify updated capacity is displayed
    await expect(page.locator('[data-testid="extracted-capacity"]')).toContainText('150');
    
    // Edit event type
    await page.click('[data-testid="edit-event-type-btn"]');
    await page.selectOption('[data-testid="event-type-select"]', 'corporate');
    await page.click('[data-testid="save-event-type-btn"]');
    
    // Verify updated event type
    await expect(page.locator('[data-testid="extracted-event-type"]')).toContainText('Corporate');
    
    // Edit date
    await page.click('[data-testid="edit-date-btn"]');
    await page.fill('[data-testid="date-input"]', '2024-04-15');
    await page.click('[data-testid="save-date-btn"]');
    
    // Verify updated date
    await expect(page.locator('[data-testid="extracted-date"]')).toContainText('2024-04-15');
    
    // Proceed with search using edited entities
    await page.click('[data-testid="confirm-search"]');
    
    // Verify results include the edited parameters
    await expect(page.locator('[data-testid="venue-results"]')).toBeVisible();
    
    // Verify search filters show the edited values
    await expect(page.locator('[data-testid="active-filters"]')).toContainText('Madrid');
    await expect(page.locator('[data-testid="active-filters"]')).toContainText('150');
    await expect(page.locator('[data-testid="active-filters"]')).toContainText('Corporate');
  });

  test('should handle search errors gracefully', async () => {
    // Mock API error for entity extraction
    await page.route('**/api/extract', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ 
          error: 'Entity extraction service temporarily unavailable',
          code: 'EXTRACTION_ERROR'
        })
      });
    });

    await page.goto('/');
    await page.fill('[data-testid="search-input"]', 'venue search query');
    await page.click('[data-testid="search-button"]');
    
    // Verify error message is displayed
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="error-message"]')).toContainText('temporarily unavailable');
    
    // Verify retry button is available
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    
    // Verify error is user-friendly (no technical details exposed)
    await expect(page.locator('[data-testid="error-message"]')).not.toContainText('500');
    await expect(page.locator('[data-testid="error-message"]')).not.toContainText('EXTRACTION_ERROR');
    
    // Test retry functionality
    await page.unroute('**/api/extract');
    await page.click('[data-testid="retry-button"]');
    
    // Verify the retry works (should show entity preview now)
    await expect(page.locator('[data-testid="entity-preview"]')).toBeVisible({ timeout: 10000 });
  });

  test('should handle venue search API errors', async () => {
    // Allow entity extraction to work, but fail venue search
    await page.route('**/api/venues/search', route => {
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ 
          error: 'Venue search service unavailable',
          code: 'VENUE_API_ERROR'
        })
      });
    });

    await page.goto('/');
    await page.fill('[data-testid="search-input"]', 'venue for 100 people in Madrid');
    await page.click('[data-testid="search-button"]');
    
    // Complete entity extraction
    await expect(page.locator('[data-testid="entity-preview"]')).toBeVisible();
    await page.click('[data-testid="confirm-search"]');
    
    // Verify venue search error is handled
    await expect(page.locator('[data-testid="venue-search-error"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="venue-search-error"]')).toContainText('unable to search venues');
    
    // Verify retry option for venue search
    await expect(page.locator('[data-testid="retry-venue-search"]')).toBeVisible();
    
    // Verify option to modify search criteria
    await expect(page.locator('[data-testid="modify-search-btn"]')).toBeVisible();
  });

  test('should support different query types and complexity', async () => {
    const testQueries = [
      {
        query: 'wedding venue for 200 guests in Valencia this summer',
        expectedLocation: 'Valencia',
        expectedCapacity: '200',
        expectedEventType: 'Wedding'
      },
      {
        query: 'corporate meeting room downtown Barcelona, 50 people, next Tuesday',
        expectedLocation: 'Barcelona',
        expectedCapacity: '50',
        expectedEventType: 'Corporate'
      },
      {
        query: 'conference hall with A/V equipment, 500 attendees, Madrid',
        expectedLocation: 'Madrid',
        expectedCapacity: '500',
        expectedEventType: 'Conference'
      }
    ];

    for (const testCase of testQueries) {
      // Clear previous search
      await page.goto('/');
      
      // Enter query
      await page.fill('[data-testid="search-input"]', testCase.query);
      await page.click('[data-testid="search-button"]');
      
      // Verify entity extraction
      await expect(page.locator('[data-testid="entity-preview"]')).toBeVisible();
      
      if (testCase.expectedLocation) {
        await expect(page.locator('[data-testid="extracted-location"]')).toContainText(testCase.expectedLocation);
      }
      
      if (testCase.expectedCapacity) {
        await expect(page.locator('[data-testid="extracted-capacity"]')).toContainText(testCase.expectedCapacity);
      }
      
      if (testCase.expectedEventType) {
        await expect(page.locator('[data-testid="extracted-event-type"]')).toContainText(testCase.expectedEventType);
      }
      
      // Proceed with search
      await page.click('[data-testid="confirm-search"]');
      
      // Verify results are displayed
      await expect(page.locator('[data-testid="venue-results"]')).toBeVisible();
      const venueCards = page.locator('[data-testid="venue-card"]');
      await expect(venueCards).toHaveCountGreaterThan(0);
    }
  });

  test('should maintain search state during navigation', async () => {
    // Perform initial search
    await page.fill('[data-testid="search-input"]', 'venue for 150 people in Barcelona');
    await page.click('[data-testid="search-button"]');
    
    await expect(page.locator('[data-testid="entity-preview"]')).toBeVisible();
    await page.click('[data-testid="confirm-search"]');
    
    await expect(page.locator('[data-testid="venue-results"]')).toBeVisible();
    
    // Click on a venue to view details (should navigate to venue page)
    const firstVenue = page.locator('[data-testid="venue-card"]').first();
    await firstVenue.locator('[data-testid="view-details-btn"]').click();
    
    // Verify navigation to venue details page
    await expect(page).toHaveURL(/\/venues\/\d+/);
    
    // Navigate back to search results
    await page.click('[data-testid="back-to-results"]');
    
    // Verify search results are still displayed with same filters
    await expect(page.locator('[data-testid="venue-results"]')).toBeVisible();
    await expect(page.locator('[data-testid="active-filters"]')).toContainText('Barcelona');
    await expect(page.locator('[data-testid="active-filters"]')).toContainText('150');
    
    // Verify search input maintains the original query
    await expect(page.locator('[data-testid="search-input"]')).toHaveValue('venue for 150 people in Barcelona');
  });

  test('should handle empty search results gracefully', async () => {
    // Mock empty results response
    await page.route('**/api/venues/search', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          venues: [],
          total: 0,
          message: 'No venues found matching your criteria'
        })
      });
    });

    await page.goto('/');
    await page.fill('[data-testid="search-input"]', 'venue for 10000 people in remote location');
    await page.click('[data-testid="search-button"]');
    
    await expect(page.locator('[data-testid="entity-preview"]')).toBeVisible();
    await page.click('[data-testid="confirm-search"]');
    
    // Verify empty results message
    await expect(page.locator('[data-testid="no-results-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="no-results-message"]')).toContainText('No venues found');
    
    // Verify suggestions for improving search
    await expect(page.locator('[data-testid="search-suggestions"]')).toBeVisible();
    await expect(page.locator('[data-testid="modify-search-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="broaden-search-btn"]')).toBeVisible();
  });
});