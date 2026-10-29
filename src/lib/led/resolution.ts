import type { LedScreen, Project, ProcessorModel } from "./types";
import { PROCESSOR_CATALOG } from "./types";
import { screenChains, processorLayout } from "./engineering";

/** Max screen width/height a processor can load across all its ports (NovaStar manuals: 10,240 × 8,192 for VX1000 / VX Pro). */
export function loadLimits(proc: ProcessorModel) {
  if (proc.brand === "NovaStar" && /^VX(1000|600)/i.test(proc.label)) return { width: 10240, height: 8192 };
  return { width: proc.outputWidth, height: proc.outputHeight };
}

/** Ports a processor needs for all its screens, using whole-column chains within port capacity. */
export function portsRequired(project: Project, proc: ProcessorModel) {
  return project.screens
    .filter((s) => s.processorId === proc.id && s.visible !== false)
    .reduce((n, s) => n + screenChains(project, s).length, 0);
}

/**
 * Best source (laptop → processor input) resolution for a processor's LED canvas:
 * the exact canvas when the input accepts it (1:1), otherwise the supported preset with the
 * closest aspect ratio, then the most pixels.
 */
export function recommendedSource(proc: ProcessorModel, ledW: number, ledH: number) {
  const maxW = proc.maxInputWidth ?? 1920, maxH = proc.maxInputHeight ?? 1080;
  const minW = proc.minInputWidth ?? 0, minH = proc.minInputHeight ?? 0;
  if (ledW > 0 && ledH > 0 && ledW <= maxW && ledH <= maxH && ledW >= minW && ledH >= minH)
    return { width: ledW, height: ledH, exact: true };
  const entry = PROCESSOR_CATALOG.find((e) => e.key === proc.modelKey || e.label === proc.label);
  const presets = [...(entry?.inputPresets ?? []), { width: maxW, height: maxH }].filter((p) => p.width <= maxW && p.height <= maxH);
  const target = ledW > 0 && ledH > 0 ? ledW / ledH : 16 / 9;
  const best = presets.sort((a, b) => Math.abs(a.width / a.height - target) - Math.abs(b.width / b.height - target) || b.width * b.height - a.width * a.height)[0] ?? { width: maxW, height: maxH };
  return { width: best.width, height: best.height, exact: false };
}

/* -------------------------------------------------------------- catalogue */

/** Common LED pixel pitches (mm). */
export const PITCH_PRESETS = [1.2, 1.5, 1.9, 2.0, 2.5, 2.6, 2.9, 3.9, 4.8, 6.0, 10.0];

export interface CabinetSpec {
  key: string;
  label: string;
  /** cabinet size in metres */
  width: number;
  height: number;
  /** pixel pitch in mm */
  pitch: number;
  /** native cabinet resolution in pixels */
  pixelWidth: number;
  pixelHeight: number;
}

/** Optional explicit native matrix — real cabinets don't always equal metres ÷ pitch. */
function cab(width: number, height: number, pitch: number, px?: [number, number]): CabinetSpec {
  const pixelWidth = px?.[0] ?? Math.round((width * 1000) / pitch);
  const pixelHeight = px?.[1] ?? Math.round((height * 1000) / pitch);
  return {
    key: `${width}x${height}-p${pitch}`,
    label: `${width} × ${height} m · P${pitch} · ${pixelWidth}×${pixelHeight}`,
    width,
    height,
    pitch,
    pixelWidth,
    pixelHeight,
  };
}

/** Real-world cabinet specifications used as the source of truth for resolution. */
export const CABINET_CATALOG: CabinetSpec[] = [
  cab(0.5, 0.5, 1.2),
  cab(0.5, 0.5, 1.5),
  cab(0.5, 0.5, 1.9),
  cab(0.5, 0.5, 2.0),
  cab(0.5, 0.5, 2.5),
  cab(0.5, 0.5, 2.6),
  cab(0.5, 0.5, 3.9),
  cab(0.5, 0.5, 2.9, [168, 168]),
  cab(0.5, 0.5, 4.8, [104, 104]),
  cab(0.5, 1.0, 1.9, [256, 512]),
  cab(0.5, 1.0, 2.5, [200, 400]),
  cab(0.5, 1.0, 2.6, [192, 384]),
  cab(0.5, 1.0, 2.9, [168, 336]),
  cab(0.5, 1.0, 3.9, [128, 256]),
  cab(0.5, 1.0, 4.8, [104, 208]),
  cab(1.0, 0.5, 1.5),
  cab(1.0, 0.5, 2.0),
  cab(1.0, 0.5, 2.5),
  cab(1.0, 0.5, 3.9),
  cab(1.0, 1.0, 4.8),
  cab(1.0, 1.0, 6.0),
  cab(0.96, 0.96, 10.0),
];

