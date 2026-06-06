// server/middleware/auth.js – JWT helpers & Express middleware
'use strict';

const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const EXPIRY  = '7d';

function signJWT(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRY });
}

function verifyJWT(token) {
  return jwt.verify(token, SECRET);
}

/** Express middleware: reads Bearer token from Authorization header */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    req.user = verifyJWT(token);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { signJWT, verifyJWT, requireAuth };
