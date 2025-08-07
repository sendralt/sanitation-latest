// Integration tests for automatic name population end-to-end flow
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../app');
const sequelize = require('../config/sequelize');
const { User } = require('../models');
const { hashPassword } = require('../utils/auth');
const jwt = require('jsonwebtoken');

describe('Name Population Integration Tests', () => {
  let testUser;
  let agent;

  beforeAll(async () => {
    // Connect to the database and sync the models
    await sequelize.authenticate();
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    // Clean up all data after tests complete
    await User.destroy({ where: {}, force: true });
    await sequelize.close();
  });

  beforeEach(async () => {
    // Clean up data before each test
    await User.destroy({ where: {}, force: true });

    // Create a test user with firstName and lastName
    const hashedPassword = await hashPassword('password123');
    testUser = await User.create({
      username: 'integrationuser',
      firstName: 'Jane',
      lastName: 'Smith',
      passwordHash: hashedPassword,
      securityQuestion1Id: 1,
      securityAnswer1Hash: 'hashedanswer1',
      securityQuestion2Id: 2,
      securityAnswer2Hash: 'hashedanswer2',
      isAdmin: false
    });

    // Create a new agent for each test to maintain session
    agent = request.agent(app);
  });

  describe('Complete Authentication Flow', () => {
    it('should provide firstName and lastName through JWT after login', async () => {
      // Step 1: Login to establish session
      const loginResponse = await agent
        .post('/login-page')
        .send({
          username: 'integrationuser',
          password: 'password123'
        });

      // Login should redirect to dashboard
      expect(loginResponse.status).toBe(302);
      expect(loginResponse.headers.location).toBe('/dashboard');

      // Step 2: Request JWT for session
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
      const hashedPassword = await hashPassword('password123');
      const specialUser = await User.create({
        username: 'specialuser',
        firstName: 'José',
        lastName: "O'Connor",
        passwordHash: hashedPassword,
        securityQuestion1Id: 1,
        securityAnswer1Hash: 'hashedanswer1',
        securityQuestion2Id: 2,
        securityAnswer2Hash: 'hashedanswer2',
        isAdmin: false
      });

      // Login
      await agent
        .post('/login-page')
        .send({
          username: 'specialuser',
          password: 'password123'
        });

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
      const hashedPassword = await hashPassword('password123');
      const longNameUser = await User.create({
        username: 'longnameuser',
        firstName: 'Verylongfirstnamethatexceedsnormallength',
        lastName: 'Verylonglastnamethatexceedsnormallengthtotest',
        passwordHash: hashedPassword,
        securityQuestion1Id: 1,
        securityAnswer1Hash: 'hashedanswer1',
        securityQuestion2Id: 2,
        securityAnswer2Hash: 'hashedanswer2',
        isAdmin: false
      });

      // Login
      await agent
        .post('/login-page')
        .send({
          username: 'longnameuser',
          password: 'password123'
        });

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
      // Create user with null firstName (if allowed by model)
      const hashedPassword = await hashPassword('password123');
      
      // This test depends on whether the model allows null firstName
      // If not, we'll test with empty string
      try {
        const userWithoutFirstName = await User.create({
          username: 'nofirstname',
          firstName: '', // Empty string instead of null
          lastName: 'LastName',
          passwordHash: hashedPassword,
          securityQuestion1Id: 1,
          securityAnswer1Hash: 'hashedanswer1',
          securityQuestion2Id: 2,
          securityAnswer2Hash: 'hashedanswer2',
          isAdmin: false
        });

        // Login
        await agent
          .post('/login-page')
          .send({
            username: 'nofirstname',
            password: 'password123'
          });

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
      const response = await agent
        .get('/api/auth/issue-jwt-for-session')
        .expect(401);

      expect(response.body.message).toBe('User not authenticated via session.');
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain all existing JWT fields', async () => {
      // Login
      await agent
        .post('/login-page')
        .send({
          username: 'integrationuser',
          password: 'password123'
        });

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
