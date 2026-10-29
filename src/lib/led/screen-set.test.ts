import { describe, expect, it } from "vitest";
import { configureScreenSet } from "./screen-set";
import { processorLayout, screenChains } from "./engineering";
import { createProject } from "./types";
import { defaultScreen } from "./presets";
import { processorPortMap } from "./ports";
import { useEditor } from "./store";

function rig() {
  const p = createProject("LEFT + RIGHT setup");
  const proc = p.processors.find((p) => p.modelKey === "vx600pro" || p.id === "vx600pro");
  if (!proc) throw new Error("VX600 Pro profile missing");
  proc.inputWidth = 1920; proc.inputHeight = 1080;
  p.groups = [{ id: "side-set", name: "LEFT + RIGHT", continuous: true, mappingMode: "shared-input" }];
  p.screens = ["RIGHT", "LEFT"].map((name, i) => ({
    ...defaultScreen(i), id: name, name, groupId: "side-set", processorId: proc.id,
    pixelWidth: 1600, pixelHeight: 1000, pixelPitch: 2.5,
    physicalWidth: 4, physicalHeight: 2.5,
    position: { x: i === 0 ? 8 : -8, y: 2, z: 0 },
    panelConfiguration: { cols: 8, rows: 5, show: true, panelWidth: 0.5, panelHeight: 0.5, sizeKey: "0.5x0.5" },
    content: { x: 0, y: 0, width: 960, height: 1080 },
  }));
  return { p, proc };
}

describe("Shared-input LEFT + RIGHT", () => {
  it("keeps both 1600 x 1000 native resolutions and physical positions", () => {
    const { p } = rig();
    const next = configureScreenSet(p, "side-set");
    expect(next.screens.map((s) => [s.pixelWidth, s.pixelHeight, s.position.x])).toEqual([[1600, 1000, 8], [1600, 1000, -8]]);
    expect(next.screens.map((s) => s.content)).toEqual([{ x: 1600, y: 0, width: 1600, height: 1000 }, { x: 0, y: 0, width: 1600, height: 1000 }]);
  });
  it("uses 6 separate ports, LEFT P1-P3 and RIGHT P4-P6 for 80 P2.5 small cabinets", () => {
    const { p, proc } = rig();
    const next = configureScreenSet(p, "side-set");
    const left = next.screens.find((s) => s.id === "LEFT");
    const right = next.screens.find((s) => s.id === "RIGHT");
    if (!left || !right) throw new Error("Missing sections");
    expect(screenChains(next, left).map((c) => [c.port, c.cabinets])).toEqual([[1, 16], [2, 16], [3, 8]]);
    expect(screenChains(next, right).map((c) => [c.port, c.cabinets])).toEqual([[4, 16], [5, 16], [6, 8]]);
    const map = processorPortMap(next, proc);
    expect(map.ports.map((p) => p.cabinets)).toEqual([16, 16, 8, 16, 16, 8]);
    expect(map.issues).toEqual([]);
  });
  it("maps one 1920 x 1080 source to 3200 x 1000 output without stage-gap pixels", () => {
    const { p, proc } = rig();
    const cfg = processorLayout(configureScreenSet(p, "side-set"), proc.id);
    expect([cfg.width, cfg.height, cfg.totalPixels]).toEqual([3200, 1000, 3_200_000]);
    expect(cfg.placements.map((p) => p.sourceRegion)).toEqual([{ x: 0, y: 0, width: 960, height: 1080 }, { x: 960, y: 0, width: 960, height: 1080 }]);
    expect(cfg.issues).toEqual([]);
  });
  it("rejects a combined load beyond the VX600 Pro capacity instead of claiming compatibility", () => {
    const { p, proc } = rig();
    p.screens = p.screens.map((s) => ({ ...s, pixelWidth: 2400 }));
    const cfg = processorLayout(p, proc.id);
    expect(cfg.issues.some((s) => s.includes("4800000 px exceeds 3900000 px"))).toBe(true);
  });
  it("store creates a shared set without copying one RJ45 assignment onto both members", () => {
    const { p } = rig();
    p.groups = []; p.screens = p.screens.map((s) => ({ ...s, groupId: undefined }));
    useEditor.setState({ project: p, projects: [p] });
    useEditor.getState().addGroup("LEFT + RIGHT", ["LEFT", "RIGHT"]);
    const next = useEditor.getState().project;
    expect(next?.screens.map((s) => [s.id, s.rj45Port, s.pixelWidth])).toEqual([["RIGHT", 4, 1600], ["LEFT", 1, 1600]]);
    useEditor.getState().updateScreen("LEFT", { rj45Port: 2 });
    expect(useEditor.getState().project?.screens.find((s) => s.id === "RIGHT")?.rj45Port).toBe(4);
  });
});