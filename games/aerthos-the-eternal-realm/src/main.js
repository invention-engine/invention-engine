import * as THREE from 'three';
import { initTerrainData, buildTerrainMesh, SPACING, getTerrainHeight } from './terrain.js';
import { Player } from './player.js';
import { initUI, updateHUD, updateMinimap, hideLoadingScreen } from './ui.js';
import { updateAtmosphere } from './atmosphere.js';
import { spawnEcology } from './ecology.js';
import { loadThemeConfig } from './themeConfig.js';
import { 
  updateTimeCycle, 
  getTimeString, 
  isNight, 
  getSunMoonState 
} from './timeSystem.js';
import { 
  initDialogue, 
  isDialogueActive, 
  skipTypewriter, 
  openDialogue, 
  closeDialogue 
} from './dialogueSystem.js';
import { 
  activeQuests, 
  startSpiritHunt, 
  updateQuests, 
  restoreQuests, 
  saveGame, 
  loadGame 
} from './questSystem.js';

let scene, camera, renderer, lastTime = 0;
let player, terrainMesh, ecologyGroup;
let ambientLight, dirLight;
let isLoaded = false;
let interactables = [];
let worldData = null;

// Initialize the 3D and Engine environment
function init() {
  const container = document.getElementById('canvas-container');

  // 1. Create Scene & Atmospheric Styling (Premium Fog)
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x06070b);
  scene.fog = new THREE.FogExp2(0x06070b, 0.0015);

  // 2. Setup Camera
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.5, 3000);

  // 3. Setup Renderer with Advanced Shadows
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  container.appendChild(renderer.domElement);

  // 4. Setup Ambient and Celestial Directional Lights
  ambientLight = new THREE.AmbientLight(0x1a1c2d, 1.2);
  scene.add(ambientLight);

  // Dramatic directional light (simulating star or moon glow)
  dirLight = new THREE.DirectionalLight(0x8a70f5, 1.8);
  dirLight.position.set(200, 400, 300);
  dirLight.castShadow = true;
  
  // Shadow camera optimization for large terrain
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 1500;
  
  const d = 600;
  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;
  dirLight.shadow.bias = -0.0005;
  
  scene.add(dirLight);

  // Set light target to map center
  const mapCenter = (32 * 31.62) / 2; // GRID_WIDTH * SPACING / 2
  dirLight.target.position.set(mapCenter, 0, mapCenter);
  scene.add(dirLight.target);

  // Decorative grid helper for space orientation (optional)
  const gridHelper = new THREE.GridHelper(2000, 50, 0x302060, 0x151030);
  gridHelper.position.y = -0.2;
  scene.add(gridHelper);

  // Initialize dialogue box DOM bindings
  initDialogue();

  // Setup timing for delta time calculation
  lastTime = performance.now();

  // 5. Load the Procedural World Data
  loadWorldData();

  // 6. Event Listeners
  window.addEventListener('resize', onWindowResize);

  // Key E interaction listener
  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'e') {
      if (isDialogueActive) {
        skipTypewriter();
      } else if (window.currentInteractable) {
        talkToCultureCenter(window.currentInteractable.culture);
      }
    }
  });
}

