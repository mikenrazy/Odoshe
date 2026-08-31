import { derivedResolution } from "./resolution";
import type { LedScreen, ProcessorModel, Project } from "./types";

/**
 * Processor → Output Ports → LED Sections → LED Cabinets.
 *
 * A physical RJ45 port is a daisy-chain: it can carry MANY cabinets as long as
 * the summed pixel load stays inside the port budget. Ports are therefore
 * allocated by balancing the cabinet count across the processor's existing
 * outputs — extra ports are only ever requested when the pixel maths, not the
 * number of mapping sections, makes the configuration impossible.
 */

export type PortStatus = "free" | "ok" | "warn" | "over";

export const PORT_ICON: Record<PortStatus, string> = {
  free: "⚪",
  ok: "🟢",
  warn: "🟡",
  over: "🔴",
};

export const PORT_LABEL: Record<PortStatus, string> = {
  free: "Available",
  ok: "Assigned",
  warn: "Near limit",
  over: "Over capacity",
};

export const PORT_TONE: Record<PortStatus, string> = {
  free: "text-muted-foreground",
  ok: "text-[#4ade80]",
  warn: "text-primary",
  over: "text-destructive",
};

export interface PortSection {
  screenId: string;
  screenName: string;
  /** cabinet columns / rows carried by this port slice */
  cabinetCols: number;
  cabinetRows: number;
  cabinets: number;
  width: number;
  height: number;
  pixels: number;
}

export interface PortInfo {
  port: number;
  sections: PortSection[];
  cabinets: number;
  /** how many cabinets this port could still carry at the current pitch */
  maxCabinets: number;
  /** bounding resolution carried by this port */
  width: number;
  height: number;
  pixels: number;
  maxPixels: number;
  maxWidth: number;
  maxHeight: number;
  remaining: number;
  loadPct: number;
  status: PortStatus;
  notes: string[];
}

export interface ProcessorPortMap {
  processor: ProcessorModel;
  ports: PortInfo[];
  portsUsed: number;
  totalPixels: number;
  maxPixels: number;
  loadPct: number;
  /** ports genuinely required by the pixel load (never inflated by sections) */
  portsRequired: number;
  /** cabinets patched to this processor */
  panelsAssigned: number;
  /** cabinets the processor can still take at the current pitch */
  panelCapacity: number;
  /** derived cabinets-per-port ceiling at the current cabinet spec */
  maxPanelsPerPort: number;
  status: PortStatus;
  issues: string[];
  recommendations: string[];
}

export function portMaxPixels(processor: ProcessorModel) {
  return Math.max(1, processor.portMaxPixels ?? 650_000);
}

/** Pixels carried by one cabinet of this screen. */
export function cabinetPixels(screen: LedScreen) {
  const d = derivedResolution(screen);
  return Math.max(1, d.cabinetPixelWidth * d.cabinetPixelHeight);
}

/**
 * Dynamic cabinets-per-port ceiling: port pixel budget ÷ pixels per cabinet,
 * rounded DOWN. Never hard-coded.
 */
export function maxPanelsPerPort(screen: LedScreen, processor: ProcessorModel) {
  return Math.max(1, Math.floor(portMaxPixels(processor) / cabinetPixels(screen)));
}

/** Balanced split of `total` cabinets into `parts` chains (8,8,…,7,7). */
function balancedChunks(total: number, parts: number) {
  const n = Math.max(1, parts);
  const base = Math.floor(total / n);
  const extra = total % n;
  return Array.from({ length: n }, (_, i) => base + (i < extra ? 1 : 0)).filter((c) => c > 0);
}

export interface ScreenAllocation {
  screen: LedScreen;
  cabinets: number;
  maxPerPort: number;
  minPorts: number;
  ports: number;
  chunks: number[];
}

/**
 * Allocate the processor's physical ports across its screens: every screen
 * gets at least the ports its pixel load demands, then any spare ports are
 * handed to the busiest chains so the panels end up evenly spread (e.g. 78
 * panels over 10 ports → 8×8 + 2×7).
 */
