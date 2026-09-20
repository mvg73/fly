import * as THREE from 'three';
import { createCarrier } from '../scene/carrier.js';
import { computePushVector } from '../scene/arenaBounds.js';
import { fireFlakBurst } from '../combat/weapons.js';
import { SEA_LEVEL_Y } from '../scene/ocean.js';
import {
  CARRIER_MAX_HP,
  CARRIER_BOSS_SCORE,
  CARRIER_FIRE_RATE,
  CARRIER_TELEGRAPH,
  BOSS_LOCK_MAX_RANGE,
  BOSS_LOCK_CONE_HALF_ANGLE_DEG,
} from '../combat/weaponConstants.js';

// A darker, rust-streaked grey-red scheme — visually distinct from the
// player's haze-grey home carrier at a glance, still a believable weathered
// warship rather than a flat toy color.
const ENEMY_PALETTE = {
  hull: '#4a3230',
  deck: '#241a19',
  island: '#5c3a37',
  stripe: 0x8a2a2a,
};

const CARRIER_BOSS_SPEED = 12; // Game A: boss is ~8x slower than the player; same ratio here, rounded up
const WALL_AVOID_GAIN = 1.6;
const SLERP_T = 0.06; // per-frame facing smoothing, avoids a jittery snap-to-direction

const SINK_DURATION = 3.2; // seconds
const SINK_DEPTH = 32; // world units below sea level once fully sunk
const SINK_LIST_ANGLE = THREE.MathUtils.degToRad(30); // how far it rolls/lists while going down

// Local-space sub-sphere offsets approximating the 260-unit hull, since one
// sphere would poorly represent it. See combat/health.js#enemyHitSpheres.
const SUB_SPHERES = [
  { offset: new THREE.Vector3(0, 8, -100), radius: 18 }, // bow
  { offset: new THREE.Vector3(0, 8, 0), radius: 22 }, // mid
  { offset: new THREE.Vector3(0, 8, 100), radius: 18 }, // stern
];

export function createEnemyCarrierBoss(spawnPosition, scene) {
  const visual = createCarrier({ palette: ENEMY_PALETTE });
  visual.position.copy(spawnPosition);
  visual.position.y = SEA_LEVEL_Y;
  scene.add(visual);

  const tmpFlee = new THREE.Vector3();
  const tmpCombined = new THREE.Vector3();
  const worldSphere = SUB_SPHERES.map(() => ({ position: new THREE.Vector3(), radius: 0 }));

  const enemy = {
    kind: 'boss',
    position: visual.position,
    radius: 22, // used as a fallback single-sphere in case anything queries .radius directly
    hp: CARRIER_MAX_HP,
    maxHp: CARRIER_MAX_HP,
    scoreValue: CARRIER_BOSS_SCORE,
    alive: true,
    lockRange: BOSS_LOCK_MAX_RANGE,
    lockConeHalfAngleRad: THREE.MathUtils.degToRad(BOSS_LOCK_CONE_HALF_ANGLE_DEG),

    patternT: Math.random() * 10,
    fireCooldown: CARRIER_FIRE_RATE * 0.5,
    fireTelegraph: 0,

    hitSpheres() {
      for (let i = 0; i < SUB_SPHERES.length; i++) {
        worldSphere[i].position.copy(SUB_SPHERES[i].offset).applyQuaternion(visual.quaternion).add(visual.position);
        worldSphere[i].radius = SUB_SPHERES[i].radius;
      }
      return worldSphere;
    },

    // World-space points along the hull (bow/mid/stern) for staggering the
    // destruction effect across the ship's full length instead of one spot.
    getHullWorldPositions() {
      return SUB_SPHERES.map((s) => s.offset.clone().applyQuaternion(visual.quaternion).add(visual.position));
    },

    // Listing-and-sinking death animation, driven each frame by main.js
    // after destroyBoss() moves this enemy into runState.sinkingObjects.
    // Returns true once fully sunk (caller then disposes it).
    sinkT: 0,
    sinkListSign: Math.random() < 0.5 ? -1 : 1,
    sinkStartQuat: null,
    sink(dt) {
      if (enemy.sinkStartQuat === null) enemy.sinkStartQuat = visual.quaternion.clone();
      enemy.sinkT += dt;
      const t = Math.min(1, enemy.sinkT / SINK_DURATION);
      const eased = t * t; // starts slow, sinks faster as it goes under
      visual.position.y = SEA_LEVEL_Y - SINK_DEPTH * eased;
      const list = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, enemy.sinkListSign * SINK_LIST_ANGLE * eased));
      visual.quaternion.copy(enemy.sinkStartQuat).multiply(list);
      return t >= 1;
    },

    update(dt, playerFlightState) {
      enemy.patternT += dt;

      tmpFlee.copy(visual.position).sub(playerFlightState.position);
      tmpFlee.y = 0;
      if (tmpFlee.lengthSq() > 1e-6) tmpFlee.normalize();
      else tmpFlee.set(0, 0, 1);

      const boundary = computePushVector(visual.position);
      tmpCombined.copy(tmpFlee).addScaledVector(boundary.direction, boundary.strength * WALL_AVOID_GAIN);
      if (tmpCombined.lengthSq() > 1e-6) tmpCombined.normalize();
      else tmpCombined.copy(tmpFlee);

      const wobble = 0.85 + 0.15 * Math.sin(enemy.patternT * 0.3);
      const speed = CARRIER_BOSS_SPEED * wobble;
      visual.position.addScaledVector(tmpCombined, speed * dt);
      visual.position.y = SEA_LEVEL_Y;

      const targetQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), tmpCombined);
      visual.quaternion.slerp(targetQuat, SLERP_T);

      let firedProjectiles = null;

      if (enemy.fireTelegraph > 0) {
        enemy.fireTelegraph -= dt;
        if (enemy.fireTelegraph <= 0) {
          firedProjectiles = fireFlakBurst(visual.position, enemy.radius, scene);
          enemy.fireCooldown = CARRIER_FIRE_RATE;
        }
      } else {
        enemy.fireCooldown -= dt;
        if (enemy.fireCooldown <= 0) {
          enemy.fireTelegraph = CARRIER_TELEGRAPH;
        }
      }

      return firedProjectiles;
    },

    dispose() {
      scene.remove(visual);
    },
  };

  return enemy;
}
