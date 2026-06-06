import * as THREE from 'three';
import { UIState, getState as getUIState, setState, toggleMenu, toggleInventory, toggleSettings } from './uiState.js';
import { getTerrainHeight, getTerrainSlope, SPACING, GRID_WIDTH } from './terrain.js';
import { obstacles } from './ecology.js';
import { createPlayerMesh } from '../game/characters/player/model.js';

export class Player {
  constructor(scene, camera, domElement) {
    this.scene = scene;
    this.camera = camera;
    this.domElement = domElement;

    // Realistic human-scale locomotion speeds (meters per second)
    this.walkSpeed = 1.417;          // 5.1 km/h
    this.sprintSpeed = 7.778;        // 28.0 km/h (full sprint)
    this.exhaustedSprintSpeed = 3.056; // 11.0 km/h (exhausted sprint)
    this.speed = this.walkSpeed;
    // Player Health & Magic
    this.maxHealth = 100.0;
    this.health = this.maxHealth;
    this.maxMagic = 50.0;
    this.magic = this.maxMagic;
    
    // Jump mechanics (base variables)
    this.gravity = 18.0;
    this.jumpForce = 5.8;
    this.verticalVelocity = 0;
    this.isGrounded = true;
    this.jumpsRemaining = 2;
    this.prevSpace = false;

    // Stamina System
    this.stamina = 100.0;
    this.maxStamina = 100.0;
    this.staminaDepletionRate = 20.0; // Depletes fully in 5 seconds of sprinting
    this.staminaRegenRate = 15.0;     // Regenerates fully in 6.7 seconds
    this.isExhausted = false;

    // Adrenaline System (builds up during sprinting, jumping, and attacking)
    this.adrenaline = 0.0;
    this.maxAdrenaline = 100.0;
    this.adrenalineDecayRate = 4.0;   // Slow decay rate over time

    // Attacking state (Visual flare)
    this.isAttacking = false;
    this.attackCooldown = 0.0;
    this.attackTimer = 0.0;

    // Position coordinates
    this.position = new THREE.Vector3(
      (GRID_WIDTH * SPACING) / 2,
      0,
      (GRID_WIDTH * SPACING) / 2
    );
    this.position.y = getTerrainHeight(this.position.x, this.position.z);
    
    // Collision parameter
    this.radius = 0.4;

    // Closer Camera Orbit Setup (Third-person follow view)
    this.cameraDistance = 4.0; // Closer third-person view
    this.minCameraDistance = 2.0;
    this.maxCameraDistance = 20.0;
    this.theta = 0; // Horizontal orbit angle (radians)
    this.phi = Math.PI / 8; // Vertical orbit angle (radians, ~22.5 degrees)
    this.minPhi = -75 * Math.PI / 180; // Allow looking 75 degrees up
    this.maxPhi = Math.PI / 2; // Allow looking 90 degrees down (top-down view)
    
    this.targetCameraDistance = this.cameraDistance;
    this.cameraTarget = new THREE.Vector3().copy(this.position);

    // Keyboard controls
    this.keys = { w: false, a: false, s: false, d: false, space: false, shift: false };
    
    // Mouse drag / click state
    this.isMouseDown = false;
    this.previousMousePosition = { x: 0, y: 0 };
    this.mouseDownTime = 0;
    this.mouseDownPosition = { x: 0, y: 0 };

    this.createAvatar();
    this.setupControls();
  }

  createAvatar() {
    const assets = createPlayerMesh();
    this.group = assets.group;
    this.crystal = assets.crystal;
    this.glow = assets.glow;
    this.ring1 = assets.ring1;
    this.ring2 = assets.ring2;
    this.light = assets.light;

    this.group.position.copy(this.position);
    this.scene.add(this.group);
  }

