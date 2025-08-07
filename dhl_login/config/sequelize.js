const { Sequelize } = require('sequelize');
const path = require('path');

// Load the configuration
// Sequelize CLI typically uses a config.json or config.js.
// We created config/config.json
const config = require(path.join(__dirname, 'config.json'));

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

let sequelize;

if (dbConfig) {
  sequelize = new Sequelize({
    dialect: dbConfig.dialect,
    storage: path.resolve(__dirname, '..', dbConfig.storage), // Ensure path is absolute or relative to project root
    logging: env === 'development' ? console.log : false, // Log SQL queries in development
  });
} else {
  throw new Error(`Configuration for environment "${env}" not found in config/config.json`);
}

module.exports = sequelize;