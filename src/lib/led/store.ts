import { mirroredScreen } from "./mirror";
import { packedCanvas } from "./engineering";
import { create } from "zustand";
import { getAssets, backupProjects, restoreProjects } from "./asset-store";
import {
  createMediaItem,
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
  type MediaItem,
  type ProcessorModel,
  type ScreenGroup,
  PROCESSOR_CATALOG,
  processorFromCatalog,
  type Project,
  type ProjectMeta,
  type StageConfig,
  type StageRiser,

} from "./types";
import { createEquipment, EQUIPMENT_LIBRARY } from "./equipment";
import { withDerivedResolution, derivedResolution, CABINET_CATALOG, fitCabinets } from "./resolution";
import { createRiser, STAGE_PRESETS } from "./stage-shapes";
import { planPortDistribution } from "./ports";

import { defaultScreen, screenFromPreset, SCREEN_PRESETS } from "./presets";
import { buildLayout, type LayoutKind } from "./layouts";

const STORAGE_KEY = "dx5ve.led-designer.projects.v1";

export type ViewportMode = "design" | "configuration" | "preview";
export type Workspace = "stage" | "canvas" | "mapping" | "plan";
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

/**
 * Strip heavy base64 payloads before writing to localStorage.
 * Payloads that have an `assetId` live in IndexedDB and are restored on hydrate,
 * so dropping the inline copy here is lossless.
 */
function stripHeavyMedia(projects: Project[]): Project[] {
  return projects.map((p) => ({
    ...p,
    meta: {
      ...p.meta,
      ...(p.meta.coverImage && p.meta.coverImage.length > 4000 && p.meta.coverAssetId
        ? { coverImage: undefined }
        : {}),
      ...(p.meta.reportLogo && p.meta.reportLogo.length > 4000 && p.meta.reportLogoAssetId
        ? { reportLogo: undefined }
        : {}),
    },
    screens: p.screens.map((s) =>
      s.contentImage && s.contentImage.length > 4000
        ? { ...s, contentImage: s.contentAssetId ? undefined : s.contentImage }
        : s,
    ),
    media: (p.media ?? []).map((m) =>
      m.src && m.src.length > 4000 ? { ...m, src: m.assetId ? undefined : m.src } : m,
    ),
  })) as Project[];
}

/** Always drop asset-backed payloads: they are re-read from IndexedDB. */
function forStorage(projects: Project[]): Project[] {
  return projects.map((p) => ({
    ...p,
    meta: {
      ...p.meta,
      ...(p.meta.coverAssetId ? { coverImage: undefined } : {}),
      ...(p.meta.reportLogoAssetId ? { reportLogo: undefined } : {}),
    },
    screens: p.screens.map((s) => (s.contentAssetId ? { ...s, contentImage: undefined } : s)),
    media: (p.media ?? []).map((m) => (m.assetId ? { ...m, src: undefined } : m)),
  })) as Project[];
}

/** Re-attach IndexedDB payloads to a project's media and screen content. */
export async function rehydrateAssets(project: Project): Promise<Project> {
  const ids = [
    ...(project.meta.coverAssetId && !project.meta.coverImage ? [project.meta.coverAssetId] : []),
    ...(project.meta.reportLogoAssetId && !project.meta.reportLogo ? [project.meta.reportLogoAssetId] : []),
    ...(project.media ?? []).filter((m) => m.assetId && !m.src).map((m) => m.assetId!),
    ...project.screens.filter((s) => s.contentAssetId && !s.contentImage).map((s) => s.contentAssetId!),
  ];
  if (ids.length === 0) return project;
  const assets = await getAssets([...new Set(ids)]);
  return {
    ...project,
    meta: {
      ...project.meta,
      ...(project.meta.coverAssetId && !project.meta.coverImage && assets[project.meta.coverAssetId]
        ? { coverImage: assets[project.meta.coverAssetId] }
        : {}),
      ...(project.meta.reportLogoAssetId && !project.meta.reportLogo && assets[project.meta.reportLogoAssetId]
        ? { reportLogo: assets[project.meta.reportLogoAssetId] }
        : {}),
    },
    media: (project.media ?? []).map((m) =>
      m.assetId && !m.src && assets[m.assetId] ? { ...m, src: assets[m.assetId] } : m,
    ),
    screens: project.screens.map((s) =>
      s.contentAssetId && !s.contentImage && assets[s.contentAssetId]
        ? { ...s, contentImage: assets[s.contentAssetId] }
        : s,
    ),
  };
}

