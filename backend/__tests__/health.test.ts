import request from 'supertest';
import { app } from '../src/app';

describe('Health Endpoints', () => {
  describe('GET /health', () => {
    it('should return 200 with basic health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'healthy',
        timestamp: expect.any(String),
        version: expect.any(String),
        uptime: expect.any(Number),
        environment: expect.any(String),
      });
    });

    it('should include valid timestamp in ISO format', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.toISOString()).toBe(response.body.timestamp);
    });

    it('should have uptime greater than 0', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.uptime).toBeGreaterThan(0);
    });
  });

  describe('GET /health/detailed', () => {
    it('should return 401 without API key', async () => {
      await request(app)
        .get('/health/detailed')
        .expect(401);
    });

    it('should return detailed health status with valid API key', async () => {
      const response = await request(app)
        .get('/health/detailed')
        .set('X-API-Key', 'test-admin-key')
        .expect(200);

      expect(response.body).toHaveProperty('overall');
      expect(response.body).toHaveProperty('services');
      expect(response.body).toHaveProperty('system');
      expect(response.body).toHaveProperty('timestamp');
      
      expect(response.body.services).toHaveProperty('database');
      expect(response.body.services).toHaveProperty('claudeApi');
      expect(response.body.services).toHaveProperty('venueProviders');
      
      expect(response.body.system).toHaveProperty('memory');
      expect(response.body.system).toHaveProperty('cpu');
    });

    it('should include service response times', async () => {
      const response = await request(app)
        .get('/health/detailed')
        .set('X-API-Key', 'test-admin-key')
        .expect(200);

      expect(response.body.services.database).toHaveProperty('responseTime');
      expect(response.body.services.claudeApi).toHaveProperty('responseTime');
      expect(response.body.services.venueProviders).toHaveProperty('responseTime');
    });

    it('should return overall status as healthy when all services are up', async () => {
      const response = await request(app)
        .get('/health/detailed')
        .set('X-API-Key', 'test-admin-key')
        .expect(200);

      expect(response.body.overall).toBe('healthy');
    });
  });

  describe('Rate Limiting', () => {
    it('should not rate limit basic health endpoint', async () => {
      // Make multiple requests quickly
      const promises = Array(10).fill(null).map(() => 
        request(app).get('/health')
      );
      
      const responses = await Promise.all(promises);
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('should rate limit detailed health endpoint', async () => {
      // Make multiple requests to detailed endpoint
      const promises = Array(15).fill(null).map(() => 
        request(app)
          .get('/health/detailed')
          .set('X-API-Key', 'test-admin-key')
      );
      
      const responses = await Promise.all(promises);
      const tooManyRequests = responses.filter(r => r.status === 429);
      
      expect(tooManyRequests.length).toBeGreaterThan(0);
    });
  });
});