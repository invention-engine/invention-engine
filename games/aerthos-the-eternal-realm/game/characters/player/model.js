import * as THREE from 'three';

export function createPlayerMesh() {
  const group = new THREE.Group();
  
  // Core floating crystal (scaled down to fit realistic human size)
  const crystalGeo = new THREE.OctahedronGeometry(0.35, 0);
  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0x9c27b0,
    emissive: 0x7b1fa2,
    emissiveIntensity: 1.5,
    metalness: 0.9,
    roughness: 0.1,
    flatShading: true
  });
  const crystal = new THREE.Mesh(crystalGeo, crystalMat);
  crystal.name = "crystal";
  crystal.position.y = 1.0;
  crystal.castShadow = true;
  group.add(crystal);

  // Inner glowing sphere
  const glowGeo = new THREE.SphereGeometry(0.18, 16, 16);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0x00e5ff
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.name = "glow";
  glow.position.copy(crystal.position);
  group.add(glow);

  // Orbiting Ring 1
  const ring1Geo = new THREE.TorusGeometry(0.7, 0.018, 8, 48);
  const ring1Mat = new THREE.MeshStandardMaterial({
    color: 0x00e5ff,
    emissive: 0x00e5ff,
    emissiveIntensity: 0.8,
    roughness: 0.2
  });
  const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
  ring1.name = "ring1";
  ring1.position.copy(crystal.position);
  ring1.rotation.x = Math.PI / 4;
  group.add(ring1);

  // Orbiting Ring 2
  const ring2Geo = new THREE.TorusGeometry(0.85, 0.015, 8, 48);
  const ring2Mat = new THREE.MeshStandardMaterial({
    color: 0xe040fb,
    emissive: 0xe040fb,
    emissiveIntensity: 0.8,
    roughness: 0.2
  });
  const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
  ring2.name = "ring2";
  ring2.position.copy(crystal.position);
  ring2.rotation.y = Math.PI / 4;
  group.add(ring2);

  // Light caster at player's location
  const light = new THREE.PointLight(0x7c4dff, 2.0, 15);
  light.name = "light";
  light.position.copy(crystal.position);
  light.castShadow = true;
  light.shadow.bias = -0.001;
  group.add(light);

  return { group, crystal, glow, ring1, ring2, light };
}
