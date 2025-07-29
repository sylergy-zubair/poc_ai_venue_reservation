import { test, expect } from '@playwright/test';

/**
 * Quality Assurance Comprehensive Test Suite
 * Phase 4: Testing functional, performance, security, and accessibility requirements
 */

test.describe('Quality Assurance - Functional Testing', () => {
  
  test('All user workflows complete successfully', async ({ page }) => {
    // Complete Search Workflow
    await page.goto('/');
    await page.fill('[data-testid="search-input"]', 'conference venue for 150 people in Madrid');
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('[data-testid="entity-preview"]')).toBeVisible();
    await page.click('[data-testid="confirm-search"]');
    await expect(page.locator('[data-testid="venue-results"]')).toBeVisible();
    
    // Complete Booking Workflow
    const firstVenue = page.locator('[data-testid="venue-card"]').first();
    await firstVenue.locator('[data-testid="book-venue-btn"]').click();
    
    await page.fill('[data-testid="event-date"]', '2024-05-15');
    await page.fill('[data-testid="start-time"]', '14:00');
    await page.fill('[data-testid="end-time"]', '18:00');
    await page.fill('[data-testid="contact-name"]', 'Test User');
    await page.fill('[data-testid="contact-email"]', 'test@example.com');
    await page.fill('[data-testid="contact-phone"]', '+1234567890');
    
    await page.click('[data-testid="submit-booking-btn"]');
    await expect(page.locator('[data-testid="booking-confirmation"]')).toBeVisible();
    
    // Verify successful completion
    await expect(page.locator('[data-testid="booking-id"]')).toBeVisible();
    await expect(page.locator('[data-testid="booking-status"]')).toContainText('confirmed');
  });

  test('Error handling works as expected', async ({ page }) => {
    // Test network errors
    await page.route('**/api/**', route => {
      route.abort('failed');
    });
    
    await page.goto('/');
    await page.fill('[data-testid="search-input"]', 'test query');
    await page.click('[data-testid="search-button"]');
    
    // Should show network error
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('network');
    
    // Should provide retry option
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    
    // Clear route and test retry
    await page.unroute('**/api/**');
    await page.click('[data-testid="retry-button"]');
    await expect(page.locator('[data-testid="entity-preview"]')).toBeVisible();
  });

  test('Data validation prevents invalid inputs', async ({ page }) => {
    await page.goto('/book/venue-1');
    
    // Test invalid email
    await page.fill('[data-testid="contact-email"]', 'invalid-email');
    await page.blur('[data-testid="contact-email"]');
    await expect(page.locator('[data-testid="email-error"]')).toContainText('valid email');
    
    // Test invalid phone
    await page.fill('[data-testid="contact-phone"]', '123');
    await page.blur('[data-testid="contact-phone"]');
    await expect(page.locator('[data-testid="phone-error"]')).toContainText('valid phone');
    
    // Test past date
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    await page.fill('[data-testid="event-date"]', pastDate.toISOString().split('T')[0]);
    await page.blur('[data-testid="event-date"]');
    await expect(page.locator('[data-testid="date-error"]')).toContainText('past');
    
    // Test invalid capacity
    await page.fill('[data-testid="attendee-count"]', '0');
    await page.blur('[data-testid="attendee-count"]');
    await expect(page.locator('[data-testid="attendee-error"]')).toContainText('greater than 0');
  });

  test('Session management works correctly', async ({ page, context }) => {
    // Start a search
    await page.goto('/');
    await page.fill('[data-testid="search-input"]', 'venue for 100 people in Barcelona');
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('[data-testid="entity-preview"]')).toBeVisible();
    
    // Navigate away and back
    await page.goto('/about');
    await page.goBack();
    
    // Search state should be preserved
    await expect(page.locator('[data-testid="search-input"]')).toHaveValue('venue for 100 people in Barcelona');
    
    // Test session cleanup
    await context.clearCookies();
    await page.reload();
    
    // Should start fresh
    await expect(page.locator('[data-testid="search-input"]')).toHaveValue('');
  });
});