// Branching dialogue tree handler for culture centers
function talkToCultureCenter(culture) {
  const name = culture.name;
  const greetingText = `Welcome to the ${name} cultural center. We are the ${name} people. ${culture.description || ''}`;
  
  const choices = [];
  
  // 1. Ask about Creation Myth
  choices.push({
    text: "Ask about Creation Myth",
    action: () => {
      openDialogue(
        `${name} Elder`,
        `${name} Lore`,
        worldData.lore.creationMyth,
        [{ text: "Go Back", action: () => talkToCultureCenter(culture) }]
      );
    }
  });
  
  // 2. Ask about Local Traditions
  choices.push({
    text: "Ask about Local Traditions",
    action: () => {
      let traditionsText = "";
      if (culture.traditions && culture.traditions.length > 0) {
        traditionsText = culture.traditions.join("\n\n");
      } else {
        traditionsText = "We live simply and follow the natural flow of the world, keeping our customs in our hearts.";
      }
      openDialogue(
        `${name} Elder`,
        `${name} Traditions`,
        traditionsText,
        [{ text: "Go Back", action: () => talkToCultureCenter(culture) }]
      );
    }
  });
  
  // 3. Custom Action/Trials
  if (name === 'Slovan') {
    choices.push({
      text: "Request Hearthstone Blessing (Save Game)",
      action: () => {
        saveGame(player.position);
        openDialogue(
          "Slovan Shrine",
          "Hearthstone Blessing",
          "The Hearthstone glows with a warm, comforting light. Your spirit is bound to this sanctuary. (Your position and quest progress have been saved to local storage!)",
          [{ text: "Go Back", action: () => talkToCultureCenter(culture) }]
        );
      }
    });
  } else if (name === 'Astellian') {
    choices.push({
      text: "Perform Stargazer's Vigil (Night Buff)",
      action: () => {
        if (isNight()) {
          player.stamina = player.maxStamina;
          player.adrenaline = player.maxAdrenaline;
          openDialogue(
            "Astellian Observatory",
            "Stargazer's Vigil",
            "You look up at the cosmic tapestry. The stellar currents realign, charging your body with astral energy! Stamina and Adrenaline filled to 100%.",
            [{ text: "Go Back", action: () => talkToCultureCenter(culture) }]
          );
        } else {
          openDialogue(
            "Astellian Observatory",
            "Stargazer's Vigil",
            "The solar glare obscures the stars. The observatory's energies slumber. Return here during the night phase (between 19:30 and 05:30) to perform the vigil.",
            [{ text: "Go Back", action: () => talkToCultureCenter(culture) }]
          );
        }
      }
    });
  } else if (name === 'Wildlands') {
    let questOptionText = "Seek the Spirit Hunt";
    if (activeQuests.spiritHunt === 'active') {
      questOptionText = "Inquire about Spirit Hunt";
    } else if (activeQuests.spiritHunt === 'completed') {
      questOptionText = "Reflect on Spirit Hunt";
    }
    
    choices.push({
      text: questOptionText,
      action: () => {
        if (activeQuests.spiritHunt === 'inactive') {
          startSpiritHunt(scene, player.position);
          openDialogue(
            "Wildlands Huntmaster",
            "Wildlands Hunt",
            "The Huntmaster nods, handing you a tracking charm. 'A spectral beast has been sighted in the wildwoods. Follow the skyward light beam, hunt the beast, and honor its spirit.' (The Spirit Hunt quest is now active! Follow the cyan beacon.)",
            [{ text: "Go Back", action: () => talkToCultureCenter(culture) }]
          );
        } else if (activeQuests.spiritHunt === 'active') {
          openDialogue(
            "Wildlands Huntmaster",
            "Wildlands Hunt",
            "The spectral beast still wanders the woods. Follow the cyan light beam into the wildwoods and honor the spirit.",
            [{ text: "Go Back", action: () => talkToCultureCenter(culture) }]
          );
        } else if (activeQuests.spiritHunt === 'completed') {
          openDialogue(
            "Wildlands Huntmaster",
            "Wildlands Hunt",
            "You have honored the spirit beast and returned balance to the forest. The wildwoods smile upon you.",
            [{ text: "Go Back", action: () => talkToCultureCenter(culture) }]
          );
        }
      }
    });
  }
  
  // 4. Leave
  choices.push({
    text: "Leave",
    action: () => {}
  });
  
  openDialogue(
    name === 'Wildlands' ? 'Wildlands Huntmaster' : name === 'Slovan' ? 'Slovan Shrine' : name === 'Astellian' ? 'Astellian Observatory' : `${name} Monument`,
    `${name} Center`,
    greetingText,
    choices
  );
}

