// Tiny generated-beep sound effects via Web Audio - no sound files needed.
// Ported near-verbatim from Game A's src/audio.js. play() is safe to call
// even if audio is unavailable/blocked (silent no-op).
export function createSfx() {
  let ctx = null;

  function getCtx() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    } catch (e) {
      ctx = false;
    }
    return ctx;
  }

  function beep(freq, duration, type, startGain) {
    const audioCtx = getCtx();
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(startGain, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  }

  const SOUNDS = {
    fire: () => beep(760, 0.06, 'square', 0.06),
    hit: () => beep(140, 0.25, 'sawtooth', 0.12),
    enemyDeath: () => beep(520, 0.18, 'square', 0.08),
    bomb: () => {
      beep(180, 0.15, 'sawtooth', 0.14);
      setTimeout(() => beep(90, 0.2, 'square', 0.12), 90);
    },
    missileLaunch: () => beep(340, 0.12, 'sawtooth', 0.08),
    lockAcquired: () => beep(980, 0.05, 'square', 0.05),
    // Distinct from lockAcquired (that's YOU locking onto a target) — this is
    // an incoming-threat alarm: a real SAM missile is tracking you.
    incomingLock: () => {
      beep(1200, 0.09, 'square', 0.09);
      setTimeout(() => beep(1200, 0.09, 'square', 0.09), 150);
      setTimeout(() => beep(1200, 0.09, 'square', 0.09), 300);
    },
    resupply: () => {
      beep(440, 0.09, 'square', 0.07);
      setTimeout(() => beep(660, 0.12, 'square', 0.08), 90);
    },
    countermeasures: () => {
      beep(900, 0.05, 'sawtooth', 0.06);
      setTimeout(() => beep(1100, 0.05, 'sawtooth', 0.05), 50);
      setTimeout(() => beep(1300, 0.05, 'sawtooth', 0.04), 100);
    },
    win: () => {
      beep(523, 0.12, 'square', 0.1);
      setTimeout(() => beep(784, 0.2, 'square', 0.1), 120);
    },
    lose: () => beep(110, 0.5, 'sawtooth', 0.12),
  };

  return {
    play(name) {
      try {
        const fn = SOUNDS[name];
        if (fn) fn();
      } catch (e) {
        // audio is a stretch goal - never let it break the game
      }
    },
  };
}
