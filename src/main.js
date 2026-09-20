import * as THREE from 'three';
import { GameClock } from './core/Clock.js';
import { createRenderer, createCamera, createScene, createSky, createLighting, setupResize } from './scene/sceneSetup.js';
import { createOcean, SEA_LEVEL_Y } from './scene/ocean.js';
import { createCarrier, getSpawnTransform } from './scene/carrier.js';
import { applyArenaBounds } from './scene/arenaBounds.js';
import { createPlaneModel } from './plane/planeModel.js';
import { createFlightController, MAX_SPEED } from './plane/flightController.js';
import { getForwardVector } from './plane/flightPhysics.js';
import { createInputManager } from './input/inputManager.js';
import { createChaseCamera } from './camera/chaseCamera.js';
import { createCameraShake } from './camera/cameraShake.js';
import { createHud } from './ui/hud.js';
import { createCombatHud } from './ui/combatHud.js';
import { createReticle } from './ui/reticle.js';
import { createMissionOverlay } from './ui/missionOverlay.js';
import { createDebugOverlay } from './ui/debugOverlay.js';
import { createSettingsScreen } from './ui/settingsScreen.js';
import { createMiniMap } from './ui/miniMap.js';
import { createResupplyToast } from './ui/resupplyToast.js';
import { createSfx } from './audio/sfx.js';

import { createEnemyPlane, randomFighterSpawnTransform } from './ai/enemyPlane.js';
import { createSamShip, randomSamShipPosition } from './ai/samShip.js';
import { createEnemyCarrierBoss } from './ai/enemyCarrier.js';

import { createRunState, resetRunState } from './combat/runState.js';
import { spawnFromWaves } from './combat/waves.js';
import { updateProjectiles } from './combat/projectiles.js';
import { resolveCollisions } from './combat/health.js';
import { createParticleSystem } from './combat/particles.js';
import { fireBullet, fireBomb, firePlayerMissile } from './combat/weapons.js';
import { pickLockOnTarget, projectToScreen } from './combat/targeting.js';
import { getConfig } from './config/gameConfig.js';
import {
  BULLET_FIRE_RATE_PLAYER,
  BOMB_COOLDOWN,
  PLAYER_MISSILE_COOLDOWN,
  PLAYER_RADIUS,
  BOSS_SPAWN_CENTER,
  SECOND_BOSS_SPAWN_CENTER,
  SAM_SHIPS_PER_CARRIER_AT_START,
  FIGHTER_SPAWN_MIN_RADIUS,
  FIGHTER_SPAWN_MAX_RADIUS,
  SAM_SPAWN_MIN_RADIUS,
  SAM_SPAWN_MAX_RADIUS,
  LOCK_ACQUIRE_TIME,
  WIN_DELAY_SECONDS,
  DEATH_DELAY_SECONDS,
  RESUPPLY_INTERVAL_SECONDS,
  RESUPPLY_RADIUS,
  COUNTERMEASURES_DURATION,
  COUNTERMEASURES_COOLDOWN,
  COUNTERMEASURES_GLITTER_INTERVAL,
  INCOMING_WARNING_REPEAT_SECONDS,
} from './combat/weaponConstants.js';

const canvas = document.getElementById('app');
const launchPrompt = document.getElementById('launch-prompt');

const renderer = createRenderer(canvas);
const camera = createCamera();
const scene = createScene();
createSky(scene);
createLighting(scene);
setupResize(camera, renderer);

const ocean = createOcean();
scene.add(ocean.mesh);

const carrier = createCarrier();
scene.add(carrier);

const spawnTransform = getSpawnTransform(carrier);

const planeModel = createPlaneModel();
scene.add(planeModel);

const flight = createFlightController(spawnTransform);
const chaseCamera = createChaseCamera();
const cameraShake = createCameraShake();
const inputManager = createInputManager();
const hud = createHud();
const combatHud = createCombatHud();
const reticle = createReticle();
const missionOverlay = createMissionOverlay();
const debugOverlay = createDebugOverlay();
const miniMap = createMiniMap();
const resupplyToast = createResupplyToast();
const sfx = createSfx();
const particles = createParticleSystem(scene);
const clock = new GameClock();

