const { User, Checklist, Assignment } = require('../../models');
const { hashPassword, hashAnswer } = require('../../utils/auth');

/**
 * Test data factories for consistent test setup
 */

async function createTestUser(overrides = {}) {
  const defaults = {
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    passwordHash: await hashPassword('password123'),
    securityQuestion1Id: 1,
    securityAnswer1Hash: await hashAnswer('Fluffy'),
    securityQuestion2Id: 2,
    securityAnswer2Hash: await hashAnswer('Central Elementary'),
    isAdmin: false,
  };
  
  return User.create({ ...defaults, ...overrides });
}

async function createTestAdmin(overrides = {}) {
  const defaults = {
    username: 'admin',
    firstName: 'Admin',
    lastName: 'User',
    passwordHash: await hashPassword('admin123'),
    securityQuestion1Id: 1,
    securityAnswer1Hash: await hashAnswer('Fluffy'),
    securityQuestion2Id: 2,
    securityAnswer2Hash: await hashAnswer('Central Elementary'),
    isAdmin: true,
  };
  
  return User.create({ ...defaults, ...overrides });
}

async function createTestChecklist(overrides = {}) {
  const defaults = {
    filename: 'test_checklist.html',
    title: 'Test Checklist',
    type: 'daily',
    order: 1,
  };
  
  return Checklist.create({ ...defaults, ...overrides });
}

async function createTestAssignment(user, checklist, overrides = {}) {
  const defaults = {
    userId: user.id,
    checklistId: checklist.id,
    assignedAt: new Date(),
    status: 'assigned',
  };
  
  return Assignment.create({ ...defaults, ...overrides });
}

/**
 * Authentication helpers for integration tests
 */

async function loginUser(agent, username = 'testuser', password = 'password123') {
  const response = await agent
    .post('/login-page')
    .send({ username, password })
    .expect(302);
  
  // Follow redirect to dashboard
  if (response.headers.location === '/dashboard') {
    await agent.get('/dashboard').expect(200);
  }
  
  return response;
}

async function getAuthenticatedAgent(app, username = 'testuser', password = 'password123') {
  const request = require('supertest');
  const agent = request.agent(app);
  await loginUser(agent, username, password);
  return agent;
}

/**
 * Database cleanup helpers
 */

async function cleanupTestData() {
  // Order matters due to foreign key constraints
  await Assignment.destroy({ where: {}, force: true });
  await Checklist.destroy({ where: {}, force: true });
  await User.destroy({ where: {}, force: true });
}

module.exports = {
  createTestUser,
  createTestAdmin,
  createTestChecklist,
  createTestAssignment,
  loginUser,
  getAuthenticatedAgent,
  cleanupTestData,
};