export function allocateScreenPorts(
  project: Project,
  processor: ProcessorModel,
): { allocations: ScreenAllocation[]; portsRequired: number; fits: boolean } {
  const screens = [...project.screens.filter((s) => s.processorId === processor.id)].sort(
    (a, b) => (a.gridOrder ?? 0) - (b.gridOrder ?? 0),
  );
  const outputs = Math.max(1, processor.outputs);

  const allocations: ScreenAllocation[] = screens.map((screen) => {
    const d = derivedResolution(screen);
    const cabinets = Math.max(1, d.cols * d.rows);
    const maxPer = maxPanelsPerPort(screen, processor);
    const minPorts = Math.max(1, Math.ceil(cabinets / maxPer));
    return { screen, cabinets, maxPerPort: maxPer, minPorts, ports: minPorts, chunks: [] };
  });

  const portsRequired = allocations.reduce((s, a) => s + a.minPorts, 0);
  let spare = outputs - portsRequired;

  // Spread spare ports so the busiest chain is relieved first.
  while (spare > 0) {
    const target = allocations
      .filter((a) => a.ports < a.cabinets)
      .sort((a, b) => b.cabinets / b.ports - a.cabinets / a.ports)[0];
    if (!target) break;
    target.ports += 1;
    spare -= 1;
  }

  for (const a of allocations) a.chunks = balancedChunks(a.cabinets, a.ports);

  return { allocations, portsRequired, fits: portsRequired <= outputs };
}

/** How many consecutive ports a screen needs at the current cabinet layout. */
export function portsNeeded(screen: LedScreen, processor: ProcessorModel) {
  const d = derivedResolution(screen);
  return Math.max(1, Math.ceil((d.cols * d.rows) / maxPanelsPerPort(screen, processor)));
}

/** Cabinet columns a single port can carry for a given screen. */
export function colsPerPort(screen: LedScreen, processor: ProcessorModel) {
  const d = derivedResolution(screen);
  const rows = Math.max(1, d.rows);
  return Math.max(1, Math.floor(maxPanelsPerPort(screen, processor) / rows));
}

/** Split a screen into per-port cabinet chains (balanced cabinet counts). */
export function screenSlices(
  screen: LedScreen,
  processor: ProcessorModel,
  ports?: number,
): PortSection[] {
  const d = derivedResolution(screen);
  const cabW = Math.max(1, d.cabinetPixelWidth);
  const cabH = Math.max(1, d.cabinetPixelHeight);
  const cabinets = Math.max(1, d.cols * d.rows);
  const span = Math.max(1, ports ?? portsNeeded(screen, processor));
  const chunks = balancedChunks(cabinets, span);
  const total = chunks.length;

  return chunks.map((count, i) => {
    // Prefer whole-column chains so the slice maps to a real wall region.
    const rows = Math.max(1, Math.min(d.rows, count));
    const cols = count % rows === 0 ? count / rows : count;
    const usedRows = count % rows === 0 ? rows : 1;
    return {
      screenId: screen.id,
      screenName: total > 1 ? `${screen.name} · chain ${i + 1}/${total}` : screen.name,
      cabinetCols: cols,
      cabinetRows: usedRows,
      cabinets: count,
      width: cols * cabW,
      height: usedRows * cabH,
      pixels: count * cabW * cabH,
    };
  });
}

