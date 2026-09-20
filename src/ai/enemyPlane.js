import * as THREE from 'three';
import { createAiFlightController } from './aiFlightController.js';
import { createEnemyPlaneModel } from '../scene/enemyPlaneModel.js';
import { headingToInput, wanderHeading, headingAngleToForward } from './steering.js';
import { fireEnemyBullet } from '../combat/weapons.js';
import { FIGHTER_HP, FIGHTER_SCORE } from '../combat/weaponConstants.js';
import {
  AGGRO_RADIUS,
  EVADE_HP_THRESHOLD,
  EVADE_DURATION,
  TAIL_ON_SELF_RADIUS,
  TAIL_ON_SELF_CONE,
  PATROL_ALT_MIN,
  PATROL_ALT_MAX,
  PATROL_THROTTLE,
  CHASE_TAIL_OFFSET,
  CHASE_THROTTLE,
  FIRE_CONE_HALF_ANGLE,
  FIRE_RANGE,
  FIGHTER_FIRE_RATE,
  EVADE_THROTTLE,
} from './aiConstants.js';

const FIGHTER_RADIUS = 5;
const tmpDesired = new THREE.Vector3();
const tmpPlayerForward = new THREE.Vector3(0, 0, -1);
const tmpSelfForward = new THREE.Vector3(0, 0, -1);
const tmpToPlayer = new THREE.Vector3();
const tmpToSelf = new THREE.Vector3();

export function randomFighterSpawnTransform(center, minRadius, maxRadius) {
  const angle = Math.random() * Math.PI * 2;
  const dist = minRadius + Math.random() * (maxRadius - minRadius);
  const position = new THREE.Vector3(center.x + Math.sin(angle) * dist, 200 + Math.random() * 200, center.z + Math.cos(angle) * dist);
  const facing = Math.random() * Math.PI * 2;
  const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, facing, 0, 'YXZ'));
  return { position, quaternion };
}

// A wandering/pursuing fighter, driven by the same shared flight physics as
// the player (via ai/aiFlightController.js), just fed AI-computed input
// instead of the real InputState. See the plan's Patrol/Chase/Evade design.
export function createEnemyPlane(spawnTransform, scene) {
  const flight = createAiFlightController(spawnTransform);
  const visual = createEnemyPlaneModel();
  scene.add(visual);

  const enemy = {
    kind: 'fighter',
    position: flight.state.position,
    quaternion: flight.state.quaternion,
    radius: FIGHTER_RADIUS,
    hp: FIGHTER_HP,
    maxHp: FIGHTER_HP,
    scoreValue: FIGHTER_SCORE,
    alive: true,

    aiState: 'patrol',
    headingAngle: Math.random() * Math.PI * 2,
    patternT: Math.random() * 10,
    turnDir: Math.random() < 0.5 ? -1 : 1,
    evadeTimer: 0,
    evadeRollSign: 1,
    evadePitchSign: 1,
    fireCooldown: FIGHTER_FIRE_RATE,

    update(dt, playerFlightState) {
      if (flight.state.crashedIntoSea) {
        // Self-inflicted death: main.js's AI tick checks `.alive` after
        // update() and removes+disposes any enemy that reports false here,
        // the same as a proper kill (just no score/poof for a sea crash).
        enemy.alive = false;
        return null;
      }

      enemy.patternT += dt;

      tmpToPlayer.copy(playerFlightState.position).sub(flight.state.position);
      const distanceToPlayer = tmpToPlayer.length();

      tmpToSelf.copy(flight.state.position).sub(playerFlightState.position);
      tmpPlayerForward.set(0, 0, -1).applyQuaternion(playerFlightState.quaternion);
      const playerOnTail =
        distanceToPlayer < TAIL_ON_SELF_RADIUS &&
        tmpPlayerForward.angleTo(tmpToSelf.clone().normalize()) < TAIL_ON_SELF_CONE;

      if (enemy.hp <= EVADE_HP_THRESHOLD || playerOnTail) {
        if (enemy.aiState !== 'evade') {
          enemy.aiState = 'evade';
          enemy.evadeTimer = EVADE_DURATION;
          enemy.evadeRollSign = Math.random() < 0.5 ? -1 : 1;
          enemy.evadePitchSign = Math.random() < 0.5 ? -1 : 1;
        }
      } else if (enemy.aiState === 'evade' && enemy.evadeTimer > 0) {
        // stay in evade until the timer runs out
      } else if (distanceToPlayer < AGGRO_RADIUS) {
        enemy.aiState = 'chase';
      } else {
        enemy.aiState = 'patrol';
      }

      let input;
      let firedProjectile = null;

      if (enemy.aiState === 'evade') {
        enemy.evadeTimer -= dt;
        input = {
          roll: enemy.evadeRollSign,
          pitch: enemy.evadePitchSign * 0.6,
          yaw: 0,
          throttleDelta: EVADE_THROTTLE,
        };
      } else if (enemy.aiState === 'chase') {
        tmpPlayerForward.set(0, 0, -1).applyQuaternion(playerFlightState.quaternion);
        tmpDesired.copy(playerFlightState.position).addScaledVector(tmpPlayerForward, -CHASE_TAIL_OFFSET);
        tmpDesired.sub(flight.state.position);
        tmpDesired.y -= 5; // slight low-bias so it tucks in behind and a touch under
        tmpDesired.normalize();
        input = headingToInput(flight.state, tmpDesired, CHASE_THROTTLE);

        enemy.fireCooldown -= dt;
        tmpSelfForward.set(0, 0, -1).applyQuaternion(flight.state.quaternion);
        const aimAngle = tmpSelfForward.angleTo(tmpToPlayer.clone().normalize());
        if (enemy.fireCooldown <= 0 && aimAngle < FIRE_CONE_HALF_ANGLE && distanceToPlayer < FIRE_RANGE) {
          firedProjectile = fireEnemyBullet(flight.state, scene);
          enemy.fireCooldown = FIGHTER_FIRE_RATE;
        }
      } else {
        enemy.headingAngle = wanderHeading(enemy.headingAngle, enemy.patternT, enemy.turnDir, dt);
        tmpDesired.copy(headingAngleToForward(enemy.headingAngle));
        const altError = THREE.MathUtils.clamp(
          (PATROL_ALT_MIN + PATROL_ALT_MAX) / 2 - flight.state.position.y,
          -50,
          50
        );
        tmpDesired.y = altError / 200;
        if (flight.state.position.y < PATROL_ALT_MIN) tmpDesired.y = Math.abs(tmpDesired.y) + 0.2;
        if (flight.state.position.y > PATROL_ALT_MAX) tmpDesired.y = -Math.abs(tmpDesired.y) - 0.2;
        tmpDesired.normalize();
        input = headingToInput(flight.state, tmpDesired, PATROL_THROTTLE);
      }

      flight.update(dt, input);

      visual.position.copy(flight.state.position);
      visual.quaternion.copy(flight.state.quaternion);

      return firedProjectile;
    },

    dispose() {
      scene.remove(visual);
    },
  };

  return enemy;
}
