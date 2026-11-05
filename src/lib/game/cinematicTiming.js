// @ts-nocheck
// Speed up cinematic ultimates and tighten recovery without rewriting sequences.
import { CinematicUltimateManager } from "./cinematics.js";

if (!CinematicUltimateManager.__timingBoost) {
  CinematicUltimateManager.__timingBoost = true;

  const _tryStart = CinematicUltimateManager.prototype.tryStart;
  CinematicUltimateManager.prototype.tryStart = function (characterId, origin, dir) {
    const ok = _tryStart.call(this, characterId, origin, dir);
    if (ok && this.game) {
      // Unlock sooner: match accelerated duration (~1.6s) instead of 10s lock
      this.game.stunUntil = performance.now() + 1700;
    }
    return ok;
  };

  const _hitStop = CinematicUltimateManager.prototype.hitStop;
  CinematicUltimateManager.prototype.hitStop = function (ms) {
    _hitStop.call(this, Math.min(50, (ms || 0) * 0.4));
  };

  const _update = CinematicUltimateManager.prototype.update;
  CinematicUltimateManager.prototype.update = function (dt) {
    // Run sequences ~55% faster → less lag between ultimates
    return _update.call(this, dt * 1.55);
  };

  const _finish = CinematicUltimateManager.prototype.finish;
  CinematicUltimateManager.prototype.finish = function () {
    _finish.call(this);
    if (this.game) this.game.stunUntil = performance.now() + 50;
  };
}

export { CinematicUltimateManager };
