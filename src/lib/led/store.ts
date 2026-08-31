import { create } from "zustand";
import {
  createProject,
  defaultCanvas,
  defaultStage,
  normalizeProject,
  SCHEMA_VERSION,
  uid,
  type CanvasConfig,
  type EquipmentItem,
  type LayerKey,
  type LedScreen,
  type Measurement,
  type ProcessorModel,
  type Project,
  type ProjectMeta,
  type StageConfig,
} from "./types";
import { createEquipment, EQUIPMENT_LIBRARY } from "./equipment";
import { defaultScreen, screenFromPreset, SCREEN_PRESETS } from "./presets";

const STORAGE_KEY = "dx5ve.led-designer.projects.v1";

export type ViewportMode = "design" | "configuration" | "preview";
export type Workspace = "stage" | "mapping" | "plan";
export type TransformMode = "translate" | "rotate" | "scale";
export type CameraView =
  | "front"
  | "rear"
  | "left"
  | "right"
  | "top"
  | "perspective"
  | "reset"
  | "focus";

export interface CameraCommand {
  view: CameraView;
  nonce: number;
}

export interface ProjectSetup {
  name: string;
  client: string;
  venue: string;
  eventDate: string;
  notes: string;
  units: "metric" | "imperial";
  stageWidth: number;
  stageDepth: number;
  stageHeight: number;
  aspectPreset: CanvasConfig["aspectPreset"];
  canvasWidth: number;
  canvasHeight: number;
  pixelPitch: number;
  processorId: string;
  outputs: number;
}

function isBrowser() {
  return typeof window !== "undefined";
}

export function loadProjects(): Project[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Project[];
    return Array.isArray(parsed) ? parsed.map(normalizeProject) : [];
  } catch {
    return [];
  }
}

