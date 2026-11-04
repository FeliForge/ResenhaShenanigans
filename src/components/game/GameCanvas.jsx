// @ts-nocheck
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as THREE from "three";
import { makeCharacterTexture } from "@/lib/gameTexture";
import { VfxManager } from "@/lib/game/vfx";
import { audio } from "@/lib/game/audio";
import { CinematicUltimateManager, hasCinematicUlt } from "@/lib/game/cinematics";
import { baseIdOf } from "@/lib/game/loadout";
import { SkillSystem } from "@/lib/game/skills";

const BILLBOARD_COUNT = 4;

const GameCanvas = forwardRef(function GameCanvas({ character, onStats, binds }, ref) {
  const mountRef = useRef(null);
  const api = useRef({});

  useImperativeHandle(ref, () => ({
    triggerMove: (cat) => api.current?.triggerMove?.(cat),
    triggerDash: () => api.current?.triggerDash?.(),
    triggerJump: () => {},
    setMobileMove: () => {},
    showQuickChat: () => {},
    setMyBillboard: () => {},
    showEmote: () => {},
    setDashStyle: () => {},
  }));

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !character) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x9fb8d8);
    scene.fog = new THREE.FogExp2(0xb8c6d8, 0.0035);

    const camera = new THREE.PerspectiveCamera(
      55,
      mount.clientWidth / Math.max(1, mount.clientHeight),
      0.1,
      1000
    );
    camera.position.set(0, 9, 13);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0x9fb8d8, 0x2a2a3a, 0.85));
    const sun = new THREE.DirectionalLight(0xffe6c0, 1.2);
    sun.position.set(40, 80, 30);
    scene.add(sun);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(500, 500),
      new THREE.MeshStandardMaterial({ color: 0x33363f, roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    let playerTex;
    try {
      if (character.customImage) {
        playerTex = new THREE.TextureLoader().load(character.customImage);
        playerTex.colorSpace = THREE.SRGBColorSpace;
      } else {
        playerTex = makeCharacterTexture(character);
      }
    } catch {
      playerTex = null;
    }

    const mat = new THREE.MeshBasicMaterial({
      map: playerTex || undefined,
      color: playerTex ? 0xffffff : 0x4488ff,
      transparent: true,
      side: THREE.DoubleSide,
      alphaTest: 0.1,
    });
    const player = new THREE.Group();
    player.position.set(0, 1.6, 0);
    scene.add(player);
    player.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 3.2), mat));

    const vfx = new VfxManager(scene, camera);
    const game = {
      player,
      velocity: new THREE.Vector3(),
      facing: new THREE.Vector3(0, 0, -1),
      meter: 100,
      health: character.stats?.health || 1000,
      maxHealth: character.stats?.health || 1000,
      dead: false,
      stunUntil: 0,
      dashTime: 0,
    };

    const skills = new SkillSystem({
      scene,
      vfx,
      colliders: [],
      onHit: () => {},
      onHeal: () => {},
      onDash: () => {},
    });
    skills.setTargets([]);
    skills.setProps([]);

    const cinematics = new CinematicUltimateManager({
      scene,
      camera,
      vfx,
      skills,
      game,
      character,
      audio,
    });

    const baseId = baseIdOf(character) || character.id;

    function fireUltimate() {
      if (cinematics.isPlaying) return;
      const ok = cinematics.tryStart(
        baseId,
        player.position.clone(),
        game.facing.clone()
      );
      if (!ok) {
        // fallback visual so the player sees something
        const c = new THREE.Color(character.colors?.accent || "#fff");
        vfx.addUltimateBurst(player.position.clone().setY(1.2), c);
        vfx.addShake(0.6);
      }
    }

    api.current.triggerMove = (cat) => {
      if (cat === "ultimate") fireUltimate();
    };
    api.current.triggerDash = () => {};

    // Auto-demo a los 1.2s
    const t0 = setTimeout(() => {
      if (hasCinematicUlt(baseId)) fireUltimate();
      else fireUltimate(); // aún así muestra burst
    }, 1200);

    // Tecla 5 / U para ultimate
    const onKey = (e) => {
      if (e.repeat) return;
      if (e.code === "Digit5" || e.code === "KeyU" || e.key === "5") {
        fireUltimate();
      }
    };
    window.addEventListener("keydown", onKey);

    let last = performance.now();
    let raf;
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const playing = cinematics.update(dt);
      vfx.update(dt);
      try {
        vfx.applyShake?.();
      } catch (_) {}

      if (!playing) {
        camera.position.x += (player.position.x - camera.position.x) * 0.08;
        camera.position.z += (player.position.z + 13 - camera.position.z) * 0.08;
        camera.position.y = 9;
      }
      camera.lookAt(player.position.x, player.position.y + 1.2, player.position.z);
      renderer.render(scene, camera);

      onStats?.({
        health: game.health,
        meter: game.meter,
        cooldowns: { m1: 0, special1: 0, special2: 0, special3: 0, ultimate: 0, dash: 0 },
        hits: 0,
        meterPeak: 0,
        kills: 0,
        deaths: 0,
        combo: 0,
        invuln: 0,
        dead: false,
      });
    };
    raf = requestAnimationFrame(loop);

    const onResize = () => {
      camera.aspect = mount.clientWidth / Math.max(1, mount.clientHeight);
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      clearTimeout(t0);
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKey);
      cinematics.dispose();
      vfx.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) mount.removeChild(renderer.domElement);
    };
  }, [character]);

  return <div ref={mountRef} className="absolute inset-0" />;
});

export default GameCanvas;
export { BILLBOARD_COUNT };
