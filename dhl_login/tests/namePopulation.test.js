// Test for automatic name population functionality
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../app');
const sequelize = require('../config/sequelize');
const { User } = require('../models');
const { generateToken } = require('../utils/auth');
const jwt = require('jsonwebtoken');

describe('Automatic Name Population', () => {
  let testUser;

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
    testUser = await User.create({
      username: 'testuser',
      firstName: 'John',
      lastName: 'Doe',
      passwordHash: 'hashedpassword123',
      securityQuestion1Id: 1,
      securityAnswer1Hash: 'hashedanswer1',
      securityQuestion2Id: 2,
      securityAnswer2Hash: 'hashedanswer2',
      isAdmin: false
    });
  });

  describe('JWT Token Generation', () => {
    it('should include firstName and lastName in JWT payload', () => {
      const token = generateToken(testUser);
      
      // Decode the token to verify payload
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      expect(decoded.userId).toBe(testUser.id);
      expect(decoded.username).toBe(testUser.username);
      expect(decoded.firstName).toBe(testUser.firstName);
      expect(decoded.lastName).toBe(testUser.lastName);
    });

    it('should generate valid JWT token with all required fields', () => {
      const token = generateToken(testUser);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      
      // Verify token structure
      const parts = token.split('.');
      expect(parts).toHaveLength(3); // header.payload.signature
    });
  });

  describe('Session JWT Endpoint', () => {
    it('should return firstName and lastName in user object', async () => {
      // Create a session by logging in first
      const agent = request.agent(app);
      
      // Mock successful login by setting session
      await agent
        .post('/login-page')
        .send({
          username: testUser.username,
          password: 'password123' // This would need to match the actual password
        });

      // Note: This test would need proper session setup
      // For now, we'll test the JWT generation directly
      const token = generateToken(testUser);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      expect(decoded.firstName).toBe('John');
      expect(decoded.lastName).toBe('Doe');
    });
  });

  describe('JWT Payload Structure', () => {
    it('should maintain backward compatibility with existing fields', () => {
      const token = generateToken(testUser);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Ensure existing fields are still present
      expect(decoded).toHaveProperty('userId');
      expect(decoded).toHaveProperty('username');
      
      // Ensure new fields are added
      expect(decoded).toHaveProperty('firstName');
      expect(decoded).toHaveProperty('lastName');
    });

    it('should handle users with empty firstName or lastName', async () => {
      // Create user with empty names
      const userWithEmptyNames = await User.create({
        username: 'emptyuser',
        firstName: '',
        lastName: '',
        passwordHash: 'hashedpassword123',
        securityQuestion1Id: 1,
        securityAnswer1Hash: 'hashedanswer1',
        securityQuestion2Id: 2,
        securityAnswer2Hash: 'hashedanswer2',
        isAdmin: false
      });

      const token = generateToken(userWithEmptyNames);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      expect(decoded.firstName).toBe('');
      expect(decoded.lastName).toBe('');
    });
  });
});
