import * as THREE from 'three';
import { getTerrainHeight, getTerrainSlope, getCultureAt, SPACING, GRID_WIDTH, GRID_HEIGHT, culturesList } from './terrain.js';
import { ACTIVE_THEME, themeConfig } from './themeConfig.js';

// Collision obstacles registry (x, z, radius)
export let obstacles = [];

// Cache for geometries and materials to prevent memory duplication
const geometriesCache = {};
const materialsCache = {};

let treePrototypes = [];

function getGeometry(key, creatorFunc) {
  if (!geometriesCache[key]) {
    geometriesCache[key] = creatorFunc();
  }
  return geometriesCache[key];
}

function getMaterial(key, creatorFunc) {
  if (!materialsCache[key]) {
    materialsCache[key] = creatorFunc();
  }
  return materialsCache[key];
}

function getGeometryAndMaterial(partKey) {
  const def = getPartDefinition(partKey);
  if (!def) return null;
  
  const geo = getGeometry(partKey, def.geo);
  const mat = getMaterial(partKey, def.mat);
  
  return { geo, mat };
}

// Seed-based Pseudo-Random Number Generator (LCG)
function createRandom(seedString) {
  let h = 0;
  for (let i = 0; i < seedString.length; i++) {
    h = Math.imul(31, h) + seedString.charCodeAt(i) | 0;
  }
  return function() {
    h = Math.imul(48271, h) | 0;
    return (h & 0x7fffffff) / 2147483647;
  };
}

// Helper to push part transformation matrices
function pushPartMatrix(cData, partKey, baseMatrix, localMatrix) {
  if (!cData.parts[partKey]) {
    cData.parts[partKey] = [];
  }
  const m = baseMatrix.clone().multiply(localMatrix);
  cData.parts[partKey].push(m);
}

// Add procedural tree components to chunk data
function addTreeToChunk(cData, cultureName, x, y, z, rotY, s) {
  const baseMatrix = new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY),
    new THREE.Vector3(s, s, s)
  );

  const theme = themeConfig[ACTIVE_THEME];
  const treeConfig = theme.trees[cultureName] || theme.trees['default'];
  const type = treeConfig.type;

  if (treePrototypes.length > 0) {
    const treeTypeMap = {
      'glowing': 0,
      'pine': 1,
      'gear': 2,
      'crystalline': 3,
      'arcane': 4,
      'standard': 5
    };
    const typeIndex = treeTypeMap[type] !== undefined ? treeTypeMap[type] : 5;
    const protoIndex = typeIndex % treePrototypes.length;
    const partKey = `gltf_tree_${protoIndex}`;
    
    const proto = treePrototypes[protoIndex];
    const localMatrix = proto ? proto.matrixWorld : new THREE.Matrix4();
    
    pushPartMatrix(cData, partKey, baseMatrix, localMatrix);
    return;
  }

  if (type === 'glowing') {
    // Elladan tree (glowing canopy & hanging bulbs)
    pushPartMatrix(cData, 'tree_trunk_glowing', baseMatrix, new THREE.Matrix4().makeTranslation(0, 0.5, 0));
    pushPartMatrix(cData, 'tree_leaves_glowing', baseMatrix, new THREE.Matrix4().makeTranslation(0, 5.0, 0));
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const bx = Math.cos(angle) * 1.8;
      const bz = Math.sin(angle) * 1.8;
      const by = 3.5;
      pushPartMatrix(cData, 'tree_bulb_glowing', baseMatrix, new THREE.Matrix4().makeTranslation(bx, by, bz));
    }
  } 
  else if (type === 'pine') {
    // Wildlands tree (two cone segments)
    pushPartMatrix(cData, 'tree_trunk_pine', baseMatrix, new THREE.Matrix4().makeTranslation(0, 0.0, 0));
    pushPartMatrix(cData, 'tree_leaves1_pine', baseMatrix, new THREE.Matrix4().makeTranslation(0, 3.5, 0));
    pushPartMatrix(cData, 'tree_leaves2_pine', baseMatrix, new THREE.Matrix4().makeTranslation(0, 5.5, 0));
  } 
  else if (type === 'gear') {
    // Shwazen tree (clockwork gear canopy)
    pushPartMatrix(cData, 'tree_trunk_gear', baseMatrix, new THREE.Matrix4().makeTranslation(0, 1.0, 0));
    pushPartMatrix(cData, 'tree_leaves_gear', baseMatrix, new THREE.Matrix4().makeTranslation(0, 5.5, 0));
    
    const gearMatrix = new THREE.Matrix4().makeRotationX(Math.PI / 2);
    gearMatrix.setPosition(0, 3.0, 0);
    pushPartMatrix(cData, 'tree_gear_gear', baseMatrix, gearMatrix);
  } 
  else if (type === 'crystalline') {
    // Astellian tree (faceted crystals)
    pushPartMatrix(cData, 'tree_trunk_crystalline', baseMatrix, new THREE.Matrix4().makeTranslation(0, 0.5, 0));
    pushPartMatrix(cData, 'tree_leaves_crystalline', baseMatrix, new THREE.Matrix4().makeTranslation(0, 5.0, 0));
  } 
  else if (type === 'arcane') {
    // Luari tree (floating satelittes)
    pushPartMatrix(cData, 'tree_trunk_arcane', baseMatrix, new THREE.Matrix4().makeTranslation(0, 0.0, 0));
    pushPartMatrix(cData, 'tree_leaves_arcane', baseMatrix, new THREE.Matrix4().makeTranslation(0, 4.5, 0));
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      const sx = Math.cos(angle) * 2.2;
      const sz = Math.sin(angle) * 2.2;
      const sy = 4.5;
      pushPartMatrix(cData, 'tree_sat_arcane', baseMatrix, new THREE.Matrix4().makeTranslation(sx, sy, sz));
    }
  } 
  else {
    // Standard tree
    pushPartMatrix(cData, 'tree_trunk_standard', baseMatrix, new THREE.Matrix4().makeTranslation(0, 0.0, 0));
    pushPartMatrix(cData, 'tree_leaves_standard', baseMatrix, new THREE.Matrix4().makeTranslation(0, 4.0, 0));
  }
}

