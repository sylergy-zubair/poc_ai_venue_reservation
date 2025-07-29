import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/layout/Layout';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import ApiService from '../services/api';
import type { EntityExtractionResult } from '../types';
import { MagnifyingGlassIcon, SparklesIcon, MapPinIcon, CalendarIcon, UsersIcon } from '@heroicons/react/24/outline';

const HomePage: React.FC = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) {
      return;
    }
    
    setIsSearching(true);
    
    try {
      // Extract entities from the query
      const extractionResult: EntityExtractionResult = await ApiService.extractEntities(
        searchQuery,
        {
          dateContext: new Date().toISOString(),
        }
      );
      
      // Track search event
      await ApiService.trackEvent('home_search', {
        query: searchQuery,
        sessionId: extractionResult.sessionId,
        confidence: extractionResult.confidence.overall,
      });
      
      // Navigate to search page with the results
      router.push({
        pathname: '/search',
        query: {
          q: searchQuery,
          sessionId: extractionResult.sessionId,
        },
      });
    } catch (error) {
      console.error('Search failed:', error);
      // Still navigate to search page so user can manually adjust filters
      router.push({
        pathname: '/search',
        query: { q: searchQuery },
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleQuickSearch = (query: string) => {
    setSearchQuery(query);
    // Trigger search automatically for quick searches
    setTimeout(() => {
      const event = new Event('submit');
      const form = document.getElementById('search-form') as HTMLFormElement;
      if (form) {
        form.dispatchEvent(event);
      }
    }, 100);
  };

  const quickSearches = [
    'Conference room for 50 people in Barcelona tomorrow',
    'Wedding venue for 200 guests in Madrid next month',
    'Corporate event space for 100 people with catering',
    'Meeting room for 20 people with AV equipment',
  ];

  const features = [
    {
      icon: SparklesIcon,
      title: 'AI-Powered Search',
      description: 'Simply describe your event in natural language and let our AI find the perfect venues.',
    },
    {
      icon: MapPinIcon,
      title: 'Location Intelligence',
      description: 'Find venues in your preferred location with detailed area information and accessibility.',
    },
    {
      icon: CalendarIcon,
      title: 'Real-time Availability',
      description: 'See live availability and book instantly with confirmed dates and times.',
    },
    {
      icon: UsersIcon,
      title: 'Capacity Matching',
      description: 'Get venues that perfectly match your attendee count and event requirements.',
    },
  ];

  return (
    <Layout
      title="AI-Powered Venue Search"
      description="Find the perfect venue for your event using AI. Search by describing your event in natural language and get instant results."
    >
      {/* Hero Section */}
      <section className="section-padding text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Find Your Perfect{' '}
            <span className="text-gradient">Venue</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            Describe your event in plain English and let our AI find venues that match your exact needs. 
            No more endless scrolling through irrelevant options.
          </p>

          {/* Search Form */}
          <form id="search-form" onSubmit={handleSearch} className="mb-8">
            <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="e.g., Conference room for 50 people in Barcelona tomorrow"
                  value={searchQuery}
                  onChange={setSearchQuery}
                  className="text-base py-3 px-4"
                />
              </div>
              <Button
                type="submit"
                size="lg"
                loading={isSearching}
                disabled={!searchQuery.trim()}
                className="sm:px-8"
              >
                <MagnifyingGlassIcon className="w-5 h-5 mr-2" />
                Search Venues
              </Button>
            </div>
          </form>

          {/* Quick Search Examples */}
          <div className="mb-16">
            <p className="text-sm text-gray-500 mb-4">Try one of these examples:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {quickSearches.map((query, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickSearch(query)}
                  className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full transition-colors"
                >
                  {query}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Our AI understands your requirements and matches you with the perfect venues
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-8 h-8 text-primary-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-primary-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-primary-600 mb-2">1,000+</div>
              <div className="text-gray-600">Venues Available</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary-600 mb-2">50+</div>
              <div className="text-gray-600">Cities Covered</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary-600 mb-2">95%</div>
              <div className="text-gray-600">Match Accuracy</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding bg-gradient-to-r from-primary-600 to-primary-800 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Find Your Perfect Venue?
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Join thousands of event organizers who trust our AI to find their ideal spaces.
          </p>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => router.push('/search')}
            className="bg-white text-primary-600 hover:bg-gray-50"
          >
            Start Searching Now
          </Button>
        </div>
      </section>
    </Layout>
  );
};

export default HomePage;