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
  /** true when the saved canvas regions overlapped and screens were laid side by side instead */
  packed: boolean;
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

/** True when two visible screens claim overlapping canvas pixels. */
export function hasCanvasOverlap(project: Project): boolean {
  const r = project.screens.filter((s) => s.visible !== false).map((s) => ({ x: s.content.x, y: s.content.y, w: s.pixelWidth, h: s.pixelHeight }));
  for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) {
    const a = r[i]!, b = r[j]!;
    if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) return true;
  }
  return false;
}

/** Side-by-side canvas slots (left→right by stage position, top aligned) — the LEDMapper layout. */
export function packedCanvas(project: Project): Map<string, { x: number; y: number }> {
  const out = new Map<string, { x: number; y: number }>();
  let x = 0;
  for (const s of project.screens.filter((v) => v.visible !== false).sort((a, b) => a.position.x - b.position.x)) {
    out.set(s.id, { x, y: 0 }); x += s.pixelWidth;
  }
  return out;
}

export function globalLayout(project: Project): GlobalLayout {
  const screens = project.screens.filter((s) => s.visible !== false);
  const packed = hasCanvasOverlap(project) ? packedCanvas(project) : null;
  const placements = screens.map((s) => {
    const c = cabinetCalc(s);
    return {
      screenId: s.id,
      name: s.name,
      x: packed?.get(s.id)?.x ?? s.content.x,
      y: packed?.get(s.id)?.y ?? s.content.y,
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
  for (const p of placements) { p.x -= minX; p.y -= minY; }
  return {
    placements,
    packed: !!packed,
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

/** Cabinets one port can carry: floor(port pixel capacity ÷ pixels per cabinet). */
export function cabinetsPerPortFor(project: Project, screen: LedScreen) {
  const c = cabinetCalc(screen);
  const pxPerCab = (screen.pixelWidth / c.cols) * (screen.pixelHeight / c.rows);
  return Math.max(1, Math.floor(portCapacity(project, screen).max / Math.max(1, pxPerCab)));
}

/** One continuous column serpentine through the whole screen, starting bottom-left. */
export function screenSerpentine(cols: number, rows: number): Array<[number, number]> {
  const p: Array<[number, number]> = [];
  for (let col = 0; col < cols; col++) for (let i = 0; i < rows; i++) p.push([col, col % 2 === 0 ? rows - 1 - i : i]);
  return p;
}

/** Cuts the serpentine into consecutive runs of at most `per` cabinets. */
function chunkPath(path: Array<[number, number]>, per: number) {
  const out: Array<Array<[number, number]>> = [];
  for (let i = 0; i < path.length; i += per) out.push(path.slice(i, i + per));
  return out;
}

/**
 * Splits a screen into data chains like the LEDMapper report: one serpentine (bottom-left start,
 * up/down by column) filled port by port with as many cabinets as the port's pixel capacity allows.
 * Ports are numbered continuously per processor in screen order; numbers above the processor's
 * output count are flagged.
 */
export function screenChains(project: Project, screen: LedScreen): CabinetChain[] {
  const c = cabinetCalc(screen);
  const { proc, max } = portCapacity(project, screen);
  const pxPerCab = (screen.pixelWidth / c.cols) * (screen.pixelHeight / c.rows);
  const per = cabinetsPerPortFor(project, screen);
  let firstPort = 1;
  for (const other of project.screens) {
    if (other.id === screen.id) break;
    if (other.processorId === screen.processorId && other.visible !== false)
      firstPort += Math.ceil(cabinetCalc(other).total / cabinetsPerPortFor(project, other));
  }
  return chunkPath(screenSerpentine(c.cols, c.rows), per).map((path, i) => {
    const cabinets = path.length;
    const pixels = Math.round(cabinets * pxPerCab);
    const port = firstPort + i;
    const colsUsed = path.map((p) => p[0]);
    return { port, colStart: Math.min(...colsUsed), colEnd: Math.max(...colsUsed), cabinets, pixels, loadPct: (pixels / max) * 100, path, overflow: proc ? port > proc.outputs : false };
  });
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
  /** datasheet power per square metre — used when no per-cabinet watts are entered (handles mixed cabinet sizes) */
  maxWPerM2?: number | undefined;
  typWPerM2?: number | undefined;
  /** LED weight per square metre (cabinets + frame), kg */
  kgPerM2?: number | undefined;
  /** working load limit of one hoist, kg */
  hoistKg?: number | undefined;
  /** estimated processor-to-first-cabinet cable run, metres */
  dataHomeRunM?: number | undefined;
}

export const DEFAULT_POWER: PowerSettings = { voltage: 230, loadLimitPct: 80, phases: 3 };

export function powerSettings(project: Project): PowerSettings {
  return { ...DEFAULT_POWER, ...((project.extensions?.["power"] as Partial<PowerSettings>) ?? {}) };
}

export interface PowerCircuit {
  id: string;
  /** feed label, e.g. "T1·L2" on 3-phase (tie-in 1, line 2) or "L1" on single phase */
  phase: string;
  colStart: number;
  colEnd: number;
  cabinets: number;
  maxW: number;
  typW: number | undefined;
  amps: number;
  loadPct: number;
  /** cabinets in serpentine order, bottom-left start */
  path: Array<[number, number]>;
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

/**
 * Circuits follow the same serpentine as data, each filled with as many cabinets as the
 * configured usable capacity allows (floor(usable W ÷ cabinet max W)).
 */
/** Typical P2.6 indoor rental figures — a starting point the operator applies with one click, then corrects from the datasheet. */
export const TYPICAL_LED_FIGURES = { maxWPerM2: 600, typWPerM2: 200, kgPerM2: 30, circuitAmps: 16, hoistKg: 1000 } as const;

/** Per-cabinet watts: explicit cabinet figure, else per-m² figure × cabinet area. */
export function cabinetWatts(screen: LedScreen, ps: PowerSettings) {
  const c = cabinetCalc(screen);
  const area = c.cabinetWidth * c.cabinetHeight;
  return {
    maxW: ps.cabinetMaxW ?? (ps.maxWPerM2 ? Math.round(ps.maxWPerM2 * area) : undefined),
    typW: ps.cabinetTypW ?? (ps.typWPerM2 ? Math.round(ps.typWPerM2 * area) : undefined),
  };
}

export interface ScreenRigging { weightKg: number | undefined; hoists: number | undefined }

/** Weight from kg/m² × area; hoists = max(2, weight at 50% of hoist WLL, one per 3 m of width). */
export function screenRigging(screen: LedScreen, ps: PowerSettings): ScreenRigging {
  const c = cabinetCalc(screen);
  const weightKg = ps.kgPerM2 ? +(c.area * ps.kgPerM2).toFixed(1) : undefined;
  const hoists = weightKg !== undefined && ps.hoistKg ? Math.max(2, Math.ceil((weightKg * 2) / ps.hoistKg), Math.ceil(c.actualWidth / 3)) : undefined;
  return { weightKg, hoists };
}

export function screenPower(screen: LedScreen, psIn: PowerSettings, prefix = "C"): ScreenPower {
  const c = cabinetCalc(screen);
  const cw = cabinetWatts(screen, psIn);
  const ps = { ...psIn, cabinetMaxW: cw.maxW, cabinetTypW: cw.typW };
  if (!ps.cabinetMaxW || !ps.circuitAmps || !ps.voltage)
    return { status: "missing", message: "Enter LED power (per cabinet or per m²), voltage and circuit rating (from manufacturer and venue data) to calculate power.", cabinetsPerCircuit: 0, circuits: [], totalMaxW: 0, totalTypW: undefined, totalAmps: 0 };
  const usableW = ps.voltage * ps.circuitAmps * (ps.loadLimitPct / 100);
  const perCircuit = Math.floor(usableW / ps.cabinetMaxW);
  if (perCircuit < 1)
    return { status: "missing", message: `One cabinet (${ps.cabinetMaxW} W) exceeds the usable circuit capacity (${Math.round(usableW)} W).`, cabinetsPerCircuit: 0, circuits: [], totalMaxW: 0, totalTypW: undefined, totalAmps: 0 };
  const circuits: PowerCircuit[] = chunkPath(screenSerpentine(c.cols, c.rows), perCircuit).map((path, i) => {
    const cabinets = path.length;
    const maxW = cabinets * ps.cabinetMaxW!;
    const amps = maxW / ps.voltage;
    const colsUsed = path.map((p) => p[0]);
    const phase = ps.phases === 3 ? `T${Math.floor(i / 3) + 1}·L${(i % 3) + 1}` : "L1";
    return { id: `${prefix}${i + 1}`, phase, colStart: Math.min(...colsUsed), colEnd: Math.max(...colsUsed), cabinets, maxW, typW: ps.cabinetTypW ? cabinets * ps.cabinetTypW : undefined, amps, loadPct: (amps / ps.circuitAmps!) * 100, path };
  });
  const totalMaxW = c.total * ps.cabinetMaxW;
  return { status: "ok", cabinetsPerCircuit: perCircuit, circuits, totalMaxW, totalTypW: ps.cabinetTypW ? c.total * ps.cabinetTypW : undefined, totalAmps: totalMaxW / ps.voltage };
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
