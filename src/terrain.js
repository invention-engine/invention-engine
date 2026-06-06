import * as THREE from 'three';

export let gridHeights = [];
export let cellCultures = [];
export const GRID_WIDTH = 32;
export const GRID_HEIGHT = 32;
export const SPACING = 31.62;
export const HEIGHT_SCALE = 2.2; // Visual scaling multiplier

// Faction/Culture mapping from JSON
export let culturesList = [];

/**
 * Initializes the terrain data and parses the JSON
 * @param {Object} worldData 
 */
export function initTerrainData(worldData) {
  // Smooth the terrain heightmap (100x100 grid) using a 2-pass neighbor-averaging filter to round off triangular peaks
  const w = 100;
  const h = 100;
  let tempHeights = [...worldData.grid.cells.h];
  
  for (let pass = 0; pass < 2; pass++) {
    const smoothed = new Array(w * h);
    for (let z = 0; z < h; z++) {
      for (let x = 0; x < w; x++) {
        let sum = 0;
        let count = 0;
        for (let dz = -1; dz <= 1; dz++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const nz = z + dz;
            if (nx >= 0 && nx < w && nz >= 0 && nz < h) {
              sum += tempHeights[nz * w + nx];
              count++;
            }
          }
        }
        smoothed[z * w + x] = sum / count;
      }
    }
    tempHeights = smoothed;
  }
  gridHeights = tempHeights;
  
  // Extract culture list
  culturesList = (worldData.pack && worldData.pack.cultures) || [];
  const loreCultures = (worldData.lore && worldData.lore.cultures) || [];
  
  // Clean up cultures and merge lore details (values, traditions, description)
  culturesList.forEach((culture, index) => {
    if (!culture.color) {
      if (culture.name === 'Wildlands') culture.color = '#2e7d32'; // Forest Green
      else culture.color = '#7c4dff'; // Purple default
    }
    if (culture.center === undefined || culture.center === null) {
      if (culture.name === 'Wildlands') culture.center = 512; // Middle of map
      else culture.center = 0;
    }
    
    // Merge lore details
    const matchingLore = loreCultures.find(c => c.name === culture.name);
    if (matchingLore) {
      culture.values = matchingLore.values || [];
      culture.traditions = matchingLore.traditions || [];
      culture.description = matchingLore.description || '';
    } else {
      culture.values = [];
      culture.traditions = [];
      culture.description = '';
    }
  });

  // Calculate culture for each grid cell using Voronoi Partitioning (2D Euclidean distance)
  cellCultures = new Array(GRID_WIDTH * GRID_HEIGHT);
  for (let i = 0; i < GRID_WIDTH * GRID_HEIGHT; i++) {
    const px = i % GRID_WIDTH;
    const pz = Math.floor(i / GRID_WIDTH);
    
    let nearestCulture = null;
    let minDistance = Infinity;
    
    culturesList.forEach((culture) => {
      if (culture.center === null || culture.center === undefined) return;
      const cx = culture.center % GRID_WIDTH;
      const cz = Math.floor(culture.center / GRID_WIDTH) % GRID_HEIGHT;
      
      const dx = px - cx;
      const dz = pz - cz;
      const dist = Math.sqrt(dx * dx + dz * dz);
      
      if (dist < minDistance) {
        minDistance = dist;
        nearestCulture = culture;
      }
    });
    
    cellCultures[i] = nearestCulture || culturesList[0];
  }
}

/**
 * Returns the exact interpolated height at any continuous (x, z) coordinate
 * @param {number} x - World X position
 * @param {number} z - World Z position
 * @returns {number} The terrain height Y
 */