// Add procedural structure components to chunk data
function addStructureToChunk(cData, cultureName, x, y, z, rotY, s) {
  const baseMatrix = new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY),
    new THREE.Vector3(s, s, s)
  );

  const theme = themeConfig[ACTIVE_THEME];
  const structConfig = theme.structures[cultureName] || theme.structures['Slovan'];
  const type = structConfig.type;

  if (type === 'industrial') {
    // Shwazen structure (boiler column + venting glow)
    pushPartMatrix(cData, 'struct_base_industrial', baseMatrix, new THREE.Matrix4().makeTranslation(0, 0.5, 0));
    pushPartMatrix(cData, 'struct_pipe_industrial', baseMatrix, new THREE.Matrix4().makeTranslation(0, 4.5, 0));
    cData.lights.push({ 
      color: structConfig.lightColor, 
      intensity: 2.0, 
      distance: 12, 
      offset: new THREE.Vector3(0, 8.5, 0).applyMatrix4(baseMatrix) 
    });
  } 
  else if (type === 'pillar') {
    // Astellian structure (white dome pillar)
    pushPartMatrix(cData, 'struct_base_pillar', baseMatrix, new THREE.Matrix4().makeTranslation(0, 0.6, 0));
    pushPartMatrix(cData, 'struct_shaft_pillar', baseMatrix, new THREE.Matrix4().makeTranslation(0, 5.7, 0));
    pushPartMatrix(cData, 'struct_top_pillar', baseMatrix, new THREE.Matrix4().makeTranslation(0, 10.7, 0));
  } 
  else if (type === 'archway') {
    // Elladan structure (mossy ruins arch)
    pushPartMatrix(cData, 'struct_p1_archway', baseMatrix, new THREE.Matrix4().makeTranslation(-2.5, 3.5, 0));
    pushPartMatrix(cData, 'struct_p2_archway', baseMatrix, new THREE.Matrix4().makeTranslation(2.5, 3.5, 0));
    pushPartMatrix(cData, 'struct_arch_archway', baseMatrix, new THREE.Matrix4().makeTranslation(0, 7.2, 0));
  } 
  else if (type === 'obelisk') {
    // Luari structure (floating magical core obelisk)
    pushPartMatrix(cData, 'struct_ped_obelisk', baseMatrix, new THREE.Matrix4().makeTranslation(0, 0.4, 0));
    pushPartMatrix(cData, 'struct_core_obelisk', baseMatrix, new THREE.Matrix4().makeTranslation(0, 4.8, 0));
    cData.lights.push({ 
      color: structConfig.lightColor, 
      intensity: 2.5, 
      distance: 18, 
      offset: new THREE.Vector3(0, 4.8, 0).applyMatrix4(baseMatrix) 
    });
  } 
  else if (type === 'yurt') {
    // Ulus / Turchian structures (nomadic dome tents)
    pushPartMatrix(cData, 'struct_base_yurt', baseMatrix, new THREE.Matrix4().makeTranslation(0, 1.2, 0));
    pushPartMatrix(cData, 'struct_roof_yurt', baseMatrix, new THREE.Matrix4().makeTranslation(0, 3.3, 0));
    pushPartMatrix(cData, 'struct_door_yurt', baseMatrix, new THREE.Matrix4().makeTranslation(0, 0.8, 2.9));
  } 
  else if (type === 'campfire') {
    // Wildlands structure (detailed log campfire + stones + point light)
    const l1Mat = new THREE.Matrix4().makeRotationZ(Math.PI / 2).multiply(new THREE.Matrix4().makeRotationY(Math.PI / 4));
    l1Mat.setPosition(0, 0.15, 0);
    pushPartMatrix(cData, 'struct_log1_campfire', baseMatrix, l1Mat);

    const l2Mat = new THREE.Matrix4().makeRotationZ(Math.PI / 2).multiply(new THREE.Matrix4().makeRotationY(-Math.PI / 4));
    l2Mat.setPosition(0, 0.15, 0);
    pushPartMatrix(cData, 'struct_log2_campfire', baseMatrix, l2Mat);

    pushPartMatrix(cData, 'struct_fire_campfire', baseMatrix, new THREE.Matrix4().makeTranslation(0, 0.45, 0));

    const numStones = 8;
    const stoneRadius = 1.0;
    for (let i = 0; i < numStones; i++) {
      const angle = (i / numStones) * Math.PI * 2;
      const sx = Math.cos(angle) * stoneRadius;
      const sz = Math.sin(angle) * stoneRadius;
      const sy = 0.1;
      const stMat = new THREE.Matrix4().compose(
        new THREE.Vector3(sx, sy, sz),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, 0)),
        new THREE.Vector3(1, 1, 1)
      );
      pushPartMatrix(cData, 'struct_stone_campfire', baseMatrix, stMat);
    }

    cData.lights.push({ 
      color: structConfig.lightColor, 
      intensity: 4.0, 
      distance: 22, 
      offset: new THREE.Vector3(0, 1.0, 0).applyMatrix4(baseMatrix) 
    });
  } 
  else {
    // Slovan village shrine
    pushPartMatrix(cData, 'struct_base_shrine', baseMatrix, new THREE.Matrix4().makeTranslation(0, 1.5, 0));
    
    const rMat = new THREE.Matrix4().makeRotationY(Math.PI / 4);
    rMat.setPosition(0, 3.6, 0);
    pushPartMatrix(cData, 'struct_roof_shrine', baseMatrix, rMat);
  }
}

