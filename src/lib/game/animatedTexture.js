// @ts-nocheck
// Texturas animadas para GIF: redibuja el frame actual del <img> en un canvas
// cada tick (TextureLoader solo congela el primer frame).
import * as THREE from "three";

const GIF_RE = /image\/gif|\.gif(\?|$)/i;

export function isGifUrl(url) {
  return GIF_RE.test(String(url || ""));
}

/**
 * Carga una textura. Si es GIF, usa CanvasTexture + redraw por frame.
 * onReady(tex) se llama cuando está lista.
 * Devuelve { texture, update, dispose, isGif }.
 */
export function loadAnimatedTexture(url, onReady) {
  const src = String(url || "");
  const isGif = isGifUrl(src);

  if (!isGif) {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    const texture = loader.load(
      src,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
        onReady?.(tex);
      },
      undefined,
      () => onReady?.(null)
    );
    texture.colorSpace = THREE.SRGBColorSpace;
    return {
      texture,
      isGif: false,
      update() {},
      dispose() {
        texture.dispose();
      },
    };
  }

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.decoding = "async";

  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d", { alpha: true, willReadFrequently: false });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  let ready = false;
  let disposed = false;

  function paint() {
    if (disposed || !ready || !ctx) return;
    const w = img.naturalWidth || img.width || 64;
    const h = img.naturalHeight || img.height || 64;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    try {
      ctx.drawImage(img, 0, 0);
    } catch {
      /* CORS tainted — ignore frame */
    }
    texture.needsUpdate = true;
  }

  img.onload = () => {
    if (disposed) return;
    ready = true;
    paint();
    onReady?.(texture);
  };
  img.onerror = () => {
    onReady?.(null);
  };
  img.src = src;

  return {
    texture,
    isGif: true,
    update: paint,
    dispose() {
      disposed = true;
      texture.dispose();
      img.src = "";
    },
  };
}

/** Registro global de texturas animadas a actualizar cada frame. */
export function createAnimTextureRegistry() {
  const list = [];
  return {
    add(handle) {
      if (handle?.isGif && handle.update) list.push(handle);
    },
    remove(handle) {
      const i = list.indexOf(handle);
      if (i >= 0) list.splice(i, 1);
    },
    tick() {
      for (const h of list) h.update();
    },
    dispose() {
      for (const h of list) h.dispose?.();
      list.length = 0;
    },
  };
}
