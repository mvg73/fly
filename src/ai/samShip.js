import * as THREE from 'three';
import { createSamShipModel } from '../scene/samShipModel.js';
import { fireSamMissile } from '../combat/weapons.js';
import {
  SAM_SHIP_HP,
  SAM_SHIP_SCORE,
  SAM_SHIP_FIRE_RATE,
  SAM_SHIP_TELEGRAPH,
  SAM_MISS_CHANCE,
  SAM_MISS_OFFSET_MIN,
  SAM_MISS_OFFSET_MAX,
  SAM_CLOSE_RANGE,
  SAM_FAR_RANGE,
  SAM_CLOSE_RANGE_MISS_BONUS,
} from '../combat/weaponConstants.js';
import { SEA_LEVEL_Y } from '../scene/ocean.js';

const SAM_SHIP_RADIUS = 8;

export function randomSamShipPosition(center, minRadius, maxRadius) {
  const angle = Math.random() * Math.PI * 2;
  const dist = minRadius + Math.random() * (maxRadius - minRadius);
  return new THREE.Vector3(center.x + Math.sin(angle) * dist, SEA_LEVEL_Y, center.z + Math.cos(angle) * dist);
}

// Accuracy degrades the closer the player is: baseline SAM_MISS_CHANCE at
// SAM_FAR_RANGE or beyond, ramping up to SAM_MISS_CHANCE +
// SAM_CLOSE_RANGE_MISS_BONUS by SAM_CLOSE_RANGE — flying in close is
// rewarded with worse SAM accuracy, not just more danger.
function computeMissChance(distance) {
  if (distance >= SAM_FAR_RANGE) return SAM_MISS_CHANCE;
  if (distance <= SAM_CLOSE_RANGE) return Math.min(0.95, SAM_MISS_CHANCE + SAM_CLOSE_RANGE_MISS_BONUS);
  const t = (distance - SAM_CLOSE_RANGE) / (SAM_FAR_RANGE - SAM_CLOSE_RANGE); // 0 at close, 1 at far
  return SAM_MISS_CHANCE + (1 - t) * SAM_CLOSE_RANGE_MISS_BONUS;
}

// A "missed" launch still fires and homes, just toward a static decoy point
// near (not on) the player, so it visibly tries and then flies past instead
// of obviously doing nothing. `forceMiss` (player has countermeasures
// active) always takes this path regardless of the roll.
//
// A real (non-decoy) lock is identifiable afterward purely by reference:
// its targetRef.position IS the player's own live position Vector3 (not a
// clone) — see main.js's continuous incoming-missile warning check, which
// scans runState.enemyProjectiles for exactly that rather than relying on
// a one-shot "just fired" flag (a single flag only gives the player one
// instant to hear a warning; scanning for the live missile itself lets the
// warning repeat for as long as an actual threat is still inbound).
function pickMissileTarget(playerPosition, forceMiss, missChance) {
  const isRealLock = !forceMiss && Math.random() >= missChance;
  if (isRealLock) {
    return { position: playerPosition, alive: true }; // live reference: real, accurate tracking
  }
  const angle = Math.random() * Math.PI * 2;
  const dist = SAM_MISS_OFFSET_MIN + Math.random() * (SAM_MISS_OFFSET_MAX - SAM_MISS_OFFSET_MIN);
  const decoy = playerPosition.clone().add(
    new THREE.Vector3(Math.cos(angle) * dist, (Math.random() - 0.5) * 30, Math.sin(angle) * dist)
  );
  return { position: decoy, alive: true }; // static snapshot: won't keep tracking the player
}

// Ex-Game A "hover-pulse" robot, repurposed as a surface-to-air missile
// ship: same small drift pattern, but the telegraphed shot is now a real
// homing missile (combat/homing.js) targeting the player, instead of a
// straight bullet.
export function createSamShip(spawnPosition, scene) {
  const visual = createSamShipModel();
  visual.position.copy(spawnPosition);
  scene.add(visual);

  const enemy = {
    kind: 'sam',
    position: visual.position,
    radius: SAM_SHIP_RADIUS,
    hp: SAM_SHIP_HP,
    maxHp: SAM_SHIP_HP,
    scoreValue: SAM_SHIP_SCORE,
    alive: true,

    patternT: Math.random() * 10,
    driveDir: Math.random() < 0.5 ? -1 : 1,
    fireCooldown: 1.5 + Math.random(),
    fireTelegraph: 0,

    update(dt, playerFlightState, playerCombat) {
      enemy.patternT += dt;
      visual.position.x += Math.sin(enemy.patternT * 0.6) * 40 * dt * enemy.driveDir;
      visual.position.z += Math.cos(enemy.patternT * 0.4) * 14 * dt * enemy.driveDir;
      visual.position.y = SEA_LEVEL_Y;

      let firedProjectile = null;

      if (enemy.fireTelegraph > 0) {
        enemy.fireTelegraph -= dt;
        visual.userData.setTelegraph(true);
        if (enemy.fireTelegraph <= 0) {
          const distance = visual.position.distanceTo(playerFlightState.position);
          const missChance = computeMissChance(distance);
          const target = pickMissileTarget(playerFlightState.position, playerCombat?.countermeasuresActive, missChance);
          firedProjectile = fireSamMissile(visual.position, target, scene);
          enemy.fireCooldown = SAM_SHIP_FIRE_RATE;
          visual.userData.setTelegraph(false);
        }
      } else {
        enemy.fireCooldown -= dt;
        if (enemy.fireCooldown <= 0) {
          enemy.fireTelegraph = SAM_SHIP_TELEGRAPH;
        }
      }

      return firedProjectile;
    },

    dispose() {
      scene.remove(visual);
    },
  };

  return enemy;
}