  setupControls() {
    // Keyboard keydown / keyup
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || e.key === 'ArrowUp') this.keys.w = true;
      if (k === 's' || e.key === 'ArrowDown') this.keys.s = true;
      if (k === 'a' || e.key === 'ArrowLeft') this.keys.a = true;
      if (k === 'd' || e.key === 'ArrowRight') this.keys.d = true;
      if (e.key === 'Shift') this.keys.shift = true;
      if (k === 'f') this.triggerAttack();
      if (e.key === ' ') {
        this.keys.space = true;
        e.preventDefault(); // Stop scrolling standard page
      }
      if (k === 'i') {
        toggleInventory();
      }
      // Release pointer lock or resume on Escape
      if (e.key === 'Escape') {
        if (getUIState() === UIState.PAUSE) {
          setState(UIState.GAME);
        } else if (document.exitPointerLock) {
          document.exitPointerLock();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || e.key === 'ArrowUp') this.keys.w = false;
      if (k === 's' || e.key === 'ArrowDown') this.keys.s = false;
      if (k === 'a' || e.key === 'ArrowLeft') this.keys.a = false;
      if (k === 'd' || e.key === 'ArrowRight') this.keys.d = false;
      if (e.key === 'Shift') this.keys.shift = false;
      if (e.key === ' ') this.keys.space = false;
    });

    // Mouse drag and short-click detection for attacking and camera control
    this.domElement.addEventListener('mousedown', (e) => {
      if (getUIState() !== UIState.GAME) return;
      this.isMouseDown = true;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
      this.mouseDownPosition = { x: e.clientX, y: e.clientY };
      this.mouseDownTime = performance.now();
      // Request pointer lock for camera movement
      if (this.domElement.requestPointerLock) {
        this.domElement.requestPointerLock();
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (getUIState() !== UIState.GAME) return;
      // Allow camera rotation when mouse is down or pointer is locked
      if (!this.isMouseDown && !document.pointerLockElement) return;

      const deltaX = e.movementX !== undefined ? e.movementX : e.clientX - this.previousMousePosition.x;
      const deltaY = e.movementY !== undefined ? e.movementY : e.clientY - this.previousMousePosition.y;
      
      const userSensitivity = (window.gameSettings ? (window.gameSettings.sensitivity / 100) : 1.0);
      const invertYMultiplier = (window.gameSettings && window.gameSettings.invertY) ? -1.0 : 1.0;
      
      const sensitivity = 0.005 * userSensitivity;
      this.theta -= deltaX * sensitivity;
      this.phi = Math.max(this.minPhi, Math.min(this.maxPhi, this.phi + deltaY * sensitivity * invertYMultiplier));

      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', (e) => {
      if (this.isMouseDown) {
        this.isMouseDown = false;
        
        // Detect short click without significant dragging for attacking
        const clickDuration = performance.now() - this.mouseDownTime;
        const dx = e.clientX - this.mouseDownPosition.x;
        const dy = e.clientY - this.mouseDownPosition.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (clickDuration < 250 && dist < 6) {
          this.triggerAttack();
        }
      }
    });

    // Scroll zoom controls
    this.domElement.addEventListener('wheel', (e) => {
      const zoomSpeed = 0.03;
      this.targetCameraDistance = Math.max(
        this.minCameraDistance,
        Math.min(this.maxCameraDistance, this.targetCameraDistance + e.deltaY * zoomSpeed)
      );
    }, { passive: true });
  }

  triggerAttack() {
    if (this.isAttacking) return;
    
    this.isAttacking = true;
    // Attack duration is 0.4 seconds, slightly reduced by adrenaline (faster strikes)
    this.attackTimer = 0.4 * (1.0 - (this.adrenaline / 100.0) * 0.3);
    
    // Attacking generates adrenaline!
    this.adrenaline += 12.0;
    this.adrenaline = Math.min(this.maxAdrenaline, this.adrenaline);

    // Audio or visual effect trigger
    this.light.color.setHex(0x00e5ff); // Flash blue/cyan during attack
  }

  update(deltaTime, isDialogueActive = false) {
    if (deltaTime > 0.1) deltaTime = 0.1; // Limit spike frames

    // 1. Calculate direction vectors relative to camera horizontal orbit angle
    const forward = new THREE.Vector3(-Math.sin(this.theta), 0, -Math.cos(this.theta)).normalize();
    const right = new THREE.Vector3(-Math.cos(this.theta), 0, Math.sin(this.theta)).normalize();

    const moveDirection = new THREE.Vector3();
    if (!isDialogueActive && getUIState() === UIState.GAME) {
      if (this.keys.w) moveDirection.add(forward);
      if (this.keys.s) moveDirection.add(forward.clone().negate());
      if (this.keys.a) moveDirection.add(right.clone().negate());
      if (this.keys.d) moveDirection.add(right.clone().negate());
    }

    const isMoving = moveDirection.lengthSq() > 0;

    // 2. Adrenaline Decay & Cooldown checks
    if (this.isAttacking) {
      this.attackTimer -= deltaTime;
      if (this.attackTimer <= 0) {
        this.isAttacking = false;
        this.light.color.setHex(0x7c4dff); // Restore default light color
      }
    }

    // Adrenaline decays slowly over time
    this.adrenaline -= this.adrenalineDecayRate * deltaTime;
    this.adrenaline = Math.max(0, Math.min(this.maxAdrenaline, this.adrenaline));

    // 3. Sprint & Stamina Mechanics
    let baseSpeed = this.walkSpeed;
    if (this.keys.shift && isMoving) {
      if (!this.isExhausted) {
        this.stamina -= this.staminaDepletionRate * deltaTime;
        // Sprinting builds adrenaline
        this.adrenaline += 8.0 * deltaTime;
        
        if (this.stamina <= 0) {
          this.stamina = 0;
          this.isExhausted = true;
        }
        baseSpeed = this.sprintSpeed;
      } else {
        // Run speed when exhausted (11 km/h)
        baseSpeed = this.exhaustedSprintSpeed;
        this.stamina = 0;
      }
    } else {
      // Regenerate stamina when not sprinting
      this.stamina += this.staminaRegenRate * deltaTime;
      if (this.stamina >= 20.0) {
        this.isExhausted = false; // Recovered enough stamina to sprint again
      }
      this.stamina = Math.min(this.maxStamina, this.stamina);
    }

    // 4. Slope Penalty/Bonus (Going uphill slows down, downhill speeds up slightly)
    let slopeMultiplier = 1.0;
    if (isMoving) {
      const checkDist = 0.5;
      const currentHeight = getTerrainHeight(this.position.x, this.position.z);
      const nextHeight = getTerrainHeight(
        this.position.x + moveDirection.x * checkDist,
        this.position.z + moveDirection.z * checkDist
      );
      // Positive incline = uphill, Negative incline = downhill
      const incline = (nextHeight - currentHeight) / checkDist;
      
      if (incline > 0) {
        // Climbing penalty: scale speed down based on climb angle
        slopeMultiplier = Math.max(0.15, 1.0 - incline * 1.6);
      } else if (incline < 0) {
        // Downhill bonus: scale speed up (up to 1.3x)
        slopeMultiplier = Math.min(1.3, 1.0 - incline * 0.8);
      }
    }

    // 5. Adrenaline Speed Buff
    const adrenalineSpeedBuff = 1.0 + (this.adrenaline / this.maxAdrenaline) * 0.25;

    // Apply calculations to final translation speed
    const currentSpeed = baseSpeed * slopeMultiplier * adrenalineSpeedBuff;

    if (isMoving) {
      moveDirection.normalize();
      this.position.addScaledVector(moveDirection, currentSpeed * deltaTime);
    }

    // 6. Tree & Structure Circular Obstacle Collisions
    obstacles.forEach((obs) => {
      const dx = this.position.x - obs.x;
      const dz = this.position.z - obs.z;
      const distSq = dx * dx + dz * dz;
      const minDist = obs.radius + this.radius;
      
      if (distSq < minDist * minDist) {
        const dist = Math.sqrt(distSq);
        if (dist > 0.001) {
          const overlap = minDist - dist;
          // Resolve collision: push player out of the obstacle radius
          this.position.x += (dx / dist) * overlap;
          this.position.z += (dz / dist) * overlap;
        } else {
          // Fallback if exactly on center coordinate
          this.position.x += minDist;
        }
      }
    });

    // 7. Map boundary check to prevent player from running off map bounds
    // Ensure player stays above terrain after horizontal movement
    const currentGroundHeight = getTerrainHeight(this.position.x, this.position.z);
    if (this.position.y < currentGroundHeight) {
      this.position.y = currentGroundHeight;
      this.isGrounded = true;
      this.verticalVelocity = 0;
    }
    const maxBound = (GRID_WIDTH - 1.1) * SPACING;
    this.position.x = Math.max(5, Math.min(maxBound, this.position.x));
    this.position.z = Math.max(5, Math.min(maxBound, this.position.z));

    // 8. Jump physics with single/double jump control
    const groundHeight = getTerrainHeight(this.position.x, this.position.z);
    // Reset jump count when grounded
    if (this.isGrounded) {
      this.jumpsRemaining = 2; // allow double jump
    }

    // Detect edge of space press
    const justPressedSpace = this.keys.space && !this.prevSpace;

    if (justPressedSpace && this.jumpsRemaining > 0) {
      // Apply jump
      const staminaFactor = 0.4 + 0.6 * (this.stamina / this.maxStamina);
      const adrenalineFactor = 1.0 + (this.adrenaline / this.maxAdrenaline) * 0.2;
      this.verticalVelocity = this.jumpForce * staminaFactor * adrenalineFactor;
      this.isGrounded = false;
      this.jumpsRemaining--;
      // Jumping generates a burst of adrenaline!
      this.adrenaline += 15.0;
      this.adrenaline = Math.min(this.maxAdrenaline, this.adrenaline);
    }

    if (!this.isGrounded) {
      this.verticalVelocity -= this.gravity * deltaTime;
      this.position.y += this.verticalVelocity * deltaTime;
      if (this.position.y <= groundHeight) {
        this.position.y = groundHeight;
        this.verticalVelocity = 0;
        this.isGrounded = true;
      }
    } else {
      // Ensure we stay on ground when not jumping
      this.position.y = groundHeight;
    }

    // Update previous space state for edge detection
    this.prevSpace = this.keys.space;


    // 9. Update avatar visuals and rotate floating rings
    this.group.position.copy(this.position);
    
    // Smooth idle bobbing animation for the floating crystal core (scaled down)
    const bobTime = performance.now() * 0.003;
    let bobHeight = 1.0 + Math.sin(bobTime) * 0.08;
    
    // Attacking animation: crystal grows and flares
    let scaleMultiplier = 1.0;
    if (this.isAttacking) {
      const attackProgress = this.attackTimer / 0.4;
      scaleMultiplier = 1.0 + Math.sin(attackProgress * Math.PI) * 0.5; // grows up to 1.5x
    }
    
    this.crystal.scale.set(scaleMultiplier, scaleMultiplier, scaleMultiplier);
    this.crystal.position.y = bobHeight;
    this.glow.position.y = this.crystal.position.y;
    this.light.position.y = this.crystal.position.y;

    // Spin the core
    this.crystal.rotation.y += 0.5 * deltaTime;
    this.crystal.rotation.x += 0.25 * deltaTime;

    // Spin outer rings in opposite directions (expand during attacks)
    const ringScale = this.isAttacking ? 1.4 : 1.0;
    this.ring1.scale.set(ringScale, ringScale, ringScale);
    this.ring2.scale.set(ringScale, ringScale, ringScale);
    
    this.ring1.rotation.x += 0.8 * deltaTime;
    this.ring1.rotation.y += 0.4 * deltaTime;
    this.ring2.rotation.y -= 0.6 * deltaTime;
    this.ring2.rotation.z += 0.3 * deltaTime;

    // Synchronize core glow color intensity dynamically
    let pulseIntensity = 2.0 + Math.sin(bobTime * 2) * 0.8;
    if (this.isAttacking) {
      pulseIntensity = 8.0; // Flash brightly during attack
    }
    this.crystal.material.emissiveIntensity = pulseIntensity;
    this.light.intensity = pulseIntensity;

    // 10. Update Camera Rig with Smooth Damping (scaled camera follow distance)
    this.cameraDistance += (this.targetCameraDistance - this.cameraDistance) * 0.1;

    // Look target is just above player position
    const targetLookAt = new THREE.Vector3().copy(this.position);
    targetLookAt.y += 1.0;
    
    // Smooth target tracking for the camera
    this.cameraTarget.lerp(targetLookAt, 0.15);

    // Compute ideal camera position from spherical coordinates
    const offset = new THREE.Vector3();
    offset.x = this.cameraDistance * Math.sin(this.theta) * Math.cos(this.phi);
    offset.z = this.cameraDistance * Math.cos(this.theta) * Math.cos(this.phi);
    offset.y = this.cameraDistance * Math.sin(this.phi);

    const targetCameraPosition = new THREE.Vector3().copy(this.cameraTarget).add(offset);
    
    // Check if the camera goes under terrain and push it up to avoid clipping
    const camTerrainHeight = getTerrainHeight(targetCameraPosition.x, targetCameraPosition.z) + 1.0;
    if (targetCameraPosition.y < camTerrainHeight) {
      targetCameraPosition.y = camTerrainHeight;
    }

    // Update position and lookAt direction
    this.camera.position.copy(targetCameraPosition);
    this.camera.lookAt(this.cameraTarget);
  }
}
