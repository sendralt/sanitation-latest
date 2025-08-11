const { User, Checklist, Assignment } = require('../models');
const {
  manuallyAssignChecklist,
  getAssignableUsers,
  getAvailableChecklists,
  getCurrentAssignments
} = require('../utils/assignmentLogic');

describe('Manual Assignment Feature', () => {
  let adminUser, regularUser, regularUser2, checklist1, checklist2;

  beforeEach(async () => {
    // Clean up data before each test
    await Assignment.destroy({ where: {}, force: true });
    await Checklist.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });

    // Create test users
    adminUser = await User.create({
      username: 'admin',
      firstName: 'Admin',
      lastName: 'User',
      passwordHash: 'hashedpassword123',
      securityQuestion1Id: 1,
      securityAnswer1Hash: 'hashedanswer1',
      securityQuestion2Id: 2,
      securityAnswer2Hash: 'hashedanswer2',
      isAdmin: true
    });

    regularUser = await User.create({
      username: 'user1',
      firstName: 'Regular',
      lastName: 'User',
      passwordHash: 'hashedpassword123',
      securityQuestion1Id: 1,
      securityAnswer1Hash: 'hashedanswer1',
      securityQuestion2Id: 2,
      securityAnswer2Hash: 'hashedanswer2',
      isAdmin: false
    });

    regularUser2 = await User.create({
      username: 'user2',
      firstName: 'Another',
      lastName: 'User',
      passwordHash: 'hashedpassword123',
      securityQuestion1Id: 1,
      securityAnswer1Hash: 'hashedanswer1',
      securityQuestion2Id: 2,
      securityAnswer2Hash: 'hashedanswer2',
      isAdmin: false
    });

    // Create test checklists
    checklist1 = await Checklist.create({
      title: 'Daily Cleaning Checklist',
      filename: 'daily_cleaning.json',
      type: 'daily',
      order: 1
    });

    checklist2 = await Checklist.create({
      title: 'Weekly Maintenance Checklist',
      filename: 'weekly_maintenance.json',
      type: 'weekly',
      order: 1
    });
  });

  describe('manuallyAssignChecklist', () => {
    test('should successfully assign checklist to user', async () => {
      const result = await manuallyAssignChecklist({
        userId: regularUser.id,
        checklistId: checklist1.id,
        adminUserId: adminUser.id,
        overrideExisting: false
      });

      expect(result.success).toBe(true);
      expect(result.assignment).toBeDefined();
      expect(result.assignment.userId).toBe(regularUser.id);
      expect(result.assignment.checklistId).toBe(checklist1.id);
      expect(result.assignment.assignedByUserId).toBe(adminUser.id);
      expect(result.assignment.status).toBe('assigned');
      expect(result.message).toContain('Successfully assigned');
      expect(result.overridePerformed).toBe(false);
    });

    test('should fail with missing required parameters', async () => {
      const result = await manuallyAssignChecklist({
        userId: null,
        checklistId: checklist1.id,
        adminUserId: adminUser.id
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required parameters');
    });

    test('should fail with invalid UUID format', async () => {
      const result = await manuallyAssignChecklist({
        userId: 'invalid-uuid',
        checklistId: checklist1.id,
        adminUserId: adminUser.id
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid userId format');
    });

    test('should fail when admin user does not exist', async () => {
      const fakeAdminId = '12345678-1234-4234-8234-123456789abc'; // Valid UUID v4 format but non-existent
      const result = await manuallyAssignChecklist({
        userId: regularUser.id,
        checklistId: checklist1.id,
        adminUserId: fakeAdminId
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Admin user not found');
    });

    test('should fail when admin user is not actually admin', async () => {
      const result = await manuallyAssignChecklist({
        userId: regularUser2.id,
        checklistId: checklist1.id,
        adminUserId: regularUser.id // Regular user trying to act as admin
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('User does not have admin privileges');
    });

    test('should fail when target user does not exist', async () => {
      const fakeUserId = '12345678-1234-4234-8234-123456789abc'; // Valid UUID v4 format but non-existent
      const result = await manuallyAssignChecklist({
        userId: fakeUserId,
        checklistId: checklist1.id,
        adminUserId: adminUser.id
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Target user not found');
    });

    test('should fail when trying to assign to admin user', async () => {
      // Create another admin user to avoid the self-assignment check
      const adminUser2 = await User.create({
        username: 'admin2',
        firstName: 'Admin2',
        lastName: 'User',
        passwordHash: 'hashedpassword123',
        securityQuestion1Id: 1,
        securityAnswer1Hash: 'hashedanswer1',
        securityQuestion2Id: 2,
        securityAnswer2Hash: 'hashedanswer2',
        isAdmin: true
      });

      const result = await manuallyAssignChecklist({
        userId: adminUser2.id,
        checklistId: checklist1.id,
        adminUserId: adminUser.id
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot assign checklists to admin users');
    });

    test('should fail when admin tries to assign to themselves', async () => {
      // Create a non-admin user to act as admin for this test
      const adminUser2 = await User.create({
        username: 'admin2',
        firstName: 'Admin2',
        lastName: 'User',
        passwordHash: 'hashedpassword123',
        securityQuestion1Id: 1,
        securityAnswer1Hash: 'hashedanswer1',
        securityQuestion2Id: 2,
        securityAnswer2Hash: 'hashedanswer2',
        isAdmin: true
      });

      const result = await manuallyAssignChecklist({
        userId: adminUser2.id,
        checklistId: checklist1.id,
        adminUserId: adminUser2.id
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Administrators cannot assign checklists to themselves');
    });

    test('should fail when checklist does not exist', async () => {
      const fakeChecklistId = '12345678-1234-4234-8234-123456789abc'; // Valid UUID v4 format but non-existent
      const result = await manuallyAssignChecklist({
        userId: regularUser.id,
        checklistId: fakeChecklistId,
        adminUserId: adminUser.id
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Checklist not found');
    });

    test('should fail when user already has active assignment without override', async () => {
      // First assignment
      await manuallyAssignChecklist({
        userId: regularUser.id,
        checklistId: checklist1.id,
        adminUserId: adminUser.id
      });

      // Second assignment should fail
      const result = await manuallyAssignChecklist({
        userId: regularUser.id,
        checklistId: checklist2.id,
        adminUserId: adminUser.id,
        overrideExisting: false
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('already has an active assignment');
      expect(result.existingAssignment).toBeDefined();
    });

    test('should succeed when overriding existing assignment', async () => {
      // First assignment
      await manuallyAssignChecklist({
        userId: regularUser.id,
        checklistId: checklist1.id,
        adminUserId: adminUser.id
      });

      // Second assignment with override should succeed
      const result = await manuallyAssignChecklist({
        userId: regularUser.id,
        checklistId: checklist2.id,
        adminUserId: adminUser.id,
        overrideExisting: true
      });

      expect(result.success).toBe(true);
      expect(result.overridePerformed).toBe(true);
      expect(result.assignment.checklistId).toBe(checklist2.id);

      // Check that the old assignment was cancelled
      const oldAssignment = await Assignment.findOne({
        where: { userId: regularUser.id, checklistId: checklist1.id }
      });
      expect(oldAssignment.status).toBe('cancelled');
    });

    test('should prevent assigning same checklist that is already active', async () => {
      // First assignment
      await manuallyAssignChecklist({
        userId: regularUser.id,
        checklistId: checklist1.id,
        adminUserId: adminUser.id
      });

      // Try to assign same checklist again
      const result = await manuallyAssignChecklist({
        userId: regularUser.id,
        checklistId: checklist1.id,
        adminUserId: adminUser.id,
        overrideExisting: false
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('already has an active assignment');
    });

    test('should put cancelled checklist back into assignment queue', async () => {
      // Set up initial state - checklist1 has been assigned recently
      await checklist1.update({ lastAssignedAt: new Date() });

      // Create initial assignment
      await manuallyAssignChecklist({
        userId: regularUser.id,
        checklistId: checklist1.id,
        adminUserId: adminUser.id
      });

      // Verify checklist1 has lastAssignedAt timestamp
      await checklist1.reload();
      expect(checklist1.lastAssignedAt).not.toBeNull();
      const originalAssignedAt = checklist1.lastAssignedAt;

      // Cancel the assignment by overriding with a different checklist
      const result = await manuallyAssignChecklist({
        userId: regularUser.id,
        checklistId: checklist2.id,
        adminUserId: adminUser.id,
        overrideExisting: true
      });

      expect(result.success).toBe(true);
      expect(result.overridePerformed).toBe(true);

      // Check that the cancelled checklist is back in the assignment queue
      await checklist1.reload();
      expect(checklist1.lastAssignedAt).toBeNull();

      // Verify the cancelled assignment exists and is marked as cancelled
      const cancelledAssignment = await Assignment.findOne({
        where: { userId: regularUser.id, checklistId: checklist1.id, status: 'cancelled' }
      });
      expect(cancelledAssignment).not.toBeNull();
      expect(cancelledAssignment.status).toBe('cancelled');
      expect(cancelledAssignment.validatedByUserId).toBe(adminUser.id);

      // Verify the new assignment is active
      const activeAssignment = await Assignment.findOne({
        where: { userId: regularUser.id, checklistId: checklist2.id, status: 'assigned' }
      });
      expect(activeAssignment).not.toBeNull();
      expect(activeAssignment.status).toBe('assigned');
    });

    test('should remove cancelled assignments from user dashboard', async () => {
      // Create initial assignment
      await manuallyAssignChecklist({
        userId: regularUser.id,
        checklistId: checklist1.id,
        adminUserId: adminUser.id
      });

      // Verify assignment appears on dashboard (completedAt: null AND status: assigned)
      let dashboardAssignments = await Assignment.findAll({
        where: {
          userId: regularUser.id,
          completedAt: null, // Dashboard query condition
          status: 'assigned' // Exclude cancelled assignments from dashboard
        }
      });
      expect(dashboardAssignments.length).toBe(1);
      expect(dashboardAssignments[0].checklistId).toBe(checklist1.id);
      expect(dashboardAssignments[0].status).toBe('assigned');

      // Cancel the assignment by overriding
      await manuallyAssignChecklist({
        userId: regularUser.id,
        checklistId: checklist2.id,
        adminUserId: adminUser.id,
        overrideExisting: true
      });

      // Check dashboard again - should only show the new assignment
      dashboardAssignments = await Assignment.findAll({
        where: {
          userId: regularUser.id,
          completedAt: null, // Dashboard query condition
          status: 'assigned' // Exclude cancelled assignments from dashboard
        }
      });
      expect(dashboardAssignments.length).toBe(1);
      expect(dashboardAssignments[0].checklistId).toBe(checklist2.id);
      expect(dashboardAssignments[0].status).toBe('assigned');

      // Verify cancelled assignment still exists but doesn't appear on dashboard
      const allUserAssignments = await Assignment.findAll({
        where: { userId: regularUser.id }
      });
      expect(allUserAssignments.length).toBe(2); // One cancelled, one active

      const cancelledAssignment = allUserAssignments.find(a => a.status === 'cancelled');
      expect(cancelledAssignment).not.toBeNull();
      expect(cancelledAssignment.checklistId).toBe(checklist1.id);
    });
  });

  describe('getAssignableUsers', () => {
    test('should return only non-admin users', async () => {
      const users = await getAssignableUsers();
      
      expect(users).toHaveLength(2);
      expect(users.every(user => !user.isAdmin)).toBe(true);
      expect(users.map(u => u.username)).toContain('user1');
      expect(users.map(u => u.username)).toContain('user2');
      expect(users.map(u => u.username)).not.toContain('admin');
    });
  });

  describe('getAvailableChecklists', () => {
    test('should return all checklists when no type filter', async () => {
      const checklists = await getAvailableChecklists();
      
      expect(checklists).toHaveLength(2);
      expect(checklists.map(c => c.title)).toContain('Daily Cleaning Checklist');
      expect(checklists.map(c => c.title)).toContain('Weekly Maintenance Checklist');
    });

    test('should filter checklists by type', async () => {
      const dailyChecklists = await getAvailableChecklists('daily');
      
      expect(dailyChecklists).toHaveLength(1);
      expect(dailyChecklists[0].title).toBe('Daily Cleaning Checklist');
      expect(dailyChecklists[0].type).toBe('daily');
    });
  });

  describe('getCurrentAssignments', () => {
    test('should return assignments with proper associations', async () => {
      // Create an assignment
      await manuallyAssignChecklist({
        userId: regularUser.id,
        checklistId: checklist1.id,
        adminUserId: adminUser.id
      });

      const assignments = await getCurrentAssignments();
      
      expect(assignments).toHaveLength(1);
      expect(assignments[0].user).toBeDefined();
      expect(assignments[0].checklist).toBeDefined();
      expect(assignments[0].assignedBy).toBeDefined();
      expect(assignments[0].user.username).toBe('user1');
      expect(assignments[0].checklist.title).toBe('Daily Cleaning Checklist');
      expect(assignments[0].assignedBy.username).toBe('admin');
    });

    test('should filter assignments by status', async () => {
      // Create assignments with different statuses
      const assignment1 = await manuallyAssignChecklist({
        userId: regularUser.id,
        checklistId: checklist1.id,
        adminUserId: adminUser.id
      });

      // Mark one as completed
      await Assignment.update(
        { status: 'completed', completedAt: new Date() },
        { where: { id: assignment1.assignment.id } }
      );

      // Create another active assignment
      await manuallyAssignChecklist({
        userId: regularUser2.id,
        checklistId: checklist2.id,
        adminUserId: adminUser.id
      });

      const activeAssignments = await getCurrentAssignments({ activeOnly: true });
      const allAssignments = await getCurrentAssignments();

      expect(activeAssignments).toHaveLength(1);
      expect(allAssignments).toHaveLength(2);
      expect(activeAssignments[0].status).toBe('assigned');
    });
  });
});
