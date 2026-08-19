import { create } from "zustand";
import {
  createProject,
  defaultStage,
  normalizeProject,
  SCHEMA_VERSION,
  uid,
  type ProcessorModel,
  type LedScreen,
  type Project,
  type StageConfig,
} from "./types";
import { defaultScreen, screenFromPreset, SCREEN_PRESETS } from "./presets";

const STORAGE_KEY = "dx5ve.led-designer.projects.v1";

export type ViewportMode = "design" | "configuration" | "preview";
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

/** Seed example project on first run so the app is never empty. */
export function ensureSeed(): Project[] {
  const existing = loadProjects();
  if (existing.length > 0) return existing;
  const project = createProject("Connected Africa 2026");
  project.stage = { ...defaultStage(), width: 14, depth: 6, height: 0.5 };
  const center = screenFromPreset(SCREEN_PRESETS[0]!, 0, {
    name: "CENTER LED",
    position: { x: 0, y: 3.4, z: -2.8 },
  });
  const left = screenFromPreset(SCREEN_PRESETS[1]!, 1, {
    name: "LEFT LED",
    position: { x: -6.4, y: 3.4, z: -2.2 },
    rotation: { x: 0, y: 22, z: 0 },
  });
  const right = screenFromPreset(SCREEN_PRESETS[1]!, 2, {
    name: "RIGHT LED",
    position: { x: 6.4, y: 3.4, z: -2.2 },
    rotation: { x: 0, y: -22, z: 0 },
  });
  project.screens = [left, center, right];
  persist([project]);
  return [project];
}

interface EditorState {
  projects: Project[];
  project: Project | null;
  selectedId: string | null;
  mode: ViewportMode;
  transformMode: TransformMode;
  showMeasurements: boolean;
  camera: CameraCommand;
  status: string;
  lastSavedAt: number | null;
  dirty: boolean;
  past: Project[];
  future: Project[];

  hydrate: () => void;
  newProject: (name: string) => Project;
  openProject: (id: string) => void;
  closeProject: () => void;
  renameProject: (id: string, name: string) => void;
  duplicateProject: (id: string) => void;
  deleteProject: (id: string) => void;
  save: () => void;

  setStage: (patch: Partial<StageConfig>) => void;
  addScreen: (presetKey?: string) => void;
  updateScreen: (id: string, patch: Partial<LedScreen>, options?: { history?: boolean }) => void;
  applyPreset: (id: string, presetKey: string) => void;
  addProcessor: (processor: Omit<ProcessorModel, "id">) => void;
  removeProcessor: (id: string) => void;
  deleteScreen: (id: string) => void;
  duplicateScreen: (id: string) => void;
  renumberGrids: () => void;
  select: (id: string | null) => void;

  setMode: (mode: ViewportMode) => void;
  setTransformMode: (mode: TransformMode) => void;
  toggleMeasurements: () => void;
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
    mode: "design",
    transformMode: "translate",
    showMeasurements: true,
    camera: { view: "perspective", nonce: 0 },
    status: "Ready",
    lastSavedAt: null,
    dirty: false,
    past: [],
    future: [],

    hydrate: () => set({ projects: ensureSeed() }),

    newProject: (name) => {
      const project = createProject(name || "Untitled Project");
      const projects = [project, ...get().projects];
      persist(projects);
      set({ projects, status: `Created “${project.name}”` });
      return project;
    },

    openProject: (id) => {
      const project = get().projects.find((p) => p.id === id) ?? null;
      set({
        project: project ? { ...normalizeProject(project), schemaVersion: SCHEMA_VERSION } : null,
        selectedId: null,
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

    setStage: (patch) => mutate((p) => ({ ...p, stage: { ...p.stage, ...patch } })),

    addScreen: (presetKey) => {
      const project = get().project;
      if (!project) return;
      const index = project.screens.length;
      const preset = SCREEN_PRESETS.find((p) => p.key === presetKey);
      const screen = preset ? screenFromPreset(preset, index) : defaultScreen(index);
      screen.position = { ...screen.position, x: index === 0 ? 0 : (index % 2 ? -1 : 1) * 6 };
      screen.gridOrder =
        Math.max(0, ...project.screens.map((s) => s.gridOrder ?? 0)) + 1;
      mutate((p) => ({ ...p, screens: [...p.screens, screen] }));
      set({ selectedId: screen.id, status: `Added ${screen.name}` });
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
                panelConfiguration: {
                  ...s.panelConfiguration,
                  cols: preset.panelCols,
                  rows: preset.panelRows,
                },
                curvature:
                  preset.type === "curved"
                    ? {
                        ...s.curvature,
                        enabled: true,
                        angle: s.curvature.angle || 60,
                        radius:
                          preset.physicalWidth /
                          (((s.curvature.angle || 60) * Math.PI) / 180),
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

    renumberGrids: () => {
      mutate((p) => ({
        ...p,
        screens: [...p.screens]
          .sort((a, b) => a.position.x - b.position.x || b.position.y - a.position.y)
          .map((s, i) => ({ ...s, gridOrder: i + 1 }))
          .reduce<typeof p.screens>((acc, s) => {
            acc.push(s);
            return acc;
          }, []),
      }));
      set({ status: "Grid numbering reset" });
    },

    select: (id) => set({ selectedId: id }),
    setMode: (mode) => set({ mode }),
    setTransformMode: (transformMode) => set({ transformMode }),
    toggleMeasurements: () => set((s) => ({ showMeasurements: !s.showMeasurements })),
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
