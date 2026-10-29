import { describe, expect, it } from "vitest";
import { createProject, PROCESSOR_CATALOG, processorFromCatalog } from "./types";
import { defaultScreen } from "./presets";
import { configureP2Lvp615 } from "./p2-setup";
import { derivedResolution } from "./resolution";
import { screenChains } from "./engineering";

const entry = PROCESSOR_CATALOG.find((p) => p.key === "vdwall");
if (!entry) throw new Error("Missing LVP615");
const processor = { ...processorFromCatalog(entry, "vd"), outputs: 4 };
const screen = { ...defaultScreen(0), processorId: "vd", physicalWidth: 2.24, physicalHeight: 1.12 };
const project = { ...createProject("P2 setup"), processors: [processor], screens: [screen] };
describe("Measured P2 LVP615 setup", () => {
  it("uses 0.56m cabinets at P2 and derives 280x280 provisional cabinet pixels", () => {
    const next = configureP2Lvp615(project, screen.id);
    const s = next.screens[0];
    if (!s) throw new Error("Missing screen");
    expect(s.panelConfiguration).toMatchObject({ panelWidth: 0.56, panelHeight: 0.56, cols: 4, rows: 2 });
    expect(derivedResolution(s)).toMatchObject({ cabinetPixelWidth: 280, cabinetPixelHeight: 280, source: "pitch" });
    expect(s.pixelWidth * s.pixelHeight).toBe(627200);
    expect(s.content).toMatchObject({ width: 1120, height: 560 });
    expect(next.processors[0]?.outputs).toBe(2);
    expect(screenChains(next, s)).toEqual([]);
  });
  it("recalculates chains from entered limits and exposes a third port instead of hiding overload", () => {
    const next = configureP2Lvp615({ ...project, processors: [{ ...processor, senderModel: "Test sender", maxPixels: 1200000, portMaxPixels: 300000 }] }, screen.id);
    const s = next.screens[0];
    if (!s) throw new Error("Missing screen");
    expect(screenChains(next, s).map((c) => [c.cabinets, c.overflow])).toEqual([[3, false], [3, false], [2, true]]);
  });
  it("preserves a confirmed native matrix for cabinets already measured at 0.56m", () => {
    const existing = { ...screen, panelConfiguration: { ...screen.panelConfiguration, panelWidth: 0.56, panelHeight: 0.56, nativePixelWidth: 288, nativePixelHeight: 288 } };
    const next = configureP2Lvp615({ ...project, screens: [existing] }, existing.id);
    expect(next.screens[0]?.pixelWidth).toBe(1152);
  });
});