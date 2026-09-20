// All combat tuning numbers in one place, adapted from Game A's
// /home/mikeg/plane-game/src/{state,entities,enemies}.js constants — scaled
// from 2D-canvas pixel units to Game B's 3D world-unit scale (carrier hull
// length 260, player speed range 16-130/s).

// --- Player weapons -----------------------------------------------------
export const BULLET_SPEED_PLAYER = 480;
export const BULLET_DAMAGE_PLAYER = 1;
export const BULLET_RADIUS_PLAYER = 3;
export const BULLET_FIRE_RATE_PLAYER = 0.16; // seconds between shots while held
export const BULLET_LIFETIME = 2.5; // seconds, safety cap independent of cullOffscreen-equivalent

export const BOMB_SPEED = 380;
export const BOMB_DAMAGE = 17;
export const BOMB_RADIUS = 8;
export const BOMB_COOLDOWN = 0.35;
// Starting bomb/missile counts live in config/gameConfig.js (player-adjustable).

export const PLAYER_MISSILE_DAMAGE = 8;
// The carrier's armored hull shrugs off a lot of a missile's punch — full
// missile damage made a 4-missile loadout able to nearly one-shot it.
// Bullets/bombs stay the main way to grind a carrier down; missiles are a
// supplement against it specifically (still full damage vs fighters/SAM ships).
export const PLAYER_MISSILE_DAMAGE_VS_BOSS = 3;
export const PLAYER_MISSILE_COOLDOWN = 0.6;

export const MUZZLE_OFFSET = 5; // spawn the projectile this far in front of the nose

// --- Countermeasures ---------------------------------------------------
// Launching chaff forces every SAM missile fired while it's active to miss
// (see ai/samShip.js), with a trailing glitter-puff effect out the tail for
// the duration.
export const COUNTERMEASURES_DURATION = 3;
export const COUNTERMEASURES_COOLDOWN = 45;
export const COUNTERMEASURES_GLITTER_INTERVAL = 0.1; // seconds between puffs while active

// A continuous threat monitor, not a one-shot blip at launch time: as long
// as a real (non-decoy) enemy missile is inbound, the warning re-plays
// every INCOMING_WARNING_REPEAT_SECONDS — a single instant is too easy to
// miss amid other combat noise, especially since real locks are already
// less likely the closer (and more "threatening-feeling") a SAM ship is.
// 1.5 turned out too tight: the triple-beep itself takes ~450ms, so with
// multiple SAM ships around two carriers there was barely a second of
// silence between repeats — it read as constant beeping instead of a
// periodic alert. 4s gives a real gap while still repeating well within
// a missile's ~8s lifetime.
export const INCOMING_WARNING_REPEAT_SECONDS = 4;

// --- Missiles (shared by player + SAM ship) ------------------------------
export const MISSILE_LAUNCH_SPEED = 50;
export const MISSILE_MAX_SPEED = 200;
export const MISSILE_ACCEL = 140;
export const MISSILE_TURN_RATE = 1.8; // rad/s, kept below the player's best turn rate -> dodgeable
export const MISSILE_LIFETIME = 8;
export const MISSILE_HIT_RADIUS = 6;
// Halved from 2 (40% of the player's 5 HP per unmissed hit): with more SAM
// ships now escorting two carriers, that was adding up brutally fast.
export const MISSILE_DAMAGE_SAM = 1;

// --- Enemy plane bullets -------------------------------------------------
export const ENEMY_BULLET_SPEED = 220;
export const ENEMY_BULLET_DAMAGE = 1;
export const ENEMY_BULLET_RADIUS = 4;

// --- Carrier boss flak ----------------------------------------------------
// 50 (original) was unrealistically tanky with no HP feedback and a
// mis-targeting bug (both since fixed); 30 then turned out too easy once
// missiles could reliably land full 8-damage hits on it. Settling at 40,
// combined with the missile-vs-boss damage cut above, so bullets/bombs
// stay the main way to sink it and missiles are a supplement, not a
// near-one-shot — and there are now two of these to sink (see
// SECOND_BOSS_SPAWN_CENTER below).
export const CARRIER_MAX_HP = 40;
export const CARRIER_FIRE_RATE = 1.4;
export const CARRIER_TELEGRAPH = 0.35;
export const FLAK_COUNT = 22;
export const FLAK_DAMAGE = 0.5;
export const FLAK_RADIUS = 1.5;
export const FLAK_SPEED = 150;

