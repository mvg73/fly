import * as THREE from 'three';

const FALLBACK_AXIS = new THREE.Vector3(0, 1, 0);

// Turns `missile.velocity` toward `targetPosition` at up to `missile.turnRate`
// rad/s, ramps speed toward `missile.maxSpeed`, integrates position, and
// counts down `missile.life`. Shared by SAM-ship missiles (target = player)
// and player missiles (target = the locked enemy) — see combat/weapons.js.
//
// Returns true when the missile has expired (caller should remove it).
export function stepHomingMissile(missile, targetPosition, dt) {
  const currentDir = missile.velocity.clone().normalize();
  if (currentDir.lengthSq() < 1e-8) currentDir.set(0, 0, -1);

  const desiredDir = targetPosition.clone().sub(missile.position);
  if (desiredDir.lengthSq() > 1e-8) {
    desiredDir.normalize();

    const angle = currentDir.angleTo(desiredDir);
    if (angle > 1e-4) {
      let axis = currentDir.clone().cross(desiredDir);
      if (axis.lengthSq() < 1e-6) axis = FALLBACK_AXIS.clone(); // parallel/antiparallel fallback
      axis.normalize();
      const turn = Math.min(angle, missile.turnRate * dt);
      currentDir.applyAxisAngle(axis, turn);
    }
  }

  missile.speed = Math.min(missile.speed + missile.accel * dt, missile.maxSpeed);
  missile.velocity.copy(currentDir).multiplyScalar(missile.speed);
  missile.position.addScaledVector(missile.velocity, dt);
  missile.life -= dt;

  return missile.life <= 0;
}

// Ballistic (non-homing) integration for any projectile kind, and for a
// missile once its target is gone (see combat/projectiles.js).
export function stepBallistic(projectile, dt) {
  projectile.position.addScaledVector(projectile.velocity, dt);
  projectile.life -= dt;
  return projectile.life <= 0;
}
