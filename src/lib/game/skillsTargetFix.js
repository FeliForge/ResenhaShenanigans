// @ts-nocheck
/** Ensure dummies/NPCs take damage even with legacy target API. */
import { SkillSystem } from "./skills.js";

if (!SkillSystem.__targetFixApplied) {
  const _setTargets = SkillSystem.prototype.setTargets;
  SkillSystem.prototype.setTargets = function (targets) {
    const list = (targets || []).map((t, i) => {
      if (!t) return t;
      const desc = Object.getOwnPropertyDescriptor(t, "alive");
      const hasAlive =
        typeof t.alive === "boolean" ||
        typeof t.alive === "function" ||
        (desc && (desc.get || "value" in desc));
      if (hasAlive && typeof t.hurt === "function") return t;
      return {
        id: t.id != null ? t.id : `target-${i}`,
        pos: t.pos,
        radius: t.radius || 1.2,
        get alive() {
          if (typeof t.alive === "boolean") return t.alive;
          if (typeof t.alive === "function") return !!t.alive();
          // legacy: treat as alive; applyDamage/hurt will no-op if dead
          return true;
        },
        hurt(dmg, from, knock) {
          if (typeof t.hurt === "function") return t.hurt(dmg, from, knock);
          if (typeof t.applyDamage === "function") return t.applyDamage(dmg);
        },
      };
    });
    return _setTargets.call(this, list);
  };

  SkillSystem.prototype.hurtTarget = function (target, dmg, from, knock) {
    const total = dmg * this.mods.damage;
    if (typeof target?.hurt === "function") target.hurt(total, from, knock);
    else if (typeof target?.applyDamage === "function") target.applyDamage(total);
    this.onHit?.(target, total);
  };

  SkillSystem.__targetFixApplied = true;
}

export { SkillSystem };