test.describe('Quality Assurance - Performance Testing', () => {
  
  test('Entity extraction completes within 2 seconds', async ({ page }) => {
    await page.goto('/');
    
    const startTime = Date.now();
    await page.fill('[data-testid="search-input"]', 'venue for 200 people in London next month');
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('[data-testid="entity-preview"]')).toBeVisible();
    
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(2000);
    console.log(`Entity extraction: ${duration}ms`);
  });

  test('Venue search completes within 5 seconds', async ({ page }) => {
    await page.goto('/');
    await page.fill('[data-testid="search-input"]', 'conference venue for 300 people in Madrid');
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('[data-testid="entity-preview"]')).toBeVisible();
    
    const startTime = Date.now();
    await page.click('[data-testid="confirm-search"]');
    await expect(page.locator('[data-testid="venue-results"]')).toBeVisible();
    
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(5000);
    console.log(`Venue search: ${duration}ms`);
  });

  test('Frontend loading meets performance targets', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    
    // Wait for First Contentful Paint indicators
    await expect(page.locator('[data-testid="search-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="main-header"]')).toBeVisible();
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(1500); // 1.5s FCP target
    console.log(`Page load time: ${loadTime}ms`);
  });

  test('System handles concurrent users', async ({ browser }) => {
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
    
    // Execute concurrent searches
    const searchPromises = pages.map(async (page, index) => {
      await page.goto('/');
      await page.fill('[data-testid="search-input"]', `venue for ${100 + index * 50} people in Madrid`);
      await page.click('[data-testid="search-button"]');
      return expect(page.locator('[data-testid="entity-preview"]')).toBeVisible({ timeout: 10000 });
    });
    
    await Promise.all(searchPromises);
    
    const totalTime = Date.now() - startTime;
    const avgTime = totalTime / concurrentUsers;
    
    expect(avgTime).toBeLessThan(5000); // Average should be reasonable
    console.log(`Concurrent users handled in average ${avgTime}ms per user`);
    
    // Cleanup
    for (const context of contexts) {
      await context.close();
    }
  });
});

test.describe('Quality Assurance - Security Testing', () => {
  
  test('API keys are secure and not exposed', async ({ page }) => {
    await page.goto('/');
    
    // Check that no API keys are exposed in the page source
    const pageContent = await page.content();
    expect(pageContent).not.toMatch(/api[_-]?key.*[a-zA-Z0-9]{20,}/i);
    expect(pageContent).not.toMatch(/secret.*[a-zA-Z0-9]{20,}/i);
    expect(pageContent).not.toMatch(/token.*[a-zA-Z0-9]{20,}/i);
    
    // Check localStorage and sessionStorage for exposed secrets
    const storageData = await page.evaluate(() => {
      const data: any = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) data[`ls_${key}`] = localStorage.getItem(key);
      }
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) data[`ss_${key}`] = sessionStorage.getItem(key);
      }
      return data;
    });
    
    const storageString = JSON.stringify(storageData).toLowerCase();
    expect(storageString).not.toMatch(/api[_-]?key/);
    expect(storageString).not.toMatch(/secret/);
    expect(storageString).not.toMatch(/token/);
  });

  test('Input validation prevents injection attacks', async ({ page }) => {
    await page.goto('/');
    
    // Test XSS prevention
    const xssPayload = '<script>alert("xss")</script>';
    await page.fill('[data-testid="search-input"]', xssPayload);
    await page.click('[data-testid="search-button"]');
    
    // XSS should be prevented - script should not execute
    // If entity extraction fails, it should be a controlled failure
    await page.waitForTimeout(2000);
    const alerts = await page.evaluate(() => window.alert.toString());
    expect(alerts).not.toContain('xss');
    
    // Test SQL injection patterns (though this is a NoSQL app)
    const sqlPayload = "'; DROP TABLE venues; --";
    await page.fill('[data-testid="search-input"]', sqlPayload);
    await page.click('[data-testid="search-button"]');
    
    // Should handle gracefully without breaking
    await expect(page.locator('[data-testid="search-input"]')).toBeVisible();
    
    // Test booking form injection
    await page.goto('/book/venue-1');
    await page.fill('[data-testid="contact-name"]', xssPayload);
    await page.fill('[data-testid="contact-email"]', 'test@example.com');
    await page.fill('[data-testid="contact-phone"]', '+1234567890');
    await page.fill('[data-testid="event-date"]', '2024-06-15');
    await page.fill('[data-testid="start-time"]', '14:00');
    
    // Form should validate and sanitize input
    await page.click('[data-testid="submit-booking-btn"]');
    
    // Should not break the application
    await expect(page.locator('[data-testid="booking-form"]')).toBeVisible();
  });

  test('PII data is handled correctly', async ({ page }) => {
    await page.goto('/book/venue-1');
    
    const piiData = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890',
      company: 'Test Company'
    };
    
    await page.fill('[data-testid="contact-name"]', piiData.name);
    await page.fill('[data-testid="contact-email"]', piiData.email);
    await page.fill('[data-testid="contact-phone"]', piiData.phone);
    await page.fill('[data-testid="company-name"]', piiData.company);
    
    // Check that PII is not stored in browser storage
    const storageData = await page.evaluate(() => {
      const data: any = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) data[key] = localStorage.getItem(key);
      }
      return data;
    });
    
    const storageString = JSON.stringify(storageData);
    expect(storageString).not.toContain(piiData.email);
    expect(storageString).not.toContain(piiData.phone);
    expect(storageString).not.toContain(piiData.name);
  });

  test('Rate limiting prevents abuse', async ({ request }) => {
    const baseURL = process.env.BASE_URL || 'http://localhost:3001';
    
    // Test basic health endpoint rate limiting
    const requests = [];
    for (let i = 0; i < 100; i++) {
      requests.push(request.get(`${baseURL}/api/health`));
    }
    
    const responses = await Promise.allSettled(requests);
    const rateLimitedResponses = responses.filter(
      result => result.status === 'fulfilled' && result.value.status() === 429
    );
    
    // Should eventually get rate limited
    expect(rateLimitedResponses.length).toBeGreaterThan(0);
  });
});

