const request = require('supertest');
const app = require('../app');
const { createTestUser, cleanupTestData } = require('./helpers/testHelpers');

jest.mock('../utils/assignmentLogic', () => ({
  assignNextChecklist: jest.fn(),
}));

const { assignNextChecklist } = require('../utils/assignmentLogic');

describe('POST /login-page', () => {
  let user;

  beforeEach(async () => {
    // Reset mocks
    assignNextChecklist.mockReset();

    await cleanupTestData();
    user = await createTestUser({
      username: 'testuser',
      passwordHash: await require('../utils/auth').hashPassword('password'),
    });
  });

  it('should call assignNextChecklist on successful login', async () => {
    assignNextChecklist.mockResolvedValue(true);

    const response = await request(app)
      .post('/login-page')
      .send({ username: 'testuser', password: 'password' });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/dashboard');
    expect(assignNextChecklist).toHaveBeenCalled();
  });

  it('should redirect to login on failed authentication', async () => {
    const response = await request(app)
      .post('/login-page')
      .send({ username: 'testuser', password: 'wrongpassword' });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login-page');
    expect(assignNextChecklist).not.toHaveBeenCalled();
  });
});