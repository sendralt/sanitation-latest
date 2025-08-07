const request = require('supertest');
const app = require('../app');
const sequelize = require('../config/sequelize');
const { User, Checklist, Assignment } = require('../models');
const { hashPassword } = require('../utils/auth');

jest.mock('../utils/assignmentLogic', () => ({
  assignNextChecklist: jest.fn(),
}));

const { assignNextChecklist } = require('../utils/assignmentLogic');

describe('POST /login-page', () => {
  let user;

  beforeAll(async () => {
    // Connect to the database and sync the models
    await sequelize.authenticate();
    await sequelize.sync({ force: true });
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

    // Hash the password properly for testing
    const hashedPassword = await hashPassword('password');

    user = await User.create({
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      passwordHash: hashedPassword,
      securityQuestion1Id: 1,
      securityAnswer1Hash: 'hashedanswer1',
      securityQuestion2Id: 2,
      securityAnswer2Hash: 'hashedanswer2',
    });
  });

  it('should call assignNextChecklist on successful login', async () => {
    assignNextChecklist.mockResolvedValue(true);

    const response = await request(app)
      .post('/login-page')
      .send({ username: 'testuser', password: 'password' });

    expect(response.status).toBe(302);
    expect(assignNextChecklist).toHaveBeenCalled();
  });
});