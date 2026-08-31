import { derivedResolution } from "./resolution";
import type { LedScreen, ProcessorModel, Project } from "./types";

/**
 * Processor → Output Ports → LED Sections → LED Cabinets.
 *
 * A processor is never treated as one unrestricted output: each physical RJ45
 * port carries its own pixel budget and width/height ceiling, and the sum of
 * every port must still fit inside the processor's total pixel capacity.
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
  /** ports required if the load were distributed optimally */
  portsRequired: number;
  status: PortStatus;
  issues: string[];
  recommendations: string[];
}

export function portMaxPixels(processor: ProcessorModel) {
  return Math.max(1, processor.portMaxPixels ?? 650_000);
}

/** Cabinet columns a single port can carry for a given screen. */
export function colsPerPort(screen: LedScreen, processor: ProcessorModel) {
  const d = derivedResolution(screen);
  const cabW = Math.max(1, d.cabinetPixelWidth);
  const height = Math.max(1, d.cabinetPixelHeight * d.rows);
  const byPixels = Math.floor(portMaxPixels(processor) / (cabW * height));
  const byWidth = Math.floor(processor.outputWidth / cabW);
  return Math.max(1, Math.min(byPixels || 1, byWidth || 1, d.cols));
}

/** How many consecutive ports a screen needs at the current cabinet layout. */
export function portsNeeded(screen: LedScreen, processor: ProcessorModel) {
  const d = derivedResolution(screen);
  return Math.max(1, Math.ceil(d.cols / colsPerPort(screen, processor)));
}

/** Split a screen into per-port cabinet slices, honouring its portSpan. */
export function screenSlices(screen: LedScreen, processor: ProcessorModel): PortSection[] {
  const d = derivedResolution(screen);
  const span = Math.max(1, Math.round(screen.portSpan ?? 1));
  const base = Math.floor(d.cols / span);
  const extra = d.cols % span;
  const slices: PortSection[] = [];
  for (let i = 0; i < span; i++) {
    const cols = Math.max(0, base + (i < extra ? 1 : 0));
    if (cols === 0) continue;
    const width = cols * d.cabinetPixelWidth;
    const height = d.rows * d.cabinetPixelHeight;
    slices.push({
      screenId: screen.id,
      screenName: span > 1 ? `${screen.name} · slice ${i + 1}/${span}` : screen.name,
      cabinetCols: cols,
      cabinetRows: d.rows,
      cabinets: cols * d.rows,
      width,
      height,
      pixels: width * height,
    });
  }
  return slices;
}

/** Full port map for one processor. */
export function processorPortMap(project: Project, processor: ProcessorModel): ProcessorPortMap {
  const screens = project.screens.filter((s) => s.processorId === processor.id);
  const maxPP = portMaxPixels(processor);
  const ports: PortInfo[] = Array.from({ length: Math.max(1, processor.outputs) }, (_, i) => ({
    port: i + 1,
    sections: [],
    cabinets: 0,
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

  for (const screen of [...screens].sort((a, b) => (a.gridOrder ?? 0) - (b.gridOrder ?? 0))) {
    const slices = screenSlices(screen, processor);
    slices.forEach((slice, i) => {
      const portNumber = screen.rj45Port + i;
      const port = ports[portNumber - 1];
      if (!port) {
        overflow.push(slice);
        issues.push(
          `${slice.screenName} is patched to RJ45 Port ${portNumber}, but ${processor.label} only has ${processor.outputs} ports.`,
        );
        return;
      }
      port.sections.push(slice);
      port.cabinets += slice.cabinets;
      port.width = Math.max(port.width, slice.width);
      port.height = Math.max(port.height, slice.height);
      port.pixels += slice.pixels;
    });
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
    } else if (port.width > port.maxWidth || port.height > port.maxHeight) {
      port.status = "over";
      port.notes.push(
        `${port.width} × ${port.height} px exceeds the port ceiling of ${port.maxWidth} × ${port.maxHeight} px.`,
      );
    } else if (port.loadPct >= 85) {
      port.status = "warn";
      port.notes.push("Above 85% of this port's pixel budget — leave headroom for redundancy.");
    } else {
      port.status = "ok";
    }
  }

  const totalPixels =
    ports.reduce((sum, p) => sum + p.pixels, 0) + overflow.reduce((s, o) => s + o.pixels, 0);
  const maxPixels = Math.max(1, processor.maxPixels);
  const loadPct = (totalPixels / maxPixels) * 100;
  const portsUsed = ports.filter((p) => p.sections.length > 0).length;
  const portsRequired = Math.ceil(totalPixels / maxPP);

  let status: PortStatus = portsUsed === 0 ? "free" : "ok";
  if (ports.some((p) => p.status === "over") || overflow.length > 0) status = "over";
  else if (ports.some((p) => p.status === "warn") || loadPct >= 85) status = "warn";

  const recommendations: string[] = [];

  if (totalPixels > maxPixels) {
    status = "over";
    issues.push(
      `Total LED load ${totalPixels.toLocaleString()} px exceeds the ${processor.label} processing capacity of ${maxPixels.toLocaleString()} px — every section fits its port, but the processor as a whole does not.`,
    );
    recommendations.push(
      `Add a second processor and move ${Math.ceil((totalPixels - maxPixels) / maxPP)} port(s) of LED onto it.`,
    );
    recommendations.push(
      `Or reduce the LED canvas by ${(totalPixels - maxPixels).toLocaleString()} px (fewer cabinets or a coarser pitch).`,
    );
  } else if (loadPct >= 85 && portsUsed > 0) {
    recommendations.push(
      `Processor is at ${loadPct.toFixed(1)}% of capacity — keep spare headroom for redundancy or a backup loop.`,
    );
  }

  if (portsRequired > processor.outputs) {
    status = "over";
    issues.push(
      `The load needs at least ${portsRequired} ports at ${maxPP.toLocaleString()} px each, but ${processor.label} only offers ${processor.outputs}.`,
    );
    recommendations.push("Split the wall across an additional processor.");
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
 * Most efficient distribution of every section across the available ports:
 * screens keep their grid order, oversized walls are split by cabinet columns
 * onto consecutive ports.
 */
export function planPortDistribution(
  project: Project,
  processor: ProcessorModel,
): { plan: PortPlanEntry[]; portsNeeded: number; fits: boolean } {
  const screens = [...project.screens.filter((s) => s.processorId === processor.id)].sort(
    (a, b) => (a.gridOrder ?? 0) - (b.gridOrder ?? 0),
  );
  const plan: PortPlanEntry[] = [];
  let cursor = 1;
  for (const screen of screens) {
    const span = portsNeeded(screen, processor);
    plan.push({ screenId: screen.id, rj45Port: cursor, portSpan: span });
    cursor += span;
  }
  const needed = cursor - 1;
  return { plan, portsNeeded: needed, fits: needed <= processor.outputs };
}