function persist(projects: Project[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

function equip(typeKey: string, patch: Partial<EquipmentItem>) {
  const def = EQUIPMENT_LIBRARY.find((e) => e.key === typeKey)!;
  return createEquipment(def, patch);
}

/** Default test project: CIO Africa — 15 m stage, 13 × 3 m centre LED, 3840 × 1080. */
export function createSampleProject(): Project {
  const project = createProject("CIO Africa");
  project.meta = {
    client: "CIO Africa",
    venue: "Nairobi",
    eventDate: "",
    notes: "Reference build: 15 m stage, 13 × 3 m centre LED, NovaStar VX1000.",
    units: "metric",
  };
  project.stage = { ...defaultStage(), width: 15, depth: 6, height: 0.6, backWallHeight: 6 };
  project.canvas = { ...defaultCanvas(), width: 3840, height: 1080, aspectPreset: "16:9" };

  const center = screenFromPreset(SCREEN_PRESETS[0]!, 0, {
    name: "CENTER LED",
    type: "flat",
    physicalWidth: 13,
    physicalHeight: 3,
    pixelWidth: 3328,
    pixelHeight: 768,
    pixelPitch: 3.906,
    position: { x: 0, y: 0.6 + 3 / 2, z: -2.7 },
    processorId: "vx1000",
    processorOutput: 1,
    content: { x: 0, y: 0, width: 3328, height: 768 },
    panelConfiguration: {
      cols: 26,
      rows: 6,
      show: true,
      panelWidth: 0.5,
      panelHeight: 0.5,
      sizeKey: "0.5x0.5",
    },
  });

  project.screens = [center];
  project.equipment = [
    equip("camera", { position: { x: 0, y: 1.4, z: 9 }, name: "Camera 1 — Wide" }),
    equip("camera", { position: { x: -5, y: 1.4, z: 7 }, rotation: 25, name: "Camera 2" }),
    equip("goalpost-truss", { position: { x: 0, y: 0, z: -3.4 }, width: 16, height: 7 }),
    equip("moving-head", { position: { x: -4, y: 6.2, z: -1 } }),
    equip("moving-head", { position: { x: 0, y: 6.2, z: -1 } }),
    equip("moving-head", { position: { x: 4, y: 6.2, z: -1 } }),
    equip("novastar-vx1000", { position: { x: 8, y: 0.9, z: 8 } }),
    equip("lectern", { position: { x: 5, y: 0.6, z: 0.5 } }),
  ];
  project.measurements = [
    { id: uid("ms"), label: "Stage width", from: { x: -7.5, z: 3.6 }, to: { x: 7.5, z: 3.6 } },
    { id: uid("ms"), label: "Centre LED", from: { x: -6.5, z: -3.4 }, to: { x: 6.5, z: -3.4 } },
  ];
  return project;
}

/** Seed example project on first run so the app is never empty. */
export function ensureSeed(): Project[] {
  const existing = loadProjects();
  if (existing.length > 0) return existing;
  const project = createSampleProject();
  persist([project]);
  return [project];
}

interface EditorState {
  projects: Project[];
  project: Project | null;
  selectedId: string | null;
  selectedEquipmentId: string | null;
  mode: ViewportMode;
  workspace: Workspace;
  transformMode: TransformMode;
  showMeasurements: boolean;
  snapToGrid: boolean;
  camera: CameraCommand;
  status: string;
  lastSavedAt: number | null;
  dirty: boolean;
  past: Project[];
  future: Project[];

  hydrate: () => void;
  newProject: (name: string, setup?: Partial<ProjectSetup>) => Project;
  createSample: () => Project;
  openProject: (id: string) => void;
  closeProject: () => void;
  renameProject: (id: string, name: string) => void;
  duplicateProject: (id: string) => void;
  deleteProject: (id: string) => void;
  save: () => void;

  setMeta: (patch: Partial<ProjectMeta>) => void;
  setCanvas: (patch: Partial<CanvasConfig>) => void;
  setStage: (patch: Partial<StageConfig>) => void;

  addScreen: (presetKey?: string) => void;
  updateScreen: (id: string, patch: Partial<LedScreen>, options?: { history?: boolean }) => void;
  applyPreset: (id: string, presetKey: string) => void;
  addProcessor: (processor: Omit<ProcessorModel, "id">) => void;
  updateProcessor: (id: string, patch: Partial<ProcessorModel>) => void;
  removeProcessor: (id: string) => void;
  deleteScreen: (id: string) => void;
  duplicateScreen: (id: string) => void;
  alignScreens: (axis: "left" | "centerX" | "right" | "top" | "middleY" | "bottom") => void;
  renumberGrids: () => void;
  select: (id: string | null) => void;

  addEquipment: (typeKey: string) => void;
  updateEquipment: (
    id: string,
    patch: Partial<EquipmentItem>,
    options?: { history?: boolean },
  ) => void;
  deleteEquipment: (id: string) => void;
  duplicateEquipment: (id: string) => void;
  selectEquipment: (id: string | null) => void;

  toggleLayer: (key: LayerKey, field: "visible" | "locked") => void;
  addMeasurement: () => void;
  updateMeasurement: (id: string, patch: Partial<Measurement>) => void;
  deleteMeasurement: (id: string) => void;

  setMode: (mode: ViewportMode) => void;
  setWorkspace: (workspace: Workspace) => void;
  setTransformMode: (mode: TransformMode) => void;
  toggleMeasurements: () => void;
  toggleSnap: () => void;
  setCamera: (view: CameraView) => void;
  undo: () => void;
  redo: () => void;
  setStatus: (status: string) => void;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export const useEditor = create<EditorState>((set, get) => {
  function commitProjects(project: Project) {
    const projects = get().projects.map((p) => (p.id === project.id ? project : p));
    persist(projects);
    set({ projects, lastSavedAt: Date.now(), dirty: false });
  }

  function autosave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const project = get().project;
      if (project) commitProjects(project);
    }, 900);
  }

  /** mutate current project, pushing previous state onto the undo stack */
  function mutate(fn: (p: Project) => Project, history = true) {
    const current = get().project;
    if (!current) return;
    const next = { ...fn(current), updatedAt: Date.now() };
    set((s) => ({
      project: next,
      dirty: true,
      past: history ? [...s.past, current].slice(-60) : s.past,
      future: history ? [] : s.future,
    }));
    autosave();
  }

  return {
    projects: [],
    project: null,
    selectedId: null,
    selectedEquipmentId: null,
    mode: "design",
    workspace: "stage",
    transformMode: "translate",
    showMeasurements: true,
    snapToGrid: false,
    camera: { view: "perspective", nonce: 0 },
    status: "Ready",
    lastSavedAt: null,
    dirty: false,
    past: [],
    future: [],

    hydrate: () => set({ projects: ensureSeed() }),

    newProject: (name, setup) => {
      const project = createProject(name || "Untitled Project");
      if (setup) {
        project.meta = {
          ...project.meta,
          client: setup.client ?? "",
          venue: setup.venue ?? "",
          eventDate: setup.eventDate ?? "",
          notes: setup.notes ?? "",
          units: setup.units ?? "metric",
        };
        project.stage = {
          ...project.stage,
          width: setup.stageWidth ?? project.stage.width,
          depth: setup.stageDepth ?? project.stage.depth,
          height: setup.stageHeight ?? project.stage.height,
        };
        project.canvas = {
          ...project.canvas,
          width: setup.canvasWidth ?? project.canvas.width,
          height: setup.canvasHeight ?? project.canvas.height,
          aspectPreset: setup.aspectPreset ?? project.canvas.aspectPreset,
          outputs: setup.outputs ?? project.canvas.outputs,
        };
      }
      const projects = [project, ...get().projects];
      persist(projects);
      set({ projects, status: `Created “${project.name}”` });
      return project;
    },

    createSample: () => {
      const project = createSampleProject();
      const projects = [project, ...get().projects];
      persist(projects);
      set({ projects, status: "Sample project created" });
      return project;
    },

    openProject: (id) => {
      const project = get().projects.find((p) => p.id === id) ?? null;
      set({
        project: project ? { ...normalizeProject(project), schemaVersion: SCHEMA_VERSION } : null,
        selectedId: null,
        selectedEquipmentId: null,
        past: [],
        future: [],
        dirty: false,
        status: project ? `Opened “${project.name}”` : "Project not found",
      });
    },

    closeProject: () => set({ project: null, selectedId: null, past: [], future: [] }),

    renameProject: (id, name) => {
      const projects = get().projects.map((p) =>
        p.id === id ? { ...p, name, updatedAt: Date.now() } : p,
      );
      persist(projects);
      const current = get().project;
      set({
        projects,
        project: current && current.id === id ? { ...current, name } : current,
        status: `Renamed to “${name}”`,
      });
    },

    duplicateProject: (id) => {
      const source = get().projects.find((p) => p.id === id);
      if (!source) return;
      const copy: Project = {
        ...structuredClone(source),
        id: uid("prj"),
        name: `${source.name} (copy)`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const projects = [copy, ...get().projects];
      persist(projects);
      set({ projects, status: `Duplicated “${source.name}”` });
    },

    deleteProject: (id) => {
      const projects = get().projects.filter((p) => p.id !== id);
      persist(projects);
      const current = get().project;
      set({
        projects,
        project: current && current.id === id ? null : current,
        status: "Project deleted",
      });
    },

    save: () => {
      const project = get().project;
      if (!project) return;
      commitProjects(project);
      set({ status: "Project saved" });
    },

    setMeta: (patch) => mutate((p) => ({ ...p, meta: { ...p.meta, ...patch } })),
    setCanvas: (patch) => mutate((p) => ({ ...p, canvas: { ...p.canvas, ...patch } })),
    setStage: (patch) => mutate((p) => ({ ...p, stage: { ...p.stage, ...patch } })),

    addScreen: (presetKey) => {
      const project = get().project;
      if (!project) return;
      const index = project.screens.length;
      const preset = SCREEN_PRESETS.find((p) => p.key === presetKey);
      const screen = preset ? screenFromPreset(preset, index) : defaultScreen(index);
      screen.position = { ...screen.position, x: index === 0 ? 0 : (index % 2 ? -1 : 1) * 6 };
      screen.gridOrder = Math.max(0, ...project.screens.map((s) => s.gridOrder ?? 0)) + 1;
      mutate((p) => ({ ...p, screens: [...p.screens, screen] }));
      set({ selectedId: screen.id, selectedEquipmentId: null, status: `Added ${screen.name}` });
    },

    updateScreen: (id, patch, options) =>
      mutate(
        (p) => ({
          ...p,
          screens: p.screens.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        }),
        options?.history !== false,
      ),

    applyPreset: (id, presetKey) => {
      const preset = SCREEN_PRESETS.find((p) => p.key === presetKey);
      if (!preset) return;
      mutate((p) => ({
        ...p,
        screens: p.screens.map((s) =>
          s.id === id
            ? {
                ...s,
                type: preset.type,
                physicalWidth: preset.physicalWidth,
                physicalHeight: preset.physicalHeight,
                pixelWidth: preset.pixelWidth,
                pixelHeight: preset.pixelHeight,
                pixelPitch: preset.pixelPitch,
                content: { ...s.content, width: preset.pixelWidth, height: preset.pixelHeight },
                panelConfiguration: {
                  ...s.panelConfiguration,
                  cols: preset.panelCols,
                  rows: preset.panelRows,
                  panelWidth: +(preset.physicalWidth / preset.panelCols).toFixed(3),
                  panelHeight: +(preset.physicalHeight / preset.panelRows).toFixed(3),
                },
                curvature:
                  preset.type === "curved"
                    ? {
                        ...s.curvature,
                        enabled: true,
                        angle: s.curvature.angle || 60,
                        radius:
                          preset.physicalWidth / (((s.curvature.angle || 60) * Math.PI) / 180),
                      }
                    : { ...s.curvature, enabled: false },
              }
            : s,
        ),
      }));
      set({ status: `Applied preset “${preset.label}”` });
    },

    addProcessor: (processor) => {
      const id = uid("proc");
      mutate((p) => ({ ...p, processors: [...p.processors, { ...processor, id }] }));
      set({ status: `Added processor “${processor.label}”` });
    },

    updateProcessor: (id, patch) =>
      mutate((p) => ({
        ...p,
        processors: p.processors.map((proc) => (proc.id === id ? { ...proc, ...patch } : proc)),
      })),

    removeProcessor: (id) => {
      mutate((p) => ({
        ...p,
        processors: p.processors.filter((proc) => proc.id !== id || proc.builtIn),
        screens: p.screens.map((s) =>
          s.processorId === id ? { ...s, processorId: p.processors[0]!.id } : s,
        ),
      }));
      set({ status: "Processor removed" });
    },

    deleteScreen: (id) => {
      const screen = get().project?.screens.find((s) => s.id === id);
      if (screen?.locked) {
        set({ status: `${screen.name} is locked` });
        return;
      }
      mutate((p) => ({ ...p, screens: p.screens.filter((s) => s.id !== id) }));
      set((s) => ({
        selectedId: s.selectedId === id ? null : s.selectedId,
        status: "Screen deleted",
      }));
    },

    duplicateScreen: (id) => {
      const project = get().project;
      const source = project?.screens.find((s) => s.id === id);
      if (!source) return;
      const copy: LedScreen = {
        ...structuredClone(source),
        id: uid("led"),
        name: `${source.name} copy`,
        gridOrder: Math.max(0, ...(project?.screens ?? []).map((s) => s.gridOrder ?? 0)) + 1,
        position: { ...source.position, x: source.position.x + 1 },
      };
      mutate((p) => ({ ...p, screens: [...p.screens, copy] }));
      set({ selectedId: copy.id });
    },

    alignScreens: (axis) => {
      const project = get().project;
      const selected = project?.screens.find((s) => s.id === get().selectedId);
      if (!project || !selected || project.screens.length < 2) return;
      mutate((p) => ({
        ...p,
        screens: p.screens.map((s) => {
          if (s.locked) return s;
          switch (axis) {
            case "left":
              return {
                ...s,
                position: {
                  ...s.position,
                  x: selected.position.x - selected.physicalWidth / 2 + s.physicalWidth / 2,
                },
              };
            case "right":
              return {
                ...s,
                position: {
                  ...s.position,
                  x: selected.position.x + selected.physicalWidth / 2 - s.physicalWidth / 2,
                },
              };
            case "centerX":
              return { ...s, position: { ...s.position, x: selected.position.x } };
            case "top":
              return {
                ...s,
                position: {
                  ...s.position,
                  y: selected.position.y + selected.physicalHeight / 2 - s.physicalHeight / 2,
                },
              };
            case "bottom":
              return {
                ...s,
                position: {
                  ...s.position,
                  y: selected.position.y - selected.physicalHeight / 2 + s.physicalHeight / 2,
                },
              };
            default:
              return { ...s, position: { ...s.position, y: selected.position.y } };
          }
        }),
      }));
      set({ status: `Aligned screens (${axis})` });
    },

    renumberGrids: () => {
      mutate((p) => ({
        ...p,
        screens: [...p.screens]
          .sort((a, b) => a.position.x - b.position.x || b.position.y - a.position.y)
          .map((s, i) => ({ ...s, gridOrder: i + 1 })),
      }));
      set({ status: "Grid numbering reset" });
    },

    select: (id) => set({ selectedId: id, selectedEquipmentId: null }),

    addEquipment: (typeKey) => {
      const def = EQUIPMENT_LIBRARY.find((e) => e.key === typeKey);
      if (!def) return;
      const project = get().project;
      if (!project) return;
      const item = createEquipment(def, {
        position: {
          x: +(Math.random() * 4 - 2).toFixed(2),
          y: def.baseY ?? 0,
          z: def.category === "lighting" || def.category === "structure" ? -1 : 4,
        },
      });
      mutate((p) => ({ ...p, equipment: [...p.equipment, item] }));
      set({ selectedEquipmentId: item.id, selectedId: null, status: `Added ${item.name}` });
    },

    updateEquipment: (id, patch, options) =>
      mutate(
        (p) => ({
          ...p,
          equipment: p.equipment.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        }),
        options?.history !== false,
      ),

    deleteEquipment: (id) => {
      mutate((p) => ({ ...p, equipment: p.equipment.filter((e) => e.id !== id) }));
      set((s) => ({
        selectedEquipmentId: s.selectedEquipmentId === id ? null : s.selectedEquipmentId,
        status: "Equipment removed",
      }));
    },

    duplicateEquipment: (id) => {
      const source = get().project?.equipment.find((e) => e.id === id);
      if (!source) return;
      const copy: EquipmentItem = {
        ...structuredClone(source),
        id: uid("eq"),
        position: { ...source.position, x: source.position.x + 1 },
      };
      mutate((p) => ({ ...p, equipment: [...p.equipment, copy] }));
      set({ selectedEquipmentId: copy.id });
    },

    selectEquipment: (id) => set({ selectedEquipmentId: id, selectedId: null }),

    toggleLayer: (key, field) =>
      mutate((p) => ({
        ...p,
        layers: { ...p.layers, [key]: { ...p.layers[key], [field]: !p.layers[key][field] } },
      })),

    addMeasurement: () => {
      const project = get().project;
      if (!project) return;
      const half = project.stage.width / 2;
      const item: Measurement = {
        id: uid("ms"),
        label: "Measurement",
        from: { x: -half, z: project.stage.depth / 2 + 1 },
        to: { x: half, z: project.stage.depth / 2 + 1 },
      };
      mutate((p) => ({ ...p, measurements: [...p.measurements, item] }));
      set({ status: "Measurement added" });
    },

    updateMeasurement: (id, patch) =>
      mutate((p) => ({
        ...p,
        measurements: p.measurements.map((m) => (m.id === id ? { ...m, ...patch } : m)),
      })),

    deleteMeasurement: (id) =>
      mutate((p) => ({ ...p, measurements: p.measurements.filter((m) => m.id !== id) })),

    setMode: (mode) => set({ mode }),
    setWorkspace: (workspace) => set({ workspace }),
    setTransformMode: (transformMode) => set({ transformMode }),
    toggleMeasurements: () => set((s) => ({ showMeasurements: !s.showMeasurements })),
    toggleSnap: () => set((s) => ({ snapToGrid: !s.snapToGrid })),
    setCamera: (view) => set((s) => ({ camera: { view, nonce: s.camera.nonce + 1 } })),

    undo: () => {
      const { past, project } = get();
      const previous = past[past.length - 1];
      if (!previous || !project) return;
      set({
        project: previous,
        past: past.slice(0, -1),
        future: [project, ...get().future].slice(0, 60),
        dirty: true,
        status: "Undo",
      });
      autosave();
    },

    redo: () => {
      const { future, project } = get();
      const next = future[0];
      if (!next || !project) return;
      set({
        project: next,
        future: future.slice(1),
        past: [...get().past, project],
        dirty: true,
        status: "Redo",
      });
      autosave();
    },

    setStatus: (status) => set({ status }),
  };
});
