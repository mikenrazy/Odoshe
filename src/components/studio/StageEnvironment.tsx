import { Line, Text } from "@react-three/drei";
import type { Layers, Measurement, StageConfig } from "@/lib/led/types";
import { resolveAnchor, type ElementAnchor } from "@/lib/led/stage-elements";

interface Props {
  stage: StageConfig;
  layers: Layers;
  measurements: Measurement[];
  showMeasurements: boolean;
}

const DEG = Math.PI / 180;

/** Wraps children in the placement transform resolved from the element setup. */
function Placed({ a, y, children }: { a: ElementAnchor; y: number; children: React.ReactNode }) {
  return (
    <group
      position={[a.x, y + a.y, a.z]}
      rotation={[0, a.rotation * DEG, 0]}
      scale={[a.scale, a.scale, a.scale]}
    >
      {children}
    </group>
  );
}

/* ------------------------------------------------------------------ stairs */

function Stairs({ stage, a }: { stage: StageConfig; a: ElementAnchor }) {
  const height = stage.height;
  const glow = a.style === "glow";
  const steps = a.style === "wide" ? 4 : 3;
  const runWidth =
    a.style === "wrap"
      ? stage.width
      : a.style === "wide"
        ? stage.width * 0.45
        : a.style === "dual"
          ? stage.width * 0.22
          : 3;
  const stepDepth = a.style === "wide" ? 0.6 : 0.7;

  const flight = (offsetX: number) => (
    <group key={offsetX} position={[offsetX, 0, 0]}>
      {Array.from({ length: steps }, (_, i) => {
        const h = (height * (steps - i)) / (steps + 1);
        return (
          <group key={i} position={[0, h / 2, 0.35 + i * stepDepth]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[runWidth, h, stepDepth]} />
              <meshStandardMaterial
                color={stage.stairsColor}
                emissive={stage.stairsColor}
                emissiveIntensity={glow ? 0.05 : 0.12}
                roughness={0.45}
                metalness={0.25}
              />
            </mesh>
            {glow && (
              <mesh position={[0, h / 2 + 0.012, stepDepth / 2 - 0.02]}>
                <boxGeometry args={[runWidth, 0.03, 0.06]} />
                <meshStandardMaterial
                  color="#ffd9a0"
                  emissive="#ffb454"
                  emissiveIntensity={1.6}
                  roughness={0.3}
                />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );

  const offsets =
    a.style === "dual" ? [-(stage.width / 2 - runWidth / 2 - 0.4), stage.width / 2 - runWidth / 2 - 0.4] : [0];

  return <>{offsets.map(flight)}</>;
}

/* ------------------------------------------------------------------ podium */

function Podium({ stage, a }: { stage: StageConfig; a: ElementAnchor }) {
  const c = stage.podiumColor;
  if (a.style === "classic") {
    return (
      <group>
        <mesh position={[0, 0.15, 0]} castShadow>
          <boxGeometry args={[0.95, 0.3, 0.7]} />
          <meshStandardMaterial color={c} roughness={0.5} metalness={0.25} />
        </mesh>
        <mesh position={[0, 0.7, 0]} castShadow>
          <boxGeometry args={[0.7, 0.85, 0.5]} />
          <meshStandardMaterial color={c} roughness={0.45} metalness={0.3} />
        </mesh>
        <mesh position={[0, 1.16, 0.05]} rotation={[-0.22, 0, 0]} castShadow>
          <boxGeometry args={[0.9, 0.05, 0.55]} />
          <meshStandardMaterial color={c} roughness={0.35} metalness={0.4} />
        </mesh>
      </group>
    );
  }
  if (a.style === "acrylic") {
    return (
      <group>
        <mesh position={[0, 0.6, 0]} castShadow>
          <boxGeometry args={[0.85, 1.2, 0.5]} />
          <meshStandardMaterial
            color="#9fd8ff"
            transparent
            opacity={0.35}
            roughness={0.08}
            metalness={0.1}
          />
        </mesh>
        <mesh position={[0, 1.22, 0]}>
          <boxGeometry args={[0.9, 0.05, 0.55]} />
          <meshStandardMaterial color={c} roughness={0.3} metalness={0.5} />
        </mesh>
      </group>
    );
  }
  if (a.style === "led") {
    return (
      <group>
        <mesh position={[0, 0.6, 0]} castShadow>
          <boxGeometry args={[0.85, 1.2, 0.55]} />
          <meshStandardMaterial color="#0c1018" roughness={0.6} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0.6, 0.29]}>
          <planeGeometry args={[0.78, 1.05]} />
          <meshStandardMaterial color={c} emissive={c} emissiveIntensity={1.1} roughness={0.4} />
        </mesh>
      </group>
    );
  }
  return (
    <mesh position={[0, 0.6, 0]} castShadow>
      <boxGeometry args={[0.8, 1.2, 0.55]} />
      <meshStandardMaterial color={c} roughness={0.4} metalness={0.4} />
    </mesh>
  );
}

/* --------------------------------------------------------------- furniture */

function Furniture({ a }: { a: ElementAnchor }) {
  if (a.style === "panel") {
    return (
      <group>
        {[-1.05, -0.35, 0.35, 1.05].map((x) => (
          <group key={x} position={[x, 0, -0.35]}>
            <mesh position={[0, 0.42, 0]} castShadow>
              <boxGeometry args={[0.55, 0.1, 0.55]} />
              <meshStandardMaterial color="#2f6f6a" roughness={0.7} />
            </mesh>
            <mesh position={[0, 0.72, -0.24]} castShadow>
              <boxGeometry args={[0.55, 0.6, 0.08]} />
              <meshStandardMaterial color="#2f6f6a" roughness={0.7} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 0.28, 0.55]} castShadow>
          <boxGeometry args={[2.4, 0.08, 0.6]} />
          <meshStandardMaterial color="#1b2330" roughness={0.4} metalness={0.35} />
        </mesh>
      </group>
    );
  }
  if (a.style === "stools") {
    return (
      <group>
        {[-0.9, 0, 0.9].map((x) => (
          <group key={x} position={[x, 0, 0]}>
            <mesh position={[0, 0.38, 0]} castShadow>
              <cylinderGeometry args={[0.05, 0.05, 0.75, 10]} />
              <meshStandardMaterial color="#8b93a7" metalness={0.8} roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.79, 0]} castShadow>
              <cylinderGeometry args={[0.22, 0.22, 0.08, 16]} />
              <meshStandardMaterial color="#2f6f6a" roughness={0.65} />
            </mesh>
          </group>
        ))}
      </group>
    );
  }
  if (a.style === "roundtable") {
    return (
      <group>
        <mesh position={[0, 0.36, 0]} castShadow>
          <cylinderGeometry args={[0.75, 0.75, 0.06, 28]} />
          <meshStandardMaterial color="#1b2330" roughness={0.4} metalness={0.35} />
        </mesh>
        <mesh position={[0, 0.18, 0]}>
          <cylinderGeometry args={[0.1, 0.16, 0.36, 12]} />
          <meshStandardMaterial color="#8b93a7" metalness={0.8} roughness={0.3} />
        </mesh>
        {[0, 90, 180, 270].map((deg) => {
          const r = 1.15;
          const rad = deg * DEG;
          return (
            <mesh
              key={deg}
              position={[Math.cos(rad) * r, 0.45, Math.sin(rad) * r]}
              rotation={[0, -rad, 0]}
              castShadow
            >
              <boxGeometry args={[0.5, 0.9, 0.5]} />
              <meshStandardMaterial color="#2f6f6a" roughness={0.7} />
            </mesh>
          );
        })}
      </group>
    );
  }
  return (
    <group>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[(i - 1) * 0.9, 0.45, 0]} castShadow>
          <boxGeometry args={[0.6, 0.9, 0.6]} />
          <meshStandardMaterial color="#2f6f6a" roughness={0.7} metalness={0.15} />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------- truss */

function Truss({ stage, a }: { stage: StageConfig; a: ElementAnchor }) {
  const span = stage.width + 3;
  const top = stage.backWallHeight + 0.4;
  const mat = (
    <meshStandardMaterial color={stage.trussColor} roughness={0.5} metalness={0.8} />
  );
  const post = (x: number, z: number) => (
    <mesh key={`${x}:${z}`} position={[x, top / 2, z]} castShadow>
      <boxGeometry args={[0.35, top, 0.35]} />
      {mat}
    </mesh>
  );

  if (a.style === "arch") {
    const segs = 9;
    return (
      <group>
        {Array.from({ length: segs }, (_, i) => {
          const t = i / (segs - 1);
          const ang = Math.PI * t;
          return (
            <mesh
              key={i}
              position={[-Math.cos(ang) * (span / 2), Math.sin(ang) * top, 0]}
              rotation={[0, 0, -ang + Math.PI / 2]}
              castShadow
            >
              <boxGeometry args={[0.32, (Math.PI * span) / (2 * segs) + 0.15, 0.32]} />
              {mat}
            </mesh>
          );
        })}
      </group>
    );
  }

  return (
    <group>
      <mesh position={[0, top, 0]} castShadow>
        <boxGeometry args={[span, 0.35, 0.35]} />
        {mat}
      </mesh>
      {post(-span / 2, 0)}
      {post(span / 2, 0)}
      {a.style === "box" && (
        <>
          <mesh position={[0, top, stage.depth]} castShadow>
            <boxGeometry args={[span, 0.35, 0.35]} />
            {mat}
          </mesh>
          {post(-span / 2, stage.depth)}
          {post(span / 2, stage.depth)}
          {[-span / 2, span / 2].map((x) => (
            <mesh key={`s${x}`} position={[x, top, stage.depth / 2]} castShadow>
              <boxGeometry args={[0.3, 0.3, stage.depth]} />
              {mat}
            </mesh>
          ))}
        </>
      )}
      {a.style === "grid" &&
        [0.3, 0.55, 0.8].map((t) => (
          <mesh key={t} position={[0, top * t, 0]}>
            <boxGeometry args={[span, 0.14, 0.14]} />
            {mat}
          </mesh>
        ))}
    </group>
  );
}

/* ---------------------------------------------------------------- backdrop */

function Backdrop({ stage, a }: { stage: StageConfig; a: ElementAnchor }) {
  const w = stage.width + 3;
  const h = stage.backWallHeight;
  if (a.style === "drape") {
    const pleats = Math.max(6, Math.round(w / 1.1));
    return (
      <group>
        {Array.from({ length: pleats }, (_, i) => (
          <mesh
            key={i}
            position={[-w / 2 + (i + 0.5) * (w / pleats), h / 2, i % 2 ? 0.08 : 0]}
            rotation={[0, i % 2 ? 0.12 : -0.12, 0]}
          >
            <planeGeometry args={[w / pleats + 0.12, h]} />
            <meshStandardMaterial color="#141826" roughness={1} metalness={0} />
          </mesh>
        ))}
      </group>
    );
  }
  if (a.style === "cyc") {
    return (
      <mesh position={[0, h / 2, 0]}>
        <cylinderGeometry args={[w / 2, w / 2, h, 40, 1, true, -Math.PI / 2.6, Math.PI / 1.3]} />
        <meshStandardMaterial color="#0e121c" roughness={1} side={2} />
      </mesh>
    );
  }
  if (a.style === "frame") {
    return (
      <group>
        <mesh position={[0, h / 2, 0]}>
          <planeGeometry args={[w, h]} />
          <meshStandardMaterial color="#0b0d14" roughness={1} />
        </mesh>
        <mesh position={[0, h - 0.3, 0.06]}>
          <boxGeometry args={[w, 0.5, 0.12]} />
          <meshStandardMaterial
            color={stage.trussColor}
            emissive={stage.trussColor}
            emissiveIntensity={0.15}
            metalness={0.7}
            roughness={0.4}
          />
        </mesh>
      </group>
    );
  }
  return (
    <mesh position={[0, h / 2, 0]}>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial color="#0b0d14" roughness={1} metalness={0} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ fascia */

function Fascia({ stage, a }: { stage: StageConfig; a: ElementAnchor }) {
  const w = stage.width + 0.04;
  const h = stage.height;
  if (a.style === "pleated") {
    const pleats = Math.max(8, Math.round(w / 0.5));
    return (
      <group>
        {Array.from({ length: pleats }, (_, i) => (
          <mesh
            key={i}
            position={[-w / 2 + (i + 0.5) * (w / pleats), h / 2, i % 2 ? 0.03 : 0]}
          >
            <boxGeometry args={[w / pleats + 0.03, h, 0.04]} />
            <meshStandardMaterial color={stage.fasciaColor} roughness={0.95} metalness={0.02} />
          </mesh>
        ))}
      </group>
    );
  }
  return (
    <group>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, 0.04]} />
        <meshStandardMaterial
          color={stage.fasciaColor}
          roughness={a.style === "brand" ? 0.5 : 0.9}
          metalness={a.style === "brand" ? 0.35 : 0.05}
        />
      </mesh>
      {a.style === "ledtape" && (
        <mesh position={[0, h - 0.04, 0.03]}>
          <boxGeometry args={[w, 0.06, 0.03]} />
          <meshStandardMaterial color="#9fd8ff" emissive="#4bb6ff" emissiveIntensity={2} />
        </mesh>
      )}
      {a.style === "brand" && (
        <mesh position={[0, h / 2, 0.03]}>
          <planeGeometry args={[w * 0.9, h * 0.6]} />
          <meshStandardMaterial color="#e6ecf5" roughness={0.6} />
        </mesh>
      )}
    </group>
  );
}

/* ================================================================== stage */

export function StageEnvironment({ stage, layers, measurements, showMeasurements }: Props) {
  const { width, depth, height } = stage;
  const halfW = width / 2;
  const halfD = depth / 2;
  const orientationY =
    stage.orientation === "corner" ? Math.PI / 4 : stage.orientation === "center" ? 0 : 0;

  const stairsA = resolveAnchor(stage, "stairs", { outside: true });
  const podiumA = resolveAnchor(stage, "podium");
  const furnitureA = resolveAnchor(stage, "furniture");
  const fasciaA = resolveAnchor(stage, "fascia", { outside: true });
  const backdropA = resolveAnchor(stage, "backdrop", { outside: true });
  const trussA = resolveAnchor(stage, "truss");

  return (
    <group>
      {/* venue floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[width * 4, depth * 8]} />
        <meshStandardMaterial color={stage.floorColor} roughness={0.35} metalness={0.6} />
      </mesh>

      {layers.stage.visible && (
        <group rotation={[0, orientationY, 0]}>
          {/* stage deck (shape-aware) */}
          {parts.map((part, i) => (
            <group key={`${part.kind}-${i}`} position={[part.x, 0, part.z]}>
              {part.kind === "rect" && (
                <>
                  <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
                    <boxGeometry args={[part.w, height, part.d]} />
                    <meshStandardMaterial
                      color={stage.stageColor}
                      emissive={stage.stageColor}
                      emissiveIntensity={deckMat.emissiveIntensity}
                      roughness={deckMat.roughness}
                      metalness={deckMat.metalness}
                    />
                  </mesh>
                  <mesh position={[0, height + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[part.w, part.d]} />
                    <meshStandardMaterial
                      color={stage.stageColor}
                      emissive={stage.stageColor}
                      emissiveIntensity={deckMat.emissiveIntensity}
                      roughness={Math.max(0.05, deckMat.roughness * 0.7)}
                      metalness={deckMat.metalness}
                    />
                  </mesh>
                </>
              )}
              {(part.kind === "circle" || part.kind === "semi") && (
                <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
                  <cylinderGeometry
                    args={[
                      part.w / 2,
                      part.w / 2,
                      height,
                      48,
                      1,
                      false,
                      part.kind === "semi" ? -Math.PI / 2 : 0,
                      part.kind === "semi" ? Math.PI : Math.PI * 2,
                    ]}
                  />
                  <meshStandardMaterial
                    color={stage.stageColor}
                    emissive={stage.stageColor}
                    emissiveIntensity={deckMat.emissiveIntensity}
                    roughness={deckMat.roughness}
                    metalness={deckMat.metalness}
                  />
                </mesh>
              )}
            </group>
          ))}

          {/* multi-level risers */}
          {risers.map((r) => (
            <group key={r.id} position={[r.x, height, r.z]} rotation={[0, r.rotation * DEG, 0]}>
              <mesh position={[0, r.height / 2, 0]} castShadow receiveShadow>
                <boxGeometry args={[r.width, r.height, r.depth]} />
                <meshStandardMaterial color={r.color} roughness={0.6} metalness={0.3} />
              </mesh>
              <mesh position={[0, r.height + 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[r.width, r.depth]} />
                <meshStandardMaterial
                  color={stage.stageColor}
                  roughness={Math.max(0.05, deckMat.roughness * 0.7)}
                  metalness={deckMat.metalness}
                />
              </mesh>
              <Text
                position={[0, r.height + 0.16, r.depth / 2 + 0.05]}
                fontSize={0.18}
                color="#8b93a7"
                anchorX="center"
                outlineWidth={0.01}
                outlineColor="#05070b"
              >
                {`${r.name} · +${r.height.toFixed(2)}m`}
              </Text>
            </group>
          ))}


          {stage.fascia && (
            <Placed a={fasciaA} y={0}>
              <Fascia stage={stage} a={fasciaA} />
            </Placed>
          )}

          {stage.backWall && (
            <mesh position={[0, stage.backWallHeight / 2, -halfD - 0.15]} receiveShadow castShadow>
              <boxGeometry args={[width + 2, stage.backWallHeight, 0.3]} />
              <meshStandardMaterial color={stage.backWallColor} roughness={0.85} metalness={0.1} />
            </mesh>
          )}

          {stage.backdrop && (
            <Placed a={{ ...backdropA, z: backdropA.z - 0.34 }} y={0}>
              <Backdrop stage={stage} a={backdropA} />
            </Placed>
          )}

          {stage.stairs && (
            <Placed a={stairsA} y={0}>
              <Stairs stage={stage} a={stairsA} />
            </Placed>
          )}

          {stage.podium && (
            <Placed a={podiumA} y={height}>
              <Podium stage={stage} a={podiumA} />
            </Placed>
          )}

          {stage.furniture && (
            <Placed a={furnitureA} y={height}>
              <Furniture a={furnitureA} />
            </Placed>
          )}
        </group>
      )}

      {/* overhead structure */}
      {layers.structure.visible && stage.truss && (
        <Placed a={trussA} y={0}>
          <Truss stage={stage} a={trussA} />
        </Placed>
      )}

      {/* lighting positions marker bar */}
      {layers.lighting.visible && stage.lightingPositions && (
        <mesh position={[0, stage.backWallHeight - 0.4, halfD + 1.4]}>
          <boxGeometry args={[width + 2, 0.2, 0.2]} />
          <meshStandardMaterial
            color="#ffb454"
            emissive="#ffb454"
            emissiveIntensity={0.25}
            roughness={0.6}
          />
        </mesh>
      )}

      {layers.audience.visible && stage.audience && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, halfD + depth * 1.6]}>
          <planeGeometry args={[width * 1.6, depth * 3]} />
          <meshStandardMaterial color="#0a0c12" roughness={0.95} transparent opacity={0.75} />
        </mesh>
      )}

      {layers.measurements.visible &&
        measurements.map((m) => {
          const mid = { x: (m.from.x + m.to.x) / 2, z: (m.from.z + m.to.z) / 2 };
          const length = Math.hypot(m.to.x - m.from.x, m.to.z - m.from.z);
          return (
            <group key={m.id}>
              <Line
                points={[
                  [m.from.x, 0.03, m.from.z],
                  [m.to.x, 0.03, m.to.z],
                ]}
                color="#68d391"
                lineWidth={1.5}
              />
              <Text
                position={[mid.x, 0.06, mid.z + 0.35]}
                rotation={[-Math.PI / 2, 0, 0]}
                fontSize={0.3}
                color="#68d391"
              >
                {`${m.label} ${length.toFixed(2)} m`}
              </Text>
            </group>
          );
        })}

      {showMeasurements && layers.measurements.visible && (
        <group>
          <Line
            points={[
              [-halfW, 0.02, halfD + 0.6],
              [halfW, 0.02, halfD + 0.6],
            ]}
            color="#ff9d2e"
            lineWidth={1.5}
          />
          <Text
            position={[0, 0.05, halfD + 1.05]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.35}
            color="#ff9d2e"
          >
            {`WIDTH ${width.toFixed(2)} m`}
          </Text>
          <Line
            points={[
              [halfW + 0.6, 0.02, -halfD],
              [halfW + 0.6, 0.02, halfD],
            ]}
            color="#7fd4ff"
            lineWidth={1.5}
          />
          <Text
            position={[halfW + 1.1, 0.05, 0]}
            rotation={[-Math.PI / 2, 0, Math.PI / 2]}
            fontSize={0.35}
            color="#7fd4ff"
          >
            {`DEPTH ${depth.toFixed(2)} m`}
          </Text>
          <Text
            position={[-halfW - 0.8, height + 0.25, halfD]}
            fontSize={0.3}
            color="#8b93a7"
            anchorX="right"
          >
            {`STAGE H ${height.toFixed(2)} m`}
          </Text>
        </group>
      )}
    </group>
  );
}
