export function createCombatHud() {
  const healthFill = document.getElementById('hud-health-fill');
  const bombsEl = document.getElementById('hud-bombs');
  const missilesEl = document.getElementById('hud-missiles');
  const scoreEl = document.getElementById('hud-score');
  const bossContainer = document.getElementById('hud-bosses');
  const resupplyEl = document.getElementById('hud-resupply');
  const countermeasuresEl = document.getElementById('hud-countermeasures');

  const bossRows = []; // parallel to however many bosses currently exist

  function ensureBossRow(i) {
    if (bossRows[i]) return bossRows[i];
    const row = document.createElement('div');
    row.className = 'hud-boss-row';
    const label = document.createElement('div');
    label.className = 'hud-boss-label';
    const healthWrap = document.createElement('div');
    healthWrap.className = 'hud-boss-health';
    const fill = document.createElement('div');
    fill.className = 'hud-boss-fill';
    healthWrap.appendChild(fill);
    row.appendChild(label);
    row.appendChild(healthWrap);
    bossContainer.appendChild(row);
    const entry = { row, label, fill };
    bossRows[i] = entry;
    return entry;
  }

  return {
    // `bosses`: array of {hp, maxHp}, one per still-alive boss carrier.
    update({ hp, maxHp, bombCount, missileCount, score, bosses, resupplyText, countermeasuresText }) {
      const pct = Math.max(0, Math.min(1, hp / maxHp));
      healthFill.style.width = `${pct * 100}%`;
      healthFill.classList.toggle('low', pct <= 0.3);
      bombsEl.textContent = `BOMBS ${Math.max(0, bombCount)}`;
      missilesEl.textContent = `MSL ${Math.max(0, missileCount)}`;
      scoreEl.textContent = `SCORE ${Math.round(score)}`;
      resupplyEl.textContent = resupplyText ?? '';
      countermeasuresEl.textContent = countermeasuresText ?? '';

      const list = bosses ?? [];
      list.forEach((boss, i) => {
        const entry = ensureBossRow(i);
        entry.row.hidden = false;
        const bossPct = Math.max(0, Math.min(1, boss.hp / boss.maxHp));
        entry.fill.style.width = `${bossPct * 100}%`;
        const prefix = list.length > 1 ? `CARRIER ${i + 1}` : 'CARRIER';
        entry.label.textContent = `${prefix} ${Math.max(0, Math.round(boss.hp))}/${boss.maxHp}`;
      });
      for (let i = list.length; i < bossRows.length; i++) {
        bossRows[i].row.hidden = true;
      }
    },
  };
}
