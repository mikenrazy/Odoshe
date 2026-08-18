import * as THREE from "three";

/**
 * Generates a tiny LED "dot pitch" tile used as an emissive detail texture so
 * screens read as real LED walls instead of flat coloured rectangles.
 */
export function createLedTexture(color: string) {
  if (typeof document === "undefined") return null;
  const size = 32;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#05070c";
  ctx.fillRect(0, 0, size, size);

  const cell = 8;
  for (let y = 0; y < size; y += cell) {
    for (let x = 0; x < size; x += cell) {
      const g = ctx.createRadialGradient(
        x + cell / 2,
        y + cell / 2,
        0,
        x + cell / 2,
        y + cell / 2,
        cell / 2,
      );
      g.addColorStop(0, color);
      g.addColorStop(0.55, `${color}aa`);
      g.addColorStop(1, "#05070c00");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x + cell / 2, y + cell / 2, cell / 2.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
