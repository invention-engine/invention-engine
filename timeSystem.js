import * as THREE from 'three';

export let timeOfDay = 8.0; // Starts at 8:00 AM
export const CYCLE_DURATION = 300.0; // 300 seconds (5 minutes) for a full 24-hour loop
const HOURS_PER_SECOND = 24.0 / CYCLE_DURATION;

// Keyframes for sky/fog color transitions
const skyColors = [
  { hour: 0, color: new THREE.Color(0x010204) },   // Midnight
  { hour: 4.5, color: new THREE.Color(0x010204) }, // Pre-dawn
  { hour: 6, color: new THREE.Color(0x2c1421) },   // Sunrise
  { hour: 8, color: new THREE.Color(0x06070b) },   // Morning
  { hour: 12, color: new THREE.Color(0x06070b) },  // Noon
  { hour: 17, color: new THREE.Color(0x3a1510) },  // Late Afternoon
  { hour: 18.5, color: new THREE.Color(0x1a0914) },// Sunset
  { hour: 20, color: new THREE.Color(0x010204) }   // Evening
];

/**
 * Updates the time cycle
 * @param {number} deltaTime 
 */
export function updateTimeCycle(deltaTime) {
  timeOfDay += HOURS_PER_SECOND * deltaTime;
  if (timeOfDay >= 24.0) {
    timeOfDay -= 24.0;
  }
}

/**
 * Checks if it is currently night phase
 * @returns {boolean}
 */
export function isNight() {
  return timeOfDay >= 19.5 || timeOfDay < 5.5;
}

/**
 * Returns a formatted string representation of time (e.g. "14:05")
 * @returns {string}
 */
export function getTimeString() {
  const hours = Math.floor(timeOfDay);
  const minutes = Math.floor((timeOfDay - hours) * 60);
  
  const hStr = hours.toString().padStart(2, '0');
  const mStr = minutes.toString().padStart(2, '0');
  
  return `${hStr}:${mStr}`;
}

/**
 * Returns the interpolated sky/fog color based on the time of day
 * @returns {THREE.Color}
 */
export function getSkyColor() {
  // Sort keyframes just in case
  const h = timeOfDay;
  
  // Find keyframes that bracket the current hour
  let lower = skyColors[skyColors.length - 1];
  let upper = skyColors[0];
  
  for (let i = 0; i < skyColors.length; i++) {
    if (skyColors[i].hour <= h) {
      lower = skyColors[i];
    }
    if (skyColors[i].hour > h) {
      upper = skyColors[i];
      break;
    }
  }
  
  // Calculate interpolation factor
  let range = upper.hour - lower.hour;
  let diff = h - lower.hour;
  
  // Handle wrapping around midnight
  if (upper.hour < lower.hour) {
    range = (24.0 - lower.hour) + upper.hour;
    diff = h >= lower.hour ? h - lower.hour : (24.0 - lower.hour) + h;
  }
  
  const t = range > 0 ? diff / range : 0;
  
  // Return interpolated color
  return lower.color.clone().lerp(upper.color, t);
}

/**
 * Computes the angular positions of the sun and moon
 * @returns {Object} Positions of sun and moon, and day-night factor (0 = night, 1 = noon)
 */
export function getSunMoonState() {
  // Angle rotates 360 degrees (2*PI) around X/Z plane
  const angle = (timeOfDay / 24.0) * Math.PI * 2 - Math.PI / 2; // Offset so noon is peak height
  
  // Sun orbital coordinates
  const sunPos = new THREE.Vector3(
    Math.cos(angle) * 500,
    Math.sin(angle) * 500, // y is height
    0
  );
  
  // Moon is orbital opposite of Sun
  const moonAngle = angle + Math.PI;
  const moonPos = new THREE.Vector3(
    Math.cos(moonAngle) * 500,
    Math.sin(moonAngle) * 500,
    0
  );
  
  // Calculate factor: 1 at noon (sin = 1), 0 at midnight (sin = -1)
  const factor = Math.max(0, Math.min(1, (Math.sin(angle) + 1) / 2));
  
  return {
    sunPos,
    moonPos,
    factor,
    sunVisible: sunPos.y > 0,
    moonVisible: moonPos.y > 0
  };
}
