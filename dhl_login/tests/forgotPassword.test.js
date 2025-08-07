const request = require('supertest');
const app = require('../app');
const User = require('../models/user');
const { hashPassword, hashAnswer } = require('../utils/auth');

describe('Forgot Password Routes', () => {
  let testUser;

  beforeEach(async () => {
    // Clean up any existing test user first
    await User.destroy({ where: { username: 'testuser' } });

    // Add a small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));

    // Create a test user
    const passwordHash = await hashPassword('testpassword123');
    const answer1Hash = await hashAnswer('Fluffy');
    const answer2Hash = await hashAnswer('Central Elementary');

    testUser = await User.create({
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      passwordHash,
      securityQuestion1Id: 1,
      securityAnswer1Hash: answer1Hash,
      securityQuestion2Id: 3,
      securityAnswer2Hash: answer2Hash,
      isAdmin: false,
      passwordResetAttemptCount: 0,
      lastPasswordResetAttempt: null
    });
  });

  afterEach(async () => {
    // Clean up test user
    if (testUser) {
      await testUser.destroy();
    }
    // Add delay between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  });

  describe('GET /forgot-password', () => {
    it('should render the forgot password form', async () => {
      const response = await request(app)
        .get('/forgot-password')
        .expect(200);

      expect(response.text).toContain('Forgot Password');
      expect(response.text).toContain('Enter your username');
    });
  });

  describe('POST /forgot-password', () => {
    it('should show security questions for valid username', async () => {
      const response = await request(app)
        .post('/forgot-password')
        .send({ username: 'testuser' })
        .expect(200);

      expect(response.text).toContain('Security Questions');
      expect(response.text).toContain('What was your first pet&#39;s name?');
    });

    it('should handle invalid username gracefully', async () => {
      const response = await request(app)
        .post('/forgot-password')
        .send({ username: 'nonexistentuser' })
        .expect(302); // Redirect

      // Should redirect back to forgot password page
      expect(response.headers.location).toBe('/forgot-password');
    });

    it('should require username', async () => {
      const response = await request(app)
        .post('/forgot-password')
        .send({})
        .expect(302); // Redirect

      expect(response.headers.location).toBe('/forgot-password');
    });
  });

  describe('POST /forgot-password/verify-answers', () => {
    it('should verify correct security answers', async () => {
      // First, get to step 2 by posting username
      const agent = request.agent(app);
      
      await agent
        .post('/forgot-password')
        .send({ username: 'testuser' })
        .expect(200);

      // Then verify answers
      const response = await agent
        .post('/forgot-password/verify-answers')
        .send({
          answer1: 'Fluffy',
          answer2: 'Central Elementary',
          questionId1: '1',
          questionId2: '3'
        })
        .expect(200);

      expect(response.text).toContain('Reset Password');
      expect(response.text).toContain('New Password');
    });

    it('should reject incorrect security answers', async () => {
      const agent = request.agent(app);
      
      await agent
        .post('/forgot-password')
        .send({ username: 'testuser' })
        .expect(200);

      const response = await agent
        .post('/forgot-password/verify-answers')
        .send({
          answer1: 'WrongAnswer',
          answer2: 'AlsoWrong',
          questionId1: '1',
          questionId2: '3'
        })
        .expect(302); // Redirect

      expect(response.headers.location).toBe('/forgot-password');
    });
  });

  describe('POST /forgot-password/reset', () => {
    it('should reset password successfully', async () => {
      const agent = request.agent(app);
      
      // Step 1: Submit username
      await agent
        .post('/forgot-password')
        .send({ username: 'testuser' })
        .expect(200);

      // Step 2: Verify security answers
      await agent
        .post('/forgot-password/verify-answers')
        .send({
          answer1: 'Fluffy',
          answer2: 'Central Elementary',
          questionId1: '1',
          questionId2: '3'
        })
        .expect(200);

      // Step 3: Reset password
      const response = await agent
        .post('/forgot-password/reset')
        .send({
          newPassword: 'newpassword123',
          confirmPassword: 'newpassword123'
        })
        .expect(302); // Redirect to login

      expect(response.headers.location).toBe('/login-page');

      // Verify password was actually changed
      const updatedUser = await User.findByPk(testUser.id);
      expect(updatedUser.passwordHash).not.toBe(testUser.passwordHash);
    });

    it('should reject mismatched passwords', async () => {
      const agent = request.agent(app);
      
      // Get to step 3
      await agent.post('/forgot-password').send({ username: 'testuser' });
      await agent.post('/forgot-password/verify-answers').send({
        answer1: 'Fluffy',
        answer2: 'Central Elementary',
        questionId1: '1',
        questionId2: '3'
      });

      const response = await agent
        .post('/forgot-password/reset')
        .send({
          newPassword: 'newpassword123',
          confirmPassword: 'differentpassword'
        })
        .expect(302); // Redirect

      expect(response.headers.location).toBe('/forgot-password');
    });

    it('should reject short passwords', async () => {
      const agent = request.agent(app);
      
      // Get to step 3
      await agent.post('/forgot-password').send({ username: 'testuser' });
      await agent.post('/forgot-password/verify-answers').send({
        answer1: 'Fluffy',
        answer2: 'Central Elementary',
        questionId1: '1',
        questionId2: '3'
      });

      const response = await agent
        .post('/forgot-password/reset')
        .send({
          newPassword: '123',
          confirmPassword: '123'
        })
        .expect(302); // Redirect

      expect(response.headers.location).toBe('/forgot-password');
    });
  });
});
