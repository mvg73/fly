// A brief "RESUPPLIED" flash, re-triggered by restarting its CSS animation
// (re-adding the same animation class doesn't replay it, so force a reflow
// between removing and re-adding).
export function createResupplyToast() {
  const el = document.getElementById('resupply-toast');

  return {
    show() {
      el.hidden = true;
      void el.offsetWidth; // force reflow so the next `hidden = false` restarts the animation
      el.hidden = false;
    },
  };
}
