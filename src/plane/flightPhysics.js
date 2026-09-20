import * as THREE from 'three';
import { clamp } from '../utils/math.js';

// Shared, entity-agnostic flight integration: the player and every AI plane
// move through this identical pitch/roll/yaw/quaternion/speed step, just fed
// a different InputState source. Sea-level collision is deliberately NOT
// handled here (that's caller policy: the player respawns at the carrier,
// an AI plane just dies) — see plane/flightController.js and
// ai/aiFlightController.js.

// All angle rates in rad/s, angles in rad, speed in world units/s.
export const DEFAULT_FLIGHT_CONSTANTS = {
  MAX_PITCH_RATE: 1.0,
  MAX_ROLL_RATE: 2.4,
  MAX_YAW_RATE: 0.6,
  PITCH_LIMIT: THREE.MathUtils.degToRad(75), // clamp near +/-90 avoids YXZ gimbal issues
  AUTO_LEVEL_ROLL_GAIN: 1.6, // 1/s, restoring torque toward wings-level when roll input is idle
  AUTO_LEVEL_PITCH_GAIN: 0.5, // 1/s, gentler so it doesn't fight climbs/dives
  TURN_FROM_BANK_GAIN: 0.9, // couples bank angle into yaw so turns actually curve the flight path
  THROTTLE_ACCEL: 26, // units/s^2
  MIN_SPEED: 16, // never fully stalls
  MAX_SPEED: 130,
  INPUT_DEADZONE: 0.05,
};

const FORWARD_LOCAL = new THREE.Vector3(0, 0, -1);

export function createFlightState(spawnTransform) {
  const state = {
    position: new THREE.Vector3(),
    quaternion: new THREE.Quaternion(),
    pitchAngle: 0,
    yawAngle: 0,
    rollAngle: 0,
    speed: 0,
  };
  resetFlightState(state, spawnTransform);
  return state;
}

export function resetFlightState(state, transform) {
  state.position.copy(transform.position);
  const euler = new THREE.Euler().setFromQuaternion(transform.quaternion, 'YXZ');
  state.pitchAngle = euler.x;
  state.yawAngle = euler.y;
  state.rollAngle = euler.z;
  state.speed = 0;
  state.quaternion.copy(transform.quaternion);
  return state;
}

// Mutates and returns `state`. `input` is a plain {pitch, roll, yaw,
// throttleDelta} object in [-1,1] (an InputState, or an AI-computed
// equivalent from ai/steering.js#headingToInput).
export function stepFlightPhysics(state, dt, input, constants = DEFAULT_FLIGHT_CONSTANTS) {
  const C = constants;

  // 1. Angular rates from input.
  let pitchRate = input.pitch * C.MAX_PITCH_RATE;
  let rollRate = -input.roll * C.MAX_ROLL_RATE;
  let yawRate = -input.yaw * C.MAX_YAW_RATE;

  // 2. Auto-level: gently restore wings-level / shallow pitch when the
  // stick is near neutral, for a forgiving arcade feel.
  if (Math.abs(input.roll) < C.INPUT_DEADZONE) {
    rollRate += -state.rollAngle * C.AUTO_LEVEL_ROLL_GAIN;
  }
  if (Math.abs(input.pitch) < C.INPUT_DEADZONE) {
    pitchRate += -state.pitchAngle * C.AUTO_LEVEL_PITCH_GAIN;
  }

  // 3. Integrate angles.
  state.pitchAngle = clamp(state.pitchAngle + pitchRate * dt, -C.PITCH_LIMIT, C.PITCH_LIMIT);
  state.rollAngle += rollRate * dt;
  state.yawAngle += yawRate * dt;

  // 4. Bank-to-turn coupling: banking right (rollAngle < 0, see sign
  // convention in gamepadInput.js/keyboardInput.js) curves the yaw to the
  // right, and vice versa — otherwise rolling would just spin in place.
  state.yawAngle += state.rollAngle * C.TURN_FROM_BANK_GAIN * dt;

  state.quaternion.setFromEuler(
    new THREE.Euler(state.pitchAngle, state.yawAngle, state.rollAngle, 'YXZ')
  );

  // 5. Throttle -> speed. MIN_SPEED > 0 so the plane never fully stalls.
  state.speed = clamp(state.speed + input.throttleDelta * C.THROTTLE_ACCEL * dt, C.MIN_SPEED, C.MAX_SPEED);

  // 6. Move along the plane's own forward vector.
  const forward = FORWARD_LOCAL.clone().applyQuaternion(state.quaternion);
  state.position.addScaledVector(forward, state.speed * dt);

  return state;
}

export function getForwardVector(quaternion, out = new THREE.Vector3()) {
  return out.copy(FORWARD_LOCAL).applyQuaternion(quaternion);
}
