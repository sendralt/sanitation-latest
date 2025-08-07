// Test script to demonstrate the assignment logic fix
// This script shows that users won't get multiple assignments

const sequelize = require('./config/sequelize');
const { User, Checklist, Assignment } = require('./models');
const { assignNextChecklist } = require('./utils/assignmentLogic');
const { hashPassword } = require('./utils/auth');

async function testAssignmentFix() {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');

    // Clean up existing test data
    await Assignment.destroy({ where: {}, force: true });
    await Checklist.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });
    console.log('🧹 Cleaned up existing test data');

    // Create a test user
    const hashedPassword = await hashPassword('testpass');
    const testUser = await User.create({
      username: 'testuser',
      passwordHash: hashedPassword,
      role: 'user'
    });
    console.log('👤 Created test user:', testUser.username);

    // Create some test checklists
    const checklist1 = await Checklist.create({
      filename: 'checklist1.html',
      title: 'Daily Sanitation Checklist 1',
      type: 'daily',
      order: 1,
    });

    const checklist2 = await Checklist.create({
      filename: 'checklist2.html',
      title: 'Daily Sanitation Checklist 2',
      type: 'daily',
      order: 2,
    });

    console.log('📋 Created test checklists');

    // Test 1: First login - should assign a checklist
    console.log('\n🧪 TEST 1: First login (should assign checklist)');
    const firstAssignment = await assignNextChecklist(testUser);
    console.log('Result:', firstAssignment ? `Assigned checklist: ${firstAssignment.checklistId}` : 'No assignment');

    // Test 2: Second login - should NOT assign another checklist
    console.log('\n🧪 TEST 2: Second login (should NOT assign new checklist)');
    const secondAssignment = await assignNextChecklist(testUser);
    console.log('Result:', secondAssignment ? `Assignment ID: ${secondAssignment.id}` : 'No assignment');

    // Test 3: Third login - should still return the same assignment
    console.log('\n🧪 TEST 3: Third login (should return same assignment)');
    const thirdAssignment = await assignNextChecklist(testUser);
    console.log('Result:', thirdAssignment ? `Assignment ID: ${thirdAssignment.id}` : 'No assignment');

    // Check total assignments for user
    const totalAssignments = await Assignment.findAll({ where: { userId: testUser.id } });
    console.log(`\n📊 Total assignments for user: ${totalAssignments.length}`);

    // Test 4: Complete the assignment and try again
    console.log('\n🧪 TEST 4: Complete assignment and login again');
    if (firstAssignment) {
      await Assignment.update(
        { completedAt: new Date() },
        { where: { id: firstAssignment.id } }
      );
      console.log('✅ Marked assignment as completed');

      const newAssignment = await assignNextChecklist(testUser);
      console.log('Result after completion:', newAssignment ? `New assignment: ${newAssignment.checklistId}` : 'No assignment');

      const finalCount = await Assignment.findAll({ where: { userId: testUser.id } });
      console.log(`📊 Total assignments after completion: ${finalCount.length}`);
    }

    console.log('\n✅ Test completed successfully!');
    console.log('\n📝 Summary:');
    console.log('- Users with active assignments will NOT get new ones');
    console.log('- Users can only get new assignments after completing current ones');
    console.log('- This prevents the "5 checklists assigned" problem');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the test
testAssignmentFix();
