// routes/groups.js
const express = require('express');
const database = require('../database/database');

const router = express.Router();

// Get all groups
router.get('/', async (req, res) => {
  try {
    const groups = await database.getGroups();
    res.json({ success: true, groups });
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// Create new group
router.post('/', async (req, res) => {
  try {
    const { name, description, isPrivate, createdBy } = req.body;
    
    if (!name || !createdBy) {
      return res.status(400).json({ error: 'Name and creator are required' });
    }

    const group = await database.createGroup(name, createdBy, description, isPrivate);
    
    if (group) {
      res.json({ success: true, group });
    } else {
      res.status(500).json({ error: 'Failed to create group' });
    }
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// Join group
router.post('/:groupId/join', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const success = await database.joinGroup(groupId, userId);
    
    if (success) {
      res.json({ success: true, message: 'Joined group successfully' });
    } else {
      res.status(400).json({ error: 'Failed to join group' });
    }
  } catch (error) {
    console.error('Error joining group:', error);
    res.status(500).json({ error: 'Failed to join group' });
  }
});

module.exports = router;