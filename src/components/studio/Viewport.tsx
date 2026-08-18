import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import { Grid, OrbitControls, TransformControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useEditor } from "@/lib/led/store";
import { StageEnvironment } from "./StageEnvironment";
import { LedScreenObject } from "./LedScreenObject";

const DEG = Math.PI / 180;

function CameraRig({ controls }: { controls: React.RefObject<OrbitControlsImpl | null> }) {
  const camera = useEditor((s) => s.camera);
  const project = useEditor((s) => s.project);
  const selectedId = useEditor((s) => s.selectedId);
  const { camera: cam } = useThree();

  useEffect(() => {
    const stage = project?.stage;
    const size = stage ? Math.max(stage.width, stage.depth) : 14;
    const target = new THREE.Vector3(0, 3, 0);
    let pos = new THREE.Vector3(size * 0.9, size * 0.62, size * 1.15);

    switch (camera.view) {
      case "front":
        pos = new THREE.Vector3(0, 4, size * 1.7);
        break;
      case "rear":
        pos = new THREE.Vector3(0, 4, -size * 1.7);
        break;
      case "left":
        pos = new THREE.Vector3(-size * 1.7, 4, 0);
        break;
      case "right":
        pos = new THREE.Vector3(size * 1.7, 4, 0);
        break;
      case "top":
        pos = new THREE.Vector3(0, size * 1.9, 0.001);
        break;
      case "focus": {
        const screen = project?.screens.find((s) => s.id === selectedId);
        if (screen) {
          target.set(screen.position.x, screen.position.y, screen.position.z);
          pos = new THREE.Vector3(
            screen.position.x,
            screen.position.y + 1,
            screen.position.z + Math.max(screen.physicalWidth, 4) * 1.4,
          );
        }
        break;
      }
      default:
        break;
    }

    cam.position.copy(pos);
    cam.lookAt(target);
    if (controls.current) {
      controls.current.target.copy(target);
      controls.current.update();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera.nonce]);

  return null;
}

export default function Viewport() {
  const project = useEditor((s) => s.project);
  const selectedId = useEditor((s) => s.selectedId);
  const select = useEditor((s) => s.select);
  const mode = useEditor((s) => s.mode);
  const transformMode = useEditor((s) => s.transformMode);
  const showMeasurements = useEditor((s) => s.showMeasurements);
  const updateScreen = useEditor((s) => s.updateScreen);

  const controls = useRef<OrbitControlsImpl | null>(null);
  const objects = useRef(new Map<string, THREE.Object3D>());
  const [selectedObject, setSelectedObject] = useState<THREE.Object3D | null>(null);

  const selectedScreen = useMemo(
    () => project?.screens.find((s) => s.id === selectedId) ?? null,
    [project, selectedId],
  );

  useEffect(() => {
    setSelectedObject(selectedId ? (objects.current.get(selectedId) ?? null) : null);
  }, [selectedId, project]);

  const editable = mode !== "preview";
  const gizmoActive = editable && !!selectedObject && !!selectedScreen && !selectedScreen.locked;

  if (!project) return null;

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [13, 9, 17], fov: 45, near: 0.1, far: 500 }}
      gl={{ antialias: true }}
      onPointerMissed={() => editable && select(null)}
    >
      <color attach="background" args={["#05070b"]} />
      <fog attach="fog" args={["#05070b", 40, 130]} />

      <ambientLight intensity={0.22} />
      <hemisphereLight args={["#2a3550", "#05070b", 0.35]} />
      <directionalLight
        position={[10, 18, 12]}
        intensity={0.55}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <spotLight
        position={[-9, 12, 8]}
        angle={0.6}
        penumbra={0.8}
        intensity={90}
        color="#4c7cff"
        castShadow
      />
      <spotLight
        position={[9, 12, 8]}
        angle={0.6}
        penumbra={0.8}
        intensity={90}
        color="#ff7a3c"
        castShadow
      />

      <StageEnvironment stage={project.stage} showMeasurements={showMeasurements} />

      {mode !== "preview" && (
        <Grid
          args={[80, 80]}
          cellSize={1}
          cellColor="#1b2330"
          sectionSize={5}
          sectionColor="#2b3a52"
          position={[0, -0.005, 0]}
          fadeDistance={70}
          infiniteGrid
        />
      )}

      {project.screens.map((screen) => (
        <LedScreenObject
          key={screen.id}
          screen={screen}
          selected={screen.id === selectedId && editable}
          showMeasurements={showMeasurements && editable}
          interactive={editable && !screen.locked}
          onSelect={select}
          registerRef={(id, node) => {
            if (node) objects.current.set(id, node);
            else objects.current.delete(id);
          }}
        />
      ))}

      {gizmoActive && selectedObject && selectedScreen && (
        <TransformControls
          object={selectedObject}
          mode={transformMode}
          size={0.85}
          onMouseDown={() => {
            if (controls.current) controls.current.enabled = false;
            // snapshot once per drag so undo steps back a whole gesture
            updateScreen(selectedScreen.id, {}, { history: true });
          }}
          onMouseUp={() => {
            if (controls.current) controls.current.enabled = true;
          }}
          onObjectChange={() => {
            const o = selectedObject;
            updateScreen(
              selectedScreen.id,
              {
                position: {
                  x: +o.position.x.toFixed(3),
                  y: +o.position.y.toFixed(3),
                  z: +o.position.z.toFixed(3),
                },
                rotation: {
                  x: +(o.rotation.x / DEG).toFixed(2),
                  y: +(o.rotation.y / DEG).toFixed(2),
                  z: +(o.rotation.z / DEG).toFixed(2),
                },
                scale: {
                  x: +o.scale.x.toFixed(3),
                  y: +o.scale.y.toFixed(3),
                  z: +o.scale.z.toFixed(3),
                },
              },
              { history: false },
            );
          }}
        />
      )}

      <OrbitControls
        ref={controls}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        maxPolarAngle={Math.PI / 2.02}
        target={[0, 3, 0]}
      />
      <CameraRig controls={controls} />
    </Canvas>
  );
}
