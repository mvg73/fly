import * as THREE from 'three';
import {
  BULLET_LIFETIME,
  MISSILE_LIFETIME,
  MISSILE_LAUNCH_SPEED,
  MISSILE_MAX_SPEED,
  MISSILE_ACCEL,
  MISSILE_TURN_RATE,
  PLAYER_MAX_HP,
} from './weaponConstants.js';
import { getConfig } from '../config/gameConfig.js';

// Plain-object projectile factories. Every projectile shares
// {kind, position, velocity, owner, damage, radius, life}; missile adds the
// homing-specific fields consumed by combat/homing.js.

export function makeBullet(position, velocity, owner, damage, radius) {
  return { kind: 'bullet', position: position.clone(), velocity: velocity.clone(), owner, damage, radius, life: BULLET_LIFETIME };
}

export function makeBomb(position, velocity, owner, damage, radius) {
  return { kind: 'bomb', position: position.clone(), velocity: velocity.clone(), owner, damage, radius, life: BULLET_LIFETIME };
}

export function makeFlakPellet(position, velocity, damage, radius) {
  return { kind: 'flak', position: position.clone(), velocity: velocity.clone(), owner: 'enemy', damage, radius, life: 3 };
}

export function makeMissile(position, velocity, owner, damage, radius, targetRef) {
  return {
    kind: 'missile',
    position: position.clone(),
    velocity: velocity.clone(),
    speed: MISSILE_LAUNCH_SPEED,
    maxSpeed: MISSILE_MAX_SPEED,
    accel: MISSILE_ACCEL,
    turnRate: MISSILE_TURN_RATE,
    owner,
    damage,
    radius,
    life: MISSILE_LIFETIME,
    targetRef, // an object with a live `.position` Vector3, or null once destroyed
  };
}

export function createPlayerCombatState() {
  const cfg = getConfig();
  return {
    hp: PLAYER_MAX_HP,
    maxHp: PLAYER_MAX_HP,
    invulnTimer: 0,
    fireCooldown: 0,
    bombCooldown: 0,
    bombCount: cfg.startingBombs,
    missileCooldown: 0,
    missileAmmo: cfg.startingMissiles,
    score: 0,
    countermeasuresActive: false,
    countermeasuresTimer: 0, // counts down while active
    countermeasuresCooldown: 0, // counts down after use; ready (0) at run start
    countermeasuresGlitterTimer: 0, // spacing between trailing glitter puffs
    incomingWarningCooldown: 0, // spacing between repeated incoming-missile warning beeps
  };
}

export const WORLD_UP = new THREE.Vector3(0, 1, 0);
