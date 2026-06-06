// server/routes/state.js – Player state save & load endpoints
'use strict';

const express       = require('express');
const { getDB }     = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/state – load player's saved state
router.get('/', requireAuth, (req, res) => {
  try {
    const db    = getDB();
    const state = db.prepare('SELECT * FROM player_state WHERE user_id = ?').get(req.user.userId);
    if (!state) return res.status(404).json({ error: 'No state found' });

    res.json({
      x:         state.x,
      y:         state.y,
      z:         state.z,
      region:    state.region,
      quests:    JSON.parse(state.quests),
      inventory: JSON.parse(state.inventory),
      savedAt:   state.saved_at
    });
  } catch (err) {
    console.error('[state/get]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/state – upsert player state (called periodically or at Slovan Shrines)
router.post('/', requireAuth, (req, res) => {
  const { x, y, z, region, quests, inventory } = req.body;

  if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number')
    return res.status(400).json({ error: 'x, y, z coordinates required' });

  try {
    const db = getDB();
    db.prepare(`
      INSERT INTO player_state (user_id, x, y, z, region, quests, inventory, saved_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, unixepoch())
      ON CONFLICT(user_id) DO UPDATE SET
        x = excluded.x,
        y = excluded.y,
        z = excluded.z,
        region    = excluded.region,
        quests    = excluded.quests,
        inventory = excluded.inventory,
        saved_at  = unixepoch()
    `).run(
      req.user.userId,
      x, y, z,
      region    || 'Wildlands',
      JSON.stringify(quests    || []),
      JSON.stringify(inventory || [])
    );

    res.json({ ok: true, savedAt: Math.floor(Date.now() / 1000) });
  } catch (err) {
    console.error('[state/post]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
