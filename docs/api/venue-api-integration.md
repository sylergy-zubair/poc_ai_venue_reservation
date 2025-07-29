# Venue API Integration Guide

## Overview

This guide provides comprehensive instructions for integrating with third-party venue booking APIs. It covers multi-provider architecture, data normalization, error handling, and best practices for maintaining reliable venue search and booking functionality.

## Multi-Provider Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Venue Booking System                    │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Venue Aggregation Service              │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │ │
│  │  │   Router    │  │   Normalizer│  │ Load Balance│  │ │
│  │  │   & Filter  │  │   & Mapper  │  │   & Cache   │  │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  │ │
│  └─────────────────────────────────────────────────────────┘ │
│                              │                               │
│      ┌───────────────────────┼───────────────────────┐       │
│      │                       │                       │       │
│  ┌───▼────┐            ┌─────▼─────┐          ┌──────▼──┐    │
│  │Provider│            │ Provider  │          │Provider │    │
│  │   A    │            │     B     │          │    C    │    │
│  │Adapter │            │ Adapter   │          │ Adapter │    │
│  └────────┘            └───────────┘          └─────────┘    │
└─────┼─────────────────────────┼─────────────────────┼────────┘
      │                         │                     │
┌─────▼────┐            ┌───────▼─────┐        ┌──────▼─────┐
│ Venue    │            │   iVvy      │        │ EventUp    │
│ Package  │            │   API       │        │   API      │
│ API      │            └─────────────┘        └────────────┘
└──────────┘
```

## Provider Abstraction Layer

### Base Provider Interface

```typescript
// interfaces/VenueProvider.ts
export interface VenueProvider {
  readonly name: string;
  readonly version: string;
  readonly capabilities: ProviderCapabilities;
  
  // Core search functionality
  searchVenues(criteria: VenueSearchCriteria): Promise<VenueSearchResponse>;
  getVenueDetails(venueId: string): Promise<VenueDetails>;
  checkAvailability(venueId: string, date: Date, duration: number): Promise<AvailabilityResponse>;
  
  // Booking functionality
  createBooking(request: BookingRequest): Promise<BookingResponse>;
  cancelBooking(bookingId: string): Promise<CancellationResponse>;
  getBookingStatus(bookingId: string): Promise<BookingStatus>;
  
  // Provider management
  healthCheck(): Promise<ProviderHealthStatus>;
  getRateLimits(): RateLimitInfo;
  authenticate(): Promise<AuthenticationResult>;
}

export interface ProviderCapabilities {
  supportsRealTimeAvailability: boolean;
  supportsInstantBooking: boolean;
  supportsCancellation: boolean;
  supportsModification: boolean;
  maxSearchRadius: number; // in kilometers
  maxCapacity: number;
  supportedAmenities: string[];
  supportedEventTypes: string[];
  supportedCurrencies: string[];
}

export interface VenueSearchCriteria {
  location: LocationCriteria;
  dateRange: DateRange;
  capacity: CapacityCriteria;
  eventType?: string;
  amenities?: string[];
  budget?: BudgetRange;
  duration?: number; // hours
  searchRadius?: number; // kilometers
}

export interface LocationCriteria {
  city?: string;
  region?: string;
  country?: string;
  coordinates?: {
    lat: number;
    lng: number;
    radius?: number;
  };
  address?: string;
}

export interface DateRange {
  from: Date;
  to: Date;
  flexibility?: number; // days
}

export interface CapacityCriteria {
  min?: number;
  max?: number;
  preferred?: number;
}

export interface BudgetRange {
  min?: number;
  max?: number;
  currency: string;
}
```

### Venue Data Models

```typescript
// models/Venue.ts
export interface Venue {
  // Unique identifier
  id: string;
  providerId: string;
  providerName: string;
  
  // Basic information
  name: string;
  description: string;
  category: VenueCategory;
  
  // Location information
  location: VenueLocation;
  
  // Capacity information
  capacity: VenueCapacity;
  
  // Pricing information
  pricing: VenuePricing;
  
  // Amenities and features
  amenities: VenueAmenity[];
  features: VenueFeature[];
  
  // Media
  images: VenueImages;
  virtualTour?: string;
  
  // Availability
  availability: VenueAvailability;
  
  // Reviews and ratings
  rating: VenueRating;
  
  // Contact information
  contact: VenueContact;
  
