import * as THREE from 'three';

// Procedurally-generated CanvasTextures — no external image files, so there's
// nothing to fetch and nothing that can break from a bad URL. A single
// configurable generator covers metal paneling, deck planking, and hull
// weathering via different parameter presets, giving every surface subtle
// noise/variation and panel-line detail instead of a single flat color.

function clampByte(v) {
  return Math.max(0, Math.min(255, v));
}

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function createSurfaceTexture({
  size = 256,
  baseColor = '#6b7176',
  noise = 16,
  lineColor = null,
  lineSpacing = 0,
  lineWidth = 1,
  lineAxis = 'both', // 'both' | 'horizontal' | 'vertical'
  streaks = 0,
  repeatX = 1,
  repeatY = 1,
} = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const base = hexToRgb(baseColor);

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, size, size);

  // Speckle noise so the surface reads as weathered material, not a flat fill.
  const imgData = ctx.getImageData(0, 0, size, size);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * noise;
    d[i] = clampByte(base.r + n);
    d[i + 1] = clampByte(base.g + n);
    d[i + 2] = clampByte(base.b + n);
  }
  ctx.putImageData(imgData, 0, 0);

  // Vertical weathering streaks (rust/rain stains running down a hull).
  if (streaks > 0) {
    for (let i = 0; i < streaks; i++) {
      const x = Math.random() * size;
      const w = 2 + Math.random() * 6;
      const alpha = 0.04 + Math.random() * 0.09;
      const grad = ctx.createLinearGradient(x, 0, x, size);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, `rgba(0,0,0,${alpha})`);
      ctx.fillStyle = grad;
      ctx.fillRect(x - w / 2, 0, w, size);
    }
  }

  // Panel-line / plank grid.
  if (lineColor && lineSpacing > 0) {
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = lineWidth;
    if (lineAxis === 'both' || lineAxis === 'vertical') {
      for (let x = lineSpacing; x < size; x += lineSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, size);
        ctx.stroke();
      }
    }
    if (lineAxis === 'both' || lineAxis === 'horizontal') {
      for (let y = lineSpacing; y < size; y += lineSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(size, y);
        ctx.stroke();
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