export function findCabinetSpec(screen: LedScreen): CabinetSpec | undefined {
  if (screen.cabinetKey) {
    const hit = CABINET_CATALOG.find((c) => c.key === screen.cabinetKey);
    if (hit) return hit;
  }
  const { panelWidth, panelHeight } = screen.panelConfiguration;
  return CABINET_CATALOG.find(
    (c) =>
      Math.abs(c.width - panelWidth) < 0.005 &&
      Math.abs(c.height - panelHeight) < 0.005 &&
      Math.abs(c.pitch - screen.pixelPitch) < 0.01,
  );
}

/* ------------------------------------------------------- derived geometry */

export interface DerivedResolution {
  /** cabinets across / down */
  cols: number;
  rows: number;
  /** cabinet physical size (m) */
  cabinetWidth: number;
  cabinetHeight: number;
  /** cabinet native resolution */
  cabinetPixelWidth: number;
  cabinetPixelHeight: number;
  /** total wall resolution derived from cabinet grid */
  pixelWidth: number;
  pixelHeight: number;
  /** true physical size of the cabinet grid (m) */
  actualWidth: number;
  actualHeight: number;
  totalCabinets: number;
  /** where the cabinet resolution came from */
  source: "catalog" | "pitch";
  /** the configured resolution differs from the derived one */
  overridden: boolean;
}

/**
 * Derive the true LED resolution from pixel pitch and cabinet configuration.
 * Cabinet specifications win over theoretical metres ÷ pitch maths.
 */
export function derivedResolution(screen: LedScreen): DerivedResolution {
  const spec = findCabinetSpec(screen);
  const pitch = Math.max(0.1, screen.pixelPitch);
  const cabinetWidth = Math.max(0.01, spec?.width ?? screen.panelConfiguration.panelWidth);
  const cabinetHeight = Math.max(0.01, spec?.height ?? screen.panelConfiguration.panelHeight);
  const cols = Math.max(1, Math.round(screen.panelConfiguration.cols));
  const rows = Math.max(1, Math.round(screen.panelConfiguration.rows));

  const cabinetPixelWidth = spec?.pixelWidth ?? Math.round((cabinetWidth * 1000) / pitch);
  const cabinetPixelHeight = spec?.pixelHeight ?? Math.round((cabinetHeight * 1000) / pitch);

  const pixelWidth = cabinetPixelWidth * cols;
  const pixelHeight = cabinetPixelHeight * rows;

  return {
    cols,
    rows,
    cabinetWidth,
    cabinetHeight,
    cabinetPixelWidth,
    cabinetPixelHeight,
    pixelWidth,
    pixelHeight,
    actualWidth: +(cols * cabinetWidth).toFixed(3),
    actualHeight: +(rows * cabinetHeight).toFixed(3),
    totalCabinets: cols * rows,
    source: spec ? "catalog" : "pitch",
    overridden: pixelWidth !== screen.pixelWidth || pixelHeight !== screen.pixelHeight,
  };
}

/** Cabinet grid that best fits a physical size for a given cabinet spec. */
export function fitCabinets(widthM: number, heightM: number, cabW: number, cabH: number) {
  return {
    cols: Math.max(1, Math.round(widthM / Math.max(0.01, cabW))),
    rows: Math.max(1, Math.round(heightM / Math.max(0.01, cabH))),
  };
}

/**
 * Apply the derived resolution to a screen unless the user pinned a manual
 * override. Physical size is snapped to the real cabinet grid.
 */