  // Policies
  policies: VenuePolicies;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  verified: boolean;
}

export interface VenueLocation {
  address: string;
  street?: string;
  city: string;
  region?: string;
  postalCode?: string;
  country: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  timezone?: string;
  accessibility?: AccessibilityInfo;
}

export interface VenueCapacity {
  min: number;
  max: number;
  recommended: number;
  configurations: CapacityConfiguration[];
}

export interface CapacityConfiguration {
  name: string; // e.g., "Theater", "Classroom", "Reception"
  capacity: number;
  description?: string;
}

export interface VenuePricing {
  currency: string;
  hourly?: number;
  daily?: number;
  weekly?: number;
  minimumSpend?: number;
  additionalFees: AdditionalFee[];
  pricingTiers?: PricingTier[];
  seasonalPricing?: SeasonalPricing[];
}

export interface AdditionalFee {
  name: string;
  amount: number;
  type: 'fixed' | 'percentage';
  mandatory: boolean;
  description?: string;
}
```

## Provider Implementations

### MeetingPackage Provider

```typescript
// providers/MeetingPackageProvider.ts
export class MeetingPackageProvider implements VenueProvider {
  readonly name = 'MeetingPackage';
  readonly version = '2.0';
  readonly capabilities: ProviderCapabilities = {
    supportsRealTimeAvailability: true,
    supportsInstantBooking: false,
    supportsCancellation: true,
    supportsModification: true,
    maxSearchRadius: 50,
    maxCapacity: 10000,
    supportedAmenities: [
      'wifi', 'av_equipment', 'parking', 'catering', 'air_conditioning',
      'wheelchair_accessible', 'natural_light', 'outdoor_space'
    ],
    supportedEventTypes: [
      'conference', 'meeting', 'seminar', 'training', 'workshop'
    ],
    supportedCurrencies: ['EUR', 'USD', 'GBP']
  };

  private client: MeetingPackageClient;
  private mapper: MeetingPackageMapper;
  private rateLimiter: RateLimiter;

  constructor(apiKey: string, baseUrl?: string) {
    this.client = new MeetingPackageClient(apiKey, baseUrl);
    this.mapper = new MeetingPackageMapper();
    this.rateLimiter = new RateLimiter(100, 60000); // 100 requests per minute
  }

  async searchVenues(criteria: VenueSearchCriteria): Promise<VenueSearchResponse> {
    await this.rateLimiter.checkLimit('search');

    try {
      // Map our criteria to MeetingPackage API format
      const apiRequest = this.mapper.mapSearchCriteria(criteria);
      
      // Make API request
      const response = await this.client.post('/venues/search', apiRequest);
      
      // Map response back to our format
      const venues = response.data.venues.map(venue => 
        this.mapper.mapVenueFromAPI(venue)
      );

      return {
        venues,
        totalCount: response.data.totalCount,
        hasMore: response.data.hasMore,
        nextPageToken: response.data.nextPageToken,
        searchId: response.data.searchId,
        searchTime: response.data.searchTime,
        provider: this.name
      };
    } catch (error) {
      throw this.handleApiError(error);
    }
  }

  async getVenueDetails(venueId: string): Promise<VenueDetails> {
    await this.rateLimiter.checkLimit('details');

    try {
      const response = await this.client.get(`/venues/${venueId}`);
      return this.mapper.mapVenueDetailsFromAPI(response.data);
    } catch (error) {
      throw this.handleApiError(error);
    }
  }

  async checkAvailability(
    venueId: string, 
    date: Date, 
    duration: number
  ): Promise<AvailabilityResponse> {
    await this.rateLimiter.checkLimit('availability');

    try {
      const response = await this.client.get(`/venues/${venueId}/availability`, {
        params: {
          date: date.toISOString().split('T')[0],
          duration: duration
        }
      });

      return this.mapper.mapAvailabilityFromAPI(response.data);
    } catch (error) {
      throw this.handleApiError(error);
    }
  }

  async createBooking(request: BookingRequest): Promise<BookingResponse> {
    await this.rateLimiter.checkLimit('booking');

    try {
      const apiRequest = this.mapper.mapBookingRequest(request);
      const response = await this.client.post('/bookings', apiRequest);
      
      return this.mapper.mapBookingResponse(response.data);
    } catch (error) {
      throw this.handleApiError(error);
    }
  }

