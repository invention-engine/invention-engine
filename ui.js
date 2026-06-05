import { culturesList, cellCultures, getCultureAt, GRID_WIDTH, GRID_HEIGHT } from './terrain.js';
import { ACTIVE_THEME, themeConfig } from './themeConfig.js';

// DOM element caches
let elTitle, elSeed, elLoreName, elLoreEra, elLoreMyth;
let elPosX, elPosY, elPosZ, elPlayerCulture, elCultureCenter;
let elMinimap, ctxMinimap, elLegend;
let elValues, elTraditions;
let elStaminaBar, elStaminaPercent;
let elAdrenalineBar, elAdrenalinePercent;
let elTimeDisplay, elClockDot;

/**
 * Initializes the UI components and maps DOM elements
 */
export function initUI(worldData) {
  elTitle = document.getElementById('world-title');
  elSeed = document.getElementById('world-seed');
  elLoreName = document.getElementById('lore-name');
  elLoreEra = document.getElementById('lore-era');
  elLoreMyth = document.getElementById('lore-myth');
  
  elPosX = document.getElementById('pos-x');
  elPosY = document.getElementById('pos-y');
  elPosZ = document.getElementById('pos-z');
  elPlayerCulture = document.getElementById('player-culture');
  elCultureCenter = document.getElementById('culture-center');
  
  elMinimap = document.getElementById('minimap');
  ctxMinimap = elMinimap.getContext('2d');
  elLegend = document.getElementById('minimap-legend');
  elValues = document.getElementById('culture-values');
  elTraditions = document.getElementById('culture-traditions');
  elStaminaBar = document.getElementById('stamina-bar');
  elStaminaPercent = document.getElementById('stamina-percent');
  elAdrenalineBar = document.getElementById('adrenaline-bar');
  elAdrenalinePercent = document.getElementById('adrenaline-percent');
  elTimeDisplay = document.getElementById('time-display');
  elClockDot = document.getElementById('clock-sun-moon-dot');

  // Populate static lore info
  const lore = worldData.lore;
  if (elTitle) elTitle.textContent = lore.worldName || 'Aerthos';
  if (elSeed) elSeed.textContent = `Seed: ${worldData.seed}`;
  if (elLoreName) elLoreName.textContent = lore.worldName || '-';
  if (elLoreEra) elLoreEra.textContent = lore.era || '-';
  if (elLoreMyth) elLoreMyth.textContent = lore.creationMyth || '';

  // Theme HUD configuration & styling repaints
  const elTheme = document.getElementById('visual-theme');
  if (elTheme) {
    const themeName = themeConfig[ACTIVE_THEME].name;
    elTheme.textContent = `Theme: ${themeName}`;
    if (ACTIVE_THEME === 'cyberpunk') {
      elTheme.style.background = 'rgba(255, 0, 85, 0.15)';
      elTheme.style.borderColor = 'rgba(255, 0, 85, 0.3)';
      elTheme.style.color = '#ffd1df';
      
      // Repaint core CSS custom properties for cyberpunk neon pink accent
      document.documentElement.style.setProperty('--accent-color', '#ff0055');
      document.documentElement.style.setProperty('--accent-glow', 'rgba(255, 0, 85, 0.4)');
      document.documentElement.style.setProperty('--text-highlight', '#ff0055');
      document.documentElement.style.setProperty('--bg-primary', '#050508');
    } else {
      elTheme.style.background = 'rgba(0, 229, 255, 0.15)';
      elTheme.style.borderColor = 'rgba(0, 229, 255, 0.3)';
      elTheme.style.color = '#e0f7fa';
    }
  }

  // Setup minimap legend
  if (elLegend) {
    elLegend.innerHTML = '';
    culturesList.forEach((culture) => {
      const item = document.createElement('div');
      item.style.display = 'flex';
      item.style.alignItems = 'center';
      item.style.gap = '6px';
      item.style.background = 'rgba(255, 255, 255, 0.05)';
      item.style.padding = '4px 8px';
      item.style.borderRadius = '6px';
      item.style.border = '1px solid rgba(255, 255, 255, 0.05)';
      
      const badge = document.createElement('span');
      badge.style.display = 'inline-block';
      badge.style.width = '10px';
      badge.style.height = '10px';
      badge.style.borderRadius = '50%';
      badge.style.background = culture.color;
      badge.style.boxShadow = `0 0 6px ${culture.color}`;
      
      const name = document.createElement('span');
      name.textContent = culture.name;
      name.style.fontSize = '0.75rem';
      name.style.color = '#c8cbdb';
      
      item.appendChild(badge);
      item.appendChild(name);
      elLegend.appendChild(item);
    });
  }
}

/**
 * Updates player coordinates and status text in HUD
 */
