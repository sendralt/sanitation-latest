// sync-db.js
const sequelize = require('./config/sequelize');
const { User, Checklist, Assignment } = require('./models'); // Load all models

async function syncDatabase() {
  try {
    await sequelize.authenticate();
    console.log('Connection to the database has been established successfully.');

    // Sync all models - order matters due to foreign key relationships
    await User.sync({ alter: true });
    console.log('User table has been successfully synced/created.');

    await Checklist.sync({ alter: true });
    console.log('Checklist table has been successfully synced/created.');

    await Assignment.sync({ alter: true });
    console.log('Assignment table has been successfully synced/created.');

  } catch (error) {
    console.error('Unable to connect to the database or sync tables:', error);
  } finally {
    // Close the database connection
    await sequelize.close();
    console.log('Database connection closed.');
  }
}

syncDatabase();