const { User, Checklist, Assignment } = require('../models');

// Instead of mocking, let's test the actual function
const { assignNextChecklist, getCurrentAssignments } = require('../utils/assignmentLogic');

describe('assignNextChecklist', () => {
  let user;

  beforeEach(async () => {
    // Clean up data before each test - order matters due to foreign key constraints
    await Assignment.destroy({ where: {}, force: true });
    await Checklist.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });

    user = await User.create({
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      passwordHash: 'hashedpassword123',
      securityQuestion1Id: 1,
      securityAnswer1Hash: 'hashedanswer1',
      securityQuestion2Id: 2,
      securityAnswer2Hash: 'hashedanswer2',
    });
  });

  it('should assign a checklist to a user when one is available', async () => {
    // Create a test checklist
    const checklist = await Checklist.create({
      filename: 'daily_checklist.html',
      title: 'Daily Checklist',
      type: 'daily',
      order: 1,
    });

    // Call the assignment function
    const result = await assignNextChecklist(user);

    // Verify an assignment was created
    expect(result).not.toBeNull();
    expect(result.userId).toBe(user.id);
    expect(result.checklistId).toBe(checklist.id);
    expect(result.assignedAt).toBeInstanceOf(Date);

    // Verify the checklist's lastAssignedAt was updated
    await checklist.reload();
    expect(checklist.lastAssignedAt).toBeInstanceOf(Date);
  });

  it('should return null when no checklist is available', async () => {
    // Don't create any checklists
    const result = await assignNextChecklist(user);

    // Should return null when no checklists exist
    expect(result).toBeNull();
  });

  it('should assign the oldest unassigned checklist first', async () => {
    // Create two checklists
    const checklist1 = await Checklist.create({
      filename: 'checklist1.html',
      title: 'Checklist 1',
      type: 'daily',
      order: 1,
      lastAssignedAt: new Date('2023-01-01'), // Older assignment
    });

    const checklist2 = await Checklist.create({
      filename: 'checklist2.html',
      title: 'Checklist 2',
      type: 'daily',
      order: 2,
      lastAssignedAt: null, // Never assigned
    });

    // Call the assignment function
    const result = await assignNextChecklist(user);

    // Should assign checklist2 (never assigned takes priority)
    expect(result.checklistId).toBe(checklist2.id);
  });

  it('should not assign multiple assignments to the same user (mixed types)', async () => {
    // Create a daily checklist
    const dailyChecklist = await Checklist.create({
      filename: 'daily_checklist.html',
      title: 'Daily Checklist',
      type: 'daily',
      order: 1,
    });

    // Create a quarterly checklist
    const quarterlyChecklist = await Checklist.create({
      filename: 'quarterly_checklist.html',
      title: 'Quarterly Checklist',
      type: 'quarterly',
      order: 2,
    });

    // Manually assign quarterly checklist first (simulating admin assignment)
    const manualAssignment = await Assignment.create({
      userId: user.id,
      checklistId: quarterlyChecklist.id,
      assignedAt: new Date(),
      status: 'assigned'
    });

    // Now try automatic assignment (should not create a new assignment)
    const result = await assignNextChecklist(user);

    // Should return the existing assignment, not create a new one
    expect(result).not.toBeNull();
    expect(result.id).toBe(manualAssignment.id);
    expect(result.checklistId).toBe(quarterlyChecklist.id);

    // Verify only one assignment exists
    const allAssignments = await Assignment.findAll({
      where: { userId: user.id, status: 'assigned' }
    });
    expect(allAssignments.length).toBe(1);
  });

  it('should NOT assign a new checklist if user already has an active assignment', async () => {
    // Create a test checklist
    const checklist = await Checklist.create({
      filename: 'existing_checklist.html',
      title: 'Existing Checklist',
      type: 'daily',
      order: 1,
    });

    // Create an existing active assignment for the user
    const existingAssignment = await Assignment.create({
      userId: user.id,
      checklistId: checklist.id,
      assignedAt: new Date(),
      completedAt: null, // Still active/incomplete
    });

    // Create another checklist that could be assigned
    const anotherChecklist = await Checklist.create({
      filename: 'another_checklist.html',
      title: 'Another Checklist',
      type: 'daily',
      order: 2,
    });

    // Call the assignment function
    const result = await assignNextChecklist(user);

    // Should return the existing assignment, not create a new one
    expect(result).not.toBeNull();
    expect(result.id).toBe(existingAssignment.id);
    expect(result.checklistId).toBe(checklist.id);

    // Verify no new assignment was created
    const allAssignments = await Assignment.findAll({ where: { userId: user.id } });
    expect(allAssignments.length).toBe(1); // Should still be only 1 assignment
  });

  it('should assign a new checklist if user has completed their previous assignment', async () => {
    // Create a test checklist
    const checklist1 = await Checklist.create({
      filename: 'completed_checklist.html',
      title: 'Completed Checklist',
      type: 'daily',
      order: 1,
      lastAssignedAt: new Date(Date.now() - 86400000), // Assigned yesterday
    });

    // Create a completed assignment for the user
    await Assignment.create({
      userId: user.id,
      checklistId: checklist1.id,
      assignedAt: new Date(Date.now() - 86400000), // Yesterday
      completedAt: new Date(), // Completed today
    });

    // Create another checklist that can be assigned (never assigned, so it should be picked first)
    const checklist2 = await Checklist.create({
      filename: 'new_checklist.html',
      title: 'New Checklist',
      type: 'daily',
      order: 2,
      lastAssignedAt: null, // Never assigned - should be picked first
    });

    // Call the assignment function
    const result = await assignNextChecklist(user);

    // Should create a new assignment since the previous one is completed
    expect(result).not.toBeNull();
    expect(result.checklistId).toBe(checklist2.id);

    // Verify we now have 2 assignments total (1 completed, 1 active)
    const allAssignments = await Assignment.findAll({ where: { userId: user.id } });
    expect(allAssignments.length).toBe(2);
  });

  it('should NOT assign checklists to admin users', async () => {
    // Create an admin user
    const adminUser = await User.create({
      username: 'adminuser',
      firstName: 'Admin',
      lastName: 'User',
      passwordHash: 'hashedpassword123',
      securityQuestion1Id: 1,
      securityAnswer1Hash: 'hashedanswer1',
      securityQuestion2Id: 2,
      securityAnswer2Hash: 'hashedanswer2',
      isAdmin: true, // This is the key difference
    });

    // Create a test checklist that would normally be assigned
    const checklist = await Checklist.create({
      filename: 'admin_test_checklist.html',
      title: 'Admin Test Checklist',
      type: 'daily',
      order: 1,
    });

    // Call the assignment function for the admin user
    const result = await assignNextChecklist(adminUser);

    // Should return null for admin users
    expect(result).toBeNull();

    // Verify no assignment was created for the admin user
    const adminAssignments = await Assignment.findAll({ where: { userId: adminUser.id } });
    expect(adminAssignments.length).toBe(0);

    // Verify the checklist's lastAssignedAt was NOT updated
    await checklist.reload();
    expect(checklist.lastAssignedAt).toBeNull();
  });
});

