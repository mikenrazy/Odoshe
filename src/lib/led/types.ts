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
  /** model designation, e.g. "VX1000" */
  label: string;
  /** user-facing instance name, e.g. "VX1000 #2 (Stage Left)" */
  name?: string;
  /** catalogue key this instance was created from */
  modelKey?: string;
  /** maximum output pixels the processor can drive */
  maxPixels: number;
  /** number of physical LED outputs (ports) */
  outputs: number;
  /** max resolution of a single output */
  outputWidth: number;
  outputHeight: number;
  /** configured source resolution coming from the laptop / Mac */
  inputWidth?: number;
  inputHeight?: number;
  /** supported source resolution envelope */
  minInputWidth?: number;
  minInputHeight?: number;
  maxInputWidth?: number;
  maxInputHeight?: number;
  builtIn?: boolean;
}

export interface ProcessorCatalogEntry {
  key: string;
  brand: string;
  label: string;
  maxPixels: number;
  outputs: number;
  outputWidth: number;
  outputHeight: number;
  minInputWidth: number;
  minInputHeight: number;
  maxInputWidth: number;
  maxInputHeight: number;
  /** typical source resolutions supported by this processor */
  inputPresets: Array<{ width: number; height: number }>;
}

export const PROCESSOR_CATALOG: ProcessorCatalogEntry[] = [
  {
    key: "vx1000",
    brand: "NovaStar",
    label: "VX1000",
    maxPixels: 6_500_000,
    outputs: 10,
    outputWidth: 4096,
    outputHeight: 1080,
    minInputWidth: 1920,
    minInputHeight: 1080,
    maxInputWidth: 3840,
    maxInputHeight: 1080,
    inputPresets: [
      { width: 1920, height: 1080 },
      { width: 2048, height: 1152 },
      { width: 2560, height: 1080 },
      { width: 3200, height: 1080 },
      { width: 3840, height: 1080 },
    ],
  },
  {
    key: "vx600",
    brand: "NovaStar",
    label: "VX600",
    maxPixels: 3_900_000,
    outputs: 6,
    outputWidth: 4096,
    outputHeight: 1080,
    minInputWidth: 1024,
    minInputHeight: 640,
    maxInputWidth: 1920,
    maxInputHeight: 1200,
    inputPresets: [
      { width: 1280, height: 720 },
      { width: 1600, height: 900 },
      { width: 1920, height: 1080 },
      { width: 1920, height: 1200 },
    ],
  },
  {
    key: "vdwall",
    brand: "VDWall",
    label: "VDWall",
    maxPixels: 2_300_000,
    outputs: 4,
    outputWidth: 1920,
    outputHeight: 1080,
    minInputWidth: 1024,
    minInputHeight: 640,
    maxInputWidth: 1920,
    maxInputHeight: 1080,
    inputPresets: [
      { width: 1280, height: 720 },
      { width: 1920, height: 1080 },
    ],
  },
];

export function processorFromCatalog(entry: ProcessorCatalogEntry, id: string, name?: string): ProcessorModel {
  return {
    id,
    modelKey: entry.key,
    brand: entry.brand,
    label: entry.label,
    name: name ?? `${entry.brand} ${entry.label}`,
    maxPixels: entry.maxPixels,
    outputs: entry.outputs,
    outputWidth: entry.outputWidth,
    outputHeight: entry.outputHeight,
    inputWidth: entry.inputPresets[entry.inputPresets.length - 1]!.width,
    inputHeight: entry.inputPresets[entry.inputPresets.length - 1]!.height,
    minInputWidth: entry.minInputWidth,
    minInputHeight: entry.minInputHeight,
    maxInputWidth: entry.maxInputWidth,
    maxInputHeight: entry.maxInputHeight,
  };
}

/** display name for a processor instance (falls back to brand + model) */
export function processorName(p: ProcessorModel | undefined) {
  if (!p) return "Unassigned";
  return p.name?.trim() || `${p.brand} ${p.label}`;
}

export const DEFAULT_PROCESSORS: ProcessorModel[] = PROCESSOR_CATALOG.map((entry) =>
  processorFromCatalog(entry, entry.key),
).map((p) => ({ ...p, builtIn: true }));

