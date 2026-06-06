// server/routes/auth.js – Registration & Login endpoints
'use strict';

const express  = require('express');
const bcrypt   = require('bcryptjs');
const { getDB }    = require('../db');
const { signJWT }  = require('../middleware/auth');

const router = express.Router();
const SALT_ROUNDS = 12;

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password)
    return res.status(400).json({ error: 'username, email and password are required' });

  if (password.length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters' });

  if (!/^[a-zA-Z0-9_]{3,24}$/.test(username))
    return res.status(400).json({ error: 'Username must be 3–24 alphanumeric characters' });

  try {
    const db   = getDB();
    const hash = await bcrypt.hash(password, SALT_ROUNDS);

    const stmt = db.prepare(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)'
    );
    const info = stmt.run(username.trim(), email.trim().toLowerCase(), hash);
    const userId = info.lastInsertRowid;

    // Create default player state row
    db.prepare(
      'INSERT INTO player_state (user_id) VALUES (?)'
    ).run(userId);

    const token = signJWT({ userId, username });
    res.status(201).json({ token, username, userId });
  } catch (err) {
    if (err.message?.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Username or email already taken' });
    }
    console.error('[auth/register]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'username and password are required' });

  try {
    const db   = getDB();
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim());

    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match)  return res.status(401).json({ error: 'Invalid credentials' });

    const token = signJWT({ userId: user.id, username: user.username });
    res.json({ token, username: user.username, userId: user.id });
  } catch (err) {
    console.error('[auth/login]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
