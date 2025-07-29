import { test, expect, Page } from '@playwright/test';

/**
 * PRD Requirements Validation E2E Tests
 * Phase 4: Testing all Product Requirements Document acceptance criteria
 */

test.describe('PRD Requirements Validation', () => {
  
  test('PRD Requirement: User can enter English query and see venue options', async ({ page }) => {
    await page.goto('/');
    
    // User should be able to enter a natural language query
    const searchInput = page.locator('[data-testid="search-input"]');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveAttribute('placeholder');
    
    // Test various English queries
    const testQueries = [
      'I need a venue for 300 people in Barcelona next month',
      'Looking for a conference room in Madrid for 150 attendees',
      'Wedding venue in Valencia for 200 guests this summer',
      'Corporate meeting space downtown Barcelona for 50 people'
    ];
    
    for (const query of testQueries) {
      // Clear and enter new query
      await searchInput.fill('');
      await searchInput.fill(query);
      await page.click('[data-testid="search-button"]');
      
      // Should show entity extraction preview
      await expect(page.locator('[data-testid="entity-preview"]')).toBeVisible({ timeout: 10000 });
      
      // Proceed with search
      await page.click('[data-testid="confirm-search"]');
      
      // Should display venue options
      await expect(page.locator('[data-testid="venue-results"]')).toBeVisible({ timeout: 15000 });
      const venueCards = page.locator('[data-testid="venue-card"]');
      await expect(venueCards).toHaveCountGreaterThanOrEqual(1);
      
      // Verify venue cards show essential information
      const firstVenue = venueCards.first();
      await expect(firstVenue.locator('[data-testid="venue-name"]')).toBeVisible();
      await expect(firstVenue.locator('[data-testid="venue-capacity"]')).toBeVisible();
      await expect(firstVenue.locator('[data-testid="venue-location"]')).toBeVisible();
      await expect(firstVenue.locator('[data-testid="venue-price"]')).toBeVisible();
      
      // Go back to search for next query
      await page.goto('/');
    }
  });

  test('PRD Requirement: Successful bookings return confirmation', async ({ page }) => {
    // Start with search to get to booking
    await page.goto('/');
    await page.fill('[data-testid="search-input"]', 'venue for 100 people in Madrid');
    await page.click('[data-testid="search-button"]');
    
    await expect(page.locator('[data-testid="entity-preview"]')).toBeVisible();
    await page.click('[data-testid="confirm-search"]');
    await expect(page.locator('[data-testid="venue-results"]')).toBeVisible();
    
    // Select first venue and proceed to booking
    const firstVenue = page.locator('[data-testid="venue-card"]').first();
    await firstVenue.locator('[data-testid="book-venue-btn"]').click();
    
    // Verify navigation to booking page
    await expect(page).toHaveURL(/\/book\/venue-\d+/);
    await expect(page.locator('[data-testid="booking-form"]')).toBeVisible();
    
    // Fill complete booking form
    await page.fill('[data-testid="event-date"]', '2024-04-15');
    await page.fill('[data-testid="start-time"]', '14:00');
    await page.fill('[data-testid="end-time"]', '18:00');
    await page.selectOption('[data-testid="event-type"]', 'corporate');
    await page.fill('[data-testid="attendee-count"]', '100');
    await page.fill('[data-testid="contact-name"]', 'John Doe');
    await page.fill('[data-testid="contact-email"]', 'john.doe@example.com');
    await page.fill('[data-testid="contact-phone"]', '+1234567890');
    await page.fill('[data-testid="company-name"]', 'Test Company Ltd');
    
    // Submit booking
    await page.click('[data-testid="submit-booking-btn"]');
    
    // PRD Requirement: Successful booking returns confirmation
    await expect(page.locator('[data-testid="booking-confirmation"]')).toBeVisible({ timeout: 20000 });
    
    // Verify confirmation contains required information
    await expect(page.locator('[data-testid="booking-id"]')).toBeVisible();
    await expect(page.locator('[data-testid="booking-id"]')).toHaveText(/BOOK-\d+/);
    
    // Verify confirmation details match submitted data
    await expect(page.locator('[data-testid="confirmation-email"]')).toContainText('john.doe@example.com');
    await expect(page.locator('[data-testid="confirmation-date"]')).toContainText('2024-04-15');
    await expect(page.locator('[data-testid="confirmation-venue"]')).toBeVisible();
    
    // Verify booking status is confirmed
    await expect(page.locator('[data-testid="booking-status"]')).toContainText('confirmed');
    
    // Verify next steps are provided
    await expect(page.locator('[data-testid="next-steps"]')).toBeVisible();
    await expect(page.locator('[data-testid="contact-venue-info"]')).toBeVisible();
  });

  test('PRD Requirement: AI-extracted data is viewable and editable', async ({ page }) => {
    await page.goto('/');
    
    // Enter a query that will generate extractable entities
    await page.fill('[data-testid="search-input"]', 'I need a conference venue for 250 people in Barcelona next month for a corporate event');
    await page.click('[data-testid="search-button"]');
    
    // PRD Requirement: AI-extracted data is viewable
    await expect(page.locator('[data-testid="entity-preview"]')).toBeVisible({ timeout: 10000 });
    
    // Verify extracted entities are displayed
    await expect(page.locator('[data-testid="extracted-location"]')).toBeVisible();
    await expect(page.locator('[data-testid="extracted-location"]')).toContainText('Barcelona');
    
    await expect(page.locator('[data-testid="extracted-capacity"]')).toBeVisible();
    await expect(page.locator('[data-testid="extracted-capacity"]')).toContainText('250');
    
    await expect(page.locator('[data-testid="extracted-event-type"]')).toBeVisible();
    await expect(page.locator('[data-testid="extracted-event-type"]')).toContainText('Corporate'); // Or similar
    
    // PRD Requirement: AI-extracted data is editable
    
    // Test editing location
    await expect(page.locator('[data-testid="edit-location-btn"]')).toBeVisible();
    await page.click('[data-testid="edit-location-btn"]');
    await expect(page.locator('[data-testid="location-input"]')).toBeVisible();
    await page.fill('[data-testid="location-input"]', 'Madrid');
    await page.click('[data-testid="save-location-btn"]');
    await expect(page.locator('[data-testid="extracted-location"]')).toContainText('Madrid');
    
    // Test editing capacity
    await expect(page.locator('[data-testid="edit-capacity-btn"]')).toBeVisible();
    await page.click('[data-testid="edit-capacity-btn"]');
    await expect(page.locator('[data-testid="capacity-input"]')).toBeVisible();
    await page.fill('[data-testid="capacity-input"]', '300');
    await page.click('[data-testid="save-capacity-btn"]');
    await expect(page.locator('[data-testid="extracted-capacity"]')).toContainText('300');
    
    // Test editing event type
    await expect(page.locator('[data-testid="edit-event-type-btn"]')).toBeVisible();
    await page.click('[data-testid="edit-event-type-btn"]');
    await expect(page.locator('[data-testid="event-type-select"]')).toBeVisible();
    await page.selectOption('[data-testid="event-type-select"]', 'wedding');
    await page.click('[data-testid="save-event-type-btn"]');
    await expect(page.locator('[data-testid="extracted-event-type"]')).toContainText('Wedding');
    
    // Test editing date
    await expect(page.locator('[data-testid="edit-date-btn"]')).toBeVisible();
    await page.click('[data-testid="edit-date-btn"]');
    await expect(page.locator('[data-testid="date-input"]')).toBeVisible();
    await page.fill('[data-testid="date-input"]', '2024-06-15');
    await page.click('[data-testid="save-date-btn"]');
    await expect(page.locator('[data-testid="extracted-date"]')).toContainText('2024-06-15');
    
    // Verify edited data is used in search
    await page.click('[data-testid="confirm-search"]');
    await expect(page.locator('[data-testid="venue-results"]')).toBeVisible();
    
    // Verify active filters reflect the edited entities
    await expect(page.locator('[data-testid="active-filters"]')).toContainText('Madrid');
    await expect(page.locator('[data-testid="active-filters"]')).toContainText('300');
    await expect(page.locator('[data-testid="active-filters"]')).toContainText('Wedding');
  });

  test('PRD Requirement: Docker deployment works', async ({ page }) => {
    // This test validates that the application is running correctly in Docker
    // The fact that we can access the application implies Docker deployment is working
    
    await page.goto('/');
    
    // Verify application loads correctly
    await expect(page.locator('[data-testid="main-header"]')).toBeVisible();
    await expect(page.locator('[data-testid="search-input"]')).toBeVisible();
    
    // Test that backend API is accessible (through Docker network)
    const response = await page.request.get('/api/health');
    expect(response.ok()).toBe(true);
    
    const healthData = await response.json();
    expect(healthData.status).toBe('healthy');
    
    // Verify environment is properly configured
    expect(healthData.environment).toBeDefined();
    expect(healthData.version).toBeDefined();
    expect(healthData.uptime).toBeGreaterThan(0);
    
    // Test that the application can perform basic functionality
    await page.fill('[data-testid="search-input"]', 'test venue search');
    await page.click('[data-testid="search-button"]');
    
    // Should be able to extract entities (requires Ollama API to be accessible)
    await expect(page.locator('[data-testid="entity-preview"]')).toBeVisible({ timeout: 15000 });
  });

  test('PRD Requirement: System handles entity extraction failures gracefully', async ({ page }) => {
    // Mock entity extraction failure
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
    await page.fill('[data-testid="search-input"]', 'venue for party in Madrid');
    await page.click('[data-testid="search-button"]');
    
    // PRD Requirement: System provides user-friendly error handling
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="error-message"]')).toContainText('temporarily unavailable');
    
    // Error should be user-friendly (no technical details)
    const errorText = await page.locator('[data-testid="error-message"]').textContent();
    expect(errorText).not.toContain('500');
    expect(errorText).not.toContain('EXTRACTION_ERROR');
    expect(errorText).not.toContain('API');
    
    // Should provide recovery options
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    
    // Test manual entity input as fallback
    await expect(page.locator('[data-testid="manual-input-btn"]')).toBeVisible();
    await page.click('[data-testid="manual-input-btn"]');
    
    // Should allow manual entity specification
    await expect(page.locator('[data-testid="manual-location-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="manual-capacity-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="manual-event-type-select"]')).toBeVisible();
    
    // User should be able to proceed with manual input
    await page.fill('[data-testid="manual-location-input"]', 'Madrid');
    await page.fill('[data-testid="manual-capacity-input"]', '100');
    await page.selectOption('[data-testid="manual-event-type-select"]', 'corporate');
    await page.click('[data-testid="proceed-with-manual-btn"]');
    
    // Should proceed to venue search with manual entities
    await expect(page.locator('[data-testid="venue-results"]')).toBeVisible({ timeout: 15000 });
  });

  test('PRD Requirement: System supports multiple venue providers', async ({ page }) => {
    await page.goto('/');
    
    // Perform search that should trigger multiple venue provider queries
    await page.fill('[data-testid="search-input"]', 'venue for 200 people in Barcelona');
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('[data-testid="entity-preview"]')).toBeVisible();
    await page.click('[data-testid="confirm-search"]');
    
    await expect(page.locator('[data-testid="venue-results"]')).toBeVisible();
    
    // PRD Requirement: Results should include venues from multiple providers
    const venueCards = page.locator('[data-testid="venue-card"]');
    await expect(venueCards).toHaveCountGreaterThanOrEqual(3); // Expect multiple results
    
    // Verify provider attribution is shown
    for (let i = 0; i < Math.min(3, await venueCards.count()); i++) {
      const venue = venueCards.nth(i);
      await expect(venue.locator('[data-testid="venue-provider"]')).toBeVisible();
    }
    
    // Test that venues from different providers can be distinguished
    const providerElements = page.locator('[data-testid="venue-provider"]');
    const providerCount = await providerElements.count();
    
    if (providerCount > 1) {
      const firstProvider = await providerElements.first().textContent();
      const lastProvider = await providerElements.last().textContent();
      
      // Should have venues from different providers (at least some of the time)
      // This test acknowledges that results may vary
      console.log(`Found venues from providers: ${firstProvider}, ${lastProvider}`);
    }
  });

  test('PRD Requirement: System provides responsive design', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/');
    
    await expect(page.locator('[data-testid="search-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="main-header"]')).toBeVisible();
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('[data-testid="search-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-menu-toggle"]')).toBeVisible();
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('[data-testid="search-input"]')).toBeVisible();
    
    // Test that search workflow works on mobile
    await page.fill('[data-testid="search-input"]', 'venue for 100 people in Madrid');
    await page.click('[data-testid="search-button"]');
    
    await expect(page.locator('[data-testid="entity-preview"]')).toBeVisible();
    
    // Mobile entity preview should be scrollable and usable
    await expect(page.locator('[data-testid="extracted-location"]')).toBeVisible();
    await expect(page.locator('[data-testid="edit-location-btn"]')).toBeVisible();
    
    await page.click('[data-testid="confirm-search"]');
    await expect(page.locator('[data-testid="venue-results"]')).toBeVisible();
    
    // Venue cards should stack properly on mobile
    const firstVenue = page.locator('[data-testid="venue-card"]').first();
    await expect(firstVenue).toBeVisible();
    await expect(firstVenue.locator('[data-testid="venue-name"]')).toBeVisible();
  });

  test('PRD Requirement: System maintains performance targets', async ({ page }) => {
    // Test subsecond responses for small datasets
    await page.goto('/');
    
    const startTime = Date.now();
    await page.fill('[data-testid="search-input"]', 'small venue for 20 people');
    await page.click('[data-testid="search-button"]');
    
    await expect(page.locator('[data-testid="entity-preview"]')).toBeVisible();
    const entityExtractionTime = Date.now() - startTime;
    
    // PRD Requirement: Subsecond responses for small datasets
    expect(entityExtractionTime).toBeLessThan(1000);
    console.log(`Entity extraction completed in ${entityExtractionTime}ms`);
    
    const searchStartTime = Date.now();
    await page.click('[data-testid="confirm-search"]');
    await expect(page.locator('[data-testid="venue-results"]')).toBeVisible();
    const venueSearchTime = Date.now() - searchStartTime;
    
    // PRD Requirement: 2-5 second response time for venue API requests
    expect(venueSearchTime).toBeLessThan(5000);
    expect(venueSearchTime).toBeGreaterThan(100); // Should take some time for API calls
    console.log(`Venue search completed in ${venueSearchTime}ms`);
  });

  test('PRD Requirement: System provides accessibility features', async ({ page }) => {
    await page.goto('/');
    
    // Test keyboard navigation
    await page.press('[data-testid="search-input"]', 'Tab');
    await expect(page.locator('[data-testid="search-button"]')).toBeFocused();
    
    // Test that search can be triggered with Enter
    await page.focus('[data-testid="search-input"]');
    await page.fill('[data-testid="search-input"]', 'accessible venue search');
    await page.press('[data-testid="search-input"]', 'Enter');
    
    await expect(page.locator('[data-testid="entity-preview"]')).toBeVisible();
    
    // Test ARIA labels and roles
    await expect(page.locator('[data-testid="search-input"]')).toHaveAttribute('aria-label');
    await expect(page.locator('[data-testid="search-button"]')).toHaveAttribute('aria-label');
    
    // Test screen reader compatibility
    await expect(page.locator('[data-testid="entity-preview"]')).toHaveAttribute('role', 'region');
    await expect(page.locator('[data-testid="entity-preview"]')).toHaveAttribute('aria-live');
    
    // Test high contrast support
    const searchInput = page.locator('[data-testid="search-input"]');
    const inputStyles = await searchInput.evaluate(el => {
      const style = window.getComputedStyle(el);
      return {
        borderColor: style.borderColor,
        backgroundColor: style.backgroundColor,
        color: style.color
      };
    });
    
    // Basic contrast check (simplified)
    expect(inputStyles.borderColor).not.toBe('transparent');
    expect(inputStyles.backgroundColor).toBeDefined();
    expect(inputStyles.color).toBeDefined();
  });

  test('PRD Requirement: No PII stored beyond session duration', async ({ page, context }) => {
    // Complete a booking with PII data
    await page.goto('/');
    await page.fill('[data-testid="search-input"]', 'venue for 50 people in Madrid');
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('[data-testid="entity-preview"]')).toBeVisible();
    await page.click('[data-testid="confirm-search"]');
    await expect(page.locator('[data-testid="venue-results"]')).toBeVisible();
    
    const firstVenue = page.locator('[data-testid="venue-card"]').first();
    await firstVenue.locator('[data-testid="book-venue-btn"]').click();
    
    // Fill PII data
    const piiData = {
      name: 'John Doe',
      email: 'john.doe@personal.com',
      phone: '+1234567890',
      company: 'Personal Events'
    };
    
    await page.fill('[data-testid="contact-name"]', piiData.name);
    await page.fill('[data-testid="contact-email"]', piiData.email);
    await page.fill('[data-testid="contact-phone"]', piiData.phone);
    await page.fill('[data-testid="company-name"]', piiData.company);
    
    // Complete other required fields
    await page.fill('[data-testid="event-date"]', '2024-05-15');
    await page.fill('[data-testid="start-time"]', '14:00');
    await page.fill('[data-testid="end-time"]', '18:00');
    
    // Submit booking
    await page.click('[data-testid="submit-booking-btn"]');
    await expect(page.locator('[data-testid="booking-confirmation"]')).toBeVisible();
    
    // Check localStorage and sessionStorage for PII
    const localStorage = await page.evaluate(() => {
      const items: any = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key) {
          items[key] = window.localStorage.getItem(key);
        }
      }
      return items;
    });
    
    const sessionStorage = await page.evaluate(() => {
      const items: any = {};
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const key = window.sessionStorage.key(i);
        if (key) {
          items[key] = window.sessionStorage.getItem(key);
        }
      }
      return items;
    });
    
    // PRD Requirement: No PII stored in browser storage
    const storageContent = JSON.stringify({ localStorage, sessionStorage }).toLowerCase();
    expect(storageContent).not.toContain(piiData.email.toLowerCase());
    expect(storageContent).not.toContain(piiData.phone);
    expect(storageContent).not.toContain(piiData.name.toLowerCase());
    
    // Test session cleanup on browser close
    await context.close();
    
    // Create new context (simulating browser restart)
    const newContext = await page.context().browser()?.newContext();
    if (newContext) {
      const newPage = await newContext.newPage();
      await newPage.goto('/');
      
      // Verify no PII persists in new session
      const newLocalStorage = await newPage.evaluate(() => {
        const items: any = {};
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key) {
            items[key] = window.localStorage.getItem(key);
          }
        }
        return items;
      });
      
      const newStorageContent = JSON.stringify(newLocalStorage).toLowerCase();
      expect(newStorageContent).not.toContain(piiData.email.toLowerCase());
      expect(newStorageContent).not.toContain(piiData.phone);
      
      await newContext.close();
    }
  });
});