/* ---------------------------------------------------------- canvas/output */

export type AspectPreset = "16:9" | "32:9" | "custom";

export interface CanvasConfig {
  width: number;
  height: number;
  aspectPreset: AspectPreset;
  refreshRate: number;
  outputs: number;
  /** processor instance whose source resolution drives this canvas */
  sourceProcessorId?: string;
}

export const RESOLUTION_PRESETS: Array<{ key: string; label: string; width: number; height: number }> =
  [
    { key: "1280x720", label: "1280 × 720", width: 1280, height: 720 },
    { key: "1920x1080", label: "1920 × 1080", width: 1920, height: 1080 },
    { key: "1920x1200", label: "1920 × 1200", width: 1920, height: 1200 },
    { key: "2048x1152", label: "2048 × 1152", width: 2048, height: 1152 },
    { key: "2560x1080", label: "2560 × 1080", width: 2560, height: 1080 },
    { key: "3200x1080", label: "3200 × 1080", width: 3200, height: 1080 },
    { key: "3840x1080", label: "3840 × 1080", width: 3840, height: 1080 },
    { key: "custom", label: "Custom", width: 0, height: 0 },
  ];

export function defaultCanvas(): CanvasConfig {
  return { width: 3840, height: 1080, aspectPreset: "32:9", refreshRate: 60, outputs: 2 };
}