  async healthCheck(): Promise<ProviderHealthStatus> {
    try {
      const startTime = Date.now();
      const response = await this.client.get('/health');
      const responseTime = Date.now() - startTime;

      return {
        provider: this.name,
        status: response.status === 200 ? 'healthy' : 'unhealthy',
        responseTime,
        lastChecked: new Date(),
        details: response.data
      };
    } catch (error) {
      return {
        provider: this.name,
        status: 'unhealthy',
        responseTime: 0,
        lastChecked: new Date(),
        error: error.message
      };
    }
  }

  private handleApiError(error: any): VenueProviderError {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || error.message;

      switch (status) {
        case 400:
          return new VenueValidationError(message);
        case 401:
          return new VenueAuthenticationError('Invalid API credentials');
        case 403:
          return new VenueAuthorizationError('Insufficient permissions');
        case 404:
          return new VenueNotFoundError('Venue not found');
        case 429:
          return new VenueRateLimitError('Rate limit exceeded', error.response.headers['retry-after']);
        case 500:
        case 502:
        case 503:
        case 504:
          return new VenueServiceError('Provider service unavailable');
        default:
          return new VenueProviderError(`Provider error: ${message}`);
      }
    }

    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return new VenueServiceError('Provider service unavailable');
    }

    return new VenueProviderError(error.message);
  }
}
```

### Data Mapping Layer

```typescript
// providers/mappers/MeetingPackageMapper.ts
export class MeetingPackageMapper {
  mapSearchCriteria(criteria: VenueSearchCriteria): any {
    const apiRequest: any = {};

    // Location mapping
    if (criteria.location.city) {
      apiRequest.city = criteria.location.city;
    }
    
    if (criteria.location.coordinates) {
      apiRequest.latitude = criteria.location.coordinates.lat;
      apiRequest.longitude = criteria.location.coordinates.lng;
      apiRequest.radius = criteria.location.coordinates.radius || 10;
    }

    // Date mapping
    if (criteria.dateRange) {
      apiRequest.dateFrom = criteria.dateRange.from.toISOString().split('T')[0];
      apiRequest.dateTo = criteria.dateRange.to.toISOString().split('T')[0];
    }

    // Capacity mapping
    if (criteria.capacity) {
      if (criteria.capacity.min) apiRequest.minCapacity = criteria.capacity.min;
      if (criteria.capacity.max) apiRequest.maxCapacity = criteria.capacity.max;
      if (criteria.capacity.preferred) apiRequest.preferredCapacity = criteria.capacity.preferred;
    }

    // Event type mapping
    if (criteria.eventType) {
      apiRequest.eventType = this.mapEventType(criteria.eventType);
    }

    // Amenities mapping
    if (criteria.amenities && criteria.amenities.length > 0) {
      apiRequest.amenities = criteria.amenities.map(a => this.mapAmenity(a));
    }

    // Budget mapping
    if (criteria.budget) {
      apiRequest.minPrice = criteria.budget.min;
      apiRequest.maxPrice = criteria.budget.max;
      apiRequest.currency = criteria.budget.currency;
    }

    return apiRequest;
  }