export function getTerrainHeight(x, z) {
  if (gridHeights.length === 0) return 0;
  
  const gridX = x / SPACING;
  const gridZ = z / SPACING;
  
  // Clamp to grid boundaries
  if (gridX < 0 || gridX >= GRID_WIDTH - 1 || gridZ < 0 || gridZ >= GRID_HEIGHT - 1) {
    // Return nearest edge height
    const cx = Math.max(0, Math.min(GRID_WIDTH - 1, Math.round(gridX)));
    const cz = Math.max(0, Math.min(GRID_HEIGHT - 1, Math.round(gridZ)));
    return gridHeights[cz * GRID_WIDTH + cx] * HEIGHT_SCALE;
  }
  
  const x0 = Math.floor(gridX);
  const x1 = x0 + 1;
  const z0 = Math.floor(gridZ);
  const z1 = z0 + 1;
  
  const h00 = gridHeights[z0 * GRID_WIDTH + x0];
  const h10 = gridHeights[z0 * GRID_WIDTH + x1];
  const h01 = gridHeights[z1 * GRID_WIDTH + x0];
  const h11 = gridHeights[z1 * GRID_WIDTH + x1];
  
  // Interpolation weights
  const tx = gridX - x0;
  const tz = gridZ - z0;
  
  // Precise height calculation matching the flat-shaded rendering triangles
  let h;
  if (tx + tz <= 1) {
    // Triangle 1: (p0, p2, p1)
    h = h00 + tx * (h10 - h00) + tz * (h01 - h00);
  } else {
    // Triangle 2: (p1, p2, p3)
    h = h11 + (1 - tx) * (h01 - h11) + (1 - tz) * (h10 - h11);
  }
  
  return h * HEIGHT_SCALE;
}

/**
 * Returns the culture active at a specific world coordinate (x, z)
 * @param {number} x 
 * @param {number} z 
 * @returns {Object} Culture object
 */
export function getCultureAt(x, z) {
  if (cellCultures.length === 0) return null;
  
  const gridX = Math.max(0, Math.min(GRID_WIDTH - 1, Math.round(x / SPACING)));
  const gridZ = Math.max(0, Math.min(GRID_HEIGHT - 1, Math.round(z / SPACING)));
  
  return cellCultures[gridZ * GRID_WIDTH + gridX];
}

/**
 * Calculates the local steepness/slope gradient at any continuous (x, z) coordinate
 * @param {number} x
 * @param {number} z
 * @returns {number} Slope magnitude (0 = flat, >0.5 = very steep)
 */
export function getTerrainSlope(x, z) {
  const delta = 1.0;
  const hL = getTerrainHeight(x - delta, z);
  const hR = getTerrainHeight(x + delta, z);
  const hD = getTerrainHeight(x, z - delta);
  const hU = getTerrainHeight(x, z + delta);
  
  const dx = (hR - hL) / (2 * delta);
  const dz = (hU - hD) / (2 * delta);
  
  return Math.sqrt(dx * dx + dz * dz);
}

/**
 * Generates the 3D terrain mesh representing the heightmap grid
 * @returns {THREE.Mesh} The terrain mesh
 */
export function buildTerrainMesh() {
  const geometry = new THREE.BufferGeometry();
  
  const vertexCount = GRID_WIDTH * GRID_HEIGHT;
  const positions = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 3);
  
  // Set positions and colors
  for (let i = 0; i < vertexCount; i++) {
    const px = i % GRID_WIDTH;
    const pz = Math.floor(i / GRID_WIDTH);
    const height = gridHeights[i] * HEIGHT_SCALE;
    
    // Position
    positions[i * 3] = px * SPACING;
    positions[i * 3 + 1] = height;
    positions[i * 3 + 2] = pz * SPACING;
    
    // Assign color based on culture territory
    const culture = cellCultures[i];
    const color = new THREE.Color(culture ? culture.color : '#7c4dff');
    
    // Apply lighting accent: make higher vertices slightly lighter and valleys slightly darker
    const factor = 0.7 + (gridHeights[i] / 66.0) * 0.4;
    color.multiplyScalar(factor);

    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  
  // Generate indices for grid triangles
  const indices = [];
  for (let r = 0; r < GRID_HEIGHT - 1; r++) {
    for (let c = 0; c < GRID_WIDTH - 1; c++) {
      const p0 = r * GRID_WIDTH + c;
      const p1 = r * GRID_WIDTH + (c + 1);
      const p2 = (r + 1) * GRID_WIDTH + c;
      const p3 = (r + 1) * GRID_WIDTH + (c + 1);
      
      // Triangle 1
      indices.push(p0, p2, p1);
      // Triangle 2
      indices.push(p1, p2, p3);
    }
  }
  
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  
  // Modern, premium terrain material: double-sided with flat shading and vertex colors
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.85,
    metalness: 0.1,
    flatShading: true,
    side: THREE.DoubleSide
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  
  return mesh;
}
