const validator = require('validator');
const { getSecurityQuestionById } = require('./auth');

function validateUsername(username) {
  if (!username || !validator.isLength(username.trim(), { min: 3, max: 30 })) {
    return 'Username must be 3-30 characters long.';
  }
  // Optionally enforce alphanumeric: if (!validator.isAlphanumeric(username)) return 'Username must be alphanumeric.';
  return null;
}

function validatePassword(password) {
  if (!password || !validator.isLength(password, { min: 8 })) {
    return 'Password must be at least 8 characters long.';
  }
  return null;
}

function validateSecurityAnswers(securityAnswers) {
  if (!Array.isArray(securityAnswers) || securityAnswers.length !== 2) {
    return 'Exactly two security answers are required.';
  }
  const questionIds = securityAnswers.map(sa => sa.questionId);
  if (new Set(questionIds).size !== 2) {
    return 'Security questions must be unique.';
  }
  for (const sa of securityAnswers) {
    if (!sa.questionId || !getSecurityQuestionById(sa.questionId) || typeof sa.answer !== 'string' || sa.answer.trim() === '') {
      return 'Invalid security question or answer provided.';
    }
  }
  return null;
}

function isValidUUID(id) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

module.exports = {
  validateUsername,
  validatePassword,
  validateSecurityAnswers,
  isValidUUID,
};