export function updateHUD(playerPosition, stamina, adrenaline = 0.0, timeString = "08:00", isNightState = false) {
  if (elPosX) elPosX.textContent = playerPosition.x.toFixed(2);
  if (elPosY) elPosY.textContent = playerPosition.y.toFixed(2);
  if (elPosZ) elPosZ.textContent = playerPosition.z.toFixed(2);

  if (elStaminaBar) {
    elStaminaBar.style.width = `${stamina.toFixed(0)}%`;
    if (stamina < 20) {
      elStaminaBar.style.background = 'linear-gradient(90deg, #ff1744, #ff5252)';
    } else {
      elStaminaBar.style.background = 'linear-gradient(90deg, #00e5ff, #7c4dff)';
    }
  }
  if (elStaminaPercent) {
    elStaminaPercent.textContent = `${stamina.toFixed(0)}%`;
  }
  
  if (elAdrenalineBar) {
    elAdrenalineBar.style.width = `${adrenaline.toFixed(0)}%`;
  }
  if (elAdrenalinePercent) {
    elAdrenalinePercent.textContent = `${adrenaline.toFixed(0)}%`;
  }
  
  if (elTimeDisplay) {
    elTimeDisplay.textContent = timeString;
  }
  if (elClockDot) {
    if (isNightState) {
      elClockDot.style.background = '#81d4fa';
      elClockDot.style.boxShadow = '0 0 8px #81d4fa';
    } else {
      elClockDot.style.background = '#ffb300';
      elClockDot.style.boxShadow = '0 0 8px #ffb300';
    }
  }
  
  const activeCulture = getCultureAt(playerPosition.x, playerPosition.z);
  if (activeCulture) {
    if (elPlayerCulture) {
      elPlayerCulture.textContent = activeCulture.name;
      elPlayerCulture.style.color = activeCulture.color;
      elPlayerCulture.style.textShadow = `0 0 8px ${activeCulture.color}33`;
    }
    if (elCultureCenter) {
      elCultureCenter.textContent = `Cell ${activeCulture.center}`;
    }
    if (elValues) {
      elValues.textContent = activeCulture.values ? activeCulture.values.join(', ') : '-';
    }
    if (elTraditions) {
      elTraditions.innerHTML = '';
      if (activeCulture.traditions) {
        activeCulture.traditions.forEach(t => {
          const li = document.createElement('li');
          li.textContent = t;
          elTraditions.appendChild(li);
        });
      }
    }
  } else {
    if (elPlayerCulture) elPlayerCulture.textContent = 'Wildlands';
    if (elCultureCenter) elCultureCenter.textContent = '-';
    if (elValues) elValues.textContent = '-';
    if (elTraditions) elTraditions.innerHTML = '';
  }
}

/**
 * Redraws the 2D pixel cultural minimap overlay with player indicator
 * @param {THREE.Vector3} playerPosition 
 * @param {number} spacing 
 */
export function updateMinimap(playerPosition, spacing) {
  if (!ctxMinimap || !elMinimap) return;
  
  const w = elMinimap.width;
  const h = elMinimap.height;
  const cellSizeX = w / GRID_WIDTH;
  const cellSizeZ = h / GRID_HEIGHT;
  
  // 1. Draw cultural cell grid
  for (let cz = 0; cz < GRID_HEIGHT; cz++) {
    for (let cx = 0; cx < GRID_WIDTH; cx++) {
      const idx = cz * GRID_WIDTH + cx;
      const culture = cellCultures[idx];
      ctxMinimap.fillStyle = culture ? culture.color : '#000000';
      ctxMinimap.fillRect(cx * cellSizeX, cz * cellSizeZ, cellSizeX, cellSizeZ);
    }
  }

  // 2. Draw culture origin centers
  culturesList.forEach((culture) => {
    if (culture.center === null || culture.center === undefined) return;
    const cx = culture.center % GRID_WIDTH;
    const cz = Math.floor(culture.center / GRID_WIDTH);
    
    ctxMinimap.beginPath();
    ctxMinimap.arc(
      cx * cellSizeX + cellSizeX / 2, 
      cz * cellSizeZ + cellSizeZ / 2, 
      4, 0, Math.PI * 2
    );
    ctxMinimap.fillStyle = '#ffffff';
    ctxMinimap.fill();
    ctxMinimap.lineWidth = 1.5;
    ctxMinimap.strokeStyle = '#000000';
    ctxMinimap.stroke();
  });

  // 3. Draw player position dot (pulsing animation)
  const gridPX = playerPosition.x / spacing;
  const gridPZ = playerPosition.z / spacing;
  
  const px = gridPX * cellSizeX;
  const pz = gridPZ * cellSizeZ;
  
  const pulseFactor = 1.0 + Math.sin(performance.now() * 0.01) * 0.25;
  
  ctxMinimap.beginPath();
  ctxMinimap.arc(px, pz, 6 * pulseFactor, 0, Math.PI * 2);
  ctxMinimap.fillStyle = 'rgba(0, 229, 255, 0.4)';
  ctxMinimap.fill();

  ctxMinimap.beginPath();
  ctxMinimap.arc(px, pz, 3.5, 0, Math.PI * 2);
  ctxMinimap.fillStyle = '#00e5ff';
  ctxMinimap.fill();
  ctxMinimap.lineWidth = 1;
  ctxMinimap.strokeStyle = '#ffffff';
  ctxMinimap.stroke();
}

/**
 * Hides the fullscreen loading screen overlay
 */
export function hideLoadingScreen() {
  const loader = document.getElementById('loading-overlay');
  if (loader) {
    loader.classList.add('fade-out');
    // Remove from layout after fade transition completes
    setTimeout(() => {
      loader.style.display = 'none';
    }, 1000);
  }
}
