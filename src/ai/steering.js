import * as THREE from 'three';
import { clamp } from '../utils/math.js';
import { STEER_ROLL_GAIN, STEER_YAW_GAIN, STEER_PITCH_GAIN } from './aiConstants.js';

const tmpLocal = new THREE.Vector3();
const invQuat = new THREE.Quaternion();

// Converts a desired world-space forward direction + throttle into an
// InputState-shaped object the shared flight physics (or the player's own
// flightController) can consume — this is the one seam every AI behavior
// (Patrol/Chase/Evade, the SAM ship doesn't use this, the carrier boss
// doesn't either since both are surface-bound) funnels through.
//
// A simple proportional controller: converts the desired direction into the
// plane's own local space, reads off yaw/pitch error angles, and steers
// roll+yaw+pitch toward zeroing them. Bank-to-turn coupling in
// flightPhysics.js does most of the actual turning once rolled.
export function headingToInput(flightState, desiredForwardWorld, desiredThrottle) {
  invQuat.copy(flightState.quaternion).invert();
  tmpLocal.copy(desiredForwardWorld).applyQuaternion(invQuat);

  const yawError = Math.atan2(tmpLocal.x, -tmpLocal.z);
  const pitchError = Math.atan2(tmpLocal.y, -tmpLocal.z);

  return {
    roll: clamp(-yawError * STEER_ROLL_GAIN, -1, 1),
    yaw: clamp(yawError * STEER_YAW_GAIN, -1, 1),
    pitch: clamp(pitchError * STEER_PITCH_GAIN, -1, 1),
    throttleDelta: desiredThrottle,
  };
}

// Port of Game A's `roam` pattern wander: a slowly-varying turn rate rather
// than a hard random walk, so patrol paths read as lazy curves.
export function wanderHeading(headingAngle, patternT, turnDir, dt) {
  const turnRate = Math.sin(patternT * 0.5) * 0.7 * turnDir;
  return headingAngle + turnRate * dt;
}

export function headingAngleToForward(headingAngle) {
  return new THREE.Vector3(Math.sin(headingAngle), 0, -Math.cos(headingAngle));
}
