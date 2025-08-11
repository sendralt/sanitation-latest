// Integration tests for automatic name population end-to-end flow
const request = require('supertest');
const app = require('../app');
const { User } = require('../models');
const { hashPassword } = require('../utils/auth');
const { createTestUser, cleanupTestData, getAuthenticatedAgent } = require('./helpers/testHelpers');
const jwt = require('jsonwebtoken');

describe('Name Population Integration Tests', () => {
  let testUser;

  beforeEach(async () => {
    await cleanupTestData();
    testUser = await createTestUser({
      username: 'integrationuser',
      firstName: 'Jane',
      lastName: 'Smith',
      passwordHash: await hashPassword('password123'),
    });
  });

  describe('Complete Authentication Flow', () => {
    it('should provide firstName and lastName through JWT after login', async () => {
      // Get authenticated agent
      const agent = await getAuthenticatedAgent(app, 'integrationuser', 'password123');

      // Request JWT for session
      const jwtResponse = await agent
        .get('/api/auth/issue-jwt-for-session')
        .expect(200);

      // Verify response structure
      expect(jwtResponse.body).toHaveProperty('token');
      expect(jwtResponse.body).toHaveProperty('user');
      expect(jwtResponse.body.user).toHaveProperty('firstName', 'Jane');
      expect(jwtResponse.body.user).toHaveProperty('lastName', 'Smith');

      // Step 3: Verify JWT token contains firstName and lastName
      const token = jwtResponse.body.token;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      expect(decoded.firstName).toBe('Jane');
      expect(decoded.lastName).toBe('Smith');
      expect(decoded.username).toBe('integrationuser');
    });

    it('should handle users with special characters in names', async () => {
      // Create user with special characters
      const specialUser = await createTestUser({
        username: 'specialuser',
        firstName: 'José',
        lastName: "O'Connor",
        passwordHash: await hashPassword('password123'),
      });

      // Get authenticated agent
      const agent = await getAuthenticatedAgent(app, 'specialuser', 'password123');

      // Request JWT
      const jwtResponse = await agent
        .get('/api/auth/issue-jwt-for-session')
        .expect(200);

      // Verify special characters are preserved
      expect(jwtResponse.body.user.firstName).toBe('José');
      expect(jwtResponse.body.user.lastName).toBe("O'Connor");

      // Verify in JWT token
      const token = jwtResponse.body.token;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      expect(decoded.firstName).toBe('José');
      expect(decoded.lastName).toBe("O'Connor");
    });

    it('should handle users with very long names', async () => {
      // Create user with long names
      const longNameUser = await createTestUser({
        username: 'longnameuser',
        firstName: 'Verylongfirstnamethatexceedsnormallength',
        lastName: 'Verylonglastnamethatexceedsnormallengthtotest',
        passwordHash: await hashPassword('password123'),
      });

      // Get authenticated agent
      const agent = await getAuthenticatedAgent(app, 'longnameuser', 'password123');

      // Request JWT
      const jwtResponse = await agent
        .get('/api/auth/issue-jwt-for-session')
        .expect(200);

      // Verify long names are preserved
      expect(jwtResponse.body.user.firstName).toBe('Verylongfirstnamethatexceedsnormallength');
      expect(jwtResponse.body.user.lastName).toBe('Verylonglastnamethatexceedsnormallengthtotest');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing firstName gracefully', async () => {
      // Create user with empty firstName
      try {
        const userWithoutFirstName = await createTestUser({
          username: 'nofirstname',
          firstName: '', // Empty string instead of null
          lastName: 'LastName',
          passwordHash: await hashPassword('password123'),
        });

        // Get authenticated agent
        const agent = await getAuthenticatedAgent(app, 'nofirstname', 'password123');

        // Request JWT
        const jwtResponse = await agent
          .get('/api/auth/issue-jwt-for-session')
          .expect(200);

        // Should still work with empty firstName
        expect(jwtResponse.body.user.firstName).toBe('');
        expect(jwtResponse.body.user.lastName).toBe('LastName');

        // Verify JWT token
        const token = jwtResponse.body.token;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        expect(decoded.firstName).toBe('');
        expect(decoded.lastName).toBe('LastName');
      } catch (error) {
        // If model doesn't allow empty firstName, test passes
        expect(error.name).toBe('SequelizeValidationError');
      }
    });

    it('should not break when user is not authenticated', async () => {
      // Try to get JWT without logging in
      const response = await request(app)
        .get('/api/auth/issue-jwt-for-session')
        .expect(401);

      expect(response.body.message).toBe('User not authenticated via session.');
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain all existing JWT fields', async () => {
      // Get authenticated agent
      const agent = await getAuthenticatedAgent(app, 'integrationuser', 'password123');

      // Request JWT
      const jwtResponse = await agent
        .get('/api/auth/issue-jwt-for-session')
        .expect(200);

      const token = jwtResponse.body.token;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Verify all expected fields are present
      expect(decoded).toHaveProperty('userId');
      expect(decoded).toHaveProperty('username');
      expect(decoded).toHaveProperty('firstName');
      expect(decoded).toHaveProperty('lastName');
      expect(decoded).toHaveProperty('iat'); // issued at
      expect(decoded).toHaveProperty('exp'); // expires at

      // Verify field types
      expect(typeof decoded.userId).toBe('string');
      expect(typeof decoded.username).toBe('string');
      expect(typeof decoded.firstName).toBe('string');
      expect(typeof decoded.lastName).toBe('string');
    });
  });
});
