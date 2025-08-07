const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/sequelize');

class User extends Model {}

User.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      len: [3, 30], // Example length validation
      // Add custom validator for allowed characters if needed
      // is: /^[a-zA-Z0-9_]+$/i // Example: alphanumeric and underscore
    }
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  securityQuestion1Id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  securityAnswer1Hash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  securityQuestion2Id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  securityAnswer2Hash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  passwordResetAttemptCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
  },
  lastPasswordResetAttempt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  isAdmin: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
  // createdAt and updatedAt are automatically managed by Sequelize by default
}, {
  sequelize,
  modelName: 'User',
  // tableName: 'users', // Optional: by default, Sequelize pluralizes the model name
  timestamps: true, // This enables createdAt and updatedAt
});

module.exports = User;
