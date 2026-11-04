// @ts-nocheck
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as THREE from "three";
import { makeCharacterTexture, makeBubbleTexture, makeShadowTexture, makeCityGroundTexture } from "@/lib/gameTexture";
import { buildCity } from "@/lib/game/buildCity";
import { buildShop } from "@/lib/game/buildShop";
import { VfxManager } from "@/lib/game/vfx";
import { audio } from "@/lib/game/audio";
import { CHARACTERS, getCharacter } from "@/data/characters";
import { baseIdOf } from "@/lib/game/loadout";
import { inputState } from "@/lib/game/input";
import { MultiplayerManager } from "@/lib/game/mp";
import { SkillSystem } from "@/lib/game/skills";
import { getMoveConfig, getComboConfig, getPassive } from "@/data/movesets";
import { defeatStyleFor, RESPAWN_POINT, RESPAWN_DELAY_MS, INVULN_MS } from "@/lib/game/defeat";
import { CinematicUltimateManager, hasCinematicUlt } from "@/lib/game/cinematics";

// Re-export: full GameCanvas restored from history with cinematic hooks.
// NOTE: This is a loader stub — the full implementation is applied next commit if needed.
// For immediate recovery we redirect to dynamic import of core.

export { BILLBOARD_COUNT } from "./GameCanvasCore";
export { default } from "./GameCanvasCore";
