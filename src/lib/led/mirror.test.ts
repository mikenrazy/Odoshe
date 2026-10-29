import { expect, it } from "vitest";
import { mirroredScreen } from "./mirror";
import type { LedScreen } from "./types";
import { buildDxf } from "./pixel-map-export";
import type { Project } from "./types";

const s = { id: "a", name: "LEFT-1", position: { x: -8.5, y: 1, z: 0 }, rotation: { x: 0, y: 15, z: 0 }, content: { x: 0, y: 0, width: 1536, height: 960 } } as LedScreen;
it("mirror lands at +x with RIGHT name and mirrored canvas slot", () => {
  const m = mirroredScreen(s, 8064);
  expect(m.position.x).toBe(8.5); expect(m.name).toBe("RIGHT-1"); expect(m.rotation.y).toBe(-15); expect(m.content.x).toBe(6528);
});
it("DXF has one cabinet rectangle per panel in millimetres", () => {
  const scr = { ...s, visible: true, physicalWidth: 4, physicalHeight: 2.5, pixelWidth: 1536, pixelHeight: 960, pixelPitch: 2.6, position: { x: 0, y: 1.25, z: 0 },
    panelConfiguration: { cols: 8, rows: 5, show: true, panelWidth: 0.5, panelHeight: 0.5, sizeKey: "custom" } } as unknown as LedScreen;
  const dxf = buildDxf({ stage: { width: 16, height: 1 }, screens: [scr] } as unknown as Project);
  expect(dxf.split("\nLED_CABINETS\n").length - 1).toBeGreaterThanOrEqual(40);
  expect(dxf).toContain("\n-2000\n");
});

import { globalLayout } from "./engineering";
it("overlapping canvas regions are laid side by side, left to right by stage position", () => {
  const mk = (id: string, x: number, cx: number, w: number) => ({ id, name: id, visible: true, position: { x, y: 1, z: 0 }, pixelWidth: w, pixelHeight: 1000, physicalWidth: 4, physicalHeight: 2.5, pixelPitch: 2.5,
    panelConfiguration: { cols: 8, rows: 5, show: true, panelWidth: 0.5, panelHeight: 0.5, sizeKey: "custom" }, content: { x: cx, y: 0, width: w, height: 1000 } }) as unknown as LedScreen;
  const g = globalLayout({ screens: [mk("C", 0, 1000, 5200), mk("L", -8, 0, 1600), mk("R", 8, 4900, 1600)] } as unknown as Project);
  expect(g.packed).toBe(true);
  expect(g.placements.map((p) => [p.name, p.x])).toEqual([["C", 1600], ["L", 0], ["R", 6800]]);
  expect(g.canvasWidth).toBe(8400);
});
