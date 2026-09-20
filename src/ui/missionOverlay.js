export function createMissionOverlay() {
  const overlay = document.getElementById('mission-overlay');
  const title = document.getElementById('mission-title');
  const sub = document.getElementById('mission-sub');
  const restartBtn = document.getElementById('mission-restart');

  return {
    showWin(score) {
      title.textContent = 'Carrier Destroyed — Mission Complete';
      sub.textContent = `Score: ${Math.round(score)}`;
      overlay.hidden = false;
    },
    showLose(reason = 'Shot Down') {
      title.textContent = reason;
      sub.textContent = 'Press FIRE to launch again.';
      overlay.hidden = false;
    },
    hide() {
      overlay.hidden = true;
    },
    onRestart(callback) {
      restartBtn.addEventListener('click', callback);
    },
  };
}
