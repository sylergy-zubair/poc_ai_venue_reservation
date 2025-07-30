import express from 'express';
import { extractEntities } from '../services/gemini/entityExtraction';
import { getSimplyBookVenueService, isSimplyBookConfigured } from '../services/simplybook';
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
          model: result.metadata?.model || 'gemini-1.5-flash',
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
  const startTime = Date.now();
  
  try {
    const { filters = {}, page = 1, limit = 20 } = req.body;
    
    // Check if SimplyBook.me is configured
    const venueService = getSimplyBookVenueService();
    const useSimplyBook = isSimplyBookConfigured() && venueService;
    
    logger.info('Searching venues', { 
      filters, 
      page, 
      limit, 
      provider: useSimplyBook ? 'simplybook' : 'mock',
      requestId: req.requestId 
    });

    if (useSimplyBook) {
      // Use SimplyBook.me API
      const searchParams = {
        location: filters.location,
        capacity: filters.capacity?.min,
        date: filters.date ? new Date(filters.date) : undefined,
        eventType: filters.eventType,
        budget: filters.budget,
        amenities: filters.amenities,
      };

      const venues = await venueService!.searchVenues(searchParams);
      
      // Transform to API response format
      const transformedVenues = venues.map(venue => ({
        id: venue.id,
        name: venue.name,
        description: venue.description,
        location: {
          address: `${venue.location} Venue`,
          city: venue.location,
          country: 'Spain', // Default for now
          coordinates: { lat: 40.4168, lng: -3.7038 } // Default Madrid coords
        },
        capacity: { 
          min: Math.floor(venue.capacity * 0.5), 
          max: venue.capacity, 
          recommended: Math.floor(venue.capacity * 0.8) 
        },
        pricing: { 
          basePrice: venue.pricePerHour * 8, // Convert hourly to daily rate
          currency: venue.currency, 
          unit: 'day' 
        },
        amenities: venue.amenities,
        categories: [filters.eventType || 'conference'].filter(Boolean),
        images: venue.images || ['https://via.placeholder.com/800x400?text=Venue'],
        provider: 'SimplyBook.me',
        availability: venue.availability
      }));

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedVenues = transformedVenues.slice(startIndex, endIndex);

      const searchResult = {
        venues: paginatedVenues,
        totalCount: transformedVenues.length,
        page,
        limit,
        totalPages: Math.ceil(transformedVenues.length / limit),
        metadata: {
          searchTime: Date.now() - startTime,
          sessionId: req.requestId,
          provider: 'simplybook',
          realtime: true
        }
      };

      res.json({
        success: true,
        data: searchResult
      });
      return;
    }

    // Fallback to mock data when SimplyBook.me is not configured
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
        searchTime: Date.now() - startTime,
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

    // Check if SimplyBook.me is configured
    const venueService = getSimplyBookVenueService();
    const useSimplyBook = isSimplyBookConfigured() && venueService;

    if (useSimplyBook) {
      // Use SimplyBook.me API
      const venue = await venueService!.getVenueById(venueId);

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

      // Transform to API response format
      const transformedVenue = {
        id: venue.id,
        name: venue.name,
        description: venue.description,
        location: {
          address: `${venue.location} Venue`,
          city: venue.location,
          country: 'Spain',
          coordinates: { lat: 40.4168, lng: -3.7038 }
        },
        capacity: { 
          min: Math.floor(venue.capacity * 0.5), 
          max: venue.capacity, 
          recommended: Math.floor(venue.capacity * 0.8) 
        },
        pricing: { 
          basePrice: venue.pricePerHour * 8,
          currency: venue.currency, 
          unit: 'day' 
        },
        amenities: venue.amenities,
        categories: ['conference'],
        images: venue.images || ['https://via.placeholder.com/800x400?text=Venue'],
        provider: 'SimplyBook.me',
        availability: venue.availability,
        contact: venue.contact
      };

      res.json({
        success: true,
        data: transformedVenue
      });
      return;
    }

    // Fallback to mock data
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
    
    // Check if SimplyBook.me is configured
    const venueService = getSimplyBookVenueService();
    const useSimplyBook = isSimplyBookConfigured() && venueService;
    
    logger.info('Creating booking', { 
      contact: contact?.email, 
      venueId: details?.venueId,
      provider: useSimplyBook ? 'simplybook' : 'mock',
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

    if (useSimplyBook) {
      // Use SimplyBook.me API for real booking
      const bookingRequest = {
        venueId: details.venueId,
        datetime: details.datetime || new Date(Date.now() + 86400000).toISOString(), // Tomorrow if not specified
        client: {
          name: contact.name,
          email: contact.email,
          phone: contact.phone || 'Not provided'
        },
        eventDetails: {
          type: details.eventType,
          capacity: details.capacity,
          duration: details.duration || 8, // Default 8 hours
          requirements: details.requirements
        }
      };

      const bookingResult = await venueService!.createBooking(bookingRequest);

      // Transform to API response format
      const booking = {
        bookingId: bookingResult.bookingId,
        bookingHash: bookingResult.bookingHash,
        status: bookingResult.status,
        venue: {
          id: bookingResult.venue.id,
          name: bookingResult.venue.name,
          location: {
            address: `${bookingResult.venue.location} Venue`,
            city: bookingResult.venue.location,
            country: 'Spain'
          }
        },
        contact: bookingResult.client,
        details: {
          ...details,
          datetime: bookingResult.datetime
        },
        pricing: {
          basePrice: bookingResult.totalPrice || 0,
          totalPrice: bookingResult.totalPrice || 0,
          currency: bookingResult.currency || 'EUR',
          breakdown: [
            { item: 'Venue rental', amount: bookingResult.totalPrice || 0 }
          ]
        },
        nextSteps: [
          'Booking confirmed with venue provider',
          'You will receive confirmation email shortly',
          'Venue contact details provided below'
        ],
        metadata: {
          createdAt: new Date().toISOString(),
          provider: 'simplybook',
          reference: bookingResult.bookingHash,
          source: 'api',
          realtime: true
        }
      };

      res.json({
        success: true,
        data: booking
      });
      return;
    }

    // Fallback to mock booking when SimplyBook.me is not configured
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

    // Create mock booking
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