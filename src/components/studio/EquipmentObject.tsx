import * as THREE from "three";
import { Text } from "@react-three/drei";
import type { EquipmentItem } from "@/lib/led/types";
import { EquipmentModel, hasRealisticModel } from "./models/EquipmentModels";

const DEG = Math.PI / 180;

interface Props {
  item: EquipmentItem;
  selected: boolean;
  interactive: boolean;
  showLabel: boolean;
  onSelect: (id: string) => void;
  registerRef?: (id: string, object: THREE.Object3D | null) => void;
}

/** Real-world-scaled 3D representation of a production equipment item. */
export function EquipmentObject({
  item,
  selected,
  interactive,
  showLabel,
  onSelect,
  registerRef,
}: Props) {
  if (!item.visible) return null;

  const realistic = hasRealisticModel(item.typeKey);

  return (
    <group
      name={item.id}
      ref={(node) => registerRef?.(item.id, node)}
      position={[item.position.x, item.position.y, item.position.z]}
      rotation={[0, item.rotation * DEG, 0]}
      onPointerDown={(e) => {
        if (!interactive) return;
        e.stopPropagation();
        onSelect(item.id);
      }}
    >
      <EquipmentModel item={item} />

      {selected && (
        <mesh position={[0, item.height / 2, 0]}>
          <boxGeometry args={[item.width * 1.06, item.height * 1.06, item.depth * 1.06]} />
          <meshBasicMaterial color="#ff9d2e" wireframe transparent opacity={0.55} />
        </mesh>
      )}

      {showLabel && (
        <Text
          position={[0, item.height + 0.22, 0]}
          fontSize={0.2}
          color={selected ? "#ff9d2e" : realistic ? "#8b93a7" : "#c98b3a"}
          anchorX="center"
          outlineWidth={0.012}
          outlineColor="#05070b"
        >
          {`${item.quantity > 1 ? `${item.name} ×${item.quantity}` : item.name}${
            realistic ? "" : " (placeholder)"
          }`}
        </Text>
      )}
    </group>
  );
}