/** groups several physically separate LED sections into one logical output */
export interface ScreenGroup {
  id: string;
  name: string;
  /** treat the grouped sections as one continuous surface on one RJ45 port */
  continuous: boolean;
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
  /** cabinet specification key from CABINET_CATALOG (source of truth for resolution) */
  cabinetKey?: string | undefined;
  /** when true the operator pinned a manual resolution instead of the derived one */
  resolutionOverride?: boolean | undefined;
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
  /**
   * Logical output number on the processor's canvas/layer mapping.
   * This is NOT the physical connector — see `rj45Port`.
   */
  processorOutput: number;
  /**
   * Physical RJ45 / LAN port on the back of the processor that feeds this
   * screen. `OUT 10` in the UI always means RJ45 Port 10 — never panel 10,
   * cabinet 10 or screen 10.
   */
  rj45Port: number;
  /**
   * How many consecutive RJ45 ports this screen consumes, starting at
   * `rj45Port`. A wall wider than one port's capacity is split by cabinet
   * columns across `portSpan` ports.
   */
  portSpan?: number;
  /** slice of the content canvas shown on this screen */
  content: ContentRegion;
  /** optional image (data URL) shown as content on the LED surface in 3D */
  contentImage?: string | undefined;
  /** IndexedDB key holding `contentImage` (kept out of localStorage) */
  contentAssetId?: string | undefined;
  visible: boolean;
  locked: boolean;
  /** stable ordering within its processor's continuous grid numbering */
  gridOrder?: number;
  /** id of the ScreenGroup this section belongs to (one logical screen/output) */
  groupId?: string | undefined;
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

/* ------------------------------------------------------- content canvas media */

export type MediaKind = "image" | "video" | "text" | "shape";

export interface MediaItem {
  id: string;
  kind: MediaKind;
  name: string;
  /** data URL for image/video media */
  src?: string | undefined;
  /** IndexedDB key holding `src` (kept out of localStorage) */
  assetId?: string | undefined;
  /** copy for text media */
  text?: string | undefined;
  color: string;
  fontSize: number;
  /** pixel coordinates on the content canvas */
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  /** stacking order, higher paints later */
  z: number;
  visible: boolean;
  /** how the media fits its frame */
  fit: "cover" | "contain" | "stretch";
}

export function createMediaItem(patch: Partial<MediaItem> = {}): MediaItem {
  return {
    id: uid("media"),
    kind: "shape",
    name: "Media",
    color: "#ff9d2e",
    fontSize: 160,
    x: 0,
    y: 0,
    width: 640,
    height: 360,
    opacity: 1,
    z: 0,
    visible: true,
    fit: "cover",
    ...patch,
  };
}

/* ------------------------------------------------------------------ stage */

export type StageOrientation = "end" | "thrust" | "corner" | "center";

export const STAGE_ORIENTATION_LABELS: Record<StageOrientation, string> = {
  end: "End stage",
  thrust: "Thrust",
  corner: "Corner",
  center: "In the round",
};

/* ------------------------------------------------- stage element styling */

export type StagePlacement =
  | "left"
  | "center"
  | "right"
  | "front"
  | "back"
  | "front-left"
  | "front-right"
  | "back-left"
  | "back-right"
  | "custom";

export const STAGE_PLACEMENT_LABELS: Record<StagePlacement, string> = {
  left: "Stage left",
  center: "Center",
  right: "Stage right",
  front: "Downstage (front)",
  back: "Upstage (back)",
  "front-left": "Front left",
  "front-right": "Front right",
  "back-left": "Back left",
  "back-right": "Back right",
  custom: "Custom (offsets)",
};

export type StageElementKey =
  | "stairs"
  | "podium"
  | "furniture"
  | "truss"
  | "backdrop"
  | "fascia";

export const STAGE_ELEMENT_LABELS: Record<StageElementKey, string> = {
  stairs: "Stairs",
  podium: "Podium / Lectern",
  furniture: "Furniture",
  truss: "Truss",
  backdrop: "Backdrop",
  fascia: "Fascia",
};

export interface StageElementSetup {
  /** visual style variation key */
  style: string;
  placement: StagePlacement;
  /** metres, applied on top of the placement anchor */
  offsetX: number;
  offsetZ: number;
  /** metres above the stage deck */
  elevation: number;
  /** degrees around Y */
  rotation: number;
  /** uniform size multiplier */
  scale: number;
}

export const STAGE_ELEMENT_STYLES: Record<
  StageElementKey,
  Array<{ value: string; label: string }>
> = {
  stairs: [
    { value: "straight", label: "Straight run" },
    { value: "wide", label: "Wide feature" },
    { value: "dual", label: "Dual side flights" },
    { value: "wrap", label: "Full-width wrap" },
    { value: "glow", label: "Glow-nosing" },
  ],
  podium: [
    { value: "modern", label: "Modern block" },
    { value: "classic", label: "Classic lectern" },
    { value: "acrylic", label: "Acrylic" },
    { value: "led", label: "LED front" },
  ],
  furniture: [
    { value: "lounge", label: "Lounge cubes" },
    { value: "panel", label: "Panel chairs + table" },
    { value: "stools", label: "Bar stools" },
    { value: "roundtable", label: "Round table" },
  ],
  truss: [
    { value: "goalpost", label: "Goalpost" },
    { value: "box", label: "Box / four post" },
    { value: "arch", label: "Arch" },
    { value: "grid", label: "Grid ladder" },
  ],
  backdrop: [
    { value: "flat", label: "Flat panel" },
    { value: "drape", label: "Pleated drape" },
    { value: "cyc", label: "Curved cyc" },
    { value: "frame", label: "Framed header" },
  ],
  fascia: [
    { value: "matte", label: "Matte skirt" },
    { value: "pleated", label: "Pleated skirt" },
    { value: "ledtape", label: "LED tape edge" },
    { value: "brand", label: "Branded panel" },
  ],
};

export function defaultStageElement(key: StageElementKey): StageElementSetup {
  const base: StageElementSetup = {
    style: STAGE_ELEMENT_STYLES[key][0]!.value,
    placement: "center",
    offsetX: 0,
    offsetZ: 0,
    elevation: 0,
    rotation: 0,
    scale: 1,
  };
  if (key === "stairs") return { ...base, placement: "front" };
  if (key === "podium") return { ...base, placement: "front-right" };
  if (key === "furniture") return { ...base, placement: "front-left" };
  if (key === "truss" || key === "backdrop") return { ...base, placement: "back" };
  if (key === "fascia") return { ...base, placement: "front" };
  return base;
}

export function defaultStageElements(): Record<StageElementKey, StageElementSetup> {
  return {
    stairs: defaultStageElement("stairs"),
    podium: defaultStageElement("podium"),
    furniture: defaultStageElement("furniture"),
    truss: defaultStageElement("truss"),
    backdrop: defaultStageElement("backdrop"),
    fascia: defaultStageElement("fascia"),
  };
}

/* --------------------------------------------- stage shape / finish / risers */

export type StageShape =
  | "rectangle"
  | "thrust"
  | "runway"
  | "tshape"
  | "round"
  | "curved-front";

export const STAGE_SHAPES: Array<{ value: StageShape; label: string }> = [
  { value: "rectangle", label: "Rectangular" },
  { value: "thrust", label: "Thrust" },
  { value: "runway", label: "Runway / catwalk" },
  { value: "tshape", label: "T-shape" },
  { value: "round", label: "Circular (in the round)" },
  { value: "curved-front", label: "Curved front" },
];

export type StageDeckFinish = "matte" | "gloss" | "carpet" | "wood" | "ledfloor";

export const STAGE_DECK_FINISHES: Array<{ value: StageDeckFinish; label: string }> = [
  { value: "matte", label: "Matte black deck" },
  { value: "gloss", label: "High gloss" },
  { value: "carpet", label: "Carpet" },
  { value: "wood", label: "Wood / parquet" },
  { value: "ledfloor", label: "LED floor" },
];

export interface StageRiser {
  id: string;
  name: string;
  /** stage-local metres */
  x: number;
  z: number;
  width: number;
  depth: number;
  /** height above the main deck */
  height: number;
  rotation: number;
  color: string;
}

export interface StageConfig {
  width: number;
  depth: number;
  height: number;
  orientation: StageOrientation;
  /** deck footprint type (optional on legacy projects) */
  shape?: StageShape;
  /** deck surface material (optional on legacy projects) */
  deckFinish?: StageDeckFinish;
  /** multi-level riser platforms on top of the deck */
  risers?: StageRiser[];
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
  /** per-element style + placement setups (optional on legacy projects) */
  elements?: Partial<Record<StageElementKey, StageElementSetup>>;
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
  /** media placed on the digital content canvas */
  media: MediaItem[];
  /** available video processors, including user-added models */
  processors: ProcessorModel[];
  /** logical groupings of LED sections (one continuous screen / output) */
  groups: ScreenGroup[];

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
    shape: "rectangle",
    deckFinish: "matte",
    risers: [],

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
    elements: defaultStageElements(),

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
    media: [],
    processors: DEFAULT_PROCESSORS.map((p) => ({ ...p })),
    groups: [],

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
    const catalog =
      PROCESSOR_CATALOG.find((d) => d.key === (p.modelKey ?? p.id)) ??
      PROCESSOR_CATALOG.find((d) => d.label === p.label);
    return {
      ...p,
      name: p.name ?? `${p.brand} ${p.label}`,
      modelKey: p.modelKey ?? catalog?.key ?? p.id,
      outputs: p.outputs ?? catalog?.outputs ?? 4,
      outputWidth: p.outputWidth ?? catalog?.outputWidth ?? 1920,
      outputHeight: p.outputHeight ?? catalog?.outputHeight ?? 1080,
      inputWidth: p.inputWidth ?? catalog?.maxInputWidth ?? 1920,
      inputHeight: p.inputHeight ?? catalog?.maxInputHeight ?? 1080,
      minInputWidth: p.minInputWidth ?? catalog?.minInputWidth ?? 640,
      minInputHeight: p.minInputHeight ?? catalog?.minInputHeight ?? 360,
      maxInputWidth: p.maxInputWidth ?? catalog?.maxInputWidth ?? 1920,
      maxInputHeight: p.maxInputHeight ?? catalog?.maxInputHeight ?? 1080,
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
      rj45Port: s.rj45Port ?? s.processorOutput ?? 1,
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
    groups: project.groups ?? [],
    screens,
    equipment: project.equipment ?? [],
    measurements: project.measurements ?? [],
    media: (project.media ?? []).map((m, i) => ({ ...m, z: m.z ?? i })),
    extensions: project.extensions ?? {},
    schemaVersion: SCHEMA_VERSION,
  };
}
