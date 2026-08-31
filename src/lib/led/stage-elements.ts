import {
  defaultStageElement,
  type StageConfig,
  type StageElementKey,
  type StageElementSetup,
} from "./types";

/** Element setup with defaults filled in for legacy projects. */
export function elementSetup(stage: StageConfig, key: StageElementKey): StageElementSetup {
  return { ...defaultStageElement(key), ...(stage.elements?.[key] ?? {}) };
}

export interface ElementAnchor {
  /** stage-local coordinates: x lateral, z depth (+ = downstage), y = above deck */
  x: number;
  z: number;
  y: number;
  rotation: number;
  scale: number;
  style: string;
}

/**
 * Resolve a placement preset into stage-local coordinates.
 * `outside` pushes front/back anchors just beyond the deck edge (stairs, fascia).
 */
export function resolveAnchor(
  stage: StageConfig,
  key: StageElementKey,
  opts: { outside?: boolean } = {},
): ElementAnchor {
  const s = elementSetup(stage, key);
  const halfW = stage.width / 2;
  const halfD = stage.depth / 2;
  const insetX = Math.min(halfW * 0.55, 2.2);
  const insetZ = Math.min(halfD * 0.55, 1.6);
  const edgeZ = opts.outside ? halfD : halfD - insetZ;
  const backZ = opts.outside ? -halfD : -halfD + insetZ;

  let x = 0;
  let z = 0;
  switch (s.placement) {
    case "left":
      x = -halfW + insetX;
      break;
    case "right":
      x = halfW - insetX;
      break;
    case "front":
      z = edgeZ;
      break;
    case "back":
      z = backZ;
      break;
    case "front-left":
      x = -halfW + insetX;
      z = edgeZ;
      break;
    case "front-right":
      x = halfW - insetX;
      z = edgeZ;
      break;
    case "back-left":
      x = -halfW + insetX;
      z = backZ;
      break;
    case "back-right":
      x = halfW - insetX;
      z = backZ;
      break;
    case "center":
    case "custom":
    default:
      break;
  }

  return {
    x: x + s.offsetX,
    z: z + s.offsetZ,
    y: s.elevation,
    rotation: s.rotation,
    scale: Math.max(0.2, s.scale),
    style: s.style,
  };
}

/** Approximate top-view footprint (metres) used by the 2D plan. */
export function elementFootprint(
  stage: StageConfig,
  key: StageElementKey,
  a: ElementAnchor,
): { w: number; d: number } {
  const k = a.scale;
  switch (key) {
    case "stairs": {
      const w =
        a.style === "wrap"
          ? stage.width
          : a.style === "wide"
            ? stage.width * 0.45
            : a.style === "dual"
              ? stage.width * 0.7
              : 3;
      return { w: w * k, d: 2.1 * k };
    }
    case "podium":
      return { w: 0.9 * k, d: 0.6 * k };
    case "furniture":
      return a.style === "roundtable"
        ? { w: 2.4 * k, d: 2.4 * k }
        : { w: 2.8 * k, d: 1.4 * k };
    case "truss":
      return { w: (stage.width + 3) * k, d: (a.style === "box" ? stage.depth : 0.4) * k };
    case "backdrop":
      return { w: (stage.width + 3) * k, d: 0.3 * k };
    case "fascia":
      return { w: (stage.width + 0.1) * k, d: 0.2 * k };
    default:
      return { w: 1, d: 1 };
  }
}
