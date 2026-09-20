import { damp } from '../utils/math.js';

const SHAKE_DECAY_LAMBDA = 6;

// Applied AFTER chaseCamera.update() so it never fights the existing
// damped-smoothing follow — it jitters the already-smoothed camera position
// directly with an undamped random offset, while the *magnitude* itself
// decays smoothly via utils/math.js#damp for consistency with the rest of
// the codebase.
export function createCameraShake() {
  let magnitude = 0;

  return {
    trigger(amount) {
      magnitude = Math.max(magnitude, amount);
    },
    apply(camera, dt) {
      if (magnitude > 0.05) {
        camera.position.x += (Math.random() - 0.5) * magnitude * 0.1;
        camera.position.y += (Math.random() - 0.5) * magnitude * 0.1;
        camera.position.z += (Math.random() - 0.5) * magnitude * 0.1;
      }
      magnitude = damp(magnitude, 0, SHAKE_DECAY_LAMBDA, dt);
    },
  };
}
