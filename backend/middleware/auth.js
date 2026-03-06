/**
 * ============================================================
 * Authentication Middleware
 * ============================================================
 * WHY: This is a "gatekeeper" for protected routes.
 * When a user hits /api/jobs/my-matches, this code runs FIRST.
 * It checks: "Do you have a valid token?" 
 * If yes → continue. If no → send 401 Unauthorized error.
 * 
 * Think of it like a bouncer at a club checking ID cards.
 * ============================================================
 */

const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  // Token comes in the request header: "Authorization: Bearer eyJ..."
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided. Please login.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // jwt.verify() checks if the token is valid AND not expired
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.userId = decoded.userId;  // Attach userId to request for route handlers
    next();  // "next" = proceed to the actual route handler
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token. Please login again.' });
  }
};

module.exports = { authenticate };
