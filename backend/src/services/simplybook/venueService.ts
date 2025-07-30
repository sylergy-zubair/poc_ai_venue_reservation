import { SimplyBookClient, SimplyBookService, SimplyBookUnit, SimplyBookBookingData } from './client';
import { ExtractedEntities } from '../../types';
import logger from '../../utils/logger';

export interface Venue {
  id: string;
  name: string;
  location: string;
  capacity: number;
  pricePerHour: number;
  currency: string;
  amenities: string[];
  description?: string;
  availability: {
    date: string;
    timeSlots: string[];
  }[];
  images?: string[];
  contact?: {
    email?: string;
    phone?: string;
  };
  // SimplyBook specific fields
  simplybook: {
    serviceId: number;
    unitId: number;
    service: SimplyBookService;
    unit: SimplyBookUnit;
  };
}

export interface VenueSearchParams {
  location?: string;
  capacity?: number;
  date?: Date;
  eventType?: string;
  budget?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  amenities?: string[];
}

export interface BookingRequest {
  venueId: string;
  datetime: string;
  client: {
    name: string;
    email: string;
    phone: string;
  };
  eventDetails?: {
    type?: string;
    capacity?: number;
    duration?: number;
    requirements?: string;
  };
}

export interface BookingResponse {
  bookingId: string;
  bookingHash: string;
  status: 'confirmed' | 'pending' | 'failed';
  venue: Venue;
  datetime: string;
  client: {
    id?: number;
    name: string;
    email: string;
    phone: string;
  };
  totalPrice?: number;
  currency?: string;
}

/**
 * Venue service that integrates SimplyBook.me API with our venue booking system
 */
export class SimplyBookVenueService {
  private client: SimplyBookClient;
  private cachedServices?: SimplyBookService[];
  private cachedUnits?: SimplyBookUnit[];
  private cacheExpiry?: Date;
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  constructor(client: SimplyBookClient) {
    this.client = client;
  }

