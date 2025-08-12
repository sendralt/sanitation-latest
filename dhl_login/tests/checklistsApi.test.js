const request = require('supertest');
const app = require('../app');
const { cleanupTestData, createTestChecklist } = require('./helpers/testHelpers');

describe('GET /api/checklists', () => {
  beforeEach(async () => {
    await cleanupTestData();

    // Create test checklists
    await createTestChecklist({
      filename: 'daily_checklist.html',
      title: 'Daily Cleaning Checklist',
      type: 'daily',
      order: 1
    });
    await createTestChecklist({
      filename: 'weekly_checklist.html',
      title: 'Weekly Deep Clean',
      type: 'weekly',
      order: 2
    });
    await createTestChecklist({
      filename: 'monthly_checklist.html',
      title: 'Monthly Inspection',
      type: 'monthly',
      order: 3
    });
  });

  it('should return the list of available checklists', async () => {
    const response = await request(app)
      .get('/api/checklists')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(3); // We created 3 test checklists

    // Verify structure of checklist objects
    const checklist = response.body[0];
    expect(checklist).toHaveProperty('id');
    expect(checklist).toHaveProperty('title');
    expect(checklist).toHaveProperty('filename');
    expect(checklist).toHaveProperty('type');
    expect(checklist).toHaveProperty('order');

    // Verify types
    expect(typeof checklist.id).toBe('string');
    expect(typeof checklist.title).toBe('string');
    expect(typeof checklist.filename).toBe('string');
    expect(typeof checklist.type).toBe('string');
    expect(typeof checklist.order).toBe('number');
  });

  it('should return checklists sorted by type then order', async () => {
    const response = await request(app)
      .get('/api/checklists')
      .expect(200);

    // Verify sorting by type first, then order (as per the API implementation)
    const types = response.body.map(c => c.type);
    const sortedTypes = [...types].sort();
    expect(types).toEqual(sortedTypes);

    // Within each type, verify order sorting
    const typeGroups = {};
    response.body.forEach(checklist => {
      if (!typeGroups[checklist.type]) typeGroups[checklist.type] = [];
      typeGroups[checklist.type].push(checklist.order);
    });

    Object.values(typeGroups).forEach(orders => {
      const sortedOrders = [...orders].sort((a, b) => a - b);
      expect(orders).toEqual(sortedOrders);
    });
  });

  it('should include expected checklist types', async () => {
    const response = await request(app)
      .get('/api/checklists')
      .expect(200);

    const types = response.body.map(c => c.type);
    const uniqueTypes = [...new Set(types)];

    // Should have the types we created
    expect(uniqueTypes).toContain('daily');
    expect(uniqueTypes).toContain('weekly');
    expect(uniqueTypes).toContain('monthly');
    expect(uniqueTypes.every(type => typeof type === 'string')).toBe(true);
  });
});
