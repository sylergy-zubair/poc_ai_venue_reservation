import { test, expect } from '@playwright/test';

/**
 * Performance Integration Testing Suite
 * Phase 4: Testing performance requirements across integrated system
 */

test.describe('Performance Integration Tests', () => {
  
  test('should meet entity extraction performance requirements', async ({ page }) => {
    await page.goto('/');
    
    const startTime = Date.now();
    
    // Perform entity extraction request
    await page.fill('[data-testid="search-input"]', 'venue for 200 people in London next month for corporate event');
    await page.click('[data-testid="search-button"]');
    
    // Wait for entity extraction to complete
    await expect(page.locator('[data-testid="entity-preview"]')).toBeVisible({ timeout: 5000 });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Verify extraction completed within performance requirements (< 2 seconds)
    expect(duration).toBeLessThan(2000);
    console.log(`Entity extraction completed in ${duration}ms`);
    
    // Verify all expected entities were extracted
    await expect(page.locator('[data-testid="extracted-location"]')).toBeVisible();
    await expect(page.locator('[data-testid="extracted-capacity"]')).toBeVisible();
    await expect(page.locator('[data-testid="extracted-event-type"]')).toBeVisible();
  });

  test('should meet venue search performance requirements', async ({ page }) => {
    await page.goto('/');
    
    // Complete entity extraction first
    await page.fill('[data-testid="search-input"]', 'conference venue for 300 people in Madrid');
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('[data-testid="entity-preview"]')).toBeVisible();
    
    const startTime = Date.now();
    
    // Trigger venue search
    await page.click('[data-testid="confirm-search"]');
    
    // Wait for venue results
    await expect(page.locator('[data-testid="venue-results"]')).toBeVisible({ timeout: 8000 });
    const venueCards = page.locator('[data-testid="venue-card"]');
    await expect(venueCards.first()).toBeVisible();
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Verify search completed within performance requirements (< 5 seconds)
    expect(duration).toBeLessThan(5000);
    console.log(`Venue search completed in ${duration}ms`);
    
    // Verify results quality (at least some venues returned)
    await expect(venueCards).toHaveCountGreaterThan(0);
  });

  test('should handle concurrent entity extraction requests efficiently', async ({ browser }) => {
    const concurrentRequests = 5;
    const contexts = [];
    const pages = [];
    
    // Create multiple browser contexts for concurrent testing
    for (let i = 0; i < concurrentRequests; i++) {
      const context = await browser.newContext();
      contexts.push(context);
      const page = await context.newPage();
      pages.push(page);
      await page.goto('/');
    }
    
    const startTime = Date.now();
    
    // Execute concurrent entity extraction requests
    const promises = pages.map(async (page, index) => {
      const query = `venue for ${100 + index * 50} people in Barcelona for event ${index}`;
      await page.fill('[data-testid="search-input"]', query);
      await page.click('[data-testid="search-button"]');
      return expect(page.locator('[data-testid="entity-preview"]')).toBeVisible({ timeout: 10000 });
    });
    
    await Promise.all(promises);
    
    const endTime = Date.now();
    const totalDuration = endTime - startTime;
    const avgResponseTime = totalDuration / concurrentRequests;
    
    // Verify average response time is acceptable (< 3 seconds per request)
    expect(avgResponseTime).toBeLessThan(3000);
    console.log(`Average response time for ${concurrentRequests} concurrent requests: ${avgResponseTime}ms`);
    
    // Verify all requests completed successfully
    for (const page of pages) {
      await expect(page.locator('[data-testid="entity-preview"]')).toBeVisible();
    }
    
    // Cleanup
    for (const context of contexts) {
      await context.close();
    }
  });

  test('should maintain performance under load during complete workflows', async ({ browser }) => {
    const concurrentUsers = 3;
    const contexts = [];
    const pages = [];
    
    // Create multiple browser contexts
    for (let i = 0; i < concurrentUsers; i++) {
      const context = await browser.newContext();
      contexts.push(context);
      const page = await context.newPage();
      pages.push(page);
    }
    
    const startTime = Date.now();
    
    // Execute complete search workflows concurrently
    const workflowPromises = pages.map(async (page, index) => {
      await page.goto('/');
      
      // Search phase
      const searchQuery = `venue for ${200 + index * 100} people in ${index % 2 === 0 ? 'Madrid' : 'Barcelona'}`;
      await page.fill('[data-testid="search-input"]', searchQuery);
      await page.click('[data-testid="search-button"]');
      
      // Entity extraction
      await expect(page.locator('[data-testid="entity-preview"]')).toBeVisible({ timeout: 10000 });
      
      // Venue search
      await page.click('[data-testid="confirm-search"]');
      await expect(page.locator('[data-testid="venue-results"]')).toBeVisible({ timeout: 15000 });
      
      // Venue selection
      const venueCards = page.locator('[data-testid="venue-card"]');
      await expect(venueCards.first()).toBeVisible();
      
      return {
        userId: index,
        completed: true
      };
    });
    
    const results = await Promise.all(workflowPromises);
    
    const endTime = Date.now();
    const totalDuration = endTime - startTime;
    const avgWorkflowTime = totalDuration / concurrentUsers;
    
    // Verify all workflows completed
    expect(results.length).toBe(concurrentUsers);
    results.forEach(result => {
      expect(result.completed).toBe(true);
    });
    
    // Verify average workflow time is reasonable (< 20 seconds)
    expect(avgWorkflowTime).toBeLessThan(20000);
    console.log(`Average complete workflow time under load: ${avgWorkflowTime}ms`);
    
    // Cleanup
    for (const context of contexts) {
      await context.close();
    }
  });

  test('should meet frontend loading performance requirements', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    
    // Wait for First Contentful Paint indicators
    await expect(page.locator('[data-testid="search-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="search-button"]')).toBeVisible();
    
    const endTime = Date.now();
    const loadTime = endTime - startTime;
    
    // Verify page loads within performance requirements (< 1.5s for First Contentful Paint)
    expect(loadTime).toBeLessThan(1500);
    console.log(`Frontend page loaded in ${loadTime}ms`);
    
    // Verify critical resources are loaded
    await expect(page.locator('[data-testid="main-header"]')).toBeVisible();
    await expect(page.locator('[data-testid="search-section"]')).toBeVisible();
    
    // Check that interactive elements are functional immediately
    await page.fill('[data-testid="search-input"]', 'test query');
    await expect(page.locator('[data-testid="search-input"]')).toHaveValue('test query');
  });

  test('should optimize database query performance', async ({ page }) => {
    // This test monitors backend response times through network calls
    let dbQueryDuration = 0;
    
    page.on('response', response => {
      if (response.url().includes('/api/venues/search')) {
        const timing = response.timing();
        dbQueryDuration = timing.responseEnd - timing.responseStart;
      }
    });
    
    await page.goto('/');
    
    // Perform search that triggers database queries
    await page.fill('[data-testid="search-input"]', 'venue for 150 people in Madrid with parking');
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('[data-testid="entity-preview"]')).toBeVisible();
    await page.click('[data-testid="confirm-search"]');
    await expect(page.locator('[data-testid="venue-results"]')).toBeVisible();
    
    // Verify database queries complete within requirements (< 500ms)
    expect(dbQueryDuration).toBeLessThan(500);
    console.log(`Database query completed in ${dbQueryDuration}ms`);
  });

  test('should handle large result sets efficiently', async ({ page }) => {
    // Mock large result set
    await page.route('**/api/venues/search', route => {
      const largeResultSet = {
        venues: Array.from({ length: 100 }, (_, i) => ({
          id: `venue-${i}`,
          name: `Test Venue ${i}`,
          location: 'Madrid',
          capacity: 100 + i * 10,
          price: 500 + i * 50,
          rating: 4.0 + (i % 10) / 10,
          amenities: ['WiFi', 'Parking', 'A/V Equipment'],
          images: [`https://example.com/venue-${i}.jpg`]
        })),
        total: 100,
        page: 1,
        limit: 20
      };
      
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(largeResultSet)
      });
    });
    
    await page.goto('/');
    await page.fill('[data-testid="search-input"]', 'venues in Madrid');
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('[data-testid="entity-preview"]')).toBeVisible();
    
    const startTime = Date.now();
    
    await page.click('[data-testid="confirm-search"]');
    await expect(page.locator('[data-testid="venue-results"]')).toBeVisible();
    
    // Verify initial page loads quickly even with large dataset
    const venueCards = page.locator('[data-testid="venue-card"]');
    await expect(venueCards.first()).toBeVisible();
    
    const endTime = Date.now();
    const renderTime = endTime - startTime;
    
    // Verify rendering time is acceptable (< 2 seconds)
    expect(renderTime).toBeLessThan(2000);
    console.log(`Large result set rendered in ${renderTime}ms`);
    
    // Verify pagination works efficiently
    if (await page.locator('[data-testid="pagination"]').isVisible()) {
      const paginationStartTime = Date.now();
      await page.click('[data-testid="next-page-btn"]');
      await expect(page.locator('[data-testid="venue-card"]').first()).toBeVisible();
      const paginationEndTime = Date.now();
      const paginationTime = paginationEndTime - paginationStartTime;
      
      expect(paginationTime).toBeLessThan(1000);
      console.log(`Pagination completed in ${paginationTime}ms`);
    }
  });

  test('should maintain performance during error recovery', async ({ page }) => {
    let attemptCount = 0;
    
    // Mock API to fail first time, succeed second time
    await page.route('**/api/extract', route => {
      attemptCount++;
      if (attemptCount === 1) {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Temporary service error' })
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            entities: {
              location: 'Madrid',
              capacity: 100,
              eventType: 'corporate'
            },
            confidence: 0.95
          })
        });
      }
    });
    
    await page.goto('/');
    
    const overallStartTime = Date.now();
    
    // Initial request (will fail)
    await page.fill('[data-testid="search-input"]', 'venue for corporate event');
    await page.click('[data-testid="search-button"]');
    
    // Verify error is displayed
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    
    // Retry (will succeed)
    await page.click('[data-testid="retry-button"]');
    await expect(page.locator('[data-testid="entity-preview"]')).toBeVisible();
    
    const overallEndTime = Date.now();
    const totalRecoveryTime = overallEndTime - overallStartTime;
    
    // Verify total time including error recovery is reasonable (< 5 seconds)
    expect(totalRecoveryTime).toBeLessThan(5000);
    console.log(`Error recovery completed in ${totalRecoveryTime}ms`);
    
    // Verify system continues to work normally after recovery
    await page.click('[data-testid="confirm-search"]');
    await expect(page.locator('[data-testid="venue-results"]')).toBeVisible();
  });

  test('should optimize image loading and caching', async ({ page }) => {
    await page.goto('/');
    
    // Perform search to get venues with images
    await page.fill('[data-testid="search-input"]', 'venues with photos in Barcelona');
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('[data-testid="entity-preview"]')).toBeVisible();
    await page.click('[data-testid="confirm-search"]');
    await expect(page.locator('[data-testid="venue-results"]')).toBeVisible();
    
    const startTime = Date.now();
    
    // Wait for images to load
    const venueImages = page.locator('[data-testid="venue-image"]');
    const firstImage = venueImages.first();
    
    await expect(firstImage).toBeVisible();
    
    // Verify image loading performance
    await firstImage.waitForFunction(img => (img as HTMLImageElement).complete);
    
    const endTime = Date.now();
    const imageLoadTime = endTime - startTime;
    
    // Verify images load within reasonable time (< 3 seconds)
    expect(imageLoadTime).toBeLessThan(3000);
    console.log(`Venue images loaded in ${imageLoadTime}ms`);
    
    // Test image lazy loading by scrolling
    const initialImageCount = await venueImages.count();
    
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    
    // Wait for additional images to load
    await expect(venueImages).toHaveCountGreaterThanOrEqual(initialImageCount);
  });

  test('should monitor real-time performance metrics', async ({ page }) => {
    // Enable performance monitoring
    await page.addInitScript(() => {
      (window as any).performanceMetrics = {
        navigationStart: performance.now(),
        timings: {}
      };
    });
    
    await page.goto('/');
    
    // Execute complete workflow while monitoring
    await page.fill('[data-testid="search-input"]', 'venue for wedding in Valencia');
    await page.click('[data-testid="search-button"]');
    
    await expect(page.locator('[data-testid="entity-preview"]')).toBeVisible();
    
    // Record entity extraction timing
    await page.evaluate(() => {
      (window as any).performanceMetrics.timings.entityExtraction = performance.now();
    });
    
    await page.click('[data-testid="confirm-search"]');
    await expect(page.locator('[data-testid="venue-results"]')).toBeVisible();
    
    // Record venue search timing
    await page.evaluate(() => {
      (window as any).performanceMetrics.timings.venueSearch = performance.now();
    });
    
    // Extract and verify performance metrics
    const metrics = await page.evaluate(() => (window as any).performanceMetrics);
    
    const entityExtractionTime = metrics.timings.entityExtraction - metrics.navigationStart;
    const venueSearchTime = metrics.timings.venueSearch - metrics.timings.entityExtraction;
    
    expect(entityExtractionTime).toBeLessThan(3000);
    expect(venueSearchTime).toBeLessThan(6000);
    
    console.log(`Performance Metrics:
      - Entity Extraction: ${entityExtractionTime}ms
      - Venue Search: ${venueSearchTime}ms
      - Total Workflow: ${metrics.timings.venueSearch - metrics.navigationStart}ms`);
  });
});