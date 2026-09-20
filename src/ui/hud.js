export function createHud() {
  const speedEl = document.getElementById('hud-speed');
  const altEl = document.getElementById('hud-alt');
  const gamepadEl = document.getElementById('hud-gamepad');

  return {
    update({ speed, altitude, gamepadConnected }) {
      speedEl.textContent = `SPD ${Math.max(0, Math.round(speed * 4))}`;
      altEl.textContent = `ALT ${Math.max(0, Math.round(altitude))}`;
      gamepadEl.textContent = gamepadConnected ? 'Gamepad: connected' : 'Gamepad: not connected (using keyboard)';
      gamepadEl.classList.toggle('connected', gamepadConnected);
    },
  };
}