export function withDerivedResolution(screen: LedScreen): LedScreen {
  if (screen.resolutionOverride) return screen;
  const d = derivedResolution(screen);
  if (d.pixelWidth === screen.pixelWidth && d.pixelHeight === screen.pixelHeight) return screen;
  return {
    ...screen,
    pixelWidth: d.pixelWidth,
    pixelHeight: d.pixelHeight,
    content: { ...screen.content, width: d.pixelWidth, height: d.pixelHeight },
  };
}

/* --------------------------------------------------------- signal status */

export type ChainStatus = "ok" | "scaling" | "error";

export const STATUS_ICON: Record<ChainStatus, string> = {
  ok: "🟢",
  scaling: "🟡",
  error: "🔴",
};

export const STATUS_LABEL: Record<ChainStatus, string> = {
  ok: "Compatible",
  scaling: "Scaling required",
  error: "Incompatible",
};

export const STATUS_TONE: Record<ChainStatus, string> = {
  ok: "text-right text-[#4ade80]",
  scaling: "text-right text-primary",
  error: "text-right text-destructive",
};

export interface ProcessorChain {
  processor: ProcessorModel;
  /** laptop / playback source resolution feeding the processor */
  sourceWidth: number;
  sourceHeight: number;
  /** total LED pixels driven by this processor */
  ledWidth: number;
  ledHeight: number;
  ledPixels: number;
  screens: number;
  portsUsed: number;
  status: ChainStatus;
  notes: string[];
  /** how the source maps onto the LED canvas */
  scaling: "1:1" | "upscale" | "downscale" | "letterbox" | "crop";
}

function boundingBox(screens: LedScreen[]) {
  if (screens.length === 0) return { width: 0, height: 0 };
  const right = Math.max(...screens.map((s) => s.content.x + s.content.width));
  const bottom = Math.max(...screens.map((s) => s.content.y + s.content.height));
  const left = Math.min(...screens.map((s) => s.content.x));
  const top = Math.min(...screens.map((s) => s.content.y));
  return { width: right - left, height: bottom - top };
}

/** Evaluate SOURCE → PROCESSOR → MAPPING → LED for one processor. */
export function processorChain(project: Project, processor: ProcessorModel): ProcessorChain {
  const screens = project.screens.filter((s) => s.processorId === processor.id);
  const sourceWidth = processor.inputWidth ?? 1920;
  const sourceHeight = processor.inputHeight ?? 1080;
  const shared = project.groups?.some((g) => g.mappingMode === "shared-input" && screens.some((s) => s.groupId === g.id));
  const box = shared ? processorLayout(project, processor.id) : boundingBox(screens);
  const ledPixels = screens.reduce((sum, s) => sum + s.pixelWidth * s.pixelHeight, 0);
  const portsUsed = portsRequired(project, processor);

  const notes: string[] = [];
  let status: ChainStatus = "ok";
  const raise = (next: ChainStatus) => {
    if (next === "error" || (next === "scaling" && status === "ok")) status = next;
  };

  const maxInW = processor.maxInputWidth ?? 1920;
  const maxInH = processor.maxInputHeight ?? 1080;
  if (sourceWidth > maxInW || sourceHeight > maxInH) {
    raise("error");
    notes.push(
      `Source ${sourceWidth}×${sourceHeight} exceeds the ${processor.label} input limit of ${maxInW}×${maxInH}.`,
    );
  }
  if (ledPixels > processor.maxPixels) {
    raise("error");
    notes.push(
      `LED load ${ledPixels.toLocaleString()} px exceeds the ${processor.label} capacity of ${processor.maxPixels.toLocaleString()} px.`,
    );
  }
  if (portsUsed > processor.outputs) {
    raise("error");
    notes.push(`These screens need ${portsUsed} Ethernet ports (650,000 px each) but the ${processor.label} has ${processor.outputs}. Add a second processor or move a screen.`);
  }

  let scaling: ProcessorChain["scaling"] = "1:1";
  if (screens.length > 0 && box.width > 0 && box.height > 0) {
    const sameW = box.width === sourceWidth;
    const sameH = box.height === sourceHeight;
    if (!sameW || !sameH) {
      const srcAspect = sourceWidth / sourceHeight;
      const ledAspect = box.width / box.height;
      if (Math.abs(srcAspect - ledAspect) > 0.01) {
        scaling = srcAspect > ledAspect ? "letterbox" : "crop";
        raise("scaling");
        notes.push(
          `Source ${sourceWidth}×${sourceHeight} and LED canvas ${box.width}×${box.height} have different aspect ratios — content will ${scaling === "crop" ? "crop" : "letterbox"} unless stretched.`,
        );
      } else {
        scaling = box.width > sourceWidth ? "upscale" : "downscale";
        raise("scaling");
        notes.push(
          `Source ${sourceWidth}×${sourceHeight} is ${scaling === "upscale" ? "lower" : "higher"} than the ${box.width}×${box.height} LED canvas — the processor will ${scaling}.`,
        );
      }
    }
  }

  for (const s of screens) {
    const d = derivedResolution(s);
    if (s.resolutionOverride && d.overridden) {
      raise("scaling");
      notes.push(
        `${s.name} uses a manual resolution (${s.pixelWidth}×${s.pixelHeight}) instead of the cabinet-derived ${d.pixelWidth}×${d.pixelHeight}.`,
      );
    }
    const lim = loadLimits(processor);
    if (s.pixelWidth > lim.width || s.pixelHeight > lim.height) {
      raise("error");
      notes.push(`${s.name} (${s.pixelWidth}×${s.pixelHeight}) exceeds the ${processor.label} maximum of ${lim.width}×${lim.height}.`);
    }
  }

  return {
    processor,
    sourceWidth,
    sourceHeight,
    ledWidth: box.width,
    ledHeight: box.height,
    ledPixels,
    screens: screens.length,
    portsUsed,
    status,
    notes,
    scaling,
  };
}

