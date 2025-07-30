import express from 'express';
import { extractEntities } from '../services/gemini/entityExtraction';
import logger from '../utils/logger';

const router = express.Router();

// Mock venue data
const mockVenues = [
  {
    id: 'venue-1',
    name: 'Madrid Convention Center',
    description: 'Modern convention center in the heart of Madrid with state-of-the-art facilities.',
    location: {
      address: 'Calle de la Convención 123',
      city: 'Madrid',
      country: 'Spain',
      coordinates: { lat: 40.4168, lng: -3.7038 }
    },
    capacity: { min: 50, max: 500, recommended: 300 },
    pricing: { basePrice: 2000, currency: 'EUR', unit: 'day' },
    amenities: ['WiFi', 'AV Equipment', 'Catering', 'Parking'],
    categories: ['conference', 'meeting', 'corporate'],
    images: ['https://example.com/madrid-cc-1.jpg'],
    provider: 'VenueHub'
  },
  {
    id: 'venue-2', 
    name: 'Barcelona Event Space',
    description: 'Stylish event space near the beach with flexible layouts.',
    location: {
      address: 'Passeig Marítim 456',
      city: 'Barcelona',
      country: 'Spain',
      coordinates: { lat: 41.3851, lng: 2.1734 }
    },
    capacity: { min: 25, max: 200, recommended: 150 },
    pricing: { basePrice: 1500, currency: 'EUR', unit: 'day' },
    amenities: ['WiFi', 'Sound System', 'Lighting', 'Terrace'],
    categories: ['conference', 'wedding', 'corporate'],
    images: ['https://example.com/barcelona-es-1.jpg'],
    provider: 'SpaceBooker'
  },
  {
    id: 'venue-3',
    name: 'Lisbon Business Hub',
    description: 'Professional business center with meeting rooms and conference facilities.',
    location: {
      address: 'Avenida da Liberdade 789',
      city: 'Lisbon',
      country: 'Portugal', 
      coordinates: { lat: 38.7223, lng: -9.1393 }
    },
    capacity: { min: 10, max: 100, recommended: 50 },
    pricing: { basePrice: 800, currency: 'EUR', unit: 'day' },
    amenities: ['WiFi', 'Projector', 'Conference Phones', 'Coffee Service'],
    categories: ['meeting', 'corporate', 'training'],
    images: ['https://example.com/lisbon-bh-1.jpg'],
    provider: 'BusinessSpaces'
  }
];

// Mock bookings storage
const mockBookings = new Map();

// Entity extraction endpoint
router.post('/extract', async (req, res) => {
  try {
    const { query, context } = req.body;
    
    if (!query || typeof query !== 'string') {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_QUERY',
          message: 'Query is required and must be a string'
        }
      });
      return;
    }

    logger.info('Extracting entities from query', { query, requestId: req.requestId });

    const result = await extractEntities(query, context);

    res.json({
      success: true,
      data: {
        sessionId: req.requestId,
        entities: result.entities,
        confidence: result.confidence,
        reasoning: result.reasoning,
        suggestions: result.suggestions || [],
        metadata: {
          processingTime: result.metadata?.processingTime || 0,
          timestamp: new Date().toISOString(),
          model: 'llama3.1:8b',
          fromCache: false
        }
      }
    });

    return;

  } catch (error) {
    logger.error('Entity extraction failed', { error: error.message, requestId: req.requestId });
    res.status(500).json({
      success: false,
      error: {
        code: 'EXTRACTION_FAILED',
        message: 'Failed to extract entities from query'
      }
    });
    return;
  }
});

