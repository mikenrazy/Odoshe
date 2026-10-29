import type { Project } from "./types";
import { cabinetCalc } from "./calc";
import { computeGridNumbers } from "./grid-numbering";
import { globalLayout } from "./engineering";

/* ------------------------------------------------------------------ DXF */

/**
 * 1:1 front-elevation DXF (millimetres, R12 ASCII) — one rectangle per cabinet,
 * an outline per screen and the stage deck, on separate layers.
 */
export function buildDxf(project: Project): string {
  const out: string[] = ["0", "SECTION", "2", "HEADER", "9", "$INSUNITS", "70", "4", "0", "ENDSEC", "0", "SECTION", "2", "ENTITIES"];
  const mm = (m: number) => +(m * 1000).toFixed(1);
  const rect = (layer: string, x0: number, y0: number, x1: number, y1: number) => {
    out.push("0", "POLYLINE", "8", layer, "66", "1", "70", "1");
    for (const [x, y] of [[x0, y0], [x1, y0], [x1, y1], [x0, y1]] as const) out.push("0", "VERTEX", "8", layer, "10", String(mm(x)), "20", String(mm(y)));
    out.push("0", "SEQEND", "8", layer);
  };
  const text = (layer: string, x: number, y: number, h: number, t: string) =>
    out.push("0", "TEXT", "8", layer, "10", String(mm(x)), "20", String(mm(y)), "40", String(mm(h)), "1", t.replace(/[\r\n]/g, " "));

  const st = project.stage;
  rect("STAGE", -st.width / 2, 0, st.width / 2, st.height);
  for (const s of project.screens.filter((x) => x.visible !== false)) {
    const c = cabinetCalc(s);
    const left = s.position.x - c.actualWidth / 2, bottom = s.position.y - c.actualHeight / 2;
    rect("LED_OUTLINE", left, bottom, left + c.actualWidth, bottom + c.actualHeight);
    for (let r = 0; r < c.rows; r++) for (let col = 0; col < c.cols; col++)
      rect("LED_CABINETS", left + col * c.cabinetWidth, bottom + r * c.cabinetHeight, left + (col + 1) * c.cabinetWidth, bottom + (r + 1) * c.cabinetHeight);
    text("LABELS", left, bottom + c.actualHeight + 0.1, 0.15, `${s.name} ${c.cols}x${c.rows} P${s.pixelPitch} ${s.pixelWidth}x${s.pixelHeight}px`);
  }
  out.push("0", "ENDSEC", "0", "EOF");
  return out.join("\n");
}

/* ---------------------------------------------------- native pixel map */

/** Screen colour made vivid enough for a test card (pale/grey picks become saturated). */
export function vividColour(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const n = m ? parseInt(m[1]!, 16) : 0x1e88ff;
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  const l0 = (mx + mn) / 2, s0 = d ? d / (1 - Math.abs(2 * l0 - 1)) : 0;
  if (s0 < 0.15) return [30, 136, 255];
  const S = Math.max(s0, 0.85), L = Math.min(Math.max(l0, 0.45), 0.55);
  const C = (1 - Math.abs(2 * L - 1)) * S, X = C * (1 - Math.abs(((h / 60) % 2) - 1)), M0 = L - C / 2;
  const [a, bb, c] = h < 60 ? [C, X, 0] : h < 120 ? [X, C, 0] : h < 180 ? [0, C, X] : h < 240 ? [0, X, C] : h < 300 ? [X, 0, C] : [C, 0, X];
  return [Math.round((a + M0) * 255), Math.round((bb + M0) * 255), Math.round((c + M0) * 255)];
}
const hexToRgb = vividColour;

