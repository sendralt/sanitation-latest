const path = require('path');

describe('utils/validation', () => {
  const { validateUsername, validatePassword, validateSecurityAnswers, isValidUUID } = require('../utils/validation');

  describe('validateUsername', () => {
    test('rejects missing or too short usernames', () => {
      expect(validateUsername('')).toMatch(/3-30/);
      expect(validateUsername('ab')).toMatch(/3-30/);
    });
    test('rejects too long usernames', () => {
      expect(validateUsername('a'.repeat(31))).toMatch(/3-30/);
    });
    test('accepts valid username', () => {
      expect(validateUsername('alex123')).toBeNull();
    });
  });

  describe('validatePassword', () => {
    test('rejects passwords shorter than 8', () => {
      expect(validatePassword('short')).toMatch(/at least 8/);
    });
    test('accepts valid password', () => {
      expect(validatePassword('longenough')).toBeNull();
    });
  });

  describe('validateSecurityAnswers', () => {
    test('requires an array of exactly two answers', () => {
      expect(validateSecurityAnswers(null)).toMatch(/Exactly two/);
      expect(validateSecurityAnswers([])).toMatch(/Exactly two/);
      expect(validateSecurityAnswers([{questionId:1, answer:'x'}])).toMatch(/Exactly two/);
      expect(validateSecurityAnswers([{questionId:1, answer:'x'},{questionId:2, answer:'y'},{questionId:3, answer:'z'}])).toMatch(/Exactly two/);
    });
    test('requires unique questions', () => {
      expect(validateSecurityAnswers([
        {questionId: 1, answer:'a'},
        {questionId: 1, answer:'b'},
      ])).toMatch(/unique/);
    });
    test('rejects invalid question ids or blank answers', () => {
      // 999 is not a valid question id per utils/auth.js predefined list
      expect(validateSecurityAnswers([
        {questionId: 1, answer:''},
        {questionId: 2, answer:'x'},
      ])).toMatch(/Invalid/);
      expect(validateSecurityAnswers([
        {questionId: 999, answer:'x'},
        {questionId: 2, answer:'y'},
      ])).toMatch(/Invalid/);
    });
    test('accepts two valid security answers', () => {
      expect(validateSecurityAnswers([
        {questionId: 1, answer:'alpha'},
        {questionId: 2, answer:'beta'},
      ])).toBeNull();
    });
  });

  describe('isValidUUID', () => {
    test('valid and invalid cases', () => {
      const valid = '123e4567-e89b-12d3-a456-426614174000';
      const invalid = 'not-a-uuid';
      expect(isValidUUID(valid)).toBe(true);
      expect(isValidUUID(invalid)).toBe(false);
    });
  });
});

