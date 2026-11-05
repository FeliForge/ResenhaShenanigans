// @ts-nocheck
// Acelera cinemáticas y evita solapamiento / lag entre ultimates.
import { CinematicUltimateManager } from "./cinematics.js";

if (!CinematicUltimateManager.__timingBoost) {
  CinematicUltimateManager.__timingBoost = true;

  const _tryStart = CinematicUltimateManager.prototype.tryStart;
  CinematicUltimateManager.prototype.tryStart = function (characterId, origin, dir) {
    if (this.active) return false;
    if (this.game && performance.now() < (this.game._ultLockUntil || 0)) return false;

    const ok = _tryStart.call(this, characterId, origin, dir);
    if (ok && this.game) {
      const dur = (this.active?.duration || 2.2) / 1.75;
      this.game._ultLockUntil = performance.now() + dur * 1000 + 200;
      this.game.stunUntil = performance.now() + dur * 1000 + 100;
    }
    return ok;
  };

  const _hitStop = CinematicUltimateManager.prototype.hitStop;
  CinematicUltimateManager.prototype.hitStop = function (ms) {
    _hitStop.call(this, Math.min(28, (ms || 0) * 0.25));
  };

  const _update = CinematicUltimateManager.prototype.update;
  CinematicUltimateManager.prototype.update = function (dt) {
    return _update.call(this, dt * 1.75);
  };

  const _finish = CinematicUltimateManager.prototype.finish;
  CinematicUltimateManager.prototype.finish = function () {
    _finish.call(this);
    if (this.game) {
      this.game.stunUntil = performance.now() + 40;
      this.game._ultLockUntil = performance.now() + 180;
    }
  };
}

export { CinematicUltimateManager };
