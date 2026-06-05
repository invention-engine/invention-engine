import * as THREE from 'three';
import { getTerrainHeight, getTerrainSlope, SPACING, GRID_WIDTH } from './terrain.js';
import { obstacles } from './ecology.js';

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
    
    // Jump mechanics (base variables)
    this.gravity = 18.0;
    this.jumpForce = 5.8;
    this.verticalVelocity = 0;
    this.isGrounded = true;

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
    this.cameraDistance = 6.0;
    this.minCameraDistance = 3.0;
    this.maxCameraDistance = 20.0;
    this.theta = 0; // Horizontal orbit angle (radians)
    this.phi = Math.PI / 8; // Vertical orbit angle (radians, ~22.5 degrees)
    this.minPhi = 0.02;
    this.maxPhi = Math.PI / 2.3; // Avoid looking directly straight down
    
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
    this.group = new THREE.Group();
    
    // Core floating crystal (scaled down to fit realistic human size)
    const crystalGeo = new THREE.OctahedronGeometry(0.35, 0);
    this.crystalMat = new THREE.MeshStandardMaterial({
      color: 0x9c27b0,
      emissive: 0x7b1fa2,
      emissiveIntensity: 1.5,
      metalness: 0.9,
      roughness: 0.1,
      flatShading: true
    });
    this.crystal = new THREE.Mesh(crystalGeo, this.crystalMat);
    this.crystal.position.y = 1.0; // Floating height relative to ground
    this.crystal.castShadow = true;
    this.group.add(this.crystal);

    // Inner glowing sphere (scaled down)
    const glowGeo = new THREE.SphereGeometry(0.18, 16, 16);
    this.glowMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff
    });
    this.glow = new THREE.Mesh(glowGeo, this.glowMat);
    this.glow.position.copy(this.crystal.position);
    this.group.add(this.glow);

    // Orbiting Ring 1 (scaled down)
    const ring1Geo = new THREE.TorusGeometry(0.7, 0.018, 8, 48);
    this.ring1Mat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x00e5ff,
      emissiveIntensity: 0.8,
      roughness: 0.2
    });
    this.ring1 = new THREE.Mesh(ring1Geo, this.ring1Mat);
    this.ring1.position.copy(this.crystal.position);
    this.ring1.rotation.x = Math.PI / 4;
    this.group.add(this.ring1);

    // Orbiting Ring 2 (scaled down)
    const ring2Geo = new THREE.TorusGeometry(0.85, 0.015, 8, 48);
    this.ring2Mat = new THREE.MeshStandardMaterial({
      color: 0xe040fb,
      emissive: 0xe040fb,
      emissiveIntensity: 0.8,
      roughness: 0.2
    });
    this.ring2 = new THREE.Mesh(ring2Geo, this.ring2Mat);
    this.ring2.position.copy(this.crystal.position);
    this.ring2.rotation.y = Math.PI / 4;
    this.group.add(this.ring2);

    // Light caster at player's location (scaled range and intensity)
    this.light = new THREE.PointLight(0x7c4dff, 2.0, 15);
    this.light.position.copy(this.crystal.position);
    this.light.castShadow = true;
    this.light.shadow.bias = -0.001;
    this.group.add(this.light);

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

    // Mouse drag and short-click detection for attacking
    this.domElement.addEventListener('mousedown', (e) => {
      this.isMouseDown = true;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
      this.mouseDownPosition = { x: e.clientX, y: e.clientY };
      this.mouseDownTime = performance.now();
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isMouseDown) return;
      
      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;

      const sensitivity = 0.005;
      this.theta -= deltaX * sensitivity;
      this.phi = Math.max(this.minPhi, Math.min(this.maxPhi, this.phi + deltaY * sensitivity));

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
    if (!isDialogueActive) {
      if (this.keys.w) moveDirection.add(forward);
      if (this.keys.s) moveDirection.add(forward.clone().negate());
      if (this.keys.a) moveDirection.add(right.clone().negate());
      if (this.keys.d) moveDirection.add(right);
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
    const maxBound = (GRID_WIDTH - 1.1) * SPACING;
    this.position.x = Math.max(5, Math.min(maxBound, this.position.x));
    this.position.z = Math.max(5, Math.min(maxBound, this.position.z));

    // 8. Jump physics influenced by Stamina & Adrenaline
    const groundHeight = getTerrainHeight(this.position.x, this.position.z);

    if (this.isGrounded) {
      this.position.y = groundHeight;
      if (this.keys.space && !isDialogueActive) {
        // Stamina penalty: jump height decreases linearly when fatigued (up to 40% jump force)
        const staminaFactor = 0.4 + 0.6 * (this.stamina / this.maxStamina);
        // Adrenaline bonus: jump height increases by up to 20% when pumped
        const adrenalineFactor = 1.0 + (this.adrenaline / this.maxAdrenaline) * 0.2;
        
        this.verticalVelocity = this.jumpForce * staminaFactor * adrenalineFactor;
        this.isGrounded = false;
        
        // Jumping generates a burst of adrenaline!
        this.adrenaline += 15.0;
        this.adrenaline = Math.min(this.maxAdrenaline, this.adrenaline);
      }
    } else {
      this.verticalVelocity -= this.gravity * deltaTime;
      this.position.y += this.verticalVelocity * deltaTime;

      if (this.position.y <= groundHeight) {
        this.position.y = groundHeight;
        this.verticalVelocity = 0;
        this.isGrounded = true;
      }
    }

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
