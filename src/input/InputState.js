// Normalized input snapshot consumed by the flight controller. All axes are
// in [-1, 1]; throttleDelta is in [-1, 1] where positive means "increase speed".
// fire/bomb/missile are held-state booleans; the *Pressed variants are
// edge-triggered (true only on the frame the button transitions to held).
export function createInputState() {
  return {
    pitch: 0,
    roll: 0,
    yaw: 0,
    throttleDelta: 0,
    gamepadConnected: false,
    fire: false,
    firePressed: false,
    bomb: false,
    bombPressed: false,
    missile: false,
    missilePressed: false,
    countermeasures: false,
    countermeasuresPressed: false,
  };
}
