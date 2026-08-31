import { createElement, type ReactNode } from "react";
import { Canvas, type CanvasProps } from "@react-three/fiber";

/**
 * Dev tooling injects `data-*` source-tag attributes onto JSX elements. R3F
 * forwards unknown Canvas props onto the three.js root, which throws
 * `Cannot set "data-tsd-source"`. Strip them before mounting the Canvas and
 * create the element without JSX so it cannot be re-tagged.
 */
export function SafeCanvas({ children, ...props }: CanvasProps & { children?: ReactNode }) {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (key.startsWith("data-")) continue;
    clean[key] = value;
  }
  return createElement(Canvas, clean as CanvasProps, children);
}
