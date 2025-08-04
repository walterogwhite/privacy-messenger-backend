// routes/messages.js
const express = require('express');
const database = require('../database/database');

const router = express.Router();

// Get messages for a group
router.get('/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const groups = await database.getGroups();
    
    if (groups[groupId]) {
      res.json({ 
        success: true, 
        messages: groups[groupId].messages 
      });
    } else {
      res.status(404).json({ error: 'Group not found' });
    }
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Mark message as viewed
router.post('/:messageId/view', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { groupId } = req.body;

    // This would trigger encryption after delay
    setTimeout(async () => {
      await database.encryptMessage(messageId, groupId);
    }, 1000);

    res.json({ success: true, message: 'Message marked as viewed' });
  } catch (error) {
    console.error('Error marking message as viewed:', error);
    res.status(500).json({ error: 'Failed to mark message as viewed' });
  }
});

module.exports = router;