// Return geometry and material factory configurations based on the active theme
function getPartDefinition(partKey) {
  if (partKey.startsWith('gltf_tree_')) {
    const idx = parseInt(partKey.split('_')[2]);
    const proto = treePrototypes[idx % treePrototypes.length];
    if (proto) {
      return {
        geo: () => proto.geometry,
        mat: () => proto.material
      };
    }
  }

  const theme = themeConfig[ACTIVE_THEME];
  
  switch (partKey) {
    // --- Trees ---
    case 'tree_trunk_glowing':
      return {
        geo: () => new THREE.CylinderGeometry(0.3, 0.6, 11, 6),
        mat: () => new THREE.MeshStandardMaterial({ color: theme.trees.Elladan.trunkColor, roughness: 0.3, metalness: ACTIVE_THEME === 'cyberpunk' ? 0.9 : 0.5, flatShading: true })
      };
    case 'tree_leaves_glowing':
      return {
        geo: () => new THREE.DodecahedronGeometry(2.5, 1),
        mat: () => new THREE.MeshStandardMaterial({
          color: theme.trees.Elladan.leavesColor,
          emissive: theme.trees.Elladan.leavesColor,
          emissiveIntensity: ACTIVE_THEME === 'cyberpunk' ? 1.5 : 0.7,
          roughness: 0.2,
          flatShading: true
        })
      };
    case 'tree_bulb_glowing':
      return {
        geo: () => new THREE.SphereGeometry(0.3, 8, 8),
        mat: () => new THREE.MeshBasicMaterial({ color: theme.trees.Elladan.bulbColor })
      };

    case 'tree_trunk_pine':
      return {
        geo: () => new THREE.CylinderGeometry(0.4, 0.7, 10, 6),
        mat: () => new THREE.MeshStandardMaterial({ color: theme.trees.Wildlands.trunkColor, roughness: 0.9, flatShading: true })
      };
    case 'tree_leaves1_pine':
      return {
        geo: () => new THREE.ConeGeometry(2.2, 5, 5),
        mat: () => new THREE.MeshStandardMaterial({ color: theme.trees.Wildlands.leavesColor, roughness: 0.8, flatShading: true })
      };
    case 'tree_leaves2_pine':
      return {
        geo: () => new THREE.ConeGeometry(1.7, 4, 5),
        mat: () => new THREE.MeshStandardMaterial({ color: theme.trees.Wildlands.leavesColor, roughness: 0.8, flatShading: true })
      };

    case 'tree_trunk_gear':
      return {
        geo: () => new THREE.CylinderGeometry(0.5, 0.5, 12, 4),
        mat: () => new THREE.MeshStandardMaterial({ color: theme.trees.Shwazen.trunkColor, metalness: 0.9, roughness: 0.1, flatShading: true })
      };
    case 'tree_leaves_gear':
      return {
        geo: () => new THREE.OctahedronGeometry(2.2, 0),
        mat: () => new THREE.MeshStandardMaterial({ color: theme.trees.Shwazen.leavesColor, metalness: 0.8, roughness: 0.3, flatShading: true })
      };
    case 'tree_gear_gear':
      return {
        geo: () => new THREE.CylinderGeometry(1.2, 1.2, 0.2, 8),
        mat: () => new THREE.MeshStandardMaterial({ color: theme.trees.Shwazen.gearColor, metalness: 0.8, roughness: 0.2 })
      };

    case 'tree_trunk_crystalline':
      return {
        geo: () => new THREE.CylinderGeometry(0.2, 0.5, 11, 5),
        mat: () => new THREE.MeshStandardMaterial({ color: theme.trees.Astellian.trunkColor, metalness: 0.6, roughness: 0.2, flatShading: true })
      };
    case 'tree_leaves_crystalline':
      return {
        geo: () => new THREE.IcosahedronGeometry(2.0, 0),
        mat: () => new THREE.MeshStandardMaterial({
          color: theme.trees.Astellian.leavesColor,
          emissive: theme.trees.Astellian.leavesColor,
          emissiveIntensity: ACTIVE_THEME === 'cyberpunk' ? 1.2 : 0.6,
          roughness: 0.1,
          metalness: 0.3,
          flatShading: true
        })
      };

    case 'tree_trunk_arcane':
      return {
        geo: () => new THREE.CylinderGeometry(0.15, 0.5, 10, 8),
        mat: () => new THREE.MeshStandardMaterial({ color: theme.trees.Luari.trunkColor, metalness: 0.7, roughness: 0.4 })
      };
    case 'tree_leaves_arcane':
      return {
        geo: () => new THREE.SphereGeometry(1.3, 8, 8),
        mat: () => new THREE.MeshStandardMaterial({
          color: theme.trees.Luari.leavesColor,
          emissive: theme.trees.Luari.leavesColor,
          emissiveIntensity: 1.0,
          roughness: 0.1
        })
      };
    case 'tree_sat_arcane':
      return {
        geo: () => new THREE.SphereGeometry(0.3, 6, 6),
        mat: () => new THREE.MeshStandardMaterial({
          color: theme.trees.Luari.leavesColor,
          emissive: theme.trees.Luari.leavesColor,
          emissiveIntensity: 1.0,
          roughness: 0.1
        })
      };

    case 'tree_trunk_standard':
      return {
        geo: () => new THREE.CylinderGeometry(0.4, 0.7, 10, 6),
        mat: () => new THREE.MeshStandardMaterial({ color: theme.trees.default.trunkColor, roughness: 0.9, flatShading: true })
      };
    case 'tree_leaves_standard':
      return {
        geo: () => new THREE.SphereGeometry(2.0, 6, 6),
        mat: () => new THREE.MeshStandardMaterial({ color: theme.trees.default.leavesColor, roughness: 0.8, flatShading: true })
      };

    // --- Structures ---
    case 'struct_base_industrial':
      return {
        geo: () => new THREE.BoxGeometry(3, 1, 3),
        mat: () => new THREE.MeshStandardMaterial({ color: theme.structures.Shwazen.baseColor, metalness: 0.7, roughness: 0.4 })
      };
    case 'struct_pipe_industrial':
      return {
        geo: () => new THREE.CylinderGeometry(0.6, 0.6, 8, 6),
        mat: () => new THREE.MeshStandardMaterial({ color: theme.structures.Shwazen.pipeColor, metalness: 0.9, roughness: 0.2 })
      };

    case 'struct_base_pillar':
      return {
        geo: () => new THREE.CylinderGeometry(1.8, 2.0, 1.2, 8),
        mat: () => new THREE.MeshStandardMaterial({ color: theme.structures.Astellian.baseColor, roughness: 0.3, metalness: 0.1 })
      };
    case 'struct_shaft_pillar':
      return {
        geo: () => new THREE.CylinderGeometry(1.2, 1.2, 9, 8),
        mat: () => new THREE.MeshStandardMaterial({ color: theme.structures.Astellian.baseColor, roughness: 0.3, metalness: 0.1 })
      };
    case 'struct_top_pillar':
      return {
        geo: () => new THREE.SphereGeometry(1.5, 8, 8),
        mat: () => new THREE.MeshStandardMaterial({ color: theme.structures.Astellian.topColor, metalness: 0.9, roughness: 0.1 })
      };

    case 'struct_p1_archway':
    case 'struct_p2_archway':
      return {
        geo: () => new THREE.CylinderGeometry(0.5, 0.5, 7, 5),
        mat: () => new THREE.MeshStandardMaterial({ color: theme.structures.Elladan.stoneColor, roughness: 0.9, flatShading: true })
      };
    case 'struct_arch_archway':
      return {
        geo: () => new THREE.BoxGeometry(6.5, 0.8, 1.4),
        mat: () => new THREE.MeshStandardMaterial({ color: theme.structures.Elladan.stoneColor, roughness: 0.9, flatShading: true })
      };

    case 'struct_ped_obelisk':
      return {
        geo: () => new THREE.BoxGeometry(2.4, 0.8, 2.4),
        mat: () => new THREE.MeshStandardMaterial({ color: theme.structures.Luari.pedColor, metalness: 0.8, roughness: 0.1, flatShading: true })
      };
    case 'struct_core_obelisk':
      return {
        geo: () => new THREE.OctahedronGeometry(1.6, 0),
        mat: () => new THREE.MeshStandardMaterial({
          color: theme.structures.Luari.coreColor,
          emissive: theme.structures.Luari.coreColor,
          emissiveIntensity: 1.5,
          roughness: 0.2
        })
      };

    case 'struct_base_yurt':
      return {
        geo: () => new THREE.CylinderGeometry(3.0, 3.0, 2.4, 8),
        mat: () => new THREE.MeshStandardMaterial({ color: theme.structures.Turchian.clothColor, roughness: 0.9, flatShading: true })
      };
    case 'struct_roof_yurt':
      return {
        geo: () => new THREE.ConeGeometry(3.4, 1.8, 8),
        mat: () => new THREE.MeshStandardMaterial({ color: theme.structures.Turchian.roofColor, roughness: 0.9, flatShading: true })
      };
    case 'struct_door_yurt':
      return {
        geo: () => new THREE.BoxGeometry(0.2, 1.6, 1.2),
        mat: () => new THREE.MeshStandardMaterial({ color: theme.structures.Turchian.woodColor, roughness: 0.8 })
      };

    case 'struct_log1_campfire':
    case 'struct_log2_campfire':
      return {
        geo: () => new THREE.CylinderGeometry(0.15, 0.15, 2.0, 5),
        mat: () => new THREE.MeshStandardMaterial({ color: theme.structures.Wildlands.logColor, roughness: 0.9, flatShading: true })
      };
    case 'struct_fire_campfire':
      return {
        geo: () => new THREE.IcosahedronGeometry(0.5, 0),
        mat: () => new THREE.MeshStandardMaterial({
          color: theme.structures.Wildlands.fireColor,
          emissive: theme.structures.Wildlands.fireColor,
          emissiveIntensity: 2.5,
          roughness: 0.1,
          flatShading: true
        })
      };
    case 'struct_stone_campfire':
      return {
        geo: () => new THREE.DodecahedronGeometry(0.2, 0),
        mat: () => new THREE.MeshStandardMaterial({ color: theme.structures.Wildlands.stoneColor, roughness: 0.8, flatShading: true })
      };

    case 'struct_base_shrine':
      return {
        geo: () => new THREE.BoxGeometry(1.6, 3.0, 1.6),
        mat: () => new THREE.MeshStandardMaterial({ color: theme.structures.Slovan.woodColor, roughness: 0.8, flatShading: true })
      };
    case 'struct_roof_shrine':
      return {
        geo: () => new THREE.ConeGeometry(1.4, 1.2, 4),
        mat: () => new THREE.MeshStandardMaterial({ color: theme.structures.Slovan.roofColor, roughness: 0.9, flatShading: true })
      };

    default:
      return null;
  }
}