  mapVenueFromAPI(apiVenue: any): Venue {
    return {
      id: `mp_${apiVenue.id}`,
      providerId: apiVenue.id.toString(),
      providerName: 'MeetingPackage',
      
      name: apiVenue.name,
      description: apiVenue.description || '',
      category: this.mapVenueCategory(apiVenue.category),
      
      location: {
        address: apiVenue.address?.full || '',
        street: apiVenue.address?.street,
        city: apiVenue.address?.city || '',
        region: apiVenue.address?.region,
        postalCode: apiVenue.address?.postalCode,
        country: apiVenue.address?.country || '',
        coordinates: {
          lat: apiVenue.coordinates?.latitude || 0,
          lng: apiVenue.coordinates?.longitude || 0
        },
        timezone: apiVenue.timezone,
        accessibility: this.mapAccessibility(apiVenue.accessibility)
      },
      
      capacity: {
        min: apiVenue.capacity?.min || 1,
        max: apiVenue.capacity?.max || 1000,
        recommended: apiVenue.capacity?.recommended || 
                    Math.floor((apiVenue.capacity?.min + apiVenue.capacity?.max) / 2),
        configurations: this.mapCapacityConfigurations(apiVenue.configurations)
      },
      
      pricing: {
        currency: apiVenue.pricing?.currency || 'EUR',
        hourly: apiVenue.pricing?.hourly,
        daily: apiVenue.pricing?.daily,
        minimumSpend: apiVenue.pricing?.minimumSpend,
        additionalFees: this.mapAdditionalFees(apiVenue.pricing?.additionalFees || []),
        pricingTiers: this.mapPricingTiers(apiVenue.pricing?.tiers || [])
      },
      
      amenities: this.mapAmenities(apiVenue.amenities || []),
      features: this.mapFeatures(apiVenue.features || []),
      
      images: {
        thumbnail: apiVenue.images?.thumbnail || '',
        gallery: apiVenue.images?.gallery || [],
        floorPlans: apiVenue.images?.floorPlans || []
      },
      
      virtualTour: apiVenue.virtualTour,
      
      availability: this.mapAvailability(apiVenue.availability),
      
      rating: {
        average: apiVenue.rating?.average || 0,
        reviewCount: apiVenue.rating?.reviewCount || 0,
        distribution: apiVenue.rating?.distribution || {}
      },
      
      contact: {
        name: apiVenue.contact?.name,
        phone: apiVenue.contact?.phone,
        email: apiVenue.contact?.email,
        website: apiVenue.contact?.website
      },
      
      policies: {
        cancellation: apiVenue.policies?.cancellation || 'Standard cancellation policy',
        catering: apiVenue.policies?.catering !== false,
        alcohol: apiVenue.policies?.alcohol !== false,
        smoking: apiVenue.policies?.smoking === true,
        parking: apiVenue.policies?.parking !== false
      },
      
      createdAt: new Date(apiVenue.createdAt || Date.now()),
      updatedAt: new Date(apiVenue.updatedAt || Date.now()),
      verified: apiVenue.verified === true
    };
  }

  private mapEventType(eventType: string): string {
    const eventTypeMap: Record<string, string> = {
      'conference': 'conference',
      'meeting': 'meeting',
      'seminar': 'seminar',
      'training': 'training',
      'workshop': 'workshop',
      'corporate': 'meeting',
      'business': 'meeting'
    };
    
    return eventTypeMap[eventType.toLowerCase()] || 'meeting';
  }

  private mapAmenity(amenity: string): string {
    const amenityMap: Record<string, string> = {
      'wifi': 'wifi',
      'av_equipment': 'audio_visual',
      'parking': 'parking',
      'catering': 'catering_available',
      'air_conditioning': 'air_conditioning',
      'wheelchair_accessible': 'wheelchair_access',
      'natural_light': 'natural_light',
      'outdoor_space': 'outdoor_area'
    };
    
    return amenityMap[amenity] || amenity;
  }

  private mapVenueCategory(category: string): VenueCategory {
    switch (category?.toLowerCase()) {
      case 'hotel':
        return VenueCategory.HOTEL;
      case 'conference_center':
        return VenueCategory.CONFERENCE_CENTER;
      case 'restaurant':
        return VenueCategory.RESTAURANT;
      case 'unique_venue':
        return VenueCategory.UNIQUE_VENUE;
      default:
        return VenueCategory.BUSINESS_CENTER;
    }
  }

  private mapCapacityConfigurations(configurations: any[] = []): CapacityConfiguration[] {
    return configurations.map(config => ({
      name: config.name,
      capacity: config.capacity,
      description: config.description
    }));
  }

  private mapAdditionalFees(fees: any[]): AdditionalFee[] {
    return fees.map(fee => ({
      name: fee.name,
      amount: fee.amount,
      type: fee.type === 'percentage' ? 'percentage' : 'fixed',
      mandatory: fee.mandatory === true,
      description: fee.description
    }));
  }

  private mapAmenities(amenities: any[]): VenueAmenity[] {
    return amenities.map(amenity => ({
      id: amenity.id,
      name: amenity.name,
      category: amenity.category || 'general',
      included: amenity.included !== false,
      additionalCost: amenity.additionalCost || 0
    }));
  }

