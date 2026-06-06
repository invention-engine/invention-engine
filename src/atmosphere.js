import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { getCultureAt } from './terrain.js';
import { getSunMoonState } from './timeSystem.js';

// ─── Culture-based fog/ambient profiles ──────────────────────────────────────
const profiles = {
  'Wildlands': { fogColor: new THREE.Color(0x070c08), ambientColor: new THREE.Color(0x0d1f11), dirColor: new THREE.Color(0x8bc34a), dirIntensity: 1.5 },
  'Turchian':  { fogColor: new THREE.Color(0x140e0d), ambientColor: new THREE.Color(0x211210), dirColor: new THREE.Color(0xff8a80), dirIntensity: 1.8 },
  'Shwazen':   { fogColor: new THREE.Color(0x121111), ambientColor: new THREE.Color(0x1c1917), dirColor: new THREE.Color(0xd7ccc8), dirIntensity: 1.6 },
  'Slovan':    { fogColor: new THREE.Color(0x0f0c14), ambientColor: new THREE.Color(0x191426), dirColor: new THREE.Color(0xb39ddb), dirIntensity: 1.4 },
  'Luari':     { fogColor: new THREE.Color(0x060e14), ambientColor: new THREE.Color(0x0b1b2b), dirColor: new THREE.Color(0x80deea), dirIntensity: 1.5 },
  'Astellian': { fogColor: new THREE.Color(0x06060f), ambientColor: new THREE.Color(0x0a0a1f), dirColor: new THREE.Color(0xffe082), dirIntensity: 1.7 },
  'Elladan':   { fogColor: new THREE.Color(0x060d08), ambientColor: new THREE.Color(0x0a1c0f), dirColor: new THREE.Color(0xd4e157), dirIntensity: 1.6 },
  'Ulus':      { fogColor: new THREE.Color(0x140810), ambientColor: new THREE.Color(0x210c18), dirColor: new THREE.Color(0xf8bbd0), dirIntensity: 1.7 }
};

const current = {
  fogColor:    new THREE.Color(0x06070b),
  ambientColor:new THREE.Color(0x1a1c2d),
  dirColor:    new THREE.Color(0x8a70f5),
  dirIntensity: 1.8
};

// ─── Sky & Stars (initialized once, attached to scene on first call) ──────────
let sky = null;
let sun = null;
let starField = null;
let skyScene = null; // we add sky to main scene

function buildSky(scene) {
  // THREE.Sky renders a full-screen atmospheric scattering effect
  sky = new Sky();
  sky.scale.setScalar(10000);
  sky.name = 'procedural_sky';
  scene.add(sky);

  sun = new THREE.Vector3();

  // Default tuning parameters (will be overridden every frame)
  const uniforms = sky.material.uniforms;
  uniforms['turbidity'].value     = 4;
  uniforms['rayleigh'].value      = 2;
  uniforms['mieCoefficient'].value= 0.005;
  uniforms['mieDirectionalG'].value = 0.8;

  // ── Star field ──────────────────────────────────────────────────────────────
  const starCount = 6000;
  const starPositions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    // Distribute on a sphere of radius 4500
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);
    const r     = 4500;
    starPositions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    starPositions[i * 3 + 2] = r * Math.cos(phi);
  }

  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));

  const starMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 2.5,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0.0,
    depthWrite: false
  });

  starField = new THREE.Points(starGeo, starMat);
  starField.name = 'star_field';
  scene.add(starField);
}

/**
 * Updates sky shader, star field, lighting, and fog based on time of day and player location.
 * @param {THREE.Camera} [camera] - Optional camera for sky centering
 */
