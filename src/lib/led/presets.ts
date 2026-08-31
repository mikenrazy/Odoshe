import { DEFAULT_PROCESSORS, uid, type LedScreen, type ScreenType } from "./types";

export interface ScreenPreset {
  key: string;
  label: string;
  description: string;
  type: ScreenType;
  physicalWidth: number;
  physicalHeight: number;
  pixelWidth: number;
  pixelHeight: number;
  pixelPitch: number;
  panelCols: number;
  panelRows: number;
}

export const SCREEN_PRESETS: ScreenPreset[] = [
  {
    key: "center",
    label: "Center LED",
    description: "1920 × 1080 · 10.0 × 5.6 m",
    type: "flat",
    physicalWidth: 10,
    physicalHeight: 5.6,
    pixelWidth: 1920,
    pixelHeight: 1080,
    pixelPitch: 2.9,
    panelCols: 20,
    panelRows: 11,
  },
  {
    key: "side",
    label: "Side LED",
    description: "480 × 1080 · 2.5 × 5.6 m",
    type: "flat",
    physicalWidth: 2.5,
    physicalHeight: 5.6,
    pixelWidth: 480,
    pixelHeight: 1080,
    pixelPitch: 2.9,
    panelCols: 5,
    panelRows: 11,
  },
  {
    key: "large",
    label: "Large LED",
    description: "3840 × 1080 · 20 × 5.6 m",
    type: "flat",
    physicalWidth: 20,
    physicalHeight: 5.6,
    pixelWidth: 3840,
    pixelHeight: 1080,
    pixelPitch: 2.9,
    panelCols: 40,
    panelRows: 11,
  },
  {
    key: "vertical",
    label: "Vertical LED",
    description: "480 × 1080 · 1.4 × 3.1 m",
    type: "vertical",
    physicalWidth: 1.4,
    physicalHeight: 3.1,
    pixelWidth: 480,
    pixelHeight: 1080,
    pixelPitch: 2.9,
    panelCols: 3,
    panelRows: 6,
  },
  {
    key: "column",
    label: "LED Column",
    description: "256 × 1536 · 0.75 × 4.5 m",
    type: "column",
    physicalWidth: 0.75,
    physicalHeight: 4.5,
    pixelWidth: 256,
    pixelHeight: 1536,
    pixelPitch: 2.9,
    panelCols: 1,
    panelRows: 6,
  },
  {
    key: "strip",
    label: "LED Strip",
    description: "1920 × 128 · 10 × 0.7 m",
    type: "strip",
    physicalWidth: 10,
    physicalHeight: 0.7,
    pixelWidth: 1920,
    pixelHeight: 128,
    pixelPitch: 5.2,
    panelCols: 20,
    panelRows: 1,
  },
  {
    key: "floor",
    label: "Floor LED",
    description: "1152 × 768 · 6 × 4 m",
    type: "floor",
    physicalWidth: 6,
    physicalHeight: 4,
    pixelWidth: 1152,
    pixelHeight: 768,
    pixelPitch: 5.2,
    panelCols: 12,
    panelRows: 8,
  },
  {
    key: "header",
    label: "Header LED",
    description: "1920 × 160 · 12 × 1 m",
    type: "strip",
    physicalWidth: 12,
    physicalHeight: 1,
    pixelWidth: 1920,
    pixelHeight: 160,
    pixelPitch: 3.9,
    panelCols: 12,
    panelRows: 2,
  },
  {
    key: "curved",
    label: "Curved LED",
    description: "2560 × 1080 · 12 × 5.6 m · 60°",
    type: "curved",
    physicalWidth: 12,
    physicalHeight: 5.6,
    pixelWidth: 2560,
    pixelHeight: 1080,
    pixelPitch: 3.9,
    panelCols: 24,
    panelRows: 11,
  },
  {
    key: "custom",
    label: "Custom",
    description: "User defined · 4 × 3 m",
    type: "custom",
    physicalWidth: 4,
    physicalHeight: 3,
    pixelWidth: 1024,
    pixelHeight: 768,
    pixelPitch: 3.9,
    panelCols: 4,
    panelRows: 3,
  },
];

export function screenFromPreset(
  preset: ScreenPreset,
  index: number,
  overrides: Partial<LedScreen> = {},
): LedScreen {
  const curved = preset.type === "curved";
  const angle = curved ? 60 : 0;
  const base: LedScreen = {
    id: uid("led"),
    name: `LED Screen ${String(index + 1).padStart(2, "0")}`,
    type: preset.type,
    physicalWidth: preset.physicalWidth,
    physicalHeight: preset.physicalHeight,
    physicalDepth: 0.12,
    pixelWidth: preset.pixelWidth,
    pixelHeight: preset.pixelHeight,
    pixelPitch: preset.pixelPitch,
    position: {
      x: 0,
      y: preset.type === "floor" ? 0.52 : preset.physicalHeight / 2 + 0.5,
      z: preset.type === "floor" ? 0 : -2.4,
    },
    rotation: { x: preset.type === "floor" ? -90 : 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    curvature: {
      enabled: curved,
      angle,
      radius: curved ? preset.physicalWidth / ((angle * Math.PI) / 180) : 0,
      sections: 16,
      concave: true,
    },
    panelConfiguration: {
      cols: preset.panelCols,
      rows: preset.panelRows,
      show: false,
      panelWidth: +(preset.physicalWidth / preset.panelCols).toFixed(3),
      panelHeight: +(preset.physicalHeight / preset.panelRows).toFixed(3),
      sizeKey: "custom",
    },
    brightness: 1.1,
    color: "#7fd4ff",
    processorId: DEFAULT_PROCESSORS[0]!.id,
    processorOutput: 1,
    rj45Port: 1,
    content: { x: 0, y: 0, width: preset.pixelWidth, height: preset.pixelHeight },
    visible: true,
    locked: false,
  };
  return { ...base, ...overrides };
}

/** default screen used by the "Add LED Screen" tool */
export function defaultScreen(index: number): LedScreen {
  return screenFromPreset(
    {
      key: "default",
      label: "LED Screen",
      description: "1920 × 1080 · 10 × 4 m",
      type: "flat",
      physicalWidth: 10,
      physicalHeight: 4,
      pixelWidth: 1920,
      pixelHeight: 1080,
      pixelPitch: 2.9,
      panelCols: 20,
      panelRows: 8,
    },
    index,
  );
}