/** Chain evaluation for every processor that drives at least one screen. */
export function projectChains(project: Project): ProcessorChain[] {
  return project.processors
    .filter((p) => project.screens.some((s) => s.processorId === p.id))
    .map((p) => processorChain(project, p));
}

/** Status for one screen inside the whole chain. */
export function screenStatus(
  project: Project,
  screen: LedScreen,
): { status: ChainStatus; notes: string[] } {
  const proc = project.processors.find((p) => p.id === screen.processorId);
  if (!proc)
    return { status: "error", notes: ["No processor assigned to this LED screen."] };
  const d = derivedResolution(screen);
  const notes: string[] = [];
  let status: ChainStatus = "ok";

  if (screen.pixelWidth * screen.pixelHeight > proc.maxPixels) {
    status = "error";
    notes.push(`Exceeds ${proc.label} capacity.`);
  } else if (screen.pixelWidth > loadLimits(proc).width || screen.pixelHeight > loadLimits(proc).height) {
    status = "error";
    notes.push(`Wider or taller than the ${proc.label} can load (${loadLimits(proc).width}×${loadLimits(proc).height}).`);
  } else {
    const chains = screenChains(project, screen);
    if (chains.some((c) => c.overflow)) {
      status = "error";
      notes.push(`Needs ports ${chains[0]!.port}–${chains[chains.length - 1]!.port}, but the ${proc.label} has ${proc.outputs}. Move this screen to another processor.`);
    } else notes.push(`Uses ${chains.length} Ethernet port${chains.length > 1 ? "s" : ""} (${chains.map((c) => c.port).join(", ")}).`);
  }
  if (d.overridden) {
    if (status === "ok") status = "scaling";
    notes.push(
      screen.resolutionOverride
        ? `Manual override: cabinet grid gives ${d.pixelWidth}×${d.pixelHeight}.`
        : `Resolution out of sync with cabinets (${d.pixelWidth}×${d.pixelHeight}).`,
    );
  }
  if (Math.abs(d.actualWidth - screen.physicalWidth) > 0.005 ||
      Math.abs(d.actualHeight - screen.physicalHeight) > 0.005) {
    if (status === "ok") status = "scaling";
    notes.push(
      `Cabinet grid measures ${d.actualWidth} × ${d.actualHeight} m, not ${screen.physicalWidth} × ${screen.physicalHeight} m.`,
    );
  }
  return { status, notes };
}
