import { uid, type EquipmentCategory, type EquipmentItem } from "./types";

export interface EquipmentDefinition {
  key: string;
  name: string;
  category: EquipmentCategory;
  /** metres */
  width: number;
  depth: number;
  height: number;
  color: string;
  /** default elevation of the item's base above the venue floor */
  baseY?: number;
}

export const EQUIPMENT_LIBRARY: EquipmentDefinition[] = [
  // ---------------------------------------------------------------- video
  { key: "camera", name: "Camera", category: "video", width: 0.3, depth: 0.6, height: 0.3, color: "#4c7cff" },
  { key: "tripod", name: "Tripod", category: "video", width: 0.8, depth: 0.8, height: 1.4, color: "#3d5db3" },
  { key: "ptz-camera", name: "PTZ Camera", category: "video", width: 0.25, depth: 0.25, height: 0.3, color: "#4c7cff" },
  { key: "video-switcher", name: "Video Switcher", category: "video", width: 0.6, depth: 0.4, height: 0.12, color: "#5a6caf" },
  { key: "atem", name: "ATEM", category: "video", width: 0.5, depth: 0.35, height: 0.1, color: "#5a6caf" },
  { key: "vmix", name: "vMix Workstation", category: "video", width: 0.7, depth: 0.6, height: 0.9, color: "#3f4f8a" },
  { key: "playback-pc", name: "Playback Computer", category: "video", width: 0.6, depth: 0.6, height: 0.9, color: "#3f4f8a" },
  { key: "capture-card", name: "Capture Card", category: "video", width: 0.2, depth: 0.15, height: 0.05, color: "#5a6caf" },
  { key: "confidence-monitor", name: "Confidence Monitor", category: "video", width: 1.2, depth: 0.12, height: 0.75, color: "#6fa8ff" },

  // ----------------------------------------------------------- LED / video
  { key: "novastar-vx1000", name: "NovaStar VX1000", category: "led", width: 0.48, depth: 0.4, height: 0.09, color: "#7fd4ff" },
  { key: "novastar-vx600", name: "NovaStar VX600", category: "led", width: 0.48, depth: 0.4, height: 0.09, color: "#7fd4ff" },
  { key: "led-processor", name: "LED Processor", category: "led", width: 0.48, depth: 0.4, height: 0.09, color: "#69bede" },
  { key: "media-server", name: "Media Server", category: "led", width: 0.5, depth: 0.7, height: 0.18, color: "#58a6c9" },
  { key: "video-distribution", name: "Video Distribution System", category: "led", width: 0.48, depth: 0.4, height: 0.13, color: "#58a6c9" },

  // ------------------------------------------------------------- lighting
  { key: "moving-head", name: "Moving Head", category: "lighting", width: 0.35, depth: 0.35, height: 0.6, color: "#ffb454", baseY: 5 },
  { key: "profile", name: "Profile", category: "lighting", width: 0.3, depth: 0.6, height: 0.35, color: "#ffc978", baseY: 5 },
  { key: "wash", name: "Wash", category: "lighting", width: 0.3, depth: 0.4, height: 0.4, color: "#ffcf90", baseY: 5 },
  { key: "fresnel", name: "Fresnel", category: "lighting", width: 0.3, depth: 0.4, height: 0.4, color: "#ffd9a6", baseY: 5 },
  { key: "led-bar", name: "LED Bar", category: "lighting", width: 1.0, depth: 0.12, height: 0.12, color: "#ff9d2e", baseY: 0 },
  { key: "strobe", name: "Strobe", category: "lighting", width: 0.5, depth: 0.2, height: 0.25, color: "#ffe9b0", baseY: 5 },
  { key: "follow-spot", name: "Follow Spot", category: "lighting", width: 0.6, depth: 1.2, height: 1.4, color: "#ffb454" },
  { key: "lighting-controller", name: "Lighting Controller", category: "lighting", width: 0.9, depth: 0.5, height: 0.15, color: "#e0913a" },

  // ------------------------------------------------------------ structure
  { key: "truss", name: "Truss", category: "structure", width: 6, depth: 0.3, height: 0.3, color: "#8b93a7", baseY: 6 },
  { key: "ground-support", name: "Ground Support", category: "structure", width: 0.6, depth: 0.6, height: 6, color: "#79808f" },
  { key: "stage-deck", name: "Stage Deck", category: "structure", width: 2, depth: 1, height: 0.2, color: "#535a68" },
  { key: "lighting-stand", name: "Lighting Stand", category: "structure", width: 0.8, depth: 0.8, height: 3, color: "#79808f" },
  { key: "goalpost-truss", name: "Goalpost Truss", category: "structure", width: 8, depth: 0.4, height: 6, color: "#8b93a7" },
  { key: "vertical-truss", name: "Vertical Truss", category: "structure", width: 0.4, depth: 0.4, height: 6, color: "#8b93a7" },

  // ------------------------------------------------------------ furniture
  { key: "lectern", name: "Lectern", category: "furniture", width: 0.7, depth: 0.5, height: 1.2, color: "#1f5f5b" },
  { key: "panel-chair", name: "Panel Chair", category: "furniture", width: 0.6, depth: 0.6, height: 0.9, color: "#2f6f6a" },
  { key: "coffee-table", name: "Coffee Table", category: "furniture", width: 0.9, depth: 0.5, height: 0.45, color: "#3b7a74" },
  { key: "sofa", name: "Sofa", category: "furniture", width: 1.8, depth: 0.8, height: 0.8, color: "#2f6f6a" },
];

export function equipmentByCategory(category: EquipmentCategory) {
  return EQUIPMENT_LIBRARY.filter((e) => e.category === category);
}

export function createEquipment(
  def: EquipmentDefinition,
  overrides: Partial<EquipmentItem> = {},
): EquipmentItem {
  return {
    id: uid("eq"),
    name: def.name,
    category: def.category,
    typeKey: def.key,
    width: def.width,
    depth: def.depth,
    height: def.height,
    position: { x: 0, y: def.baseY ?? 0, z: 0 },
    rotation: 0,
    quantity: 1,
    color: def.color,
    visible: true,
    locked: false,
    ...overrides,
  };
}
