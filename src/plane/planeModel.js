import * as THREE from 'three';
import { createSurfaceTexture } from '../scene/proceduralTextures.js';

// Local -Z is forward (matches Three.js camera convention), +Y is up,
// +X is right. The flight controller and camera only ever read/write the
// returned root's position/quaternion, so this factory is the only place
// that needs to change to swap in a real GLTF model later.
const DEFAULT_PALETTE = {
  fuselage: '#5a6a72', // haze-grey aircraft aluminum, not a toy-bright color
  wing: '#4d5960',
  prop: '#16181a',
  accent: '#b6342f', // small identification stripe, not the whole airframe
  canopy: '#101a20',
};

// options.palette lets a recolored variant (the hostile enemy fighter, see
// scene/enemyPlaneModel.js) reuse this exact construction.
export function createPlaneModel(options = {}) {
  const palette = { ...DEFAULT_PALETTE, ...options.palette };
  const root = new THREE.Group();

  const metalTexture = createSurfaceTexture({
    baseColor: palette.fuselage,
    lineColor: 'rgba(0,0,0,0.35)',
    lineSpacing: 32,
    lineWidth: 1,
    streaks: 6,
    noise: 14,
    repeatX: 2,
    repeatY: 1,
  });
  const wingTexture = createSurfaceTexture({
    baseColor: palette.wing,
    lineColor: 'rgba(0,0,0,0.3)',
    lineSpacing: 40,
    lineAxis: 'vertical',
    streaks: 4,
    noise: 12,
    repeatX: 3,
    repeatY: 1,
  });

  const fuselageMat = new THREE.MeshStandardMaterial({ map: metalTexture, metalness: 0.35, roughness: 0.5 });
  const wingMat = new THREE.MeshStandardMaterial({ map: wingTexture, metalness: 0.3, roughness: 0.55 });
  const accentMat = new THREE.MeshStandardMaterial({ color: palette.accent, metalness: 0.2, roughness: 0.5 });
  const propMat = new THREE.MeshStandardMaterial({ color: palette.prop, metalness: 0.7, roughness: 0.3 });
  const canopyMat = new THREE.MeshPhysicalMaterial({
    color: palette.canopy,
    metalness: 0.1,
    roughness: 0.15,
    clearcoat: 0.8,
    clearcoatRoughness: 0.2,
  });

  // Fuselage body, axis along local Z.
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 6, 16), fuselageMat);
  body.rotation.x = Math.PI / 2;
  body.position.z = 0.2;
  root.add(body);

  // Tapered nose cap pointing forward (-Z).
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.6, 16), fuselageMat);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -3.6;
  root.add(nose);

  // Canopy: a small glossy dome just aft of the nose — a cheap detail that
  // reads strongly as "real aircraft" rather than a solid toy shape.
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), canopyMat);
  canopy.position.set(0, 0.42, -0.9);
  root.add(canopy);

  // Identification stripe on the fin (added below) and a small fuselage band.
  const stripeBand = new THREE.Mesh(new THREE.CylinderGeometry(0.57, 0.57, 0.35, 16), accentMat);
  stripeBand.rotation.x = Math.PI / 2;
  stripeBand.position.z = 1.6;
  root.add(stripeBand);

  // Main wings through the fuselage midpoint.
  const wings = new THREE.Mesh(new THREE.BoxGeometry(10, 0.18, 1.5), wingMat);
  wings.position.set(0, -0.1, 0.3);
  root.add(wings);

  // Horizontal stabilizer + vertical fin at the tail.
  const stabilizer = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.14, 0.9), wingMat);
  stabilizer.position.set(0, 0.1, 3.1);
  root.add(stabilizer);

  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.3, 1.1), wingMat);
  fin.position.set(0, 0.75, 3.1);
  root.add(fin);

  const finStripe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.4, 1.12), accentMat);
  finStripe.position.set(0, 1.25, 3.1);
  root.add(finStripe);

  // Propeller: cosmetic only, spun by main.js based on throttle.
  const propeller = new THREE.Group();
  const blade1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.6, 0.08), propMat);
  const blade2 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.08), propMat);
  const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.4, 10), propMat);
  spinner.rotation.x = -Math.PI / 2;
  spinner.position.z = -0.15;
  propeller.add(blade1, blade2, spinner);
  propeller.position.z = -4.35;
  root.add(propeller);

  root.userData.parts = { propeller };

  return root;
}
