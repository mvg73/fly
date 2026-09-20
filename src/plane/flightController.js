import { SEA_LEVEL_Y } from '../scene/ocean.js';
import {
  DEFAULT_FLIGHT_CONSTANTS,
  createFlightState,
  resetFlightState,
  stepFlightPhysics,
} from './flightPhysics.js';

// Re-exported for backward compatibility (main.js and anything else that
// imported tuning constants directly from this module).
export const {
  MAX_PITCH_RATE,
  MAX_ROLL_RATE,
  MAX_YAW_RATE,
  PITCH_LIMIT,
  AUTO_LEVEL_ROLL_GAIN,
  AUTO_LEVEL_PITCH_GAIN,
  TURN_FROM_BANK_GAIN,
  THROTTLE_ACCEL,
  MIN_SPEED,
  MAX_SPEED,
  INPUT_DEADZONE,
} = DEFAULT_FLIGHT_CONSTANTS;

// Player-specific wrapper around the shared flight physics. Sea-level
// collision is a real death now (freezes in place at the crash site, just
// like an AI plane crashing — see ai/aiFlightController.js): main.js
// detects `state.crashedIntoSea` going true, plays a destruction effect,
// and routes it through the same win/lose/restart flow as being shot down.
// `resetTo` (called on restart) is what actually sends the plane back to
// the carrier deck.
export function createFlightController(spawnTransform) {
  const state = createFlightState(spawnTransform);
  state.crashedIntoSea = false;

  function resetTo(transform) {
    resetFlightState(state, transform);
    state.crashedIntoSea = false;
  }

  function update(dt, input) {
    if (state.crashedIntoSea) return state;

    stepFlightPhysics(state, dt, input, DEFAULT_FLIGHT_CONSTANTS);

    if (state.position.y - SEA_LEVEL_Y < 0) {
      state.crashedIntoSea = true;
    }

    return state;
  }

  return { state, update, resetTo };
}
