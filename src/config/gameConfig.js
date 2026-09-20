// Persisted player-adjustable settings: axis invert, starting ammo counts,
// and gamepad button bindings for fire/bomb/missile. Backed by localStorage
// so it survives reloads. A module-level singleton (there's only ever one
// player/config in this app) with a tiny change-listener list so anything
// that reads config values live (gamepadInput.js, inputManager.js) can
// react immediately when the settings screen saves a change.
const STORAGE_KEY = 'carrier-flight-config-v1';

export const DEFAULTS = {
  invertYAxis: false,
  startingBombs: 1,
  startingMissiles: 4,
  gamepadFireButton: 0,
  gamepadBombButton: 1,
  gamepadMissileButton: 2,
  gamepadCountermeasuresButton: 3, // the last standard face button (Y/Triangle)
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

let config = load();
const listeners = new Set();

export function getConfig() {
  return config;
}

export function updateConfig(partial) {
  config = { ...config, ...partial };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // localStorage unavailable (private mode, etc.) - config still works
    // for the rest of this session, just won't persist across reloads.
  }
  for (const fn of listeners) fn(config);
}

export function onConfigChange(fn) {
  listeners.add(fn);
}
