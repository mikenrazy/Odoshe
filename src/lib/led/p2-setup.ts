import type { Project } from "./types";
import { isLvp615 } from "./vdwall";
import { withDerivedResolution } from "./resolution";
import { configureScreenSet } from "./screen-set";

/** Apply measured P2 cabinets; port count is not a pixel-capacity rating. */
export function configureP2Lvp615(project: Project, screenId: string): Project {
  const screen = project.screens.find((s) => s.id === screenId);
  const processor = project.processors.find((p) => p.id === screen?.processorId);
  if (!screen || !processor || !isLvp615(processor)) return project;
  const panel = screen.panelConfiguration;
  const cols = panel.manual ? panel.cols : Math.max(1, Math.round(screen.physicalWidth / 0.56));
  const rows = panel.manual ? panel.rows : Math.max(1, Math.round(screen.physicalHeight / 0.56));
  const sameSize = panel.panelWidth === 0.56 && panel.panelHeight === 0.56;
  const nextScreen = withDerivedResolution({
    ...screen,
    cabinetKey: undefined,
    pixelPitch: 2,
    resolutionOverride: false,
    physicalWidth: Number((cols * 0.56).toFixed(4)),
    physicalHeight: Number((rows * 0.56).toFixed(4)),
    panelConfiguration: {
      ...panel, sizeKey: "0.56x0.56", panelWidth: 0.56, panelHeight: 0.56, cols, rows,
      nativePixelWidth: sameSize ? panel.nativePixelWidth : undefined,
      nativePixelHeight: sameSize ? panel.nativePixelHeight : undefined,
    },
  });
  const next = {
    ...project,
    processors: project.processors.map((p) => p.id === processor.id ? { ...p, outputs: 2, senderPortsConfirmed: true } : p),
    screens: project.screens.map((s) => s.id === screenId ? nextScreen : s),
  };
  const shared = project.groups?.find((g) => g.id === screen.groupId && g.mappingMode === "shared-input");
  return shared ? configureScreenSet(next, shared.id) : next;
}