import { createPlayerCombatState } from './entities.js';
import { buildWaveTimeline } from './waves.js';
import { LEVEL_DURATION, RESUPPLY_INTERVAL_SECONDS } from './weaponConstants.js';

// The Game.state/resetState() analog: mutable per-run session state, kept
// separate from the persistent scene/camera/flightController objects so a
// restart only needs to rebuild this + the enemy visuals, not the whole app.
export function createRunState(playerFlightState, playerRadius) {
  return {
    phase: 'playing', // 'playing' | 'win' | 'lose'
    launched: false, // parked on the carrier deck until the fire button catapults us off
    time: 0,
    missionComplete: false,
    // While an outcome is pending, `phase` deliberately stays 'playing' so
    // the destruction/sink effects get to play out unobstructed before the
    // win/lose overlay dims the screen — see main.js's animate loop.
    pendingOutcome: null, // null | 'win' | 'lose'
    pendingOutcomeReason: '',
    outcomeDelay: 0,
    // The player died, but still had projectiles in flight — keep those
    // (and only those) resolving so a killing blow already on its way still
    // counts, before actually committing to a loss. See main.js's
    // updateAwaitingProjectiles().
    awaitingProjectiles: false,
    deathReason: '',

    player: {
      flightState: playerFlightState,
      radius: playerRadius,
      combat: createPlayerCombatState(),
    },

    enemies: [],
    // Removed from `enemies` (no longer fights/collides) but still
    // animating/visible — currently just the boss carrier sinking after
    // destruction (see ai/enemyCarrier.js#sink, combat/health.js#destroyBoss).
    sinkingObjects: [],
    playerProjectiles: [],
    enemyProjectiles: [],

    waveTimeline: buildWaveTimeline(LEVEL_DURATION),
    waveCursor: 0,

    // Counts down to 0; flying near the home carrier while it's <= 0 tops
    // bombs/missiles back up and resets it — see main.js's resupply check.
    resupplyCooldown: RESUPPLY_INTERVAL_SECONDS,
  };
}

export function resetRunState(runState, playerFlightState, scene) {
  for (const enemy of runState.enemies) enemy.dispose?.();
  for (const obj of runState.sinkingObjects) obj.dispose?.();
  for (const p of runState.playerProjectiles) scene.remove(p.mesh);
  for (const p of runState.enemyProjectiles) scene.remove(p.mesh);

  runState.phase = 'playing';
  runState.launched = false;
  runState.time = 0;
  runState.missionComplete = false;
  runState.pendingOutcome = null;
  runState.pendingOutcomeReason = '';
  runState.outcomeDelay = 0;
  runState.awaitingProjectiles = false;
  runState.deathReason = '';
  runState.player.flightState = playerFlightState;
  runState.player.combat = createPlayerCombatState();
  runState.enemies = [];
  runState.sinkingObjects = [];
  runState.playerProjectiles = [];
  runState.enemyProjectiles = [];
  runState.waveTimeline = buildWaveTimeline(LEVEL_DURATION);
  runState.waveCursor = 0;
  runState.resupplyCooldown = RESUPPLY_INTERVAL_SECONDS;
}
