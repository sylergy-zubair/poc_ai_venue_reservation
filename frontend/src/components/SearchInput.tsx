import React, { useState, useEffect, useRef } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import Button from './ui/Button';
import Input from './ui/Input';

interface SearchInputProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
  minLength?: number;
  placeholder?: string;
  autoFocus?: boolean;
}

const SearchInput: React.FC<SearchInputProps> = ({
  onSearch,
  isLoading = false,
  minLength = 10,
  placeholder = "Describe your venue needs in natural language...",
  autoFocus = false,
}) => {
  const [query, setQuery] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleInputChange = (value: string) => {
    setQuery(value);
    // Clear validation error when user starts typing
    if (validationError) {
      setValidationError(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) {
      return;
    }

    if (query.trim().length < minLength) {
      setValidationError('Please provide more details about your venue requirements');
      return;
    }

    onSearch(query.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            aria-label="Venue search query"
            error={validationError || undefined}
            className="text-base py-3 px-4"
          />
        </div>
        <Button
          type="submit"
          size="lg"
          disabled={!query.trim() || isLoading}
          loading={isLoading}
          className="sm:px-8"
          aria-label="Search venues"
        >
          {isLoading ? (
            <>
              <div data-testid="search-spinner" className="w-5 h-5 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Searching...
            </>
          ) : (
            <>
              <MagnifyingGlassIcon className="w-5 h-5 mr-2" />
              Search
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export default SearchInput;