import * as THREE from 'three';
import { createSurfaceTexture } from './proceduralTextures.js';

// Small surface-to-air missile ship: a low hull + a mast with a dish that
// flashes an emissive warning color while telegraphing a missile launch
// (see ai/samShip.js). Built from the same primitive-only style as
// carrier.js/planeModel.js.
const COLOR_HULL = '#4a5240';
const COLOR_DECK = '#2f342a';
const COLOR_DISH_IDLE = 0x6b7360;
const COLOR_DISH_WARN = 0xff3b3b;

export function createSamShipModel() {
  const root = new THREE.Group();

  const hullTexture = createSurfaceTexture({
    baseColor: COLOR_HULL,
    lineColor: 'rgba(0,0,0,0.3)',
    lineSpacing: 18,
    streaks: 8,
    noise: 14,
    repeatX: 3,
    repeatY: 2,
  });
  const deckTexture = createSurfaceTexture({
    baseColor: COLOR_DECK,
    lineColor: 'rgba(0,0,0,0.35)',
    lineSpacing: 14,
    lineAxis: 'horizontal',
    noise: 10,
    repeatX: 1,
    repeatY: 6,
  });

  const hull = new THREE.Mesh(
    new THREE.BoxGeometry(6, 3, 20),
    new THREE.MeshStandardMaterial({ map: hullTexture, metalness: 0.3, roughness: 0.7 })
  );
  hull.position.y = 1.5;
  root.add(hull);

  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(5.4, 0.6, 18),
    new THREE.MeshStandardMaterial({ map: deckTexture, metalness: 0.15, roughness: 0.9 })
  );
  deck.position.y = 3.3;
  root.add(deck);

  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.4, 6, 8),
    new THREE.MeshStandardMaterial({ color: COLOR_DECK, metalness: 0.4, roughness: 0.6 })
  );
  mast.position.set(0, 6.6, -3);
  root.add(mast);

  const dishMat = new THREE.MeshStandardMaterial({
    color: COLOR_DISH_IDLE,
    emissive: 0x000000,
    metalness: 0.5,
    roughness: 0.4,
  });
  const dish = new THREE.Mesh(new THREE.SphereGeometry(1.3, 10, 8, 0, Math.PI), dishMat);
  dish.rotation.x = Math.PI / 2;
  dish.position.set(0, 9.6, -3);
  root.add(dish);

  root.userData.parts = { dishMaterial: dishMat };
  root.userData.setTelegraph = (active) => {
    dishMat.color.set(active ? COLOR_DISH_WARN : COLOR_DISH_IDLE);
    dishMat.emissive.set(active ? 0x881111 : 0x000000);
  };

  return root;
}
