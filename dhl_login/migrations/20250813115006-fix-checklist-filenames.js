'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Update incorrect filenames to match actual files
    await queryInterface.bulkUpdate('Checklists',
      { filename: '13_All_Cells_Weekly_Wet_Mop.html' },
      { filename: '13_All_Cells_Weekly.html' }
    );

    await queryInterface.bulkUpdate('Checklists',
      { filename: '14_All_Cells_Weekly_Floor_Scrub.html' },
      { filename: '14_All_Cells_Weekly.html' }
    );
  },

  async down (queryInterface, Sequelize) {
    // Revert the filename changes
    await queryInterface.bulkUpdate('Checklists',
      { filename: '13_All_Cells_Weekly.html' },
      { filename: '13_All_Cells_Weekly_Wet_Mop.html' }
    );

    await queryInterface.bulkUpdate('Checklists',
      { filename: '14_All_Cells_Weekly.html' },
      { filename: '14_All_Cells_Weekly_Floor_Scrub.html' }
    );
  }
};