const bossSpawnCenters = [
  new THREE.Vector3(BOSS_SPAWN_CENTER.x, BOSS_SPAWN_CENTER.y, BOSS_SPAWN_CENTER.z),
  new THREE.Vector3(SECOND_BOSS_SPAWN_CENTER.x, SECOND_BOSS_SPAWN_CENTER.y, SECOND_BOSS_SPAWN_CENTER.z),
];
const arenaCenter = new THREE.Vector3(0, 0, 0);

const runState = createRunState(flight.state, PLAYER_RADIUS);
const effects = {
  cameraShake,
  sfx,
  scene,
  spawnPoof: particles.spawnPoof,
  spawnCarrierDestruction: particles.spawnCarrierDestruction,
};

// Ammo-count changes from the settings screen top up the CURRENT run
// immediately (not just future restarts) — feels more responsive than
// making the player restart to see a config change take effect.
const settingsScreen = createSettingsScreen({
  onApply(cfg) {
    runState.player.combat.bombCount = Math.max(runState.player.combat.bombCount, cfg.startingBombs);
    runState.player.combat.missileAmmo = Math.max(runState.player.combat.missileAmmo, cfg.startingMissiles);
  },
});

function spawnFighter() {
  const transform = randomFighterSpawnTransform(arenaCenter, FIGHTER_SPAWN_MIN_RADIUS, FIGHTER_SPAWN_MAX_RADIUS);
  return createEnemyPlane(transform, scene);
}

function spawnSam() {
  // Wave-spawned SAM ships patrol near whichever carrier, picked at random.
  const center = bossSpawnCenters[Math.floor(Math.random() * bossSpawnCenters.length)];
  const position = randomSamShipPosition(center, SAM_SPAWN_MIN_RADIUS, SAM_SPAWN_MAX_RADIUS);
  return createSamShip(position, scene);
}

function startRun() {
  resetRunState(runState, flight.state, scene);
  for (const center of bossSpawnCenters) {
    runState.enemies.push(createEnemyCarrierBoss(center, scene));
    // A couple of SAM ships guarding each carrier from the start, rather
    // than leaving SAM presence entirely up to wave-timeline RNG.
    for (let i = 0; i < SAM_SHIPS_PER_CARRIER_AT_START; i++) {
      const position = randomSamShipPosition(center, SAM_SPAWN_MIN_RADIUS, SAM_SPAWN_MAX_RADIUS);
      runState.enemies.push(createSamShip(position, scene));
    }
  }
  missionOverlay.hide();
}

function doRestart() {
  flight.resetTo(spawnTransform);
  startRun();
}

startRun();

// The mouse-click restart button still works, but the whole point of a
// controller/keyboard-driven game is not needing the mouse to get back in —
// the fire button also restarts once the mission has ended (mirrors Game
// A's original win/lose -> fire-to-continue behavior).
missionOverlay.onRestart(doRestart);

const PROP_SPIN_RATE = 0.35; // radians per unit of speed, per second
let trackedTarget = null;
let trackTime = 0;
let wasCrashed = false;
let wasLocked = false;

// Fly near the home carrier once the cooldown has elapsed to top bombs and
// missiles back up to their configured starting counts.
function updateResupply(dt, state) {
  if (runState.resupplyCooldown > 0) {
    runState.resupplyCooldown -= dt;
    return;
  }
  if (state.position.distanceTo(carrier.position) > RESUPPLY_RADIUS) return;

  const cfg = getConfig();
  const combat = runState.player.combat;
  combat.bombCount = cfg.startingBombs;
  combat.missileAmmo = cfg.startingMissiles;
  runState.resupplyCooldown = RESUPPLY_INTERVAL_SECONDS;
  sfx.play('resupply');
  resupplyToast.show();
}

// Chaff: forces every SAM missile launched while active to miss (see
// ai/samShip.js), with a trailing glitter-puff effect out the tail.
function updateCountermeasures(dt, input, state) {
  const combat = runState.player.combat;

  if (combat.countermeasuresCooldown > 0) combat.countermeasuresCooldown -= dt;

  if (combat.countermeasuresActive) {
    combat.countermeasuresTimer -= dt;
    combat.countermeasuresGlitterTimer -= dt;
    if (combat.countermeasuresGlitterTimer <= 0) {
      const backward = getForwardVector(state.quaternion).multiplyScalar(-1);
      const tailPos = state.position.clone().addScaledVector(backward, 4);
      particles.spawnCountermeasurePuff(tailPos, backward);
      combat.countermeasuresGlitterTimer = COUNTERMEASURES_GLITTER_INTERVAL;
    }
    if (combat.countermeasuresTimer <= 0) combat.countermeasuresActive = false;
  }

  if (input.countermeasuresPressed && !combat.countermeasuresActive && combat.countermeasuresCooldown <= 0) {
    combat.countermeasuresActive = true;
    combat.countermeasuresTimer = COUNTERMEASURES_DURATION;
    combat.countermeasuresCooldown = COUNTERMEASURES_COOLDOWN;
    combat.countermeasuresGlitterTimer = 0; // puff immediately this frame too
    sfx.play('countermeasures');
  }
}

