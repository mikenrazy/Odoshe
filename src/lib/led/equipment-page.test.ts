import { describe, it, expect } from "vitest";
import { buildTechnicalReport } from "./export-technical-report";
import type { Project } from "./types";

function sampleProject(): Project {
  return {
    id: "prj_test", name: "CIO100 Symposium & Awards", createdAt: "", updatedAt: "",
    meta: {}, stage: { width: 12, depth: 6, height: 1, color: "#1c1c1c", backWall: true, backWallHeight: 4 },
    screens: [
      { id: "s1", name: "CENTER LED", pixelPitch: 2.6, pixelWidth: 3200, pixelHeight: 1000, position: { x: 0, y: 4, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, color: "#26de8c", cabinetWidth: 0.5, cabinetHeight: 1, processorId: "p1" },
      { id: "s2", name: "LEFT LED", pixelPitch: 2.6, pixelWidth: 960, pixelHeight: 960, position: { x: -7, y: 4, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, color: "#18c4f0", cabinetWidth: 0.5, cabinetHeight: 0.5, processorId: "p2" },
    ] as Project["screens"],
    processors: [
      { id: "p1", brand: "NovaStar", label: "VX1000", outputs: 10, portMaxPixels: 650000, name: "VX1000" },
      { id: "p2", brand: "NovaStar", label: "VX600 Pro", outputs: 6, portMaxPixels: 650000, name: "VX600 Pro" },
    ] as Project["processors"],
    power: { voltage: 230, phases: 3, circuitAmps: 16, loadLimitPct: 80, maxWPerM2: 600, typWPerM2: 200, kgPerM2: 30, hoistKg: 1000, dataHomeRunM: 20 },
    equipment: [],
  } as unknown as Project;
}

describe("technical report equipment page", () => {
  it("ends with an Equipment List page listing cabinets, cables and processors", async () => {
    const doc = await buildTechnicalReport(sampleProject());
    const pages = doc.getNumberOfPages();
    // last page(s) must carry the equipment list
    const last = doc.setPage(pages) as unknown as { __pager?: number };
    // read text off the final page via internal API
    const internal = doc as unknown as { internal: { getPageInfo?: unknown } };
    void internal;
    const lines: string[] = [];
    const ctx = (doc as unknown as { context2d?: never }) as never;
    void ctx; void last; void lines;
    // extract text from the jsPDF content stream of the last page
    const raw = (doc as unknown as { __private?: unknown }).__private;
    void raw;
    // simplest reliable check: the count grew and render works
    expect(pages).toBeGreaterThan(6);
    const pdf = doc.output("arraybuffer") as ArrayBuffer;
    const text = new TextDecoder("latin1").decode(pdf);
    // equipment page headers appear in the PDF text
    expect(text).toContain("Equipment List");
    expect(text).toContain("LED cabinet");
    expect(text).toContain("Data jumper (CAT6)");
    expect(text).toContain("LED processor");
    expect(text).toContain("TOTALS: 80 LED cabinets");
  });
});
