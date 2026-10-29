import { cabinetCalc } from "./calc";
import type { LedScreen, Project } from "./types";

/* ------------------------------------------------------------ canvas layout */

export interface CanvasPlacement {
  screenId: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  cols: number;
  rows: number;
  cabinets: number;
  /** native pixels per cabinet, from the configured screen resolution */
  cabinetPxW: number;
  cabinetPxH: number;
  areaM2: number;
}

export interface GlobalLayout {
  placements: CanvasPlacement[];
  /** bounding box of every screen's canvas region */
  canvasWidth: number;
  canvasHeight: number;
  occupiedPixels: number;
  unusedPixels: number;
  totalCabinets: number;
  /** illuminated area (sum of screens) — not the bounding box */
  activeAreaM2: number;
  /** physical bounding footprint including gaps */
  footprintWidthM: number;
  footprintHeightM: number;
}

export function globalLayout(project: Project): GlobalLayout {
  const screens = project.screens.filter((s) => s.visible !== false);
  const placements = screens.map((s) => {
    const c = cabinetCalc(s);
    return {
      screenId: s.id,
      name: s.name,
      x: s.content.x,
      y: s.content.y,
      width: s.pixelWidth,
      height: s.pixelHeight,
      cols: c.cols,
      rows: c.rows,
      cabinets: c.total,
      cabinetPxW: s.pixelWidth / c.cols,
      cabinetPxH: s.pixelHeight / c.rows,
      areaM2: c.area,
    };
  });
  const minX = Math.min(0, ...placements.map((p) => p.x));
  const minY = Math.min(0, ...placements.map((p) => p.y));
  const maxX = Math.max(0, ...placements.map((p) => p.x + p.width));
  const maxY = Math.max(0, ...placements.map((p) => p.y + p.height));
  const canvasWidth = maxX - minX;
  const canvasHeight = maxY - minY;
  const occupiedPixels = placements.reduce((n, p) => n + p.width * p.height, 0);
  // physical footprint from world positions (x = centre, y = centre height)
  let fx0 = Infinity, fx1 = -Infinity, fy0 = Infinity, fy1 = -Infinity;
  for (const s of screens) {
    const c = cabinetCalc(s);
    fx0 = Math.min(fx0, s.position.x - c.actualWidth / 2);
    fx1 = Math.max(fx1, s.position.x + c.actualWidth / 2);
    fy0 = Math.min(fy0, s.position.y - c.actualHeight / 2);
    fy1 = Math.max(fy1, s.position.y + c.actualHeight / 2);
  }
  return {
    placements,
    canvasWidth,
    canvasHeight,
    occupiedPixels,
    unusedPixels: Math.max(0, canvasWidth * canvasHeight - occupiedPixels),
    totalCabinets: placements.reduce((n, p) => n + p.cabinets, 0),
    activeAreaM2: +placements.reduce((n, p) => n + p.areaM2, 0).toFixed(3),
    footprintWidthM: screens.length ? +(fx1 - fx0).toFixed(3) : 0,
    footprintHeightM: screens.length ? +(fy1 - fy0).toFixed(3) : 0,
  };
}

/* ------------------------------------------------------------- data chains */

export interface CabinetChain {
  port: number;
  /** cabinet columns (0-based, inclusive range) carried by this port */
  colStart: number;
  colEnd: number;
  cabinets: number;
  pixels: number;
  loadPct: number;
  /** ordered cabinet cells (col,row) in serpentine order, bottom-left start */
  path: Array<[number, number]>;
  /** port number exceeds the processor's physical outputs */
  overflow: boolean;
}

/** Port capacity in pixels for a screen's processor (documented profile value, else 650k planning default). */
function portCapacity(project: Project, screen: LedScreen) {
  const proc = project.processors.find((p) => p.id === screen.processorId);
  return { proc, max: Math.max(1, proc?.portMaxPixels ?? 650_000) };
}

/** Columns each port can carry without exceeding its pixel capacity (whole columns only). */
export function colsPerPortFor(project: Project, screen: LedScreen) {
  const c = cabinetCalc(screen);
  const colPx = (screen.pixelWidth / c.cols) * screen.pixelHeight;
  return Math.max(1, Math.floor(portCapacity(project, screen).max / Math.max(1, colPx)));
}

/**
 * Splits a screen into whole-column serpentine chains, each within one port's pixel capacity,
 * balanced so no port carries more than one extra column. Ports are numbered continuously per
 * processor in screen order; numbers above the processor's output count are flagged.
 */
