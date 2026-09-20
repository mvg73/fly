import { getConfig, updateConfig } from '../config/gameConfig.js';

// A small always-visible gear button opens a settings panel over the game.
// Fields write straight through to config/gameConfig.js (persisted to
// localStorage). Ammo-count changes apply to the CURRENT run immediately
// (via the onApply callback, which main.js uses to top up the player's
// current bomb/missile counts) as well as becoming the default for the
// next restart.
export function createSettingsScreen({ onApply } = {}) {
  const gearBtn = document.createElement('button');
  gearBtn.id = 'settings-gear';
  gearBtn.type = 'button';
  gearBtn.title = 'Settings';
  gearBtn.textContent = '⚙';
  document.body.appendChild(gearBtn);

  const panel = document.createElement('div');
  panel.id = 'settings-panel';
  panel.hidden = true;
  panel.innerHTML = `
    <h2>Settings</h2>
    <label class="settings-row">
      <span>Invert Y axis (pitch)</span>
      <input type="checkbox" id="cfg-invert-y" />
    </label>
    <label class="settings-row">
      <span>Starting bombs</span>
      <input type="number" id="cfg-bombs" min="0" max="20" step="1" />
    </label>
    <label class="settings-row">
      <span>Starting missiles</span>
      <input type="number" id="cfg-missiles" min="0" max="20" step="1" />
    </label>
    <div class="settings-divider">Gamepad button index (see debug overlay's raw button list to find yours)</div>
    <label class="settings-row">
      <span>Fire / Launch button</span>
      <input type="number" id="cfg-btn-fire" min="0" max="19" step="1" />
    </label>
    <label class="settings-row">
      <span>Bomb button</span>
      <input type="number" id="cfg-btn-bomb" min="0" max="19" step="1" />
    </label>
    <label class="settings-row">
      <span>Missile button</span>
      <input type="number" id="cfg-btn-missile" min="0" max="19" step="1" />
    </label>
    <label class="settings-row">
      <span>Countermeasures button</span>
      <input type="number" id="cfg-btn-countermeasures" min="0" max="19" step="1" />
    </label>
    <div class="settings-actions">
      <button type="button" id="settings-close">Close</button>
    </div>
  `;
  document.body.appendChild(panel);

  const fields = {
    invertYAxis: panel.querySelector('#cfg-invert-y'),
    startingBombs: panel.querySelector('#cfg-bombs'),
    startingMissiles: panel.querySelector('#cfg-missiles'),
    gamepadFireButton: panel.querySelector('#cfg-btn-fire'),
    gamepadBombButton: panel.querySelector('#cfg-btn-bomb'),
    gamepadMissileButton: panel.querySelector('#cfg-btn-missile'),
    gamepadCountermeasuresButton: panel.querySelector('#cfg-btn-countermeasures'),
  };

  function loadFieldsFromConfig() {
    const cfg = getConfig();
    fields.invertYAxis.checked = cfg.invertYAxis;
    fields.startingBombs.value = cfg.startingBombs;
    fields.startingMissiles.value = cfg.startingMissiles;
    fields.gamepadFireButton.value = cfg.gamepadFireButton;
    fields.gamepadBombButton.value = cfg.gamepadBombButton;
    fields.gamepadMissileButton.value = cfg.gamepadMissileButton;
    fields.gamepadCountermeasuresButton.value = cfg.gamepadCountermeasuresButton;
  }

  function readFieldsToConfig() {
    updateConfig({
      invertYAxis: fields.invertYAxis.checked,
      startingBombs: clampInt(fields.startingBombs.value, 0, 20),
      startingMissiles: clampInt(fields.startingMissiles.value, 0, 20),
      gamepadFireButton: clampInt(fields.gamepadFireButton.value, 0, 19),
      gamepadBombButton: clampInt(fields.gamepadBombButton.value, 0, 19),
      gamepadMissileButton: clampInt(fields.gamepadMissileButton.value, 0, 19),
      gamepadCountermeasuresButton: clampInt(fields.gamepadCountermeasuresButton.value, 0, 19),
    });
    onApply?.(getConfig());
  }

  function clampInt(value, min, max) {
    const n = Math.round(Number(value));
    if (Number.isNaN(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  function open() {
    loadFieldsFromConfig();
    panel.hidden = false;
  }
  function close() {
    readFieldsToConfig();
    panel.hidden = true;
  }

  gearBtn.addEventListener('click', () => (panel.hidden ? open() : close()));
  panel.querySelector('#settings-close').addEventListener('click', close);
  // Apply live as fields change too, not just on close, so ammo top-ups feel immediate.
  for (const el of Object.values(fields)) {
    el.addEventListener('change', readFieldsToConfig);
  }

  return { open, close };
}