// A continuous threat monitor: re-plays a warning beep every
// INCOMING_WARNING_REPEAT_SECONDS for as long as at least one REAL
// (non-decoy) enemy missile is currently tracking the player — identified
// purely by reference, since a genuine lock's targetRef.position IS the
// player's own live position Vector3 (a decoy gets a cloned snapshot
// instead, see ai/samShip.js#pickMissileTarget). A repeating check instead
// of a one-shot blip at launch gives far better odds of actually being
// heard amid combat noise, and naturally covers the whole flight, not just
// the instant of firing.
function updateIncomingMissileWarning(dt, state) {
  const combat = runState.player.combat;
  if (combat.incomingWarningCooldown > 0) combat.incomingWarningCooldown -= dt;

  const threatened = runState.enemyProjectiles.some(
    (p) => p.kind === 'missile' && p.owner === 'enemy' && p.targetRef && p.targetRef.position === state.position
  );

  if (threatened && combat.incomingWarningCooldown <= 0) {
    sfx.play('incomingLock');
    combat.incomingWarningCooldown = INCOMING_WARNING_REPEAT_SECONDS;
  }
}

function updateCombat(dt, input, state) {
  const player = runState.player;
  const combat = player.combat;

  updateResupply(dt, state);
  updateCountermeasures(dt, input, state);

  if (combat.invulnTimer > 0) combat.invulnTimer -= dt;
  combat.fireCooldown -= dt;
  combat.bombCooldown -= dt;
  combat.missileCooldown -= dt;

  if (input.fire && combat.fireCooldown <= 0) {
    runState.playerProjectiles.push(fireBullet(state, scene));
    combat.fireCooldown = BULLET_FIRE_RATE_PLAYER;
    sfx.play('fire');
  }
  if (input.bombPressed && combat.bombCount > 0 && combat.bombCooldown <= 0) {
    runState.playerProjectiles.push(fireBomb(state, scene));
    combat.bombCount--;
    combat.bombCooldown = BOMB_COOLDOWN;
    sfx.play('bomb');
  }

  // Targeting: nearest enemy in the forward cone, requires sustained
  // containment before it flips from tracking to locked.
  const candidate = pickLockOnTarget(state, runState.enemies);
  if (candidate && candidate === trackedTarget) {
    trackTime += dt;
  } else {
    trackedTarget = candidate;
    trackTime = 0;
  }
  const locked = !!trackedTarget && trackTime >= LOCK_ACQUIRE_TIME;
  if (locked && !wasLocked) sfx.play('lockAcquired');
  wasLocked = locked;

  if (input.missilePressed && locked && combat.missileAmmo > 0 && combat.missileCooldown <= 0) {
    runState.playerProjectiles.push(firePlayerMissile(state, trackedTarget, scene));
    combat.missileAmmo--;
    combat.missileCooldown = PLAYER_MISSILE_COOLDOWN;
    sfx.play('missileLaunch');
  }

  if (trackedTarget) {
    const projection = projectToScreen(trackedTarget.position, camera, window.innerWidth, window.innerHeight);
    reticle.update({ ...projection, locked });
  } else {
    reticle.update({ visible: false });
  }

  // AI tick. Backward index loop since a self-inflicted death (e.g. an AI
  // plane crashing into the sea) removes the enemy from the array mid-loop.
  // `combat` is passed through so SAM ships can check countermeasures.
  for (let i = runState.enemies.length - 1; i >= 0; i--) {
    const enemy = runState.enemies[i];
    const result = enemy.update(dt, state, combat);

    if (!enemy.alive) {
      enemy.dispose();
      runState.enemies.splice(i, 1);
      continue;
    }

    if (Array.isArray(result)) {
      runState.enemyProjectiles.push(...result);
    } else if (result) {
      runState.enemyProjectiles.push(result);
    }
    applyArenaBounds(enemy.position, dt);
  }

  updateIncomingMissileWarning(dt, state);

  spawnFromWaves(runState, dt, { spawnFighter, spawnSam });

  updateProjectiles(runState.playerProjectiles, dt, scene);
  updateProjectiles(runState.enemyProjectiles, dt, scene);

  resolveCollisions(runState, effects);

  // Mission already complete takes priority over dying in the same instant
  // (e.g. a ramming hit that both finishes the boss and costs your last HP)
  // — that's an unambiguous win, no need to wait on anything.
  if (runState.missionComplete && !runState.pendingOutcome && !runState.awaitingProjectiles) {
    // destroyBoss() (combat/health.js) already spawned the carrier's own
    // destruction effect and started its sink animation.
    runState.pendingOutcome = 'win';
    runState.outcomeDelay = WIN_DELAY_SECONDS;
  } else if (combat.hp <= 0 && !runState.pendingOutcome && !runState.awaitingProjectiles) {
    particles.spawnPolyDestruction(state.position); // your own plane, shot down
    cameraShake.trigger(20);
    sfx.play('lose');
    runState.deathReason = 'Shot Down';
    runState.awaitingProjectiles = true;
  }
}

