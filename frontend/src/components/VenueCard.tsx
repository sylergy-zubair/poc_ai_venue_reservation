import React from 'react';
import Button from './ui/Button';
import type { Venue } from '../types';

interface VenueCardProps {
  venue: Venue;
  onBook: (venue: Venue) => void;
}

const VenueCard: React.FC<VenueCardProps> = ({ venue, onBook }) => {
  const handleBook = () => {
    onBook(venue);
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-3">
      <div>
        <h3 className="text-lg font-semibold">{venue.name}</h3>
        <p className="text-gray-600">{venue.location.city}, {venue.location.country}</p>
      </div>

      <div className="space-y-2">
        <p className="text-sm">Up to {venue.capacity.max} people</p>
        <p className="text-sm font-medium">€{venue.pricing.basePrice}/{venue.pricing.unit}</p>
        
        {venue.rating && (
          <div className="flex items-center space-x-1">
            <span className="text-sm font-medium">{venue.rating}</span>
            <span className="text-sm text-gray-500">({venue.reviewCount} reviews)</span>
          </div>
        )}
      </div>

      {venue.amenities && venue.amenities.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-1">Amenities:</p>
          <div className="flex flex-wrap gap-1">
            {venue.amenities.map((amenity) => (
              <span
                key={amenity.id}
                className="text-xs bg-gray-100 px-2 py-1 rounded"
              >
                {amenity.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <Button onClick={handleBook} className="w-full">
        Book Now
      </Button>
    </div>
  );
};

export default VenueCard;