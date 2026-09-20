import * as THREE from 'three';

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// Frame-rate independent exponential smoothing.
export function damp(current, target, lambda, dt) {
  return THREE.MathUtils.damp(current, target, lambda, dt);
}

// Maps a raw analog value in [-1, 1] through a deadzone, rescaling the
// remaining travel back to [-1, 1] so there's no dead spot at the edges.
export function applyDeadzone(value, deadzone) {
  const abs = Math.abs(value);
  if (abs < deadzone) return 0;
  return Math.sign(value) * ((abs - deadzone) / (1 - deadzone));
}
