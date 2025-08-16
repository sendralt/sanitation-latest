const { Checklist, Assignment, User } = require('../models');
const { Op } = require('sequelize');
const moment = require('moment');

async function assignNextChecklist(user) {
  // Skip checklist assignment for admin users
  if (user.isAdmin) {
    console.log(`User ${user.username} is an admin. Skipping checklist assignment.`);
    return null;
  }

  // First, check if the user already has an active assignment
  const existingAssignment = await Assignment.findOne({
    where: {
      userId: user.id,
      status: 'assigned' // Only look for active assignments (not completed, cancelled, etc.)
    },
    include: [{
      model: Checklist,
      as: 'checklist',
      attributes: ['id', 'title', 'filename', 'type']
    }],
    order: [['assignedAt', 'DESC']] // Get the most recent assignment
  });

  // If user already has an active assignment, return it (no new assignment needed)
  if (existingAssignment) {
    console.log(`User ${user.username} already has an active assignment (ID: ${existingAssignment.id}). No new assignment created.`);
    return existingAssignment;
  }

  // If no active assignment exists, proceed with assigning a new checklist
  const today = moment().startOf('day');

  const checklist = await Checklist.findOne({
    where: {
      type: 'daily',
      [Op.or]: [
        { lastAssignedAt: { [Op.is]: null } },
        { lastAssignedAt: { [Op.lt]: today.toDate() } }
      ]
    },
    order: [['lastAssignedAt', 'ASC NULLS FIRST']]
  });

  if (checklist) {
    const assignment = await Assignment.create({
      userId: user.id,
      checklistId: checklist.id,
      assignedAt: new Date(),
    });

    await checklist.update({ lastAssignedAt: new Date() });

    console.log(`New assignment created for user ${user.username}: Checklist "${checklist.title}" (ID: ${assignment.id})`);
    return assignment;
  }

  console.log(`No available checklists to assign to user ${user.username}`);
  return null;
}

/**
 * Manually assign a specific checklist to a specific user (Admin function)
 * @param {Object} options - Assignment options
 * @param {string} options.userId - ID of the user to assign checklist to
 * @param {string} options.checklistId - ID of the checklist to assign
 * @param {string} options.adminUserId - ID of the admin making the assignment
 * @param {boolean} options.overrideExisting - Whether to override existing active assignments
 * @returns {Object} Result object with success status and assignment data or error message
 */
