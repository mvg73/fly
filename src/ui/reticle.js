export function createReticle() {
  const lockEl = document.getElementById('reticle-lock');
  const centerEl = document.getElementById('reticle-center');

  return {
    update({ visible, x, y, locked }) {
      lockEl.hidden = !visible;
      if (!visible) return;
      lockEl.style.left = `${x}px`;
      lockEl.style.top = `${y}px`;
      lockEl.classList.toggle('locked', !!locked);
    },

    // The chase camera only follows a damped fraction of the plane's pitch
    // (comfort, see camera/chaseCamera.js's PITCH_INFLUENCE) — screen center
    // is NOT where shots actually go whenever the plane is pitched at all.
    // This positions the boresight marker at the plane's true nose
    // direction each frame instead of leaving it CSS-fixed at 50%/50%, so
    // it honestly shows where bullets/bombs will travel.
    updateBoresight({ visible, x, y }) {
      centerEl.hidden = !visible;
      if (!visible) return;
      centerEl.style.left = `${x}px`;
      centerEl.style.top = `${y}px`;
    },
  };
}
