import { MAX_CONCURRENT_ENEMIES, LEVEL_DURATION } from './weaponConstants.js';

// Time-stamped spawn timeline [{t, type:'fighter'|'sam'}, ...], adapted from
// Game A's src/waves.js: procedurally generated across 4 escalating-density
// phases rather than hand-authored, same shrinking-gap/rising-sam-chance
// curve. SAM chance raised well above Game A's original proportions — early
// tuning left them too rare to feel like a real threat alongside two
// carriers' worth of targets.
export function buildWaveTimeline(duration = LEVEL_DURATION) {
  const timeline = [];
  const phase1 = duration * 0.2;
  const phase2 = duration * 0.5;
  const phase3 = duration * 0.8;
  let t = 3;

  while (t < duration - 8) {
    let gap, samChance;
    if (t < phase1) { gap = [3, 4.2]; samChance = 0.25; }
    else if (t < phase2) { gap = [2.4, 3.4]; samChance = 0.38; }
    else if (t < phase3) { gap = [2, 2.8]; samChance = 0.45; }
    else { gap = [1.7, 2.4]; samChance = 0.55; }

    const type = Math.random() < samChance ? 'sam' : 'fighter';
    timeline.push({ t, type });
    t += gap[0] + Math.random() * (gap[1] - gap[0]);
  }

  timeline.sort((a, b) => a.t - b.t);
  return timeline;
}

// Pops due timeline entries and hands them to the supplied factory
// callbacks (kept decoupled from ai/enemyPlane.js & ai/samShip.js — those
// need a THREE.Scene to build visuals, which waves.js has no business
// knowing about).
export function spawnFromWaves(runState, dt, factories) {
  runState.time += dt;
  while (
    runState.waveCursor < runState.waveTimeline.length &&
    runState.waveTimeline[runState.waveCursor].t <= runState.time &&
    runState.enemies.length < MAX_CONCURRENT_ENEMIES
  ) {
    const spawn = runState.waveTimeline[runState.waveCursor];
    const enemy = spawn.type === 'sam' ? factories.spawnSam() : factories.spawnFighter();
    runState.enemies.push(enemy);
    runState.waveCursor++;
  }
}