async function manuallyAssignChecklist({ userId, checklistId, adminUserId, overrideExisting = false }) {
  try {
    // Validate that all required parameters are provided
    if (!userId || !checklistId || !adminUserId) {
      return {
        success: false,
        error: 'Missing required parameters: userId, checklistId, and adminUserId are required'
      };
    }

    // Validate parameter types and formats (basic UUID format check)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return {
        success: false,
        error: 'Invalid userId format'
      };
    }
    if (!uuidRegex.test(checklistId)) {
      return {
        success: false,
        error: 'Invalid checklistId format'
      };
    }
    if (!uuidRegex.test(adminUserId)) {
      return {
        success: false,
        error: 'Invalid adminUserId format'
      };
    }

    // Prevent self-assignment (admin assigning to themselves)
    if (userId === adminUserId) {
      return {
        success: false,
        error: 'Administrators cannot assign checklists to themselves'
      };
    }

    // Validate that the admin user exists and is actually an admin
    const adminUser = await User.findByPk(adminUserId);
    if (!adminUser) {
      return {
        success: false,
        error: 'Admin user not found'
      };
    }
    if (!adminUser.isAdmin) {
      return {
        success: false,
        error: 'User does not have admin privileges'
      };
    }

    // Validate that the target user exists and is not an admin
    const targetUser = await User.findByPk(userId);
    if (!targetUser) {
      return {
        success: false,
        error: 'Target user not found'
      };
    }
    if (targetUser.isAdmin) {
      return {
        success: false,
        error: 'Cannot assign checklists to admin users'
      };
    }

    // Validate that the checklist exists
    const checklist = await Checklist.findByPk(checklistId);
    if (!checklist) {
      return {
        success: false,
        error: 'Checklist not found'
      };
    }

    // Check if user already has an active assignment
    const existingAssignment = await Assignment.findOne({
      where: {
        userId: userId,
        status: 'assigned' // Only look for active assignments (not completed, cancelled, etc.)
      },
      include: [{
        model: Checklist,
        as: 'checklist',
        attributes: ['id', 'title', 'filename', 'type']
      }],
      order: [['assignedAt', 'DESC']]
    });

    // If there's an existing assignment and we're not overriding, return error
    if (existingAssignment && !overrideExisting) {
      return {
        success: false,
        error: `User already has an active assignment: "${existingAssignment.checklist.title}". Use override option to replace it.`,
        existingAssignment: {
          id: existingAssignment.id,
          checklistTitle: existingAssignment.checklist.title,
          assignedAt: existingAssignment.assignedAt
        }
      };
    }

    // Check if we're trying to assign the same checklist that's already active
    if (existingAssignment && existingAssignment.checklistId === checklistId && !overrideExisting) {
      return {
        success: false,
        error: `User already has this exact checklist assigned: "${existingAssignment.checklist.title}". No action needed.`,
        existingAssignment: {
          id: existingAssignment.id,
          checklistTitle: existingAssignment.checklist.title,
          assignedAt: existingAssignment.assignedAt
        }
      };
    }

    // Check for recent completion of the same checklist (within last 24 hours)
    const recentCompletion = await Assignment.findOne({
      where: {
        userId: userId,
        checklistId: checklistId,
        status: 'completed',
        completedAt: {
          [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      include: [{
        model: Checklist,
        as: 'checklist',
        attributes: ['id', 'title', 'type']
      }]
    });

    if (recentCompletion && !overrideExisting) {
      return {
        success: false,
        error: `User recently completed this checklist "${recentCompletion.checklist.title}" on ${new Date(recentCompletion.completedAt).toLocaleDateString()}. Consider assigning a different checklist or use override option.`,
        recentCompletion: {
          id: recentCompletion.id,
          checklistTitle: recentCompletion.checklist.title,
          completedAt: recentCompletion.completedAt
        }
      };
    }

    // If overriding existing assignment, mark it as cancelled
    if (existingAssignment && overrideExisting) {
      await existingAssignment.update({
        status: 'cancelled',
        validatedAt: new Date(), // Track when it was cancelled
        validatedByUserId: adminUserId // Track who cancelled it
      });

      // Reset the checklist's lastAssignedAt timestamp so it can be reassigned
      // This puts the cancelled checklist back into the assignment queue
      await existingAssignment.checklist.update({
        lastAssignedAt: null
      });

      console.log(`Admin ${adminUser.username} cancelled existing assignment (ID: ${existingAssignment.id}) for user ${targetUser.username}`);
      console.log(`Checklist "${existingAssignment.checklist.title}" has been put back into the assignment queue`);
    }

    // Create the new assignment
    const newAssignment = await Assignment.create({
      userId: userId,
      checklistId: checklistId,
      assignedAt: new Date(),
      status: 'assigned',
      assignedByUserId: adminUserId // Track who made the manual assignment
    });

    // Update the checklist's lastAssignedAt timestamp
    await checklist.update({ lastAssignedAt: new Date() });

    // Fetch the complete assignment with associations for return
    const completeAssignment = await Assignment.findByPk(newAssignment.id, {
      include: [
        {
          model: Checklist,
          as: 'checklist',
          attributes: ['id', 'title', 'filename', 'type']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'firstName', 'lastName']
        },
        {
          model: User,
          as: 'validator',
          attributes: ['id', 'username', 'firstName', 'lastName'],
          required: false
        },
        {
          model: User,
          as: 'assignedBy',
          attributes: ['id', 'username', 'firstName', 'lastName'],
          required: false
        }
      ]
    });

    console.log(`Manual assignment created by admin ${adminUser.username}: User "${targetUser.username}" assigned checklist "${checklist.title}" (Assignment ID: ${newAssignment.id})`);

    return {
      success: true,
      assignment: completeAssignment,
      message: `Successfully assigned "${checklist.title}" to ${targetUser.firstName} ${targetUser.lastName}`,
      overridePerformed: existingAssignment ? true : false
    };

  } catch (error) {
    console.error('Error in manuallyAssignChecklist:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while creating the assignment'
    };
  }
}