  mapBookingRequest(request: BookingRequest): any {
    return {
      venueId: request.venueId.replace('mp_', ''), // Remove our prefix
      startDate: request.startDate.toISOString(),
      endDate: request.endDate.toISOString(),
      attendeeCount: request.attendeeCount,
      eventType: this.mapEventType(request.eventType || 'meeting'),
      
      primaryContact: {
        firstName: request.contactInfo.firstName,
        lastName: request.contactInfo.lastName,
        email: request.contactInfo.email,
        phone: request.contactInfo.phone,
        company: request.contactInfo.company,
        title: request.contactInfo.title
      },
      
      requirements: {
        catering: request.requirements?.catering,
        equipment: request.requirements?.equipment,
        setup: request.requirements?.setup,
        specialRequests: request.requirements?.specialRequests
      },
      
      billing: request.billingInfo ? {
        address: request.billingInfo.address,
        taxId: request.billingInfo.taxId,
        purchaseOrder: request.billingInfo.purchaseOrder
      } : undefined
    };
  }

  mapBookingResponse(apiResponse: any): BookingResponse {
    return {
      bookingId: `mp_${apiResponse.id}`,
      status: this.mapBookingStatus(apiResponse.status),
      confirmationCode: apiResponse.confirmationCode,
      
      venue: {
        id: `mp_${apiResponse.venue.id}`,
        name: apiResponse.venue.name,
        address: apiResponse.venue.address?.full || ''
      },
      
      booking: {
        startDate: new Date(apiResponse.startDate),
        endDate: new Date(apiResponse.endDate),
        duration: apiResponse.duration,
        attendeeCount: apiResponse.attendeeCount,
        eventType: apiResponse.eventType
      },
      
      pricing: {
        subtotal: apiResponse.pricing.subtotal,
        taxes: apiResponse.pricing.taxes,
        fees: apiResponse.pricing.fees,
        total: apiResponse.pricing.total,
        currency: apiResponse.pricing.currency,
        breakdown: apiResponse.pricing.breakdown
      },
      
      contact: {
        primaryContact: `${apiResponse.primaryContact.firstName} ${apiResponse.primaryContact.lastName}`,
        email: apiResponse.primaryContact.email,
        phone: apiResponse.primaryContact.phone
      },
      
      nextSteps: apiResponse.nextSteps || [],
      
      documents: {
        contract: apiResponse.documents?.contract,
        invoice: apiResponse.documents?.invoice,
        receipt: apiResponse.documents?.receipt
      },
      
      metadata: {
        bookedAt: new Date(apiResponse.createdAt),
        processingTime: apiResponse.processingTime || 0,
        provider: 'MeetingPackage',
        providerBookingId: apiResponse.id
      }
    };
  }

  private mapBookingStatus(status: string): BookingStatus {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return BookingStatus.CONFIRMED;
      case 'pending':
        return BookingStatus.PENDING;
      case 'cancelled':
        return BookingStatus.CANCELLED;
      case 'declined':
        return BookingStatus.DECLINED;
      default:
        return BookingStatus.PENDING;
    }
  }
}
```

## Aggregation and Load Balancing

### Venue Aggregation Service

```typescript
// services/VenueAggregationService.ts
export class VenueAggregationService {
  private providers: Map<string, VenueProvider> = new Map();
  private loadBalancer: LoadBalancer;
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private resultMerger: ResultMerger;
  private healthChecker: ProviderHealthChecker;

  constructor() {
    this.loadBalancer = new LoadBalancer();
    this.resultMerger = new ResultMerger();
    this.healthChecker = new ProviderHealthChecker();
    
    this.setupProviders();
    this.startHealthChecking();
  }

  private setupProviders(): void {
    // Register providers
    if (process.env.MEETINGPACKAGE_API_KEY) {
      const provider = new MeetingPackageProvider(process.env.MEETINGPACKAGE_API_KEY);
      this.registerProvider(provider);
    }
    
    if (process.env.IVVY_API_KEY) {
      const provider = new IvvyProvider(process.env.IVVY_API_KEY);
      this.registerProvider(provider);
    }
    
    if (process.env.EVENTUP_API_KEY) {
      const provider = new EventUpProvider(process.env.EVENTUP_API_KEY);
      this.registerProvider(provider);
    }
  }

  private registerProvider(provider: VenueProvider): void {
    this.providers.set(provider.name, provider);
    
    // Create circuit breaker for this provider
    this.circuitBreakers.set(provider.name, new CircuitBreaker({
      timeout: 30000,
      errorThresholdPercentage: 50,
      resetTimeout: 60000
    }));
  }

