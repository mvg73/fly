import * as THREE from 'three';
import { stepHomingMissile, stepBallistic } from './homing.js';

const FORWARD_LOCAL = new THREE.Vector3(0, 0, -1);
const tmpDir = new THREE.Vector3();

// Integrates every projectile in `list` (mutates in place), syncs its
// `.mesh` transform, and removes+cleans-up any that expired or whose
// target died. `list` is an array of the plain objects from
// combat/entities.js (mixed kinds), each carrying a `.mesh` attached by
// combat/weapons.js.
export function updateProjectiles(list, dt, scene) {
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    let expired;
    if (p.kind === 'missile' && p.targetRef && p.targetRef.alive !== false) {
      expired = stepHomingMissile(p, p.targetRef.position, dt);
    } else {
      // No (or dead) target: fly the last heading out ballistically.
      expired = stepBallistic(p, dt);
    }

    if (expired) {
      scene.remove(p.mesh);
      list.splice(i, 1);
      continue;
    }

    p.mesh.position.copy(p.position);
    if (p.velocity.lengthSq() > 1e-6) {
      // Every projectile visual is built with its "forward" baked onto
      // local -Z (see scene/projectileModels.js), so this alone orients it.
      tmpDir.copy(p.velocity).normalize();
      p.mesh.quaternion.setFromUnitVectors(FORWARD_LOCAL, tmpDir);
    }
  }
}
