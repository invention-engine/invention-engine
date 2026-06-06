import { culturesList, cellCultures, getCultureAt, GRID_WIDTH, GRID_HEIGHT } from './terrain.js';
import { ACTIVE_THEME, themeConfig } from './themeConfig.js';
import { UIState, setState, toggleInventory, togglePause } from './uiState.js';

// DOM element caches
let elTitle, elSeed, elLoreName, elLoreEra, elLoreMyth;
let elPosX, elPosY, elPosZ, elPlayerCulture, elCultureCenter;
let elMinimap, ctxMinimap, elLegend;
let elValues, elTraditions;
let elStaminaBar, elStaminaPercent;
let elAdrenalineBar, elAdrenalinePercent;
let elHealthBar, elHealthPercent;
let elMagicBar, elMagicPercent;
let elTimeDisplay, elClockDot;

/**
 * Initializes the UI components and maps DOM elements
 */
export async function initUI(worldData) {
  let statsConfig = null;
  try {
    const response = await fetch('./game/config/stats.json');
    if (!response.ok) throw new Error("Config not ok");
    statsConfig = await response.json();
  } catch (error) {
    console.warn("Failed to load statsConfig.json, using fallback stats:", error);
    statsConfig = {
      "bars": [
        { "id": "health", "name": "Health", "color": "linear-gradient(90deg, #ff5252, #ff1744)" },
        { "id": "stamina", "name": "Stamina", "color": "linear-gradient(90deg, #00e5ff, #7c4dff)" },
        { "id": "adrenaline", "name": "Adrenaline", "color": "linear-gradient(90deg, #ffea00, #ffd600)" },
        { "id": "magic", "name": "Magic", "color": "linear-gradient(90deg, #7c4dff, #b388ff)" }
      ]
    };
  }

  // Populate dynamic stats bar
  const statusHud = document.getElementById('status-hud');
  if (statusHud) {
    statusHud.innerHTML = '';
    statsConfig.bars.forEach(bar => {
      const item = document.createElement('div');
      item.className = 'stat-item';
      item.innerHTML = `
        <span class="stat-label">${bar.name}</span>
        <div class="stat-bar" style="background: rgba(255,255,255,0.1); height: 12px; border-radius: 6px; overflow: hidden;">
          <div id="${bar.id}-bar" style="width: 100%; height: 100%; background: ${bar.color}; transition: width 0.1s ease;"></div>
        </div>
        <span id="${bar.id}-percent" class="stat-value">100%</span>
      `;
      statusHud.appendChild(item);
    });
  }

  // Fetch and populate dynamic inventory items
  const inventoryItemsContainer = document.getElementById('inventory-items');
  if (inventoryItemsContainer) {
    try {
      const response = await fetch('./game/items/registry.json');
      const itemData = await response.json();
      inventoryItemsContainer.innerHTML = '';
      itemData.items.forEach(item => {
        const div = document.createElement('div');
        div.style.background = 'rgba(255,255,255,0.05)';
        div.style.padding = '15px';
        div.style.borderRadius = '6px';
        div.style.border = '1px solid rgba(255,255,255,0.1)';
        div.style.color = item.color || '#ffffff';
        div.textContent = item.name;
        inventoryItemsContainer.appendChild(div);
      });
    } catch (e) {
      console.warn("Failed to load inventory items registry:", e);
    }
  }

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
  ctxMinimap = elMinimap ? elMinimap.getContext('2d') : null;
  elLegend = document.getElementById('minimap-legend');
  elValues = document.getElementById('culture-values');
  elTraditions = document.getElementById('culture-traditions');
  elStaminaBar = document.getElementById('stamina-bar');
  elStaminaPercent = document.getElementById('stamina-percent');
  elAdrenalineBar = document.getElementById('adrenaline-bar');
  elAdrenalinePercent = document.getElementById('adrenaline-percent');
  elHealthBar = document.getElementById('health-bar');
  elHealthPercent = document.getElementById('health-percent');
  elMagicBar = document.getElementById('magic-bar');
  elMagicPercent = document.getElementById('magic-percent');
  elTimeDisplay = document.getElementById('time-display');
  elClockDot = document.getElementById('clock-sun-moon-dot');

  // Populate static lore info
  const lore = worldData.lore || {};
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

  // Set up menu and inventory buttons
  const btnPlay = document.getElementById('btn-play');
  if (btnPlay) {
    btnPlay.addEventListener('click', () => {
      setState(UIState.GAME);
    });
  }
  const btnCloseInv = document.getElementById('btn-close-inventory');
  if (btnCloseInv) {
    btnCloseInv.addEventListener('click', () => {
      setState(UIState.GAME);
    });
  }

  const btnResume = document.getElementById('btn-resume');
  if (btnResume) {
    btnResume.addEventListener('click', () => {
      setState(UIState.GAME);
    });
  }

  const btnQuit = document.getElementById('btn-quit');
  if (btnQuit) {
    btnQuit.addEventListener('click', () => {
      setState(UIState.MENU);
    });
  }

  let previousSettingsState = UIState.MENU;

  const btnSettings = document.getElementById('btn-settings');
  if (btnSettings) {
    btnSettings.addEventListener('click', () => {
      previousSettingsState = UIState.MENU;
      setState(UIState.SETTINGS);
    });
  }

  const btnPauseSettings = document.getElementById('btn-pause-settings');
  if (btnPauseSettings) {
    btnPauseSettings.addEventListener('click', () => {
      previousSettingsState = UIState.PAUSE;
      setState(UIState.SETTINGS);
    });
  }

  // Settings State Initialization and Binding
  const sliderMusic = document.getElementById('slider-music');
  const sliderSfx = document.getElementById('slider-sfx');
  const sliderSensitivity = document.getElementById('slider-sensitivity');
  const checkboxInvertY = document.getElementById('checkbox-invert-y');
  const selectMinimapMode = document.getElementById('select-minimap-mode');

  window.gameSettings = {
    musicVolume: parseInt(localStorage.getItem('game_music_volume') ?? '80'),
    sfxVolume: parseInt(localStorage.getItem('game_sfx_volume') ?? '70'),
    sensitivity: parseInt(localStorage.getItem('game_camera_sensitivity') ?? '100'),
    invertY: localStorage.getItem('game_invert_y') === 'true',
    minimapMode: localStorage.getItem('game_minimap_mode') ?? 'rotating'
  };

  if (sliderMusic) {
    sliderMusic.value = window.gameSettings.musicVolume;
    sliderMusic.addEventListener('input', (e) => {
      window.gameSettings.musicVolume = parseInt(e.target.value);
      localStorage.setItem('game_music_volume', window.gameSettings.musicVolume);
    });
  }
  if (sliderSfx) {
    sliderSfx.value = window.gameSettings.sfxVolume;
    sliderSfx.addEventListener('input', (e) => {
      window.gameSettings.sfxVolume = parseInt(e.target.value);
      localStorage.setItem('game_sfx_volume', window.gameSettings.sfxVolume);
    });
  }
  if (sliderSensitivity) {
    sliderSensitivity.value = window.gameSettings.sensitivity;
    sliderSensitivity.addEventListener('input', (e) => {
      window.gameSettings.sensitivity = parseInt(e.target.value);
      localStorage.setItem('game_camera_sensitivity', window.gameSettings.sensitivity);
    });
  }
  if (checkboxInvertY) {
    checkboxInvertY.checked = window.gameSettings.invertY;
    checkboxInvertY.addEventListener('change', (e) => {
      window.gameSettings.invertY = e.target.checked;
      localStorage.setItem('game_invert_y', window.gameSettings.invertY);
    });
  }
  if (selectMinimapMode) {
    selectMinimapMode.value = window.gameSettings.minimapMode;
    selectMinimapMode.addEventListener('change', (e) => {
      window.gameSettings.minimapMode = e.target.value;
      localStorage.setItem('game_minimap_mode', window.gameSettings.minimapMode);
    });
  }

  const btnCloseSettings = document.getElementById('btn-close-settings');
  if (btnCloseSettings) {
    btnCloseSettings.addEventListener('click', () => {
      setState(previousSettingsState);
    });
  }
}

