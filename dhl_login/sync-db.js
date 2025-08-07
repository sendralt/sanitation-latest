// sync-db.js
const sequelize = require('./config/sequelize');
const User = require('./models/user'); // Make sure User model is loaded

async function syncDatabase() {
  try {
    await sequelize.authenticate();
    console.log('Connection to the database has been established successfully.');

    // User.sync({ force: true }) will drop the table if it already exists.
    // User.sync({ alter: true }) attempts to alter the table to match the model.
    // For initial setup, alter: true or just .sync() is fine.
    await User.sync({ alter: true });
    console.log('User table has been successfully synced/created.');

  } catch (error) {
    console.error('Unable to connect to the database or sync the User table:', error);
  } finally {
    // Close the database connection
    await sequelize.close();
    console.log('Database connection closed.');
  }
}

syncDatabase();