// --- SAM ship ("drone boat") -----------------------------------------------
export const SAM_SHIP_HP = 4;
// 20% more frequent strikes: a shorter cooldown between launches (2.2 / 1.2).
export const SAM_SHIP_FIRE_RATE = 2.2 / 1.2;
export const SAM_SHIP_TELEGRAPH = 0.3;
// 50% chance a launch is a deliberate miss: it still fires and "homes," just
// toward a randomly offset decoy point near the player instead of the
// player's real (live-tracking) position — see ai/samShip.js.
export const SAM_MISS_CHANCE = 0.5;
export const SAM_MISS_OFFSET_MIN = 40;
export const SAM_MISS_OFFSET_MAX = 90;
// Accuracy degrades the closer the player gets: SAM_MISS_CHANCE applies at
// SAM_FAR_RANGE or beyond; it ramps up to SAM_MISS_CHANCE +
// SAM_CLOSE_RANGE_MISS_BONUS by the time the player is within SAM_CLOSE_RANGE
// — rewards aggressive close-in flying instead of a flat hit rate regardless
// of distance. See ai/samShip.js#computeMissChance.
export const SAM_CLOSE_RANGE = 100;
export const SAM_FAR_RANGE = 500;
export const SAM_CLOSE_RANGE_MISS_BONUS = 0.3;

// --- Enemy fighter plane ---------------------------------------------------
export const FIGHTER_HP = 2;
export const FIGHTER_SCORE = 100;
export const SAM_SHIP_SCORE = 200;
export const CARRIER_BOSS_SCORE = 5000;

// --- Player -----------------------------------------------------------------
export const PLAYER_MAX_HP = 5;
export const PLAYER_INVULN_TIME = 1.3;
export const RAM_DAMAGE = 1;
export const PLAYER_RADIUS = 6; // matches the plane's ~10-unit wingspan
export const BOSS_SPAWN_CENTER = { x: 1400, y: 0, z: -1600 }; // well inside ARENA_RADIUS (~3000)
export const SECOND_BOSS_SPAWN_CENTER = { x: -1500, y: 0, z: 1500 }; // opposite side of the arena
export const FIGHTER_SPAWN_MIN_RADIUS = 800;
export const FIGHTER_SPAWN_MAX_RADIUS = 2200;
export const SAM_SPAWN_MIN_RADIUS = 150;
export const SAM_SPAWN_MAX_RADIUS = 500;
export const SAM_SHIPS_PER_CARRIER_AT_START = 2; // pre-spawned immediately, not left to wave RNG

// How long the destruction/sink effects get to play out on-screen before
// the win/lose overlay actually appears and dims everything. WIN is longer
// so the boss's ~3.2s sink animation (ai/enemyCarrier.js) is visible almost
// to completion; DEATH is shorter since there's no sink to wait for.
export const WIN_DELAY_SECONDS = 3.6;
export const DEATH_DELAY_SECONDS = 1.4;

// --- Waves ------------------------------------------------------------------
// Raised from 6: two carriers plus their pre-spawned SAM ships alone can
// account for 2 + (2 * SAM_SHIPS_PER_CARRIER_AT_START) = 6 slots before a
// single fighter or wave-spawned SAM ship gets any room at all.
export const MAX_CONCURRENT_ENEMIES = 10;
export const LEVEL_DURATION = 150; // seconds, shapes wave-density curve only

// --- Resupply -------------------------------------------------------------
// Fly close to your home carrier and, once per interval, your bombs and
// missiles are topped back up to their configured starting counts.
export const RESUPPLY_INTERVAL_SECONDS = 60;
export const RESUPPLY_RADIUS = 90; // close enough to read as "flying over the deck"

// --- Targeting ----------------------------------------------------------
export const LOCK_MAX_RANGE = 1500;
export const LOCK_CONE_HALF_ANGLE_DEG = 20;
export const LOCK_ACQUIRE_TIME = 0.6;
// The boss carrier is huge and slow-moving, so it should be lockable from
// much further away / a wider cone than a small fighter — otherwise
// missiles can never realistically reach it before it's already close.
export const BOSS_LOCK_MAX_RANGE = 3200; // comfortably covers the whole arena (ARENA_RADIUS ~3000)
export const BOSS_LOCK_CONE_HALF_ANGLE_DEG = 35;
