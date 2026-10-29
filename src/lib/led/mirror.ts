import type { LedScreen } from "./types";

const swap = (n: string) => n.replace(/LEFT|RIGHT|Left|Right|left|right/g, (m) => ({ LEFT: "RIGHT", RIGHT: "LEFT", Left: "Right", Right: "Left", left: "right", right: "left" })[m]!);

/** Mirror of a screen across the stage centre (x = 0) and the canvas centre line. */
export function mirroredScreen(s: LedScreen, canvasWidth: number): LedScreen {
  const c = structuredClone(s);
  const name = swap(s.name);
  return {
    ...c,
    name: name === s.name ? `${s.name} (mirror)` : name,
    position: { ...s.position, x: -s.position.x },
    rotation: { ...s.rotation, y: -s.rotation.y, z: -s.rotation.z },
    content: { ...s.content, x: Math.max(0, canvasWidth - s.content.x - s.content.width) },
  };
}
