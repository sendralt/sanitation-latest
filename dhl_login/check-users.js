// Script to check what users exist in the database
const sequelize = require('./config/sequelize');
const { User } = require('./models');

async function checkUsers() {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');

    // Get all users
    const users = await User.findAll({
      attributes: ['id', 'username', 'firstName', 'lastName', 'isAdmin', 'createdAt'],
      order: [['createdAt', 'ASC']]
    });

    console.log(`\n📊 Found ${users.length} users in the database:\n`);

    // Also check specifically for behm.k
    const behmUser = await User.findOne({ where: { username: 'behm.k' } });
    if (behmUser) {
      console.log('✅ Found behm.k user');
    } else {
      console.log('❌ No user named "behm.k" found');
    }

    if (users.length === 0) {
      console.log('❌ No users found in the database!');
      console.log('\n💡 You may need to:');
      console.log('1. Run the seeders: npx sequelize-cli db:seed:all');
      console.log('2. Or create an admin user manually');
    } else {
      users.forEach((user, index) => {
        console.log(`${index + 1}. Username: ${user.username}`);
        console.log(`   Name: ${user.firstName} ${user.lastName}`);
        console.log(`   Admin: ${user.isAdmin ? 'YES' : 'NO'}`);
        console.log(`   Created: ${user.createdAt}`);
        console.log(`   ID: ${user.id}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

// Run the check
checkUsers();