export function screenChains(project: Project, screen: LedScreen): CabinetChain[] {
  const c = cabinetCalc(screen);
  const { proc, max } = portCapacity(project, screen);
  const pxPerCab = (screen.pixelWidth / c.cols) * (screen.pixelHeight / c.rows);
  const per = colsPerPortFor(project, screen);
  const ports = Math.ceil(c.cols / per);
  let firstPort = 1;
  for (const other of project.screens) {
    if (other.id === screen.id) break;
    if (other.processorId === screen.processorId && other.visible !== false)
      firstPort += Math.ceil(cabinetCalc(other).cols / colsPerPortFor(project, other));
  }
  const chains: CabinetChain[] = [];
  let col = 0;
  for (let i = 0; i < ports; i++) {
    const cols = Math.floor(c.cols / ports) + (i < c.cols % ports ? 1 : 0);
    const path: Array<[number, number]> = [];
    for (let k = 0; k < cols; k++) {
      const cc = col + k;
      for (let r = 0; r < c.rows; r++) path.push([cc, k % 2 === 0 ? c.rows - 1 - r : r]);
    }
    const cabinets = cols * c.rows;
    const pixels = Math.round(cabinets * pxPerCab);
    const port = firstPort + i;
    chains.push({ port, colStart: col, colEnd: col + cols - 1, cabinets, pixels, loadPct: (pixels / max) * 100, path, overflow: proc ? port > proc.outputs : false });
    col += cols;
  }
  return chains;
}

/** Estimated CAT6 lengths: home run (operator-set) plus cabinet-to-cabinet jumpers along the chain. */
export function chainCableM(screen: LedScreen, chain: CabinetChain, homeRunM: number) {
  const c = cabinetCalc(screen);
  let jumpers = 0;
  for (let k = 1; k < chain.path.length; k++) {
    const [a, b] = chain.path[k - 1]!, [x, y] = chain.path[k]!;
    jumpers += Math.abs(a - x) * c.cabinetWidth + Math.abs(b - y) * c.cabinetHeight;
  }
  return { homeRunM, jumpersM: +jumpers.toFixed(2), jumperCount: Math.max(0, chain.path.length - 1) };
}

/* ------------------------------------------------------------------- power */

export interface PowerSettings {
  /** watts per cabinet — manufacturer data only; undefined means unknown */
  cabinetMaxW?: number | undefined;
  cabinetTypW?: number | undefined;
  voltage: number;
  circuitAmps?: number | undefined;
  /** usable fraction of circuit rating (operator-set planning margin) */
  loadLimitPct: number;
  phases: 1 | 3;
  /** estimated processor-to-first-cabinet cable run, metres */
  dataHomeRunM?: number | undefined;
}

export const DEFAULT_POWER: PowerSettings = { voltage: 230, loadLimitPct: 80, phases: 3 };

export function powerSettings(project: Project): PowerSettings {
  return { ...DEFAULT_POWER, ...((project.extensions?.["power"] as Partial<PowerSettings>) ?? {}) };
}

export interface PowerCircuit {
  id: string;
  phase: string;
  colStart: number;
  colEnd: number;
  cabinets: number;
  maxW: number;
  typW: number | undefined;
  amps: number;
  loadPct: number;
}

export interface ScreenPower {
  status: "ok" | "missing";
  message?: string;
  cabinetsPerCircuit: number;
  circuits: PowerCircuit[];
  totalMaxW: number;
  totalTypW: number | undefined;
  totalAmps: number;
}

/** Circuits are filled by whole cabinet columns, never exceeding the configured usable capacity. */
export function screenPower(screen: LedScreen, ps: PowerSettings, prefix = "C"): ScreenPower {
  const c = cabinetCalc(screen);
  if (!ps.cabinetMaxW || !ps.circuitAmps || !ps.voltage)
    return { status: "missing", message: "Enter cabinet max watts, voltage and circuit rating (from manufacturer and venue data) to calculate power.", cabinetsPerCircuit: 0, circuits: [], totalMaxW: 0, totalTypW: undefined, totalAmps: 0 };
  const usableW = ps.voltage * ps.circuitAmps * (ps.loadLimitPct / 100);
  const perCircuit = Math.floor(usableW / ps.cabinetMaxW);
  if (perCircuit < 1)
    return { status: "missing", message: `One cabinet (${ps.cabinetMaxW} W) exceeds the usable circuit capacity (${Math.round(usableW)} W).`, cabinetsPerCircuit: 0, circuits: [], totalMaxW: 0, totalTypW: undefined, totalAmps: 0 };
  const colsPerCircuit = Math.max(1, Math.floor(perCircuit / c.rows));
  const phaseNames = ps.phases === 3 ? ["L1", "L2", "L3"] : ["L1"];
  const circuits: PowerCircuit[] = [];
  for (let col = 0, i = 0; col < c.cols; col += colsPerCircuit, i++) {
    const cols = Math.min(colsPerCircuit, c.cols - col);
    const cabinets = cols * c.rows;
    const maxW = cabinets * ps.cabinetMaxW;
    const amps = maxW / ps.voltage;
    circuits.push({ id: `${prefix}${i + 1}`, phase: phaseNames[i % phaseNames.length]!, colStart: col, colEnd: col + cols - 1, cabinets, maxW, typW: ps.cabinetTypW ? cabinets * ps.cabinetTypW : undefined, amps, loadPct: (amps / ps.circuitAmps) * 100 });
  }
  const totalMaxW = c.total * ps.cabinetMaxW;
  return { status: "ok", cabinetsPerCircuit: colsPerCircuit * c.rows, circuits, totalMaxW, totalTypW: ps.cabinetTypW ? c.total * ps.cabinetTypW : undefined, totalAmps: totalMaxW / ps.voltage };
}

