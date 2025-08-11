const fs = require('fs');
const path = require('path');

jest.mock('fs');

describe('utils/validationHelpers', () => {
  const {
    getChecklistFilePath,
    loadChecklistData,
    saveChecklistData,
    updateCheckboxesFromValidation,
  } = require('../utils/validationHelpers');

  const dataRoot = path.join(__dirname, '..', '..', 'backend', 'data');

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('getChecklistFilePath builds proper path', () => {
    const id = '12345';
    const p = getChecklistFilePath(id);
    expect(p).toContain(path.join('backend','data'));
    expect(p.endsWith(`data_${id}.json`)).toBe(true);
  });

  test('loadChecklistData returns null if file missing', () => {
    fs.existsSync.mockReturnValue(false);
    expect(loadChecklistData('nope')).toBeNull();
  });

  test('loadChecklistData parses JSON when file exists', () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify({ title: 't', checkboxes: { H: {} } }));
    const data = loadChecklistData('111');
    expect(data.title).toBe('t');
  });

  test('saveChecklistData writes JSON', () => {
    saveChecklistData('111', { x: 1 });
    expect(fs.writeFileSync).toHaveBeenCalled();
    const [, content] = fs.writeFileSync.mock.calls[0];
    expect(JSON.parse(content).x).toBe(1);
  });

  test('updateCheckboxesFromValidation updates matched items', () => {
    const formData = { checkboxes: { H: { A: { checked: false }, B: { checked: true } } } };
    updateCheckboxesFromValidation(formData, [
      { id: 'A', checked: true },
      { id: 'B', checked: false },
      { id: 'NONEXISTENT', checked: true },
    ]);
    expect(formData.checkboxes.H.A.checked).toBe(true);
    expect(formData.checkboxes.H.B.checked).toBe(false);
  });
});