// Venue search endpoint
router.post('/venues/search', async (req, res) => {
  try {
    const { filters = {}, page = 1, limit = 20 } = req.body;
    
    logger.info('Searching venues with mock data', { 
      filters, 
      page, 
      limit, 
      requestId: req.requestId 
    });

    // Filter venues based on criteria
    let filteredVenues = [...mockVenues];

    if (filters.location) {
      const location = filters.location.toLowerCase();
      filteredVenues = filteredVenues.filter(venue => 
        venue.location.city.toLowerCase().includes(location) ||
        venue.location.country.toLowerCase().includes(location)
      );
    }

    if (filters.capacity?.min) {
      filteredVenues = filteredVenues.filter(venue => 
        venue.capacity.max >= filters.capacity.min
      );
    }

    if (filters.eventType) {
      const eventType = filters.eventType.toLowerCase();
      filteredVenues = filteredVenues.filter(venue =>
        venue.categories.includes(eventType)
      );
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedVenues = filteredVenues.slice(startIndex, endIndex);

    const searchResult = {
      venues: paginatedVenues,
      totalCount: filteredVenues.length,
      page,
      limit,
      totalPages: Math.ceil(filteredVenues.length / limit),
      metadata: {
        searchTime: Math.random() * 100 + 50,
        sessionId: req.requestId,
        provider: 'mock'
      }
    };

    res.json({
      success: true,
      data: searchResult
    });

  } catch (error) {
    logger.error('Venue search failed', { error: error.message, requestId: req.requestId });
    res.status(500).json({
      success: false,
      error: {
        code: 'SEARCH_FAILED',
        message: 'Failed to search venues'
      }
    });
  }
});

// Get venue details by ID
router.get('/venues/:venueId', async (req, res) => {
  try {
    const { venueId } = req.params;
    
    logger.info('Fetching venue details', { venueId, requestId: req.requestId });

    const venue = mockVenues.find(v => v.id === venueId);

    if (!venue) {
      res.status(404).json({
        success: false,
        error: {
          code: 'VENUE_NOT_FOUND',
          message: 'Venue not found'
        }
      });
      return;
    }

    res.json({
      success: true,
      data: venue
    });

  } catch (error) {
    logger.error('Venue details fetch failed', { error: error.message, requestId: req.requestId });
    res.status(500).json({
      success: false,
      error: {
        code: 'VENUE_FETCH_FAILED',
        message: 'Failed to fetch venue details'
      }
    });
  }
});

// Booking endpoint
router.post('/venues/book', async (req, res) => {
  try {
    const { contact, details } = req.body;
    
    logger.info('Creating booking with mock data', { 
      contact: contact?.email, 
      venueId: details?.venueId,
      requestId: req.requestId 
    });

    // Validate required fields
    if (!contact?.name || !contact?.email || !details?.venueId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_BOOKING_DATA',
          message: 'Missing required booking information'
        }
      });
      return;
    }

    // Find venue
    const venue = mockVenues.find(v => v.id === details.venueId);
    if (!venue) {
      res.status(404).json({
        success: false,
        error: {
          code: 'VENUE_NOT_FOUND',
          message: 'Venue not found'
        }
      });
      return;
    }

    // Create booking
    const bookingId = `BOOK_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const booking = {
      bookingId,
      status: 'pending',
      venue: {
        id: venue.id,
        name: venue.name,
        location: venue.location
      },
      contact,
      details,
      pricing: {
        basePrice: venue.pricing.basePrice,
        totalPrice: venue.pricing.basePrice,
        currency: venue.pricing.currency,
        breakdown: [
          { item: 'Venue rental', amount: venue.pricing.basePrice }
        ]
      },
      nextSteps: [
        'Venue will contact you within 24 hours',
        'Payment details will be provided',
        'Final confirmation required'
      ],
      metadata: {
        createdAt: new Date().toISOString(),
        provider: 'mock',
        reference: bookingId,
        source: 'api'
      }
    };

    mockBookings.set(bookingId, booking);

    res.json({
      success: true,
      data: booking
    });

  } catch (error) {
    logger.error('Booking creation failed', { error: error.message, requestId: req.requestId });
    res.status(500).json({
      success: false,
      error: {
        code: 'BOOKING_FAILED',
        message: 'Failed to create booking'
      }
    });
  }
});

// Get booking details by ID
router.get('/bookings/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    logger.info('Fetching booking details', { bookingId, requestId: req.requestId });

    const booking = mockBookings.get(bookingId);

    if (!booking) {
      res.status(404).json({
        success: false,
        error: {
          code: 'BOOKING_NOT_FOUND',
          message: 'Booking not found'
        }
      });
      return;
    }

    res.json({
      success: true,
      data: booking
    });

  } catch (error) {
    logger.error('Booking fetch failed', { error: error.message, requestId: req.requestId });
    res.status(500).json({
      success: false,
      error: {
        code: 'BOOKING_FETCH_FAILED',
        message: 'Failed to fetch booking details'
      }
    });
  }
});

// Check venue availability
router.get('/venues/:venueId/availability', async (req, res) => {
  try {
    const { venueId } = req.params;
    const { date, startTime, endTime } = req.query;
    
    if (!date || !startTime || !endTime) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMETERS',
          message: 'Date, startTime, and endTime are required'
        }
      });
      return;
    }

    logger.info('Checking venue availability', { 
      venueId, 
      date, 
      startTime, 
      endTime, 
      requestId: req.requestId 
    });

    // Mock availability check - assume available unless it's a weekend
    const requestedDate = new Date(date as string);
    const dayOfWeek = requestedDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const availability = {
      available: !isWeekend,
      reason: isWeekend ? 'Venue closed on weekends' : null,
      alternativeDates: isWeekend ? [
        new Date(requestedDate.getTime() + 86400000).toISOString().split('T')[0], // Next day
        new Date(requestedDate.getTime() + 172800000).toISOString().split('T')[0]  // Day after
      ] : []
    };

    res.json({
      success: true,
      data: availability
    });

  } catch (error) {
    logger.error('Availability check failed', { error: error.message, requestId: req.requestId });
    res.status(500).json({
      success: false,
      error: {
        code: 'AVAILABILITY_CHECK_FAILED',
        message: 'Failed to check venue availability'
      }
    });
  }
});

// Analytics tracking endpoint
router.post('/analytics/track', async (req, res) => {
  try {
    const { event, properties } = req.body;
    
    logger.info('Analytics event', { event, properties, requestId: req.requestId });

    // Just log for now - in production would send to analytics service
    res.json({ success: true });

  } catch (error) {
    logger.error('Analytics tracking failed', { error: error.message });
    res.status(200).json({ success: false }); // Don't fail the main request
  }
});

export default router;