const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/sequelize');
const User = require('./user');
const Checklist = require('./checklist');

class Assignment extends Model {}

Assignment.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false,
  },
  assignedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('assigned', 'completed', 'validated', 'overdue', 'cancelled'),
    allowNull: false,
    defaultValue: 'assigned',
  },
  submissionDataFilePath: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  validationStatus: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    allowNull: true,
  },
  validatedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  assignedByUserId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'Assignment',
  timestamps: true,
});

// --- Associations ---
// An Assignment belongs to a User
Assignment.belongsTo(User, {
  foreignKey: {
    name: 'userId',
    allowNull: false,
  },
  as: 'user',
});
User.hasMany(Assignment, {
  foreignKey: {
    name: 'userId',
    allowNull: false,
  },
  as: 'assignments',
});

// An Assignment belongs to a Checklist
Assignment.belongsTo(Checklist, {
  foreignKey: {
    name: 'checklistId',
    allowNull: false,
  },
  as: 'checklist',
});
Checklist.hasMany(Assignment, {
  foreignKey: {
    name: 'checklistId',
    allowNull: false,
  },
  as: 'assignments',
});

// An Assignment can be validated by a User (Supervisor)
Assignment.belongsTo(User, {
  foreignKey: {
    name: 'validatedByUserId',
    allowNull: true, // Can be null until validated
  },
  as: 'validator',
});
User.hasMany(Assignment, {
  foreignKey: {
    name: 'validatedByUserId',
    allowNull: true,
  },
  as: 'validations',
});

// An Assignment can be assigned by a User (Admin)
Assignment.belongsTo(User, {
  foreignKey: {
    name: 'assignedByUserId',
    allowNull: true, // Can be null for automatic assignments
  },
  as: 'assignedBy',
});
User.hasMany(Assignment, {
  foreignKey: {
    name: 'assignedByUserId',
    allowNull: true,
  },
  as: 'manualAssignments',
});


module.exports = Assignment;