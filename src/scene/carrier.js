import * as THREE from 'three';
import { SEA_LEVEL_Y } from './ocean.js';
import { createSurfaceTexture } from './proceduralTextures.js';

// The carrier's bow points along local -Z (matching the plane's forward
// convention), stern along +Z, so a plane spawned with an identity yaw
// already faces the correct takeoff direction.
const HULL_LENGTH = 260;
const HULL_WIDTH = 34;
const HULL_HEIGHT = 18;
const DECK_WIDTH = 40;
const DECK_THICKNESS = 2;
const WATERLINE_OFFSET = 4; // hull sits partly submerged

// Naval "haze grey" scheme — desaturated blue-greys rather than flat toy
// colors — with a dark non-skid deck (real carrier decks are near-black
// with painted markings, not a bright flat panel).
const DEFAULT_PALETTE = {
  hull: '#6b767c',
  deck: '#2c2f31',
  island: '#758186',
  stripe: 0xf2c744,
};

// options.palette lets a second carrier instance (the enemy boss, see
// ai/enemyCarrier.js) reuse this exact hull/deck/island construction
// recolored, without touching the player's home-carrier construction.
export function createCarrier(options = {}) {
  const palette = { ...DEFAULT_PALETTE, ...options.palette };

  const hullTexture = createSurfaceTexture({
    baseColor: palette.hull,
    lineColor: 'rgba(0,0,0,0.25)',
    lineSpacing: 24,
    streaks: 40,
    noise: 12,
    repeatX: 14,
    repeatY: 3,
  });
  const deckTexture = createSurfaceTexture({
    baseColor: palette.deck,
    lineColor: 'rgba(0,0,0,0.4)',
    lineSpacing: 20,
    lineAxis: 'horizontal',
    streaks: 10,
    noise: 10,
    repeatX: 3,
    repeatY: 22,
  });
  const islandTexture = createSurfaceTexture({
    baseColor: palette.island,
    lineColor: 'rgba(0,0,0,0.25)',
    lineSpacing: 20,
    streaks: 10,
    noise: 12,
    repeatX: 2,
    repeatY: 2,
  });

  const hullMat = new THREE.MeshStandardMaterial({ map: hullTexture, metalness: 0.25, roughness: 0.75 });
  const deckMat = new THREE.MeshStandardMaterial({ map: deckTexture, metalness: 0.1, roughness: 0.95 });
  const islandMat = new THREE.MeshStandardMaterial({ map: islandTexture, metalness: 0.25, roughness: 0.7 });

  const group = new THREE.Group();

  const hullCenterY = SEA_LEVEL_Y + HULL_HEIGHT / 2 - WATERLINE_OFFSET;
  const hullTopY = hullCenterY + HULL_HEIGHT / 2;
  const deckCenterY = hullTopY + DECK_THICKNESS / 2;
  const deckTopY = deckCenterY + DECK_THICKNESS / 2;

  const hull = new THREE.Mesh(new THREE.BoxGeometry(HULL_WIDTH, HULL_HEIGHT, HULL_LENGTH), hullMat);
  hull.position.set(0, hullCenterY, 0);
  group.add(hull);

  // Tapered bow: a couple of angled boxes narrowing toward -Z.
  const bowWedge = new THREE.Mesh(new THREE.BoxGeometry(HULL_WIDTH * 0.7, HULL_HEIGHT * 0.9, 36), hullMat);
  bowWedge.position.set(0, hullCenterY, -HULL_LENGTH / 2 - 10);
  bowWedge.rotation.x = 0; // simple block taper, kept cheap
  group.add(bowWedge);

  const deck = new THREE.Mesh(new THREE.BoxGeometry(DECK_WIDTH, DECK_THICKNESS, HULL_LENGTH + 20), deckMat);
  deck.position.set(0, deckCenterY, 0);
  group.add(deck);

  // Centerline stripe for takeoff-run readability.
  const stripe = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, HULL_LENGTH),
    new THREE.MeshBasicMaterial({ color: palette.stripe })
  );
  stripe.rotation.x = -Math.PI / 2;
  stripe.position.set(0, deckTopY + 0.05, 0);
  group.add(stripe);

  // Island / tower superstructure, offset to starboard (+X, right side when
  // facing the bow along -Z), roughly a third of the way back from the bow.
  const islandGroup = new THREE.Group();
  const islandBase = new THREE.Mesh(new THREE.BoxGeometry(8, 20, 30), islandMat);
  islandBase.position.set(0, 10, 0);
  islandGroup.add(islandBase);

  const islandTop = new THREE.Mesh(new THREE.BoxGeometry(5, 8, 10), islandMat);
  islandTop.position.set(0, 24, -6);
  islandGroup.add(islandTop);

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 14, 6), islandMat);
  mast.position.set(0, 35, -6);
  islandGroup.add(mast);

  islandGroup.position.set(DECK_WIDTH / 2 - 4, deckTopY, -HULL_LENGTH / 6);
  group.add(islandGroup);

  group.userData.deckHeight = deckTopY;
  group.userData.spawnLocalPosition = new THREE.Vector3(0, deckTopY + 1, HULL_LENGTH * 0.32);
  group.userData.spawnLocalForward = new THREE.Vector3(0, 0, -1); // faces the bow

  return group;
}

// Returns a world-space { position, quaternion } near the carrier's stern,
// facing the bow (takeoff direction). Used to place/reset the plane.
export function getSpawnTransform(carrierGroup) {
  carrierGroup.updateMatrixWorld(true);
  const position = carrierGroup.userData.spawnLocalPosition.clone();
  carrierGroup.localToWorld(position);

  const forward = carrierGroup.userData.spawnLocalForward.clone();
  forward.transformDirection(carrierGroup.matrixWorld);

  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, -1),
    forward.normalize()
  );

  return { position, quaternion };
}