export function updateAtmosphere(scene, ambientLight, dirLight, playerPosition, deltaTime, camera) {
  // ── One-time sky init ─────────────────────────────────────────────────────
  if (!sky) {
    buildSky(scene);
    // Remove plain color background so the sky is visible
    scene.background = null;
  }

  // ── Time system state ─────────────────────────────────────────────────────
  const { sunPos, moonPos, factor, sunVisible } = getSunMoonState();

  // factor: 1.0 = midday, 0.0 = midnight
  const nightBlend = 1.0 - factor;          // 0 = day, 1 = night
  const isNightPhase = nightBlend > 0.55;

  // ── Sky shader parameters ─────────────────────────────────────────────────
  const uniforms = sky.material.uniforms;

  // Position the sun disk in the sky (normalized direction)
  const activeCelestial = sunVisible ? sunPos : moonPos;
  sun.copy(activeCelestial).normalize();
  uniforms['sunPosition'].value.copy(sun);

  // Day: bright and clear. Dusk/Dawn: warm haze. Night: deep dark sky.
  // turbidity: how thick/hazy the atmosphere appears
  const turbidity     = THREE.MathUtils.lerp(3.5, 18.0, nightBlend);
  // rayleigh: blue scatter coefficient — high=vivid blue sky
  const rayleigh      = THREE.MathUtils.lerp(1.0, 0.05, nightBlend);
  // mieCoefficient: forward scatter (sun halo size)
  const mieCoeff      = sunVisible ? THREE.MathUtils.lerp(0.003, 0.012, nightBlend) : 0.0;
  const mieG          = 0.82;

  uniforms['turbidity'].value       = turbidity;
  uniforms['rayleigh'].value        = rayleigh;
  uniforms['mieCoefficient'].value  = mieCoeff;
  uniforms['mieDirectionalG'].value = mieG;

  // Fade sky overall — at night the Sky shader goes nearly black anyway with sun below horizon,
  // but exposure helps (controlled on renderer level would be ideal, but here we tint the fog)

  // Keep sky dome and star field centered on camera so they never clip
  if (camera) {
    if (sky) sky.position.copy(camera.position);
    if (starField) starField.position.copy(camera.position);
  }

  // ── Stars fade in at night ────────────────────────────────────────────────
  if (starField) {
    // Stars visible when sun is below horizon (factor < 0.35 → nightBlend > 0.65)
    const starOpacity = THREE.MathUtils.clamp(
      THREE.MathUtils.mapLinear(nightBlend, 0.4, 0.7, 0.0, 0.85),
      0.0, 0.85
    );
    starField.material.opacity += (starOpacity - starField.material.opacity) * Math.min(1.0, 1.5 * deltaTime);
  }

  // ── Culture fog & lighting ────────────────────────────────────────────────
  const culture = getCultureAt(playerPosition.x, playerPosition.z);
  const cultureName = culture ? culture.name : 'Wildlands';
  const profileTarget = profiles[cultureName] || profiles['Wildlands'];

  const nightFog     = new THREE.Color(0x010103);
  const nightAmbient = new THREE.Color(0x05060e);
  const nightDir     = new THREE.Color(0x4a5c80);

  const target = {
    fogColor:    profileTarget.fogColor.clone().lerp(nightFog,    nightBlend),
    ambientColor:profileTarget.ambientColor.clone().lerp(nightAmbient, nightBlend),
    dirColor:    profileTarget.dirColor.clone().lerp(nightDir,    nightBlend),
    dirIntensity:THREE.MathUtils.lerp(profileTarget.dirIntensity, 0.35, nightBlend)
  };

  const lerpFactor = Math.min(1.0, 1.8 * deltaTime);
  current.fogColor.lerp(target.fogColor, lerpFactor);
  current.ambientColor.lerp(target.ambientColor, lerpFactor);
  current.dirColor.lerp(target.dirColor, lerpFactor);
  current.dirIntensity += (target.dirIntensity - current.dirIntensity) * lerpFactor;

  if (scene.fog) {
    scene.fog.color.copy(current.fogColor);
  }

  ambientLight.color.copy(current.ambientColor);
  dirLight.color.copy(current.dirColor);
  dirLight.intensity = current.dirIntensity;
}