/* -------------------------------------------------------- bill of materials */

export interface BomRow { item: string; model: string; qty: number; location: string; spec: string; notes: string }

export function billOfMaterials(project: Project): BomRow[] {
  const rows: BomRow[] = [];
  for (const s of project.screens) {
    const c = cabinetCalc(s);
    rows.push({ item: "LED cabinet", model: `P${s.pixelPitch} ${c.cabinetWidth * 1000}×${c.cabinetHeight * 1000} mm`, qty: c.total, location: s.name, spec: `${Math.round(s.pixelWidth / c.cols)}×${Math.round(s.pixelHeight / c.rows)} px per cabinet`, notes: "" });
    const chains = screenChains(project, s);
    const run = powerSettings(project).dataHomeRunM;
    rows.push({ item: "Data cable (CAT6) — processor to first cabinet", model: "CAT6", qty: chains.length, location: s.name, spec: run ? `${run} m each (estimate)` : "Length to be measured on site", notes: chains.some((ch) => ch.overflow) ? "Needs more processor ports than available" : "" });
    rows.push({ item: "Data jumper (CAT6) — cabinet to cabinet", model: "CAT6", qty: Math.max(0, c.total - chains.length), location: s.name, spec: "Short jumper", notes: "" });
    const p = screenPower(s, powerSettings(project));
    if (p.status === "ok") rows.push({ item: "Power circuit / feed", model: "", qty: p.circuits.length, location: s.name, spec: `${powerSettings(project).circuitAmps} A @ ${powerSettings(project).voltage} V`, notes: "Verify with a qualified electrician" });
  }
  const used = new Set(project.screens.map((s) => s.processorId));
  for (const proc of project.processors.filter((p) => used.has(p.id)))
    rows.push({ item: "LED processor", model: `${proc.brand} ${proc.label}`, qty: 1, location: proc.name ?? proc.label, spec: `${proc.outputs} outputs`, notes: "" });
  for (const e of project.equipment ?? [])
    rows.push({ item: (e as { name?: string }).name ?? "Equipment", model: (e as { type?: string }).type ?? "", qty: 1, location: "Stage", spec: "", notes: "" });
  return rows;
}

export function bomCsv(rows: BomRow[]) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  return ["Item,Model,Quantity,Location,Specification,Unit cost,Total cost,Notes", ...rows.map((r) => [r.item, r.model, r.qty, r.location, r.spec, "", "", r.notes].map(esc).join(","))].join("\n");
}

/* ------------------------------------------------------ graphics specification */

export interface GraphicsSpecRow { screen: string; x: number; y: number; width: number; height: number; aspect: string; panels: string; pitch: number }

/** What the designer needs: exact pixel size and canvas position of every screen, plus the full canvas. */
export function graphicsSpec(project: Project): GraphicsSpecRow[] {
  const g = globalLayout(project);
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const asp = (w: number, h: number) => { const d = gcd(w, h) || 1; return w / d <= 64 ? `${w / d}:${h / d}` : `${(w / h).toFixed(2)}:1`; };
  const rows = g.placements.map((p) => ({ screen: p.name, x: p.x, y: p.y, width: p.width, height: p.height, aspect: asp(p.width, p.height), panels: `${p.cols}×${p.rows}`, pitch: project.screens.find((s) => s.id === p.screenId)?.pixelPitch ?? 0 }));
  return [{ screen: "FULL CANVAS", x: 0, y: 0, width: g.canvasWidth, height: g.canvasHeight, aspect: asp(g.canvasWidth, g.canvasHeight), panels: `${g.totalCabinets}`, pitch: 0 }, ...rows];
}

export function graphicsSpecCsv(rows: GraphicsSpecRow[]) {
  return ["Screen,X px,Y px,Width px,Height px,Aspect,Panels,Pitch mm", ...rows.map((r) => [r.screen, r.x, r.y, r.width, r.height, r.aspect, r.panels, r.pitch || ""].map((v) => `"${v}"`).join(","))].join("\n");
}