/**
 * Scatters and generates all ecological elements deterministically across the world grid
 * Using 4x4 spatial chunks and THREE.InstancedMesh rendering for high-performance culling.
 * @param {THREE.Scene} scene 
 * @param {string} seed 
 * @param {Object} [treesGltf] - The loaded tree GLTF assets
 * @returns {THREE.Group} The container group of all scattered ecology
 */
export function spawnEcology(scene, seed, treesGltf) {
  const ecologyGroup = new THREE.Group();
  ecologyGroup.name = "ecology_assets";
  
  obstacles.length = 0; // Reset collision obstacles

  // Extract tree prototypes from GLTF if provided
  treePrototypes = [];
  if (treesGltf) {
    treesGltf.scene.updateWorldMatrix(true, true);
    
    // First try collecting Background_Tree_Atlas meshes
    treesGltf.scene.traverse((child) => {
      if (child.isMesh && child.name.includes('Background_Tree_Atlas')) {
        treePrototypes.push({
          geometry: child.geometry,
          material: child.material,
          matrixWorld: child.matrixWorld.clone()
        });
      }
    });

    // Fallback if none found
    if (treePrototypes.length === 0) {
      treesGltf.scene.traverse((child) => {
        if (child.isMesh) {
          treePrototypes.push({
            geometry: child.geometry,
            material: child.material,
            matrixWorld: child.matrixWorld.clone()
          });
        }
      });
    }

    // Scale each prototype to ~8 units tall, then ground-align by computing the
    // ACTUAL min-Y of the geometry after the full matrixWorld transform.
    // Each mesh in the GLB may have a different pivot (base, center, top), so we
    // must use the transformed bbox rather than raw geometry bounds.
    const localBox = new THREE.Box3();
    treePrototypes.forEach(proto => {
      // Step 1: measure raw geometry height (local space)
      localBox.setFromBufferAttribute(proto.geometry.attributes.position);
      const localHeight = localBox.getSize(new THREE.Vector3()).y;

      // Step 2: post-multiply scale so the geometry is ~8 units tall
      if (localHeight > 0) {
        const scaleFactor = 8.0 / localHeight;
        proto.matrixWorld.multiply(new THREE.Matrix4().makeScale(scaleFactor, scaleFactor, scaleFactor));
      }

      // Step 3: transform the local bbox through the now-scaled matrixWorld to get
      // the actual minimum Y in "placement/template" space (the space that baseMatrix maps to world)
      const worldBox = localBox.clone().applyMatrix4(proto.matrixWorld);
      const minY = worldBox.min.y;

      // Step 4: pre-multiply a Y translation so the tree base sits exactly at Y = 0
      if (Math.abs(minY) > 0.001) {
        proto.matrixWorld.premultiply(new THREE.Matrix4().makeTranslation(0, -minY, 0));
      }
    });
  }

  // 1. Create a 4x4 grid of spatial chunks
  const CHUNKS_X = 4;
  const CHUNKS_Z = 4;
  const CHUNK_SIZE_X = (GRID_WIDTH * SPACING) / CHUNKS_X;
  const CHUNK_SIZE_Z = (GRID_HEIGHT * SPACING) / CHUNKS_Z;
  
  const chunkGroups = [];
  const chunkData = [];
  
  for (let cz = 0; cz < CHUNKS_Z; cz++) {
    for (let cx = 0; cx < CHUNKS_X; cx++) {
      const chunkGroup = new THREE.Group();
      chunkGroup.name = `chunk_${cx}_${cz}`;
      
      const centerX = (cx + 0.5) * CHUNK_SIZE_X;
      const centerZ = (cz + 0.5) * CHUNK_SIZE_Z;
      chunkGroup.userData = { centerX, centerZ };
      
      ecologyGroup.add(chunkGroup);
      chunkGroups.push(chunkGroup);
      
      chunkData.push({
        parts: {}, // key: partKey, value: Matrix4[]
        lights: [] // Point lights
      });
    }
  }

  // 2. Identify culture center locations and register them
  const centers = [];
  culturesList.forEach((culture) => {
    if (culture.center === null || culture.center === undefined) return;
    const cx = culture.center % GRID_WIDTH;
    const cz = Math.floor(culture.center / GRID_WIDTH);
    const wx = cx * SPACING;
    const wz = cz * SPACING;
    const wy = getTerrainHeight(wx, wz);
    
    // Find chunk index
    const ccx = Math.max(0, Math.min(CHUNKS_X - 1, Math.floor(wx / CHUNK_SIZE_X)));
    const ccz = Math.max(0, Math.min(CHUNKS_Z - 1, Math.floor(wz / CHUNK_SIZE_Z)));
    const chunkIndex = ccz * CHUNKS_X + ccx;
    const cData = chunkData[chunkIndex];

    // Spawn monument components
    addStructureToChunk(cData, culture.name, wx, wy, wz, 0.0, 1.2);
    
    let baseRadius = 1.2;
    if (culture.name === 'Ulus' || culture.name === 'Turchian') {
      baseRadius = 3.0;
    } else if (culture.name === 'Elladan') {
      baseRadius = 2.2;
    }
    
    // Register obstacle
    obstacles.push({ x: wx, z: wz, radius: baseRadius * 1.2 });
    centers.push({ x: wx, z: wz });
  });

  // 3. Scan grid cells for random scattering
  const random = createRandom(seed);
  
  for (let zIndex = 0; zIndex < GRID_HEIGHT; zIndex++) {
    for (let xIndex = 0; xIndex < GRID_WIDTH; xIndex++) {
      
      const offsetX = (random() - 0.5) * SPACING * 0.75;
      const offsetZ = (random() - 0.5) * SPACING * 0.75;
      
      const x = xIndex * SPACING + offsetX;
      const z = zIndex * SPACING + offsetZ;

      // Skip spawning if close to any cultural center
      let nearCenter = false;
      for (const cent of centers) {
        const dx = x - cent.x;
        const dz = z - cent.z;
        if (dx * dx + dz * dz < 18.0 * 18.0) {
          nearCenter = true;
          break;
        }
      }
      if (nearCenter) continue;
      
      const height = getTerrainHeight(x, z);
      const slope = getTerrainSlope(x, z);
      const culture = getCultureAt(x, z);
      const cultureName = culture ? culture.name : 'Wildlands';

      if (height < 6.0) continue; 
      if (slope > 0.45) continue;

      let treeSpawnChance = 0.35;
      let structSpawnChance = 0.04;
      
      if (cultureName === 'Elladan' || cultureName === 'Wildlands') {
        treeSpawnChance = 0.65;
        structSpawnChance = 0.02;
      } 
      else if (cultureName === 'Shwazen') {
        treeSpawnChance = 0.15;
        structSpawnChance = 0.08;
      } 
      else if (cultureName === 'Astellian') {
        treeSpawnChance = 0.20;
        structSpawnChance = 0.06;
      } 
      else if (cultureName === 'Ulus' || cultureName === 'Turchian') {
        treeSpawnChance = 0.12;
        structSpawnChance = 0.05;
      }

      const roll = random();
      
      // Determine target chunk for culling cData
      const ccx = Math.max(0, Math.min(CHUNKS_X - 1, Math.floor(x / CHUNK_SIZE_X)));
      const ccz = Math.max(0, Math.min(CHUNKS_Z - 1, Math.floor(z / CHUNK_SIZE_Z)));
      const chunkIndex = ccz * CHUNKS_X + ccx;
      const cData = chunkData[chunkIndex];

      if (roll < treeSpawnChance) {
        const rotY = random() * Math.PI * 2;
        const scale = 0.75 + random() * 0.6;
        
        addTreeToChunk(cData, cultureName, x, height, z, rotY, scale);
        obstacles.push({ x, z, radius: 0.6 * scale });
      } 
      else if (roll < treeSpawnChance + structSpawnChance) {
        const rotY = random() * Math.PI * 2;
        const scale = 0.85 + random() * 0.4;
        
        addStructureToChunk(cData, cultureName, x, height, z, rotY, scale);
        
        let baseRadius = 1.0;
        if (cultureName === 'Ulus' || cultureName === 'Turchian') {
          baseRadius = 2.8;
        } else if (cultureName === 'Elladan') {
          baseRadius = 2.0;
        }
        obstacles.push({ x, z, radius: baseRadius * scale });
      }
    }
  }

  // 4. Instanced rendering construction per chunk
  for (let i = 0; i < chunkGroups.length; i++) {
    const chunkGroup = chunkGroups[i];
    const cData = chunkData[i];
    
    // Add point lights
    cData.lights.forEach((lightDef) => {
      const pl = new THREE.PointLight(lightDef.color, lightDef.intensity, lightDef.distance);
      pl.position.copy(lightDef.offset);
      chunkGroup.add(pl);
    });

    // Add instanced meshes for each part type
    Object.keys(cData.parts).forEach((partKey) => {
      const matrices = cData.parts[partKey];
      if (matrices.length === 0) return;
      
      const resource = getGeometryAndMaterial(partKey);
      if (!resource) return;
      
      const instancedMesh = new THREE.InstancedMesh(resource.geo, resource.mat, matrices.length);
      instancedMesh.castShadow = true;
      instancedMesh.receiveShadow = true;
      
      for (let mIdx = 0; mIdx < matrices.length; mIdx++) {
        instancedMesh.setMatrixAt(mIdx, matrices[mIdx]);
      }
      
      instancedMesh.instanceMatrix.needsUpdate = true;
      chunkGroup.add(instancedMesh);
    });
  }

  scene.add(ecologyGroup);
  return ecologyGroup;
}
