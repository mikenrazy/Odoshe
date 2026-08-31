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

/* ------------------------------------------------------------------ units */

export type UnitSystem = "metric" | "imperial";

/* ------------------------------------------------------------- LED panels */

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
  /** when true the user pinned cols/rows manually and auto-fit is skipped */
  manual?: boolean;
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

/* --------------------------------------------------------- video hardware */

export interface ProcessorModel {
  id: string;
  brand: string;
  label: string;
  /** maximum output pixels the processor can drive */
  maxPixels: number;
  /** number of physical LED outputs (ports) */
  outputs: number;
  /** max resolution of a single output */
  outputWidth: number;
  outputHeight: number;
  builtIn?: boolean;
}

export const DEFAULT_PROCESSORS: ProcessorModel[] = [
  {
    id: "vx1000",
    brand: "NovaStar",
    label: "VX1000",
    maxPixels: 6_500_000,
    outputs: 10,
    outputWidth: 4096,
    outputHeight: 1080,
    builtIn: true,
  },
  {
    id: "vx600",
    brand: "NovaStar",
    label: "VX600",
    maxPixels: 3_900_000,
    outputs: 6,
    outputWidth: 4096,
    outputHeight: 1080,
    builtIn: true,
  },
  {
    id: "vdwall",
    brand: "VDWall",
    label: "VDWall",
    maxPixels: 2_300_000,
    outputs: 4,
    outputWidth: 1920,
    outputHeight: 1080,
    builtIn: true,
  },
];

/* ---------------------------------------------------------- canvas/output */

export type AspectPreset = "16:9" | "32:9" | "custom";

export interface CanvasConfig {
  width: number;
  height: number;
  aspectPreset: AspectPreset;
  refreshRate: number;
  outputs: number;
}

export const RESOLUTION_PRESETS: Array<{ key: string; label: string; width: number; height: number }> =
  [
    { key: "1920x1080", label: "1920 × 1080", width: 1920, height: 1080 },
    { key: "2560x1080", label: "2560 × 1080", width: 2560, height: 1080 },
    { key: "3840x1080", label: "3840 × 1080", width: 3840, height: 1080 },
    { key: "custom", label: "Custom", width: 0, height: 0 },
  ];

export function defaultCanvas(): CanvasConfig {
  return { width: 3840, height: 1080, aspectPreset: "32:9", refreshRate: 60, outputs: 2 };
}

/* ------------------------------------------------------------ LED screens */

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

/** region of the digital content canvas mapped onto this screen (pixels) */
export interface ContentRegion {
  x: number;
  y: number;
  width: number;
  height: number;
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
  /** 1-based processor output/port this screen is patched to */
  processorOutput: number;
  /** slice of the content canvas shown on this screen */
  content: ContentRegion;
  /** optional image (data URL) shown as content on the LED surface in 3D */
  contentImage?: string | undefined;
  visible: boolean;
  locked: boolean;
  /** stable ordering within its processor's continuous grid numbering */
  gridOrder?: number;
}

/* -------------------------------------------------------------- equipment */

export type EquipmentCategory =
  | "video"
  | "led"
  | "lighting"
  | "structure"
  | "furniture"
  | "seating"
  | "people";

export const EQUIPMENT_CATEGORY_LABELS: Record<EquipmentCategory, string> = {
  video: "Video",
  led: "LED / Video",
  lighting: "Lighting",
  structure: "Structure",
  furniture: "Furniture",
  seating: "Seating",
  people: "People",
};

export interface EquipmentItem {
  id: string;
  name: string;
  category: EquipmentCategory;
  typeKey: string;
  /** metres */
  width: number;
  depth: number;
  height: number;
  position: Vec3;
  /** degrees around Y */
  rotation: number;
  quantity: number;
  color: string;
  visible: boolean;
  locked: boolean;
}

/* ----------------------------------------------------------------- layers */

export type LayerKey =
  | "stage"
  | "led"
  | "video"
  | "lighting"
  | "structure"
  | "furniture"
  | "seating"
  | "people"
  | "audience"
  | "measurements";

export const LAYER_ORDER: LayerKey[] = [
  "stage",
  "led",
  "video",
  "lighting",
  "structure",
  "furniture",
  "seating",
  "people",
  "audience",
  "measurements",
];

export const LAYER_LABELS: Record<LayerKey, string> = {
  stage: "Stage",
  led: "LED",
  video: "Video",
  lighting: "Lighting",
  structure: "Structure",
  furniture: "Furniture",
  seating: "Seating",
  people: "People",
  audience: "Audience",
  measurements: "Measurements",
};

export interface LayerState {
  visible: boolean;
  locked: boolean;
}

export type Layers = Record<LayerKey, LayerState>;

export function defaultLayers(): Layers {
  return LAYER_ORDER.reduce((acc, key) => {
    acc[key] = { visible: true, locked: false };
    return acc;
  }, {} as Layers);
}

export function layerForCategory(category: EquipmentCategory): LayerKey {
  return category;
}

