# SimplyBook.me Integration Guide

## Overview

The venue booking application now supports real-time venue booking through SimplyBook.me API integration. The system automatically falls back to mock data when SimplyBook.me is not configured.

## Setup Instructions

### 1. Create SimplyBook.me Account

1. Visit [SimplyBook.me](https://simplybook.me/)
2. Create a free account or upgrade to a paid plan
3. Set up your venue/service listings in the SimplyBook.me dashboard
4. Configure your booking settings and availability

### 2. Get API Credentials

1. Log into your SimplyBook.me account
2. Go to **Plugins** section in the admin interface
3. Find and activate the **API Plugin**
4. In API Plugin settings, you'll find:
   - **Company Login**: Your unique company identifier
   - **API Key**: Your secret API key for authentication

### 3. Configure Environment Variables

Add the following variables to your `.env` file:

```bash
# SimplyBook.me API Configuration
SIMPLYBOOK_COMPANY_LOGIN=your_company_login_here
SIMPLYBOOK_API_KEY=your_simplybook_api_key_here
SIMPLYBOOK_API_URL=https://user-api.simplybook.me
SIMPLYBOOK_TIMEOUT=30000
SIMPLYBOOK_RATE_LIMIT_DELAY=200
```

### 4. Restart the Application

After configuring the environment variables, restart the backend server:

```bash
cd backend
npm run build
npm start
```

## How It Works

### Automatic Fallback System

The application uses an intelligent fallback system:

1. **SimplyBook.me Configured**: Uses real-time venue data and booking
2. **SimplyBook.me Not Configured**: Falls back to mock data for development

### API Endpoints Enhanced

All existing API endpoints now support both modes:

#### Venue Search (`POST /api/venues/search`)
- **With SimplyBook.me**: Real venue data with live availability
- **Without SimplyBook.me**: Mock venue data for testing

#### Venue Booking (`POST /api/venues/book`)
- **With SimplyBook.me**: Creates actual bookings in SimplyBook.me system
- **Without SimplyBook.me**: Creates mock bookings for testing

#### Health Monitoring (`GET /health/detailed`)
- Includes SimplyBook.me service status when configured
- Shows configuration status and connection health

## Features

### Real-Time Venue Data
- Live venue availability checking
- Real-time pricing and capacity information
- Actual booking confirmations

### Enhanced Entity Extraction
- Gemini AI processes natural language queries
- Extracted entities used to search SimplyBook.me venues
- Intelligent filtering by location, capacity, date, and event type

### Comprehensive Error Handling
- Automatic fallback when SimplyBook.me is unavailable
- Rate limiting compliance (5 requests/second)
- Detailed error logging and monitoring

### Security Features
- Environment-based API key management
- Secure token management with automatic refresh
- No sensitive data stored in code

## API Rate Limits

SimplyBook.me has specific rate limits:
- **Free Tier**: 5,000 requests/day
- **Premium**: 25,000 requests/day
- **Enterprise**: Unlimited requests

The integration automatically handles rate limiting with:
- 200ms delay between requests (5 req/second max)
- Automatic retry on rate limit errors
- Graceful degradation to mock data if needed

## Monitoring and Health Checks

### Health Check Endpoints

1. **Basic Health** (`GET /health`):
   ```json
   {
     "status": "healthy",
     "timestamp": "2025-01-30T20:00:00Z",
     "version": "1.0.0"
   }
   ```

2. **Detailed Health** (`GET /health/detailed`):
   ```json
   {
     "status": "healthy",
     "services": {
       "venueProviders": {
         "status": "healthy",
         "details": {
           "provider": "SimplyBook.me",
           "servicesCount": 15,
           "unitsCount": 8
         }
       }
     }
   }
   ```

### Logging

The system logs all SimplyBook.me interactions:
- Authentication token requests
- API calls and response times
- Error conditions and fallback usage
- Booking confirmations and failures

## Testing

### Test Without SimplyBook.me
The system works perfectly with mock data when SimplyBook.me is not configured:

```bash
curl -X POST http://localhost:3001/api/venues/search \\
  -H "Content-Type: application/json" \\
  -d '{"filters": {"location": "Madrid", "capacity": {"min": 50}}}'
```

### Test With SimplyBook.me
Once configured, the same endpoints return real venue data:
- Live availability checking
- Actual venue information from your SimplyBook.me account
- Real booking creation and confirmation

## Troubleshooting

### Common Issues

1. **"No venue APIs configured"**
   - Solution: Add SimplyBook.me credentials to `.env` file

2. **"Invalid API key"**
   - Solution: Verify API key from SimplyBook.me admin panel

3. **"Rate limit exceeded"**
   - Solution: System automatically handles this with delays

4. **"Service unavailable"**
   - Solution: System falls back to mock data automatically

### Debug Mode

Enable debug logging by setting:
```bash
DEBUG_MODE=true
LOG_LEVEL=debug
```

## Cost Considerations

### SimplyBook.me Pricing
- **Free Plan**: Perfect for POC and development
- **Premium Plans**: Starting at $49.90/month for production use
- **API Calls**: Included in monthly limits

### Recommended Setup
- **Development**: Use free tier with mock data fallback
- **Production**: Use premium tier for reliability and higher limits

## Next Steps

1. **Create SimplyBook.me Account**: Sign up and get your API credentials
2. **Configure Environment**: Add credentials to `.env` file
3. **Test Integration**: Verify real bookings work correctly
4. **Go Live**: Deploy with confidence knowing fallback works

## Support

- **SimplyBook.me Documentation**: [API Docs](https://simplybook.me/en/api/developer-api)
- **Integration Issues**: Check application logs for detailed error messages
- **Rate Limits**: Monitor health check endpoints for API status