import * as THREE from 'three';
import { FOG_FAR } from './sceneSetup.js';

// Soft push-back sphere centered on the origin (the player's home carrier),
// replacing Game A's rectangular bounce-kick wall. Sized just inside the
// ocean's fog-out distance so nothing visibly "hits a wall" — it's already
// fading into the fog by the time it's pushed back.
export const ARENA_RADIUS = FOG_FAR - 600; // ~3000
const PUSH_BAND = 400; // distance before the hard radius where push-back starts ramping in
const PUSH_STRENGTH = 60; // world units/s^2-ish kick at full strength

// Pure: how strongly (0..1) and in which direction a position at `pos`
// should be pushed back toward the arena center. Used directly by AI
// steering (e.g. the boss carrier's wall-avoidance) as well as by
// applyArenaBounds below.
export function computePushVector(pos) {
  const distFromCenter = Math.hypot(pos.x, pos.z);
  const rampStart = ARENA_RADIUS - PUSH_BAND;
  if (distFromCenter <= rampStart) {
    return { direction: new THREE.Vector3(0, 0, 0), strength: 0 };
  }
  const strength = THREE.MathUtils.clamp((distFromCenter - rampStart) / PUSH_BAND, 0, 1);
  const direction = new THREE.Vector3(-pos.x, 0, -pos.z);
  if (direction.lengthSq() > 1e-8) direction.normalize();
  return { direction, strength };
}

// Mutates `position` (a THREE.Vector3) in place: a gentle inward kick that
// grows as the entity gets further past the ramp start, so flying out never
// ends in a hard stop or an escape into the fog forever.
export function applyArenaBounds(position, dt) {
  const { direction, strength } = computePushVector(position);
  if (strength <= 0) return;
  position.addScaledVector(direction, PUSH_STRENGTH * strength * dt);
}