/** Full port map for one processor. */
export function processorPortMap(project: Project, processor: ProcessorModel): ProcessorPortMap {
  const maxPP = portMaxPixels(processor);
  const outputs = Math.max(1, processor.outputs);
  const { allocations, portsRequired, fits } = allocateScreenPorts(project, processor);

  const ports: PortInfo[] = Array.from({ length: outputs }, (_, i) => ({
    port: i + 1,
    sections: [],
    cabinets: 0,
    maxCabinets: 0,
    width: 0,
    height: 0,
    pixels: 0,
    maxPixels: maxPP,
    maxWidth: processor.outputWidth,
    maxHeight: processor.outputHeight,
    remaining: maxPP,
    loadPct: 0,
    status: "free" as PortStatus,
    notes: [],
  }));

  const issues: string[] = [];
  const overflow: PortSection[] = [];

  let cursor = 1;
  for (const alloc of allocations) {
    const slices = screenSlices(alloc.screen, processor, alloc.ports);
    // Honour the patched start port when it still leaves room for the chain.
    const patched = Math.max(1, Math.round(alloc.screen.rj45Port || cursor));
    let start = patched;
    if (fits) {
      if (patched < cursor || patched + slices.length - 1 > outputs) start = cursor;
    }
    slices.forEach((slice, i) => {
      const portNumber = start + i;
      const port = ports[portNumber - 1];
      if (!port) {
        overflow.push(slice);
        issues.push(
          `${slice.screenName} needs RJ45 Port ${portNumber}, but ${processor.label} only has ${outputs} ports.`,
        );
        return;
      }
      port.sections.push(slice);
      port.cabinets += slice.cabinets;
      port.maxCabinets = Math.max(port.maxCabinets, alloc.maxPerPort);
      port.width = Math.max(port.width, slice.width);
      port.height = Math.max(port.height, slice.height);
      port.pixels += slice.pixels;
    });
    cursor = Math.max(cursor, start + slices.length);
  }

  for (const port of ports) {
    port.remaining = Math.max(0, port.maxPixels - port.pixels);
    port.loadPct = (port.pixels / port.maxPixels) * 100;
    if (port.sections.length === 0) {
      port.status = "free";
      continue;
    }
    if (port.sections.length > 1) {
      port.notes.push(`${port.sections.length} sections daisy-chained on this port.`);
    }
    if (port.pixels > port.maxPixels) {
      port.status = "over";
      port.notes.push(
        `${port.pixels.toLocaleString()} px exceeds the ${port.maxPixels.toLocaleString()} px port limit.`,
      );
    } else if (port.loadPct >= 90) {
      port.status = "warn";
      port.notes.push("Above 90% of this port's pixel budget — leave headroom for redundancy.");
    } else {
      port.status = "ok";
    }
  }

  const totalPixels =
    ports.reduce((sum, p) => sum + p.pixels, 0) + overflow.reduce((s, o) => s + o.pixels, 0);
  const maxPixels = Math.max(1, processor.maxPixels);
  const loadPct = (totalPixels / maxPixels) * 100;
  const portsUsed = ports.filter((p) => p.sections.length > 0).length;
  const panelsAssigned = allocations.reduce((s, a) => s + a.cabinets, 0);
  const perPortCeiling = allocations.length
    ? Math.min(...allocations.map((a) => a.maxPerPort))
    : Math.floor(maxPP / 40_000);
  const panelCapacity = perPortCeiling * outputs;

  let status: PortStatus = portsUsed === 0 ? "free" : "ok";
  if (ports.some((p) => p.status === "over") || overflow.length > 0) status = "over";
  else if (ports.some((p) => p.status === "warn") || loadPct >= 90) status = "warn";

  const recommendations: string[] = [];

  if (totalPixels > maxPixels) {
    status = "over";
    issues.push(
      `Total LED load ${totalPixels.toLocaleString()} px exceeds the ${processor.label} processing capacity of ${maxPixels.toLocaleString()} px.`,
    );
    recommendations.push(
      `Add a second processor and move ${Math.ceil((totalPixels - maxPixels) / maxPP)} port(s) of LED onto it.`,
    );
  } else if (loadPct >= 90 && portsUsed > 0) {
    recommendations.push(
      `Processor is at ${loadPct.toFixed(1)}% of capacity — keep spare headroom for redundancy.`,
    );
  }

  // Extra ports are only requested when the PIXEL load cannot fit the outputs.
  if (portsRequired > outputs) {
    status = "over";
    issues.push(
      `The pixel load needs at least ${portsRequired} ports at ${maxPP.toLocaleString()} px each, but ${processor.label} only offers ${outputs}.`,
    );
    recommendations.push(
      `Add ${portsRequired - outputs} more output(s) — a second ${processor.label} or a larger processor.`,
    );
  }

  for (const port of ports) {
    if (port.status === "over") {
      const spare = ports.filter((p) => p.sections.length === 0).length;
      recommendations.push(
        spare > 0
          ? `Port ${port.port} is over its limit — auto-distribute to spread its cabinets onto ${spare} free port(s).`
          : `Port ${port.port} is over its limit and no free ports remain — add a processor or reduce cabinets.`,
      );
    }
  }

  return {
    processor,
    ports,
    portsUsed,
    totalPixels,
    maxPixels,
    loadPct,
    portsRequired,
    panelsAssigned,
    panelCapacity,
    maxPanelsPerPort: perPortCeiling,
    status,
    issues,
    recommendations: [...new Set(recommendations)],
  };
}

export interface PortPlanEntry {
  screenId: string;
  rj45Port: number;
  portSpan: number;
}

/**
 * Most efficient distribution of every section across the EXISTING ports:
 * panels are balanced over the processor's outputs, never spilling into
 * virtual ports unless the pixel budget genuinely demands more.
 */
export function planPortDistribution(
  project: Project,
  processor: ProcessorModel,
): { plan: PortPlanEntry[]; portsNeeded: number; fits: boolean } {
  const { allocations, portsRequired, fits } = allocateScreenPorts(project, processor);
  const plan: PortPlanEntry[] = [];
  let cursor = 1;
  for (const alloc of allocations) {
    plan.push({ screenId: alloc.screen.id, rj45Port: cursor, portSpan: alloc.ports });
    cursor += alloc.ports;
  }
  return {
    plan,
    portsNeeded: fits ? Math.min(cursor - 1, Math.max(1, processor.outputs)) : portsRequired,
    fits,
  };
}
