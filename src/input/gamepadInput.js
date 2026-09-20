import { applyDeadzone } from '../utils/math.js';
import { getConfig } from '../config/gameConfig.js';

const DEADZONE = 0.12;

// The Gamepad API has no axis-change events, so gamepad state must be
// polled every frame via navigator.getGamepads(). We don't rely on the
// gamepadconnected/disconnected events to track *which* pad to use —
// scanning for the first non-null entry every poll is just as cheap and
// avoids any dependency on event-listener timing at page load.
function findConnectedPad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const gp of pads) {
    if (gp) return gp;
  }
  return null;
}

export function createGamepadInput() {
  return {
    // Returns null when no gamepad is connected, otherwise a partial
    // InputState-shaped object.
    poll() {
      const gp = findConnectedPad();
      if (!gp) return null;

      const rawRoll = gp.axes[0] ?? 0; // left stick X: -1 left, +1 right
      const rawPitch = gp.axes[1] ?? 0; // left stick Y: +1 pulled back (climb), -1 pushed forward (dive)
      const rawYaw = gp.axes[2] ?? 0; // right stick X: -1 left, +1 right
      const rt = gp.buttons[7] ? gp.buttons[7].value : 0; // right trigger: throttle up
      const lt = gp.buttons[6] ? gp.buttons[6].value : 0; // left trigger: throttle down

      // D-pad fallback for pitch/roll (standard mapping: buttons 12-15).
      // Some pads' analog sticks don't behave as expected depending on a
      // hardware mode switch, so the d-pad is treated as an equally valid
      // digital source for the same two axes, whichever is deflected more.
      const dpadUp = gp.buttons[12]?.pressed;
      const dpadDown = gp.buttons[13]?.pressed;
      const dpadLeft = gp.buttons[14]?.pressed;
      const dpadRight = gp.buttons[15]?.pressed;
      const dpadPitch = dpadUp ? 1 : dpadDown ? -1 : 0;
      const dpadRoll = dpadRight ? 1 : dpadLeft ? -1 : 0;

      const stickRoll = applyDeadzone(rawRoll, DEADZONE);
      const stickPitch = applyDeadzone(rawPitch, DEADZONE);

      // Button indices are user-configurable (settings screen) since not
      // every pad's face buttons land on the 0/1/2 we assume by default —
      // this is exactly the kind of per-hardware quirk the debug overlay
      // surfaced earlier, so letting the player remap sidesteps it entirely.
      const cfg = getConfig();

      return {
        roll: Math.abs(dpadRoll) > Math.abs(stickRoll) ? dpadRoll : stickRoll,
        pitch: Math.abs(dpadPitch) > Math.abs(stickPitch) ? dpadPitch : stickPitch,
        yaw: applyDeadzone(rawYaw, DEADZONE),
        throttleDelta: rt - lt,
        gamepadConnected: true,
        fire: !!gp.buttons[cfg.gamepadFireButton]?.pressed,
        bomb: !!gp.buttons[cfg.gamepadBombButton]?.pressed,
        missile: !!gp.buttons[cfg.gamepadMissileButton]?.pressed,
        countermeasures: !!gp.buttons[cfg.gamepadCountermeasuresButton]?.pressed,
      };
    },

    // Debug-overlay hook: raw (pre-deadzone) gamepad info, so the player
    // can see exactly what the browser is reporting for their hardware.
    // Deliberately dumps EVERY axis and button (not just the ones this
    // game currently reads) since the whole point is diagnosing a mapping
    // that might not match our assumptions (e.g. a d-pad reporting through
    // an axis, or a stick landing on an unexpected index).
    getDebugSnapshot() {
      const gp = findConnectedPad();
      if (!gp) return { connected: false };
      return {
        connected: true,
        id: gp.id,
        mapping: gp.mapping || '(non-standard)',
        index: gp.index,
        axes: Array.from(gp.axes),
        buttons: gp.buttons.map((b) => ({ pressed: b.pressed, value: Number(b.value.toFixed(2)) })),
      };
    },
  };
}
