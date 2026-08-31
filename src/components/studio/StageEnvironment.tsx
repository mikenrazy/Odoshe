import { Line, Text } from "@react-three/drei";
import type { Layers, Measurement, StageConfig } from "@/lib/led/types";

interface Props {
  stage: StageConfig;
  layers: Layers;
  measurements: Measurement[];
  showMeasurements: boolean;
}

export function StageEnvironment({ stage, layers, measurements, showMeasurements }: Props) {
  const { width, depth, height } = stage;
  const halfW = width / 2;
  const halfD = depth / 2;
  const orientationY =
    stage.orientation === "corner" ? Math.PI / 4 : stage.orientation === "center" ? 0 : 0;

  return (
    <group>
      {/* venue floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[width * 4, depth * 8]} />
        <meshStandardMaterial color={stage.floorColor} roughness={0.35} metalness={0.6} />
      </mesh>

      {layers.stage.visible && (
        <group rotation={[0, orientationY, 0]}>
          {/* stage platform */}
          <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[width, height, depth]} />
            <meshStandardMaterial color={stage.stageColor} roughness={0.28} metalness={0.55} />
          </mesh>

          {/* platform edge trim */}
          <mesh position={[0, height + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[width, depth]} />
            <meshStandardMaterial color={stage.stageColor} roughness={0.18} metalness={0.75} />
          </mesh>

          {/* thrust extension */}
          {stage.orientation === "thrust" && (
            <mesh position={[0, height / 2, halfD + depth * 0.25]} castShadow receiveShadow>
              <boxGeometry args={[width * 0.35, height, depth * 0.5]} />
              <meshStandardMaterial color={stage.stageColor} roughness={0.3} metalness={0.5} />
            </mesh>
          )}

          {/* fascia skirt around the deck front */}
          {stage.fascia && (
            <mesh position={[0, height / 2, halfD + 0.02]}>
              <boxGeometry args={[width + 0.04, height, 0.04]} />
              <meshStandardMaterial color={stage.fasciaColor} roughness={0.9} metalness={0.05} />
            </mesh>
          )}

          {stage.backWall && (
            <mesh position={[0, stage.backWallHeight / 2, -halfD - 0.15]} receiveShadow castShadow>
              <boxGeometry args={[width + 2, stage.backWallHeight, 0.3]} />
              <meshStandardMaterial
                color={stage.backWallColor}
                roughness={0.85}
                metalness={0.1}
              />
            </mesh>
          )}

          {stage.backdrop && (
            <mesh position={[0, stage.backWallHeight / 2, -halfD - 0.34]}>
              <planeGeometry args={[width + 3, stage.backWallHeight]} />
              <meshStandardMaterial color="#0b0d14" roughness={1} metalness={0} />
            </mesh>
          )}

          {stage.stairs &&
            [0, 1, 2].map((i) => (
              <mesh
                key={i}
                position={[0, (height * (3 - i)) / 6, halfD + 0.35 + i * 0.7]}
                castShadow
                receiveShadow
              >
                <boxGeometry args={[3, (height / 3) * (3 - i), 0.7]} />
                <meshStandardMaterial
                  color={stage.stairsColor}
                  emissive={stage.stairsColor}
                  emissiveIntensity={0.12}
                  roughness={0.45}
                  metalness={0.25}
                />
              </mesh>
            ))}

          {stage.podium && (
            <group position={[halfW - 2, height, halfD - 1.4]}>
              <mesh position={[0, 0.6, 0]} castShadow>
                <boxGeometry args={[0.8, 1.2, 0.55]} />
                <meshStandardMaterial color={stage.podiumColor} roughness={0.4} metalness={0.4} />
              </mesh>
            </group>
          )}

          {stage.furniture && (
            <group position={[-halfW + 2.4, height, halfD - 1.6]}>
              {[0, 1, 2].map((i) => (
                <mesh key={i} position={[i * 0.9, 0.45, 0]} castShadow>
                  <boxGeometry args={[0.6, 0.9, 0.6]} />
                  <meshStandardMaterial color="#2f6f6a" roughness={0.7} metalness={0.15} />
                </mesh>
              ))}
            </group>
          )}
        </group>
      )}

      {/* overhead structure */}
      {layers.structure.visible && stage.truss && (
        <group>
          <mesh position={[0, stage.backWallHeight + 0.4, -halfD + 0.2]} castShadow>
            <boxGeometry args={[width + 3, 0.35, 0.35]} />
            <meshStandardMaterial color={stage.trussColor} roughness={0.5} metalness={0.8} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh
              key={s}
              position={[s * ((width + 3) / 2), (stage.backWallHeight + 0.4) / 2, -halfD + 0.2]}
              castShadow
            >
              <boxGeometry args={[0.35, stage.backWallHeight + 0.4, 0.35]} />
              <meshStandardMaterial color={stage.trussColor} roughness={0.5} metalness={0.8} />
            </mesh>
          ))}
        </group>
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
