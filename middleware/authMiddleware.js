require('dotenv').config();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET must be configured before using the authentication middleware.');
}

/**
 * JWT Authentication Middleware
 * 1. Read Authorization header
 * 2. Extract Bearer token
 * 3. Verify token
 * 4. Check expiration
 * 5. Attach authenticated user information to request
 * 6. Reject invalid or expired tokens
 */
function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'Authorization header is missing'
      });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        success: false,
        error: 'Invalid Authorization format. Expected "Bearer <token>"'
      });
    }

    const token = parts[1];
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({
            success: false,
            error: 'Authentication token has expired. Please log in again.'
          });
        }
        return res.status(401).json({
          success: false,
          error: 'Invalid authentication token'
        });
      }

      // Attach authenticated user information to request
      req.user = decoded;
      next();
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Internal server error in authentication middleware'
    });
  }
}

/**
 * Optional Auth Middleware: If token exists, attaches user; if not, proceeds as guest
 */
function optionalAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return next();
  }

  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    jwt.verify(parts[1], JWT_SECRET, (err, decoded) => {
      if (!err && decoded) {
        req.user = decoded;
      }
      next();
    });
  } else {
    next();
  }
}

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
  JWT_SECRET
};
