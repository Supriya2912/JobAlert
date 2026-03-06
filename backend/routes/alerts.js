const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { sendTestAlert } = require('../services/emailService');

router.post('/test', authenticate, async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.userId);
    const previewUrl = await sendTestAlert(user);
    
    if (previewUrl) {
      // Ethereal — no real email sent, but viewable in browser
      res.json({ 
        message: 'Test email sent! Since Gmail is not configured, view it here:', 
        previewUrl,
        note: 'Click the previewUrl to see your email in the browser'
      });
    } else {
      res.json({ message: `Test alert sent to ${user.email}` });
    }
  } catch (err) {
    console.error('Test alert error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/history', authenticate, async (req, res) => {
  res.json({ alerts: [], message: 'Alert history coming soon' });
});

module.exports = router;