import * as THREE from 'three';
import { getCultureAt } from './terrain.js';
import { getSunMoonState } from './timeSystem.js';

// Visual profiles for each culture
const profiles = {
  'Wildlands': {
    fogColor: new THREE.Color(0x070c08),
    ambientColor: new THREE.Color(0x0d1f11),
    dirColor: new THREE.Color(0x8bc34a),
    dirIntensity: 1.5
  },
  'Turchian': {
    fogColor: new THREE.Color(0x140e0d),
    ambientColor: new THREE.Color(0x211210),
    dirColor: new THREE.Color(0xff8a80),
    dirIntensity: 1.8
  },
  'Shwazen': {
    fogColor: new THREE.Color(0x121111),
    ambientColor: new THREE.Color(0x1c1917),
    dirColor: new THREE.Color(0xd7ccc8),
    dirIntensity: 1.6
  },
  'Slovan': {
    fogColor: new THREE.Color(0x0f0c14),
    ambientColor: new THREE.Color(0x191426),
    dirColor: new THREE.Color(0xb39ddb),
    dirIntensity: 1.4
  },
  'Luari': {
    fogColor: new THREE.Color(0x060e14),
    ambientColor: new THREE.Color(0x0b1b2b),
    dirColor: new THREE.Color(0x80deea),
    dirIntensity: 1.5
  },
  'Astellian': {
    fogColor: new THREE.Color(0x06060f),
    ambientColor: new THREE.Color(0x0a0a1f),
    dirColor: new THREE.Color(0xffe082),
    dirIntensity: 1.7
  },
  'Elladan': {
    fogColor: new THREE.Color(0x060d08),
    ambientColor: new THREE.Color(0x0a1c0f),
    dirColor: new THREE.Color(0xd4e157),
    dirIntensity: 1.6
  },
  'Ulus': {
    fogColor: new THREE.Color(0x140810),
    ambientColor: new THREE.Color(0x210c18),
    dirColor: new THREE.Color(0xf8bbd0),
    dirIntensity: 1.7
  }
};

// Current rendering state (initialized to default main.js values)
const current = {
  fogColor: new THREE.Color(0x06070b),
  ambientColor: new THREE.Color(0x1a1c2d),
  dirColor: new THREE.Color(0x8a70f5),
  dirIntensity: 1.8
};

/**
 * Updates lighting and fog colors dynamically based on player position and time of day
 * @param {THREE.Scene} scene 
 * @param {THREE.AmbientLight} ambientLight 
 * @param {THREE.DirectionalLight} dirLight 
 * @param {THREE.Vector3} playerPosition 
 * @param {number} deltaTime 
 */
export function updateAtmosphere(scene, ambientLight, dirLight, playerPosition, deltaTime) {
  // Query active culture at player location
  const culture = getCultureAt(playerPosition.x, playerPosition.z);
  const cultureName = culture ? culture.name : 'Wildlands';
  
  // Get corresponding profile, fallback to Wildlands
  const profileTarget = profiles[cultureName] || profiles['Wildlands'];
  
  // Blend with Day/Night cycle
  const { factor } = getSunMoonState();
  const nightFog = new THREE.Color(0x020205);
  const nightAmbient = new THREE.Color(0x06060f);
  const nightDir = new THREE.Color(0x5c709e); // Dim bluish moonlight
  
  // Linearly interpolate profile target towards night presets
  const target = {
    fogColor: profileTarget.fogColor.clone().lerp(nightFog, 1.0 - factor),
    ambientColor: profileTarget.ambientColor.clone().lerp(nightAmbient, 1.0 - factor),
    dirColor: profileTarget.dirColor.clone().lerp(nightDir, 1.0 - factor),
    dirIntensity: THREE.MathUtils.lerp(profileTarget.dirIntensity, 0.45, 1.0 - factor)
  };
  
  // Transition speed (larger factor = faster transition)
  const speedFactor = 1.8;
  const lerpFactor = Math.min(1.0, speedFactor * deltaTime);
  
  // Smoothly interpolate current colors towards target profile
  current.fogColor.lerp(target.fogColor, lerpFactor);
  current.ambientColor.lerp(target.ambientColor, lerpFactor);
  current.dirColor.lerp(target.dirColor, lerpFactor);
  current.dirIntensity += (target.dirIntensity - current.dirIntensity) * lerpFactor;
  
  // Apply visual updates to scene elements
  if (scene.fog) {
    scene.fog.color.copy(current.fogColor);
  }
  scene.background.copy(current.fogColor);
  
  ambientLight.color.copy(current.ambientColor);
  dirLight.color.copy(current.dirColor);
  dirLight.intensity = current.dirIntensity;
}
