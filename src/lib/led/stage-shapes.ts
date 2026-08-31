import type { StageConfig, StageDeckFinish, StageRiser, StageShape } from "./types";
import { STAGE_DECK_FINISHES, defaultStageElements, uid } from "./types";

/* --------------------------------------------------------------- accessors */

export function stageShape(stage: StageConfig): StageShape {
  return stage.shape ?? "rectangle";
}

export function stageFinish(stage: StageConfig): StageDeckFinish {
  return stage.deckFinish ?? "matte";
}

export function stageRisers(stage: StageConfig): StageRiser[] {
  return stage.risers ?? [];
}

/* ------------------------------------------------------------- deck shapes */

export interface DeckPart {
  kind: "rect" | "circle" | "semi";
  /** stage-local centre (metres) */
  x: number;
  z: number;
  /** rect footprint / circle diameter */
  w: number;
  d: number;
  label?: string;
}

/**
 * Break the stage shape into simple parts that both the 3D scene and the 2D
 * plan can render consistently.
 */
export function deckParts(stage: StageConfig): DeckPart[] {
  const W = stage.width;
  const D = stage.depth;
  const main: DeckPart = { kind: "rect", x: 0, z: 0, w: W, d: D, label: "MAIN" };

  switch (stageShape(stage)) {
    case "thrust":
      return [main, { kind: "rect", x: 0, z: D / 2 + D * 0.25, w: W * 0.35, d: D * 0.5, label: "THRUST" }];
    case "runway":
      return [main, { kind: "rect", x: 0, z: D / 2 + D * 0.9, w: Math.max(1.2, W * 0.16), d: D * 1.8, label: "RUNWAY" }];
    case "tshape":
      return [
        main,
        { kind: "rect", x: 0, z: D / 2 + D * 0.7, w: Math.max(1.2, W * 0.16), d: D * 1.4, label: "RUNWAY" },
        { kind: "rect", x: 0, z: D / 2 + D * 1.4 + D * 0.2, w: W * 0.5, d: D * 0.4, label: "T-HEAD" },
      ];
    case "round":
      return [{ kind: "circle", x: 0, z: 0, w: Math.min(W, D), d: Math.min(W, D), label: "ROUND" }];
    case "curved-front":
      return [main, { kind: "semi", x: 0, z: D / 2, w: W, d: W, label: "CURVE" }];
    case "rectangle":
    default:
      return [main];
  }
}

/** Physical-material parameters for the deck finish. */
export function deckMaterial(finish: StageDeckFinish) {
  switch (finish) {
    case "gloss":
      return { roughness: 0.08, metalness: 0.85, emissiveIntensity: 0 };
    case "carpet":
      return { roughness: 1, metalness: 0, emissiveIntensity: 0 };
    case "wood":
      return { roughness: 0.55, metalness: 0.08, emissiveIntensity: 0 };
    case "ledfloor":
      return { roughness: 0.25, metalness: 0.4, emissiveIntensity: 0.55 };
    case "matte":
    default:
      return { roughness: 0.85, metalness: 0.1, emissiveIntensity: 0 };
  }
}

export function deckFinishLabel(finish: StageDeckFinish) {
  return STAGE_DECK_FINISHES.find((f) => f.value === finish)?.label ?? finish;
}

/* ----------------------------------------------------------------- risers */

export function createRiser(patch: Partial<StageRiser> = {}): StageRiser {
  return {
    id: uid("riser"),
    name: "Riser",
    x: 0,
    z: -1.5,
    width: 2.4,
    depth: 1.2,
    height: 0.4,
    rotation: 0,
    color: "#39424f",
    ...patch,
  };
}

/* ---------------------------------------------------------------- presets */

export interface StagePreset {
  key: string;
  label: string;
  description: string;
  apply: Partial<StageConfig>;
}

const els = defaultStageElements();

