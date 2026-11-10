// @ts-nocheck
import { describe, expect, it } from "vitest";
import { buildProfile, classifyGpu, detectEnv, pickTier } from "@/lib/game/gfxProfile";

const nav = (ua: string, extra: Record<string, unknown> = {}) => ({ userAgent: ua, hardwareConcurrency: 8, deviceMemory: 8, ...extra });
const win = { devicePixelRatio: 1, matchMedia: () => ({ matches: false }) };

const CROS = "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const OPERA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0";

describe("classifyGpu", () => {
  it("reconoce GPU por familia", () => {
    expect(classifyGpu("ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device), SwiftShader driver)")).toBe("software");
    expect(classifyGpu("ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11)")).toBe("high");
    expect(classifyGpu("Mali-G52 MC2")).toBe("low");
    expect(classifyGpu("ANGLE (Intel, Intel(R) UHD Graphics 600 Direct3D11)")).toBe("low");
    expect(classifyGpu("ANGLE (Intel, Mesa Intel(R) Iris(R) Xe Graphics)")).toBe("medium");
    expect(classifyGpu("")).toBe("unknown");
  });
});

describe("pickTier", () => {
  it("ChromeOS nunca pasa de medium por defecto", () => {
    const env = detectEnv(nav(CROS), win, "NVIDIA GeForce RTX 3060");
    expect(env.isChromeOS).toBe(true);
    expect(pickTier(env)).toBe("medium");
  });
  it("ChromeOS con poca RAM/CPU baja a low", () => {
    const env = detectEnv(nav(CROS, { hardwareConcurrency: 2, deviceMemory: 4 }), win, "Mesa Intel(R) UHD Graphics 600");
    expect(pickTier(env)).toBe("low");
  });
  it("Opera con GPU dedicada y buen hardware llega a ultra", () => {
    const env = detectEnv(nav(OPERA), win, "NVIDIA GeForce RTX 4070");
    expect(env.isOpera).toBe(true);
    expect(pickTier(env)).toBe("ultra");
  });
  it("Opera GX se marca solo si UA-CH lo expone", () => {
    const brands = [{ brand: "Chromium" }, { brand: "Opera GX" }];
    expect(detectEnv(nav(OPERA, { userAgentData: { brands } }), win, "").isOperaGX).toBe(true);
    expect(detectEnv(nav(OPERA), win, "").isOperaGX).toBe(false);
  });
  it("GPU por software siempre es low", () => {
    expect(pickTier(detectEnv(nav(OPERA), win, "SwiftShader"))).toBe("low");
  });
});

describe("buildProfile", () => {
  const env = detectEnv(nav(CROS), { ...win, devicePixelRatio: 2 }, "Mesa Intel(R) Iris(R) Xe Graphics");
  it("respeta la calidad elegida por el usuario sobre el techo de ChromeOS", () => {
    const p = buildProfile(env, { quality: "high", shaders: true });
    expect(p.quality).toBe("high");
    expect(p.rendererOptions.powerPreference).toBe("default");
  });
  it("limita el pixel ratio según el tier", () => {
    expect(buildProfile(env, { quality: "auto", shaders: true }).pixelRatio).toBe(1.25);
    expect(buildProfile(env, { quality: "low", shaders: true }).pixelRatio).toBe(1);
  });
  it("sin shaders usa el antialias nativo", () => {
    expect(buildProfile(env, { quality: "auto", shaders: false }).rendererOptions.antialias).toBe(true);
    expect(buildProfile(env, { quality: "auto", shaders: true }).rendererOptions.antialias).toBe(false);
  });
  it("?gfx=off desactiva shaders y ?gfx=ultra fuerza el tier", () => {
    expect(buildProfile(env, { quality: "auto", shaders: true }, "off").post).toBe(false);
    expect(buildProfile(env, { quality: "auto", shaders: true }, "ultra").quality).toBe("ultra");
  });
  it("Opera pide GPU de alto rendimiento", () => {
    const o = detectEnv(nav(OPERA), win, "NVIDIA GeForce RTX 3060");
    expect(buildProfile(o, { quality: "auto", shaders: true }).rendererOptions.powerPreference).toBe("high-performance");
  });
});