/**
 * Updates player coordinates and status text in HUD
 */
export function updateHUD(playerPosition, health, maxHealth, stamina, maxStamina, adrenaline, maxAdrenaline, magic, maxMagic, timeString = "08:00", isNightState = false) {
  if (elPosX) elPosX.textContent = playerPosition.x.toFixed(2);
  if (elPosY) elPosY.textContent = playerPosition.y.toFixed(2);
  if (elPosZ) elPosZ.textContent = playerPosition.z.toFixed(2);

  // Health update
  const healthPct = maxHealth > 0 ? (health / maxHealth) * 100 : 0;
  if (elHealthBar) {
    elHealthBar.style.width = `${healthPct.toFixed(0)}%`;
  }
  if (elHealthPercent) {
    elHealthPercent.textContent = `${healthPct.toFixed(0)}%`;
  }

  // Stamina update
  const staminaPct = maxStamina > 0 ? (stamina / maxStamina) * 100 : 0;
  if (elStaminaBar) {
    elStaminaBar.style.width = `${staminaPct.toFixed(0)}%`;
    if (staminaPct < 20) {
      elStaminaBar.style.background = 'linear-gradient(90deg, #ff1744, #ff5252)';
    } else {
      elStaminaBar.style.background = 'linear-gradient(90deg, #00e5ff, #7c4dff)';
    }
  }
  if (elStaminaPercent) {
    elStaminaPercent.textContent = `${staminaPct.toFixed(0)}%`;
  }
  
  // Adrenaline update
  const adrenalinePct = maxAdrenaline > 0 ? (adrenaline / maxAdrenaline) * 100 : 0;
  if (elAdrenalineBar) {
    elAdrenalineBar.style.width = `${adrenalinePct.toFixed(0)}%`;
  }
  if (elAdrenalinePercent) {
    elAdrenalinePercent.textContent = `${adrenalinePct.toFixed(0)}%`;
  }

  // Magic update
  const magicPct = maxMagic > 0 ? (magic / maxMagic) * 100 : 0;
  if (elMagicBar) {
    elMagicBar.style.width = `${magicPct.toFixed(0)}%`;
  }
  if (elMagicPercent) {
    elMagicPercent.textContent = `${magicPct.toFixed(0)}%`;
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
 * Redraws the 2D pixel cultural minimap overlay with player indicator, compass, and grid
 * @param {THREE.Vector3} playerPosition 
 * @param {number} spacing 
 * @param {number} theta - Camera horizontal orbit angle
 */
export function updateMinimap(playerPosition, spacing, theta = 0) {
  if (!ctxMinimap || !elMinimap) return;
  
  const w = elMinimap.width;
  const h = elMinimap.height;
  const cx = w / 2;
  const cy = h / 2;
  const cellSizeX = w / GRID_WIDTH;
  const cellSizeZ = h / GRID_HEIGHT;
  
  // Calculate player position in grid pixels
  const px_pixels = (playerPosition.x / spacing) * cellSizeX;
  const pz_pixels = (playerPosition.z / spacing) * cellSizeZ;
  
  ctxMinimap.clearRect(0, 0, w, h);

  // Save context for map rotation/translation
  ctxMinimap.save();

  // Clip to circular border
  ctxMinimap.beginPath();
  ctxMinimap.arc(cx, cy, cx - 2, 0, Math.PI * 2);
  ctxMinimap.clip();

  const lookAngle = -theta - Math.PI;
  const rotationMode = window.gameSettings?.minimapMode === 'rotating';
  
  // forward = (-sinθ, -cosθ) in canvas space, angle = atan2(-cosθ,-sinθ) = lookAngle - π/2.
  // Fixed: arrow rotates by (lookAngle - π/2) to align tip with actual forward direction.
  // Rotating: rotate map so forward = canvas UP (-π/2). mapRotation = -π/2 - (lookAngle-π/2) = -lookAngle.
  // But forward canvas angle = lookAngle-π/2, want it at -π/2: mapRotation = -π/2-(lookAngle-π/2) = -lookAngle.
  const mapRotation = rotationMode ? -(lookAngle + Math.PI) : 0;
  const screenNorthAngle = rotationMode ? (lookAngle + Math.PI / 2) : -Math.PI / 2;

  // Translate origin to minimap center and apply rotation
  ctxMinimap.translate(cx, cy);
  ctxMinimap.rotate(mapRotation);

  // 1. Draw cultural cell grid
  for (let cz = 0; cz < GRID_HEIGHT; cz++) {
    for (let cx = 0; cx < GRID_WIDTH; cx++) {
      const idx = cz * GRID_WIDTH + cx;
      const culture = cellCultures[idx];
      ctxMinimap.fillStyle = culture ? culture.color : '#000000';
      
      const cellLeft = cx * cellSizeX - px_pixels;
      const cellTop  = cz * cellSizeZ - pz_pixels;
      ctxMinimap.fillRect(cellLeft, cellTop, cellSizeX, cellSizeZ);
    }
  }

  // 2. Draw Grid Lines (thin, semi-transparent for easy distance calculation)
  ctxMinimap.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctxMinimap.lineWidth = 1;
  // Vertical lines
  for (let c = 0; c <= GRID_WIDTH; c++) {
    const lx = c * cellSizeX - px_pixels;
    ctxMinimap.beginPath();
    ctxMinimap.moveTo(lx, -cy * 2);
    ctxMinimap.lineTo(lx, cy * 2);
    ctxMinimap.stroke();
  }
  // Horizontal lines
  for (let r = 0; r <= GRID_HEIGHT; r++) {
    const lz = r * cellSizeZ - pz_pixels;
    ctxMinimap.beginPath();
    ctxMinimap.moveTo(-cx * 2, lz);
    ctxMinimap.lineTo(cx * 2, lz);
    ctxMinimap.stroke();
  }

  // 3. Draw culture origin centers
  culturesList.forEach((culture) => {
    if (culture.center === null || culture.center === undefined) return;
    const mx = culture.center % GRID_WIDTH;
    const mz = Math.floor(culture.center / GRID_WIDTH) % GRID_HEIGHT;
    const wx = mx * cellSizeX - px_pixels + cellSizeX / 2;
    const wz = mz * cellSizeZ - pz_pixels + cellSizeZ / 2;
    
    ctxMinimap.beginPath();
    ctxMinimap.arc(wx, wz, 4, 0, Math.PI * 2);
    ctxMinimap.fillStyle = '#ffffff';
    ctxMinimap.fill();
    ctxMinimap.lineWidth = 1.5;
    ctxMinimap.strokeStyle = '#000000';
    ctxMinimap.stroke();
  });

  // Restore rotated context so we can draw fixed UI overlays (player arrow, scale bar, compass border)
  ctxMinimap.restore();

  // 4. Draw Player Indicator in center of the minimap
  ctxMinimap.save();
  ctxMinimap.translate(cx, cy);
  if (rotationMode) {
    // Rotating: map already orients forward=up. Arrow just needs to point straight up.
    ctxMinimap.rotate(0);
  } else {
    ctxMinimap.rotate(lookAngle + Math.PI / 2);
  }

  // Draw FOV cone — always opens toward canvas -Y (forward)
  const fov = 45 * Math.PI / 180;
  ctxMinimap.fillStyle = 'rgba(0, 229, 255, 0.15)';
  ctxMinimap.beginPath();
  ctxMinimap.moveTo(0, 0);
  ctxMinimap.arc(0, 0, 30, -Math.PI / 2 - fov / 2, -Math.PI / 2 + fov / 2);
  ctxMinimap.closePath();
  ctxMinimap.fill();

  // Draw player arrow — tip points along canvas -Y (up = forward)
  ctxMinimap.fillStyle = '#00e5ff';
  ctxMinimap.strokeStyle = '#ffffff';
  ctxMinimap.lineWidth = 1.5;
  ctxMinimap.beginPath();
  ctxMinimap.moveTo(0, -8);       // Tip pointing up (forward)
  ctxMinimap.lineTo(-5, 6);       // Back left
  ctxMinimap.lineTo(0, 3);        // Indent
  ctxMinimap.lineTo(5, 6);        // Back right
  ctxMinimap.closePath();
  ctxMinimap.fill();
  ctxMinimap.stroke();
  ctxMinimap.restore();

  // 5. Draw Distance Scale Bar (bottom-left)
  const scaleMeters = 100;
  const scalePixels = (scaleMeters / spacing) * cellSizeX;
  const bx = 16;
  const by = h - 20;
  ctxMinimap.strokeStyle = '#ffffff';
  ctxMinimap.lineWidth = 2;
  ctxMinimap.beginPath();
  ctxMinimap.moveTo(bx, by);
  ctxMinimap.lineTo(bx + scalePixels, by);
  ctxMinimap.moveTo(bx, by - 4);
  ctxMinimap.lineTo(bx, by + 4);
  ctxMinimap.moveTo(bx + scalePixels, by - 4);
  ctxMinimap.lineTo(bx + scalePixels, by + 4);
  ctxMinimap.stroke();

  ctxMinimap.fillStyle = '#ffffff';
  ctxMinimap.font = 'bold 9px sans-serif';
  ctxMinimap.textAlign = 'left';
  ctxMinimap.textBaseline = 'middle';
  ctxMinimap.fillText(`${scaleMeters}m`, bx + 4, by - 8);

  // 6. Draw Compass Indicators on the border
  const borderR = cx - 12;

  const directions = [
    { label: 'N', angle: screenNorthAngle, color: '#ff3b30', isNorth: true },
    { label: 'E', angle: screenNorthAngle + Math.PI / 2, color: '#ffffff' },
    { label: 'S', angle: screenNorthAngle + Math.PI, color: '#ffffff' },
    { label: 'W', angle: screenNorthAngle - Math.PI / 2, color: '#ffffff' }
  ];

  directions.forEach(dir => {
    const dx = cx + Math.cos(dir.angle) * borderR;
    const dy = cy + Math.sin(dir.angle) * borderR;

    // Draw small background dark circle for legibility
    ctxMinimap.fillStyle = 'rgba(10, 10, 15, 0.85)';
    ctxMinimap.beginPath();
    ctxMinimap.arc(dx, dy, 7, 0, Math.PI * 2);
    ctxMinimap.fill();

    // Draw letter
    ctxMinimap.fillStyle = dir.color;
    ctxMinimap.font = 'bold 9px sans-serif';
    ctxMinimap.textAlign = 'center';
    ctxMinimap.textBaseline = 'middle';
    ctxMinimap.fillText(dir.label, dx, dy);

    // Draw a small red indicator arrow on the border for North
    if (dir.isNorth) {
      ctxMinimap.save();
      ctxMinimap.translate(dx, dy);
      ctxMinimap.rotate(dir.angle + Math.PI / 2); // Rotate to point inward
      ctxMinimap.fillStyle = '#ff3b30';
      ctxMinimap.beginPath();
      ctxMinimap.moveTo(0, 7);
      ctxMinimap.lineTo(-3, 11);
      ctxMinimap.lineTo(3, 11);
      ctxMinimap.closePath();
      ctxMinimap.fill();
      ctxMinimap.restore();
    }
  });
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

/**
 * Displays a high-end location discovery overlay for entering cities or kingdoms
 * @param {string} title - The name of the city/kingdom
 * @param {string} type - The location type descriptor (e.g. "TERRITORY DISCOVERED", "CITY ENTERED")
 */
export function showDiscoveryBanner(title, type) {
  const existing = document.querySelector('.location-banner');
  if (existing) {
    existing.remove();
  }

  const banner = document.createElement('div');
  banner.className = 'location-banner';

  const subtitle = document.createElement('div');
  subtitle.className = 'location-banner-subtitle';
  subtitle.textContent = type;

  const mainTitle = document.createElement('h2');
  mainTitle.className = 'location-banner-title';
  mainTitle.textContent = title;

  banner.appendChild(subtitle);
  banner.appendChild(mainTitle);

  document.body.appendChild(banner);

  setTimeout(() => {
    if (banner.parentNode) {
      banner.remove();
    }
  }, 4000);
}
