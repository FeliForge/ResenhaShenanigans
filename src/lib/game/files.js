// @ts-nocheck
// Imágenes en el navegador: data URL o URL externa.
// GIFs se preservan (no se re-encoden a JPEG) para mantener la animación.

const GIF_RE = /image\/gif|\.gif(\?|$)/i;

export function isGifSource(src, mime = "") {
  return GIF_RE.test(String(mime || "")) || GIF_RE.test(String(src || ""));
}

export function isValidImageUrl(url) {
  if (!url || typeof url !== "string") return false;
  const u = url.trim();
  if (u.startsWith("data:image/")) return true;
  try {
    const parsed = new URL(u);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/** Carga un archivo local. GIFs → data URL original; resto → JPEG reducido. */
export function imageFileToDataUrl(file, max = 512) {
  return new Promise((resolve, reject) => {
    if (!file || !String(file.type || "").startsWith("image/")) {
      reject(new Error("not an image"));
      return;
    }

    // Preservar GIF animado
    if (file.type === "image/gif" || /\.gif$/i.test(file.name || "")) {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("read"));
      reader.readAsDataURL(file);
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height, 1));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("canvas"));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode"));
    };
    img.src = url;
  });
}

/** Valida y normaliza una URL de imagen (http/https o data:). */
export async function resolveImageUrl(input) {
  const url = String(input || "").trim();
  if (!isValidImageUrl(url)) throw new Error("invalid url");
  // data: ya lista
  if (url.startsWith("data:image/")) return url;
  // Probar que carga
  await new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("load failed"));
    img.src = url;
  });
  return url;
}
