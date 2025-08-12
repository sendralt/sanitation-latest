module.exports = async () => {
  const sequelize = require('../config/sequelize');
  try {
    await sequelize.close();
  } catch (e) {
    // ignore if already closed
  }
};

