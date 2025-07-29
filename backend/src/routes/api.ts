import express from 'express';
import { extractEntities } from '@/services/ollama/entityExtraction';
import logger from '@/utils/logger';

const router = express.Router();

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
    const { filters } = req.body;
    
    logger.info('Searching venues', { filters, requestId: req.requestId });

    // Mock venue data for proof of concept
    const mockVenues = [
      {
        id: "venue-1",
        name: "Madrid Convention Center",
        description: "Large conference facility in the heart of Madrid",
        images: ["/images/venue1.jpg"],
        location: {
          address: "Calle de Alcalá 123",
          city: "Madrid",
          country: "Spain",
          coordinates: { lat: 40.4168, lng: -3.7038 }
        },
        capacity: {
          min: 50,
          max: 500,
          recommended: 300,
          theater: 500
        },
        amenities: [
          { id: "1", name: "WiFi", category: "tech", included: true },
          { id: "2", name: "A/V Equipment", category: "tech", included: true },
          { id: "3", name: "Parking", category: "parking", included: true }
        ],
        pricing: {
          basePrice: 200,
          currency: "EUR",
          unit: "hour"
        },
        rating: 4.5,
        reviewCount: 25,
        categories: ["conference", "meeting"],
        features: ["parking", "catering"],
        provider: {
          id: "provider-1",
          name: "VenueProvider Madrid"
        },
        metadata: {
          createdAt: "2024-01-01",
          updatedAt: "2024-01-01",
          verified: true,
          featured: false
        }
      },
      {
        id: "venue-2",
        name: "Barcelona Business Hub",
        description: "Modern meeting space with excellent connectivity",
        images: ["/images/venue2.jpg"],
        location: {
          address: "Passeig de Gràcia 456",
          city: "Barcelona",
          country: "Spain",
          coordinates: { lat: 41.3851, lng: 2.1734 }
        },
        capacity: {
          min: 20,
          max: 150,
          recommended: 100,
          theater: 150
        },
        amenities: [
          { id: "1", name: "WiFi", category: "tech", included: true },
          { id: "2", name: "Video Conference", category: "tech", included: true }
        ],
        pricing: {
          basePrice: 150,
          currency: "EUR",
          unit: "hour"
        },
        rating: 4.8,
        reviewCount: 42,
        categories: ["business", "meeting"],
        features: ["wifi", "video"],
        provider: {
          id: "provider-2",
          name: "VenueProvider Barcelona"
        },
        metadata: {
          createdAt: "2024-01-01",
          updatedAt: "2024-01-01",
          verified: true,
          featured: true
        }
      }
    ];

    // Simple filtering logic
    let filteredVenues = mockVenues;

    if (filters.location) {
      filteredVenues = filteredVenues.filter(venue => 
        venue.location.city.toLowerCase().includes(filters.location.toLowerCase()) ||
        venue.location.country.toLowerCase().includes(filters.location.toLowerCase())
      );
    }

    if (filters.capacity?.min) {
      filteredVenues = filteredVenues.filter(venue => 
        venue.capacity.max >= filters.capacity.min
      );
    }

    if (filters.eventType) {
      filteredVenues = filteredVenues.filter(venue => 
        venue.categories.includes(filters.eventType)
      );
    }

    res.json({
      success: true,
      data: {
        venues: filteredVenues,
        totalCount: filteredVenues.length,
        page: 1,
        limit: 20,
        hasMore: false,
        filters,
        metadata: {
          searchTime: 150,
          query: filters.query,
          sessionId: req.requestId
        }
      }
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

// Booking endpoint
router.post('/venues/book', async (req, res) => {
  try {
    const { contact, details } = req.body;
    
    logger.info('Creating booking', { contact, details, requestId: req.requestId });

    // Mock booking response
    const bookingResponse = {
      bookingId: `booking_${Date.now()}`,
      status: 'pending',
      venue: {
        id: details.venueId,
        name: "Madrid Convention Center"
      },
      details,
      contact,
      totalPrice: 800,
      currency: "EUR",
      confirmationDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      nextSteps: [
        "Venue provider will contact you within 24 hours",
        "Confirm booking details and payment",
        "Receive final confirmation"
      ],
      metadata: {
        createdAt: new Date().toISOString(),
        provider: "VenueProvider Madrid",
        reference: `REF_${Date.now()}`
      }
    };

    res.json({
      success: true,
      data: bookingResponse
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