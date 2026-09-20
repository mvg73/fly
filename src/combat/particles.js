import * as THREE from 'three';

const POOF_COLORS = [0x8a8d85, 0xb7bab2, 0x5c5f58, 0xffffff, 0xffb347, 0xffd23f];
const POOF_POINT_COUNT = 18;

// Chunky low-poly debris for something breaking apart. Palette defaults to
// the player's own plane (see plane/planeModel.js) so the pieces visibly
// read as "your plane"; the carrier destruction call below passes the
// enemy carrier's own hull/deck/island palette instead (see
// ai/enemyCarrier.js's ENEMY_PALETTE) so ITS wreckage reads as "the ship,"
// not a generic explosion.
const PLANE_SHARD_COLORS = [0x5a6a72, 0x4d5960, 0x16181a, 0xb6342f];
const CARRIER_SHARD_COLORS = [0x4a3230, 0x241a19, 0x5c3a37, 0x6b767c];
const SHARD_GEOMETRIES = [
  new THREE.BoxGeometry(1.1, 1.1, 1.1),
  new THREE.BoxGeometry(2.2, 0.5, 0.5),
  new THREE.TetrahedronGeometry(1),
];
const SHARD_GRAVITY = 90;

// Bright metallic chaff/glitter flecks ejected from the tail while
// countermeasures are active (see combat/weaponConstants.js).
const GLITTER_COLORS = [0xffd75e, 0xfff2c4, 0xe8e8e8, 0xffffff, 0xc9a63c];
const GLITTER_POINT_COUNT = 12;

