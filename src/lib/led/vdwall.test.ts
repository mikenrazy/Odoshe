import { describe, expect, it } from "vitest";
import { createProject, normalizeProject, PROCESSOR_CATALOG, processorFromCatalog } from "./types";
import { defaultScreen } from "./presets";
import { derivedResolution, withDerivedResolution } from "./resolution";
import { screenChains } from "./engineering";
import { processorPortMap, planPortDistribution } from "./ports";
import { lvp615Issues, senderReady } from "./vdwall";

const entry = PROCESSOR_CATALOG.find((p) => p.key === "vdwall");
if (!entry) throw new Error("LVP615 profile missing");
const proc = processorFromCatalog(entry, "vd");
const base = { ...defaultScreen(0), processorId: "vd", pixelPitch: 2, cabinetKey: undefined, physicalWidth: 2.24, physicalHeight: 1.12, panelConfiguration: { cols: 4, rows: 2, panelWidth: 0.56, panelHeight: 0.56, sizeKey: "custom" as const, show: true, nativePixelWidth: 280, nativePixelHeight: 280 } };
const screen = withDerivedResolution(base);
const project = { ...createProject("VDWall checks"), processors: [proc], screens: [screen] };
describe("LVP615 mapping", () => {
  it("does not invent Ethernet capacity for two mirrored DVI outputs", () => { expect(proc.outputs).toBe(0); expect(senderReady(proc)).toBe(false); expect(screenChains(project, screen)).toEqual([]); expect(processorPortMap(project, proc).status).toBe("over"); expect(planPortDistribution(project, proc).fits).toBe(false); });
  it("invalidates legacy generic VDWall fabricated four-port profile", () => { const old = { ...proc, label: "VDWall", outputs: 4, portMaxPixels: 650000, maxPixels: 2300000 }; expect(normalizeProject({ ...project, processors: [old] }).processors[0]?.outputs).toBe(0); });
  it("uses operator native P2 matrix for a measured 0.56m square cabinet", () => { expect(derivedResolution(screen)).toMatchObject({ cabinetPixelWidth: 280, cabinetPixelHeight: 280, pixelWidth: 1120, pixelHeight: 560, source: "native" }); });
  it("does not replace supplier native matrix with dimensional pitch maths", () => { expect(derivedResolution({ ...screen, panelConfiguration: { ...screen.panelConfiguration, panelWidth: 0.58, panelHeight: 0.58, nativePixelWidth: 288, nativePixelHeight: 288 } }).pixelWidth).toBe(1152); });
  it("blocks unconfirmed P2 pitch-only cabinets", () => { const unconfirmed = { ...screen, panelConfiguration: { ...screen.panelConfiguration, nativePixelWidth: undefined, nativePixelHeight: undefined } }; const confirmed = { ...proc, senderModel: "Operator test sender", outputs: 4, portMaxPixels: 300000, maxPixels: 1200000 }; expect(lvp615Issues({ ...project, screens: [unconfirmed] }, confirmed).some((s) => s.includes("native cabinet"))).toBe(true); });
  it("splits by entered sender pixel budget, not NovaStar default", () => { const confirmed = { ...proc, senderModel: "Operator test sender", outputs: 4, portMaxPixels: 300000, maxPixels: 1200000 }; expect(screenChains({ ...project, processors: [confirmed] }, screen).map((c) => c.cabinets)).toEqual([3, 3, 2]); });
  it("rejects HDMI above 1920x1080 even if sender has spare capacity", () => { expect(lvp615Issues(project, { ...proc, inputWidth: 2304, inputHeight: 1152 }).some((s) => s.includes("HDMI source"))).toBe(true); });
  it("rejects native map larger than selected DVI raster", () => { const wide = { ...screen, pixelWidth: 2240 }; expect(lvp615Issues({ ...project, screens: [wide] }, proc).some((s) => s.includes("does not fit"))).toBe(true); });
  it("does not declare arbitrary custom timing compatible solely from dimensions", () => { expect(lvp615Issues(project, { ...proc, videoOutputWidth: 3840, videoOutputHeight: 1920 }).some((s) => s.includes("timing bandwidth"))).toBe(true); });
});