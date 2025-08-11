module.exports = async () => {
  process.env.NODE_ENV = 'test';
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'test-secret-for-jest';
  }
  if (!process.env.SESSION_SECRET) {
    process.env.SESSION_SECRET = 'test-session-secret-for-jest';
  }
  // Disable rate limiting for tests
  process.env.DISABLE_RATE_LIMIT = 'true';

  // Ensure database file directory exists (for sqlite storage)
  const fs = require('fs');
  const path = require('path');
  const dbDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  // Initialize Sequelize and sync schema
  const sequelize = require('../config/sequelize');
  await sequelize.sync({ force: true });
};

