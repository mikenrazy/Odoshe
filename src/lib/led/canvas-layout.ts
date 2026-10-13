import type { ContentRegion } from "./types";

export const TEST_OUTPUT_COUNT = 4;
export const TARGET_OUTPUT_FPS = 60;

export function snapRegion(region: ContentRegion, mode: "move" | "resize", others: ContentRegion[], canvas: { width: number; height: number }, grid: number, smart: boolean, tolerance: number) {
  const result = { ...region };
  const guides: { axis: "x" | "y"; value: number }[] = [];
  for (const axis of ["x", "y"] as const) {
    const size = axis === "x" ? "width" : "height";
    if (grid > 0) {
      if (mode === "move") result[axis] = Math.round(result[axis] / grid) * grid;
      else result[size] = Math.max(1, Math.round(result[size] / grid) * grid);
    }
    if (!smart) continue;
    const candidates = [0, canvas[size] / 2, canvas[size], ...others.flatMap(r => [r[axis], r[axis] + r[size] / 2, r[axis] + r[size]])];
    const anchors = mode === "move" ? [0, result[size] / 2, result[size]] : [result[size]];
    let best = tolerance + 1;
    let adjustment = 0;
    let guide: number | undefined;
    for (const candidate of candidates) for (const anchor of anchors) {
      const delta = candidate - (result[axis] + anchor);
      if (Math.abs(delta) <= tolerance && Math.abs(delta) < best) { best = Math.abs(delta); adjustment = delta; guide = candidate; }
    }
    if (guide !== undefined) {
      if (mode === "move") result[axis] += adjustment;
      else result[size] = Math.max(1, result[size] + adjustment);
      guides.push({ axis, value: guide });
    }
  }
  return { region: result, guides };
}

/** Intersection keeps the original offset: pixels beyond the Canvas remain black. */
export function regionIntersection(region: ContentRegion, width: number, height: number) {
  const x = Math.max(0, region.x), y = Math.max(0, region.y);
  return { x, y, width: Math.max(0, Math.min(width, region.x + region.width) - x), height: Math.max(0, Math.min(height, region.y + region.height) - y), offsetX: x - region.x, offsetY: y - region.y };
}