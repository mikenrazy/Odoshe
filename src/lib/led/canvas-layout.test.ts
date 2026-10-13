import { describe, expect, it } from "vitest";
import { regionIntersection, snapRegion, TARGET_OUTPUT_FPS, TEST_OUTPUT_COUNT } from "./canvas-layout";

describe("Canvas layout rules", () => {
  it("provides four independent test slots", () => expect(TEST_OUTPUT_COUNT).toBe(4));
  it("targets 60 FPS", () => expect(TARGET_OUTPUT_FPS).toBe(60));
  it("snaps moves to the selected grid", () => expect(snapRegion({x:19,y:35,width:1920,height:1080},"move",[],{width:3840,height:1080},16,false,6).region).toEqual({x:16,y:32,width:1920,height:1080}));
  it("aligns screen edges using Smart Snap", () => expect(snapRegion({x:1003,y:20,width:500,height:500},"move",[{x:0,y:0,width:1000,height:500}],{width:3840,height:1080},0,true,6).region.x).toBe(1000));
  it("keeps black padding for out-of-bounds regions", () => expect(regionIntersection({x:-100,y:900,width:1920,height:400},3840,1080)).toEqual({x:0,y:900,width:1820,height:180,offsetX:100,offsetY:0}));
  it("does not invent pixels for regions wholly outside", () => expect(regionIntersection({x:4000,y:0,width:100,height:100},3840,1080).width).toBe(0));
});