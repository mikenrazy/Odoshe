import * as THREE from "three";
import { Text } from "@react-three/drei";
import type { EquipmentItem } from "@/lib/led/types";

const DEG = Math.PI / 180;

interface Props {
  item: EquipmentItem;
  selected: boolean;
  interactive: boolean;
  showLabel: boolean;
  onSelect: (id: string) => void;
  registerRef?: (id: string, object: THREE.Object3D | null) => void;
}

/** Simple massing block used for cameras, lighting, truss and furniture. */
export function EquipmentObject({
  item,
  selected,
  interactive,
  showLabel,
  onSelect,
  registerRef,
}: Props) {
  if (!item.visible) return null;

  const emissive = item.category === "lighting" ? item.color : "#000000";

  return (
    <group
      name={item.id}
      ref={(node) => registerRef?.(item.id, node)}
      position={[item.position.x, item.position.y + item.height / 2, item.position.z]}
      rotation={[0, item.rotation * DEG, 0]}
      onPointerDown={(e) => {
        if (!interactive) return;
        e.stopPropagation();
        onSelect(item.id);
      }}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={[item.width, item.height, item.depth]} />
        <meshStandardMaterial
          color={item.color}
          emissive={new THREE.Color(emissive)}
          emissiveIntensity={item.category === "lighting" ? 0.6 : 0}
          roughness={0.55}
          metalness={0.35}
        />
      </mesh>

      {selected && (
        <mesh scale={1.06}>
          <boxGeometry args={[item.width, item.height, item.depth]} />
          <meshBasicMaterial color="#ff9d2e" wireframe transparent opacity={0.7} />
        </mesh>
      )}

      {showLabel && (
        <Text
          position={[0, item.height / 2 + 0.22, 0]}
          fontSize={0.22}
          color={selected ? "#ff9d2e" : "#8b93a7"}
          anchorX="center"
          outlineWidth={0.012}
          outlineColor="#05070b"
        >
          {item.quantity > 1 ? `${item.name} ×${item.quantity}` : item.name}
        </Text>
      )}
    </group>
  );
}
