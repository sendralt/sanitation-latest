const request = require('supertest');
const app = require('../app');
const fs = require('fs');
const path = require('path');
const { cleanupTestData } = require('./helpers/testHelpers');

describe('Validation API endpoints', () => {
  const testDataDir = path.join(__dirname, '..', '..', 'backend', 'data');
  const testId = 'test-validation-123';
  const testDataFile = path.join(testDataDir, `data_${testId}.json`);

  beforeEach(async () => {
    await cleanupTestData();
    
    // Ensure test data directory exists
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }

    // Create test data file
    const testData = {
      title: 'Test Checklist',
      checkboxes: {
        H: {
          'item1': { checked: false, text: 'Test item 1' },
          'item2': { checked: true, text: 'Test item 2' },
          'item3': { checked: false, text: 'Test item 3' }
        }
      },
      randomCheckboxes: [
        { id: 'item1', checked: false },
        { id: 'item2', checked: true }
      ],
      submittedAt: new Date().toISOString(),
      validatedAt: null
    };
    fs.writeFileSync(testDataFile, JSON.stringify(testData, null, 2));
  });

  afterEach(() => {
    // Clean up test data file
    if (fs.existsSync(testDataFile)) {
      fs.unlinkSync(testDataFile);
    }
  });

  describe('GET /api/validate/:id', () => {
    it('should return checklist data for validation', async () => {
      const response = await request(app)
        .get(`/api/validate/${testId}`)
        .expect(200);

      expect(response.body).toHaveProperty('title', 'Test Checklist');
      expect(response.body).toHaveProperty('checkboxes');
      expect(response.body.checkboxes).toHaveProperty('H');
      expect(response.body).toHaveProperty('randomCheckboxes');
      expect(response.body).toHaveProperty('fileId', testId);
      expect(response.body).toHaveProperty('validationLinkAccessed', false);
    });

    it('should return 404 for non-existent checklist', async () => {
      const response = await request(app)
        .get('/api/validate/nonexistent-id')
        .expect(404);

      expect(response.body).toHaveProperty('message', 'Checklist not found.');
    });
  });

  describe('POST /api/validate/:id', () => {
    it('should update validation status and save changes', async () => {
      const validationData = {
        supervisorName: 'Test Auditor',
        validatedCheckboxes: [
          { id: 'item1', checked: true },
          { id: 'item2', checked: false }
        ]
      };

      const response = await request(app)
        .post(`/api/validate/${testId}`)
        .send(validationData)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Validation completed successfully.');

      // Verify the file was updated
      const updatedData = JSON.parse(fs.readFileSync(testDataFile, 'utf8'));
      expect(updatedData.checkboxes.H.item1.checked).toBe(true);
      expect(updatedData.checkboxes.H.item2.checked).toBe(false);
      expect(updatedData.checkboxes.H.item3.checked).toBe(false); // unchanged
      expect(updatedData.supervisorValidation).toBeTruthy();
      expect(updatedData.supervisorValidation.validatedAt).toBeTruthy();
      expect(updatedData.supervisorValidation.supervisorName).toBe('Test Auditor');
    });

    it('should handle empty validation data', async () => {
      const response = await request(app)
        .post(`/api/validate/${testId}`)
        .send({ supervisorName: 'Test Auditor', validatedCheckboxes: [] })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Validation completed successfully.');

      // Verify supervisorValidation was set even with no changes
      const updatedData = JSON.parse(fs.readFileSync(testDataFile, 'utf8'));
      expect(updatedData.supervisorValidation).toBeTruthy();
      expect(updatedData.supervisorValidation.validatedAt).toBeTruthy();
    });

    it('should return 404 for non-existent checklist', async () => {
      const response = await request(app)
        .post('/api/validate/nonexistent-id')
        .send({ supervisorName: 'Test Auditor', validatedCheckboxes: [] })
        .expect(404);

      expect(response.body).toHaveProperty('message', 'Checklist not found.');
    });

    it('should handle request without supervisorName gracefully', async () => {
      const response = await request(app)
        .post(`/api/validate/${testId}`)
        .send({ validatedCheckboxes: [] })
        .expect(200);

      // Should still work but with undefined supervisorName
      expect(response.body).toHaveProperty('message', 'Validation completed successfully.');
    });
  });
});
