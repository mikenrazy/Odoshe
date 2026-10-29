import { describe, expect, it } from "vitest";
import { globalLayout, screenPower, DEFAULT_POWER } from "./engineering";
import type { LedScreen, Project } from "./types";

function screen(id: string, x: number, w: number, h: number, cols: number, rows: number, pw: number, ph: number, px: number): LedScreen {
  return {
    id, name: id, type: "flat", physicalWidth: w, physicalHeight: h, physicalDepth: 0.1,
    pixelWidth: px === 0 ? 0 : px, pixelHeight: 0, pixelPitch: 2.6,
    position: { x, y: h / 2, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 },
    curvature: {} as LedScreen["curvature"], panelConfiguration: { cols, rows, show: true, panelWidth: pw, panelHeight: ph, sizeKey: "custom" },
    brightness: 1, color: "#3b82f6", processorId: "p", processorOutput: 1, rj45Port: 1,
    content: { x: 0, y: 0, width: 0, height: 0 }, visible: true, locked: false,
  } as LedScreen;
}

// CIO100 reference: centre 26×3 of 0.5×1 m, sides 8×5 of 0.5×0.5 m, 192 px per 0.5 m.
const left = { ...screen("LEFT-1", -8.5, 4, 2.5, 8, 5, 0.5, 0.5, 1536), pixelHeight: 960, content: { x: 0, y: 0, width: 1536, height: 960 } };
const centre = { ...screen("CENTER", 0, 13, 3, 26, 3, 0.5, 1, 4992), pixelHeight: 1152, content: { x: 1536, y: 0, width: 4992, height: 1152 } };
const right = { ...screen("RIGHT-1", 8.5, 4, 2.5, 8, 5, 0.5, 0.5, 1536), pixelHeight: 960, content: { x: 6528, y: 0, width: 1536, height: 960 } };
const project = { screens: [left, centre, right], processors: [], extensions: {} } as unknown as Project;

describe("CIO100 acceptance figures", () => {
  const g = globalLayout(project);
  it("combined canvas is 8064 × 1152 px", () => expect([g.canvasWidth, g.canvasHeight]).toEqual([8064, 1152]));
  it("total is 158 cabinets", () => expect(g.totalCabinets).toBe(158));
  it("active area is 59.00 m²", () => expect(g.activeAreaM2).toBe(59));
  it("centre is at X=1536 with 4992 × 1152", () => expect(g.placements[1]).toMatchObject({ x: 1536, width: 4992, height: 1152 }));
  it("side panels are 192 × 192 px", () => expect([g.placements[0]!.cabinetPxW, g.placements[0]!.cabinetPxH]).toEqual([192, 192]));
  it("footprint includes gaps (21 m wide)", () => expect(g.footprintWidthM).toBe(21));
});

describe("Power planning", () => {
  it("refuses to calculate without manufacturer data", () => expect(screenPower(centre, DEFAULT_POWER).status).toBe("missing"));
  it("never exceeds the usable circuit capacity", () => {
    const p = screenPower(centre, { ...DEFAULT_POWER, cabinetMaxW: 200, circuitAmps: 16 });
    // 230 V × 16 A × 80% = 2944 W → 14 cabinets → 4 whole columns of 3 = 12 per circuit
    expect(p.cabinetsPerCircuit).toBe(12);
    expect(p.circuits).toHaveLength(7);
    expect(Math.max(...p.circuits.map((c) => c.maxW))).toBeLessThanOrEqual(2944);
    expect(p.totalMaxW).toBe(15600);
  });
});
