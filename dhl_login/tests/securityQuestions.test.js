const {
  PREDEFINED_SECURITY_QUESTIONS,
  getSecurityQuestions,
  getSecurityQuestionById,
  normalizeAnswer,
  hashAnswer,
  compareAnswer,
} = require('../utils/auth');

describe('Security Questions Utility Functions', () => {
  // Test PREDEFINED_SECURITY_QUESTIONS
  it('PREDEFINED_SECURITY_QUESTIONS should be an array with expected structure', () => {
    expect(Array.isArray(PREDEFINED_SECURITY_QUESTIONS)).toBe(true);
    expect(PREDEFINED_SECURITY_QUESTIONS.length).toBeGreaterThan(0);
    PREDEFINED_SECURITY_QUESTIONS.forEach(q => {
      expect(q).toHaveProperty('id');
      expect(typeof q.id).toBe('number');
      expect(q).toHaveProperty('text');
      expect(typeof q.text).toBe('string');
    });
  });

  // Test getSecurityQuestions
  it('getSecurityQuestions should return a copy of questions without sensitive data', () => {
    const questions = getSecurityQuestions();
    expect(questions).toEqual(PREDEFINED_SECURITY_QUESTIONS.map(q => ({ id: q.id, text: q.text })));
    expect(questions).not.toBe(PREDEFINED_SECURITY_QUESTIONS); // Ensure it's a copy
  });

  // Test getSecurityQuestionById
  it('getSecurityQuestionById should return the correct question by ID', () => {
    const question = getSecurityQuestionById(1);
    expect(question).toEqual({ id: 1, text: "What was your first pet's name?" });
  });

  it('getSecurityQuestionById should return null for an invalid ID', () => {
    const question = getSecurityQuestionById(999);
    expect(question).toBeNull();
  });

  it('getSecurityQuestionById should handle string ID input', () => {
    const question = getSecurityQuestionById('2');
    expect(question).toEqual({ id: 2, text: "What is your mother's maiden name?" });
  });

  // Test normalizeAnswer
  it('normalizeAnswer should trim whitespace and convert to lowercase', () => {
    expect(normalizeAnswer('  My AnSwEr  ')).toBe('my answer');
    expect(normalizeAnswer('TEST')).toBe('test');
    expect(normalizeAnswer('answer')).toBe('answer');
  });

  it('normalizeAnswer should return empty string for non-string input', () => {
    expect(normalizeAnswer(null)).toBe('');
    expect(normalizeAnswer(undefined)).toBe('');
    expect(normalizeAnswer(123)).toBe('');
  });

  // Test hashAnswer and compareAnswer
  it('should correctly hash and compare a security answer', async () => {
    const answer = 'MyPetName';
    const hashedAnswer = await hashAnswer(answer);
    expect(hashedAnswer).toBeDefined();
    expect(hashedAnswer).not.toEqual(answer);

    const isMatch = await compareAnswer(answer, hashedAnswer);
    expect(isMatch).toBe(true);
  });

  it('should return false for incorrect security answer comparison', async () => {
    const answer = 'MyPetName';
    const hashedAnswer = await hashAnswer(answer);
    const isMatch = await compareAnswer('WrongAnswer', hashedAnswer);
    expect(isMatch).toBe(false);
  });

  it('should handle case and whitespace insensitivity for answer comparison', async () => {
    const answer = '  My Pet Name  ';
    const hashedAnswer = await hashAnswer(answer); // Hash normalized version
    const isMatch = await compareAnswer('my pet name', hashedAnswer); // Compare with normalized version
    expect(isMatch).toBe(true);
  });
});