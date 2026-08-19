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
  /** cabinet size in metres */
  panelWidth: number;
  panelHeight: number;
  /** which cabinet size preset is active */
  sizeKey: PanelSizeKey;
}

export type PanelSizeKey = "1x0.5" | "0.5x0.5" | "0.5x1" | "custom";

export const PANEL_SIZE_PRESETS: Array<{
  key: PanelSizeKey;
  label: string;
  width: number;
  height: number;
}> = [
  { key: "1x0.5", label: "1.0 × 0.5 m", width: 1, height: 0.5 },
  { key: "0.5x0.5", label: "0.5 × 0.5 m", width: 0.5, height: 0.5 },
  { key: "0.5x1", label: "0.5 × 1.0 m", width: 0.5, height: 1 },
  { key: "custom", label: "Custom", width: 1, height: 0.5 },
];

export interface ProcessorModel {
  id: string;
  brand: string;
  label: string;
  /** maximum output pixels the processor can drive */
  maxPixels: number;
  builtIn?: boolean;
}

export const DEFAULT_PROCESSORS: ProcessorModel[] = [
  { id: "vx1000", brand: "NovaStar", label: "VX1000", maxPixels: 6_500_000, builtIn: true },
  { id: "vx600", brand: "NovaStar", label: "VX600", maxPixels: 3_900_000, builtIn: true },
  { id: "vdwall", brand: "VDWall", label: "VDWall", maxPixels: 2_300_000, builtIn: true },
];

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
  /** id of the video processor driving this screen */
  processorId: string;
  visible: boolean;
  locked: boolean;
  /** stable ordering within its processor's continuous grid numbering */
  gridOrder?: number;
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
  /** element colours */
  stageColor: string;
  backWallColor: string;
  stairsColor: string;
  podiumColor: string;
  floorColor: string;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  stage: StageConfig;
  screens: LedScreen[];
  /** reserved for future stages: canvases, media, layers, outputs */
  /** available video processors, including user-added models */
  processors: ProcessorModel[];
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
    stageColor: "#2a323f",
    backWallColor: "#3a2a4d",
    stairsColor: "#c2762a",
    podiumColor: "#1f5f5b",
    floorColor: "#080a10",
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
    processors: DEFAULT_PROCESSORS.map((p) => ({ ...p })),
    extensions: {},
    schemaVersion: SCHEMA_VERSION,
  };
}

/** fill in fields added after a project was saved */
export function normalizeProject(project: Project): Project {
  const stage = { ...defaultStage(), ...project.stage };
  const processors =
    project.processors && project.processors.length > 0
      ? project.processors
      : DEFAULT_PROCESSORS.map((p) => ({ ...p }));
  const screens = (project.screens ?? []).map((s, index) => {
    const panel = s.panelConfiguration ?? { cols: 1, rows: 1, show: false };
    const panelWidth = panel.panelWidth ?? +(s.physicalWidth / Math.max(1, panel.cols)).toFixed(3);
    const panelHeight =
      panel.panelHeight ?? +(s.physicalHeight / Math.max(1, panel.rows)).toFixed(3);
    return {
      ...s,
      processorId: s.processorId ?? processors[0]!.id,
      panelConfiguration: {
        ...panel,
        panelWidth,
        panelHeight,
        sizeKey:
          panel.sizeKey ??
          (PANEL_SIZE_PRESETS.find((p) => p.width === panelWidth && p.height === panelHeight)
            ?.key ?? "custom"),
      },
    };
  });
  return { ...project, stage, processors, screens };
}
