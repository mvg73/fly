import { createGamepadInput } from './gamepadInput.js';
import { createKeyboardInput } from './keyboardInput.js';
import { createInputState } from './InputState.js';
import { getConfig } from '../config/gameConfig.js';

const AXES = ['pitch', 'roll', 'yaw', 'throttleDelta'];
const BUTTONS = ['fire', 'bomb', 'missile', 'countermeasures'];

// Merges gamepad + keyboard into a single InputState per frame. Policy:
// poll both every frame, and per axis take whichever source is deflected
// further from neutral. This means a merely-connected (or misdetected /
// non-standard-mapped) gamepad can never silently block keyboard input —
// each axis independently falls back to keyboard when the gamepad isn't
// actually being pushed on that axis. Buttons merge via OR (either source
// held = held); edge detection (*Pressed) is computed here via closure
// prev-held state, mirroring Game A's `held && !prevHeld` pattern — the
// per-source pollers themselves stay stateless.
export function createInputManager() {
  const gamepad = createGamepadInput();
  const keyboard = createKeyboardInput();
  const prevHeld = { fire: false, bomb: false, missile: false, countermeasures: false };

  return {
    poll() {
      const state = createInputState();
      const gp = gamepad.poll(); // null if no gamepad connected
      const kb = keyboard.poll(); // always available

      for (const axis of AXES) {
        const gpVal = gp ? gp[axis] : 0;
        const kbVal = kb[axis];
        state[axis] = Math.abs(gpVal) > Math.abs(kbVal) ? gpVal : kbVal;
      }
      state.gamepadConnected = !!gp;

      // Applied to the final merged value (not per-source) so it inverts
      // pitch regardless of whether the frame's signal came from the stick,
      // the d-pad, or the keyboard.
      if (getConfig().invertYAxis) state.pitch = -state.pitch;

      for (const button of BUTTONS) {
        const held = (gp ? gp[button] : false) || kb[button];
        state[button] = held;
        state[`${button}Pressed`] = held && !prevHeld[button];
        prevHeld[button] = held;
      }

      return state;
    },

    // Debug-overlay hooks (raw, pre-merge data from each source).
    getGamepadDebugSnapshot() {
      return gamepad.getDebugSnapshot();
    },
    getHeldKeys() {
      return keyboard.getHeldKeys();
    },
  };
}
