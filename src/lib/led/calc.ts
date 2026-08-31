import type { LedScreen, Project } from "./types";

export interface CabinetCalc {
  cols: number;
  rows: number;
  total: number;
  cabinetWidth: number;
  cabinetHeight: number;
  /** cabinet grid size in metres — may differ from the requested screen size */
  actualWidth: number;
  actualHeight: number;
  /** resolution implied by pixel pitch across the actual cabinet grid */
  nativePixelWidth: number;
  nativePixelHeight: number;
  area: number;
  aspect: number;
  aspectLabel: string;
  warnings: string[];
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export function aspectLabel(width: number, height: number) {
  if (!width || !height) return "—";
  const w = Math.round(width);
  const h = Math.round(height);
  const d = gcd(w, h) || 1;
  const rw = w / d;
  const rh = h / d;
  if (rw <= 64 && rh <= 64) return `${rw}:${rh}`;
  return `${(width / height).toFixed(2)}:1`;
}

/** Physical cabinet maths for one LED surface. Physical only — never pixels-from-metres. */
export function cabinetCalc(screen: LedScreen): CabinetCalc {
  const cabinetWidth = Math.max(0.01, screen.panelConfiguration.panelWidth);
  const cabinetHeight = Math.max(0.01, screen.panelConfiguration.panelHeight);
  const cols = Math.max(1, Math.round(screen.panelConfiguration.cols));
  const rows = Math.max(1, Math.round(screen.panelConfiguration.rows));

  const actualWidth = +(cols * cabinetWidth).toFixed(3);
  const actualHeight = +(rows * cabinetHeight).toFixed(3);

  const pitch = Math.max(0.1, screen.pixelPitch);
  const nativePixelWidth = Math.round((actualWidth * 1000) / pitch);
  const nativePixelHeight = Math.round((actualHeight * 1000) / pitch);

  const warnings: string[] = [];
  if (Math.abs(actualWidth - screen.physicalWidth) > 0.005) {
    warnings.push(
      `Cabinet grid is ${actualWidth.toFixed(2)} m wide but the screen is set to ${screen.physicalWidth.toFixed(2)} m.`,
    );
  }
  if (Math.abs(actualHeight - screen.physicalHeight) > 0.005) {
    warnings.push(
      `Cabinet grid is ${actualHeight.toFixed(2)} m high but the screen is set to ${screen.physicalHeight.toFixed(2)} m.`,
    );
  }
  if (Math.abs(nativePixelWidth - screen.pixelWidth) > 8) {
    warnings.push(
      `Pixel pitch implies ${nativePixelWidth} px across; the screen is configured at ${screen.pixelWidth} px.`,
    );
  }
  if (Math.abs(nativePixelHeight - screen.pixelHeight) > 8) {
    warnings.push(
      `Pixel pitch implies ${nativePixelHeight} px down; the screen is configured at ${screen.pixelHeight} px.`,
    );
  }

  return {
    cols,
    rows,
    total: cols * rows,
    cabinetWidth,
    cabinetHeight,
    actualWidth,
    actualHeight,
    nativePixelWidth,
    nativePixelHeight,
    area: +(actualWidth * actualHeight).toFixed(3),
    aspect: actualHeight > 0 ? actualWidth / actualHeight : 0,
    aspectLabel: aspectLabel(screen.pixelWidth, screen.pixelHeight),
    warnings,
  };
}

export interface ProjectSummary {
  totalLedArea: number;
  totalCabinets: number;
  totalPixels: number;
  screenCount: number;
  processorCount: number;
  processorOutputs: number;
  cameraCount: number;
  lightingCount: number;
  structureCount: number;
  furnitureCount: number;
  canvasPixels: number;
  canvasCoverage: number;
}

export function projectSummary(project: Project | null): ProjectSummary {
  const empty: ProjectSummary = {
    totalLedArea: 0,
    totalCabinets: 0,
    totalPixels: 0,
    screenCount: 0,
    processorCount: 0,
    processorOutputs: 0,
    cameraCount: 0,
    lightingCount: 0,
    structureCount: 0,
    furnitureCount: 0,
    canvasPixels: 0,
    canvasCoverage: 0,
  };
  if (!project) return empty;

  const usedProcessors = new Set(project.screens.map((s) => s.processorId));
  const outputs = new Set(project.screens.map((s) => `${s.processorId}:${s.processorOutput}`));

  const count = (fn: (q: number) => boolean, predicate: (typeKey: string, cat: string) => boolean) =>
    project.equipment.reduce(
      (sum, e) => (predicate(e.typeKey, e.category) && fn(e.quantity) ? sum + e.quantity : sum),
      0,
    );

  const totalLedArea = project.screens.reduce(
    (sum, s) => sum + cabinetCalc(s).area,
    0,
  );
  const totalCabinets = project.screens.reduce((sum, s) => sum + cabinetCalc(s).total, 0);
  const totalPixels = project.screens.reduce((sum, s) => sum + s.pixelWidth * s.pixelHeight, 0);
  const canvasPixels = project.canvas.width * project.canvas.height;

  return {
    totalLedArea: +totalLedArea.toFixed(2),
    totalCabinets,
    totalPixels,
    screenCount: project.screens.length,
    processorCount: usedProcessors.size,
    processorOutputs: outputs.size,
    cameraCount: count(
      () => true,
      (typeKey) => typeKey.includes("camera"),
    ),
    lightingCount: count(
      () => true,
      (_t, cat) => cat === "lighting",
    ),
    structureCount: count(
      () => true,
      (_t, cat) => cat === "structure",
    ),
    furnitureCount: count(
      () => true,
      (_t, cat) => cat === "furniture",
    ),
    canvasPixels,
    canvasCoverage: canvasPixels > 0 ? (totalPixels / canvasPixels) * 100 : 0,
  };
}
