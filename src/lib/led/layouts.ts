import type { LedScreen } from "./types";
import { screenFromPreset } from "./presets";
import { withDerivedResolution } from "./resolution";

export type LayoutKind = "corner" | "wings" | "u-shape" | "overhead";

export const LAYOUTS: Array<{ key: LayoutKind; label: string; description: string }> = [
  { key: "corner", label: "Corner (90°)", description: "Two 6 × 4 m walls meeting in a corner" },
  { key: "wings", label: "Main + side wings", description: "8 m main wall, 3 m wings angled 30°" },
  { key: "u-shape", label: "U-shape", description: "Back wall with two side walls" },
  { key: "overhead", label: "Overhead LED", description: "Main wall, header strip and ceiling canopy" },
];

const rad = (d: number) => (d * Math.PI) / 180;

function wall(
  index: number,
  name: string,
  w: number,
  h: number,
  pos: { x: number; y: number; z: number },
  rot: { x: number; y: number; z: number },
): LedScreen {
  const s = screenFromPreset(
    {
      key: "layout",
      label: name,
      description: "",
      type: "flat",
      physicalWidth: w,
      physicalHeight: h,
      pixelWidth: Math.round((w * 1000) / 2.9),
      pixelHeight: Math.round((h * 1000) / 2.9),
      pixelPitch: 2.9,
      panelCols: Math.max(1, Math.round(w / 0.5)),
      panelRows: Math.max(1, Math.round(h / 0.5)),
    },
    index,
  );
  const named = { ...s, name, position: pos, rotation: rot };
  const derived = withDerivedResolution(named);
  return {
    ...derived,
    content: { x: 0, y: 0, width: derived.pixelWidth, height: derived.pixelHeight },
  };
}

/** Builds a multi-screen LED layout. Rotation is in degrees; +Y turns a wall toward +X. */
export function buildLayout(kind: LayoutKind, startIndex: number): LedScreen[] {
  const base = 0.5;
  const i = startIndex;
  switch (kind) {
    case "corner": {
      const w = 6, h = 4, cz = -4.5, a = 45;
      const dx = (w / 2) * Math.cos(rad(a)), dz = (w / 2) * Math.sin(rad(a));
      return [
        wall(i, "Corner Left", w, h, { x: -dx, y: h / 2 + base, z: cz + dz }, { x: 0, y: a, z: 0 }),
        wall(i + 1, "Corner Right", w, h, { x: dx, y: h / 2 + base, z: cz + dz }, { x: 0, y: -a, z: 0 }),
      ];
    }
    case "wings": {
      const mw = 8, ww = 3, h = 4.5, z = -2.4, a = 30;
      const dx = mw / 2 + (ww / 2) * Math.cos(rad(a)), dz = (ww / 2) * Math.sin(rad(a));
      return [
        wall(i, "Main Wall", mw, h, { x: 0, y: h / 2 + base, z }, { x: 0, y: 0, z: 0 }),
        wall(i + 1, "Left Wing", ww, h, { x: -dx, y: h / 2 + base, z: z + dz }, { x: 0, y: a, z: 0 }),
        wall(i + 2, "Right Wing", ww, h, { x: dx, y: h / 2 + base, z: z + dz }, { x: 0, y: -a, z: 0 }),
      ];
    }
    case "u-shape": {
      const mw = 8, sw = 6, h = 4, z = -4;
      return [
        wall(i, "U Back Wall", mw, h, { x: 0, y: h / 2 + base, z }, { x: 0, y: 0, z: 0 }),
        wall(i + 1, "U Left Wall", sw, h, { x: -mw / 2, y: h / 2 + base, z: z + sw / 2 }, { x: 0, y: 90, z: 0 }),
        wall(i + 2, "U Right Wall", sw, h, { x: mw / 2, y: h / 2 + base, z: z + sw / 2 }, { x: 0, y: -90, z: 0 }),
      ];
    }
    case "overhead": {
      const mw = 8, h = 4, z = -2.4;
      return [
        wall(i, "Main Wall", mw, h, { x: 0, y: h / 2 + base, z }, { x: 0, y: 0, z: 0 }),
        wall(i + 1, "Overhead Header", 10, 1, { x: 0, y: h + base + 1.2, z: z + 0.5 }, { x: 0, y: 0, z: 0 }),
        wall(i + 2, "Ceiling Canopy", 8, 4, { x: 0, y: h + base + 2.5, z: z + 3 }, { x: 90, y: 0, z: 0 }),
      ];
    }
  }
}
