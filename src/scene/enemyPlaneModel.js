import { createPlaneModel } from '../plane/planeModel.js';

// Same silhouette as the player's plane (createPlaneModel), recolored dark
// gunmetal-with-warning-red so it reads as hostile at a glance without a
// second geometry to maintain.
const ENEMY_PALETTE = {
  fuselage: '#34383c',
  wing: '#26292c',
  prop: '#141414',
  accent: '#c23b2f',
  canopy: '#0c1114',
};

export function createEnemyPlaneModel() {
  return createPlaneModel({ palette: ENEMY_PALETTE });
}
