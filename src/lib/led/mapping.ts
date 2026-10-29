import { cabinetCalc } from "./calc";
import { derivedResolution, projectChains } from "./resolution";
import { computeGridNumbers } from "./grid-numbering";
import { processorPortMap } from "./ports";
import type { LedScreen, Project, ProcessorModel } from "./types";

/**
 * The mapping chain is deliberately explicit:
 *   Media → Content Canvas → Logical Output → Processor → Physical RJ45 Port
 *   → LED Screen → LED Cabinets
 * Each hop is a distinct concept and is never inferred from another.
 */
export interface SignalChainLink {
  screen: LedScreen;
  processor: ProcessorModel | undefined;
  /** logical output region index on the content canvas */
  logicalOutput: number;
  /** physical RJ45 / LAN connector on the processor */
  rj45Port: number;
  cabinets: number;
  cabinetCols: number;
  cabinetRows: number;
  gridStart: number;
  gridEnd: number;
}

export function signalChain(project: Project): SignalChainLink[] {
  const grids = computeGridNumbers(project);
  return project.screens.map((screen) => {
    const calc = cabinetCalc(screen);
    const assignment = grids.get(screen.id);
    return {
      screen,
      processor: project.processors.find((p) => p.id === screen.processorId),
      logicalOutput: screen.processorOutput,
      rj45Port: screen.rj45Port,
      cabinets: calc.total,
      cabinetCols: calc.cols,
      cabinetRows: calc.rows,
      gridStart: assignment?.start ?? 1,
      gridEnd: assignment ? assignment.start + assignment.count - 1 : 1,
    };
  });
}

export function portLabel(processor: ProcessorModel | undefined, port: number) {
  return `${processor ? `${processor.brand} ${processor.label}` : "Processor"} → RJ45 Port ${port}`;
}

export type IssueLevel = "error" | "warning";

export interface MappingIssue {
  id: string;
  level: IssueLevel;
  title: string;
  detail: string;
  screenId?: string;
}

function overlaps(a: LedScreen, b: LedScreen) {
  return (
    a.content.x < b.content.x + b.content.width &&
    b.content.x < a.content.x + a.content.width &&
    a.content.y < b.content.y + b.content.height &&
    b.content.y < a.content.y + a.content.height
  );
}

