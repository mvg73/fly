import * as THREE from 'three';
import { getForwardVector } from '../plane/flightPhysics.js';
import { makeBullet, makeBomb, makeMissile, makeFlakPellet } from './entities.js';
import { createBulletVisual, createBombVisual, createFlakVisual, createMissileVisual } from '../scene/projectileModels.js';
import {
  BULLET_SPEED_PLAYER,
  BULLET_DAMAGE_PLAYER,
  BULLET_RADIUS_PLAYER,
  BOMB_SPEED,
  BOMB_DAMAGE,
  BOMB_RADIUS,
  PLAYER_MISSILE_DAMAGE,
  MISSILE_HIT_RADIUS,
  MISSILE_LAUNCH_SPEED,
  MUZZLE_OFFSET,
  ENEMY_BULLET_SPEED,
  ENEMY_BULLET_DAMAGE,
  ENEMY_BULLET_RADIUS,
  MISSILE_DAMAGE_SAM,
  FLAK_COUNT,
  FLAK_SPEED,
  FLAK_DAMAGE,
  FLAK_RADIUS,
} from './weaponConstants.js';

const tmpForward = new THREE.Vector3();

function muzzlePosition(flightState) {
  return flightState.position.clone().addScaledVector(tmpForward, MUZZLE_OFFSET);
}

// Every fire* function both builds the plain-data projectile (combat/entities.js)
// AND attaches+adds its THREE.js visual (`.mesh`), so combat/projectiles.js
// and combat/health.js can sync/remove it without needing to know which
// visual factory produced it.
function attachMesh(projectile, mesh, scene) {
  mesh.position.copy(projectile.position);
  scene.add(mesh);
  projectile.mesh = mesh;
  return projectile;
}

// Fires straight along the shooter's nose. Projectiles get PURE muzzle
// velocity (don't inherit the shooter's own velocity) — matches Game A,
// keeps damage/feel consistent regardless of shooter speed.
export function fireBullet(flightState, scene) {
  getForwardVector(flightState.quaternion, tmpForward);
  const velocity = tmpForward.clone().multiplyScalar(BULLET_SPEED_PLAYER);
  const p = makeBullet(muzzlePosition(flightState), velocity, 'player', BULLET_DAMAGE_PLAYER, BULLET_RADIUS_PLAYER);
  return attachMesh(p, createBulletVisual('player'), scene);
}

export function fireBomb(flightState, scene) {
  getForwardVector(flightState.quaternion, tmpForward);
  const velocity = tmpForward.clone().multiplyScalar(BOMB_SPEED);
  const p = makeBomb(muzzlePosition(flightState), velocity, 'player', BOMB_DAMAGE, BOMB_RADIUS);
  return attachMesh(p, createBombVisual(), scene);
}

export function firePlayerMissile(flightState, targetRef, scene) {
  getForwardVector(flightState.quaternion, tmpForward);
  const velocity = tmpForward.clone().multiplyScalar(MISSILE_LAUNCH_SPEED);
  const p = makeMissile(muzzlePosition(flightState), velocity, 'player', PLAYER_MISSILE_DAMAGE, MISSILE_HIT_RADIUS, targetRef);
  return attachMesh(p, createMissileVisual('player'), scene);
}

// Enemy fighter bullet, aimed along its own forward vector (it's already
// pointed roughly at the player when this is called — see ai/enemyPlane.js).
export function fireEnemyBullet(flightState, scene) {
  getForwardVector(flightState.quaternion, tmpForward);
  const velocity = tmpForward.clone().multiplyScalar(ENEMY_BULLET_SPEED);
  const p = makeBullet(muzzlePosition(flightState), velocity, 'enemy', ENEMY_BULLET_DAMAGE, ENEMY_BULLET_RADIUS);
  return attachMesh(p, createBulletVisual('enemy'), scene);
}

// SAM ship missile: launches toward the player, homing kicks in via
// combat/projectiles.js#updateProjectiles on subsequent frames.
export function fireSamMissile(shipPosition, targetRef, scene) {
  const dir = targetRef.position.clone().sub(shipPosition);
  if (dir.lengthSq() < 1e-6) dir.set(0, 0, -1);
  dir.normalize();
  const velocity = dir.multiplyScalar(MISSILE_LAUNCH_SPEED);
  const p = makeMissile(shipPosition, velocity, 'enemy', MISSILE_DAMAGE_SAM, MISSILE_HIT_RADIUS, targetRef);
  return attachMesh(p, createMissileVisual('enemy'), scene);
}

// Un-aimed full-sphere saturation burst from the carrier boss — adapted
// from Game A's fireCarrierFlak: jittered ring azimuth ported directly,
// elevation randomized mostly level-to-upward so pellets don't waste into
// the water.
export function fireFlakBurst(bossPosition, radius, scene) {
  const pellets = [];
  const slice = (Math.PI * 2) / FLAK_COUNT;
  const startAngle = Math.random() * Math.PI * 2;
  const offset = radius + 4;

  for (let i = 0; i < FLAK_COUNT; i++) {
    const azimuth = startAngle + slice * i + (Math.random() - 0.5) * slice * 1.3;
    const elevation = THREE.MathUtils.degToRad(-5 + Math.random() * 75);
    const dir = new THREE.Vector3(
      Math.cos(elevation) * Math.sin(azimuth),
      Math.sin(elevation),
      Math.cos(elevation) * Math.cos(azimuth)
    );
    const speed = FLAK_SPEED * (0.65 + Math.random() * 0.7);
    const pos = bossPosition.clone().addScaledVector(dir, offset);
    const vel = dir.clone().multiplyScalar(speed);
    const pellet = makeFlakPellet(pos, vel, FLAK_DAMAGE, FLAK_RADIUS * (0.75 + Math.random() * 0.5));
    pellets.push(attachMesh(pellet, createFlakVisual(), scene));
  }

  return pellets;
}
