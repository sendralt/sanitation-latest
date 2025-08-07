'use strict';
const { hashPassword, hashAnswer } = require('../utils/auth'); // Adjust path if your utils/auth.js is elsewhere
const { v4: uuidv4 } = require('uuid'); // For generating UUIDs if your User model uses them for IDs

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const adminUsername = process.env.INITIAL_ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'password123'; // CHANGE THIS IN PRODUCTION
    const adminSecAnswer1 = process.env.INITIAL_ADMIN_SEC_ANSWER1 || 'Fluffy'; // Corresponds to Question ID 1
    const adminSecAnswer2 = process.env.INITIAL_ADMIN_SEC_ANSWER2 || 'Central Elementary'; // Corresponds to Question ID 3

    if (adminPassword === 'password123') {
      console.warn('\nWARNING: Initial admin password is set to the default "password123".');
      console.warn('Please change this by setting the INITIAL_ADMIN_PASSWORD environment variable for production.\n');
    }

    try {
      const hashedPassword = await hashPassword(adminPassword);
      const hashedAnswer1 = await hashAnswer(adminSecAnswer1);
      const hashedAnswer2 = await hashAnswer(adminSecAnswer2);

      // Check if the admin user already exists
      const existingAdmin = await queryInterface.rawSelect('Users', {
        where: {
          username: adminUsername,
        },
      }, ['id']);

      if (!existingAdmin) {
        await queryInterface.bulkInsert('Users', [{
          id: uuidv4(), // Generate UUID for the ID field
          username: adminUsername,
          firstName: 'Admin',
          lastName: 'User',
          passwordHash: hashedPassword,
          securityQuestion1Id: 1, // From PREDEFINED_SECURITY_QUESTIONS in utils/auth.js
          securityAnswer1Hash: hashedAnswer1,
          securityQuestion2Id: 3, // From PREDEFINED_SECURITY_QUESTIONS in utils/auth.js
          securityAnswer2Hash: hashedAnswer2,
          isAdmin: true,
          passwordResetAttemptCount: 0,
          lastPasswordResetAttempt: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }], {});
        console.log(`Admin user "${adminUsername}" created successfully.`);
      } else {
        console.log(`Admin user "${adminUsername}" already exists. Skipping creation.`);
      }
    } catch (error) {
      console.error(`Error seeding admin user: ${error.message}`);
      // If running in a transaction, you might want to throw the error to ensure rollback
      // For a simple seed like this, logging might be sufficient.
      throw error; // Re-throw to make Sequelize CLI aware of the failure
    }
  },

  async down (queryInterface, Sequelize) {
    const adminUsername = process.env.INITIAL_ADMIN_USERNAME || 'admin';
    // This will remove the admin user if the username matches.
    // Be cautious with this in production if other users might have the same username
    // or if you want more specific rollback logic.
    try {
      await queryInterface.bulkDelete('Users', { username: adminUsername, isAdmin: true }, {});
      console.log(`Admin user "${adminUsername}" deleted successfully.`);
    } catch (error) {
        console.error(`Error removing admin user: ${error.message}`);
        throw error;
    }
  }
};