export type PersistResult = { ok: boolean; message?: string };

function persist(projects: Project[], backup = true): PersistResult {
  if (!isBrowser()) return { ok: true };
  const light = JSON.stringify(forStorage(projects));
  // Durable fallback copy — survives localStorage quota failures.
  if (backup) void backupProjects(light);
  try {
    window.localStorage.setItem(STORAGE_KEY, light);
    return { ok: true };
  } catch {
    // Most likely quota exceeded (uploaded images/videos are stored inline).
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stripHeavyMedia(projects)));
      return {
        ok: true,
        message: "Saved — uploaded media was too large for local storage and was not stored",
      };
    } catch {
      return { ok: false, message: "Save failed — browser storage is full" };
    }
  }
}

/** Merge stored projects with in-memory ones, keeping the newest version of each. */
function mergeProjects(stored: Project[], memory: Project[]): Project[] {
  const byId = new Map<string, Project>();
  for (const p of [...stored, ...memory]) {
    const prev = byId.get(p.id);
    if (!prev || (p.updatedAt ?? 0) >= (prev.updatedAt ?? 0)) byId.set(p.id, p);
  }
  return [...byId.values()].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
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
    rj45Port: 10,
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

const SEED_PROJECT_ID = "prj_seed_sample";

/** Seed example project on first run so the app is never empty. */
export function ensureSeed(): Project[] {
  const existing = loadProjects();
  if (existing.length > 0) return existing;
  // Stable id so a re-seed after a storage wipe merges with (not duplicates)
  // the recovered copy from IndexedDB.
  const project = { ...createSampleProject(), id: SEED_PROJECT_ID, updatedAt: 0 };
  // Seeding must not clobber the IndexedDB backup: hydrate() restores from it.
  persist([project], false);
  return [project];
}

/**
 * A grouped set of LED sections behaves as ONE logical screen on one output:
 * the processor's source resolution is divided evenly across the members
 * (left → right), and each member's canvas region + LED resolution is set to
 * its slice, so the whole group reads as a single combined resolution.
 */
function splitGroupInProject(p: Project, groupId: string): Project {
  const members = p.screens
    .filter((s) => s.groupId === groupId)
    .sort((a, b) => a.position.x - b.position.x);
  if (members.length === 0) return p;
  const proc = p.processors.find((pr) => pr.id === members[0]!.processorId);
  const totalW = Math.max(1, Math.round(proc?.inputWidth ?? p.canvas.width));
  const totalH = Math.max(1, Math.round(proc?.inputHeight ?? p.canvas.height));
  const base = Math.floor(totalW / members.length);
  const slices = new Map<string, { x: number; width: number }>();
  let cursor = 0;
  members.forEach((m, i) => {
    const width = i === members.length - 1 ? totalW - cursor : base;
    slices.set(m.id, { x: cursor, width });
    cursor += width;
  });
  return {
    ...p,
    screens: p.screens.map((s) => {
      const slice = slices.get(s.id);
      if (!slice) return s;
      return {
        ...s,
        pixelWidth: slice.width,
        pixelHeight: totalH,
        content: { x: slice.x, y: 0, width: slice.width, height: totalH },
      };
    }),
  };
}

/** Total logical resolution of a group (sum of member slices). */
export function groupResolution(p: Project, groupId: string) {
  const members = p.screens.filter((s) => s.groupId === groupId);
  if (members.length === 0) return null;
  return {
    width: members.reduce((sum, s) => sum + s.pixelWidth, 0),
    height: Math.max(...members.map((s) => s.pixelHeight)),
    count: members.length,
  };
}

interface EditorState {
  projects: Project[];
  project: Project | null;
  selectedId: string | null;
  selectedEquipmentId: string | null;
  selectedMediaId: string | null;
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
  importProject: (project: Project) => Project;
  save: () => void;

  setMeta: (patch: Partial<ProjectMeta>) => void;
  setCanvas: (patch: Partial<CanvasConfig>) => void;
  setPower: (patch: Partial<import("./engineering").PowerSettings>) => void;
  setStage: (patch: Partial<StageConfig>) => void;
  applyStagePreset: (key: string) => void;
  addRiser: (patch?: Partial<StageRiser>) => void;
  updateRiser: (id: string, patch: Partial<StageRiser>) => void;
  removeRiser: (id: string) => void;


  addScreen: (presetKey?: string) => void;
  addLayout: (kind: LayoutKind) => void;
  updateScreen: (id: string, patch: Partial<LedScreen>, options?: { history?: boolean }) => void;
  applyPreset: (id: string, presetKey: string) => void;
  /** re-derive the LED resolution from pixel pitch + cabinet grid */
  syncScreenResolution: (id: string) => void;
  /** apply a catalogue cabinet spec (size + pitch + native resolution) */
  applyCabinetSpec: (id: string, cabinetKey: string) => void;
  addProcessor: (processor: Omit<ProcessorModel, "id">) => void;
  addProcessorInstance: (modelKey: string) => void;
  updateProcessor: (id: string, patch: Partial<ProcessorModel>) => void;
  removeProcessor: (id: string) => void;
  addGroup: (name: string, screenIds?: string[]) => void;
  updateGroup: (id: string, patch: Partial<ScreenGroup>) => void;
  removeGroup: (id: string) => void;
  setScreenGroup: (screenId: string, groupId: string | null) => void;
  splitGroupResolution: (groupId: string) => void;
  autoDistributePorts: (processorId: string) => void;
  applyProcessorSourceToCanvas: (processorId: string) => void;

  deleteScreen: (id: string) => void;
  duplicateScreen: (id: string) => void;
  /** mirrored copy across the stage centre axis (x = 0) */
  mirrorScreen: (id: string) => void;
  /** place every screen side by side on the content canvas (no overlaps) */
  arrangeCanvasSideBySide: () => void;
  alignScreens: (axis: "left" | "centerX" | "right" | "top" | "middleY" | "bottom") => void;
  spaceScreens: (gap: number, direction: "horizontal" | "vertical") => void;
  setGapBetween: (aId: string, bId: string, gap: number) => void;
  renumberGrids: () => void;
  select: (id: string | null) => void;

  addEquipment: (typeKey: string) => void;
  addSeatingRows: (config: {
    typeKey: string;
    rows: number;
    perRow: number;
    rowSpacing: number;
    seatSpacing: number;
    startZ: number;
    section: string;
  }) => void;
  updateEquipment: (
    id: string,
    patch: Partial<EquipmentItem>,
    options?: { history?: boolean },
  ) => void;
  deleteEquipment: (id: string) => void;
  duplicateEquipment: (id: string) => void;
  selectEquipment: (id: string | null) => void;

  toggleLayer: (key: LayerKey, field: "visible" | "locked") => void;
  addMedia: (patch?: Partial<MediaItem>) => void;
  updateMedia: (id: string, patch: Partial<MediaItem>, options?: { history?: boolean }) => void;
  deleteMedia: (id: string) => void;
  selectMedia: (id: string | null) => void;
  raiseMedia: (id: string, direction: 1 | -1) => void;

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
    const known = get().projects;
    const projects = known.some((p) => p.id === project.id)
      ? known.map((p) => (p.id === project.id ? project : p))
      : [project, ...known];
    const merged = mergeProjects(loadProjects(), projects);
    const result = persist(merged);
    set({
      projects: merged,
      lastSavedAt: result.ok ? Date.now() : get().lastSavedAt,
      dirty: !result.ok,
      ...(result.message ? { status: result.message } : {}),
    });

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
    selectedMediaId: null,
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

    hydrate: () => {
      const stored = ensureSeed();
      const current = get().project;
      const memory = current ? [current, ...get().projects] : get().projects;
      set({ projects: mergeProjects(stored, memory) });

      // Recover anything localStorage lost (quota errors, private mode, cleanup).
      void restoreProjects().then((backup) => {
        if (!Array.isArray(backup) || backup.length === 0) return;
        const recovered = (backup as Project[]).map(normalizeProject);
        const merged = mergeProjects(recovered, get().projects);
        if (merged.length !== get().projects.length) {
          persist(merged);
          set({ projects: merged });
        }
      });
    },


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
      const projects = mergeProjects(loadProjects(), [project, ...get().projects]);
      const result = persist(projects);
      set({
        projects,
        status: result.ok ? `Created “${project.name}”` : (result.message ?? "Save failed"),
      });
      return project;
    },

    createSample: () => {
      const project = createSampleProject();
      const projects = mergeProjects(loadProjects(), [project, ...get().projects]);
      persist(projects);
      set({ projects, status: "Sample project created" });
      return project;
    },


    openProject: (id) => {
      const project = get().projects.find((p) => p.id === id) ?? null;
      if (project) {
        // pull uploaded artwork/video back out of IndexedDB
        void rehydrateAssets(normalizeProject(project)).then((full) => {
          const current = get().project;
          if (current && current.id === full.id) {
            set({
              project: {
                ...current,
                meta:
                  full.meta.coverImage && !current.meta.coverImage
                    ? { ...current.meta, coverImage: full.meta.coverImage }
                    : current.meta,
                media: full.media,
                screens: current.screens.map((s) => {
                  const restored = full.screens.find((f) => f.id === s.id);
                  return restored?.contentImage && !s.contentImage
                    ? { ...s, contentImage: restored.contentImage }
                    : s;
                }),
              },
            });
          }
        });
      }
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

    importProject: (incoming) => {
      const project = normalizeProject({ ...incoming, updatedAt: Date.now() });
      const projects = mergeProjects(loadProjects(), [
        project,
        ...get().projects.filter((p) => p.id !== project.id),
      ]);
      const result = persist(projects);
      set({
        projects,
        status: result.ok ? `Imported “${project.name}”` : (result.message ?? "Import failed"),
      });
      return project;
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
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }
      const project = get().project;
      if (!project) return;
      const stamped = { ...project, updatedAt: Date.now() };
      set({ project: stamped, status: "Saving…" });
      commitProjects(stamped);
      const st = get();
      if (st.dirty) return; // commitProjects already set the failure message
      const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      set({ status: st.status?.startsWith("Saved —") ? st.status : `Project saved at ${time}` });
    },

    setMeta: (patch) => mutate((p) => ({ ...p, meta: { ...p.meta, ...patch } })),
    setCanvas: (patch) => mutate((p) => ({ ...p, canvas: { ...p.canvas, ...patch } })),
    setPower: (patch) => mutate((p) => ({ ...p, extensions: { ...p.extensions, power: { ...(p.extensions?.["power"] as object | undefined), ...patch } } })),
    setStage: (patch) => mutate((p) => ({ ...p, stage: { ...p.stage, ...patch } })),

    applyStagePreset: (key) => {
      const preset = STAGE_PRESETS.find((s) => s.key === key);
      if (!preset) return;
      mutate((p) => ({ ...p, stage: { ...p.stage, ...preset.apply } }));
      set({ status: `Applied ${preset.label} stage preset` });
    },

    addRiser: (patch) =>
      mutate((p) => ({
        ...p,
        stage: {
          ...p.stage,
          risers: [
            ...(p.stage.risers ?? []),
            createRiser({ name: `Riser ${(p.stage.risers?.length ?? 0) + 1}`, ...patch }),
          ],
        },
      })),

    updateRiser: (id, patch) =>
      mutate((p) => ({
        ...p,
        stage: {
          ...p.stage,
          risers: (p.stage.risers ?? []).map((r) => (r.id === id ? { ...r, ...patch } : r)),
        },
      })),

    removeRiser: (id) =>
      mutate((p) => ({
        ...p,
        stage: { ...p.stage, risers: (p.stage.risers ?? []).filter((r) => r.id !== id) },
      })),


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

    addLayout: (kind) => {
      const project = get().project;
      if (!project) return;
      let order = Math.max(0, ...project.screens.map((s) => s.gridOrder ?? 0));
      const screens = buildLayout(kind, project.screens.length).map((s) => ({ ...s, gridOrder: ++order }));
      mutate((p) => ({ ...p, screens: [...p.screens, ...screens] }));
      set({ selectedId: screens[0]?.id ?? null, selectedEquipmentId: null, status: `Added ${screens.length} screens` });
    },

    updateScreen: (id, patch, options) =>
      mutate(
        (p) => {
          const target = p.screens.find((s) => s.id === id);
          const groupId = patch.groupId !== undefined ? patch.groupId : target?.groupId;
          const routingPatch =
            patch.processorId !== undefined ||
            patch.rj45Port !== undefined ||
            patch.processorOutput !== undefined;

          const clamp = (screen: LedScreen) => {
            const proc = p.processors.find((pr) => pr.id === screen.processorId);
            if (!proc) return screen;
            return {
              ...screen,
              rj45Port: Math.min(Math.max(1, Math.round(screen.rj45Port)), proc.outputs),
              processorOutput: Math.min(
                Math.max(1, Math.round(screen.processorOutput)),
                proc.outputs,
              ),
            };
          };

          return {
            ...p,
            screens: p.screens.map((s) => {
              if (s.id !== id) {
                // Grouped sections are one logical screen: they always share the
                // processor and the physical port of the section being edited.
                if (routingPatch && groupId && s.groupId === groupId) {
                  return clamp({
                    ...s,
                    processorId: patch.processorId ?? s.processorId,
                    rj45Port: patch.rj45Port ?? s.rj45Port,
                    processorOutput: patch.processorOutput ?? s.processorOutput,
                  });
                }
                return s;
              }
              let next = { ...s, ...patch };
              // LED resolution is derived from pixel pitch + cabinet grid unless
              // the operator explicitly pinned an override.
              const specPatch =
                patch.pixelPitch !== undefined ||
                patch.panelConfiguration !== undefined ||
                patch.cabinetKey !== undefined ||
                patch.resolutionOverride !== undefined;
              if (specPatch && patch.pixelWidth === undefined && patch.pixelHeight === undefined) {
                next = withDerivedResolution(next);
              }
              // Single source of truth: the canvas region follows the LED resolution
              // unless the caller is explicitly editing the region itself.
              if (
                !patch.content &&
                (patch.pixelWidth !== undefined || patch.pixelHeight !== undefined)
              ) {
                next.content = {
                  ...next.content,
                  width: next.pixelWidth,
                  height: next.pixelHeight,
                };
              }
              return clamp(next);
            }),
          };
        },
        options?.history !== false,
      ),



    syncScreenResolution: (id) => {
      mutate((p) => ({
        ...p,
        screens: p.screens.map((s) =>
          s.id === id ? withDerivedResolution({ ...s, resolutionOverride: false }) : s,
        ),
      }));
      const s = get().project?.screens.find((x) => x.id === id);
      set({
        status: s ? `${s.name} resolution synced to ${s.pixelWidth} × ${s.pixelHeight} px` : "",
      });
    },

    applyCabinetSpec: (id, cabinetKey) => {
      const spec = CABINET_CATALOG.find((c) => c.key === cabinetKey);
      if (!spec) return;
      mutate((p) => ({
        ...p,
        screens: p.screens.map((s) => {
          if (s.id !== id) return s;
          const grid = s.panelConfiguration.manual
            ? { cols: s.panelConfiguration.cols, rows: s.panelConfiguration.rows }
            : fitCabinets(s.physicalWidth, s.physicalHeight, spec.width, spec.height);
          const next: LedScreen = {
            ...s,
            cabinetKey: spec.key,
            pixelPitch: spec.pitch,
            panelConfiguration: {
              ...s.panelConfiguration,
              sizeKey: "custom",
              panelWidth: spec.width,
              panelHeight: spec.height,
              ...grid,
            },
          };
          const derived = withDerivedResolution({ ...next, resolutionOverride: false });
          const d = derivedResolution(derived);
          return {
            ...derived,
            resolutionOverride: false,
            physicalWidth: d.actualWidth,
            physicalHeight: d.actualHeight,
          };
        }),
      }));
      set({ status: `Cabinet spec applied: ${spec.label}` });
    },

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

    addProcessorInstance: (modelKey) => {
      const entry = PROCESSOR_CATALOG.find((c) => c.key === modelKey);
      if (!entry) return;
      const project = get().project;
      if (!project) return;
      const count = project.processors.filter((p) => (p.modelKey ?? p.id) === entry.key).length;
      const id = uid("proc");
      const instance = processorFromCatalog(
        entry,
        id,
        `${entry.brand} ${entry.label} #${count + 1}`,
      );
      mutate((p) => ({ ...p, processors: [...p.processors, instance] }));
      set({ status: `Added ${instance.name}` });
    },

    addGroup: (name, screenIds) => {
      const id = uid("grp");
      mutate((p) => {
        const ids = screenIds ?? [];
        const lead = p.screens.find((s) => ids.includes(s.id));
        const next: Project = {
          ...p,
          groups: [...(p.groups ?? []), { id, name: name || `LED Group ${(p.groups?.length ?? 0) + 1}`, continuous: true }],
          screens: p.screens.map((s) =>
            ids.includes(s.id)
              ? {
                  ...s,
                  groupId: id,
                  processorId: lead?.processorId ?? s.processorId,
                  rj45Port: lead?.rj45Port ?? s.rj45Port,
                  processorOutput: lead?.processorOutput ?? s.processorOutput,
                }
              : s,
          ),
        };
        return splitGroupInProject(next, id);
      });

      set({ status: "LED group created" });
    },

    updateGroup: (id, patch) =>
      mutate((p) => ({
        ...p,
        groups: (p.groups ?? []).map((g) => (g.id === id ? { ...g, ...patch } : g)),
      })),

    removeGroup: (id) => {
      mutate((p) => ({
        ...p,
        groups: (p.groups ?? []).filter((g) => g.id !== id),
        screens: p.screens.map((s) => (s.groupId === id ? { ...s, groupId: undefined } : s)),
      }));
      set({ status: "LED group removed" });
    },

    setScreenGroup: (screenId, groupId) => {
      mutate((p) => {
        const prevGroup = p.screens.find((s) => s.id === screenId)?.groupId;
        const peer = groupId ? p.screens.find((s) => s.groupId === groupId && s.id !== screenId) : undefined;
        let next: Project = {
          ...p,
          screens: p.screens.map((s) =>
            s.id === screenId
              ? {
                  ...s,
                  groupId: groupId ?? undefined,
                  processorId: peer?.processorId ?? s.processorId,
                  rj45Port: peer?.rj45Port ?? s.rj45Port,
                  processorOutput: peer?.processorOutput ?? s.processorOutput,
                }
              : s,
          ),
        };
        if (prevGroup && prevGroup !== groupId) next = splitGroupInProject(next, prevGroup);
        if (groupId) next = splitGroupInProject(next, groupId);
        return next;
      });
    },


    splitGroupResolution: (groupId) => {
      mutate((p) => splitGroupInProject(p, groupId));
      set({ status: "Group resolution split evenly" });
    },

    autoDistributePorts: (processorId) => {
      const project = get().project;
      const proc = project?.processors.find((p) => p.id === processorId);
      if (!project || !proc) return;
      const { plan, portsNeeded, fits } = planPortDistribution(project, proc);
      if (plan.length === 0) return;
      const byId = new Map(plan.map((entry) => [entry.screenId, entry]));
      mutate((p) => ({
        ...p,
        screens: p.screens.map((s) => {
          const entry = byId.get(s.id);
          if (!entry) return s;
          return { ...s, rj45Port: entry.rj45Port, portSpan: entry.portSpan };
        }),
      }));
      set({
        status: fits
          ? `Distributed LED across ${portsNeeded} of ${proc.outputs} ports on ${proc.label}`
          : `Needs ${portsNeeded} ports — ${proc.label} only has ${proc.outputs}. Add another processor.`,
      });
    },


    applyProcessorSourceToCanvas: (processorId) => {
      const project = get().project;
      const proc = project?.processors.find((p) => p.id === processorId);
      if (!proc) return;
      const width = proc.inputWidth ?? 1920;
      const height = proc.inputHeight ?? 1080;
      mutate((p) => {
        const next: Project = {
          ...p,
          canvas: {
            ...p.canvas,
            width,
            height,
            sourceProcessorId: processorId,
            aspectPreset:
              Math.abs(width / height - 16 / 9) < 0.01
                ? "16:9"
                : Math.abs(width / height - 32 / 9) < 0.01
                  ? "32:9"
                  : "custom",
          },
        };
        const groupIds = [
          ...new Set(
            next.screens
              .filter((s) => s.processorId === processorId && s.groupId)
              .map((s) => s.groupId as string),
          ),
        ];
        return groupIds.reduce((acc, gid) => splitGroupInProject(acc, gid), next);
      });

      set({ status: `Canvas set to ${width} × ${height} from ${proc.name ?? proc.label}` });
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

    arrangeCanvasSideBySide: () => {
      const project = get().project;
      if (!project) return;
      const slots = packedCanvas(project);
      const width = Math.max(project.canvas.width, ...project.screens.map((s) => (slots.get(s.id)?.x ?? 0) + s.pixelWidth));
      const height = Math.max(project.canvas.height, ...project.screens.map((s) => s.pixelHeight));
      mutate((p) => ({ ...p, canvas: { ...p.canvas, width, height }, screens: p.screens.map((s) => { const t = slots.get(s.id); return t ? { ...s, content: { ...s.content, x: t.x, y: t.y, width: s.pixelWidth, height: s.pixelHeight } } : s; }) }));
    },

    mirrorScreen: (id) => {
      const project = get().project;
      const source = project?.screens.find((s) => s.id === id);
      if (!project || !source) return;
      const copy = { ...mirroredScreen(source, project.canvas.width), id: uid("led"), gridOrder: Math.max(0, ...project.screens.map((s) => s.gridOrder ?? 0)) + 1 };
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

    spaceScreens: (gap, direction) => {
      const project = get().project;
      if (!project || project.screens.length < 2) return;
      const g = Math.max(0, gap);
      mutate((p) => {
        const sorted = [...p.screens].sort((a, b) =>
          direction === "horizontal" ? a.position.x - b.position.x : a.position.y - b.position.y,
        );
        const positions = new Map<string, { x: number; y: number }>();
        // Keep the first screen fixed; lay the rest out edge-to-edge + gap.
        const first = sorted[0]!;
        let cursor =
          direction === "horizontal"
            ? first.position.x + first.physicalWidth / 2 + g
            : first.position.y + first.physicalHeight / 2 + g;
        for (let i = 1; i < sorted.length; i++) {
          const s = sorted[i]!;
          if (direction === "horizontal") {
            positions.set(s.id, { x: cursor + s.physicalWidth / 2, y: s.position.y });
            cursor += s.physicalWidth + g;
          } else {
            positions.set(s.id, { x: s.position.x, y: cursor + s.physicalHeight / 2 });
            cursor += s.physicalHeight + g;
          }
        }
        return {
          ...p,
          screens: p.screens.map((s) => {
            const next = positions.get(s.id);
            if (!next || s.locked) return s;
            return { ...s, position: { ...s.position, ...next } };
          }),
        };
      });
      set({ status: `Spaced screens with ${g.toFixed(2)} m gap (${direction})` });
    },

    setGapBetween: (aId, bId, gap) => {
      const project = get().project;
      if (!project) return;
      const a = project.screens.find((s) => s.id === aId);
      const b = project.screens.find((s) => s.id === bId);
      if (!a || !b || a.id === b.id) return;
      const g = Math.max(0, gap);
      // Move B relative to A (or A if B is locked) along the dominant separation axis.
      const moveA = b.locked && !a.locked;
      const anchor = moveA ? b : a;
      const moving = moveA ? a : b;
      const sign = moveA ? -1 : 1;
      const dx = b.position.x - a.position.x;
      const dy = b.position.y - a.position.y;
      const horizontal = Math.abs(dx) >= Math.abs(dy);
      const dir = horizontal ? Math.sign(dx || 1) * sign : Math.sign(dy || 1) * sign;
      const next = { ...moving.position };
      if (horizontal) {
        next.x =
          anchor.position.x +
          dir * (anchor.physicalWidth / 2 + g + moving.physicalWidth / 2);
      } else {
        next.y =
          anchor.position.y +
          dir * (anchor.physicalHeight / 2 + g + moving.physicalHeight / 2);
      }
      mutate((p) => ({
        ...p,
        screens: p.screens.map((s) => (s.id === moving.id ? { ...s, position: next } : s)),
      }));
      set({
        status: `Gap "${a.name}" ↔ "${b.name}" set to ${g.toFixed(2)} m (${horizontal ? "horizontal" : "vertical"})`,
      });
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

    addSeatingRows: ({ typeKey, rows, perRow, rowSpacing, seatSpacing, startZ, section }) => {
      const def = EQUIPMENT_LIBRARY.find((e) => e.key === typeKey);
      if (!def) return;
      const items: EquipmentItem[] = [];
      const r = Math.max(1, Math.round(rows));
      const n = Math.max(1, Math.round(perRow));
      for (let row = 0; row < r; row++) {
        for (let i = 0; i < n; i++) {
          items.push(
            createEquipment(def, {
              name: `${section} R${row + 1}-${i + 1}`,
              position: {
                x: +((i - (n - 1) / 2) * seatSpacing).toFixed(3),
                y: 0,
                z: +(startZ + row * rowSpacing).toFixed(3),
              },
              rotation: 180,
            }),
          );
        }
      }
      mutate((p) => ({ ...p, equipment: [...p.equipment, ...items] }));
      set({ status: `Added ${items.length} seats (${section})` });
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

    addMedia: (patch) => {
      const project = get().project;
      if (!project) return;
      const z = Math.max(0, ...project.media.map((m) => m.z)) + 1;
      const item = createMediaItem({
        width: Math.round(project.canvas.width / 3),
        height: Math.round(project.canvas.height / 3),
        z,
        ...patch,
      });
      mutate((p) => ({ ...p, media: [...p.media, item] }));
      set({ selectedMediaId: item.id, status: `Added ${item.name}` });
    },

    updateMedia: (id, patch, options) =>
      mutate(
        (p) => ({ ...p, media: p.media.map((m) => (m.id === id ? { ...m, ...patch } : m)) }),
        options?.history !== false,
      ),

    deleteMedia: (id) => {
      mutate((p) => ({ ...p, media: p.media.filter((m) => m.id !== id) }));
      set((s) => ({ selectedMediaId: s.selectedMediaId === id ? null : s.selectedMediaId }));
    },

    selectMedia: (id) => set({ selectedMediaId: id }),

    raiseMedia: (id, direction) =>
      mutate((p) => ({
        ...p,
        media: p.media.map((m) => (m.id === id ? { ...m, z: m.z + direction } : m)),
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
