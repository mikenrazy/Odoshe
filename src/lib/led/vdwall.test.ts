import { describe, expect, it } from "vitest";
import { createProject, normalizeProject, PROCESSOR_CATALOG, processorFromCatalog, PANEL_SIZE_PRESETS } from "./types";
import { defaultScreen } from "./presets";
import { derivedResolution, withDerivedResolution } from "./resolution";
import { screenChains, senderScreenCapacity } from "./engineering";
import { processorPortMap, planPortDistribution } from "./ports";
import { lvp615Issues, senderReady } from "./vdwall";

const entry = PROCESSOR_CATALOG.find((p) => p.key === "vdwall");
if (!entry) throw new Error("LVP615 profile missing");
const proc = processorFromCatalog(entry, "vd");
const base = { ...defaultScreen(0), processorId: "vd", pixelPitch: 2, cabinetKey: undefined, physicalWidth: 2.24, physicalHeight: 1.12, panelConfiguration: { cols: 4, rows: 2, panelWidth: 0.56, panelHeight: 0.56, sizeKey: "custom" as const, show: true, nativePixelWidth: 280, nativePixelHeight: 280 } };
const screen = withDerivedResolution(base);
const project = { ...createProject("VDWall checks"), processors: [proc], screens: [screen] };
describe("LVP615 mapping", () => {
  it("flags the screen when its 627200 pixels exceed an entered 600000-pixel card limit", () => {
    const sender = { ...proc, senderModel: "Test sender", portMaxPixels: 400000, maxPixels: 600000 };
    const result = senderScreenCapacity({ ...project, processors: [sender] }, sender)[0];
    expect(result?.pixels).toBe(627200);
    expect(result?.issues).toContain("Screen exceeds sending-card capacity by 27,200 px.");
    expect(lvp615Issues(project, sender).some((issue) => issue.includes("INVALID SENDER LOAD"))).toBe(true);
  });
  it("flags every affected screen when their combined load exceeds one card", () => {
    const sender = { ...proc, senderModel: "Test sender", outputs: 4, portMaxPixels: 400000, maxPixels: 1000000 };
    const combined = { ...project, processors: [sender], screens: [screen, { ...screen, id: "second", name: "RIGHT" }] };
    expect(senderScreenCapacity(combined, sender).map((s) => s.issues)).toEqual([
      ["Combined assigned screens exceed sending-card capacity by 254,400 px."],
      ["Combined assigned screens exceed sending-card capacity by 254,400 px."],
    ]);
  });
  it("rejects one 78400-pixel cabinet on a 70000-pixel port", () => {
    const sender = { ...proc, senderModel: "Test sender", outputs: 8, portMaxPixels: 70000, maxPixels: 1000000 };
    expect(senderScreenCapacity({ ...project, processors: [sender] }, sender)[0]?.issues.some((s) => s.includes("P1 (78,400 px)"))).toBe(true);
    expect(lvp615Issues(project, sender).some((s) => s.includes("A cabinet cannot be split"))).toBe(true);
  });
  it("flags nonexistent third sender port beside the affected screen", () => {
    const sender = { ...proc, senderModel: "Test sender", portMaxPixels: 300000, maxPixels: 1200000 };
    expect(senderScreenCapacity({ ...project, processors: [sender] }, sender)[0]?.issues).toContain("Requires unavailable sender ports P3; only 2 fitted.");
  });
  it("accepts the exact 627200-pixel card and 313600-pixel port boundaries", () => {
    const sender = { ...proc, senderModel: "Test sender", portMaxPixels: 313600, maxPixels: 627200 };
    const result = senderScreenCapacity({ ...project, processors: [sender] }, sender)[0];
    expect(result?.chains.map((c) => c.pixels)).toEqual([313600, 313600]);
    expect(result?.issues).toEqual([]);
    expect(result?.verified).toBe(true);
  });
  it("uses the user's two sender ports without inventing pixel capacity", () => { expect(proc.outputs).toBe(2); expect(proc.portMaxPixels).toBe(0); expect(senderReady(proc)).toBe(false); expect(screenChains(project, screen)).toEqual([]); expect(processorPortMap(project, proc).status).toBe("over"); expect(planPortDistribution(project, proc).fits).toBe(false); });
  it("invalidates legacy generic VDWall fabricated four-port profile", () => { const old = { ...proc, label: "VDWall", senderPortsConfirmed: false, outputs: 4, portMaxPixels: 650000, maxPixels: 2300000 }; expect(normalizeProject({ ...project, processors: [old] }).processors[0]?.outputs).toBe(2); });
  it("offers the user's measured 0.56m square cabinet dimensions", () => { expect(PANEL_SIZE_PRESETS.find((p) => p.key === "0.56x0.56")).toMatchObject({ width: 0.56, height: 0.56 }); });
  it("keeps a two-port sender overload visible rather than inventing a third port", () => { const confirmed = { ...proc, senderModel: "Test two-port sender", portMaxPixels: 300000, maxPixels: 1200000 }; expect(screenChains({ ...project, processors: [confirmed] }, screen).map((c) => c.overflow)).toEqual([false, false, true]); });
  it("uses operator native P2 matrix for a measured 0.56m square cabinet", () => { expect(derivedResolution(screen)).toMatchObject({ cabinetPixelWidth: 280, cabinetPixelHeight: 280, pixelWidth: 1120, pixelHeight: 560, source: "native" }); });
  it("does not replace supplier native matrix with dimensional pitch maths", () => { expect(derivedResolution({ ...screen, panelConfiguration: { ...screen.panelConfiguration, panelWidth: 0.58, panelHeight: 0.58, nativePixelWidth: 288, nativePixelHeight: 288 } }).pixelWidth).toBe(1152); });
  it("blocks unconfirmed P2 pitch-only cabinets", () => { const unconfirmed = { ...screen, panelConfiguration: { ...screen.panelConfiguration, nativePixelWidth: undefined, nativePixelHeight: undefined } }; const confirmed = { ...proc, senderModel: "Operator test sender", outputs: 4, portMaxPixels: 300000, maxPixels: 1200000 }; expect(lvp615Issues({ ...project, screens: [unconfirmed] }, confirmed).some((s) => s.includes("native cabinet"))).toBe(true); });
  it("splits by entered sender pixel budget, not NovaStar default", () => { const confirmed = { ...proc, senderModel: "Operator test sender", outputs: 4, portMaxPixels: 300000, maxPixels: 1200000 }; expect(screenChains({ ...project, processors: [confirmed] }, screen).map((c) => c.cabinets)).toEqual([3, 3, 2]); });
  it("editor and report use the same sender chains", () => { const confirmed = { ...proc, senderModel: "Operator test sender", outputs: 4, portMaxPixels: 300000, maxPixels: 1200000 }; expect(processorPortMap({ ...project, processors: [confirmed] }, confirmed).ports.map((p) => p.cabinets)).toEqual([3, 3, 2, 0]); });
  it("rejects HDMI above 1920x1080 even if sender has spare capacity", () => { expect(lvp615Issues(project, { ...proc, inputWidth: 2304, inputHeight: 1152 }).some((s) => s.includes("HDMI source"))).toBe(true); });
  it("rejects native map larger than selected DVI raster", () => { const wide = { ...screen, pixelWidth: 2240 }; expect(lvp615Issues({ ...project, screens: [wide] }, proc).some((s) => s.includes("does not fit"))).toBe(true); });
  it("does not declare arbitrary custom timing compatible solely from dimensions", () => { expect(lvp615Issues(project, { ...proc, videoOutputWidth: 3840, videoOutputHeight: 1920 }).some((s) => s.includes("timing bandwidth"))).toBe(true); });
});