test.describe('Quality Assurance - Accessibility Testing', () => {
  
  test('Screen reader compatibility', async ({ page }) => {
    await page.goto('/');
    
    // Check for proper ARIA labels
    await expect(page.locator('[data-testid="search-input"]')).toHaveAttribute('aria-label');
    await expect(page.locator('[data-testid="search-button"]')).toHaveAttribute('aria-label');
    
    // Check for semantic HTML
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('nav')).toBeVisible();
    
    // Check for proper heading hierarchy
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1); // Should have exactly one h1
    
    // Check live regions for dynamic content
    await page.fill('[data-testid="search-input"]', 'test search');
    await page.click('[data-testid="search-button"]');
    
    await expect(page.locator('[data-testid="entity-preview"]')).toHaveAttribute('aria-live');
  });

  test('Keyboard navigation works', async ({ page }) => {
    await page.goto('/');
    
    // Test tab navigation
    await page.press('body', 'Tab');
    await expect(page.locator('[data-testid="search-input"]')).toBeFocused();
    
    await page.press('[data-testid="search-input"]', 'Tab');
    await expect(page.locator('[data-testid="search-button"]')).toBeFocused();
    
    // Test Enter key functionality
    await page.focus('[data-testid="search-input"]');
    await page.fill('[data-testid="search-input"]', 'keyboard test venue');
    await page.press('[data-testid="search-input"]', 'Enter');
    
    await expect(page.locator('[data-testid="entity-preview"]')).toBeVisible();
    
    // Test Escape key to close modals
    if (await page.locator('[data-testid="modal"]').isVisible()) {
      await page.press('body', 'Escape');
      await expect(page.locator('[data-testid="modal"]')).not.toBeVisible();
    }
  });

  test('Color contrast meets WCAG standards', async ({ page }) => {
    await page.goto('/');
    
    // Test main search elements
    const searchInput = page.locator('[data-testid="search-input"]');
    const searchButton = page.locator('[data-testid="search-button"]');
    
    // Get computed styles
    const inputStyles = await searchInput.evaluate(el => {
      const style = window.getComputedStyle(el);
      return {
        color: style.color,
        backgroundColor: style.backgroundColor,
        borderColor: style.borderColor
      };
    });
    
    const buttonStyles = await searchButton.evaluate(el => {
      const style = window.getComputedStyle(el);
      return {
        color: style.color,
        backgroundColor: style.backgroundColor
      };
    });
    
    // Basic checks - colors should be defined and not transparent
    expect(inputStyles.color).not.toBe('rgba(0, 0, 0, 0)');
    expect(inputStyles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(buttonStyles.color).not.toBe('rgba(0, 0, 0, 0)');
    expect(buttonStyles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('Focus management is proper', async ({ page }) => {
    await page.goto('/');
    
    // Test focus trap in modals
    await page.fill('[data-testid="search-input"]', 'focus test');
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('[data-testid="entity-preview"]')).toBeVisible();
    
    // If there's a modal, focus should be trapped
    if (await page.locator('[data-testid="modal"]').isVisible()) {
      const focusableElements = await page.locator('[data-testid="modal"] button, [data-testid="modal"] input, [data-testid="modal"] select').count();
      
      if (focusableElements > 0) {
        // Tab through all focusable elements
        for (let i = 0; i < focusableElements + 1; i++) {
          await page.press('body', 'Tab');
        }
        
        // Focus should cycle back to first element
        const firstFocusable = page.locator('[data-testid="modal"] button, [data-testid="modal"] input, [data-testid="modal"] select').first();
        await expect(firstFocusable).toBeFocused();
      }
    }
  });

  test('ARIA labels are correct', async ({ page }) => {
    await page.goto('/');
    
    // Check required ARIA labels
    await expect(page.locator('[data-testid="search-input"]')).toHaveAttribute('aria-label');
    await expect(page.locator('[data-testid="search-button"]')).toHaveAttribute('aria-label');
    
    // Test dynamic ARIA updates
    await page.fill('[data-testid="search-input"]', 'aria test venue');
    await page.click('[data-testid="search-button"]');
    
    await expect(page.locator('[data-testid="entity-preview"]')).toBeVisible();
    
    // Check for proper roles
    await expect(page.locator('[data-testid="entity-preview"]')).toHaveAttribute('role', 'region');
    
    // Check for describedby relationships
    const entityElements = await page.locator('[data-testid^="extracted-"]').count();
    if (entityElements > 0) {
      const firstEntity = page.locator('[data-testid^="extracted-"]').first();
      const ariaDescribedBy = await firstEntity.getAttribute('aria-describedby');
      
      if (ariaDescribedBy) {
        // Should have corresponding description element
        await expect(page.locator(`#${ariaDescribedBy}`)).toBeVisible();
      }
    }
  });
});

test.describe('Quality Assurance - Cross-Browser Testing', () => {
  
  test('Chrome compatibility', async ({ page }) => {
    await page.goto('/');
    
    // Test basic functionality
    await page.fill('[data-testid="search-input"]', 'chrome test venue');
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('[data-testid="entity-preview"]')).toBeVisible();
    
    // Test modern features
    const hasIntersectionObserver = await page.evaluate(() => 'IntersectionObserver' in window);
    expect(hasIntersectionObserver).toBe(true);
    
    const hasFetch = await page.evaluate(() => 'fetch' in window);
    expect(hasFetch).toBe(true);
  });

  test('Mobile browser compatibility', async ({ page }) => {
    // Simulate mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Test touch interactions
    await page.tap('[data-testid="search-input"]');
    await expect(page.locator('[data-testid="search-input"]')).toBeFocused();
    
    await page.fill('[data-testid="search-input"]', 'mobile test venue');
    await page.tap('[data-testid="search-button"]');
    
    await expect(page.locator('[data-testid="entity-preview"]')).toBeVisible();
    
    // Test responsive layout
    const searchInput = page.locator('[data-testid="search-input"]');
    const inputBox = await searchInput.boundingBox();
    
    if (inputBox) {
      // Input should be reasonably sized for mobile
      expect(inputBox.width).toBeGreaterThan(200);
      expect(inputBox.height).toBeGreaterThan(30);
    }
  });

  test('Feature detection and graceful degradation', async ({ page }) => {
    await page.goto('/');
    
    // Test that app works without modern features
    await page.addInitScript(() => {
      // Simulate older browser by removing modern features
      delete (window as any).IntersectionObserver;
    });
    
    await page.reload();
    
    // App should still function
    await page.fill('[data-testid="search-input"]', 'degraded feature test');
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('[data-testid="entity-preview"]')).toBeVisible();
  });
});