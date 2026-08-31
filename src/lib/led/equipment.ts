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
  /** true when a purpose-built 3D model exists (vs a generic placeholder block) */
  realistic?: boolean;
  /** short spec / manufacturer note shown in the asset library */
  spec?: string;
}

export const EQUIPMENT_LIBRARY: EquipmentDefinition[] = [
  // ---------------------------------------------------------------- video
  { key: "camera", realistic: true, name: "Camera", category: "video", width: 0.3, depth: 0.6, height: 0.3, color: "#4c7cff" },
  { key: "tripod", realistic: true, name: "Tripod", category: "video", width: 0.8, depth: 0.8, height: 1.4, color: "#3d5db3" },
  { key: "ptz-camera", realistic: true, name: "PTZ Camera", category: "video", width: 0.25, depth: 0.25, height: 0.3, color: "#4c7cff" },
  { key: "video-switcher", realistic: true, name: "Video Switcher", category: "video", width: 0.6, depth: 0.4, height: 0.12, color: "#5a6caf" },
  { key: "atem", realistic: true, name: "ATEM", category: "video", width: 0.5, depth: 0.35, height: 0.1, color: "#5a6caf" },
  { key: "vmix", name: "vMix Workstation", category: "video", width: 0.7, depth: 0.6, height: 0.9, color: "#3f4f8a" },
  { key: "playback-pc", name: "Playback Computer", category: "video", width: 0.6, depth: 0.6, height: 0.9, color: "#3f4f8a" },
  { key: "capture-card", name: "Capture Card", category: "video", width: 0.2, depth: 0.15, height: 0.05, color: "#5a6caf" },
  { key: "confidence-monitor", realistic: true, name: "Confidence Monitor", category: "video", width: 1.2, depth: 0.12, height: 0.75, color: "#6fa8ff" },

  // ----------------------------------------------------------- LED / video
  { key: "novastar-vx1000", realistic: true, name: "NovaStar VX1000", category: "led", width: 0.48, depth: 0.4, height: 0.09, color: "#7fd4ff" },
  { key: "novastar-vx600", realistic: true, name: "NovaStar VX600", category: "led", width: 0.48, depth: 0.4, height: 0.09, color: "#7fd4ff" },
  { key: "led-processor", realistic: true, name: "LED Processor", category: "led", width: 0.48, depth: 0.4, height: 0.09, color: "#69bede" },
  { key: "media-server", realistic: true, name: "Media Server", category: "led", width: 0.5, depth: 0.7, height: 0.18, color: "#58a6c9" },
  { key: "video-distribution", name: "Video Distribution System", category: "led", width: 0.48, depth: 0.4, height: 0.13, color: "#58a6c9" },

  // ------------------------------------------------------------- lighting
  { key: "moving-head", realistic: true, name: "Moving Head", category: "lighting", width: 0.35, depth: 0.35, height: 0.6, color: "#ffb454", baseY: 5 },
  { key: "profile", realistic: true, name: "Profile", category: "lighting", width: 0.3, depth: 0.6, height: 0.35, color: "#ffc978", baseY: 5 },
  { key: "wash", realistic: true, name: "Wash", category: "lighting", width: 0.3, depth: 0.4, height: 0.4, color: "#ffcf90", baseY: 5 },
  { key: "fresnel", realistic: true, name: "Fresnel", category: "lighting", width: 0.3, depth: 0.4, height: 0.4, color: "#ffd9a6", baseY: 5 },
  { key: "led-bar", realistic: true, name: "LED Bar", category: "lighting", width: 1.0, depth: 0.12, height: 0.12, color: "#ff9d2e", baseY: 0 },
  { key: "strobe", realistic: true, name: "Strobe", category: "lighting", width: 0.5, depth: 0.2, height: 0.25, color: "#ffe9b0", baseY: 5 },
  { key: "follow-spot", realistic: true, name: "Follow Spot", category: "lighting", width: 0.6, depth: 1.2, height: 1.4, color: "#ffb454" },
  { key: "lighting-controller", name: "Lighting Controller", category: "lighting", width: 0.9, depth: 0.5, height: 0.15, color: "#e0913a" },

  // ------------------------------------------------------------ structure
  { key: "truss", realistic: true, name: "Truss", category: "structure", width: 6, depth: 0.3, height: 0.3, color: "#8b93a7", baseY: 6 },
  { key: "ground-support", realistic: true, name: "Ground Support", category: "structure", width: 0.6, depth: 0.6, height: 6, color: "#79808f" },
  { key: "stage-deck", realistic: true, name: "Stage Deck", category: "structure", width: 2, depth: 1, height: 0.2, color: "#535a68" },
  { key: "lighting-stand", realistic: true, name: "Lighting Stand", category: "structure", width: 0.8, depth: 0.8, height: 3, color: "#79808f" },
  { key: "goalpost-truss", realistic: true, name: "Goalpost Truss", category: "structure", width: 8, depth: 0.4, height: 6, color: "#8b93a7" },
  { key: "vertical-truss", realistic: true, name: "Vertical Truss", category: "structure", width: 0.4, depth: 0.4, height: 6, color: "#8b93a7" },

  // ------------------------------------------------------------ furniture
  { key: "lectern", realistic: true, name: "Lectern", category: "furniture", width: 0.7, depth: 0.5, height: 1.2, color: "#1f5f5b" },
  { key: "panel-chair", realistic: true, name: "Panel Chair", category: "furniture", width: 0.6, depth: 0.6, height: 0.9, color: "#2f6f6a" },
  { key: "coffee-table", realistic: true, name: "Coffee Table", category: "furniture", width: 0.9, depth: 0.5, height: 0.45, color: "#3b7a74" },
  { key: "sofa", realistic: true, name: "Sofa", category: "furniture", width: 1.8, depth: 0.8, height: 0.8, color: "#2f6f6a" },

  // -------------------------------------------------------------- seating
  { key: "conference-chair", name: "Conference Chair", category: "seating", realistic: true, width: 0.5, depth: 0.55, height: 0.85, color: "#2f6f6a", spec: "Stackable conference" },
  { key: "banquet-chair", name: "Banquet Chair", category: "seating", realistic: true, width: 0.45, depth: 0.5, height: 0.92, color: "#8a6f3c", spec: "Chiavari style" },
  { key: "executive-chair", name: "Executive Chair", category: "seating", realistic: true, width: 0.62, depth: 0.65, height: 1.12, color: "#22262e", spec: "High-back swivel" },
  { key: "vip-chair", name: "VIP Chair", category: "seating", realistic: true, width: 0.7, depth: 0.72, height: 0.95, color: "#5b2b3c", spec: "Upholstered armchair" },
  { key: "bar-stool", name: "Bar Stool", category: "seating", realistic: true, width: 0.4, depth: 0.4, height: 1.05, color: "#3a3f4a", spec: "Counter height" },
  { key: "auditorium-chair", name: "Auditorium Chair", category: "seating", realistic: true, width: 0.55, depth: 0.6, height: 1.0, color: "#3b2f46", spec: "Fixed tip-up seat" },
  { key: "folding-chair", name: "Folding Chair", category: "seating", realistic: true, width: 0.45, depth: 0.48, height: 0.86, color: "#4a5160", spec: "Steel folding" },

  // --------------------------------------------------------------- people
  { key: "person-speaker", name: "Speaker", category: "people", realistic: true, width: 0.5, depth: 0.35, height: 1.78, color: "#c9a27a", spec: "Standing at lectern" },
  { key: "person-presenter", name: "Presenter", category: "people", realistic: true, width: 0.5, depth: 0.35, height: 1.75, color: "#d8b28c", spec: "Standing, gesturing" },
  { key: "person-panelist", name: "Panelist (seated)", category: "people", realistic: true, width: 0.55, depth: 0.6, height: 1.3, color: "#b98a63", spec: "Seated pose" },
  { key: "person-mc", name: "MC", category: "people", realistic: true, width: 0.5, depth: 0.35, height: 1.76, color: "#a9754f", spec: "Standing, mic" },
  { key: "person-audience", name: "Audience Member", category: "people", realistic: true, width: 0.55, depth: 0.6, height: 1.28, color: "#8f6a4c", spec: "Seated pose" },
  { key: "person-camera-op", name: "Camera Operator", category: "people", realistic: true, width: 0.6, depth: 0.5, height: 1.75, color: "#5c6270", spec: "Operating camera" },
  { key: "person-technician", name: "Technician", category: "people", realistic: true, width: 0.55, depth: 0.4, height: 1.74, color: "#4d5462", spec: "Standing, walking" },
  { key: "person-staff", name: "Event Staff", category: "people", realistic: true, width: 0.5, depth: 0.35, height: 1.72, color: "#6a7180", spec: "Standing" },

  // ------------------------------------------------------- stage furniture
  { key: "panel-table", name: "Panel Table", category: "furniture", realistic: true, width: 2.4, depth: 0.8, height: 0.75, color: "#2c3340", spec: "Skirted panel table" },
  { key: "high-table", name: "High Table", category: "furniture", realistic: true, width: 0.7, depth: 0.7, height: 1.1, color: "#2c3340" },
  { key: "side-table", name: "Side Table", category: "furniture", realistic: true, width: 0.5, depth: 0.5, height: 0.55, color: "#3b7a74" },
  { key: "lounge-chair", name: "Lounge Chair", category: "furniture", realistic: true, width: 0.85, depth: 0.85, height: 0.8, color: "#41505f" },
  { key: "podium", name: "Podium", category: "furniture", realistic: true, width: 0.75, depth: 0.55, height: 1.2, color: "#1f5f5b" },
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
