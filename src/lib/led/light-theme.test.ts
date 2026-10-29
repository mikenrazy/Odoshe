import { describe, it, expect } from "vitest";
import { lightColour } from "./export-technical-report";
describe("light report theme", () => {
  it("turns the dark page background white", () => expect(lightColour(17, 17, 17)).toEqual([255, 255, 255]));
  it("turns light text dark", () => expect(Math.max(...lightColour(236, 238, 242))).toBeLessThan(60));
  it("darkens bright green for print", () => expect(lightColour(38, 222, 140)[1]).toBeLessThan(150));
});
