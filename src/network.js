/**
 * network.js – Phase 6 client: Auth, state sync, and real-time multiplayer
 *
 * Responsibilities:
 *  - Auth modal (login / register)
 *  - JWT persistence in localStorage
 *  - Periodic POST /api/state (every 30 s or at shrine interaction)
 *  - Socket.io connection: emit player-move, receive other players, render ghost avatars
 *  - In-world chat overlay
 */

import * as THREE from 'three';

const SERVER = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

// ─── State ────────────────────────────────────────────────────────────────────
let socket = null;
let authToken = localStorage.getItem('rpg_token') || null;
let localUsername = localStorage.getItem('rpg_username') || null;

// Remote player ghost meshes: socketId → THREE.Group
const remotePlayers = new Map();
let gameScene = null;

// ─── Geometry shared across all ghost avatars ─────────────────────────────────
const GHOST_GEO   = new THREE.CapsuleGeometry(0.3, 1.0, 4, 8);
const GHOST_MAT   = new THREE.MeshStandardMaterial({
  color: 0x00e5ff,
  emissive: 0x00e5ff,
  emissiveIntensity: 0.4,
  transparent: true,
  opacity: 0.75,
  flatShading: true
});
const GHOST_GLOW  = new THREE.PointLight(0x00e5ff, 1.2, 6);

// ─── Auth helpers ─────────────────────────────────────────────────────────────
function saveAuth(token, username) {
  authToken     = token;
  localUsername = username;
  localStorage.setItem('rpg_token', token);
  localStorage.setItem('rpg_username', username);
}

function clearAuth() {
  authToken = null;
  localUsername = null;
  localStorage.removeItem('rpg_token');
  localStorage.removeItem('rpg_username');
}

export function isAuthenticated() {
  return !!authToken;
}

export function getLocalUsername() {
  return localUsername;
}

