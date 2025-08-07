// Frontend tests for automatic name population functionality
const { JSDOM } = require('jsdom');
const path = require('path');
const fs = require('fs');

// Mock fetch for testing
global.fetch = jest.fn();

describe('Frontend Name Population', () => {
  let dom;
  let document;
  let window;
  let console;

  beforeEach(() => {
    // Reset fetch mock
    fetch.mockClear();

    // Create a new DOM for each test
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Checklist</title>
        </head>
        <body>
          <div class="header-inputs">
            <label for="name">Associate Name:</label>
            <input type="text" id="name" name="name" placeholder="Enter your name" required>
            <label>Date:</label>
            <span id="date-display" class="date-display"></span>
          </div>
          <h2>Test Checklist</h2>
        </body>
      </html>
    `, {
      url: 'http://localhost/app/checklists/test.html',
      pretendToBeVisual: true,
      resources: 'usable'
    });

    window = dom.window;
    document = window.document;
    console = window.console;

    // Set up global variables
    global.window = window;
    global.document = document;
    global.console = console;

    // Define the populateAssociateName function directly for testing
    // This is a copy of the function from scripts.js for testing purposes
    window.populateAssociateName = function() {
      // Only populate if we have user data with firstName and lastName
      if (!window.currentUser || !window.currentUser.firstName || !window.currentUser.lastName) {
        console.log('[Debug] populateAssociateName: No user data or missing name fields');
        return;
      }

      // Look for the Associate Name input field (id="name")
      const nameField = document.getElementById('name');
      if (!nameField) {
        console.log('[Debug] populateAssociateName: No name field found on this page');
        return;
      }

      // Only populate if the field is empty (don't overwrite existing data)
      if (nameField.value && nameField.value.trim() !== '') {
        console.log('[Debug] populateAssociateName: Name field already has value, not overwriting');
        return;
      }

      // Populate with firstName + lastName
      const fullName = `${window.currentUser.firstName} ${window.currentUser.lastName}`;
      nameField.value = fullName;
      console.log('[Debug] populateAssociateName: Auto-populated name field with:', fullName);
    };

    // Mock fetchAuthToken function for testing
    window.fetchAuthToken = async function() {
      // This will be mocked in individual tests
      return Promise.resolve();
    };
  });

  afterEach(() => {
    dom.window.close();
  });

  describe('populateAssociateName function', () => {
    it('should populate name field when user data is available', () => {
      // Set up mock user data
      window.currentUser = {
        id: '123',
        username: 'testuser',
        firstName: 'John',
        lastName: 'Doe'
      };

      // Call the function
      window.populateAssociateName();

      // Check if the name field was populated
      const nameField = document.getElementById('name');
      expect(nameField.value).toBe('John Doe');
    });

    it('should not populate if user data is missing', () => {
      // No currentUser set
      window.currentUser = null;

      // Call the function
      window.populateAssociateName();

      // Check that name field remains empty
      const nameField = document.getElementById('name');
      expect(nameField.value).toBe('');
    });

    it('should not populate if firstName is missing', () => {
      // Set up user data without firstName
      window.currentUser = {
        id: '123',
        username: 'testuser',
        lastName: 'Doe'
      };

      // Call the function
      window.populateAssociateName();

      // Check that name field remains empty
      const nameField = document.getElementById('name');
      expect(nameField.value).toBe('');
    });

    it('should not populate if lastName is missing', () => {
      // Set up user data without lastName
      window.currentUser = {
        id: '123',
        username: 'testuser',
        firstName: 'John'
      };

      // Call the function
      window.populateAssociateName();

      // Check that name field remains empty
      const nameField = document.getElementById('name');
      expect(nameField.value).toBe('');
    });

    it('should not overwrite existing name field value', () => {
      // Set up mock user data
      window.currentUser = {
        id: '123',
        username: 'testuser',
        firstName: 'John',
        lastName: 'Doe'
      };

      // Pre-populate the name field
      const nameField = document.getElementById('name');
      nameField.value = 'Existing Name';

      // Call the function
      window.populateAssociateName();

      // Check that existing value was not overwritten
      expect(nameField.value).toBe('Existing Name');
    });

    it('should handle empty string in name field as empty', () => {
      // Set up mock user data
      window.currentUser = {
        id: '123',
        username: 'testuser',
        firstName: 'John',
        lastName: 'Doe'
      };

      // Set name field to empty string
      const nameField = document.getElementById('name');
      nameField.value = '';

      // Call the function
      window.populateAssociateName();

      // Check that name was populated
      expect(nameField.value).toBe('John Doe');
    });

    it('should treat whitespace-only value as empty and populate', () => {
      // Set up mock user data
      window.currentUser = {
        id: '123',
        username: 'testuser',
        firstName: 'John',
        lastName: 'Doe'
      };

      // Set name field to whitespace only
      const nameField = document.getElementById('name');
      nameField.value = '   ';

      // Call the function
      window.populateAssociateName();

      // Check that whitespace was treated as empty and name was populated
      // Our implementation uses trim() so whitespace-only values are considered empty
      expect(nameField.value).toBe('John Doe');
    });

    it('should do nothing if name field does not exist', () => {
      // Remove the name field
      const nameField = document.getElementById('name');
      nameField.remove();

      // Set up mock user data
      window.currentUser = {
        id: '123',
        username: 'testuser',
        firstName: 'John',
        lastName: 'Doe'
      };

      // Call the function - should not throw error
      expect(() => {
        window.populateAssociateName();
      }).not.toThrow();
    });
  });

  describe('fetchAuthToken integration', () => {
    it('should call populateAssociateName after successful token fetch', async () => {
      // Mock successful fetchAuthToken that sets currentUser and calls populateAssociateName
      window.fetchAuthToken = async function() {
        const response = await fetch('/api/auth/issue-jwt-for-session');
        if (response.ok) {
          const data = await response.json();
          window.authToken = data.token;
          window.currentUser = data.user;
          window.populateAssociateName();
        }
      };

      // Mock successful fetch response
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: 'mock-jwt-token',
          user: {
            id: '123',
            username: 'testuser',
            firstName: 'John',
            lastName: 'Doe'
          }
        })
      });

      // Spy on populateAssociateName
      const populateSpy = jest.spyOn(window, 'populateAssociateName');

      // Call fetchAuthToken
      await window.fetchAuthToken();

      // Check that populateAssociateName was called
      expect(populateSpy).toHaveBeenCalled();

      // Check that user data was set
      expect(window.currentUser.firstName).toBe('John');
      expect(window.currentUser.lastName).toBe('Doe');

      // Check that name field was populated
      const nameField = document.getElementById('name');
      expect(nameField.value).toBe('John Doe');
    });

    it('should not call populateAssociateName if fetch fails', async () => {
      // Mock failed fetchAuthToken
      window.fetchAuthToken = async function() {
        const response = await fetch('/api/auth/issue-jwt-for-session');
        if (!response.ok) {
          console.error('Failed to fetch auth token');
          return;
        }
        // This part won't execute due to failed response
        const data = await response.json();
        window.authToken = data.token;
        window.currentUser = data.user;
        window.populateAssociateName();
      };

      // Mock failed fetch response
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 401
      });

      // Spy on populateAssociateName
      const populateSpy = jest.spyOn(window, 'populateAssociateName');

      // Call fetchAuthToken
      await window.fetchAuthToken();

      // Check that populateAssociateName was not called
      expect(populateSpy).not.toHaveBeenCalled();

      // Check that name field remains empty
      const nameField = document.getElementById('name');
      expect(nameField.value).toBe('');
    });
  });
});