export const STAGE_PRESETS: StagePreset[] = [
  {
    key: "conference",
    label: "Conference",
    description: "Wide end stage, lectern, fascia, side stairs",
    apply: {
      shape: "rectangle",
      deckFinish: "carpet",
      width: 14,
      depth: 6,
      height: 0.6,
      orientation: "end",
      backWall: true,
      backWallHeight: 6,
      stairs: true,
      fascia: true,
      podium: true,
      furniture: false,
      backdrop: false,
      truss: true,
      lightingPositions: true,
      audience: true,
      stageColor: "#2a323f",
      risers: [],
      elements: {
        ...els,
        stairs: { ...els.stairs, style: "dual", placement: "front" },
        podium: { ...els.podium, style: "modern", placement: "front-right" },
        fascia: { ...els.fascia, style: "matte" },
      },
    },
  },
  {
    key: "concert",
    label: "Concert",
    description: "Deep thrust deck, goalpost truss, drum + keys risers",
    apply: {
      shape: "thrust",
      deckFinish: "matte",
      width: 16,
      depth: 10,
      height: 1.2,
      orientation: "thrust",
      backWall: false,
      backWallHeight: 9,
      stairs: true,
      fascia: true,
      podium: false,
      furniture: false,
      backdrop: true,
      truss: true,
      lightingPositions: true,
      audience: true,
      stageColor: "#1d222b",
      risers: [
        createRiser({ name: "Drum riser", x: 0, z: -3, width: 3, depth: 2.4, height: 0.6 }),
        createRiser({ name: "Keys riser", x: -5, z: -2.5, width: 2.4, depth: 1.6, height: 0.4 }),
      ],
      elements: {
        ...els,
        stairs: { ...els.stairs, style: "dual" },
        backdrop: { ...els.backdrop, style: "drape" },
        truss: { ...els.truss, style: "goalpost" },
        fascia: { ...els.fascia, style: "ledtape" },
      },
    },
  },
  {
    key: "gala",
    label: "Gala / Awards",
    description: "Curved-front deck, glossy finish, wide feature stairs",
    apply: {
      shape: "curved-front",
      deckFinish: "gloss",
      width: 12,
      depth: 6,
      height: 0.8,
      orientation: "end",
      backWall: true,
      backWallHeight: 7,
      stairs: true,
      fascia: true,
      podium: true,
      furniture: false,
      backdrop: true,
      truss: true,
      lightingPositions: true,
      audience: true,
      stageColor: "#2b2230",
      risers: [],
      elements: {
        ...els,
        stairs: { ...els.stairs, style: "wide" },
        podium: { ...els.podium, style: "acrylic" },
        backdrop: { ...els.backdrop, style: "cyc" },
        fascia: { ...els.fascia, style: "brand" },
      },
    },
  },
  {
    key: "tv-studio",
    label: "TV Studio",
    description: "Low deck, panel furniture, curved cyc, grid truss",
    apply: {
      shape: "rectangle",
      deckFinish: "gloss",
      width: 10,
      depth: 7,
      height: 0.3,
      orientation: "corner",
      backWall: true,
      backWallHeight: 5,
      stairs: false,
      fascia: false,
      podium: false,
      furniture: true,
      backdrop: true,
      truss: true,
      lightingPositions: true,
      audience: false,
      stageColor: "#20262f",
      risers: [],
      elements: {
        ...els,
        furniture: { ...els.furniture, style: "panel", placement: "center" },
        backdrop: { ...els.backdrop, style: "cyc" },
        truss: { ...els.truss, style: "grid" },
      },
    },
  },
  {
    key: "church",
    label: "Church / Worship",
    description: "Wide deck with band risers, wrap stairs, wooden finish",
    apply: {
      shape: "curved-front",
      deckFinish: "wood",
      width: 14,
      depth: 8,
      height: 0.9,
      orientation: "end",
      backWall: true,
      backWallHeight: 7,
      stairs: true,
      fascia: true,
      podium: true,
      furniture: false,
      backdrop: false,
      truss: true,
      lightingPositions: true,
      audience: true,
      stageColor: "#3a3026",
      risers: [
        createRiser({ name: "Drum riser", x: 4, z: -2.6, width: 2.4, depth: 2.4, height: 0.4 }),
        createRiser({ name: "Choir riser", x: -3, z: -3, width: 5, depth: 1.2, height: 0.4 }),
      ],
      elements: {
        ...els,
        stairs: { ...els.stairs, style: "wrap" },
        podium: { ...els.podium, style: "classic", placement: "center" },
      },
    },
  },
  {
    key: "runway",
    label: "Fashion Runway",
    description: "Main deck with long centre runway, glossy white catwalk",
    apply: {
      shape: "runway",
      deckFinish: "gloss",
      width: 10,
      depth: 5,
      height: 0.7,
      orientation: "thrust",
      backWall: true,
      backWallHeight: 6,
      stairs: false,
      fascia: true,
      podium: false,
      furniture: false,
      backdrop: true,
      truss: true,
      lightingPositions: true,
      audience: true,
      stageColor: "#c9ccd4",
      risers: [],
      elements: {
        ...els,
        backdrop: { ...els.backdrop, style: "flat" },
        truss: { ...els.truss, style: "arch" },
        fascia: { ...els.fascia, style: "ledtape" },
      },
    },
  },
];
