import * as THREE from 'three';
import { DEFAULT_FLIGHT_CONSTANTS } from '../plane/flightPhysics.js';

// AI fighters are deliberately less agile than the player (fairness, and it
// keeps the steering P-controller in ai/steering.js well-behaved).
export const AI_FIGHTER_FLIGHT_CONSTANTS = {
  ...DEFAULT_FLIGHT_CONSTANTS,
  MAX_ROLL_RATE: 1.6, // player: 2.4
  MAX_YAW_RATE: 0.45, // player: 0.6
  MAX_PITCH_RATE: 0.75, // player: 1.0
  MAX_SPEED: 95, // player: 130
  MIN_SPEED: 30,
  THROTTLE_ACCEL: 18,
};

// Patrol/Chase/Evade FSM thresholds.
export const AGGRO_RADIUS = 1200;
export const EVADE_HP_THRESHOLD = 1;
export const EVADE_DURATION = 2.5; // seconds
export const TAIL_ON_SELF_RADIUS = 200; // "player is on my tail" proximity
export const TAIL_ON_SELF_CONE = Math.PI / 3; // ~60 degrees, generous "roughly behind me"

export const PATROL_ALT_MIN = 150;
export const PATROL_ALT_MAX = 400;
export const PATROL_THROTTLE = 0.35; // cruise

export const CHASE_TAIL_OFFSET = 60; // desired distance behind the player's nose
export const CHASE_THROTTLE = 1.0;
export const FIRE_CONE_HALF_ANGLE = THREE.MathUtils.degToRad(12);
export const FIRE_RANGE = 700;
export const FIGHTER_FIRE_RATE = 0.6;

export const EVADE_THROTTLE = 1.0;

// Steering P-controller gains (heading-error -> input.roll/yaw/pitch).
export const STEER_ROLL_GAIN = 1.6;
export const STEER_YAW_GAIN = 0.5;
export const STEER_PITCH_GAIN = 1.4;