// ─── REST helpers ─────────────────────────────────────────────────────────────
async function apiPost(path, body, withAuth = false) {
  const headers = { 'Content-Type': 'application/json' };
  if (withAuth && authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const res = await fetch(`${SERVER}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  return res.json();
}

async function apiGet(path) {
  const headers = {};
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const res = await fetch(`${SERVER}${path}`, { headers });
  return res.json();
}

export async function register(username, email, password) {
  const data = await apiPost('/api/auth/register', { username, email, password });
  if (data.token) saveAuth(data.token, data.username);
  return data;
}

export async function login(username, password) {
  const data = await apiPost('/api/auth/login', { username, password });
  if (data.token) saveAuth(data.token, data.username);
  return data;
}

export function logout() {
  clearAuth();
  if (socket) socket.disconnect();
  remotePlayers.forEach(g => gameScene?.remove(g));
  remotePlayers.clear();
}

// ─── Player State Sync ────────────────────────────────────────────────────────
export async function savePlayerState(playerPosition, region, quests = [], inventory = []) {
  if (!authToken) return;
  return apiPost('/api/state', {
    x: playerPosition.x,
    y: playerPosition.y,
    z: playerPosition.z,
    region, quests, inventory
  }, true);
}

export async function loadPlayerState() {
  if (!authToken) return null;
  const data = await apiGet('/api/state');
  if (data.error) return null;
  return data; // { x, y, z, region, quests, inventory, savedAt }
}

// ─── Ghost Avatar helpers ─────────────────────────────────────────────────────
function createGhostAvatar(username) {
  const group = new THREE.Group();

  const mesh = new THREE.Mesh(GHOST_GEO, GHOST_MAT.clone());
  mesh.position.y = 0.85;
  mesh.castShadow = true;
  group.add(mesh);

  const glow = GHOST_GLOW.clone();
  glow.position.y = 1.4;
  group.add(glow);

  // Username label via canvas texture
  const canvas  = document.createElement('canvas');
  canvas.width  = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.roundRect(4, 4, 248, 56, 10);
  ctx.fill();
  ctx.fillStyle = '#00e5ff';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(username, 128, 32);

  const tex = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  sprite.position.y = 2.6;
  sprite.scale.set(2.0, 0.5, 1);
  group.add(sprite);

  group.name = `ghost_${username}`;
  return group;
}

function upsertRemotePlayer({ socketId, username, x, y, z, theta }) {
  if (!gameScene) return;
  let group = remotePlayers.get(socketId);
  if (!group) {
    group = createGhostAvatar(username);
    gameScene.add(group);
    remotePlayers.set(socketId, group);
  }
  group.position.set(x, y, z);
  if (theta !== undefined) group.rotation.y = theta;
}

function removeRemotePlayer(socketId) {
  const group = remotePlayers.get(socketId);
  if (group && gameScene) gameScene.remove(group);
  remotePlayers.delete(socketId);
}

// ─── Socket.io connection ─────────────────────────────────────────────────────
export function connectSocket(scene) {
  if (!authToken) return;
  gameScene = scene;

  // Lazy-load socket.io-client from the server bundle
  import('socket.io-client').then(({ io }) => {
    socket = io(SERVER, { auth: { token: authToken } });

    socket.on('connect', () => {
      console.log('[network] Socket connected:', socket.id);
      appendChatMessage({ username: 'System', text: `Connected as ${localUsername}`, system: true });
    });

    socket.on('connect_error', (err) => {
      console.warn('[network] Socket error:', err.message);
    });

    socket.on('players-snapshot', (players) => {
      players.forEach(p => {
        if (p.socketId !== socket.id) upsertRemotePlayer(p);
      });
    });

    socket.on('player-joined', (p) => {
      upsertRemotePlayer(p);
      appendChatMessage({ username: 'System', text: `${p.username} joined the world`, system: true });
    });

    socket.on('player-move', (p) => {
      if (p.socketId !== socket.id) upsertRemotePlayer(p);
    });

    socket.on('player-left', ({ socketId }) => {
      const group = remotePlayers.get(socketId);
      if (group) {
        appendChatMessage({ username: 'System', text: `${group.name.replace('ghost_', '')} left`, system: true });
      }
      removeRemotePlayer(socketId);
    });

    socket.on('chat-message', (msg) => {
      appendChatMessage(msg);
    });
  }).catch(err => {
    console.warn('[network] socket.io-client not available:', err.message);
  });
}

// ─── Emit helpers (called from game loop) ────────────────────────────────────
let lastEmitTime = 0;
const EMIT_INTERVAL = 100; // ms — throttle to ~10 Hz

export function emitPlayerMove(position, region, theta) {
  if (!socket?.connected) return;
  const now = performance.now();
  if (now - lastEmitTime < EMIT_INTERVAL) return;
  lastEmitTime = now;
  socket.emit('player-move', {
    x: position.x,
    y: position.y,
    z: position.z,
    region,
    theta
  });
}

export function emitChatMessage(text) {
  if (!socket?.connected) return;
  socket.emit('chat-message', { text });
}

// ─── Chat overlay DOM helpers ─────────────────────────────────────────────────
let chatLog = null;

function ensureChatEl() {
  if (chatLog) return chatLog;
  chatLog = document.getElementById('chat-log');
  return chatLog;
}

function appendChatMessage({ username, text, system = false }) {
  const el = ensureChatEl();
  if (!el) return;
  const entry = document.createElement('div');
  entry.className = system ? 'chat-entry chat-system' : 'chat-entry';
  entry.innerHTML = system
    ? `<span class="chat-system-text">${text}</span>`
    : `<span class="chat-name">${username}:</span> <span class="chat-text">${text}</span>`;
  el.appendChild(entry);
  el.scrollTop = el.scrollHeight;
  // Keep last 60 messages
  while (el.children.length > 60) el.removeChild(el.firstChild);
}

// ─── Auth Modal ───────────────────────────────────────────────────────────────
export function showAuthModal(onSuccess) {
  const overlay = document.getElementById('auth-overlay');
  if (!overlay) return;
  overlay.classList.remove('hidden');

  let mode = 'login'; // 'login' | 'register'

  const form       = document.getElementById('auth-form');
  const titleEl    = document.getElementById('auth-title');
  const emailRow   = document.getElementById('auth-email-row');
  const toggleBtn  = document.getElementById('auth-toggle');
  const errorEl    = document.getElementById('auth-error');
  const submitBtn  = document.getElementById('auth-submit');
  const skipBtn    = document.getElementById('auth-skip');

  function setMode(m) {
    mode = m;
    titleEl.textContent  = m === 'login' ? 'Login' : 'Create Account';
    submitBtn.textContent = m === 'login' ? 'Login' : 'Register';
    toggleBtn.textContent = m === 'login'
      ? "Don't have an account? Register"
      : 'Already have an account? Login';
    emailRow.style.display = m === 'register' ? 'flex' : 'none';
    errorEl.textContent = '';
  }

  setMode('login');

  toggleBtn.onclick = () => setMode(mode === 'login' ? 'register' : 'login');

  form.onsubmit = async (e) => {
    e.preventDefault();
    errorEl.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Please wait…';

    const username = document.getElementById('auth-username').value.trim();
    const password = document.getElementById('auth-password').value;
    const email    = document.getElementById('auth-email')?.value?.trim();

    try {
      const data = mode === 'login'
        ? await login(username, password)
        : await register(username, email, password);

      if (data.error) {
        errorEl.textContent = data.error;
      } else {
        overlay.classList.add('hidden');
        onSuccess?.(data);
      }
    } catch (err) {
      errorEl.textContent = 'Could not reach server. Playing offline.';
    } finally {
      submitBtn.disabled = false;
      setMode(mode);
    }
  };

  skipBtn.onclick = () => {
    overlay.classList.add('hidden');
    onSuccess?.(null); // null = offline mode
  };
}