/* ----------------------------------------------------------- measurements */

export interface Measurement {
  id: string;
  label: string;
  from: { x: number; z: number };
  to: { x: number; z: number };
}

/* ------------------------------------------------------------------ stage */

export type StageOrientation = "end" | "thrust" | "corner" | "center";

export const STAGE_ORIENTATION_LABELS: Record<StageOrientation, string> = {
  end: "End stage",
  thrust: "Thrust",
  corner: "Corner",
  center: "In the round",
};

export interface StageConfig {
  width: number;
  depth: number;
  height: number;
  orientation: StageOrientation;
  backWall: boolean;
  backWallHeight: number;
  stairs: boolean;
  podium: boolean;
  audience: boolean;
  fascia: boolean;
  furniture: boolean;
  backdrop: boolean;
  truss: boolean;
  lightingPositions: boolean;
  /** element colours */
  stageColor: string;
  backWallColor: string;
  stairsColor: string;
  podiumColor: string;
  floorColor: string;
  fasciaColor: string;
  trussColor: string;
}

/* ---------------------------------------------------------------- project */

export interface ProjectMeta {
  client: string;
  venue: string;
  eventDate: string;
  notes: string;
  units: UnitSystem;
}

export function defaultMeta(): ProjectMeta {
  return { client: "", venue: "", eventDate: "", notes: "", units: "metric" };
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  meta: ProjectMeta;
  stage: StageConfig;
  canvas: CanvasConfig;
  screens: LedScreen[];
  equipment: EquipmentItem[];
  layers: Layers;
  measurements: Measurement[];
  /** available video processors, including user-added models */
  processors: ProcessorModel[];
  extensions: Record<string, unknown>;
  schemaVersion: number;
}

export const SCHEMA_VERSION = 2;

export function defaultStage(): StageConfig {
  return {
    width: 15,
    depth: 6,
    height: 0.6,
    orientation: "end",
    backWall: true,
    backWallHeight: 7,
    stairs: true,
    podium: false,
    audience: true,
    fascia: true,
    furniture: false,
    backdrop: false,
    truss: true,
    lightingPositions: true,
    stageColor: "#2a323f",
    backWallColor: "#3a2a4d",
    stairsColor: "#c2762a",
    podiumColor: "#1f5f5b",
    floorColor: "#080a10",
    fasciaColor: "#12161f",
    trussColor: "#8b93a7",
  };
}

export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}

export function createProject(name: string, overrides: Partial<Project> = {}): Project {
  const now = Date.now();
  return {
    id: uid("prj"),
    name,
    createdAt: now,
    updatedAt: now,
    meta: defaultMeta(),
    stage: defaultStage(),
    canvas: defaultCanvas(),
    screens: [],
    equipment: [],
    layers: defaultLayers(),
    measurements: [],
    processors: DEFAULT_PROCESSORS.map((p) => ({ ...p })),
    extensions: {},
    schemaVersion: SCHEMA_VERSION,
    ...overrides,
  };
}

/** fill in fields added after a project was saved — nothing is ever dropped */
export function normalizeProject(project: Project): Project {
  const stage = { ...defaultStage(), ...project.stage };
  const meta = { ...defaultMeta(), ...(project.meta ?? {}) };
  const canvas = { ...defaultCanvas(), ...(project.canvas ?? {}) };
  const layers = { ...defaultLayers(), ...(project.layers ?? {}) };
  const processors = (
    project.processors && project.processors.length > 0
      ? project.processors
      : DEFAULT_PROCESSORS.map((p) => ({ ...p }))
  ).map((p) => {
    const fallback = DEFAULT_PROCESSORS.find((d) => d.id === p.id);
    return {
      ...p,
      outputs: p.outputs ?? fallback?.outputs ?? 4,
      outputWidth: p.outputWidth ?? fallback?.outputWidth ?? 1920,
      outputHeight: p.outputHeight ?? fallback?.outputHeight ?? 1080,
    };
  });

  const screens = (project.screens ?? []).map((s, index) => {
    const panel = s.panelConfiguration ?? { cols: 1, rows: 1, show: false };
    const panelWidth = panel.panelWidth ?? +(s.physicalWidth / Math.max(1, panel.cols)).toFixed(3);
    const panelHeight =
      panel.panelHeight ?? +(s.physicalHeight / Math.max(1, panel.rows)).toFixed(3);
    return {
      ...s,
      processorId: s.processorId ?? processors[0]!.id,
      processorOutput: s.processorOutput ?? 1,
      content: s.content ?? { x: 0, y: 0, width: s.pixelWidth, height: s.pixelHeight },
      gridOrder: s.gridOrder ?? index + 1,
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

  return {
    ...project,
    meta,
    stage,
    canvas,
    layers,
    processors,
    screens,
    equipment: project.equipment ?? [],
    measurements: project.measurements ?? [],
    extensions: project.extensions ?? {},
    schemaVersion: SCHEMA_VERSION,
  };
}
