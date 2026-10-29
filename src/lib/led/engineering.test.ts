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
    // 230 V × 16 A × 80% = 2944 W → 14 cabinets per circuit → 78 cabinets = 5 × 14 + 8
    expect(p.cabinetsPerCircuit).toBe(14);
    expect(p.circuits.map((c) => c.cabinets)).toEqual([14, 14, 14, 14, 14, 8]);
    expect(p.circuits.map((c) => c.phase).slice(0, 4)).toEqual(["T1·L1", "T1·L2", "T1·L3", "T2·L1"]);
    expect(Math.max(...p.circuits.map((c) => c.maxW))).toBeLessThanOrEqual(2944);
    expect(p.totalMaxW).toBe(15600);
  });
});

describe("Data chains respect port capacity", () => {
  const proj = { ...project, processors: [{ id: "p", outputs: 10, portMaxPixels: 650_000 }] } as unknown as Project;
  it("CIO100 side screen uses 3 ports of 17, 17 and 6 cabinets (as in the sample report)", async () => {
    const { screenChains } = await import("./engineering");
    expect(screenChains(proj, left).map((c) => c.cabinets)).toEqual([17, 17, 6]);
  });
  it("CIO100 centre uses 10 ports of 8 cabinets, last one 6", async () => {
    const { screenChains } = await import("./engineering");
    const solo = { ...proj, screens: [centre] } as unknown as Project;
    expect(screenChains(solo, centre).map((c) => c.cabinets)).toEqual([8, 8, 8, 8, 8, 8, 8, 8, 8, 6]);
  });
  it("first port starts bottom-left and runs up column 1", async () => {
    const { screenChains } = await import("./engineering");
    expect(screenChains(proj, centre)[0]!.path.slice(0, 4)).toEqual([[0, 2], [0, 1], [0, 0], [1, 0]]);
  });
  it("no port exceeds 650,000 px", async () => {
    const { screenChains } = await import("./engineering");
    for (const s of [left, centre, right]) for (const c of screenChains(proj, s)) expect(c.pixels).toBeLessThanOrEqual(650_000);
  });
  it("flags ports beyond the processor's 10 outputs", async () => {
    const { screenChains } = await import("./engineering");
    expect(screenChains(proj, right).some((c) => c.overflow)).toBe(true);
  });
});

describe("VX1000 quick configuration guide", () => {
  it("lists ports in descending order within 650,000 px for the CIO100 centre", async () => {
    const { processorGuide } = await import("./processor-guide");
    const proc = { id: "p", brand: "NovaStar", label: "VX1000", outputs: 10, portMaxPixels: 650_000 };
    const g = processorGuide({ ...project, screens: [centre], processors: [proc] } as unknown as Project, proc as never);
    expect(g.screens[0]!.ports.length).toBe(10);
    expect(g.screens[0]!.problems.some((p) => p.includes("does not exist"))).toBe(false);
    expect(g.screens[0]!.ports.every((p) => p.pixels <= 650_000)).toBe(true);
  });
});

describe("Processor-dependent resolution", () => {
  it("VX1000 picks the exact 3840×1080 canvas as source (1:1)", async () => {
    const { recommendedSource } = await import("./resolution");
    expect(recommendedSource({ label: "VX1000", brand: "NovaStar", maxInputWidth: 3840, maxInputHeight: 1080, minInputWidth: 1920, minInputHeight: 1080 } as never, 3840, 1080)).toEqual({ width: 3840, height: 1080, exact: true });
  });
  it("VX600 picks the closest supported input for a wide canvas", async () => {
    const { recommendedSource } = await import("./resolution");
    const r = recommendedSource({ label: "VX600", modelKey: "vx600", brand: "NovaStar", maxInputWidth: 1920, maxInputHeight: 1200 } as never, 8064, 1152);
    expect(r.exact).toBe(false);
    expect(r.width).toBeLessThanOrEqual(1920);
  });
  it("a 4992 px wide screen is within the VX1000 load limit of 10,240 px", async () => {
    const { loadLimits } = await import("./resolution");
    expect(loadLimits({ brand: "NovaStar", label: "VX1000", outputWidth: 4096, outputHeight: 1080 } as never).width).toBe(10240);
  });
});

describe("Cabinet catalogue", () => {
  it("0.5 × 1 m P2.5 is 200 × 400 px and P2.6 is 192 × 384 px", async () => {
    const { CABINET_CATALOG } = await import("./resolution");
    const f = (p: number) => CABINET_CATALOG.find((c) => c.width === 0.5 && c.height === 1 && c.pitch === p);
    expect([f(2.5)?.pixelWidth, f(2.5)?.pixelHeight]).toEqual([200, 400]);
    expect([f(2.6)?.pixelWidth, f(2.6)?.pixelHeight]).toEqual([192, 384]);
  });
});