/** Validation across ports, outputs, resolutions and canvas geometry. */
export function validateMapping(project: Project): MappingIssue[] {
  const issues: MappingIssue[] = [];
  const seenPorts = new Map<string, LedScreen>();

  for (const screen of project.screens) {
    const proc = project.processors.find((p) => p.id === screen.processorId);

    if (!proc) {
      issues.push({
        id: `${screen.id}-noproc`,
        level: "error",
        title: `${screen.name}: no processor`,
        detail: "This LED screen is not assigned to a video processor.",
        screenId: screen.id,
      });
      continue;
    }

    const key = `${proc.id}:${screen.rj45Port}`;
    const clash = seenPorts.get(key);
    // Sections in the same group are one logical screen and legitimately share a port.
    const sameGroup = clash && screen.groupId && clash.groupId === screen.groupId;
    if (clash && !sameGroup) {
      issues.push({
        id: `${screen.id}-dupport`,
        level: "error",
        title: `Duplicate RJ45 port ${screen.rj45Port} on ${proc.label}`,
        detail: `${clash.name} and ${screen.name} are both patched to ${proc.label} RJ45 Port ${screen.rj45Port}.`,
        screenId: screen.id,
      });
    } else if (!clash) {
      seenPorts.set(key, screen);
    }

    if (screen.rj45Port < 1 || screen.rj45Port > proc.outputs) {
      issues.push({
        id: `${screen.id}-badport`,
        level: "error",
        title: `${screen.name}: RJ45 port ${screen.rj45Port} does not exist`,
        detail: `${proc.brand} ${proc.label} has ${proc.outputs} physical LAN ports.`,
        screenId: screen.id,
      });
    }

    if (screen.processorOutput < 1 || screen.processorOutput > proc.outputs) {
      issues.push({
        id: `${screen.id}-badlogical`,
        level: "warning",
        title: `${screen.name}: logical output ${screen.processorOutput} out of range`,
        detail: `Logical outputs available on this processor: 1–${proc.outputs}.`,
        screenId: screen.id,
      });
    }

    const c = screen.content;
    if (c.width !== screen.pixelWidth || c.height !== screen.pixelHeight) {
      issues.push({
        id: `${screen.id}-res`,
        level: "warning",
        title: `${screen.name}: canvas region ≠ LED resolution`,
        detail: `Region is ${c.width} × ${c.height} px but the LED is ${screen.pixelWidth} × ${screen.pixelHeight} px — content will be scaled.`,
        screenId: screen.id,
      });
    }

    if (
      c.x < 0 ||
      c.y < 0 ||
      c.x + c.width > project.canvas.width ||
      c.y + c.height > project.canvas.height
    ) {
      issues.push({
        id: `${screen.id}-outside`,
        level: "error",
        title: `${screen.name}: region outside the content canvas`,
        detail: `Canvas is ${project.canvas.width} × ${project.canvas.height} px; region ends at ${
          c.x + c.width
        } × ${c.y + c.height} px.`,
        screenId: screen.id,
      });
    }
  }

  for (let i = 0; i < project.screens.length; i++) {
    for (let j = i + 1; j < project.screens.length; j++) {
      const a = project.screens[i]!;
      const b = project.screens[j]!;
      if (overlaps(a, b)) {
        issues.push({
          id: `${a.id}-${b.id}-overlap`,
          level: "warning",
          title: `Canvas regions overlap`,
          detail: `${a.name} and ${b.name} share pixels on the content canvas — they will show duplicate content.`,
          screenId: a.id,
        });
      }
    }
  }

  for (const proc of project.processors) {
    const used = project.screens.filter((s) => s.processorId === proc.id);
    if (used.length === 0) continue;
    const load = used.reduce((sum, s) => sum + s.pixelWidth * s.pixelHeight, 0);
    if (load > proc.maxPixels) {
      issues.push({
        id: `${proc.id}-overload`,
        level: "error",
        title: `${proc.brand} ${proc.label} over capacity`,
        detail: `${load.toLocaleString()} px patched against a ${proc.maxPixels.toLocaleString()} px limit.`,
      });
    }
  }

  for (const proc of project.processors) {
    const used = project.screens.filter((s) => s.processorId === proc.id);
    if (used.length === 0) continue;
    const inW = proc.inputWidth ?? 1920;
    const inH = proc.inputHeight ?? 1080;
    const maxW = proc.maxInputWidth ?? 1920;
    const maxH = proc.maxInputHeight ?? 1080;
    if (inW > maxW || inH > maxH) {
      issues.push({
        id: `${proc.id}-source`,
        level: "error",
        title: `${proc.name ?? proc.label}: source resolution out of range`,
        detail: `${inW} × ${inH} px exceeds the supported maximum of ${maxW} × ${maxH} px.`,
      });
    }
    if (
      project.canvas.sourceProcessorId === proc.id &&
      (project.canvas.width !== inW || project.canvas.height !== inH)
    ) {
      issues.push({
        id: `${proc.id}-canvas-mismatch`,
        level: "warning",
        title: `Canvas ≠ ${proc.name ?? proc.label} source resolution`,
        detail: `Content canvas is ${project.canvas.width} × ${project.canvas.height} px but the laptop/Mac feed is set to ${inW} × ${inH} px.`,
      });
    }
  }

  for (const group of project.groups ?? []) {
    const members = project.screens.filter((s) => s.groupId === group.id);
    if (members.length < 2) continue;
    const procIds = new Set(members.map((m) => m.processorId));
    if (procIds.size > 1) {
      issues.push({
        id: `${group.id}-split`,
        level: "error",
        title: `${group.name} is split across processors`,
        detail: "A continuous LED group must be driven by a single processor.",
        screenId: members[0]!.id,
      });
    }
  }

  // cabinet / pitch derived resolution vs configured resolution
  for (const screen of project.screens) {
    const d = derivedResolution(screen);
    if (d.overridden) {
      issues.push({
        id: `${screen.id}-derived`,
        level: screen.resolutionOverride ? "warning" : "error",
        title: `${screen.name}: resolution ≠ cabinet specification`,
        detail: `P${screen.pixelPitch} on a ${d.cols} × ${d.rows} cabinet grid gives ${d.pixelWidth} × ${d.pixelHeight} px, but the screen is set to ${screen.pixelWidth} × ${screen.pixelHeight} px.${
          screen.resolutionOverride ? " Manual override is enabled." : ""
        }`,
        screenId: screen.id,
      });
    }
    if (
      Math.abs(d.actualWidth - screen.physicalWidth) > 0.005 ||
      Math.abs(d.actualHeight - screen.physicalHeight) > 0.005
    ) {
      issues.push({
        id: `${screen.id}-physical`,
        level: "warning",
        title: `${screen.name}: cabinet grid ≠ physical size`,
        detail: `${d.cols} × ${d.rows} cabinets measure ${d.actualWidth} × ${d.actualHeight} m against a configured ${screen.physicalWidth} × ${screen.physicalHeight} m.`,
        screenId: screen.id,
      });
    }
  }

  // source → processor → mapping → LED chain
  for (const chain of projectChains(project)) {
    for (const [i, note] of chain.notes.entries()) {
      issues.push({
        id: `${chain.processor.id}-chain-${i}`,
        level: chain.status === "error" ? "error" : "warning",
        title: `${chain.processor.name ?? chain.processor.label}: ${
          chain.status === "error" ? "incompatible chain" : "scaling required"
        }`,
        detail: note,
      });
    }
  }

  // per-port pixel load, port count and total processor capacity
  for (const proc of project.processors) {
    if (!project.screens.some((s) => s.processorId === proc.id)) continue;
    const map = processorPortMap(project, proc);
    for (const note of map.issues) {
      issues.push({
        id: `${proc.id}-portmap-${note.slice(0, 24)}`,
        level: "error",
        title: `${proc.name ?? proc.label}: port / capacity conflict`,
        detail: `${note}${map.recommendations.length ? ` Recommended: ${map.recommendations[0]}` : ""}`,
      });
    }
    for (const port of map.ports) {
      if (port.status === "over") {
        issues.push({
          id: `${proc.id}-port${port.port}-over`,
          level: "error",
          title: `${proc.label} RJ45 Port ${port.port} over capacity`,
          detail: `${port.pixels.toLocaleString()} px / ${port.maxPixels.toLocaleString()} px (${port.width} × ${port.height}). ${port.notes.join(" ")}`,
          ...(port.sections[0] ? { screenId: port.sections[0].screenId } : {}),
        });
      } else if (port.status === "warn") {
        issues.push({
          id: `${proc.id}-port${port.port}-warn`,
          level: "warning",
          title: `${proc.label} RJ45 Port ${port.port} at ${port.loadPct.toFixed(0)}%`,
          detail: `${port.pixels.toLocaleString()} px of ${port.maxPixels.toLocaleString()} px used — ${port.remaining.toLocaleString()} px remaining.`,
          ...(port.sections[0] ? { screenId: port.sections[0].screenId } : {}),
        });
      }
    }
  }

  // multiple processors must be mapped independently
  const activeProcessors = new Set(project.screens.map((s) => s.processorId));
  if (activeProcessors.size > 1) {
    issues.push({
      id: "multi-processor",
      level: "warning",
      title: "Multiple processors in use",
      detail: `${activeProcessors.size} processors drive this stage — each needs its own source feed and output mapping. Verify per-processor canvas regions before show.`,
    });
  }

  if (project.screens.length === 0) {
    issues.push({
      id: "no-screens",
      level: "warning",
      title: "No LED surfaces configured",
      detail: "Add an LED screen to start mapping ports and canvas regions.",
    });
  }

  return issues;
}
