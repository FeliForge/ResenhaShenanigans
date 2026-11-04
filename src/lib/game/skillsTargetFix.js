// @ts-nocheck
/** Patch SkillSystem so dummies with applyDamage / missing alive still take hits. */
import { SkillSystem } from "./skills.js";
import * as THREE from "three";

if (!SkillSystem.__targetFixApplied) {
  SkillSystem.prototype.isAlive = function (t) {
    if (!t) return false;
    if (typeof t.alive === "boolean") return t.alive;
    if (typeof t.alive === "function") return !!t.alive();
    return true;
  };

  SkillSystem.prototype.hurtTarget = function (target, dmg, from, knock) {
    const total = dmg * this.mods.damage;
    if (typeof target?.hurt === "function") target.hurt(total, from, knock);
    else if (typeof target?.applyDamage === "function") target.applyDamage(total);
    this.onHit?.(target, total);
  };

  SkillSystem.prototype.damageRadius = function (origin, radius, dmg, knock, hitSet) {
    const V = new THREE.Vector3();
    for (const t of this.targets) {
      if (!this.isAlive(t)) continue;
      if (hitSet && t.id != null && hitSet.has(t.id)) continue;
      V.copy(t.pos).sub(origin).setY(0);
      if (V.length() > radius + (t.radius || 1)) continue;
      if (hitSet && t.id != null) hitSet.add(t.id);
      this.hurtTarget(t, dmg, origin.clone(), knock);
    }
    this.hurtProps(origin, radius, dmg);
  };

  SkillSystem.__targetFixApplied = true;
}

export { SkillSystem };
