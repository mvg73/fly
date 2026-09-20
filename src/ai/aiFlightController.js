import { SEA_LEVEL_Y } from '../scene/ocean.js';
import { createFlightState, stepFlightPhysics } from '../plane/flightPhysics.js';
import { AI_FIGHTER_FLIGHT_CONSTANTS } from './aiConstants.js';

// Same shape as plane/flightController.js, but with a *death*, not a
// respawn, on splashdown: sets state.crashedIntoSea and stops integrating.
// The caller (ai/enemyPlane.js's owner, main.js's AI tick) treats that the
// same as any other kill.
export function createAiFlightController(spawnTransform, constants = AI_FIGHTER_FLIGHT_CONSTANTS) {
  const state = createFlightState(spawnTransform);
  state.crashedIntoSea = false;

  function update(dt, input) {
    if (state.crashedIntoSea) return state;

    stepFlightPhysics(state, dt, input, constants);

    if (state.position.y - SEA_LEVEL_Y < 0) {
      state.crashedIntoSea = true;
    }

    return state;
  }

  return { state, update };
}