// You died, but a bomb/missile/bullet you already fired might still land the
// killing blow on a carrier — keep resolving (only) projectiles and
// collisions until either the mission completes (win, after all) or every
// one of your projectiles has hit something or expired (now it's a loss).
function updateAwaitingProjectiles(dt) {
  updateProjectiles(runState.playerProjectiles, dt, scene);
  updateProjectiles(runState.enemyProjectiles, dt, scene);
  resolveCollisions(runState, effects);

  if (runState.missionComplete) {
    runState.awaitingProjectiles = false;
    runState.pendingOutcome = 'win';
    runState.outcomeDelay = WIN_DELAY_SECONDS;
  } else if (runState.playerProjectiles.length === 0) {
    runState.awaitingProjectiles = false;
    runState.pendingOutcome = 'lose';
    runState.pendingOutcomeReason = runState.deathReason;
    runState.outcomeDelay = DEATH_DELAY_SECONDS;
  }
}

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();

  const input = inputManager.poll();

  let state = flight.state;
  if ((runState.phase === 'win' || runState.phase === 'lose') && input.firePressed) {
    // Restart from the controller/keyboard, no mouse click required. `else
    // if` below is deliberate: skip the launch check this same frame so a
    // held fire button doesn't also instantly re-launch past the "press fire
    // to launch" moment on the freshly-reset deck.
    doRestart();
  } else if (runState.launched && runState.pendingOutcome !== 'lose' && !runState.awaitingProjectiles) {
    // Freeze in place once a death sequence has started (not just for a
    // water crash, which already freezes itself — being shot down doesn't
    // otherwise stop the plane) so the camera doesn't drift away from the
    // destruction effect while it plays out. A win, by contrast, leaves you
    // alive and flying, so it's excluded from this freeze.
    state = flight.update(dt, input);
    applyArenaBounds(state.position, dt);
  } else if (input.firePressed) {
    // Carrier catapult launch: the fire button, pre-launch, punches the
    // plane straight to full speed instead of the usual gradual throttle
    // ramp — normal flight physics (and normal fire-button behavior) takes
    // over from the very next frame.
    runState.launched = true;
    flight.state.speed = MAX_SPEED;
  }
  launchPrompt.hidden = runState.launched;

  // Water crash: a real death now, not a silent teleport-back. Detected as
  // a rising edge on the frozen-in-place flag flightController.js sets, so
  // it fires exactly once per crash regardless of how long the plane sits
  // there before the player restarts. Like the shot-down case in
  // updateCombat(), this doesn't immediately end the game — see
  // updateAwaitingProjectiles() — so a bomb/missile already in flight still
  // gets its shot at finishing the mission before the loss is final.
  if (
    state.crashedIntoSea &&
    !wasCrashed &&
    runState.phase === 'playing' &&
    !runState.pendingOutcome &&
    !runState.awaitingProjectiles
  ) {
    particles.spawnPolyDestruction(state.position);
    cameraShake.trigger(30);
    sfx.play('lose');
    runState.deathReason = 'Crashed Into The Ocean';
    runState.awaitingProjectiles = true;
  }
  wasCrashed = state.crashedIntoSea;

  const playerDestroyed = state.crashedIntoSea || runState.awaitingProjectiles || runState.pendingOutcome === 'lose';
  planeModel.visible = !playerDestroyed;
  planeModel.position.copy(state.position);
  planeModel.quaternion.copy(state.quaternion);
  planeModel.userData.parts.propeller.rotation.z += state.speed * PROP_SPIN_RATE * dt;

  if (runState.phase === 'playing' && runState.pendingOutcome) {
    // Destruction effects are playing out — no more shooting/AI/collisions,
    // just count down to actually showing the overlay.
    runState.outcomeDelay -= dt;
    reticle.update({ visible: false });
    if (runState.outcomeDelay <= 0) {
      runState.phase = runState.pendingOutcome;
      if (runState.pendingOutcome === 'win') {
        sfx.play('win');
        missionOverlay.showWin(runState.player.combat.score);
      } else {
        missionOverlay.showLose(runState.pendingOutcomeReason);
      }
    }
  } else if (runState.phase === 'playing' && runState.awaitingProjectiles) {
    // You've died, but let any bombs/missiles/bullets already in flight
    // finish their course — one of them might still complete the mission.
    updateAwaitingProjectiles(dt);
    reticle.update({ visible: false });
  } else if (runState.launched && runState.phase === 'playing') {
    updateCombat(dt, input, state);
  } else {
    reticle.update({ visible: false }); // don't leave a stale lock box frozen on the death/win screen
  }

  // Sinking objects (currently just a destroyed boss carrier) keep
  // animating to completion regardless of phase, so the "win" transition
  // doesn't cut the sink animation off mid-way.
  for (let i = runState.sinkingObjects.length - 1; i >= 0; i--) {
    const obj = runState.sinkingObjects[i];
    if (obj.sink(dt)) {
      obj.dispose();
      runState.sinkingObjects.splice(i, 1);
    }
  }

  particles.update(dt);
  ocean.update(dt);
  chaseCamera.update(camera, state, dt);
  cameraShake.apply(camera, dt);

  if (runState.launched && runState.phase === 'playing' && !runState.pendingOutcome && !runState.awaitingProjectiles) {
    const boresightPoint = state.position.clone().addScaledVector(getForwardVector(state.quaternion), 300);
    reticle.updateBoresight(projectToScreen(boresightPoint, camera, window.innerWidth, window.innerHeight));
  } else {
    reticle.updateBoresight({ visible: false });
  }

  hud.update({
    speed: state.speed,
    altitude: state.position.y - SEA_LEVEL_Y,
    gamepadConnected: input.gamepadConnected,
  });

  const bosses = runState.enemies.filter((e) => e.kind === 'boss').map((b) => ({ hp: b.hp, maxHp: b.maxHp }));
  const resupplyText =
    runState.resupplyCooldown > 0
      ? `RESUPPLY IN ${Math.ceil(runState.resupplyCooldown)}s`
      : 'RESUPPLY READY — fly over your carrier';
  const cmCombat = runState.player.combat;
  const countermeasuresText = cmCombat.countermeasuresActive
    ? `COUNTERMEASURES ACTIVE (${cmCombat.countermeasuresTimer.toFixed(1)}s)`
    : cmCombat.countermeasuresCooldown > 0
      ? `COUNTERMEASURES IN ${Math.ceil(cmCombat.countermeasuresCooldown)}s`
      : 'COUNTERMEASURES READY';
  combatHud.update({
    hp: runState.player.combat.hp,
    maxHp: runState.player.combat.maxHp,
    bombCount: runState.player.combat.bombCount,
    missileCount: runState.player.combat.missileAmmo,
    score: runState.player.combat.score,
    bosses,
    resupplyText,
    countermeasuresText,
  });

  debugOverlay.update({
    gamepadSnapshot: inputManager.getGamepadDebugSnapshot(),
    heldKeys: inputManager.getHeldKeys(),
    input,
  });

  miniMap.update({
    playerPos: state.position,
    playerYaw: state.yawAngle,
    enemies: runState.enemies,
    homeCarrierPos: carrier.position,
  });

  renderer.render(scene, camera);
}

animate();
