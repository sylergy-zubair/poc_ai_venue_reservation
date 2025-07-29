import { test, expect, Page } from '@playwright/test';

/**
 * End-to-End Booking Workflow Integration Tests
 * Phase 4: Testing complete booking process from venue selection to confirmation
 */

test.describe('Booking Workflow Integration', () => {
  let page: Page;

  // Helper function to navigate to booking page
  async function navigateToBookingPage(venueId: string = 'venue-1') {
    await page.goto(`/book/${venueId}`);
    await expect(page.locator('[data-testid="booking-form"]')).toBeVisible();
  }

  // Helper function to perform a complete search workflow
  async function performSearch(query: string) {
    await page.goto('/');
    await page.fill('[data-testid="search-input"]', query);
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('[data-testid="entity-preview"]')).toBeVisible();
    await page.click('[data-testid="confirm-search"]');
    await expect(page.locator('[data-testid="venue-results"]')).toBeVisible();
  }

  // Helper function to fill complete booking form
  async function fillBookingForm() {
    await page.fill('[data-testid="event-date"]', '2024-04-15');
    await page.fill('[data-testid="start-time"]', '14:00');
    await page.fill('[data-testid="end-time"]', '18:00');
    await page.selectOption('[data-testid="event-type"]', 'corporate');
    await page.fill('[data-testid="attendee-count"]', '100');
    await page.fill('[data-testid="contact-name"]', 'John Doe');
    await page.fill('[data-testid="contact-email"]', 'john.doe@example.com');
    await page.fill('[data-testid="contact-phone"]', '+1234567890');
    await page.fill('[data-testid="company-name"]', 'Test Company Ltd');
    await page.fill('[data-testid="special-requirements"]', 'Need projector and microphone');
  }

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
  });

  test('should complete full booking workflow from search to confirmation', async () => {
    // Start from search results
    await performSearch('venue for 100 people in Madrid');
    
    // Select first venue for booking
    const firstVenue = page.locator('[data-testid="venue-card"]').first();
    await firstVenue.locator('[data-testid="book-venue-btn"]').click();
    
    // Verify navigation to booking page
    await expect(page).toHaveURL(/\/book\/venue-\d+/);
    await expect(page.locator('[data-testid="booking-form"]')).toBeVisible();
    
    // Verify venue information is pre-filled
    await expect(page.locator('[data-testid="selected-venue-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="selected-venue-capacity"]')).toBeVisible();
    await expect(page.locator('[data-testid="selected-venue-price"]')).toBeVisible();
    
    // Fill booking form with valid data
    await fillBookingForm();
    
    // Verify form validation passes
    await expect(page.locator('[data-testid="submit-booking-btn"]')).toBeEnabled();
    
    // Submit booking
    await page.click('[data-testid="submit-booking-btn"]');
    
    // Verify loading state during submission
    await expect(page.locator('[data-testid="booking-submit-loading"]')).toBeVisible();
    
    // Verify booking confirmation page
    await expect(page.locator('[data-testid="booking-confirmation"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="booking-id"]')).toBeVisible();
    await expect(page.locator('[data-testid="booking-id"]')).toHaveText(/BOOK-\d+/);
    
    // Verify confirmation details match submitted data
    await expect(page.locator('[data-testid="confirmation-email"]')).toContainText('john.doe@example.com');
    await expect(page.locator('[data-testid="confirmation-date"]')).toContainText('2024-04-15');
    await expect(page.locator('[data-testid="confirmation-time"]')).toContainText('14:00');
    await expect(page.locator('[data-testid="confirmation-attendees"]')).toContainText('100');
    
    // Verify next steps are provided
    await expect(page.locator('[data-testid="next-steps"]')).toBeVisible();
    await expect(page.locator('[data-testid="contact-venue-info"]')).toBeVisible();
    
    // Verify options to book another venue or return to search
    await expect(page.locator('[data-testid="book-another-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="new-search-btn"]')).toBeVisible();
  });

  test('should validate booking form inputs and show appropriate errors', async () => {
    await navigateToBookingPage('venue-1');
    
    // Attempt to submit form without filling required fields
    await page.click('[data-testid="submit-booking-btn"]');
    
    // Verify validation errors are displayed
    await expect(page.locator('[data-testid="date-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="date-error"]')).toContainText('Event date is required');
    
    await expect(page.locator('[data-testid="time-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="time-error"]')).toContainText('Event time is required');
    
    await expect(page.locator('[data-testid="name-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="name-error"]')).toContainText('Contact name is required');
    
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-error"]')).toContainText('Email is required');
    
    await expect(page.locator('[data-testid="phone-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="phone-error"]')).toContainText('Phone number is required');
    
    // Fill fields one by one and verify errors disappear
    await page.fill('[data-testid="event-date"]', '2024-04-15');
    await expect(page.locator('[data-testid="date-error"]')).not.toBeVisible();
    
    await page.fill('[data-testid="start-time"]', '14:00');
    await expect(page.locator('[data-testid="time-error"]')).not.toBeVisible();
    
    // Test email validation
    await page.fill('[data-testid="contact-email"]', 'invalid-email');
    await page.blur('[data-testid="contact-email"]');
    await expect(page.locator('[data-testid="email-error"]')).toContainText('Please enter a valid email');
    
    await page.fill('[data-testid="contact-email"]', 'valid@example.com');
    await expect(page.locator('[data-testid="email-error"]')).not.toBeVisible();
    
    // Test phone validation
    await page.fill('[data-testid="contact-phone"]', '123');
    await page.blur('[data-testid="contact-phone"]');
    await expect(page.locator('[data-testid="phone-error"]')).toContainText('Please enter a valid phone number');
    
    await page.fill('[data-testid="contact-phone"]', '+1234567890');
    await expect(page.locator('[data-testid="phone-error"]')).not.toBeVisible();
    
    // Test date validation (no past dates)
    await page.fill('[data-testid="event-date"]', '2020-01-01');
    await page.blur('[data-testid="event-date"]');
    await expect(page.locator('[data-testid="date-error"]')).toContainText('Event date cannot be in the past');
    
    // Test attendee count validation
    await page.fill('[data-testid="attendee-count"]', '5000');
    await page.blur('[data-testid="attendee-count"]');
    await expect(page.locator('[data-testid="attendee-error"]')).toContainText('Exceeds venue capacity');
  });

  test('should handle booking conflicts and suggest alternatives', async () => {
    // Mock booking conflict response
    await page.route('**/api/venues/book', route => {
      route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ 
          error: 'Venue not available for selected date and time',
          conflictType: 'TIME_CONFLICT',
          suggestedAlternatives: [
            { date: '2024-04-16', startTime: '14:00', endTime: '18:00' },
            { date: '2024-04-17', startTime: '10:00', endTime: '14:00' },
            { date: '2024-04-18', startTime: '14:00', endTime: '18:00' }
          ]
        })
      });
    });

    await navigateToBookingPage('venue-1');
    await fillBookingForm();
    await page.click('[data-testid="submit-booking-btn"]');
    
    // Verify conflict message is displayed
    await expect(page.locator('[data-testid="booking-conflict-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="booking-conflict-error"]')).toContainText('not available for selected date');
    
    // Verify alternative time slots are shown
    await expect(page.locator('[data-testid="alternative-slots"]')).toBeVisible();
    const alternatives = page.locator('[data-testid="alternative-slot"]');
    await expect(alternatives).toHaveCount(3);
    
    // Test selecting an alternative slot
    const firstAlternative = alternatives.first();
    await expect(firstAlternative).toContainText('2024-04-16');
    await expect(firstAlternative).toContainText('14:00');
    
    await firstAlternative.locator('[data-testid="select-alternative-btn"]').click();
    
    // Verify form is updated with alternative date/time
    await expect(page.locator('[data-testid="event-date"]')).toHaveValue('2024-04-16');
    await expect(page.locator('[data-testid="start-time"]')).toHaveValue('14:00');
    await expect(page.locator('[data-testid="end-time"]')).toHaveValue('18:00');
    
    // Verify conflict error is cleared
    await expect(page.locator('[data-testid="booking-conflict-error"]')).not.toBeVisible();
    
    // Test option to modify search criteria instead
    await expect(page.locator('[data-testid="find-other-venues-btn"]')).toBeVisible();
  });

  test('should handle payment processing integration', async () => {
    await navigateToBookingPage('venue-1');
    await fillBookingForm();
    
    // Verify pricing information is displayed
    await expect(page.locator('[data-testid="venue-base-price"]')).toBeVisible();
    await expect(page.locator('[data-testid="additional-services-cost"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-cost"]')).toBeVisible();
    
    // Verify payment options are available
    await expect(page.locator('[data-testid="payment-method-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="payment-method-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="payment-method-bank"]')).toBeVisible();
    
    // Select card payment
    await page.click('[data-testid="payment-method-card"]');
    
    // Verify card payment form appears
    await expect(page.locator('[data-testid="card-payment-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="card-number-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="card-expiry-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="card-cvv-input"]')).toBeVisible();
    
    // Fill payment details
    await page.fill('[data-testid="card-number-input"]', '4111111111111111');
    await page.fill('[data-testid="card-expiry-input"]', '12/25');
    await page.fill('[data-testid="card-cvv-input"]', '123');
    await page.fill('[data-testid="cardholder-name-input"]', 'John Doe');
    
    // Submit booking with payment
    await page.click('[data-testid="submit-booking-btn"]');
    
    // Verify payment processing state
    await expect(page.locator('[data-testid="payment-processing"]')).toBeVisible();
    await expect(page.locator('[data-testid="payment-processing"]')).toContainText('Processing payment');
    
    // Verify successful booking confirmation includes payment details
    await expect(page.locator('[data-testid="booking-confirmation"]')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('[data-testid="payment-confirmation"]')).toBeVisible();
    await expect(page.locator('[data-testid="payment-method-used"]')).toContainText('Card ending in 1111');
    await expect(page.locator('[data-testid="payment-amount"]')).toBeVisible();
  });

  test('should support booking modifications during the process', async () => {
    await navigateToBookingPage('venue-1');
    
    // Fill initial booking details
    await page.fill('[data-testid="event-date"]', '2024-04-15');
    await page.fill('[data-testid="start-time"]', '14:00');
    await page.fill('[data-testid="attendee-count"]', '100');
    
    // Add additional services
    await page.check('[data-testid="service-catering"]');
    await page.check('[data-testid="service-av-equipment"]');
    
    // Verify pricing updates with additional services
    await expect(page.locator('[data-testid="catering-cost"]')).toBeVisible();
    await expect(page.locator('[data-testid="av-equipment-cost"]')).toBeVisible();
    
    // Modify attendee count and verify pricing updates
    await page.fill('[data-testid="attendee-count"]', '150');
    await page.blur('[data-testid="attendee-count"]');
    
    // Verify that pricing recalculates
    await expect(page.locator('[data-testid="pricing-updated-indicator"]')).toBeVisible();
    
    // Remove a service and verify pricing updates
    await page.uncheck('[data-testid="service-catering"]');
    await expect(page.locator('[data-testid="catering-cost"]')).not.toBeVisible();
    
    // Verify booking summary reflects all changes
    await expect(page.locator('[data-testid="booking-summary-attendees"]')).toContainText('150');
    await expect(page.locator('[data-testid="booking-summary-services"]')).toContainText('A/V Equipment');
    await expect(page.locator('[data-testid="booking-summary-services"]')).not.toContainText('Catering');
  });

  test('should handle venue unavailability during booking process', async () => {
    // Mock venue becoming unavailable after user starts booking
    await page.route('**/api/venues/availability/**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          available: false,
          reason: 'Venue was just booked by another user',
          lastAvailableCheck: new Date().toISOString()
        })
      });
    });

    await navigateToBookingPage('venue-1');
    
    // Fill form partially
    await page.fill('[data-testid="event-date"]', '2024-04-15');
    await page.fill('[data-testid="start-time"]', '14:00');
    
    // Trigger availability check (usually done on date/time change)
    await page.blur('[data-testid="start-time"]');
    
    // Verify unavailability message
    await expect(page.locator('[data-testid="venue-unavailable-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="venue-unavailable-error"]')).toContainText('no longer available');
    
    // Verify booking form is disabled
    await expect(page.locator('[data-testid="submit-booking-btn"]')).toBeDisabled();
    
    // Verify options to find alternative venues
    await expect(page.locator('[data-testid="find-similar-venues-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="return-to-search-btn"]')).toBeVisible();
    
    // Test finding similar venues
    await page.click('[data-testid="find-similar-venues-btn"]');
    
    // Should navigate back to search with similar criteria
    await expect(page).toHaveURL(/\/search/);
    await expect(page.locator('[data-testid="venue-results"]')).toBeVisible();
    await expect(page.locator('[data-testid="similar-venues-message"]')).toContainText('Similar venues');
  });

  test('should preserve booking data during navigation', async () => {
    await navigateToBookingPage('venue-1');
    
    // Fill booking form partially
    await page.fill('[data-testid="contact-name"]', 'John Doe');
    await page.fill('[data-testid="contact-email"]', 'john@example.com');
    await page.fill('[data-testid="event-date"]', '2024-04-15');
    await page.fill('[data-testid="special-requirements"]', 'Need wheelchair access');
    
    // Navigate to venue details
    await page.click('[data-testid="view-venue-details-btn"]');
    
    // Verify navigation to venue details
    await expect(page).toHaveURL(/\/venues\/\d+/);
    
    // Navigate back to booking form
    await page.click('[data-testid="continue-booking-btn"]');
    
    // Verify all form data is preserved
    await expect(page.locator('[data-testid="contact-name"]')).toHaveValue('John Doe');
    await expect(page.locator('[data-testid="contact-email"]')).toHaveValue('john@example.com');
    await expect(page.locator('[data-testid="event-date"]')).toHaveValue('2024-04-15');
    await expect(page.locator('[data-testid="special-requirements"]')).toHaveValue('Need wheelchair access');
    
    // Verify form state is maintained (validation, etc.)
    await expect(page.locator('[data-testid="booking-form"]')).toHaveClass(/partially-filled/);
  });

  test('should handle booking confirmation email delivery', async () => {
    // Mock email service
    let emailSent = false;
    await page.route('**/api/email/send-confirmation', route => {
      emailSent = true;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          success: true,
          messageId: 'email-123',
          recipient: 'john.doe@example.com'
        })
      });
    });

    await navigateToBookingPage('venue-1');
    await fillBookingForm();
    await page.click('[data-testid="submit-booking-btn"]');
    
    // Wait for booking confirmation
    await expect(page.locator('[data-testid="booking-confirmation"]')).toBeVisible();
    
    // Verify email confirmation message
    await expect(page.locator('[data-testid="email-confirmation-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-confirmation-message"]')).toContainText('confirmation email sent');
    await expect(page.locator('[data-testid="email-confirmation-message"]')).toContainText('john.doe@example.com');
    
    // Verify email was actually sent (through route mock)
    expect(emailSent).toBe(true);
    
    // Test resend email functionality
    await page.click('[data-testid="resend-confirmation-btn"]');
    await expect(page.locator('[data-testid="email-resent-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-resent-message"]')).toContainText('Confirmation email resent');
  });
});