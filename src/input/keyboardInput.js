// Keyboard fallback so the game is testable without a controller plugged in.
// Digital keys produce instantaneous +/-1 values (no deadzone needed).
export function createKeyboardInput() {
  const held = new Set();

  window.addEventListener('keydown', (e) => held.add(e.code));
  window.addEventListener('keyup', (e) => held.delete(e.code));

  function axis(negativeKeys, positiveKeys) {
    const neg = negativeKeys.some((k) => held.has(k));
    const pos = positiveKeys.some((k) => held.has(k));
    if (neg === pos) return 0;
    return pos ? 1 : -1;
  }

  return {
    poll() {
      return {
        // W / Up = climb (positive pitch), S / Down = dive
        pitch: axis(['KeyS', 'ArrowDown'], ['KeyW', 'ArrowUp']),
        // A / Left = roll left, D / Right = roll right
        roll: axis(['KeyA', 'ArrowLeft'], ['KeyD', 'ArrowRight']),
        // Q = yaw left, E = yaw right
        yaw: axis(['KeyQ'], ['KeyE']),
        throttleDelta: axis(['ControlLeft', 'ControlRight'], ['ShiftLeft', 'ShiftRight']),
        gamepadConnected: false,
        // Space = fire (machine gun, held), B = bomb, F = missile, C = countermeasures (all but fire edge-triggered by inputManager).
        fire: held.has('Space'),
        bomb: held.has('KeyB'),
        missile: held.has('KeyF'),
        countermeasures: held.has('KeyC'),
      };
    },
    // Debug-overlay hook: which keys are currently registered as held.
    getHeldKeys() {
      return Array.from(held);
    },
  };
}