  async searchVenues(criteria: VenueSearchCriteria): Promise<AggregatedSearchResponse> {
    const availableProviders = await this.getHealthyProviders();
    
    if (availableProviders.length === 0) {
      throw new NoProvidersAvailableError('All venue providers are currently unavailable');
    }

    // Distribute search across providers based on capabilities and load
    const selectedProviders = this.loadBalancer.selectProviders(
      availableProviders,
      criteria
    );

    const searchPromises = selectedProviders.map(async provider => {
      const circuitBreaker = this.circuitBreakers.get(provider.name)!;
      
      try {
        const result = await circuitBreaker.execute(async () => {
          return await provider.searchVenues(criteria);
        });
        
        return {
          provider: provider.name,
          result,
          success: true,
          duration: 0 // Will be measured by circuit breaker
        };
      } catch (error) {
        return {
          provider: provider.name,
          error: error.message,
          success: false,
          duration: 0
        };
      }
    });

    const searchResults = await Promise.allSettled(searchPromises);
    
    // Process results
    const successfulResults = searchResults
      .filter((result): result is PromiseFulfilledResult<any> => 
        result.status === 'fulfilled' && result.value.success
      )
      .map(result => result.value);

    if (successfulResults.length === 0) {
      throw new AllProvidersFailedError('All venue providers failed to return results');
    }

    // Merge and rank results
    const mergedResults = await this.resultMerger.merge(
      successfulResults.map(r => r.result),
      criteria
    );

    // Calculate aggregated metrics
    const totalResults = successfulResults.reduce(
      (sum, result) => sum + result.result.totalCount, 
      0
    );

    const avgSearchTime = successfulResults.reduce(
      (sum, result) => sum + (result.result.searchTime || 0), 
      0
    ) / successfulResults.length;

    return {
      venues: mergedResults,
      totalCount: mergedResults.length,
      originalTotalCount: totalResults,
      searchTime: avgSearchTime,
      providers: successfulResults.map(r => r.provider),
      providerResults: successfulResults.map(r => ({
        provider: r.provider,
        venueCount: r.result.venues.length,
        totalAvailable: r.result.totalCount,
        searchTime: r.result.searchTime || 0
      })),
      searchId: generateSearchId(),
      timestamp: new Date().toISOString()
    };
  }

  async getVenueDetails(venueId: string): Promise<VenueDetails> {
    const providerId = this.extractProviderId(venueId);
    const provider = this.providers.get(providerId);
    
    if (!provider) {
      throw new VenueProviderError(`Provider ${providerId} not found`);
    }

    const circuitBreaker = this.circuitBreakers.get(provider.name)!;
    
    return await circuitBreaker.execute(async () => {
      return await provider.getVenueDetails(venueId);
    });
  }

  async createBooking(request: BookingRequest): Promise<BookingResponse> {
    const providerId = this.extractProviderId(request.venueId);
    const provider = this.providers.get(providerId);
    
    if (!provider) {
      throw new VenueProviderError(`Provider ${providerId} not found`);
    }

    if (!provider.capabilities.supportsInstantBooking) {
      throw new BookingNotSupportedError(
        `Provider ${providerId} does not support instant booking`
      );
    }

    const circuitBreaker = this.circuitBreakers.get(provider.name)!;
    
    return await circuitBreaker.execute(async () => {
      return await provider.createBooking(request);
    });
  }

  private async getHealthyProviders(): Promise<VenueProvider[]> {
    const healthyProviders: VenueProvider[] = [];
    
    for (const provider of this.providers.values()) {
      const circuitBreaker = this.circuitBreakers.get(provider.name)!;
      
      if (circuitBreaker.getState() !== 'OPEN') {
        const health = await this.healthChecker.getProviderHealth(provider.name);
        
        if (health.status === 'healthy' || health.status === 'degraded') {
          healthyProviders.push(provider);
        }
      }
    }
    
    return healthyProviders;
  }

  private extractProviderId(venueId: string): string {
    // Extract provider prefix from venue ID (e.g., "mp_12345" -> "MeetingPackage")
    const providerPrefixMap: Record<string, string> = {
      'mp_': 'MeetingPackage',
      'iv_': 'iVvy',
      'eu_': 'EventUp'
    };
    
    for (const [prefix, providerId] of Object.entries(providerPrefixMap)) {
      if (venueId.startsWith(prefix)) {
        return providerId;
      }
    }
    
    throw new VenueProviderError(`Cannot determine provider for venue ID: ${venueId}`);
  }

