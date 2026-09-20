import * as THREE from 'three';

// Cheap, shared geometries/materials (created once) for every projectile
// visual — instantiating a projectile only ever creates a new THREE.Mesh
// referencing these, never new geometry/material, since bullets in
// particular can be numerous and short-lived.

const bulletGeo = new THREE.CylinderGeometry(0.15, 0.15, 2.2, 5);
bulletGeo.rotateX(-Math.PI / 2); // bake the axis onto local -Z so the returned mesh can start at identity rotation
const bulletMatPlayer = new THREE.MeshBasicMaterial({ color: 0xfff2a8 });
const bulletMatEnemy = new THREE.MeshBasicMaterial({ color: 0xff8a4d });

const bombGeo = new THREE.SphereGeometry(0.9, 8, 6);
const bombMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.7 });

const flakGeo = new THREE.SphereGeometry(0.5, 6, 4);
const flakMat = new THREE.MeshBasicMaterial({ color: 0xffcf5c });

const missileBodyGeo = new THREE.CylinderGeometry(0.35, 0.35, 3.2, 6);
const missileNoseGeo = new THREE.ConeGeometry(0.35, 1.0, 6);
const missileBodyMatPlayer = new THREE.MeshStandardMaterial({ color: 0xd8dbde, roughness: 0.5 });
const missileBodyMatEnemy = new THREE.MeshStandardMaterial({ color: 0x555b60, roughness: 0.5 });
const missileNoseMat = new THREE.MeshBasicMaterial({ color: 0xff3b3b });

// Every projectile mesh starts at identity rotation with its "forward" baked
// onto local -Z (matching the rest of the codebase's convention), so
// combat/projectiles.js can freely set `.quaternion` each frame to face
// velocity without fighting a per-instance rotation set here.
export function createBulletVisual(owner) {
  return new THREE.Mesh(bulletGeo, owner === 'player' ? bulletMatPlayer : bulletMatEnemy);
}

export function createBombVisual() {
  return new THREE.Mesh(bombGeo, bombMat);
}

export function createFlakVisual() {
  return new THREE.Mesh(flakGeo, flakMat);
}

export function createMissileVisual(owner) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(missileBodyGeo, owner === 'player' ? missileBodyMatPlayer : missileBodyMatEnemy);
  body.rotation.x = Math.PI / 2;
  group.add(body);
  const nose = new THREE.Mesh(missileNoseGeo, missileNoseMat);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -2.1;
  group.add(nose);
  return group;
}