/** Draws the pixel map test card at the canvas' native resolution (browser only). */
export async function renderPixelMap(project: Project, logo?: string | null): Promise<HTMLCanvasElement> {
  const layout = globalLayout(project);
  const grids = computeGridNumbers(project);
  const cv = document.createElement("canvas");
  cv.width = Math.max(1, layout.canvasWidth); cv.height = Math.max(1, layout.canvasHeight);
  const g = cv.getContext("2d")!;
  g.fillStyle = "#000"; g.fillRect(0, 0, cv.width, cv.height);
  let img: HTMLImageElement | null = null;
  if (logo) img = await new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = logo; });
  for (const p of layout.placements) {
    const s = project.screens.find((x) => x.id === p.screenId)!;
    const [r0, g0, b0] = hexToRgb(s.color);
    const cw = p.width / p.cols, ch = p.height / p.rows;
    const start = grids.get(s.id)?.start ?? 1;
    for (let r = 0; r < p.rows; r++) for (let c = 0; c < p.cols; c++) {
      const f = (r + c) % 2 ? 0.72 : 1;
      g.fillStyle = `rgb(${r0 * f | 0},${g0 * f | 0},${b0 * f | 0})`;
      g.fillRect(p.x + c * cw, p.y + r * ch, Math.ceil(cw), Math.ceil(ch));
      g.fillStyle = "rgba(255,255,255,0.75)"; g.font = `600 ${Math.max(8, Math.min(cw, ch) * 0.22)}px sans-serif`;
      g.textAlign = "center"; g.textBaseline = "top";
      g.fillText(String(start + r * p.cols + c).padStart(2, "0"), p.x + (c + 0.5) * cw, p.y + r * ch + ch * 0.08);
    }
    g.save(); g.strokeStyle = "rgba(255,255,255,0.45)"; g.lineWidth = Math.max(1, p.height / 400);
    g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x + p.width, p.y + p.height); g.moveTo(p.x + p.width, p.y); g.lineTo(p.x, p.y + p.height);
    g.moveTo(p.x + p.width / 2, p.y); g.lineTo(p.x + p.width / 2, p.y + p.height); g.moveTo(p.x, p.y + p.height / 2); g.lineTo(p.x + p.width, p.y + p.height / 2); g.stroke();
    const R = Math.min(p.width, p.height) / 2;
    g.beginPath(); g.arc(p.x + p.width / 2, p.y + p.height / 2, R, 0, Math.PI * 2); g.stroke();
    g.setLineDash([R / 30, R / 30]); g.beginPath(); g.arc(p.x + p.width / 2, p.y + p.height / 2, R * 0.6, 0, Math.PI * 2); g.stroke();
    g.strokeRect(p.x + 0.5, p.y + 0.5, p.width - 1, p.height - 1); g.restore();
    let big = Math.min(p.width / 6, p.height / 4);
    g.font = `800 ${big}px sans-serif`;
    const nw = g.measureText(s.name.toUpperCase()).width;
    if (nw > p.width * 0.86) big *= (p.width * 0.86) / nw;
    g.fillStyle = "#fff"; g.font = `800 ${big}px sans-serif`; g.textAlign = "center"; g.textBaseline = "alphabetic";
    g.fillText(s.name.toUpperCase(), p.x + p.width / 2, p.y + p.height / 2 - big * 0.1);
    const pill = `W ${p.width} x H ${p.height}`; g.font = `700 ${big * 0.3}px sans-serif`;
    const pw = g.measureText(pill).width + big * 0.3;
    g.fillStyle = "#0a0a0a"; g.fillRect(p.x + p.width / 2 - pw / 2, p.y + p.height / 2 + big * 0.08, pw, big * 0.42);
    g.fillStyle = "#fff"; g.textBaseline = "middle"; g.fillText(pill, p.x + p.width / 2, p.y + p.height / 2 + big * 0.29);
    // area / pitch tags
    const c = cabinetCalc(s); const ts = Math.max(10, p.height / 18);
    g.font = `800 ${ts}px sans-serif`; g.textBaseline = "top"; g.textAlign = "left";
    const a = `${c.area.toFixed(0)} m²  ${+c.actualWidth.toFixed(2)} x ${+c.actualHeight.toFixed(2)} m`;
    g.fillStyle = "#0a0a0a"; g.fillRect(p.x + 2, p.y + 2, g.measureText(a).width + ts * 0.6, ts * 1.4);
    g.fillStyle = "#26de8c"; g.fillText(a, p.x + 2 + ts * 0.3, p.y + 2 + ts * 0.2);
    const t = `P${s.pixelPitch}  ${(c.cabinetWidth * 100).toFixed(0)} x ${(c.cabinetHeight * 100).toFixed(0)} cm`;
    const tw = g.measureText(t).width + ts * 0.6;
    g.fillStyle = "#26de8c"; g.fillRect(p.x + p.width - tw - 2, p.y + 2, tw, ts * 1.4);
    g.fillStyle = "#0a0a0a"; g.fillText(t, p.x + p.width - tw - 2 + ts * 0.3, p.y + 2 + ts * 0.2);
  }
  return cv;
}

function save(blob: Blob, name: string) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
const base = (p: Project) => p.name.replace(/[^\w\- ]+/g, "").trim() || "project";

export async function downloadPixelMapPng(project: Project, logo?: string | null) {
  const cv = await renderPixelMap(project, logo);
  const blob = await new Promise<Blob | null>((r) => cv.toBlob(r, "image/png"));
  if (!blob) throw new Error("render failed");
  save(blob, `${base(project)}-pixel-map-${cv.width}x${cv.height}.png`);
}

export function downloadDxf(project: Project) {
  save(new Blob([buildDxf(project)], { type: "application/dxf" }), `${base(project)}-front-elevation.dxf`);
}