/**
 * Get all non-admin users available for assignment
 * @returns {Array} Array of user objects
 */
async function getAssignableUsers() {
  try {
    const users = await User.findAll({
      where: {
        isAdmin: false
      },
      attributes: ['id', 'username', 'firstName', 'lastName'],
      order: [['firstName', 'ASC'], ['lastName', 'ASC']]
    });
    return users;
  } catch (error) {
    console.error('Error fetching assignable users:', error);
    return [];
  }
}

/**
 * Get all available checklists
 * @param {string} type - Optional filter by checklist type ('daily', 'weekly', 'quarterly')
 * @returns {Array} Array of checklist objects
 */
async function getAvailableChecklists(type = null) {
  try {
    const whereClause = type ? { type } : {};
    const checklists = await Checklist.findAll({
      where: whereClause,
      attributes: ['id', 'title', 'filename', 'type', 'order', 'lastAssignedAt'],
      order: [['type', 'ASC'], ['order', 'ASC']]
    });
    return checklists;
  } catch (error) {
    console.error('Error fetching available checklists:', error);
    return [];
  }
}

/**
 * Get current assignments with optional filtering
 * @param {Object} filters - Optional filters
 * @param {string} filters.userId - Filter by user ID
 * @param {string} filters.status - Filter by assignment status
 * @param {boolean} filters.activeOnly - Only return active (incomplete) assignments
 * @param {string} filters.dateFrom - Filter assignments from this date (YYYY-MM-DD)
 * @param {string} filters.dateTo - Filter assignments to this date (YYYY-MM-DD)
 * @returns {Array} Array of assignment objects with user and checklist data
 */
async function getCurrentAssignments(filters = {}) {
  try {
    const whereClause = {};

    if (filters.userId) {
      whereClause.userId = filters.userId;
    }

    if (filters.status) {
      whereClause.status = filters.status;
    }

    if (filters.activeOnly) {
      whereClause.status = 'assigned';
    }

    // Add date range filtering
    if (filters.dateFrom || filters.dateTo) {
      whereClause.assignedAt = {};

      if (filters.dateFrom) {
        // Parse date string as local date to avoid timezone issues
        const dateParts = filters.dateFrom.split('-'); // ['2025', '01', '02']
        const fromDate = new Date(
          parseInt(dateParts[0]),
          parseInt(dateParts[1]) - 1, // Month is 0-based
          parseInt(dateParts[2]),
          0, 0, 0, 0 // Hours, minutes, seconds, milliseconds
        );
        whereClause.assignedAt[Op.gte] = fromDate;
      }

      if (filters.dateTo) {
        // Parse date string as local date to avoid timezone issues
        const dateParts = filters.dateTo.split('-'); // ['2025', '01', '02']
        const toDate = new Date(
          parseInt(dateParts[0]),
          parseInt(dateParts[1]) - 1, // Month is 0-based
          parseInt(dateParts[2]),
          23, 59, 59, 999 // End of day
        );
        whereClause.assignedAt[Op.lte] = toDate;
      }
    }

    const assignments = await Assignment.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'firstName', 'lastName', 'isAdmin'],
          where: {
            isAdmin: false // Exclude admin users from assignment results
          }
        },
        {
          model: Checklist,
          as: 'checklist',
          attributes: ['id', 'title', 'filename', 'type']
        },
        {
          model: User,
          as: 'validator',
          attributes: ['id', 'username', 'firstName', 'lastName'],
          required: false
        },
        {
          model: User,
          as: 'assignedBy',
          attributes: ['id', 'username', 'firstName', 'lastName'],
          required: false
        }
      ],
      order: [['assignedAt', 'DESC']]
    });

    return assignments;
  } catch (error) {
    console.error('Error fetching current assignments:', error);
    return [];
  }
}

module.exports = {
  assignNextChecklist,
  manuallyAssignChecklist,
  getAssignableUsers,
  getAvailableChecklists,
  getCurrentAssignments
};