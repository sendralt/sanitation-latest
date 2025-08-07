// backup-db.js - Simple database backup utility
const fs = require('fs');
const path = require('path');

function backupDatabase() {
  const dbPath = path.join(__dirname, 'data', 'auth.db');
  const backupDir = path.join(__dirname, 'data', 'backups');
  
  // Create backups directory if it doesn't exist
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  // Create backup filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `auth_backup_${timestamp}.db`);
  
  try {
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupPath);
      console.log(`✅ Database backed up to: ${backupPath}`);
      
      // Keep only the last 10 backups
      const backups = fs.readdirSync(backupDir)
        .filter(file => file.startsWith('auth_backup_'))
        .sort()
        .reverse();
      
      if (backups.length > 10) {
        const oldBackups = backups.slice(10);
        oldBackups.forEach(backup => {
          fs.unlinkSync(path.join(backupDir, backup));
          console.log(`🗑️  Removed old backup: ${backup}`);
        });
      }
      
      return backupPath;
    } else {
      console.log('❌ Database file not found, cannot create backup');
      return null;
    }
  } catch (error) {
    console.error('❌ Error creating backup:', error.message);
    return null;
  }
}

// Run backup if called directly
if (require.main === module) {
  backupDatabase();
}

module.exports = { backupDatabase };
