import type { LedScreen, Project } from "./types";

export interface GridAssignment {
  /** first grid number on this screen (1-based, continuous per processor) */
  start: number;
  /** number of cabinets on this screen */
  count: number;
  /** processor display name, e.g. "NovaStar VX1000" */
  processorName: string;
  /** short label, e.g. "VX1000" */
  processorLabel: string;
}

export function cabinetCount(screen: LedScreen) {
  const { cols, rows } = screen.panelConfiguration;
  return Math.max(1, Math.round(cols)) * Math.max(1, Math.round(rows));
}

/**
 * Numbering is continuous per processor across every screen assigned to it.
 * Screens are ordered by their persisted `gridOrder`, so moving a screen in the
 * scene never changes its grid IDs — only an explicit renumber does.
 */
export function computeGridNumbers(project: Project | null): Map<string, GridAssignment> {
  const map = new Map<string, GridAssignment>();
  if (!project) return map;

  const byProcessor = new Map<string, LedScreen[]>();
  project.screens.forEach((screen) => {
    const key = screen.processorId ?? project.processors[0]!.id;
    const list = byProcessor.get(key) ?? [];
    list.push(screen);
    byProcessor.set(key, list);
  });

  byProcessor.forEach((screens, processorId) => {
    const processor = project.processors.find((p) => p.id === processorId);
    const processorName = processor
      ? processor.name?.trim() || `${processor.brand} ${processor.label}`
      : "Unassigned";
    const processorLabel = processor?.label ?? "N/A";

    // Grouped sections are one continuous screen: they are numbered back-to-back,
    // anchored at the lowest gridOrder in the group.
    const groupAnchor = new Map<string, number>();
    screens.forEach((s) => {
      if (!s.groupId) return;
      const order = s.gridOrder ?? 0;
      const current = groupAnchor.get(s.groupId);
      if (current === undefined || order < current) groupAnchor.set(s.groupId, order);
    });
    const rank = (s: LedScreen) =>
      s.groupId ? (groupAnchor.get(s.groupId) ?? (s.gridOrder ?? 0)) : (s.gridOrder ?? 0);

    const ordered = [...screens].sort(
      (a, b) => rank(a) - rank(b) || (a.gridOrder ?? 0) - (b.gridOrder ?? 0),
    );
    let next = 1;
    ordered.forEach((screen) => {
      const count = cabinetCount(screen);
      map.set(screen.id, { start: next, count, processorName, processorLabel });
      next += count;
    });
  });


  return map;
}
