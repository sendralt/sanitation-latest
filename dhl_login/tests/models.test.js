// Set NODE_ENV to test to ensure we use the test database
process.env.NODE_ENV = 'test';

const sequelize = require('../config/sequelize');
const User = require('../models/user');
const Checklist = require('../models/checklist');
const Assignment = require('../models/assignment');

describe('Models', () => {
  beforeAll(async () => {
    // Connect to the database and sync the models
    await sequelize.authenticate();
    await sequelize.sync({ force: true }); // Use force: true to recreate tables for a clean test environment
  });

  afterAll(async () => {
    // Clean up all data after tests complete
    await Assignment.destroy({ where: {}, force: true });
    await Checklist.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });
    await sequelize.close();
  });

  beforeEach(async () => {
    // Clean up data before each test - order matters due to foreign key constraints
    await Assignment.destroy({ where: {}, force: true });
    await Checklist.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });
  });

  describe('Checklist Model', () => {
    it('should create a new checklist with valid data', async () => {
      const checklistData = {
        filename: 'test_checklist.html',
        title: 'Test Checklist',
        type: 'daily',
        order: 1,
      };
      const checklist = await Checklist.create(checklistData);
      expect(checklist.id).toBeDefined();
      expect(checklist.filename).toBe(checklistData.filename);
      expect(checklist.title).toBe(checklistData.title);
      expect(checklist.type).toBe(checklistData.type);
      expect(checklist.order).toBe(checklistData.order);
    });

    it('should not create a checklist with missing required fields', async () => {
        await expect(Checklist.create({})).rejects.toThrow();
    });
  });

  describe('Assignment Model', () => {
    it('should create a new assignment with valid data and associations', async () => {
      // Create a user and a checklist to associate with the assignment
      const user = await User.create({
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        passwordHash: 'password123',
        securityQuestion1Id: 1,
        securityAnswer1Hash: 'answer1',
        securityQuestion2Id: 2,
        securityAnswer2Hash: 'answer2',
      });
      const checklist = await Checklist.create({
        filename: 'another_checklist.html',
        title: 'Another Checklist',
        type: 'weekly',
        order: 2,
      });

      const assignmentData = {
        userId: user.id,
        checklistId: checklist.id,
      };
      const assignment = await Assignment.create(assignmentData);
      expect(assignment.id).toBeDefined();
      expect(assignment.status).toBe('assigned');

      // Check associations
      const associatedUser = await assignment.getUser();
      const associatedChecklist = await assignment.getChecklist();
      expect(associatedUser.id).toBe(user.id);
      expect(associatedChecklist.id).toBe(checklist.id);
    });
  });
});