describe('getCurrentAssignments date filtering', () => {
  let user1, user2, checklist1, checklist2;
  let testAssignmentIds = []; // Track our test assignments for cleanup

  beforeEach(async () => {
    // Create test users with unique usernames
    const timestamp = Date.now();
    user1 = await User.create({
      username: `datetest1_${timestamp}`,
      firstName: 'User',
      lastName: 'One',
      passwordHash: 'password123',
      securityQuestion1Id: 1,
      securityAnswer1Hash: 'answer1',
      securityQuestion2Id: 2,
      securityAnswer2Hash: 'answer2',
    });

    user2 = await User.create({
      username: `datetest2_${timestamp}`,
      firstName: 'User',
      lastName: 'Two',
      passwordHash: 'password123',
      securityQuestion1Id: 1,
      securityAnswer1Hash: 'answer1',
      securityQuestion2Id: 2,
      securityAnswer2Hash: 'answer2',
    });

    // Create test checklists with unique filenames
    checklist1 = await Checklist.create({
      filename: `datetest1_${timestamp}.html`,
      title: `Date Test Checklist 1 ${timestamp}`,
      type: 'daily',
      order: 1,
    });

    checklist2 = await Checklist.create({
      filename: `datetest2_${timestamp}.html`,
      title: `Date Test Checklist 2 ${timestamp}`,
      type: 'weekly',
      order: 2,
    });
  });

  afterEach(async () => {
    // Clean up test assignments
    if (testAssignmentIds.length > 0) {
      await Assignment.destroy({
        where: { id: testAssignmentIds }
      });
      testAssignmentIds = [];
    }
  });

  it('should filter assignments by date range', async () => {
    // Create assignments on specific dates for testing
    const testDate1 = new Date('2025-01-01T10:00:00Z'); // Jan 1
    const testDate2 = new Date('2025-01-02T10:00:00Z'); // Jan 2
    const testDate3 = new Date('2025-01-03T10:00:00Z'); // Jan 3

    // Assignment from Jan 1
    const assignment1 = await Assignment.create({
      userId: user1.id,
      checklistId: checklist1.id,
      assignedAt: testDate1,
      status: 'assigned'
    });
    testAssignmentIds.push(assignment1.id);

    // Assignment from Jan 2
    const assignment2 = await Assignment.create({
      userId: user2.id,
      checklistId: checklist2.id,
      assignedAt: testDate2,
      status: 'assigned'
    });
    testAssignmentIds.push(assignment2.id);

    // Assignment from Jan 3
    const assignment3 = await Assignment.create({
      userId: user1.id,
      checklistId: checklist1.id,
      assignedAt: testDate3,
      status: 'completed',
      completedAt: testDate3
    });
    testAssignmentIds.push(assignment3.id);

    // Test 1: Filter from Jan 2 onwards (should get Jan 2 and Jan 3)
    const fromJan2Results = await getCurrentAssignments({
      dateFrom: '2025-01-02'
    });
    const ourFromJan2Results = fromJan2Results.filter(a =>
      testAssignmentIds.includes(a.id)
    );
    expect(ourFromJan2Results.length).toBe(2);

    // Test 2: Filter up to Jan 2 (should get Jan 1 and Jan 2)
    const upToJan2Results = await getCurrentAssignments({
      dateTo: '2025-01-02'
    });
    const ourUpToJan2Results = upToJan2Results.filter(a =>
      testAssignmentIds.includes(a.id)
    );
    expect(ourUpToJan2Results.length).toBe(2);

    // Test 3: Filter only Jan 2 (should get only Jan 2)
    const onlyJan2Results = await getCurrentAssignments({
      dateFrom: '2025-01-02',
      dateTo: '2025-01-02'
    });
    const ourOnlyJan2Results = onlyJan2Results.filter(a =>
      testAssignmentIds.includes(a.id)
    );
    expect(ourOnlyJan2Results.length).toBe(1);
    expect(ourOnlyJan2Results[0].userId).toBe(user2.id);
  });
});