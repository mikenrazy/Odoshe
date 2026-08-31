import { createElement, type ReactNode } from "react";
import { Canvas, type CanvasProps } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Dev tooling injects `data-*` source-tag attributes onto every JSX element,
 * including three.js elements inside the Canvas. R3F resolves dashed props as
 * nested paths (`data` -> `tsd` -> `source`) and throws when the path is not an
 * object. Give three objects a permissive `data` sink so those tags are
 * absorbed harmlessly instead of crashing the scene.
 */
const sink: Record<string | symbol, unknown> = new Proxy(
  {},
  {
    get: (target, prop) => (prop in target ? (target as never)[prop] : sink),
    set: () => true,
  },
) as Record<string | symbol, unknown>;

for (const proto of [
  THREE.Object3D.prototype,
  THREE.Material.prototype,
  THREE.BufferGeometry.prototype,
  THREE.Texture.prototype,
] as object[]) {
  if (!Object.getOwnPropertyDescriptor(proto, "data")) {
    Object.defineProperty(proto, "data", {
      configurable: true,
      get: () => sink,
      set: () => undefined,
    });
  }
}

/**
 * Also strip the tags off the Canvas host element props themselves and create
 * the element without JSX so it cannot be re-tagged.
 */

export function SafeCanvas({ children, ...props }: CanvasProps & { children?: ReactNode }) {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (key.startsWith("data-")) continue;
    clean[key] = value;
  }
  return createElement(Canvas, clean as CanvasProps, children);
}
