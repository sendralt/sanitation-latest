const express = require('express');
const router = express.Router();
const { Checklist } = require('../models');

// Public API to retrieve available checklists from DB
// Returns: [{ id, title, filename, type, order }], ordered by type then order
router.get('/', async (req, res) => {
  try {
    const checklists = await Checklist.findAll({
      attributes: ['id', 'title', 'filename', 'type', 'order'],
      order: [ ['type', 'ASC'], ['order', 'ASC'] ]
    });
    res.status(200).json(checklists);
  } catch (err) {
    console.error('[GET /api/checklists] Error fetching checklists:', err);
    res.status(500).json({ message: 'Failed to fetch checklists' });
  }
});

module.exports = router;

