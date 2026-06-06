// uiState.js – lightweight UI state machine for the RPG Engine

export const UIState = Object.freeze({
  GAME: 'game',
  MENU: 'menu',
  SETTINGS: 'settings',
  INVENTORY: 'inventory',
  PAUSE: 'pause'
});

let currentState = UIState.MENU;

export function getState() {
  return currentState;
}

export function setState(newState) {
  if (Object.values(UIState).includes(newState)) {
    const oldState = currentState;
    currentState = newState;
    // Toggle Menu/Inventory/Pause visibility based on state
    const menuEl = document.getElementById('game-menu');
    const inventoryEl = document.getElementById('game-inventory');
    const pauseEl = document.getElementById('game-pause');
    
    if (menuEl) {
      if (newState === UIState.MENU) {
        menuEl.classList.remove('hidden');
      } else {
        menuEl.classList.add('hidden');
      }
    }
    
    if (inventoryEl) {
      if (newState === UIState.INVENTORY) {
        inventoryEl.classList.remove('hidden');
      } else {
        inventoryEl.classList.add('hidden');
      }
    }

    if (pauseEl) {
      if (newState === UIState.PAUSE) {
        pauseEl.classList.remove('hidden');
      } else {
        pauseEl.classList.add('hidden');
      }
    }

    const settingsEl = document.getElementById('game-settings');
    if (settingsEl) {
      if (newState === UIState.SETTINGS) {
        settingsEl.classList.remove('hidden');
      } else {
        settingsEl.classList.add('hidden');
      }
    }

    // Hook: when leaving GAME, release pointer lock; when entering GAME, request it
    if (oldState === UIState.GAME && newState !== UIState.GAME) {
      if (document.exitPointerLock && document.pointerLockElement) {
        document.exitPointerLock();
      }
    } else if (oldState !== UIState.GAME && newState === UIState.GAME) {
      // Re‑request pointer lock on the canvas element (assumed to be the renderer's DOM element)
      const canvas = document.querySelector('canvas');
      if (canvas && canvas.requestPointerLock) {
        canvas.requestPointerLock();
      }
    }
  }
}

export function toggleMenu() {
  setState(currentState === UIState.MENU ? UIState.GAME : UIState.MENU);
}

export function toggleInventory() {
  setState(currentState === UIState.INVENTORY ? UIState.GAME : UIState.INVENTORY);
}

export function toggleSettings() {
  setState(currentState === UIState.SETTINGS ? UIState.GAME : UIState.SETTINGS);
}

export function togglePause() {
  setState(currentState === UIState.PAUSE ? UIState.GAME : UIState.PAUSE);
}

// Auto pause when pointer lock is exited (e.g. Esc pressed)
document.addEventListener('pointerlockchange', () => {
  if (!document.pointerLockElement && currentState === UIState.GAME) {
    setState(UIState.PAUSE);
  }
});
