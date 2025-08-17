const fs = require('fs');
const path = require('path');

function getChecklistFilePath(fileId) {
  // From dhl_login/utils to backend/data
  return path.join(__dirname, '..', '..', 'backend', 'data', `data_${fileId}.json`);
}

function loadChecklistData(fileId) {
  const filePath = getChecklistFilePath(fileId);
  if (!fs.existsSync(filePath)) return null;
  const fileData = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(fileData);
}

function saveChecklistData(fileId, formData) {
  const filePath = getChecklistFilePath(fileId);
  fs.writeFileSync(filePath, JSON.stringify(formData, null, 2));
}

function updateCheckboxesFromValidation(formData, validatedCheckboxes = []) {
  if (!Array.isArray(validatedCheckboxes)) return;
  validatedCheckboxes.forEach((validatedCb) => {
    const { id: validatedId, checked: newCheckedState } = validatedCb;
    // Iterate through headings to find the validated checkbox ID
    for (const headingKey in formData.checkboxes) {
      if (formData.checkboxes[headingKey] && formData.checkboxes[headingKey][validatedId]) {
        formData.checkboxes[headingKey][validatedId].checked = newCheckedState;
        break;
      }
    }
  });
}

async function markAssignmentValidated(fileId, auditorName) {
  try {
    const { Assignment, User } = require('../models');
    const filename = `data_${fileId}.json`;

    const assignment = await Assignment.findOne({
      where: {
        submissionDataFilePath: filename,
        status: 'completed'
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'firstName', 'lastName']
      }]
    });

    if (!assignment) return false;

    const supervisor = await User.findOne({
      where: {
        firstName: (auditorName || '').split(' ')[0] || auditorName,
        isAdmin: true
      }
    });

    await assignment.update({
      status: 'validated',
      validatedAt: new Date(),
      validatedByUserId: supervisor ? supervisor.id : null,
      validationStatus: 'approved'
    });

    return true;
  } catch (err) {
    console.error('[validationHelpers] Error marking assignment validated:', err);
    return false;
  }
}

module.exports = {
  getChecklistFilePath,
  loadChecklistData,
  saveChecklistData,
  updateCheckboxesFromValidation,
  markAssignmentValidated,
};

