import { describe, expect, it } from "vitest";
import { buildTechnicalReport } from "./export-technical-report";
import type { LedScreen, Project } from "./types";

function screen(id: string, x: number, w: number, h: number, cols: number, rows: number, pw: number, ph: number, px: number): LedScreen {
  return {
    id, name: id, type: "flat", physicalWidth: w, physicalHeight: h, physicalDepth: 0.1,
    pixelWidth: px, pixelHeight: 0, pixelPitch: 2.6,
    position: { x, y: h / 2, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 },
    curvature: {} as LedScreen["curvature"], panelConfiguration: { cols, rows, show: true, panelWidth: pw, panelHeight: ph, sizeKey: "custom" },
    brightness: 1, color: "#3b82f6", processorId: "p1", processorOutput: 1, rj45Port: 1,
    content: { x: 0, y: 0, width: px, height: 0 }, visible: true, locked: false,
  } as LedScreen;
}

const centre = { ...screen("CENTER", 0, 13, 3, 26, 3, 0.5, 1, 4992), pixelHeight: 1152, content: { x: 0, y: 0, width: 4992, height: 1152 } };

const project = {
  id: "prj_test", name: "CIO100 Symposium & Awards", createdAt: "", updatedAt: "",
  meta: {},
  stage: { width: 12, depth: 6, height: 1, color: "#1c1c1c", backWall: true, backWallHeight: 4 },
  screens: [centre], processors: [{ id: "p1", brand: "NovaStar", label: "VX1000", outputs: 10, name: "VX1000" }],
  extensions: { power: { cabinetMaxW: 200, circuitAmps: 16 } },
} as unknown as Project;

describe("technical report equipment page", () => {
  it("report ends with an Equipment List page with cabinets, cabling, power and processor lines", async () => {
    const doc = await buildTechnicalReport(project);
    const pdf = new TextDecoder("latin1").decode(doc.output("arraybuffer") as ArrayBuffer);
    expect(pdf).toContain("Equipment List");
    expect(pdf).toContain("LED cabinet");
    expect(pdf).toContain("Data jumper");
    expect(pdf).toContain("Power jumper");
    expect(pdf).toContain("LED processor");
    // check-off and extra-quantity columns are blank on the printed sheet
    expect(pdf).toContain("VERIFY");
    expect(pdf).toContain("EXTRA QTY");
    // totals line: 78 cabinets on one screen
    expect(pdf).toContain("TOTALS: 78 LED cabinets");
    // it is the last page: nothing screen-specific follows it in the page order
    const eqPos = pdf.lastIndexOf("Equipment List");
    const sheetPos = pdf.indexOf("MASTER LED SCREENS PLACEMENT");
    expect(eqPos).toBeGreaterThan(sheetPos);
  });
});
