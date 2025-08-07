'use strict';
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const checklistsDir = path.join(__dirname, '../../Public/checklists');

function getTypeFromFilename(filename) {
  if (filename.toLowerCase().includes('daily')) return 'daily';
  if (filename.toLowerCase().includes('weekly')) return 'weekly';
  if (filename.toLowerCase().includes('quarterly')) return 'quarterly';
  return null;
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const checklistFiles = fs.readdirSync(checklistsDir);
    const checklists = [];

    for (const file of checklistFiles) {
      const order = parseInt(file.split('_')[0], 10);
      const title = file.replace('.html', '').split('_').slice(1).join(' ');
      const type = getTypeFromFilename(file);

      if (type) {
        checklists.push({
          id: uuidv4(),
          filename: file,
          title,
          type,
          order,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    await queryInterface.bulkInsert('Checklists', checklists, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Checklists', null, {});
  }
};