  /**
   * Search for venues based on extracted entities and filters
   */
  async searchVenues(params: VenueSearchParams): Promise<Venue[]> {
    logger.info('Searching venues with SimplyBook', {
      location: params.location,
      capacity: params.capacity,
      date: params.date?.toISOString(),
      eventType: params.eventType,
    });

    try {
      // Get services and units from SimplyBook
      const [services, units] = await Promise.all([
        this.getServices(),
        this.getUnits(),
      ]);

      // Transform SimplyBook data to our venue format
      const venues = await this.transformToVenues(services, units, params);

      // Filter venues based on search criteria
      const filteredVenues = this.filterVenues(venues, params);

      // If date is specified, check availability
      if (params.date) {
        const venuesWithAvailability = await this.checkAvailability(
          filteredVenues,
          params.date
        );
        
        logger.info('Venue search completed with availability check', {
          totalVenues: venues.length,
          filteredVenues: venuesWithAvailability.length,
          searchDate: params.date.toISOString(),
        });
        
        return venuesWithAvailability;
      }

      logger.info('Venue search completed', {
        totalVenues: venues.length,
        filteredVenues: filteredVenues.length,
      });

      return filteredVenues;
    } catch (error) {
      logger.error('Venue search failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        params,
      });
      throw error;
    }
  }

  /**
   * Create a booking for a specific venue
   */
  async createBooking(request: BookingRequest): Promise<BookingResponse> {
    logger.info('Creating venue booking', {
      venueId: request.venueId,
      datetime: request.datetime,
      clientEmail: request.client.email,
    });

    try {
      // Find the venue details
      const venue = await this.getVenueById(request.venueId);
      if (!venue) {
        throw new Error(`Venue not found: ${request.venueId}`);
      }

      // Prepare booking data for SimplyBook
      const bookingData: SimplyBookBookingData = {
        event_id: venue.simplybook.serviceId,
        unit_id: venue.simplybook.unitId,
        datetime: request.datetime,
        client: request.client,
        additional_fields: {
          event_type: request.eventDetails?.type,
          expected_capacity: request.eventDetails?.capacity,
          duration_hours: request.eventDetails?.duration,
          special_requirements: request.eventDetails?.requirements,
        },
      };

      // Create booking via SimplyBook API
      const simplybookResult = await this.client.createBooking(bookingData);

      // Transform to our booking response format
      const bookingResponse: BookingResponse = {
        bookingId: simplybookResult.booking_id.toString(),
        bookingHash: simplybookResult.booking_hash,
        status: simplybookResult.status === 'confirmed' ? 'confirmed' : 'pending',
        venue,
        datetime: request.datetime,
        client: {
          id: simplybookResult.client.id,
          name: simplybookResult.client.name,
          email: simplybookResult.client.email,
          phone: simplybookResult.client.phone,
        },
        totalPrice: venue.pricePerHour * (request.eventDetails?.duration || 1),
        currency: venue.currency,
      };

      logger.info('Venue booking created successfully', {
        bookingId: bookingResponse.bookingId,
        venueId: request.venueId,
        status: bookingResponse.status,
      });

      return bookingResponse;
    } catch (error) {
      logger.error('Failed to create venue booking', {
        venueId: request.venueId,
        datetime: request.datetime,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get venue by ID
   */
  async getVenueById(venueId: string): Promise<Venue | null> {
    try {
      const [serviceId, unitId] = venueId.split('-').map(Number);
      if (!serviceId || !unitId) {
        return null;
      }

      const [services, units] = await Promise.all([
        this.getServices(),
        this.getUnits(),
      ]);

      const service = services.find(s => s.id === serviceId);
      const unit = units.find(u => u.id === unitId);

      if (!service || !unit) {
        return null;
      }

      return this.createVenueFromServiceAndUnit(service, unit);
    } catch (error) {
      logger.error('Failed to get venue by ID', {
        venueId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Get services with caching
   */
  private async getServices(): Promise<SimplyBookService[]> {
    if (this.cachedServices && this.cacheExpiry && new Date() < this.cacheExpiry) {
      return this.cachedServices;
    }

    this.cachedServices = await this.client.getServices();
    this.cacheExpiry = new Date(Date.now() + this.CACHE_TTL);
    
    return this.cachedServices;
  }

  /**
   * Get units with caching
   */
  private async getUnits(): Promise<SimplyBookUnit[]> {
    if (this.cachedUnits && this.cacheExpiry && new Date() < this.cacheExpiry) {
      return this.cachedUnits;
    }

    this.cachedUnits = await this.client.getUnits();
    
    return this.cachedUnits;
  }

  /**
   * Transform SimplyBook services and units to our venue format
   */
  private async transformToVenues(
    services: SimplyBookService[],
    units: SimplyBookUnit[],
    params: VenueSearchParams
  ): Promise<Venue[]> {
    const venues: Venue[] = [];

    // Create venue combinations (service + unit)
    for (const service of services) {
      for (const unit of units) {
        const venue = this.createVenueFromServiceAndUnit(service, unit);
        venues.push(venue);
      }
    }

    return venues;
  }

  /**
   * Create venue object from SimplyBook service and unit
   */
  private createVenueFromServiceAndUnit(
    service: SimplyBookService,
    unit: SimplyBookUnit
  ): Venue {
    // Extract location from unit name or use a default
    const location = this.extractLocationFromUnit(unit);
    
    // Estimate capacity based on service name/description
    const capacity = this.estimateCapacityFromService(service);
    
    // Get amenities from service description
    const amenities = this.extractAmenitiesFromService(service);

    return {
      id: `${service.id}-${unit.id}`,
      name: `${service.name} at ${unit.name}`,
      location,
      capacity,
      pricePerHour: service.price || 100, // Default price if not specified
      currency: service.currency || 'EUR',
      amenities,
      description: service.description || `${service.name} venue provided by ${unit.name}`,
      availability: [], // Will be populated by checkAvailability
      contact: {
        email: unit.email,
        phone: unit.phone,
      },
      simplybook: {
        serviceId: service.id,
        unitId: unit.id,
        service,
        unit,
      },
    };
  }

  /**
   * Extract location from unit information
   */
  private extractLocationFromUnit(unit: SimplyBookUnit): string {
    // Try to extract location from unit name
    const locationKeywords = ['madrid', 'barcelona', 'lisbon', 'valencia', 'seville'];
    const unitNameLower = unit.name.toLowerCase();
    
    for (const keyword of locationKeywords) {
      if (unitNameLower.includes(keyword)) {
        return keyword.charAt(0).toUpperCase() + keyword.slice(1);
      }
    }
    
    // Default location
    return 'Madrid';
  }

  /**
   * Estimate capacity from service information
   */
  private estimateCapacityFromService(service: SimplyBookService): number {
    const name = service.name.toLowerCase();
    const description = (service.description || '').toLowerCase();
    const combined = `${name} ${description}`;
    
    // Extract numbers that might indicate capacity
    const capacityMatch = combined.match(/(\d+)\s*(?:people|persons|guests|pax|capacity|seats)/);
    if (capacityMatch) {
      return parseInt(capacityMatch[1]);
    }
    
    // Estimate based on keywords
    if (combined.includes('conference') || combined.includes('meeting')) {
      return 50;
    }
    if (combined.includes('small') || combined.includes('intimate')) {
      return 20;
    }
    if (combined.includes('large') || combined.includes('big')) {
      return 200;
    }
    if (combined.includes('wedding') || combined.includes('banquet')) {
      return 150;
    }
    
    // Default capacity
    return 100;
  }

  /**
   * Extract amenities from service information
   */
  private extractAmenitiesFromService(service: SimplyBookService): string[] {
    const amenities: string[] = [];
    const text = `${service.name} ${service.description || ''}`.toLowerCase();
    
    const amenityMappings = {
      'wifi': 'WiFi',
      'internet': 'WiFi',
      'projector': 'Projector',
      'av equipment': 'AV Equipment',
      'audio': 'Sound System',
      'microphone': 'Microphone',
      'parking': 'Parking',
      'catering': 'Catering',
      'food': 'Catering',
      'air conditioning': 'Air Conditioning',
      'heating': 'Heating',
      'wheelchair': 'Wheelchair Accessible',
    };
    
    for (const [keyword, amenity] of Object.entries(amenityMappings)) {
      if (text.includes(keyword)) {
        amenities.push(amenity);
      }
    }
    
    // Default amenities for venue types
    amenities.push('WiFi', 'Air Conditioning');
    
    return [...new Set(amenities)]; // Remove duplicates
  }

  /**
   * Filter venues based on search criteria
   */
  private filterVenues(venues: Venue[], params: VenueSearchParams): Venue[] {
    return venues.filter(venue => {
      // Location filter
      if (params.location) {
        const locationMatch = venue.location.toLowerCase().includes(params.location.toLowerCase()) ||
                             venue.name.toLowerCase().includes(params.location.toLowerCase());
        if (!locationMatch) return false;
      }
      
      // Capacity filter
      if (params.capacity) {
        if (venue.capacity < params.capacity) return false;
      }
      
      // Budget filter
      if (params.budget) {
        if (params.budget.min && venue.pricePerHour < params.budget.min) return false;
        if (params.budget.max && venue.pricePerHour > params.budget.max) return false;
      }
      
      // Amenities filter
      if (params.amenities && params.amenities.length > 0) {
        const hasRequiredAmenities = params.amenities.some(amenity =>
          venue.amenities.some(venueAmenity =>
            venueAmenity.toLowerCase().includes(amenity.toLowerCase())
          )
        );
        if (!hasRequiredAmenities) return false;
      }
      
      return true;
    });
  }

  /**
   * Check availability for venues on a specific date
   */
  private async checkAvailability(venues: Venue[], date: Date): Promise<Venue[]> {
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    const venuesWithAvailability: Venue[] = [];
    
    for (const venue of venues) {
      try {
        const timeSlots = await this.client.getAvailableTimeSlots(
          venue.simplybook.serviceId,
          venue.simplybook.unitId,
          dateStr
        );
        
        if (timeSlots.length > 0) {
          venue.availability = [{
            date: dateStr,
            timeSlots: timeSlots.map(slot => slot.time),
          }];
          venuesWithAvailability.push(venue);
        }
      } catch (error) {
        logger.warn('Failed to check availability for venue', {
          venueId: venue.id,
          date: dateStr,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        // Include venue even if availability check fails
        venue.availability = [{
          date: dateStr,
          timeSlots: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'], // Default slots
        }];
        venuesWithAvailability.push(venue);
      }
    }
    
    return venuesWithAvailability;
  }

  /**
   * Health check for the venue service
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      const clientHealth = await this.client.healthCheck();
      const [services, units] = await Promise.all([
        this.getServices(),
        this.getUnits(),
      ]);
      
      return {
        status: clientHealth.status,
        details: {
          ...clientHealth.details,
          servicesCount: services.length,
          unitsCount: units.length,
          cacheValid: !!(this.cacheExpiry && new Date() < this.cacheExpiry),
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          venue_service: 'failed',
        },
      };
    }
  }
}

// Export factory function
export function createSimplyBookVenueService(client: SimplyBookClient): SimplyBookVenueService {
  return new SimplyBookVenueService(client);
}