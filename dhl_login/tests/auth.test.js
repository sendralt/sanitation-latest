const { hashPassword, comparePassword } = require('../utils/auth');

describe('Auth Utility Functions', () => {
  it('should correctly hash a password', async () => {
    const password = 'testpassword123';
    const hashedPassword = await hashPassword(password);
    expect(hashedPassword).toBeDefined();
    expect(hashedPassword).not.toEqual(password);
  });

  it('should correctly compare a plain password with a hashed password', async () => {
    const password = 'testpassword123';
    const hashedPassword = await hashPassword(password);
    const isMatch = await comparePassword(password, hashedPassword);
    expect(isMatch).toBe(true);
  });

  it('should return false for incorrect password comparison', async () => {
    const password = 'testpassword123';
    const hashedPassword = await hashPassword(password);
    const isMatch = await comparePassword('wrongpassword', hashedPassword);
    expect(isMatch).toBe(false);
  });
});