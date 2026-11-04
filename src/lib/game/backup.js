// @ts-nocheck
import { createZip } from "@/lib/game/zip";

// Backup del código generado localmente.
// La sala secreta sigue abriendo, pero el zip solo explica eso.

const NOTE = `Resenha Shenanigans
Este juego funciona sin servicios externos.
El código fuente no se empaqueta dentro del navegador.
Progreso, skins, misiones y tienda se guardan en este dispositivo.
`;

export function sourceFileList() {
  return ["LEEME.txt"];
}

export async function buildSourceZip(onProgress) {
  const data = new TextEncoder().encode(NOTE);
  onProgress?.(1);
  const bytes = createZip([{ name: "LEEME.txt", data }]);
  return { blob: new Blob([bytes], { type: "application/zip" }), count: 1 };
}
