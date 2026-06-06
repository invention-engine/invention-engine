// server/db.js – SQLite database bootstrap (better-sqlite3)
'use strict';

const Database = require('better-sqlite3');
const path     = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'rpg.db');

let db;

function initDB() {
  const fs = require('fs');
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      username    TEXT    UNIQUE NOT NULL,
      email       TEXT    UNIQUE NOT NULL,
      password    TEXT    NOT NULL,
      created_at  INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS player_state (
      user_id     INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      x           REAL    NOT NULL DEFAULT 0,
      y           REAL    NOT NULL DEFAULT 0,
      z           REAL    NOT NULL DEFAULT 0,
      region      TEXT    NOT NULL DEFAULT 'Wildlands',
      quests      TEXT    NOT NULL DEFAULT '[]',
      inventory   TEXT    NOT NULL DEFAULT '[]',
      saved_at    INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);

  console.log(`[db] SQLite ready at ${DB_PATH}`);
  return db;
}

function getDB() {
  if (!db) throw new Error('DB not initialised — call initDB() first');
  return db;
}

module.exports = { initDB, getDB };
