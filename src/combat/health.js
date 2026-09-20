import { RAM_DAMAGE, PLAYER_INVULN_TIME, PLAYER_MISSILE_DAMAGE_VS_BOSS } from './weaponConstants.js';

export function spheresHit(posA, radiusA, posB, radiusB) {
  const r = radiusA + radiusB;
  return posA.distanceToSquared(posB) <= r * r;
}

// Every enemy is either a single sphere ({position, radius}) or exposes
// hitSpheres() -> [{position, radius}, ...] (the carrier boss, whose
// 260-unit hull is represented as 3 sub-spheres — see ai/enemyCarrier.js).
function enemyHitSpheres(enemy) {
  if (typeof enemy.hitSpheres === 'function') return enemy.hitSpheres();
  return [{ position: enemy.position, radius: enemy.radius }];
}

function projectileHitsEnemy(projectile, enemy) {
  for (const sphere of enemyHitSpheres(enemy)) {
    if (spheresHit(projectile.position, projectile.radius, sphere.position, sphere.radius)) return true;
  }
  return false;
}

// The carrier's armor shrugs off a chunk of a player missile's punch (see
// weaponConstants.js) — full missile damage stays elsewhere (fighters, SAM
// ships).
function damageForHit(projectile, enemy) {
  if (enemy.kind === 'boss' && projectile.kind === 'missile' && projectile.owner === 'player') {
    return PLAYER_MISSILE_DAMAGE_VS_BOSS;
  }
  return projectile.damage;
}

export function hurtPlayer(player, amount, effects) {
  if (player.combat.invulnTimer > 0) return;
  // Chaff-deployed countermeasures block all incoming damage for their
  // duration, not just newly-launched SAM missiles (see ai/samShip.js's
  // forceMiss) — a missile that acquired a real lock and was already in
  // flight *before* the player reacted to the warning and popped
  // countermeasures must still be shrugged off, or the alert -> react ->
  // deploy flow would be a lie half the time.
  if (player.combat.countermeasuresActive) return;
  player.combat.hp -= amount;
  player.combat.invulnTimer = PLAYER_INVULN_TIME;
  effects.cameraShake.trigger(9);
  effects.sfx.play('hit');
}

function killEnemy(runState, enemy, index, effects) {
  runState.enemies.splice(index, 1);
  enemy.alive = false;
  runState.player.combat.score += enemy.scoreValue;
  effects.spawnPoof(enemy.position);
  effects.cameraShake.trigger(5);
  effects.sfx.play('enemyDeath');
  enemy.dispose?.();
}

function destroyBoss(runState, enemy, index, effects) {
  runState.enemies.splice(index, 1);
  enemy.alive = false;
  runState.player.combat.score += enemy.scoreValue;

  const hullPositions = enemy.getHullWorldPositions ? enemy.getHullWorldPositions() : [enemy.position];
  effects.spawnCarrierDestruction(hullPositions);
  effects.cameraShake.trigger(30);
  effects.sfx.play('enemyDeath');

  // Not disposed yet: it keeps animating (see ai/enemyCarrier.js#sink) until
  // main.js's sinking-objects loop finishes it off and disposes the visual.
  runState.sinkingObjects.push(enemy);

  // Two carriers to sink now — only complete the mission once none remain.
  const bossesRemaining = runState.enemies.some((e) => e.kind === 'boss');
  if (!bossesRemaining) runState.missionComplete = true;
}

export function resolveCollisions(runState, effects) {
  const player = runState.player;
  const playerPos = player.flightState.position;
  const playerRadius = player.radius;

  // Player projectiles vs enemies.
  for (let bi = runState.playerProjectiles.length - 1; bi >= 0; bi--) {
    const b = runState.playerProjectiles[bi];
    for (let ei = runState.enemies.length - 1; ei >= 0; ei--) {
      const enemy = runState.enemies[ei];
      if (!projectileHitsEnemy(b, enemy)) continue;
      enemy.hp -= damageForHit(b, enemy);
      effects.scene.remove(b.mesh);
      runState.playerProjectiles.splice(bi, 1);
      if (enemy.hp <= 0) {
        if (enemy.kind === 'boss') destroyBoss(runState, enemy, ei, effects);
        else killEnemy(runState, enemy, ei, effects);
      }
      break;
    }
  }

  // Enemy projectiles vs player.
  for (let bi = runState.enemyProjectiles.length - 1; bi >= 0; bi--) {
    const b = runState.enemyProjectiles[bi];
    if (spheresHit(b.position, b.radius, playerPos, playerRadius)) {
      effects.scene.remove(b.mesh);
      runState.enemyProjectiles.splice(bi, 1);
      hurtPlayer(player, b.damage, effects);
    }
  }

  // Body ramming.
  for (let ei = runState.enemies.length - 1; ei >= 0; ei--) {
    const enemy = runState.enemies[ei];
    const rammed = enemyHitSpheres(enemy).some((s) => spheresHit(s.position, s.radius, playerPos, playerRadius));
    if (!rammed) continue;
    if (enemy.kind === 'boss') {
      hurtPlayer(player, RAM_DAMAGE, effects);
    } else {
      killEnemy(runState, enemy, ei, effects);
      hurtPlayer(player, RAM_DAMAGE, effects);
    }
  }
}
