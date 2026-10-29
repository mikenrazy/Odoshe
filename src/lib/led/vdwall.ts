import type { ProcessorModel, Project } from "./types";

/** LVP615 supplied manual, pp. 7, 10–11 and 27–31. These are video timings, not LED data ports. */
export const LVP615_TIMINGS = [[1024, 768], [1280, 1024], [1600, 1200], [1920, 1080], [1366, 768], [1440, 900], [2048, 1152], [2560, 816], [2304, 1152], [1920, 1200], [1200, 1600], [1080, 1920], [1536, 1536]] as const;
export function isLvp615(p: ProcessorModel | undefined) {
  return Boolean(p && p.brand?.toLowerCase() === "vdwall" && (p.modelKey === "vdwall" || /LVP615/i.test(p.label)));
}
export function senderReady(p: ProcessorModel | undefined) {
  return Boolean(p && (!isLvp615(p) || (p.senderModel?.trim() && p.outputs > 0 && (p.portMaxPixels ?? 0) > 0 && p.maxPixels > 0)));
}
export function lvp615Issues(project: Project, p: ProcessorModel): string[] {
  if (!isLvp615(p)) return [];
  const issues: string[] = [];
  if (!senderReady(p)) issues.push(`${p.outputs} sender LED RJ45 ports configured; sending-card model, pixels per port and total pixel capacity remain unconfirmed. LVP615 DVI OUT1/OUT2 mirror the same image; LAN is for control.`);
  const input = p.inputConnector ?? "HDMI";
  const maxW = input === "DVI" ? 2304 : input === "VGA" ? 2048 : 1920;
  const maxH = input === "DVI" || input === "VGA" ? 1152 : 1080;
  if ((p.inputWidth ?? 1920) > maxW || (p.inputHeight ?? 1080) > maxH) issues.push(`${input} source exceeds the manual's ${maxW} x ${maxH} at 60 Hz standard input limit; custom DVI EDID/timing requires hardware verification.`);
  const w = p.videoOutputWidth ?? 1920, h = p.videoOutputHeight ?? 1080;
  if (!LVP615_TIMINGS.some(([tw, th]) => tw === w && th === h)) issues.push("Select a documented 60 Hz output timing; custom timing bandwidth is not confirmed by width/height limits alone.");
  const screens = project.screens.filter((s) => s.processorId === p.id && s.visible !== false);
  if (screens.length) {
    if (senderReady(p)) {
      const totalPixels = screens.reduce((n, s) => n + s.pixelWidth * s.pixelHeight, 0);
      if (totalPixels > p.maxPixels) issues.push(`INVALID SENDER LOAD: ${totalPixels.toLocaleString()} LED pixels exceed the sending-card limit of ${p.maxPixels.toLocaleString()} pixels.`);
      for (const s of screens) {
        const count = Math.max(1, s.panelConfiguration.cols * s.panelConfiguration.rows);
        const cabinetPixels = s.pixelWidth * s.pixelHeight / count;
        if (cabinetPixels > (p.portMaxPixels ?? 0)) issues.push(`${s.name}: one cabinet requires ${cabinetPixels.toLocaleString()} pixels, exceeding the sender's ${(p.portMaxPixels ?? 0).toLocaleString()} pixels per port. A cabinet cannot be split between ports.`);
      }
      const required = screens.reduce((n, s) => { const count = Math.max(1, s.panelConfiguration.cols * s.panelConfiguration.rows); const px = s.pixelWidth * s.pixelHeight / count; const per = Math.max(1, Math.floor((p.portMaxPixels ?? 0) / Math.max(1, px))); return n + Math.ceil(count / per); }, 0);
      if (required > p.outputs) issues.push(`INVALID DATA PLAN: ${required} LED RJ45 ports required, but the sending card has only ${p.outputs}. Ports above P${p.outputs} do not exist; do not use this cable plan.`);
    }
    const x = Math.min(...screens.map((s) => s.content.x));
    const y = Math.min(...screens.map((s) => s.content.y));
    const shared = project.groups?.some((g) => g.mappingMode === "shared-input" && screens.some((s) => s.groupId === g.id));
    const width = shared ? screens.reduce((n, s) => n + s.pixelWidth, 0) : Math.max(...screens.map((s) => s.content.x - x + s.pixelWidth));
    const height = shared ? Math.max(...screens.map((s) => s.pixelHeight)) : Math.max(...screens.map((s) => s.content.y - y + s.pixelHeight));
    if (width > w || height > h) issues.push(`Native LED mapping ${width} x ${height} does not fit the selected DVI raster ${w} x ${h}. Choose a supported larger timing or revise the mapping; scaling the source does not add sender pixels.`);
    for (const s of screens) if (!s.cabinetKey && (!s.panelConfiguration.nativePixelWidth || !s.panelConfiguration.nativePixelHeight)) issues.push(`${s.name}: confirm cabinet dimensions and enter the supplier's native cabinet pixel width/height; P${s.pixelPitch} pitch maths alone is provisional.`);
  }
  return issues;
}