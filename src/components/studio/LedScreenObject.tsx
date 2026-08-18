import { useMemo } from "react";
import * as THREE from "three";
import { Line, Text } from "@react-three/drei";
import type { LedScreen } from "@/lib/led/types";
import { createLedTexture } from "./led-texture";

const DEG = Math.PI / 180;

function buildGeometry(screen: LedScreen) {
  const w = screen.physicalWidth;
  const h = screen.physicalHeight;
  const d = Math.max(screen.physicalDepth, 0.02);

  if (screen.curvature.enabled && screen.curvature.angle > 0.5) {
    const theta = Math.min(screen.curvature.angle, 180) * DEG;
    const radius = w / theta;
    const sections = Math.max(4, Math.round(screen.curvature.sections));
    const concave = screen.curvature.concave;
    const thetaStart = concave ? Math.PI - theta / 2 : -theta / 2;
    const geo = new THREE.CylinderGeometry(
      radius,
      radius,
      h,
      sections,
      1,
      true,
      thetaStart,
      theta,
    );
    geo.translate(0, 0, concave ? radius : -radius);
    return { geometry: geo, radius, theta };
  }

  return { geometry: new THREE.BoxGeometry(w, h, d), radius: 0, theta: 0 };
}

function panelLines(screen: LedScreen): Array<[number, number, number][]> {
  const { cols, rows } = screen.panelConfiguration;
  const w = screen.physicalWidth;
  const h = screen.physicalHeight;
  const curved = screen.curvature.enabled && screen.curvature.angle > 0.5;
  const theta = Math.min(screen.curvature.angle, 180) * DEG;
  const radius = curved ? w / theta : 0;
  const concave = screen.curvature.concave;
  const front = curved ? 0 : Math.max(screen.physicalDepth, 0.02) / 2 + 0.002;

  const pointAt = (u: number, y: number): [number, number, number] => {
    if (!curved) return [(u - 0.5) * w, y, front];
    const a = (concave ? Math.PI - theta / 2 : -theta / 2) + u * theta;
    const x = Math.sin(a) * (radius + 0.01);
    const z = Math.cos(a) * (radius + 0.01) + (concave ? radius : -radius);
    return [x, y, z];
  };

  const segments: Array<[number, number, number][]> = [];
  const steps = curved ? Math.max(8, screen.curvature.sections) : 1;

  for (let c = 0; c <= cols; c++) {
    const u = c / cols;
    segments.push([pointAt(u, -h / 2), pointAt(u, h / 2)]);
  }
  for (let r = 0; r <= rows; r++) {
    const y = -h / 2 + (r / rows) * h;
    const line: [number, number, number][] = [];
    for (let i = 0; i <= steps; i++) line.push(pointAt(i / steps, y));
    segments.push(line);
  }
  return segments;
}

interface Props {
  screen: LedScreen;
  selected: boolean;
  showMeasurements: boolean;
  interactive: boolean;
  onSelect: (id: string) => void;
  registerRef?: (id: string, object: THREE.Object3D | null) => void;
}

export function LedScreenObject({
  screen,
  selected,
  showMeasurements,
  interactive,
  onSelect,
  registerRef,
}: Props) {
  const { geometry } = useMemo(() => buildGeometry(screen), [screen]);
  const texture = useMemo(() => createLedTexture(screen.color), [screen.color]);
  const grid = useMemo(
    () => (screen.panelConfiguration.show ? panelLines(screen) : []),
    [screen],
  );

  const repeatX = Math.max(2, Math.round(screen.physicalWidth * 6));
  const repeatY = Math.max(2, Math.round(screen.physicalHeight * 6));
  if (texture) texture.repeat.set(repeatX, repeatY);

  if (!screen.visible) return null;

  return (
    <group
      name={screen.id}
      ref={(node) => registerRef?.(screen.id, node)}
      position={[screen.position.x, screen.position.y, screen.position.z]}
      rotation={[screen.rotation.x * DEG, screen.rotation.y * DEG, screen.rotation.z * DEG]}
      scale={[screen.scale.x, screen.scale.y, screen.scale.z]}
      onPointerDown={(e) => {
        if (!interactive) return;
        e.stopPropagation();
        onSelect(screen.id);
      }}
    >
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial
          map={texture}
          emissiveMap={texture}
          color="#0a0d14"
          emissive={new THREE.Color(screen.color)}
          emissiveIntensity={screen.brightness}
          metalness={0.25}
          roughness={0.45}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>

      {grid.map((points, i) => (
        <Line key={i} points={points} color="#0b1220" lineWidth={1.2} transparent opacity={0.85} />
      ))}

      {selected && (
        <mesh geometry={geometry} scale={1.008}>
          <meshBasicMaterial color="#ff9d2e" wireframe transparent opacity={0.55} />
        </mesh>
      )}

      {showMeasurements && selected && (
        <>
          <Text
            position={[0, screen.physicalHeight / 2 + 0.35, 0.1]}
            fontSize={0.28}
            color="#ff9d2e"
            anchorX="center"
          >
            {`${screen.physicalWidth.toFixed(2)} m × ${screen.physicalHeight.toFixed(2)} m`}
          </Text>
          <Text
            position={[0, -screen.physicalHeight / 2 - 0.35, 0.1]}
            fontSize={0.22}
            color="#7fd4ff"
            anchorX="center"
          >
            {`${screen.pixelWidth} × ${screen.pixelHeight} px · ${screen.pixelPitch}mm · elev ${(
              screen.position.y -
              screen.physicalHeight / 2
            ).toFixed(2)} m`}
          </Text>
        </>
      )}
    </group>
  );
}
