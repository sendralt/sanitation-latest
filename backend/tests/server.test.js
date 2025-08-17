const request = require('supertest');
const app = require('../server'); // Assuming your express app is exported from server.js

// Global variable to store server instance
let server;

beforeAll(() => {
  // Start server on a different port for testing to avoid conflicts
  const port = process.env.TEST_PORT || 3002;
  server = app.listen(port);
});

afterAll((done) => {
  // Close server after all tests complete
  if (server) {
    server.close(done);
  } else {
    done();
  }
});

describe('GET /config', () => {
  it('should return configuration with auditor email(s)', async () => {
    const res = await request(app).get('/config');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('supervisorEmail');
    expect(res.body).toHaveProperty('supervisorEmails');
    expect(Array.isArray(res.body.supervisorEmails)).toBe(true);
    expect(res.body.supervisorEmails.length).toBeGreaterThan(0);

    // Test that all emails in the array are valid
    res.body.supervisorEmails.forEach(email => {
      expect(typeof email).toBe('string');
      expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/); // Basic email format validation
    });
  });
});

describe('GET /health', () => {
  it('should return health status', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'healthy');
    expect(res.body).toHaveProperty('service', 'backend-api');
  });
});