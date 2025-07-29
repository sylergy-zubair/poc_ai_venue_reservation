import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VenueCard from '../VenueCard';
import type { Venue } from '../../types';

const user = userEvent.setup();

describe('VenueCard Component', () => {
  const mockVenue: Venue = {
    id: "venue-1",
    name: "Madrid Convention Center",
    description: "Large conference facility",
    images: ["image1.jpg"],
    location: {
      address: "123 Main St",
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
      { id: "2", name: "A/V Equipment", category: "tech", included: true }
    ],
    pricing: {
      basePrice: 200,
      currency: "EUR",
      unit: "hour"
    },
    rating: 4.5,
    reviewCount: 25,
    categories: ["conference"],
    features: ["parking", "catering"],
    provider: {
      id: "provider-1",
      name: "VenueProvider"
    },
    metadata: {
      createdAt: "2024-01-01",
      updatedAt: "2024-01-01",
      verified: true,
      featured: false
    }
  };

  test('should display venue information', () => {
    render(<VenueCard venue={mockVenue} onBook={jest.fn()} />);
    
    expect(screen.getByText('Madrid Convention Center')).toBeInTheDocument();
    expect(screen.getByText('Madrid, Spain')).toBeInTheDocument();
    expect(screen.getByText('Up to 500 people')).toBeInTheDocument();
    expect(screen.getByText('€200/hour')).toBeInTheDocument();
  });

  test('should show amenities list', () => {
    render(<VenueCard venue={mockVenue} onBook={jest.fn()} />);
    
    expect(screen.getByText('WiFi')).toBeInTheDocument();
    expect(screen.getByText('A/V Equipment')).toBeInTheDocument();
  });

  test('should call onBook when book button is clicked', async () => {
    const mockOnBook = jest.fn();
    render(<VenueCard venue={mockVenue} onBook={mockOnBook} />);
    
    const bookButton = screen.getByRole('button', { name: /book now/i });
    await user.click(bookButton);
    
    expect(mockOnBook).toHaveBeenCalledWith(mockVenue);
  });

  test('should display availability status', () => {
    const unavailableVenue = { 
      ...mockVenue, 
      availability: []
    };
    render(<VenueCard venue={unavailableVenue} onBook={jest.fn()} />);
    
    const bookButton = screen.getByRole('button', { name: /book now/i });
    expect(bookButton).toBeInTheDocument();
  });

  test('should show rating', () => {
    render(<VenueCard venue={mockVenue} onBook={jest.fn()} />);
    
    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText('(25 reviews)')).toBeInTheDocument();
  });
});