// Asynchronously load the world generator data
async function loadWorldData() {
  try {
    const response = await fetch('./game/config/world.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch world.json: ${response.statusText}`);
    }
    
    worldData = await response.json();
    
    // Load theme configuration
    await loadThemeConfig();
    
    // Ingest and construct modules
    initTerrainData(worldData);
    
    terrainMesh = buildTerrainMesh();
    scene.add(terrainMesh);
    
    // Spawn procedural vegetation and ruins
    ecologyGroup = spawnEcology(scene, worldData.seed);
    
    await initUI(worldData);
    
    // Instantiate Player with custom controls & camera follow rig
    player = new Player(scene, camera, renderer.domElement);
    
    // Populate interactables list from cultural center coordinates
    interactables = [];
    const culturesList = worldData.pack.cultures || [];
    culturesList.forEach((culture) => {
      if (culture.center === null || culture.center === undefined) return;
      const cx = culture.center % 32;
      const cz = Math.floor(culture.center / 32);
      const wx = cx * SPACING;
      const wz = cz * SPACING;
      const wy = getTerrainHeight(wx, wz);
      
      interactables.push({
        name: culture.name === 'Wildlands' ? 'Wildlands Huntmaster' : culture.name === 'Slovan' ? 'Slovan Shrine' : culture.name === 'Astellian' ? 'Astellian Observatory' : `${culture.name} Monument`,
        culture: culture,
        position: new THREE.Vector3(wx, wy, wz),
        radius: 6.5
      });
    });

    isLoaded = true;
    
    // Expose variables on window for testing/debugging
    window.player = player;
    window.interactables = interactables;
    window.talkToCultureCenter = talkToCultureCenter;
    
    // Fade loading screen out smoothly
    hideLoadingScreen();
    
    // Query if a save game exists at start to offer player location recovery
    const saveData = loadGame();
    if (saveData) {
      restoreQuests(saveData);
      
      // Delay slightly to allow loading screen fade to begin
      setTimeout(() => {
        openDialogue(
          "Sanctuary Recall",
          "Hearthstone network",
          "An echo of your past self has been detected at a Slovan Hearthstone. Would you like to restore your location and active quests, or begin a new journey?",
          [
            {
              text: "Recall Location",
              action: () => {
                player.position.set(saveData.position.x, saveData.position.y, saveData.position.z);
                player.group.position.copy(player.position);
                
                if (activeQuests.spiritHunt === 'active') {
                  startSpiritHunt(scene, player.position);
                }
                
                openDialogue(
                  "Sanctuary Recall",
                  "Recall successful",
                  "Recall coordinates stabilized. The spirits watch over you.",
                  [{ text: "Begin", action: () => {} }]
                );
              }
            },
            {
              text: "Start Fresh",
              action: () => {
                activeQuests.spiritHunt = 'inactive';
                openDialogue(
                  "Sanctuary Recall",
                  "Recall bypassed",
                  "Your journey starts anew from the coordinates of the Wildlands.",
                  [{ text: "Begin", action: () => {} }]
                );
              }
            }
          ]
        );
      }, 500);
    }
    
    // Initialize timing and start loop
    lastTime = performance.now();
    animate();
    
  } catch (error) {
    console.error("Critical error loading the world configuration:", error);
    const loadingSub = document.querySelector('.loading-sub');
    if (loadingSub) {
      loadingSub.textContent = "Error: Could not parse world configuration. Check console for logs.";
      loadingSub.style.color = "#ff4d4d";
    }
  }
}

// Window resize handler
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Main tick loop
function animate() {
  requestAnimationFrame(animate);

  if (!isLoaded) return;

  const currentTime = performance.now();
  const dt = (currentTime - lastTime) / 1000;
  lastTime = currentTime;

  // Update time cycle
  updateTimeCycle(dt);

  // Update directional light celestial angles
  const { sunPos, moonPos, sunVisible } = getSunMoonState();
  const mapCenter = (32 * 31.62) / 2;
  const targetPos = sunVisible ? sunPos : moonPos;
  dirLight.position.set(
    targetPos.x + mapCenter,
    targetPos.y,
    targetPos.z + mapCenter
  );

  // Distance Culling for Spatial Chunks
  if (ecologyGroup && ecologyGroup.children) {
    ecologyGroup.children.forEach((chunk) => {
      if (chunk.userData && chunk.userData.centerX !== undefined) {
        const cx = chunk.userData.centerX;
        const cz = chunk.userData.centerZ;
        const dx = player.position.x - cx;
        const dz = player.position.z - cz;
        const distSq = dx * dx + dz * dz;
        
        // Hide chunks further than 300 meters
        if (distSq > 300 * 300) {
          chunk.visible = false;
        } else {
          chunk.visible = true;
        }
      }
    });
  }

  // Proximity prompts & interaction checks
  let nearestInteractable = null;
  let minInteractionDist = Infinity;
  
  interactables.forEach((item) => {
    const dist = player.position.distanceTo(item.position);
    if (dist < item.radius) {
      if (dist < minInteractionDist) {
        minInteractionDist = dist;
        nearestInteractable = item;
      }
    }
  });
  
  const promptEl = document.getElementById('interaction-prompt');
  if (nearestInteractable && !isDialogueActive) {
    if (promptEl) {
      promptEl.style.display = 'block';
      promptEl.innerHTML = `Press <kbd class="key-cap" style="background: var(--accent-color); border-color: rgba(255,255,255,0.4); box-shadow: none;">E</kbd> to talk to ${nearestInteractable.name}`;
    }
    window.currentInteractable = nearestInteractable;
  } else {
    if (promptEl) promptEl.style.display = 'none';
    window.currentInteractable = null;
  }

  // Update locomotion, camera, physics, and animations
  player.update(dt, isDialogueActive);
  
  // Update environment fog and lights per culture region
  updateAtmosphere(scene, ambientLight, dirLight, player.position, dt);

  // Tick active quest waypoints
  updateQuests(scene, player, dt);
  
  // Refresh HUD readings & minimap
  updateHUD(
    player.position,
    player.health,
    player.maxHealth,
    player.stamina,
    player.maxStamina,
    player.adrenaline,
    player.maxAdrenaline,
    player.magic,
    player.maxMagic,
    getTimeString(),
    isNight()
  );
  updateMinimap(player.position, SPACING);

  // Render the frame
  renderer.render(scene, camera);
}

// Launch the system on load
window.addEventListener('DOMContentLoaded', init);
