/**
 * ============================================================
 * User Routes (API Endpoints for User management)
 * ============================================================
 * TECHNOLOGY: Express Router + JWT
 * 
 * WHY JWT (JSON Web Token)?
 * After login, server gives user a "token" (like a hotel key card).
 * User sends this token with every request to prove who they are.
 * Server doesn't need to check database on every request — just
 * verifies the token's signature. Fast and stateless!
 * ============================================================
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

// ============================================================
// REGISTER - Create new account
// POST /api/users/register
// ============================================================
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, preferences, alertSettings } = req.body;

    // Check if email already exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create user (password gets hashed automatically via model's pre-save hook)
    const user = new User({
      name,
      email,
      password,
      preferences: preferences || {},
      alertSettings: alertSettings || {},
    });

    // Set the "nextAlertDue" based on their chosen frequency
    user.alertSettings.nextAlertDue = calculateNextAlert(
      user.alertSettings.frequency
    );

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '30d' }
    );

    res.status(201).json({
      message: 'Account created!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        preferences: user.preferences,
        alertSettings: user.alertSettings,
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// LOGIN
// POST /api/users/login
// ============================================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '30d' }
    );

    res.json({ token, user: { id: user._id, name: user.name, email: user.email,
      preferences: user.preferences, alertSettings: user.alertSettings } });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// UPDATE PREFERENCES (protected route - needs login)
// PUT /api/users/preferences
// ============================================================
router.put('/preferences', authenticate, async (req, res) => {
  try {
    const { preferences, alertSettings } = req.body;
    
    const user = await User.findById(req.userId);
    
    if (preferences) user.preferences = { ...user.preferences, ...preferences };
    if (alertSettings) {
      user.alertSettings = { ...user.alertSettings, ...alertSettings };
      // Recalculate next alert time when frequency changes
      if (alertSettings.frequency) {
        user.alertSettings.nextAlertDue = calculateNextAlert(alertSettings.frequency);
      }
    }
    
    await user.save();
    res.json({ message: 'Preferences updated!', user });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET current user profile
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password -seenJobIds');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// HELPER FUNCTION
// Calculate when next alert should be sent based on frequency
// ============================================================
function calculateNextAlert(frequency) {
  const now = new Date();
  const map = {
    'instant': 0,
    '15min': 15,
    '30min': 30,
    '1hour': 60,
    '3hour': 180,
    '6hour': 360,
    'daily': 1440,
  };
  const minutes = map[frequency] || 60;
  return new Date(now.getTime() + minutes * 60 * 1000);
}

module.exports = router;
