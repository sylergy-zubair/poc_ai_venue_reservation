// AI Venue Booking - Frontend JavaScript
// Connects to backend API running on port 3003

class VenueBookingApp {
    constructor() {
        this.apiUrl = 'http://localhost:3003/api';
        this.debugMode = false;
        this.selectedVenue = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.setMinDate();
        console.log('🚀 AI Venue Booking App initialized');
        console.log('📡 API URL:', this.apiUrl);
    }

    bindEvents() {
        // Search form
        document.getElementById('searchForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSearch();
        });

        // Modal events
        document.getElementById('closeModal').addEventListener('click', () => {
            this.closeModal('bookingModal');
        });

        document.getElementById('cancelBooking').addEventListener('click', () => {
            this.closeModal('bookingModal');
        });

        document.getElementById('closeSuccessModal').addEventListener('click', () => {
            this.closeModal('successModal');
        });

        document.getElementById('closeSuccess').addEventListener('click', () => {
            this.closeModal('successModal');
        });

        // Booking form
        document.getElementById('bookingForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleBooking();
        });

        // Close modal on backdrop click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });
    }

    setMinDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('eventDate').min = today;
    }

    async handleSearch() {
        const query = document.getElementById('query').value.trim();
        if (!query) return;

        this.showLoading('searchBtn');
        this.hideResults();

        try {
            // Step 1: Extract entities from natural language
            console.log('🔍 Extracting entities from query:', query);
            const entities = await this.extractEntities(query);
            console.log('🔍 Extracted entities:', entities);
            
            if (this.debugMode) {
                this.showDebugInfo(entities);
            }

            // Step 2: Search venues based on extracted entities
            console.log('🏢 Searching venues with extracted criteria');
            const results = await this.searchVenues(entities);
            console.log('🏢 Search results:', results);
            
            this.showResults(results);

        } catch (error) {
            console.error('❌ Search failed:', error);
            console.error('❌ Error details:', error.message);
            console.error('❌ Error stack:', error.stack);
            this.showError(`Search failed: ${error.message}`);
        } finally {
            this.hideLoading('searchBtn');
        }
    }

    async extractEntities(query) {
        console.log('🔍 Making entity extraction request to:', `${this.apiUrl}/extract`);
        
        const response = await fetch(`${this.apiUrl}/extract`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query })
        });

        console.log('🔍 Entity extraction response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('🔍 Entity extraction error response:', errorText);
            throw new Error(`Entity extraction failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('🔍 Entity extraction response data:', data);
        return data.data;
    }

    async searchVenues(entities) {
        // Convert entities to search filters
        const filters = {};
        
        if (entities.entities && entities.entities.location) {
            filters.location = entities.entities.location;
        }
        
        if (entities.entities && entities.entities.capacity) {
            filters.capacity = { min: entities.entities.capacity };
        }
        
        if (entities.entities && entities.entities.eventType) {
            filters.eventType = entities.entities.eventType;
        }

        console.log('🔍 Search filters:', filters);
        console.log('🏢 Making venue search request to:', `${this.apiUrl}/venues/search`);

        const response = await fetch(`${this.apiUrl}/venues/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ filters })
        });

        console.log('🏢 Venue search response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('🏢 Venue search error response:', errorText);
            throw new Error(`Venue search failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('🏢 Venue search response data:', data);
        return data.data;
    }

    showResults(results) {
        const resultsSection = document.getElementById('resultsSection');
        const resultsGrid = document.getElementById('resultsGrid');
        
        if (!results.venues || results.venues.length === 0) {
            resultsGrid.innerHTML = `
                <div class="no-results">
                    <h3>No venues found</h3>
                    <p>Try adjusting your search criteria.</p>
                </div>
            `;
        } else {
            resultsGrid.innerHTML = results.venues.map(venue => this.createVenueCard(venue)).join('');
        }
        
        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    createVenueCard(venue) {
        const amenities = venue.amenities?.slice(0, 4).map(amenity => 
            `<span class="amenity-tag">${amenity}</span>`
        ).join('') || '';

        return `
            <div class="venue-card">
                <h3 class="venue-title">${venue.name}</h3>
                <p class="venue-description">${venue.description}</p>
                
                <div class="venue-details">
                    <div class="venue-detail">
                        <span class="venue-detail-label">📍 Location:</span>
                        <div class="venue-detail-value">${venue.location.city}, ${venue.location.country}</div>
                    </div>
                    <div class="venue-detail">
                        <span class="venue-detail-label">👥 Capacity:</span>
                        <div class="venue-detail-value">${venue.capacity.min} - ${venue.capacity.max} people</div>
                    </div>
                    <div class="venue-detail">
                        <span class="venue-detail-label">💰 Price:</span>
                        <div class="venue-detail-value">${venue.pricing.basePrice} ${venue.pricing.currency}/${venue.pricing.unit}</div>
                    </div>
                    <div class="venue-detail">
                        <span class="venue-detail-label">🏢 Provider:</span>
                        <div class="venue-detail-value">${venue.provider}</div>
                    </div>
                </div>

                ${amenities ? `
                    <div class="venue-amenities">
                        <div class="venue-detail-label">✨ Amenities:</div>
                        <div class="amenities-list">${amenities}</div>
                    </div>
                ` : ''}

                <div class="venue-actions">
                    <button class="btn btn-secondary btn-sm" onclick="app.checkAvailability('${venue.id}', '${venue.name}')">
                        📅 Check Availability
                    </button>
                    <button class="btn btn-primary btn-sm" onclick="app.openBookingModal('${venue.id}')">
                        📝 Book Now
                    </button>
                </div>
            </div>
        `;
    }

    async checkAvailability(venueId, venueName) {
        const date = prompt('Enter date (YYYY-MM-DD):');
        if (!date) return;

        try {
            const response = await fetch(`${this.apiUrl}/venues/${venueId}/availability?date=${date}&startTime=09:00&endTime=17:00`);
            const data = await response.json();
            
            if (data.success) {
                const availability = data.data;
                if (availability.available) {
                    alert(`✅ ${venueName} is available on ${date}!`);
                } else {
                    const alternatives = availability.alternativeDates?.length 
                        ? `\n\nAlternative dates: ${availability.alternativeDates.join(', ')}`
                        : '';
                    alert(`❌ ${venueName} is not available on ${date}.\nReason: ${availability.reason}${alternatives}`);
                }
            }
        } catch (error) {
            console.error('❌ Availability check failed:', error);
            alert('Failed to check availability. Please try again.');
        }
    }

    async openBookingModal(venueId) {
        try {
            // Get venue details
            const response = await fetch(`${this.apiUrl}/venues/${venueId}`);
            const data = await response.json();
            
            if (data.success) {
                this.selectedVenue = data.data;
                this.populateBookingModal();
                this.showModal('bookingModal');
            }
        } catch (error) {
            console.error('❌ Failed to get venue details:', error);
            alert('Failed to load venue details. Please try again.');
        }
    }

    populateBookingModal() {
        const venue = this.selectedVenue;
        const venueInfoHtml = `
            <div class="selected-venue">
                <div class="selected-venue-title">🏢 ${venue.name}</div>
                <div class="selected-venue-details">
                    📍 ${venue.location.address}, ${venue.location.city}<br>
                    👥 Capacity: ${venue.capacity.min} - ${venue.capacity.max} people<br>
                    💰 Price: ${venue.pricing.basePrice} ${venue.pricing.currency}/${venue.pricing.unit}
                </div>
            </div>
        `;
        
        document.getElementById('selectedVenueInfo').innerHTML = venueInfoHtml;
        
        // Pre-fill form with extracted data if available
        const queryText = document.getElementById('query').value.toLowerCase();
        
        // Try to extract attendee count from query
        const capacityMatch = queryText.match(/(\\d+)\\s*(?:people|persons|attendees|guests)/);
        if (capacityMatch) {
            document.getElementById('attendeeCount').value = capacityMatch[1];
        }

        // Set default event type based on query
        const eventTypes = ['conference', 'meeting', 'wedding', 'party', 'workshop', 'seminar'];
        const detectedType = eventTypes.find(type => queryText.includes(type));
        if (detectedType) {
            document.getElementById('eventType').value = detectedType;
        }
    }

    async handleBooking() {
        if (!this.selectedVenue) return;

        this.showLoading('submitBooking');

        try {
            const formData = new FormData(document.getElementById('bookingForm'));
            
            const bookingData = {
                contact: {
                    name: formData.get('contactName'),
                    email: formData.get('contactEmail'),
                    phone: formData.get('contactPhone') || '',
                    company: formData.get('contactCompany') || ''
                },
                details: {
                    venueId: this.selectedVenue.id,
                    eventDate: formData.get('eventDate'),
                    startTime: formData.get('startTime') || '09:00',
                    endTime: formData.get('endTime') || '17:00',
                    attendeeCount: parseInt(formData.get('attendeeCount')),
                    eventType: formData.get('eventType') || 'event',
                    requirements: formData.get('requirements') || ''
                }
            };

            console.log('📝 Submitting booking:', bookingData);

            const response = await fetch(`${this.apiUrl}/venues/book`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(bookingData)
            });

            const result = await response.json();

            if (result.success) {
                this.showBookingSuccess(result.data);
                this.closeModal('bookingModal');
                document.getElementById('bookingForm').reset();
            } else {
                throw new Error(result.error?.message || 'Booking failed');
            }

        } catch (error) {
            console.error('❌ Booking failed:', error);
            this.showError('Booking failed: ' + error.message);
        } finally {
            this.hideLoading('submitBooking');
        }
    }

    showBookingSuccess(booking) {
        const successHtml = `
            <div class="success-message">
                <h4>🎉 Booking Request Submitted Successfully!</h4>
                <p><strong>Booking ID:</strong> ${booking.bookingId}</p>
                <p><strong>Status:</strong> ${booking.status}</p>
                <p><strong>Venue:</strong> ${booking.venue.name}</p>
                <p><strong>Event Date:</strong> ${booking.details.eventDate}</p>
                <p><strong>Attendees:</strong> ${booking.details.attendeeCount}</p>
            </div>
            <div class="selected-venue">
                <div class="selected-venue-title">💰 Pricing Information</div>
                <div class="selected-venue-details">
                    Base Price: ${booking.pricing.basePrice} ${booking.pricing.currency}<br>
                    Total Price: ${booking.pricing.totalPrice} ${booking.pricing.currency}
                </div>
            </div>
            <div class="selected-venue">
                <div class="selected-venue-title">📋 Next Steps</div>
                <div class="selected-venue-details">
                    ${booking.nextSteps.map(step => `• ${step}`).join('<br>')}
                </div>
            </div>
        `;
        
        document.getElementById('bookingSuccessContent').innerHTML = successHtml;
        this.showModal('successModal');
    }

    showDebugInfo(entities) {
        const debugPanel = document.getElementById('debugPanel');
        const debugContent = document.getElementById('debugContent');
        
        const debugInfo = {
            'Extracted Entities': entities.entities,
            'Confidence Scores': entities.confidence,
            'AI Reasoning': entities.reasoning,
            'Suggestions': entities.suggestions,
            'Processing Time': entities.metadata.processingTime + 'ms',
            'Using Fallback': !entities.metadata.fromCache && entities.confidence.overall < 0.5
        };

        debugContent.textContent = JSON.stringify(debugInfo, null, 2);
        debugPanel.style.display = 'block';
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 10);
        document.body.style.overflow = 'hidden';
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }, 300);
    }

    showLoading(buttonId) {
        const button = document.getElementById(buttonId);
        const text = button.querySelector('[id$="Text"]');
        const loader = button.querySelector('[id$="Loader"]');
        
        if (text) text.style.display = 'none';
        if (loader) loader.style.display = 'inline';
        button.disabled = true;
    }

    hideLoading(buttonId) {
        const button = document.getElementById(buttonId);
        const text = button.querySelector('[id$="Text"]');
        const loader = button.querySelector('[id$="Loader"]');
        
        if (text) text.style.display = 'inline';
        if (loader) loader.style.display = 'none';
        button.disabled = false;
    }

    hideResults() {
        document.getElementById('resultsSection').style.display = 'none';
    }

    showError(message) {
        alert('❌ ' + message);
    }
}

// Global functions
function toggleDebug() {
    app.debugMode = !app.debugMode;
    console.log('🔧 Debug mode:', app.debugMode ? 'ON' : 'OFF');
    
    if (!app.debugMode) {
        document.getElementById('debugPanel').style.display = 'none';
    }
}

// Initialize app when DOM is loaded
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new VenueBookingApp();
});

// Example queries for testing
const exampleQueries = [
    "I need a venue for 100 people in Madrid next month for a corporate conference",
    "Looking for a wedding venue in Barcelona for 150 guests with catering",
    "Small meeting room in Lisbon for 20 people with WiFi and projector",
    "Conference hall for 300 attendees in Madrid with parking and AV equipment"
];

console.log('💡 Try these example queries:', exampleQueries);