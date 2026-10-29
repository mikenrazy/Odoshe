import type { Project } from "./types";
import { screenChains } from "./engineering";

/** Pack native LED regions together without moving the physical screens or resizing their cabinets. */
export function configureScreenSet(project: Project, groupId: string): Project {
  const group = project.groups?.find((g) => g.id === groupId);
  const members = project.screens.filter((s) => s.groupId === groupId).sort((a, b) => a.position.x - b.position.x);
  const lead = members[0];
  if (!group || !lead) return project;
  let x0 = Math.max(0, Math.min(...members.map((s) => s.content.x)));
  const y0 = Math.max(0, Math.min(...members.map((s) => s.content.y)));
  const width = members.reduce((n, s) => n + s.pixelWidth, 0);
  const height = Math.max(...members.map((s) => s.pixelHeight));
  const others = project.screens.filter((s) => s.groupId !== groupId && s.visible !== false);
  if (others.some((s) => x0 < s.content.x + s.content.width && s.content.x < x0 + width && y0 < s.content.y + s.content.height && s.content.y < y0 + height)) {
    x0 = Math.max(x0, ...others.map((s) => s.content.x + s.content.width));
  }
  let cursor = x0;
  const regions = new Map(members.map((s) => {
    const region = { x: cursor, y: y0, width: s.pixelWidth, height: s.pixelHeight };
    cursor += s.pixelWidth;
    return [s.id, region] as const;
  }));
  const next: Project = {
    ...project,
    groups: project.groups.map((g) => g.id === groupId ? { ...g, mappingMode: "shared-input" } : g),
    canvas: { ...project.canvas, width: Math.max(project.canvas.width, cursor), height: Math.max(project.canvas.height, y0 + Math.max(...members.map((s) => s.pixelHeight))) },
    screens: project.screens.map((s) => {
      const content = regions.get(s.id);
      return content ? { ...s, content, processorId: lead.processorId, processorOutput: lead.processorOutput } : s;
    }),
  };
  return {
    ...next,
    screens: next.screens.map((s) => {
      if (s.processorId !== lead.processorId) return s;
      const chains = screenChains(next, s);
      return { ...s, rj45Port: chains[0]?.port ?? 1, portSpan: chains.length };
    }),
  };
}