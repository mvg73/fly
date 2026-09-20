// Live on-screen diagnostic for input troubleshooting: shows raw gamepad
// data (id/mapping/every axis/every button), raw held keyboard keys, and
// the computed InputState, so control problems can be diagnosed from the
// page itself — no devtools needed. Toggle with the backtick key.
//
// Tracks PEAK (max-magnitude-seen) values for every axis/button/computed
// field, not just the instantaneous live reading. Capturing a clean "stick
// deflected + button click at the exact same instant" snapshot is awkward
// with one hand on a controller and one on a mouse — peak-hold means the
// player can just wiggle everything for a couple seconds, then click copy
// whenever, and nothing gets missed.
//
// Also includes a "copy snapshot" button: since whoever is debugging this
// (a person pairing with an AI assistant, say) may not have live access to
// the browser, it dumps a full JSON snapshot to the clipboard (and to a
// visible textarea as a manual-copy fallback) that can be pasted elsewhere.
export function createDebugOverlay() {
  const el = document.createElement('div');
  el.id = 'debug-overlay';
  el.hidden = true;

  const readout = document.createElement('pre');
  readout.id = 'debug-readout';
  el.appendChild(readout);

  const buttonRow = document.createElement('div');
  buttonRow.id = 'debug-btn-row';
  el.appendChild(buttonRow);

  const copyButton = document.createElement('button');
  copyButton.id = 'debug-copy-btn';
  copyButton.type = 'button';
  copyButton.textContent = 'Copy full snapshot as JSON';
  buttonRow.appendChild(copyButton);

  const resetButton = document.createElement('button');
  resetButton.id = 'debug-reset-btn';
  resetButton.type = 'button';
  resetButton.textContent = 'Reset peak values';
  buttonRow.appendChild(resetButton);

  const dumpArea = document.createElement('textarea');
  dumpArea.id = 'debug-dump';
  dumpArea.readOnly = true;
  dumpArea.placeholder = 'Click "Copy full snapshot" above, then paste this elsewhere if clipboard access is blocked.';
  el.appendChild(dumpArea);

  document.body.appendChild(el);

  let latest = null;
  let axesPeak = [];
  let buttonsPeak = [];
  let inputPeak = { pitch: 0, roll: 0, yaw: 0, throttleDelta: 0 };

  function resetPeaks() {
    axesPeak = [];
    buttonsPeak = [];
    inputPeak = { pitch: 0, roll: 0, yaw: 0, throttleDelta: 0 };
  }

  function trackPeak(peakArr, index, value) {
    const prev = peakArr[index] ?? 0;
    peakArr[index] = Math.abs(value) > Math.abs(prev) ? value : prev;
  }

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Backquote') el.hidden = !el.hidden;
  });

  resetButton.addEventListener('click', resetPeaks);

  copyButton.addEventListener('click', async () => {
    if (!latest) return;
    const json = JSON.stringify(latest, null, 2);
    dumpArea.value = json;
    dumpArea.focus();
    dumpArea.select();
    try {
      await navigator.clipboard.writeText(json);
      copyButton.textContent = 'Copied to clipboard!';
    } catch {
      copyButton.textContent = 'Clipboard blocked — text selected below, press Ctrl/Cmd+C';
    }
    setTimeout(() => {
      copyButton.textContent = 'Copy full snapshot as JSON';
    }, 2500);
  });

  function formatList(items) {
    return items.length ? items.join('\n') : '  (none)';
  }

  return {
    update({ gamepadSnapshot, heldKeys, input }) {
      if (gamepadSnapshot.connected) {
        gamepadSnapshot.axes.forEach((v, i) => trackPeak(axesPeak, i, v));
        gamepadSnapshot.buttons.forEach((b, i) => trackPeak(buttonsPeak, i, b.value));
      }
      for (const axis of ['pitch', 'roll', 'yaw', 'throttleDelta']) {
        trackPeak(inputPeak, axis, input[axis]);
      }

      latest = {
        timestamp: new Date().toISOString(),
        note: 'peak* fields are the max-magnitude value seen since the last "Reset peak values" click, not the instantaneous reading — use these to see what happened even if the click landed after you released the stick/button.',
        gamepad: gamepadSnapshot,
        gamepadAxesPeak: axesPeak,
        gamepadButtonsPeak: buttonsPeak,
        heldKeys,
        computedInputState: input,
        computedInputStatePeak: inputPeak,
      };

      if (el.hidden) return;

      const gpLines = gamepadSnapshot.connected
        ? [
            `id: ${gamepadSnapshot.id}`,
            `mapping: ${gamepadSnapshot.mapping}`,
            `axes (${gamepadSnapshot.axes.length}) — live | peak:`,
            ...gamepadSnapshot.axes.map(
              (v, i) => `  [${i}] ${v.toFixed(2).padStart(5)} | ${(axesPeak[i] ?? 0).toFixed(2).padStart(5)}`
            ),
            `buttons (${gamepadSnapshot.buttons.length}) — live | peak:`,
            ...gamepadSnapshot.buttons.map(
              (b, i) =>
                `  [${i}] ${(b.pressed ? 'DOWN' : '....').padEnd(4)} ${b.value.toFixed(2)} | ${(buttonsPeak[i] ?? 0).toFixed(2)}`
            ),
          ]
        : ['not connected (press a button on it once — Chrome hides gamepads until you interact with them)'];

      readout.textContent = [
        '--- GAMEPAD (raw) ---',
        ...gpLines,
        '',
        '--- KEYBOARD (raw held keys) ---',
        formatList(heldKeys),
        '',
        '--- COMPUTED InputState — live | peak ---',
        `pitch: ${input.pitch.toFixed(2).padStart(5)} | ${inputPeak.pitch.toFixed(2).padStart(5)}`,
        `roll:  ${input.roll.toFixed(2).padStart(5)} | ${inputPeak.roll.toFixed(2).padStart(5)}`,
        `yaw:   ${input.yaw.toFixed(2).padStart(5)} | ${inputPeak.yaw.toFixed(2).padStart(5)}`,
        `gamepadConnected: ${input.gamepadConnected}`,
      ].join('\n');
    },
  };
}
