import * as THREE from "three";
import type { EquipmentItem } from "@/lib/led/types";

/**
 * Procedural, real-world-scaled 3D models for production equipment.
 * Every model is authored with its base at y = 0, centred on x/z, and is
 * parameterised by the item's real width / depth / height in metres so nothing
 * is stretched arbitrarily.
 */

type P = { w: number; d: number; h: number; color: string };

const METAL = { color: "#2b303a", roughness: 0.45, metalness: 0.8 };
const DARK = { color: "#14171d", roughness: 0.6, metalness: 0.5 };

function Box({
  size,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  color,
  roughness = 0.6,
  metalness = 0.2,
  emissive,
  emissiveIntensity = 0,
}: {
  size: [number, number, number];
  position?: [number, number, number];
  rotation?: [number, number, number] | undefined;
  color: string;
  roughness?: number;
  metalness?: number;
  emissive?: string;
  emissiveIntensity?: number;
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        roughness={roughness}
        metalness={metalness}
        {...(emissive
          ? { emissive: new THREE.Color(emissive), emissiveIntensity }
          : {})}
      />
    </mesh>
  );
}

function Cyl({
  r,
  h,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  color,
  roughness = 0.5,
  metalness = 0.6,
  segments = 16,
  rTop,
}: {
  r: number;
  h: number;
  position?: [number, number, number];
  rotation?: [number, number, number] | undefined;
  color: string;
  roughness?: number;
  metalness?: number;
  segments?: number;
  rTop?: number;
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <cylinderGeometry args={[rTop ?? r, r, h, segments]} />
      <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ chairs */

function ChairLegs({ w, d, seatH, color, round }: { w: number; d: number; seatH: number; color: string; round?: boolean }) {
  const off: Array<[number, number]> = [
    [-w / 2 + 0.05, -d / 2 + 0.05],
    [w / 2 - 0.05, -d / 2 + 0.05],
    [-w / 2 + 0.05, d / 2 - 0.05],
    [w / 2 - 0.05, d / 2 - 0.05],
  ];
  return (
    <>
      {off.map(([x, z], i) =>
        round ? (
          <Cyl key={i} r={0.018} h={seatH} position={[x, seatH / 2, z]} color={color} />
        ) : (
          <Box key={i} size={[0.035, seatH, 0.035]} position={[x, seatH / 2, z]} {...METAL} color={color} />
        ),
      )}
    </>
  );
}

function Chair({ w, d, h, color, style }: P & { style: string }) {
  const seatH = style === "bar-stool" ? h * 0.72 : Math.min(0.45, h * 0.5);
  const backH = h - seatH;
  const frame = style === "banquet-chair" ? "#c9a227" : "#2a2f38";

  if (style === "bar-stool") {
    return (
      <group>
        <Cyl r={w * 0.45} h={0.04} position={[0, 0.02, 0]} color={frame} />
        <Cyl r={0.03} h={seatH} position={[0, seatH / 2, 0]} color={frame} />
        <Cyl r={w * 0.38} h={0.05} position={[0, seatH, 0]} color={frame} />
        <Cyl r={w * 0.42} h={0.09} position={[0, seatH + 0.06, 0]} color={color} roughness={0.85} metalness={0.05} />
        <Cyl r={w * 0.3} h={0.02} position={[0, seatH * 0.35, 0]} rotation={[Math.PI / 2, 0, 0]} color={frame} />
      </group>
    );
  }

  return (
    <group>
      <ChairLegs w={w} d={d} seatH={seatH} color={frame} round={style === "banquet-chair"} />
      {/* seat cushion */}
      <Box size={[w, 0.09, d]} position={[0, seatH + 0.045, 0]} color={color} roughness={0.9} metalness={0.05} />
      {/* backrest */}
      <Box
        size={[w * 0.94, backH * 0.82, 0.08]}
        position={[0, seatH + 0.09 + (backH * 0.82) / 2, -d / 2 + 0.06]}
        rotation={[-0.08, 0, 0]}
        color={color}
        roughness={0.9}
        metalness={0.05}
      />
      {(style === "executive-chair" || style === "vip-chair" || style === "conference-chair") && (
        <>
          <Box size={[0.06, 0.06, d * 0.6]} position={[-w / 2 + 0.03, seatH + 0.24, 0]} color={frame} metalness={0.6} />
          <Box size={[0.06, 0.06, d * 0.6]} position={[w / 2 - 0.03, seatH + 0.24, 0]} color={frame} metalness={0.6} />
        </>
      )}
      {style === "executive-chair" && (
        <Cyl r={w * 0.42} h={0.03} position={[0, 0.02, 0]} color={frame} segments={5} />
      )}
      {style === "auditorium-chair" && (
        <Box size={[w, 0.05, d * 0.9]} position={[0, seatH - 0.06, 0]} color="#22242b" />
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ people */

function Person({ w, h, color, pose }: P & { pose: "standing" | "sitting" | "operating" | "walking" | "speaking" }) {
  const skin = color;
  const cloth = pose === "operating" ? "#39404d" : "#232833";
  const seated = pose === "sitting";
  const legH = seated ? 0.45 : h * 0.47;
  const torsoH = h * (seated ? 0.34 : 0.3);
  const torsoY = legH + torsoH / 2 + (seated ? 0.06 : 0);
  const headR = 0.115;

  return (
    <group>
      {seated ? (
        <>
          {/* thighs forward, shins down */}
          <Box size={[0.15, 0.14, 0.42]} position={[-0.1, legH, 0.16]} color={cloth} roughness={0.9} metalness={0} />
          <Box size={[0.15, 0.14, 0.42]} position={[0.1, legH, 0.16]} color={cloth} roughness={0.9} metalness={0} />
          <Cyl r={0.065} h={legH} position={[-0.1, legH / 2, 0.34]} color={cloth} metalness={0} roughness={0.9} />
          <Cyl r={0.065} h={legH} position={[0.1, legH / 2, 0.34]} color={cloth} metalness={0} roughness={0.9} />
        </>
      ) : (
        <>
          <Cyl r={0.075} h={legH} position={[-0.1, legH / 2, pose === "walking" ? 0.08 : 0]} color={cloth} metalness={0} roughness={0.9} />
          <Cyl r={0.075} h={legH} position={[0.1, legH / 2, pose === "walking" ? -0.08 : 0]} color={cloth} metalness={0} roughness={0.9} />
        </>
      )}

      {/* torso */}
      <Cyl r={Math.max(0.15, w * 0.32)} rTop={Math.max(0.16, w * 0.34)} h={torsoH} position={[0, torsoY, 0]} color={cloth} metalness={0} roughness={0.9} />
      {/* shoulders */}
      <Cyl r={0.055} h={0.5} rotation={[0, 0, Math.PI / 2]} position={[0, torsoY + torsoH / 2 - 0.04, 0]} color={cloth} metalness={0} roughness={0.9} />

      {/* arms */}
      {pose === "operating" ? (
        <>
          <Box size={[0.07, 0.07, 0.34]} position={[-0.2, torsoY + 0.05, 0.16]} color={cloth} />
          <Box size={[0.07, 0.07, 0.34]} position={[0.2, torsoY + 0.05, 0.16]} color={cloth} />
        </>
      ) : pose === "speaking" ? (
        <>
          <Cyl r={0.055} h={torsoH * 0.95} position={[-0.24, torsoY, 0]} color={cloth} metalness={0} roughness={0.9} />
          <Box size={[0.07, 0.07, 0.3]} position={[0.22, torsoY + 0.06, 0.14]} rotation={[0.5, 0, 0]} color={cloth} />
        </>
      ) : (
        <>
          <Cyl r={0.055} h={torsoH * 0.95} position={[-0.24, torsoY, seated ? 0.05 : 0]} color={cloth} metalness={0} roughness={0.9} />
          <Cyl r={0.055} h={torsoH * 0.95} position={[0.24, torsoY, seated ? 0.05 : 0]} color={cloth} metalness={0} roughness={0.9} />
        </>
      )}

      {/* neck + head */}
      <Cyl r={0.045} h={0.07} position={[0, torsoY + torsoH / 2 + 0.035, 0]} color={skin} metalness={0} roughness={0.85} />
      <mesh position={[0, torsoY + torsoH / 2 + 0.07 + headR, 0]} castShadow>
        <sphereGeometry args={[headR, 18, 14]} />
        <meshStandardMaterial color={skin} roughness={0.8} metalness={0} />
      </mesh>
    </group>
  );
}

/* --------------------------------------------------------------- furniture */

function Table({ w, d, h, color, skirt }: P & { skirt?: boolean }) {
  return (
    <group>
      <Box size={[w, 0.05, d]} position={[0, h - 0.025, 0]} color={color} roughness={0.4} metalness={0.25} />
      {skirt ? (
        <Box size={[w, h - 0.05, 0.02]} position={[0, (h - 0.05) / 2, d / 2 - 0.01]} color="#171b23" roughness={0.95} metalness={0} />
      ) : null}
      {([
        [-w / 2 + 0.06, -d / 2 + 0.06],
        [w / 2 - 0.06, -d / 2 + 0.06],
        [-w / 2 + 0.06, d / 2 - 0.06],
        [w / 2 - 0.06, d / 2 - 0.06],
      ] as Array<[number, number]>).map(([x, z], i) => (
        <Cyl key={i} r={0.025} h={h - 0.05} position={[x, (h - 0.05) / 2, z]} {...METAL} color="#3a404b" />
      ))}
    </group>
  );
}

function Podium({ w, d, h, color }: P) {
  return (
    <group>
      <Box size={[w, h * 0.9, d]} position={[0, (h * 0.9) / 2, 0]} color={color} roughness={0.35} metalness={0.2} />
      <Box size={[w + 0.08, 0.05, d + 0.08]} position={[0, h * 0.9 + 0.02, 0]} rotation={[-0.12, 0, 0]} color="#1b1f27" roughness={0.4} />
      <Cyl r={0.008} h={0.35} position={[0.12, h + 0.16, 0.02]} rotation={[0.5, 0, 0]} color="#0d1016" />
      <mesh position={[0.12, h + 0.3, 0.14]} castShadow>
        <sphereGeometry args={[0.02, 10, 8]} />
        <meshStandardMaterial color="#0d1016" />
      </mesh>
    </group>
  );
}

function Sofa({ w, d, h, color }: P) {
  return (
    <group>
      <Box size={[w, 0.35, d]} position={[0, 0.22, 0]} color={color} roughness={0.95} metalness={0} />
      <Box size={[w, h - 0.4, 0.16]} position={[0, (h + 0.4) / 2 - 0.2, -d / 2 + 0.08]} color={color} roughness={0.95} metalness={0} />
      <Box size={[0.16, h * 0.6, d]} position={[-w / 2 + 0.08, h * 0.35, 0]} color={color} roughness={0.95} metalness={0} />
      <Box size={[0.16, h * 0.6, d]} position={[w / 2 - 0.08, h * 0.35, 0]} color={color} roughness={0.95} metalness={0} />
      <Box size={[w * 0.94, 0.05, d * 0.9]} position={[0, 0.025, 0]} color="#1a1d24" />
    </group>
  );
}

/* ------------------------------------------------------------------- video */

function Camera({ w, d, h, color }: P) {
  return (
    <group>
      <Box size={[w, h * 0.75, d * 0.8]} position={[0, h * 0.375, 0]} color={color} roughness={0.5} metalness={0.4} />
      <Cyl r={h * 0.28} h={d * 0.55} rotation={[Math.PI / 2, 0, 0]} position={[0, h * 0.4, d * 0.55]} {...DARK} />
      <Cyl r={h * 0.3} h={0.02} rotation={[Math.PI / 2, 0, 0]} position={[0, h * 0.4, d * 0.83]} color="#0a1a2a" roughness={0.1} metalness={0.9} />
      <Box size={[w * 0.55, h * 0.35, 0.05]} position={[-w * 0.1, h * 0.95, -d * 0.15]} color="#101319" emissive="#3d7dd6" emissiveIntensity={0.5} />
      <Box size={[0.05, h * 0.2, d * 0.35]} position={[w * 0.45, h * 0.85, -d * 0.1]} {...DARK} />
    </group>
  );
}

function PTZ({ w, h }: P) {
  return (
    <group>
      <Cyl r={w * 0.5} h={h * 0.25} position={[0, h * 0.125, 0]} {...DARK} />
      <mesh position={[0, h * 0.6, 0]} castShadow>
        <sphereGeometry args={[w * 0.45, 20, 16]} />
        <meshStandardMaterial color="#e9edf3" roughness={0.4} metalness={0.1} />
      </mesh>
      <Cyl r={w * 0.16} h={0.06} rotation={[Math.PI / 2, 0, 0]} position={[0, h * 0.6, w * 0.42]} color="#0a1a2a" roughness={0.1} metalness={0.9} />
    </group>
  );
}

function Tripod({ w, h, color }: P) {
  const spread = w * 0.45;
  return (
    <group>
      {[0, 120, 240].map((a, i) => {
        const rad = (a * Math.PI) / 180;
        return (
          <Cyl
            key={i}
            r={0.018}
            h={h * 0.98}
            position={[(Math.sin(rad) * spread) / 2, h * 0.46, (Math.cos(rad) * spread) / 2]}
            rotation={[Math.cos(rad) * 0.22, 0, -Math.sin(rad) * 0.22]}
            color={color}
            metalness={0.7}
          />
        );
      })}
      <Cyl r={0.05} h={0.08} position={[0, h * 0.94, 0]} color={color} metalness={0.7} />
      <Box size={[0.16, 0.04, 0.22]} position={[0, h, 0]} {...DARK} />
      <Cyl r={0.012} h={0.3} position={[0.06, h * 0.9, -0.14]} rotation={[0.45, 0, 0]} color="#1b1f27" />
    </group>
  );
}

function RackUnit({ w, d, h, color, leds = 6 }: P & { leds?: number }) {
  return (
    <group>
      <Box size={[w, h, d]} position={[0, h / 2, 0]} color="#1a1d24" roughness={0.45} metalness={0.7} />
      <Box size={[w * 0.98, h * 0.55, 0.01]} position={[0, h * 0.5, d / 2 + 0.006]} color={color} roughness={0.35} metalness={0.6} />
      {Array.from({ length: leds }, (_, i) => (
        <Box
          key={i}
          size={[0.012, 0.012, 0.006]}
          position={[-w * 0.4 + (i * w * 0.8) / Math.max(1, leds - 1), h * 0.3, d / 2 + 0.012]}
          color="#0b1220"
          emissive={i % 3 === 0 ? "#68d391" : "#7fd4ff"}
          emissiveIntensity={1.4}
        />
      ))}
      {[-1, 1].map((s) => (
        <Box key={s} size={[0.03, h * 0.9, 0.012]} position={[s * (w / 2 - 0.015), h / 2, d / 2 + 0.012]} {...METAL} />
      ))}
    </group>
  );
}

function Monitor({ w, d, h, color }: P) {
  const screenH = h * 0.72;
  return (
    <group>
      <Box size={[w * 0.45, 0.03, d * 2.2]} position={[0, 0.015, 0]} {...DARK} />
      <Cyl r={0.035} h={h * 0.24} position={[0, h * 0.12, 0]} {...DARK} />
      <Box size={[w, screenH, Math.max(d, 0.05)]} position={[0, h - screenH / 2, 0]} color="#0e1117" roughness={0.5} metalness={0.4} />
      <Box
        size={[w * 0.95, screenH * 0.9, 0.01]}
        position={[0, h - screenH / 2, Math.max(d, 0.05) / 2 + 0.006]}
        color="#0a1220"
        emissive={color}
        emissiveIntensity={0.55}
      />
    </group>
  );
}

function Workstation({ w, d, h, color }: P) {
  return (
    <group>
      <Box size={[w * 0.55, h * 0.62, d * 0.75]} position={[-w * 0.2, (h * 0.62) / 2, 0]} color="#171b22" roughness={0.5} metalness={0.6} />
      <Box size={[0.01, h * 0.5, d * 0.6]} position={[-w * 0.2 + w * 0.28, h * 0.33, 0]} color={color} emissive={color} emissiveIntensity={0.5} />
      <Box size={[w * 0.75, 0.02, d * 0.4]} position={[w * 0.1, h * 0.64, d * 0.15]} {...DARK} />
      <Box size={[w * 0.7, h * 0.34, 0.03]} position={[w * 0.1, h * 0.82, -d * 0.15]} color="#0a1220" emissive="#4c7cff" emissiveIntensity={0.35} />
    </group>
  );
}

/* ---------------------------------------------------------------- lighting */

function MovingHead({ w, d, h, color }: P) {
  return (
    <group>
      <Box size={[w, h * 0.22, d]} position={[0, h * 0.11, 0]} color="#171b22" roughness={0.5} metalness={0.7} />
      <Box size={[w * 0.22, h * 0.45, d * 0.7]} position={[-w * 0.36, h * 0.42, 0]} {...METAL} />
      <Box size={[w * 0.22, h * 0.45, d * 0.7]} position={[w * 0.36, h * 0.42, 0]} {...METAL} />
      <Cyl r={w * 0.3} h={h * 0.5} position={[0, h * 0.62, 0]} rotation={[Math.PI / 2, 0, 0]} color="#20242c" roughness={0.4} metalness={0.7} />
      <Cyl r={w * 0.28} h={0.02} position={[0, h * 0.62, d * 0.26]} rotation={[Math.PI / 2, 0, 0]} color={color} roughness={0.1} metalness={0.2} />
      {/* beam */}
      <mesh position={[0, h * 0.62, d * 0.9]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[w * 0.7, 1.4, 20, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0.14} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <pointLight position={[0, h * 0.62, d * 0.4]} intensity={2} distance={6} color={color} />
    </group>
  );
}

function Fixture({ w, d, h, color, barrel }: P & { barrel: boolean }) {
  return (
    <group>
      <Cyl r={Math.min(w, h) * 0.45} h={d * 0.7} rotation={[Math.PI / 2, 0, 0]} position={[0, h * 0.55, 0]} color="#1b1f27" roughness={0.5} metalness={0.7} />
      {barrel && (
        <Cyl r={Math.min(w, h) * 0.3} h={d * 0.5} rotation={[Math.PI / 2, 0, 0]} position={[0, h * 0.55, d * 0.55]} {...METAL} />
      )}
      <Cyl r={Math.min(w, h) * 0.42} h={0.02} rotation={[Math.PI / 2, 0, 0]} position={[0, h * 0.55, d * (barrel ? 0.8 : 0.36)]} color={color} roughness={0.15} />
      <Box size={[w * 1.05, h * 0.5, 0.03]} position={[0, h * 0.5, -d * 0.1]} {...METAL} />
      <Cyl r={0.02} h={h * 0.3} position={[0, h * 0.14, 0]} {...METAL} />
      <mesh position={[0, h * 0.55, d * 0.9]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[w * 0.75, 1.2, 18, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0.1} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

function LedBar({ w, d, h, color }: P) {
  const cells = Math.max(4, Math.round(w * 8));
  return (
    <group>
      <Box size={[w, h, d]} position={[0, h / 2, 0]} color="#14171d" roughness={0.5} metalness={0.6} />
      {Array.from({ length: cells }, (_, i) => (
        <Box
          key={i}
          size={[(w / cells) * 0.7, h * 0.6, 0.01]}
          position={[-w / 2 + (w / cells) * (i + 0.5), h / 2, d / 2 + 0.008]}
          color="#0b1220"
          emissive={color}
          emissiveIntensity={1.6}
        />
      ))}
    </group>
  );
}

/* --------------------------------------------------------------- structure */

function Truss({ w, d, h, color, vertical }: P & { vertical?: boolean }) {
  const len = vertical ? h : w;
  const side = Math.max(0.18, vertical ? Math.min(w, d) : Math.min(d, h));
  const bays = Math.max(2, Math.round(len / 0.5));
  const chords: Array<[number, number]> = [
    [-side / 2, -side / 2],
    [side / 2, -side / 2],
    [-side / 2, side / 2],
    [side / 2, side / 2],
  ];
  const mat = { color, roughness: 0.35, metalness: 0.85 };

  return (
    <group
      position={vertical ? [0, h / 2, 0] : [0, h / 2, 0]}
      rotation={vertical ? [0, 0, 0] : [0, 0, Math.PI / 2]}
    >
      {chords.map(([a, b], i) => (
        <Cyl key={i} r={0.025} h={len} position={[a, 0, b]} {...mat} segments={10} />
      ))}
      {Array.from({ length: bays }, (_, i) => {
        const y = -len / 2 + (len / bays) * (i + 0.5);
        return (
          <group key={i} position={[0, y, 0]}>
            <Cyl r={0.014} h={side * 1.42} rotation={[0, 0, Math.PI / 4]} position={[0, 0, -side / 2]} {...mat} segments={8} />
            <Cyl r={0.014} h={side * 1.42} rotation={[0, 0, -Math.PI / 4]} position={[0, 0, side / 2]} {...mat} segments={8} />
            <Cyl r={0.014} h={side * 1.42} rotation={[Math.PI / 4, 0, 0]} position={[-side / 2, 0, 0]} {...mat} segments={8} />
            <Cyl r={0.014} h={side * 1.42} rotation={[-Math.PI / 4, 0, 0]} position={[side / 2, 0, 0]} {...mat} segments={8} />
          </group>
        );
      })}
    </group>
  );
}

function Goalpost({ w, d, h, color }: P) {
  const legW = Math.max(0.3, Math.min(d, 0.4));
  return (
    <group>
      <group position={[-w / 2 + legW / 2, 0, 0]}>
        <Truss w={legW} d={legW} h={h} color={color} vertical />
      </group>
      <group position={[w / 2 - legW / 2, 0, 0]}>
        <Truss w={legW} d={legW} h={h} color={color} vertical />
      </group>
      <group position={[0, h - legW / 2, 0]}>
        <Truss w={w} d={legW} h={legW} color={color} />
      </group>
      {[-1, 1].map((s) => (
        <Box key={s} size={[0.8, 0.06, 0.8]} position={[s * (w / 2 - legW / 2), 0.03, 0]} color="#3b414d" metalness={0.7} />
      ))}
    </group>
  );
}

function Stand({ w, h, color }: P) {
  return (
    <group>
      {[0, 120, 240].map((a, i) => {
        const rad = (a * Math.PI) / 180;
        return (
          <Box
            key={i}
            size={[0.05, 0.05, w * 0.5]}
            position={[(Math.sin(rad) * w) / 4, 0.04, (Math.cos(rad) * w) / 4]}
            rotation={[0, -rad, 0]}
            color={color}
            metalness={0.7}
          />
        );
      })}
      <Cyl r={0.035} h={h * 0.6} position={[0, h * 0.3, 0]} color={color} metalness={0.7} />
      <Cyl r={0.026} h={h * 0.5} position={[0, h * 0.72, 0]} color="#9aa2b1" metalness={0.8} />
      <Box size={[Math.max(0.8, w), 0.05, 0.05]} position={[0, h, 0]} color={color} metalness={0.75} />
    </group>
  );
}

function StageDeck({ w, d, h, color }: P) {
  return (
    <group>
      <Box size={[w, h * 0.35, d]} position={[0, h - (h * 0.35) / 2, 0]} color={color} roughness={0.85} metalness={0.1} />
      {([
        [-w / 2 + 0.08, -d / 2 + 0.08],
        [w / 2 - 0.08, -d / 2 + 0.08],
        [-w / 2 + 0.08, d / 2 - 0.08],
        [w / 2 - 0.08, d / 2 - 0.08],
      ] as Array<[number, number]>).map(([x, z], i) => (
        <Cyl key={i} r={0.03} h={h * 0.7} position={[x, (h * 0.7) / 2, z]} color="#3b414d" metalness={0.75} />
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ router */

export function hasRealisticModel(typeKey: string) {
  return MODEL_KEYS.has(typeKey);
}

const MODEL_KEYS = new Set([
  "conference-chair",
  "banquet-chair",
  "executive-chair",
  "vip-chair",
  "bar-stool",
  "auditorium-chair",
  "folding-chair",
  "panel-chair",
  "lounge-chair",
  "person-speaker",
  "person-presenter",
  "person-panelist",
  "person-mc",
  "person-audience",
  "person-camera-op",
  "person-technician",
  "person-staff",
  "panel-table",
  "high-table",
  "side-table",
  "coffee-table",
  "sofa",
  "podium",
  "lectern",
  "camera",
  "ptz-camera",
  "tripod",
  "video-switcher",
  "atem",
  "capture-card",
  "confidence-monitor",
  "vmix",
  "playback-pc",
  "novastar-vx1000",
  "novastar-vx600",
  "led-processor",
  "media-server",
  "video-distribution",
  "moving-head",
  "profile",
  "wash",
  "fresnel",
  "led-bar",
  "strobe",
  "follow-spot",
  "lighting-controller",
  "truss",
  "vertical-truss",
  "goalpost-truss",
  "ground-support",
  "lighting-stand",
  "stage-deck",
]);

export function EquipmentModel({ item }: { item: EquipmentItem }) {
  const p: P = { w: item.width, d: item.depth, h: item.height, color: item.color };
  const k = item.typeKey;

  switch (k) {
    // seating
    case "conference-chair":
    case "banquet-chair":
    case "executive-chair":
    case "vip-chair":
    case "bar-stool":
    case "auditorium-chair":
    case "folding-chair":
    case "panel-chair":
      return <Chair {...p} style={k} />;
    case "lounge-chair":
      return <Chair {...p} style="vip-chair" />;

    // people
    case "person-panelist":
    case "person-audience":
      return <Person {...p} pose="sitting" />;
    case "person-speaker":
    case "person-mc":
    case "person-presenter":
      return <Person {...p} pose="speaking" />;
    case "person-camera-op":
      return <Person {...p} pose="operating" />;
    case "person-technician":
      return <Person {...p} pose="walking" />;
    case "person-staff":
      return <Person {...p} pose="standing" />;

    // furniture
    case "panel-table":
      return <Table {...p} skirt />;
    case "high-table":
    case "side-table":
    case "coffee-table":
      return <Table {...p} />;
    case "sofa":
      return <Sofa {...p} />;
    case "podium":
    case "lectern":
      return <Podium {...p} />;

    // video
    case "camera":
    case "follow-spot":
      return <Camera {...p} />;
    case "ptz-camera":
      return <PTZ {...p} />;
    case "tripod":
      return <Tripod {...p} />;
    case "confidence-monitor":
      return <Monitor {...p} />;
    case "vmix":
    case "playback-pc":
      return <Workstation {...p} />;
    case "video-switcher":
    case "atem":
    case "capture-card":
    case "lighting-controller":
    case "novastar-vx1000":
    case "novastar-vx600":
    case "led-processor":
    case "media-server":
    case "video-distribution":
      return <RackUnit {...p} />;

    // lighting
    case "moving-head":
      return <MovingHead {...p} />;
    case "profile":
      return <Fixture {...p} barrel />;
    case "wash":
    case "fresnel":
    case "strobe":
      return <Fixture {...p} barrel={false} />;
    case "led-bar":
      return <LedBar {...p} />;

    // structure
    case "truss":
      return <Truss {...p} />;
    case "vertical-truss":
    case "ground-support":
      return <Truss {...p} vertical />;
    case "goalpost-truss":
      return <Goalpost {...p} />;
    case "lighting-stand":
      return <Stand {...p} />;
    case "stage-deck":
      return <StageDeck {...p} />;

    default:
      // clearly-marked placeholder massing block
      return (
        <group>
          <Box size={[item.width, item.height, item.depth]} position={[0, item.height / 2, 0]} color={item.color} roughness={0.6} metalness={0.3} />
          <mesh position={[0, item.height / 2, 0]} scale={1.001}>
            <boxGeometry args={[item.width, item.height, item.depth]} />
            <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.12} />
          </mesh>
        </group>
      );
  }
}
