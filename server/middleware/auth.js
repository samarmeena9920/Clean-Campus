const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * protect(roles?)
 * Factory that returns an Express middleware.
 * Usage:
 *   router.get('/admin-only', protect(['Admin']), handler)
 *   router.get('/any-user',   protect(),          handler)
 */
const protect = (roles = []) => {
  return async (req, res, next) => {
    try {
      // 1. Extract token — support both Bearer header and httpOnly cookie
      let token;
      if (req.headers.authorization?.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
      } else if (req.cookies?.token) {
        token = req.cookies.token;
      }

      if (!token) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
      }

      // 2. Verify signature
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 3. Ensure user still exists and is active
      const user = await User.findById(decoded.id).select('-password');
      if (!user || !user.isActive) {
        return res.status(401).json({ success: false, message: 'User not found or deactivated' });
      }

      // 4. Role check (empty array = all authenticated roles allowed)
      if (roles.length && !roles.includes(user.role)) {
        return res.status(403).json({ success: false, message: 'Insufficient permissions' });
      }

      req.user = user;
      next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Session expired — please log in again' });
      }
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
  };
};

module.exports = protect;