  private startHealthChecking(): void {
    setInterval(async () => {
      for (const provider of this.providers.values()) {
        try {
          const health = await provider.healthCheck();
          this.healthChecker.updateProviderHealth(provider.name, health);
        } catch (error) {
          this.healthChecker.updateProviderHealth(provider.name, {
            provider: provider.name,
            status: 'unhealthy',
            responseTime: 0,
            lastChecked: new Date(),
            error: error.message
          });
        }
      }
    }, 30000); // Check every 30 seconds
  }
}
```

### Result Merging and Ranking

```typescript
// services/ResultMerger.ts
export class ResultMerger {
  async merge(
    providerResults: VenueSearchResponse[],
    criteria: VenueSearchCriteria
  ): Promise<Venue[]> {
    // Combine all venues
    const allVenues: Venue[] = [];
    
    for (const result of providerResults) {
      allVenues.push(...result.venues);
    }

    // Remove duplicates (venues that appear in multiple providers)
    const uniqueVenues = this.deduplicateVenues(allVenues);

    // Rank venues based on relevance to search criteria
    const rankedVenues = this.rankVenues(uniqueVenues, criteria);

    // Apply additional filtering
    const filteredVenues = this.applyAdditionalFilters(rankedVenues, criteria);

    return filteredVenues;
  }

  private deduplicateVenues(venues: Venue[]): Venue[] {
    const seenVenues = new Map<string, Venue>();
    
    for (const venue of venues) {
      // Create a key based on name and location for deduplication
      const key = this.createVenueKey(venue);
      
      if (!seenVenues.has(key)) {
        seenVenues.set(key, venue);
      } else {
        // Keep the venue with better rating or more complete information
        const existing = seenVenues.get(key)!;
        if (this.isVenueBetter(venue, existing)) {
          seenVenues.set(key, venue);
        }
      }
    }
    
    return Array.from(seenVenues.values());
  }

  private createVenueKey(venue: Venue): string {
    return `${venue.name.toLowerCase()}_${venue.location.city.toLowerCase()}_${venue.location.coordinates.lat.toFixed(3)}_${venue.location.coordinates.lng.toFixed(3)}`;
  }

  private isVenueBetter(venue1: Venue, venue2: Venue): boolean {
    // Prefer venues with higher ratings
    if (venue1.rating.average !== venue2.rating.average) {
      return venue1.rating.average > venue2.rating.average;
    }
    
    // Prefer venues with more reviews
    if (venue1.rating.reviewCount !== venue2.rating.reviewCount) {
      return venue1.rating.reviewCount > venue2.rating.reviewCount;
    }
    
    // Prefer venues with more complete information
    const venue1Score = this.calculateCompletenessScore(venue1);
    const venue2Score = this.calculateCompletenessScore(venue2);
    
    return venue1Score > venue2Score;
  }

  private calculateCompletenessScore(venue: Venue): number {
    let score = 0;
    
    if (venue.description && venue.description.length > 50) score += 1;
    if (venue.images.gallery.length > 0) score += 1;
    if (venue.amenities.length > 0) score += 1;
    if (venue.contact.phone) score += 1;
    if (venue.contact.email) score += 1;
    if (venue.pricing.hourly || venue.pricing.daily) score += 1;
    
    return score;
  }

