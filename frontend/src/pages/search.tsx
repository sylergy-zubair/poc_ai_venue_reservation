import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/layout/Layout';
import SearchInput from '../components/SearchInput';
import EntityPreview from '../components/EntityPreview';
import VenueCard from '../components/VenueCard';
import ApiService from '../services/api';
import type { EntityExtractionResult, SearchResult, Venue } from '../types';

const SearchPage: React.FC = () => {
  const router = useRouter();
  const { q: initialQuery } = router.query;
  
  const [searchQuery, setSearchQuery] = useState((initialQuery as string) || '');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [extractionResult, setExtractionResult] = useState<EntityExtractionResult | null>(null);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);

  useEffect(() => {
    if (initialQuery) {
      setSearchQuery(initialQuery as string);
      handleSearch(initialQuery as string);
    }
  }, [initialQuery]);

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    
    // Step 1: Extract entities
    setIsExtracting(true);
    try {
      const extraction = await ApiService.extractEntities(query);
      setExtractionResult(extraction);
      
      // Step 2: Search venues with extracted entities
      setIsSearching(true);
      const filters = {
        location: extraction.entities.location,
        capacity: extraction.entities.capacity ? {
          min: extraction.entities.capacity - 10,
          max: extraction.entities.capacity + 50
        } : undefined,
        date: extraction.entities.date,
        eventType: extraction.entities.eventType,
      };
      
      const venues = await ApiService.searchVenues(filters);
      setSearchResult(venues);
      
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsExtracting(false);
      setIsSearching(false);
    }
  };

  const handleEntityEdit = (updatedEntities: any) => {
    if (!extractionResult) return;
    
    const updated = {
      ...extractionResult,
      entities: updatedEntities
    };
    setExtractionResult(updated);
    
    // Re-search with updated entities
    const filters = {
      location: updatedEntities.location,
      capacity: updatedEntities.capacity ? {
        min: updatedEntities.capacity - 10,
        max: updatedEntities.capacity + 50
      } : undefined,
      date: updatedEntities.date,
      eventType: updatedEntities.eventType,
    };
    
    ApiService.searchVenues(filters).then(setSearchResult);
  };

  const handleBookVenue = (venue: Venue) => {
    router.push(`/book/${venue.id}`);
  };

  return (
    <Layout title="Search Venues">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold">Search Venues</h1>
        
        <SearchInput
          onSearch={handleSearch}
          isLoading={isExtracting}
          autoFocus
        />

        {extractionResult && (
          <EntityPreview
            entities={extractionResult.entities}
            confidence={extractionResult.confidence}
            onEdit={handleEntityEdit}
          />
        )}

        {isSearching && (
          <div className="text-center py-8">
            <p>Searching for venues...</p>
          </div>
        )}

        {searchResult && (
          <div>
            <h2 className="text-xl font-semibold mb-4">
              {searchResult.totalCount} venues found
            </h2>
            
            {searchResult.venues.length === 0 ? (
              <p className="text-gray-600">No venues match your criteria.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchResult.venues.map((venue) => (
                  <VenueCard
                    key={venue.id}
                    venue={venue}
                    onBook={handleBookVenue}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default SearchPage;