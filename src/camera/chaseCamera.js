import * as THREE from 'three';
import { damp } from '../utils/math.js';

// Behind (+Z local, since the plane's forward is -Z) and above the plane.
const OFFSET_LOCAL = new THREE.Vector3(0, 6, 14);
const POS_LAMBDA = 5; // camera position smoothing
const LOOK_LAMBDA = 8; // look-at target smoothing (faster than position so it doesn't lag the camera itself)
const LOOK_AHEAD_DISTANCE = 20;
const PITCH_INFLUENCE = 0.5; // camera pitches less than the plane's nose, so it doesn't swing wildly
const FORWARD_LOCAL = new THREE.Vector3(0, 0, -1);

// Smoothed follow-behind camera. Deliberately stays level (no roll) by
// building its offset from a yaw+pitch-only orientation — the plane's own
// bank is still very visible against a level horizon, which reads clearly
// without the camera-roll discomfort a fully-parented camera would cause.
export function createChaseCamera() {
  let smoothedPos = null;
  let smoothedLook = null;

  function update(camera, planeState, dt) {
    const chaseQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(planeState.pitchAngle * PITCH_INFLUENCE, planeState.yawAngle, 0, 'YXZ')
    );
    const desiredPos = OFFSET_LOCAL.clone().applyQuaternion(chaseQuat).add(planeState.position);

    const forward = FORWARD_LOCAL.clone().applyQuaternion(planeState.quaternion);
    const desiredLook = planeState.position
      .clone()
      .addScaledVector(forward, LOOK_AHEAD_DISTANCE)
      .add(new THREE.Vector3(0, 2, 0));

    if (!smoothedPos) {
      // Snap on the first frame instead of lerping in from the origin.
      smoothedPos = desiredPos.clone();
      smoothedLook = desiredLook.clone();
    } else {
      smoothedPos.set(
        damp(smoothedPos.x, desiredPos.x, POS_LAMBDA, dt),
        damp(smoothedPos.y, desiredPos.y, POS_LAMBDA, dt),
        damp(smoothedPos.z, desiredPos.z, POS_LAMBDA, dt)
      );
      smoothedLook.set(
        damp(smoothedLook.x, desiredLook.x, LOOK_LAMBDA, dt),
        damp(smoothedLook.y, desiredLook.y, LOOK_LAMBDA, dt),
        damp(smoothedLook.z, desiredLook.z, LOOK_LAMBDA, dt)
      );
    }

    camera.position.copy(smoothedPos);
    camera.up.set(0, 1, 0);
    camera.lookAt(smoothedLook);
  }

  return { update };
}
