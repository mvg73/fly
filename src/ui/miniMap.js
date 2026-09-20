import { ARENA_RADIUS } from '../scene/arenaBounds.js';

const MARKER_COLORS = {
  boss: '#ff4d4d',
  sam: '#ffcf5c',
  fighter: '#ff8a4d',
};

// Simple canvas-based top-down map, fixed in the lower-right corner,
// showing the whole arena (world origin/home carrier at the center) rather
// than scrolling with the player — a big-picture "where's the boss, where
// am I" reference rather than a precision navigation tool.
export function createMiniMap() {
  const canvas = document.getElementById('minimap');
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const center = size / 2;
  const usableRadius = center - 6;

  function worldToMap(x, z) {
    return {
      mx: center + (x / ARENA_RADIUS) * usableRadius,
      my: center + (z / ARENA_RADIUS) * usableRadius,
    };
  }

  function dot(mx, my, radius, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(mx, my, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  return {
    update({ playerPos, playerYaw, enemies, homeCarrierPos }) {
      ctx.clearRect(0, 0, size, size);

      ctx.fillStyle = 'rgba(10, 20, 28, 0.75)';
      ctx.beginPath();
      ctx.arc(center, center, usableRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(234, 246, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      const home = worldToMap(homeCarrierPos.x, homeCarrierPos.z);
      dot(home.mx, home.my, 3, '#6fd3e0');

      for (const enemy of enemies) {
        const { mx, my } = worldToMap(enemy.position.x, enemy.position.z);
        const color = MARKER_COLORS[enemy.kind] ?? '#ffffff';
        dot(mx, my, enemy.kind === 'boss' ? 5 : 3, color);
      }

      // Player marker: a small triangle rotated to match world yaw. World
      // forward is (sin(yaw), 0, -cos(yaw)); since map-x=world-x and
      // map-y=world-z, `ctx.rotate(yaw)` on an "up"-pointing triangle lines
      // up exactly (canvas rotate(θ) sends (0,-1) to (sinθ,-cosθ)).
      const p = worldToMap(playerPos.x, playerPos.z);
      ctx.save();
      ctx.translate(p.mx, p.my);
      ctx.rotate(playerYaw);
      ctx.fillStyle = '#eaf6ff';
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(4, 5);
      ctx.lineTo(-4, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    },
  };
}
