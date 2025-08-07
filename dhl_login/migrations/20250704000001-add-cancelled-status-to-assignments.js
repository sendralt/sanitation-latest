'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // For SQLite, enum values are not enforced at the database level
    // The 'cancelled' status is already defined in the model
    // No database changes needed for SQLite
    console.log('SQLite detected - enum values are handled at the application level');
  },

  async down(queryInterface, Sequelize) {
    // Note: PostgreSQL doesn't support removing enum values directly
    // This would require recreating the enum type, which is complex
    // For SQLite, this migration might not be necessary as it doesn't enforce enums strictly
    console.log('Rollback not implemented - PostgreSQL does not support removing enum values');
  }
};
