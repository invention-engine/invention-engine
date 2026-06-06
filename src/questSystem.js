import * as THREE from 'three';
import { getTerrainHeight } from './terrain.js';
import { openDialogue } from './dialogueSystem.js';

export let activeQuests = {
  spiritHunt: 'inactive' // 'inactive', 'active', 'completed'
};

export let spectralBeast = null;
export let waypointMarker = null;

/**
 * Saves the player game state to localStorage
 * @param {THREE.Vector3} playerPosition 
 */
export function saveGame(playerPosition) {
  const saveData = {
    position: { x: playerPosition.x, y: playerPosition.y, z: playerPosition.z },
    quests: { ...activeQuests },
    timestamp: Date.now()
  };
  localStorage.setItem('rpg_save_game', JSON.stringify(saveData));
  return true;
}

/**
 * Retrieves the saved game state from localStorage
 * @returns {Object|null}
 */
export function loadGame() {
  const rawData = localStorage.getItem('rpg_save_game');
  if (!rawData) return null;
  try {
    return JSON.parse(rawData);
  } catch (e) {
    console.error("Failed to parse save game data:", e);
    return null;
  }
}

/**
 * Initiates the Wildlands "Spirit-Hunting" quest line
 * @param {THREE.Scene} scene 
 * @param {THREE.Vector3} playerPosition 
 */
export function startSpiritHunt(scene, playerPosition) {
  activeQuests.spiritHunt = 'active';
  
  // Calculate a spawn point approximately 180m away from the player in a random direction
  const angle = Math.random() * Math.PI * 2;
  const dist = 120 + Math.random() * 80;
  
  const bx = playerPosition.x + Math.cos(angle) * dist;
  const bz = playerPosition.z + Math.sin(angle) * dist;
  const by = getTerrainHeight(bx, bz);
  
  // Create Ethereal Spectral Beast Core (icosahedron geometry + glowing cyan)
  const geom = new THREE.IcosahedronGeometry(0.8, 1);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x00e5ff,
    emissive: 0x00bcd4,
    emissiveIntensity: 2.0,
    roughness: 0.1,
    wireframe: true
  });
  
  spectralBeast = new THREE.Group();
  const beastCore = new THREE.Mesh(geom, mat);
  beastCore.castShadow = true;
  spectralBeast.add(beastCore);
  
  // Orbiting rings for the spirit beast
  const ringGeo = new THREE.TorusGeometry(1.2, 0.04, 8, 32);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.6 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2;
  spectralBeast.add(ring);
  
  // Point light to illuminate surrounding terrain
  const light = new THREE.PointLight(0x00e5ff, 4.0, 25);
  light.position.y = 1.0;
  spectralBeast.add(light);
  
  spectralBeast.position.set(bx, by + 1.2, bz);
  scene.add(spectralBeast);
  
  // Vertical Guide Waypoint Light Beam (sky beacon)
  const wpGeom = new THREE.CylinderGeometry(0.08, 0.08, 200, 6);
  const wpMat = new THREE.MeshBasicMaterial({
    color: 0x00e5ff,
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide
  });
  waypointMarker = new THREE.Mesh(wpGeom, wpMat);
  waypointMarker.position.set(bx, by + 100, bz);
  scene.add(waypointMarker);
}

/**
 * Handles the updates for active quests, verifying completion states
 * @param {THREE.Scene} scene 
 * @param {Object} player - Player instance
 * @param {number} deltaTime 
 */
export function updateQuests(scene, player, deltaTime) {
  if (activeQuests.spiritHunt === 'active' && spectralBeast) {
    // 1. Rotate the beast core and animate height bobbing
    const time = performance.now() * 0.005;
    
    // Animate core components
    spectralBeast.children[0].rotation.y += 0.8 * deltaTime;
    spectralBeast.children[0].rotation.x += 0.4 * deltaTime;
    
    // Rotate ring
    spectralBeast.children[1].rotation.z -= 1.2 * deltaTime;
    
    // Floating bob
    const baseHeight = getTerrainHeight(spectralBeast.position.x, spectralBeast.position.z);
    spectralBeast.position.y = baseHeight + 1.2 + Math.sin(time) * 0.25;
    
    // Sync waypoint position
    if (waypointMarker) {
      waypointMarker.position.y = baseHeight + 100;
    }
    
    // 2. Check collision/closeness to player
    const dist = player.position.distanceTo(spectralBeast.position);
    if (dist < 3.8) {
      // Quest Completed!
      activeQuests.spiritHunt = 'completed';
      
      // Clean scene objects
      scene.remove(spectralBeast);
      scene.remove(waypointMarker);
      
      spectralBeast = null;
      waypointMarker = null;
      
      // Grant maximum adrenaline/spirit energy
      player.adrenaline = 100.0;
      
      // Auto open dialogue to celebrate completion
      setTimeout(() => {
        openDialogue(
          'Spirit Beast',
          'Wildlands Spirit Hunted',
          'The Ethereal Beast gazes into your soul. You bow, honoring its presence. With a gentle chime, the spirit dissolves back into the wildwood, infusing you with a permanent blessing of nature. Adrenaline filled to 100%!',
          [{ text: 'Honor the Wildwood', action: () => {} }]
        );
      }, 200);
    }
  }
}

/**
 * Restores the quest statuses from loaded save data
 * @param {Object} saveData 
 */
export function restoreQuests(saveData) {
  if (saveData && saveData.quests) {
    activeQuests = { ...saveData.quests };
  }
}
