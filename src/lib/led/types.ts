export type ScreenType =
  | "flat"
  | "vertical"
  | "curved"
  | "column"
  | "strip"
  | "floor"
  | "custom";

export const SCREEN_TYPE_LABELS: Record<ScreenType, string> = {
  flat: "Flat LED Wall",
  vertical: "Vertical LED",
  curved: "Curved LED",
  column: "LED Column",
  strip: "LED Strip",
  floor: "Floor LED",
  custom: "Custom LED",
};

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface PanelConfiguration {
  /** number of physical cabinets across */
  cols: number;
  /** number of physical cabinets down */
  rows: number;
  show: boolean;
}

export interface Curvature {
  enabled: boolean;
  /** total arc angle in degrees, 0-180 */
  angle: number;
  /** metres — derived from width/angle but stored for reference */
  radius: number;
  /** number of curve subdivisions (LED sections) */
  sections: number;
  /** concave (screen wraps towards audience) or convex */
  concave: boolean;
}

export interface LedScreen {
  id: string;
  name: string;
  type: ScreenType;
  /** metres */
  physicalWidth: number;
  physicalHeight: number;
  physicalDepth: number;
  pixelWidth: number;
  pixelHeight: number;
  /** millimetres */
  pixelPitch: number;
  position: Vec3;
  /** degrees */
  rotation: Vec3;
  scale: Vec3;
  curvature: Curvature;
  panelConfiguration: PanelConfiguration;
  brightness: number;
  color: string;
  visible: boolean;
  locked: boolean;
}

export interface StageConfig {
  width: number;
  depth: number;
  height: number;
  backWall: boolean;
  backWallHeight: number;
  stairs: boolean;
  podium: boolean;
  audience: boolean;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  stage: StageConfig;
  screens: LedScreen[];
  /** reserved for future stages: canvases, media, layers, outputs */
  extensions: Record<string, unknown>;
  schemaVersion: number;
}

export const SCHEMA_VERSION = 1;

export function defaultStage(): StageConfig {
  return {
    width: 14,
    depth: 6,
    height: 0.5,
    backWall: true,
    backWallHeight: 7,
    stairs: true,
    podium: false,
    audience: true,
  };
}

export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}

export function createProject(name: string): Project {
  const now = Date.now();
  return {
    id: uid("prj"),
    name,
    createdAt: now,
    updatedAt: now,
    stage: defaultStage(),
    screens: [],
    extensions: {},
    schemaVersion: SCHEMA_VERSION,
  };
}
