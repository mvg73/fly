import * as THREE from 'three';
import { LOCK_MAX_RANGE, LOCK_CONE_HALF_ANGLE_DEG } from './weaponConstants.js';
import { getForwardVector } from '../plane/flightPhysics.js';

const coneHalfAngle = THREE.MathUtils.degToRad(LOCK_CONE_HALF_ANGLE_DEG);
const tmpDir = new THREE.Vector3();
const tmpForward = new THREE.Vector3();

// Picks the best enemy to show/lock a reticle on: the CLOSEST enemy within
// range and within the forward cone (angle only gates whether a target
// qualifies at all, not how it ranks). Distance-primary is deliberate: the
// boss carrier advertises a much larger detection range/cone than a small
// fighter or SAM ship (see ai/enemyCarrier.js), so an angle-weighted score
// let a distant-but-perfectly-centered boss beat an obviously more urgent
// close target just for being better-centered — verified via direct
// testing that a SAM ship 100 units away was losing lock priority to a
// boss 2000 units away for exactly that reason. Returns null if nothing
// qualifies.
export function pickLockOnTarget(playerState, enemies, options = {}) {
  const maxRange = options.maxRange ?? LOCK_MAX_RANGE;
  const halfAngle = options.coneHalfAngleRad ?? coneHalfAngle;

  getForwardVector(playerState.quaternion, tmpForward);

  let best = null;
  let bestScore = Infinity;

  for (const enemy of enemies) {
    if (enemy.alive === false) continue;
    // A target can advertise its own detection range/cone (the boss
    // carrier does — it's huge and slow, so radar/visual lock should reach
    // much further than a small fighter).
    const enemyMaxRange = enemy.lockRange ?? maxRange;
    const enemyHalfAngle = enemy.lockConeHalfAngleRad ?? halfAngle;

    tmpDir.copy(enemy.position).sub(playerState.position);
    const distance = tmpDir.length();
    if (distance > enemyMaxRange || distance < 1e-4) continue;
    tmpDir.divideScalar(distance);
    const angle = tmpForward.angleTo(tmpDir);
    if (angle > enemyHalfAngle) continue;

    if (distance < bestScore) {
      bestScore = distance;
      best = enemy;
    }
  }

  return best;
}

// Projects a world position to CSS pixel coordinates in the given DOM
// viewport. GOTCHA: THREE.Vector3.project() mis-projects points BEHIND the
// camera (they flip to the opposite screen edge instead of disappearing) —
// guard against that first.
export function projectToScreen(worldPos, camera, domWidth, domHeight) {
  const toPoint = tmpDir.copy(worldPos).sub(camera.position);
  const camForward = tmpForward;
  camera.getWorldDirection(camForward);
  if (camForward.dot(toPoint) <= 0) {
    return { visible: false, x: 0, y: 0 };
  }

  const ndc = worldPos.clone().project(camera);
  if (ndc.x < -1.2 || ndc.x > 1.2 || ndc.y < -1.2 || ndc.y > 1.2) {
    return { visible: false, x: 0, y: 0 };
  }

  return {
    visible: true,
    x: (ndc.x * 0.5 + 0.5) * domWidth,
    y: (1 - (ndc.y * 0.5 + 0.5)) * domHeight,
  };
}