// Cheap 3D "poof" on a kill: one THREE.Points burst (single draw call) plus
// a small expanding-then-fading sphere flash. No lighting needed, stays in
// the low-poly/cheap-shader spirit of the rest of the scene.
export function createParticleSystem(scene) {
  const bursts = []; // { points, positions, velocities, life, maxLife, material }
  const flashes = []; // { mesh, life, maxLife, growTo }
  const shards = []; // { mesh, velocity, angularVelocity, life, maxLife, material }

  function spawnFlash(position, life, growTo) {
    const flashGeo = new THREE.SphereGeometry(1, 8, 6);
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
    const flashMesh = new THREE.Mesh(flashGeo, flashMat);
    flashMesh.position.copy(position);
    scene.add(flashMesh);
    flashes.push({ mesh: flashMesh, life, maxLife: life, growTo });
  }

  function spawnPoof(position) {
    const positions = new Float32Array(POOF_POINT_COUNT * 3);
    const velocities = [];
    for (let i = 0; i < POOF_POINT_COUNT; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 15 + Math.random() * 35;
      velocities.push(
        new THREE.Vector3(Math.sin(phi) * Math.cos(theta), Math.sin(phi) * Math.sin(theta) + 0.3, Math.cos(phi)).multiplyScalar(speed)
      );
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const color = POOF_COLORS[Math.floor(Math.random() * POOF_COLORS.length)];
    const material = new THREE.PointsMaterial({ color, size: 1.6, transparent: true, opacity: 1 });
    const points = new THREE.Points(geometry, material);
    scene.add(points);
    bursts.push({ points, positions, velocities, pointCount: POOF_POINT_COUNT, life: 0.7, maxLife: 0.7, material });

    spawnFlash(position, 0.25, 6);
  }

  // A puff of bright chaff/glitter ejected backward-and-outward from the
  // tail. Reuses the same THREE.Points burst mechanic as spawnPoof (single
  // draw call, generic position/velocity/life update loop below) — just a
  // different color palette and a directional (not omnidirectional) spread.
  function spawnCountermeasurePuff(position, backwardDir) {
    const positions = new Float32Array(GLITTER_POINT_COUNT * 3);
    const velocities = [];
    for (let i = 0; i < GLITTER_POINT_COUNT; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;
      const spread = new THREE.Vector3((Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8);
      const dir = backwardDir.clone().add(spread).normalize();
      const speed = 6 + Math.random() * 16;
      velocities.push(dir.multiplyScalar(speed));
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const color = GLITTER_COLORS[Math.floor(Math.random() * GLITTER_COLORS.length)];
    const material = new THREE.PointsMaterial({
      color,
      size: 0.8,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(geometry, material);
    scene.add(points);
    bursts.push({ points, positions, velocities, pointCount: GLITTER_POINT_COUNT, life: 0.7, maxLife: 0.7, material });
  }

  // Something shattering into tumbling low-poly chunks — a bigger, punchier
  // moment than a routine enemy kill. `options` lets a much larger source
  // (the carrier) scale this up rather than needing a separate effect.
  function spawnPolyDestruction(position, options = {}) {
    const {
      count = 26,
      colors = PLANE_SHARD_COLORS,
      scaleMin = 0.6,
      scaleMax = 1.9,
      speedMin = 20,
      speedMax = 75,
      flashGrowTo = 10,
      flashLife = 0.35,
    } = options;

    for (let i = 0; i < count; i++) {
      const geometry = SHARD_GEOMETRIES[Math.floor(Math.random() * SHARD_GEOMETRIES.length)];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const material = new THREE.MeshStandardMaterial({ color, roughness: 0.7, transparent: true, opacity: 1 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(position);
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      mesh.scale.setScalar(scaleMin + Math.random() * (scaleMax - scaleMin));
      scene.add(mesh);

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(0.2 + Math.random() * 0.6); // biased outward/upward, not straight down
      const speed = speedMin + Math.random() * (speedMax - speedMin);
      const velocity = new THREE.Vector3(Math.sin(phi) * Math.cos(theta), Math.abs(Math.cos(phi)) + 0.4, Math.sin(phi) * Math.sin(theta)).multiplyScalar(
        speed
      );
      const angularVelocity = new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10
      );

      shards.push({ mesh, velocity, angularVelocity, life: 1.3 + Math.random() * 0.7, maxLife: 2, material });
    }

    spawnFlash(position, flashLife, flashGrowTo);
  }

  // The boss carrier breaking apart: three of the above bursts staggered
  // along its ~260-unit hull (bow/mid/stern) instead of one burst at a
  // single point, so a ship-scale wreck actually reads as ship-scale.
  function spawnCarrierDestruction(hullPositions) {
    for (const position of hullPositions) {
      spawnPolyDestruction(position, {
        count: 30,
        colors: CARRIER_SHARD_COLORS,
        scaleMin: 1.6,
        scaleMax: 4,
        speedMin: 25,
        speedMax: 85,
        flashGrowTo: 16,
        flashLife: 0.45,
      });
    }
  }

  function update(dt) {
    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i];
      b.life -= dt;
      if (b.life <= 0) {
        scene.remove(b.points);
        b.points.geometry.dispose();
        b.material.dispose();
        bursts.splice(i, 1);
        continue;
      }
      for (let p = 0; p < b.pointCount; p++) {
        b.positions[p * 3] += b.velocities[p].x * dt;
        b.positions[p * 3 + 1] += b.velocities[p].y * dt - 20 * dt * dt;
        b.positions[p * 3 + 2] += b.velocities[p].z * dt;
        b.velocities[p].y -= 40 * dt;
      }
      b.points.geometry.attributes.position.needsUpdate = true;
      b.material.opacity = b.life / b.maxLife;
    }

    for (let i = shards.length - 1; i >= 0; i--) {
      const s = shards[i];
      s.life -= dt;
      if (s.life <= 0) {
        scene.remove(s.mesh);
        s.material.dispose();
        shards.splice(i, 1);
        continue;
      }
      s.velocity.y -= SHARD_GRAVITY * dt;
      s.mesh.position.addScaledVector(s.velocity, dt);
      s.mesh.rotation.x += s.angularVelocity.x * dt;
      s.mesh.rotation.y += s.angularVelocity.y * dt;
      s.mesh.rotation.z += s.angularVelocity.z * dt;
      const fadeStart = s.maxLife * 0.4;
      s.material.opacity = s.life < fadeStart ? Math.max(0, s.life / fadeStart) : 1;
    }

    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i];
      f.life -= dt;
      if (f.life <= 0) {
        scene.remove(f.mesh);
        f.mesh.geometry.dispose();
        f.mesh.material.dispose();
        flashes.splice(i, 1);
        continue;
      }
      const t = 1 - f.life / f.maxLife;
      f.mesh.scale.setScalar(1 + t * f.growTo);
      f.mesh.material.opacity = 0.9 * (1 - t);
    }
  }

  return { spawnPoof, spawnPolyDestruction, spawnCarrierDestruction, spawnCountermeasurePuff, update };
}