  private rankVenues(venues: Venue[], criteria: VenueSearchCriteria): Venue[] {
    return venues
      .map(venue => ({
        venue,
        relevanceScore: this.calculateRelevanceScore(venue, criteria)
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .map(item => item.venue);
  }

  private calculateRelevanceScore(venue: Venue, criteria: VenueSearchCriteria): number {
    let score = 0;
    
    // Location relevance
    if (criteria.location.city && 
        venue.location.city.toLowerCase() === criteria.location.city.toLowerCase()) {
      score += 20;
    }
    
    // Capacity match
    if (criteria.capacity?.preferred) {
      const capacityDiff = Math.abs(venue.capacity.recommended - criteria.capacity.preferred);
      const capacityScore = Math.max(0, 20 - (capacityDiff / criteria.capacity.preferred) * 20);
      score += capacityScore;
    }
    
    // Amenities match
    if (criteria.amenities && criteria.amenities.length > 0) {
      const venueAmenities = venue.amenities.map(a => a.name.toLowerCase());
      const matchedAmenities = criteria.amenities.filter(a => 
        venueAmenities.includes(a.toLowerCase())
      );
      score += (matchedAmenities.length / criteria.amenities.length) * 15;
    }
    
    // Rating bonus
    score += venue.rating.average * 2;
    
    // Review count bonus (logarithmic)
    if (venue.rating.reviewCount > 0) {
      score += Math.log10(venue.rating.reviewCount + 1) * 2;
    }
    
    // Verified venue bonus
    if (venue.verified) {
      score += 5;
    }
    
    return score;
  }

  private applyAdditionalFilters(venues: Venue[], criteria: VenueSearchCriteria): Venue[] {
    return venues.filter(venue => {
      // Budget filter
      if (criteria.budget) {
        const venuePrice = venue.pricing.hourly || venue.pricing.daily;
        if (venuePrice) {
          if (criteria.budget.min && venuePrice < criteria.budget.min) return false;
          if (criteria.budget.max && venuePrice > criteria.budget.max) return false;
        }
      }
      
      // Capacity filter (ensure venue can accommodate)
      if (criteria.capacity?.min && venue.capacity.max < criteria.capacity.min) {
        return false;
      }
      
      if (criteria.capacity?.max && venue.capacity.min > criteria.capacity.max) {
        return false;
      }
      
      return true;
    });
  }
}
```

## Error Handling and Circuit Breaker

### Provider Error Classes

```typescript
// errors/VenueProviderErrors.ts
export class VenueProviderError extends Error {
  constructor(message: string, public provider?: string) {
    super(message);
    this.name = 'VenueProviderError';
  }
}

export class VenueValidationError extends VenueProviderError {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'VenueValidationError';
  }
}

export class VenueNotFoundError extends VenueProviderError {
  constructor(message: string = 'Venue not found') {
    super(message);
    this.name = 'VenueNotFoundError';
  }
}

export class VenueServiceError extends VenueProviderError {
  constructor(message: string = 'Venue service unavailable') {
    super(message);
    this.name = 'VenueServiceError';
  }
}

export class VenueRateLimitError extends VenueProviderError {
  constructor(message: string, public retryAfter?: number) {
    super(message);
    this.name = 'VenueRateLimitError';
  }
}

export class BookingConflictError extends VenueProviderError {
  constructor(message: string, public availableAlternatives?: Date[]) {
    super(message);
    this.name = 'BookingConflictError';
  }
}

export class NoProvidersAvailableError extends VenueProviderError {
  constructor(message: string = 'No venue providers available') {
    super(message);
    this.name = 'NoProvidersAvailableError';
  }
}

export class AllProvidersFailedError extends VenueProviderError {
  constructor(message: string = 'All venue providers failed') {
    super(message);
    this.name = 'AllProvidersFailedError';
  }
}
```

### Circuit Breaker Implementation

```typescript
// utils/CircuitBreaker.ts
export class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failures = 0;
  private lastFailureTime = 0;
  private successCount = 0;
  private nextAttempt = 0;

  constructor(private options: CircuitBreakerOptions) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new CircuitBreakerOpenError('Circuit breaker is OPEN');
      } else {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
      }
    }

    try {
      const result = await this.executeWithTimeout(operation);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private async executeWithTimeout<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Operation timeout'));
      }, this.options.timeout);

      operation()
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  private onSuccess(): void {
    this.failures = 0;
    
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.options.halfOpenMaxSuccesses) {
        this.state = 'CLOSED';
      }
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.options.maxFailures) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.options.resetTimeout;
    }
  }

  getState(): string {
    return this.state;
  }

  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
      nextAttempt: this.nextAttempt
    };
  }
}

interface CircuitBreakerOptions {
  timeout: number;
  maxFailures: number;
  resetTimeout: number;
  halfOpenMaxSuccesses: number;
}

interface CircuitBreakerStats {
  state: string;
  failures: number;
  lastFailureTime: number;
  nextAttempt: number;
}

class CircuitBreakerOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}
```

This comprehensive venue API integration guide provides a robust, scalable architecture for handling multiple venue providers with proper error handling, load balancing, and data normalization. The system ensures reliability through circuit breakers and graceful degradation while maintaining consistent data models across different provider APIs.