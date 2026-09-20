import * as THREE from 'three';

const MAX_DELTA = 0.05; // clamp so tab-switches/stutters don't produce huge physics jumps

export class GameClock {
  constructor() {
    this._clock = new THREE.Clock();
  }

  getDelta() {
    return Math.min(this._clock.getDelta(), MAX_DELTA);
  }
}
