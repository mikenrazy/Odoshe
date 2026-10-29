import { it } from "vitest";
import { writeFileSync } from "node:fs";
import { buildTechnicalReport } from "./export-technical-report";
import type { LedScreen, Project } from "./types";
function screen(id: string, x: number, w: number, h: number, cols: number, rows: number, pw: number, ph: number, px: number, py: number, cx: number, color: string): LedScreen {
  return { id, name: id, type: "flat", physicalWidth: w, physicalHeight: h, physicalDepth: 0.1, pixelWidth: px, pixelHeight: py, pixelPitch: 2.6,
    position: { x, y: 1 + h / 2, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 },
    curvature: {} as LedScreen["curvature"], panelConfiguration: { cols, rows, show: true, panelWidth: pw, panelHeight: ph, sizeKey: "custom" },
    brightness: 1, color, processorId: "p", processorOutput: 1, rj45Port: 1, content: { x: cx, y: 0, width: px, height: py }, visible: true, locked: false } as LedScreen;
}
it("sample", async () => {
  const p = { name: "CIO100 Symposium", meta: { client: "CIO Africa" }, stage: { width: 16, height: 1, depth: 8 },
    screens: [screen("LEFT-1", -8.5, 4, 2.5, 8, 5, 0.5, 0.5, 1536, 960, 0, "#ef2b2b"), screen("CENTER", 0, 13, 3, 26, 3, 0.5, 1, 4992, 1152, 1536, "#1e88ff"), screen("RIGHT-1", 8.5, 4, 2.5, 8, 5, 0.5, 0.5, 1536, 960, 6528, "#ef2b2b")],
    processors: [{ id: "p", brand: "NovaStar", label: "VX1000", model: "vx1000", outputs: 10, portMaxPixels: 650000, maxPixels: 6500000 }],
    extensions: { power: { cabinetMaxW: 200, circuitAmps: 16, voltage: 230, loadLimitPct: 80, phases: 3 } } } as unknown as Project;
  const doc = await buildTechnicalReport(p);
  writeFileSync("/tmp/rep/r.pdf", Buffer.from(doc.output("arraybuffer")));
});
