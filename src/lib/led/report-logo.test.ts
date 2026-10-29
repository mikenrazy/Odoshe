import { describe, expect, it } from "vitest";
import { resolveReportLogo } from "./export-technical-report";
import { defaultMeta } from "./types";
import type { Project } from "./types";

function project(meta: Partial<ReturnType<typeof defaultMeta>>): Project {
  return {
    id: "p1",
    name: "Test",
    createdAt: 0,
    updatedAt: 0,
    meta: { ...defaultMeta(), ...meta },
    stage: {} as Project["stage"],
    screens: [],
  } as unknown as Project;
}

describe("resolveReportLogo", () => {
  it("dark report uses the dark logo", () => {
    const p = project({ reportLogo: "dark-data", reportLogoLight: "light-data" });
    expect(resolveReportLogo(p, "dark")).toBe("dark-data");
  });

  it("light report uses its own logo when uploaded", () => {
    const p = project({ reportLogo: "dark-data", reportLogoLight: "light-data" });
    expect(resolveReportLogo(p, "light")).toBe("light-data");
  });

  it("light report falls back to the dark logo when no light logo exists", () => {
    const p = project({ reportLogo: "dark-data" });
    expect(resolveReportLogo(p, "light")).toBe("dark-data");
    expect(resolveReportLogo(project({}), "light")).toBeNull();
  });

  it("resolves from IndexedDB assets when the inline copy is absent", () => {
    const p = project({ reportLogoAssetId: "a1", reportLogoLightAssetId: "a2" });
    const assets = { a1: "dark-data", a2: "light-data" };
    expect(resolveReportLogo(p, "dark", assets)).toBe("dark-data");
    expect(resolveReportLogo(p, "light", assets)).toBe("light-data");
  });
});
