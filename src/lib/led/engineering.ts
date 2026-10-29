import { cabinetCalc } from "./calc";
import { processorPortMap } from "./ports";
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
}

/** Splits a screen into whole-column cabinet chains following the processor port map. */
export function screenChains(project: Project, screen: LedScreen): CabinetChain[] {
  const c = cabinetCalc(screen);
  const proc = project.processors.find((p) => p.id === screen.processorId);
  const pxPerCab = (screen.pixelWidth / c.cols) * (screen.pixelHeight / c.rows);
  let slices: Array<{ port: number; cols: number; max: number }> = [];
  if (proc) {
    const map = processorPortMap(project, proc);
    for (const port of map.ports)
      for (const sec of port.sections)
        if (sec.screenId === screen.id)
          slices.push({ port: port.port, cols: Math.max(1, sec.cabinetCols), max: port.maxPixels });
  }
  if (!slices.length) slices = [{ port: screen.rj45Port || 1, cols: c.cols, max: 650_000 }];
  const chains: CabinetChain[] = [];
  let col = 0;
  for (const [i, s] of slices.entries()) {
    const cols = i === slices.length - 1 ? c.cols - col : Math.min(s.cols, c.cols - col);
    if (cols <= 0) break;
    const path: Array<[number, number]> = [];
    for (let k = 0; k < cols; k++) {
      const cc = col + k;
      for (let r = 0; r < c.rows; r++) path.push([cc, k % 2 === 0 ? c.rows - 1 - r : r]);
    }
    const cabinets = cols * c.rows;
    const pixels = Math.round(cabinets * pxPerCab);
    chains.push({ port: s.port, colStart: col, colEnd: col + cols - 1, cabinets, pixels, loadPct: (pixels / s.max) * 100, path });
    col += cols;
  }
  return chains;
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
}

export const DEFAULT_POWER: PowerSettings = { voltage: 230, loadLimitPct: 80, phases: 3 };

export function powerSettings(project: Project): PowerSettings {
  return { ...DEFAULT_POWER, ...((project.extensions?.power as Partial<PowerSettings>) ?? {}) };
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
    rows.push({ item: "Data cable (CAT6) — processor to first cabinet", model: "CAT6", qty: chains.length, location: s.name, spec: "Length to be measured on site", notes: "" });
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
