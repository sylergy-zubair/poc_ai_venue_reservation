import { useState, useCallback } from 'react';
import ApiService from '../services/api';
import type { EntityExtractionResult, SearchFilters, SearchResult } from '../types';

interface UseSearchState {
  // Search state
  query: string;
  extractionResult: EntityExtractionResult | null;
  searchResult: SearchResult | null;
  filters: SearchFilters;
  
  // Loading states
  isExtracting: boolean;
  isSearching: boolean;
  
  // Actions
  setQuery: (query: string) => void;
  extractEntities: (query: string, context?: any) => Promise<EntityExtractionResult | null>;
  searchVenues: (filters?: SearchFilters, page?: number, limit?: number) => Promise<SearchResult | null>;
  updateFilters: (filters: SearchFilters) => void;
  clearSearch: () => void;
}

export const useSearch = (): UseSearchState => {
  const [query, setQuery] = useState('');
  const [extractionResult, setExtractionResult] = useState<EntityExtractionResult | null>(null);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const extractEntities = useCallback(async (
    searchQuery: string, 
    context?: any
  ): Promise<EntityExtractionResult | null> => {
    if (!searchQuery.trim()) return null;
    
    setIsExtracting(true);
    try {
      const result = await ApiService.extractEntities(searchQuery, context);
      setExtractionResult(result);
      
      // Auto-convert entities to filters
      const newFilters: SearchFilters = {};
      
      if (result.entities.location) {
        newFilters.location = result.entities.location;
      }
      
      if (result.entities.date) {
        newFilters.date = result.entities.date;
      }
      
      if (result.entities.capacity) {
        newFilters.capacity = {
          min: Math.max(1, result.entities.capacity - 10),
          max: result.entities.capacity + 50,
        };
      }
      
      if (result.entities.eventType) {
        newFilters.eventType = result.entities.eventType;
      }
      
      if (result.entities.budget) {
        newFilters.budget = result.entities.budget;
      }
      
      if (result.entities.amenities?.length > 0) {
        newFilters.amenities = result.entities.amenities;
      }
      
      setFilters(newFilters);
      return result;
    } catch (error) {
      console.error('Entity extraction failed:', error);
      return null;
    } finally {
      setIsExtracting(false);
    }
  }, []);

  const searchVenues = useCallback(async (
    searchFilters: SearchFilters = filters,
    page: number = 1,
    limit: number = 20
  ): Promise<SearchResult | null> => {
    setIsSearching(true);
    try {
      const result = await ApiService.searchVenues(searchFilters, page, limit);
      setSearchResult(result);
      
      // Track search event
      await ApiService.trackEvent('venue_search', {
        filters: searchFilters,
        resultCount: result.totalCount,
        query,
      });
      
      return result;
    } catch (error) {
      console.error('Venue search failed:', error);
      return null;
    } finally {
      setIsSearching(false);
    }
  }, [filters, query]);

  const updateFilters = useCallback((newFilters: SearchFilters) => {
    setFilters(newFilters);
  }, []);

  const clearSearch = useCallback(() => {
    setQuery('');
    setExtractionResult(null);
    setSearchResult(null);
    setFilters({});
  }, []);

  return {
    // State
    query,
    extractionResult,
    searchResult,
    filters,
    isExtracting,
    isSearching,
    
    // Actions
    setQuery,
    extractEntities,
    searchVenues,
    updateFilters,
    clearSearch,
  };
};