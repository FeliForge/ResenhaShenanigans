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

// Temporary minimal canvas: boots + demo of cinematic ultimates.
// Full combat loop will be re-merged next.
const GameCanvas = forwardRef(function GameCanvas({ character, onStats }, ref) {
  const mountRef = useRef(null);
  useImperativeHandle(ref, () => ({
    triggerMove: (cat) => api.current?.triggerMove?.(cat),
    triggerDash: () => {},
    triggerJump: () => {},
    setMobileMove: () => {},
    showQuickChat: () => {},
    setMyBillboard: () => {},
    showEmote: () => {},
    setDashStyle: () => {},
  }));
  const api = useRef({});

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !character) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x9fb8d8);
    scene.fog = new THREE.FogExp2(0xb8c6d8, 0.0038);
    const camera = new THREE.PerspectiveCamera(55, mount.clientWidth / Math.max(1, mount.clientHeight), 0.1, 1000);
    camera.position.set(0, 9, 13);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);
    scene.add(new THREE.HemisphereLight(0x9fb8d8, 0x2a2a3a, 0.7));
    const sun = new THREE.DirectionalLight(0xffe6c0, 1.3);
    sun.position.set(70, 130, 50);
    scene.add(sun);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400),
      new THREE.MeshStandardMaterial({ color: 0x33363f, roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    let playerTex;
    if (character.customImage) {
      playerTex = new THREE.TextureLoader().load(character.customImage);
      playerTex.colorSpace = THREE.SRGBColorSpace;
    } else {
      playerTex = makeCharacterTexture(character);
    }
    const mat = new THREE.MeshBasicMaterial({ map: playerTex, transparent: true, side: THREE.DoubleSide, alphaTest: 0.1 });
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
      scene, vfx, colliders: [],
      onHit: () => {},
      onHeal: () => {},
      onDash: () => {},
    });
    skills.setTargets([]);
    skills.setProps([]);
    const cinematics = new CinematicUltimateManager({ scene, camera, vfx, skills, game, character, audio });

    const baseId = baseIdOf(character) || character.id;
    api.current.triggerMove = (cat) => {
      if (cat !== "ultimate") return;
      if (!hasCinematicUlt(baseId)) return;
      if (cinematics.isPlaying) return;
      cinematics.tryStart(baseId, player.position.clone(), game.facing.clone());
    };

    // Demo auto-play once for the 4 cinematic characters
    const t0 = setTimeout(() => {
      if (hasCinematicUlt(baseId)) {
        cinematics.tryStart(baseId, player.position.clone(), new THREE.Vector3(0, 0, -1));
      }
    }, 1500);

    let raf;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      cinematics.update(1 / 60);
      vfx.update(1 / 60);
      vfx.applyShake?.();
      if (!cinematics.isPlaying) {
        camera.position.x += (player.position.x - camera.position.x) * 0.06;
        camera.position.z += (player.position.z + 13 - camera.position.z) * 0.06;
        camera.position.y = 9;
      }
      camera.lookAt(player.position.x, player.position.y + 1.2, player.position.z);
      renderer.render(scene, camera);
      onStats?.({
        health: game.health, meter: game.meter,
        cooldowns: { m1: 0, special1: 0, special2: 0, special3: 0, ultimate: 0, dash: 0 },
        hits: 0, meterPeak: 0, kills: 0, deaths: 0, combo: 0, invuln: 0, dead: false,
      });
    };
    loop();

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
