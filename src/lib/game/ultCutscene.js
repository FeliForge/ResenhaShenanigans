// @ts-nocheck
// Cutscene breve (~1.6 s) para los ultimates del jugador local.
// Es solo cosmética: encuadra con la cámara, hace un golpe de FOV y lanza efectos, y avisa
// a la UI (barras de cine, banner del ultimate) con un evento. NO mueve al jugador, NO aplica
// daño y NO bloquea controles, así que no afecta al combate ni al multijugador.
import * as THREE from "three";

export const ULT_CUTSCENE_EVENT = "resenha:ultimate";
export const ULT_CUTSCENE_SECONDS = 1.65;

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (a, b, v) => {
  const x = clamp01((v - a) / (b - a));
  return x * x * (3 - 2 * x);
};
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function createUltCutscene({ camera, vfx }) {
  const baseFov = camera.fov;
  const cinePos = new THREE.Vector3();
  const baseLook = new THREE.Vector3();
  const cineLook = new THREE.Vector3();
  let active = null;

  const prefersReducedMotion = () =>
    typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  function restoreFov() {
    if (camera.fov !== baseFov) {
      camera.fov = baseFov;
      camera.updateProjectionMatrix();
    }
  }

  function finish() {
    active = null;
    restoreFov();
  }

  function start({ character, move, origin }) {
    if (active || !origin) return;
    const accent = new THREE.Color(character?.colors?.accent || "#ffffff");
    const reducedMotion = prefersReducedMotion();
    active = { t: 0, reducedMotion, accent, beat: false, baseAngle: null };
    try {
      window.dispatchEvent(
        new CustomEvent(ULT_CUTSCENE_EVENT, {
          detail: { character, move, duration: ULT_CUTSCENE_SECONDS, reducedMotion },
        })
      );
    } catch (_) {}
    try {
      vfx?.addShockwave?.(origin.clone().setY(0.14), accent.clone(), true);
      vfx?.addGlow?.(origin.clone().setY(1.7), accent.clone(), 3.4, 0.55);
      vfx?.addShake?.(0.3);
    } catch (_) {}
  }

  // Se llama cada frame, después de la cámara normal y antes del shake.
  function apply(cam, playerPos, opts, dt) {
    if (!active) return;
    if (opts?.dead) {
      finish();
      return;
    }
    const a = active;
    a.t += dt || 0;
    const t = a.t;

    if (!a.beat && t >= 0.5) {
      a.beat = true;
      try {
        vfx?.addShake?.(0.7);
        vfx?.addGlow?.(playerPos.clone().setY(playerPos.y + 0.1), a.accent.clone(), 4.2, 0.4);
      } catch (_) {}
    }
    if (t >= ULT_CUTSCENE_SECONDS) {
      finish();
      return;
    }
    if (a.reducedMotion) return;

    if (a.baseAngle === null) {
      a.baseAngle = Math.atan2(cam.position.x - playerPos.x, cam.position.z - playerPos.z);
    }

    // Peso del plano de cine: entra rápido, se sostiene y sale suave hacia la cámara normal.
    const w = Math.min(smooth(0, 0.3, t), 1 - smooth(ULT_CUTSCENE_SECONDS - 0.55, ULT_CUTSCENE_SECONDS, t));
    const p = t / ULT_CUTSCENE_SECONDS;
    const ang = a.baseAngle + THREE.MathUtils.lerp(0.55, -0.4, easeInOut(p));
    const dist = THREE.MathUtils.lerp(5.6, 4.2, p);
    const hgt = THREE.MathUtils.lerp(1.1, 1.8, p);

    cinePos.set(playerPos.x + Math.sin(ang) * dist, playerPos.y + hgt, playerPos.z + Math.cos(ang) * dist);
    cam.position.lerp(cinePos, w);

    baseLook.set(playerPos.x, playerPos.y + 0.5, playerPos.z);
    cineLook.set(playerPos.x, playerPos.y + 0.3 + 0.35 * p, playerPos.z);
    baseLook.lerp(cineLook, w);
    cam.lookAt(baseLook);

    // Zoom de entrada + pequeño "golpe" de FOV en el impacto.
    const punch = t > 0.5 ? Math.exp(-(t - 0.5) * 9) * 6 : 0;
    cam.fov = baseFov + (44 - baseFov) * w - punch * w;
    cam.updateProjectionMatrix();
  }

  function dispose() {
    finish();
  }

  return { start, apply, dispose, get isPlaying() { return !!active; } };
}
