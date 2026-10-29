import type { jsPDF as JsPDF } from "jspdf";
import type { LedScreen, Project } from "./types";
import { cabinetCalc } from "./calc";
import { chainCableM, globalLayout, powerSettings, screenChains, screenPower } from "./engineering";
import { getAsset } from "./asset-store";
import { screenPaint, vividColour } from "./pixel-map-export";
let PAINT = new Map<string, [number, number, number]>();

const W = 297, H = 210;
type C3 = [number, number, number];
const BG: C3 = [17, 17, 17];
const PANEL: C3 = [20, 25, 34];
const CARD: C3 = [14, 18, 25];
const LINE: C3 = [44, 52, 64];
const TEXT: C3 = [236, 238, 242];
const MUTED: C3 = [150, 156, 166];
const GREEN: C3 = [38, 222, 140];
const AMBER: C3 = [245, 190, 40];
const PALETTE: C3[] = [[38, 222, 140], [24, 196, 240], [245, 180, 30], [190, 110, 250], [250, 110, 160], [255, 140, 60], [45, 212, 191], [248, 113, 113], [132, 204, 22], [96, 165, 250]];

function rgb(hex: string): C3 {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [30, 136, 255];
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const shade = (c: C3, f: number): C3 => c.map((v) => Math.max(0, Math.min(255, Math.round(v * f)))) as C3;
const mix = (a: C3, b: C3, t: number): C3 => a.map((v, i) => Math.round(v * (1 - t) + b[i]! * t)) as C3;

let LOGO: string | null = null;
function logo(doc: JsPDF, x: number, y: number, w: number, h: number) {
  if (!LOGO) return;
  try { const p = doc.getImageProperties(LOGO); const f = fit(p.width, p.height, x, y, w, h); doc.addImage(LOGO, p.fileType, f.x, f.y, p.width * f.s, p.height * f.s); } catch { /* unreadable */ }
}
function footer(doc: JsPDF) {
  doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(90, 94, 100);
  doc.text("dx5ve studio", W - 12, H - 7, { align: "right" });
}

/** Plain report page: title top-left, rule, logo top-right. */
function page(doc: JsPDF, title: string, sub: string, _project: Project, first = false) {
  if (!first) doc.addPage("a4", "landscape");
  doc.setFillColor(...BG); doc.rect(0, 0, W, H, "F");
  doc.setTextColor(...TEXT); doc.setFont("helvetica", "normal"); doc.setFontSize(18);
  doc.text(title, 15, 22);
  if (sub) { doc.setFontSize(7); doc.setTextColor(...MUTED); doc.text(sub, 15, 26.5); }
  doc.setDrawColor(70, 72, 76); doc.setLineWidth(0.3); doc.line(15, 28.5, W - 15, 28.5);
  logo(doc, W - 50, 11, 35, 13);
  footer(doc);
}

function sectionTitle(doc: JsPDF, x: number, y: number, t: string) {
  doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...TEXT); doc.text(t, x, y);
  doc.setFillColor(...GREEN); doc.rect(x, y + 3, 60, 0.9, "F");
}

function table(doc: JsPDF, x: number, y: number, cols: Array<{ h: string; w: number }>, rows: string[][], rowH = 5.2) {
  const tw = cols.reduce((n, c) => n + c.w, 0);
  doc.setFillColor(...PANEL); doc.rect(x, y, tw, rowH, "F");
  doc.setFontSize(6.5); doc.setFont("helvetica", "bold"); doc.setTextColor(...GREEN);
  let cx = x; for (const c of cols) { doc.text(c.h, cx + 1.5, y + 3.6); cx += c.w; }
  doc.setFont("helvetica", "normal"); doc.setTextColor(...TEXT);
  rows.forEach((r, i) => {
    const ry = y + rowH * (i + 1);
    if (i % 2) { doc.setFillColor(24, 26, 30); doc.rect(x, ry, tw, rowH, "F"); }
    let rx = x; r.forEach((v, j) => { doc.text(doc.splitTextToSize(v, cols[j]!.w - 2)[0] ?? "", rx + 1.5, ry + 3.6); rx += cols[j]!.w; });
  });
  return y + rowH * (rows.length + 1);
}

/** Two-column "label  value" grid in the sample's Screen Details style. */
function details(doc: JsPDF, x: number, y: number, pairs: Array<[string, string]>, colW = 68, valColour?: (i: number) => C3 | undefined) {
  doc.setFontSize(9);
  pairs.forEach(([k, v], i) => {
    const cx = x + Math.floor(i / 4) * (colW * 2), cy = y + (i % 4) * 8;
    doc.setFont("helvetica", "bold"); doc.setTextColor(...MUTED); doc.text(k, cx, cy);
    doc.setTextColor(...(valColour?.(i) ?? TEXT)); doc.text(v, cx + colW * 0.82, cy);
  });
  doc.setFont("helvetica", "normal");
}

function arrowHead(doc: JsPDF, x: number, y: number, dir: "l" | "r" | "u" | "d") {
  const a = 1.6, b = 0.9;
  const pts: Record<string, number[]> = { l: [x, y, x + a, y - b, x + a, y + b], r: [x, y, x - a, y - b, x - a, y + b], u: [x, y, x - b, y + a, x + b, y + a], d: [x, y, x - b, y - a, x + b, y - a] };
  const p = pts[dir]!; doc.triangle(p[0]!, p[1]!, p[2]!, p[3]!, p[4]!, p[5]!, "F");
}
function dimH(doc: JsPDF, x0: number, x1: number, y: number, label: string) {
  doc.setDrawColor(...GREEN); doc.setFillColor(...GREEN); doc.setLineWidth(0.3);
  doc.setFont("helvetica", "bold"); doc.setFontSize(8);
  const tw = doc.getTextWidth(label) + 3, mid = (x0 + x1) / 2;
  doc.line(x0, y, mid - tw / 2, y); doc.line(mid + tw / 2, y, x1, y);
  arrowHead(doc, x0, y, "l"); arrowHead(doc, x1, y, "r");
  doc.setTextColor(...GREEN); doc.text(label, mid, y + 1.1, { align: "center" });
  doc.setFont("helvetica", "normal");
}
function dimV(doc: JsPDF, x: number, y0: number, y1: number, label: string) {
  doc.setDrawColor(...GREEN); doc.setFillColor(...GREEN); doc.setLineWidth(0.3);
  const mid = (y0 + y1) / 2;
  doc.line(x, y0, x, mid - 3); doc.line(x, mid + 3, x, y1);
  arrowHead(doc, x, y0, "u"); arrowHead(doc, x, y1, "d");
  doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...GREEN);
  doc.text(label, x, mid + 1.1, { align: "center" });
  doc.setFont("helvetica", "normal");
}

/** Fits a w×h box into an area; returns origin and scale. */
function fit(w: number, h: number, ax: number, ay: number, aw: number, ah: number) {
  const s = Math.min(aw / w, ah / h);
  return { x: ax + (aw - w * s) / 2, y: ay + (ah - h * s) / 2, s };
}

function withOpacity(doc: JsPDF, o: number, fn: () => void) {
  const d = doc as unknown as { GState?: new (o: object) => unknown; setGState?: (g: unknown) => void };
  if (d.GState && d.setGState) { d.setGState(new d.GState({ opacity: o, "stroke-opacity": o })); fn(); d.setGState(new d.GState({ opacity: 1, "stroke-opacity": 1 })); }
  else fn();
}

function badge(doc: JsPDF, x: number, y: number, big: string, small: string, bg: C3, fg: C3, align: "l" | "r", size: number) {
  doc.setFont("helvetica", "bold"); doc.setFontSize(size);
  const bw = doc.getTextWidth(big); doc.setFontSize(size * 0.55); const sw = doc.getTextWidth(small);
  const w = bw + sw + 3.5, h = size * 0.5;
  const bx = align === "l" ? x : x - w;
  doc.setFillColor(...bg); doc.rect(bx, y, w, h, "F");
  doc.setTextColor(...fg); doc.setFontSize(size); doc.text(big, bx + 1, y + h * 0.75);
  doc.setFontSize(size * 0.55); doc.text(small, bx + bw + 2.3, y + h * 0.72);
  doc.setFont("helvetica", "normal");
}

/** Sample-style pixel map: checkerboard, numbers, test-card circles, name + resolution pill. */
function pixelMap(doc: JsPDF, screen: LedScreen, x: number, y: number, w: number, h: number, gridStart: number, opts: { badges?: boolean; logo?: boolean } = {}) {
  const c = cabinetCalc(screen);
  const base = PAINT.get(screen.id) ?? vividColour(screen.color);
  const cw = w / c.cols, ch = h / c.rows;
  for (let r = 0; r < c.rows; r++) for (let col = 0; col < c.cols; col++) {
    doc.setFillColor(...((r + col) % 2 ? shade(base, 0.72) : base));
    doc.rect(x + col * cw, y + r * ch, cw, ch, "F");
  }
  if (cw > 3.5) {
    doc.setFontSize(Math.min(9, cw * 0.55)); doc.setTextColor(...mix(base, [255, 255, 255], 0.75));
    for (let r = 0; r < c.rows; r++) for (let col = 0; col < c.cols; col++)
      doc.text(String(gridStart + r * c.cols + col).padStart(2, "0"), x + col * cw + cw / 2, y + r * ch + Math.min(ch / 2, 6) + 1, { align: "center" });
  }
  withOpacity(doc, 0.45, () => {
    doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.15);
    doc.line(x, y, x + w, y + h); doc.line(x + w, y, x, y + h);
    doc.line(x + w / 2, y, x + w / 2, y + h); doc.line(x, y + h / 2, x + w, y + h / 2);
    const R = Math.min(w, h) * 0.5;
    doc.circle(x + w / 2, y + h / 2, R, "S");
    doc.setLineDashPattern([0.8, 0.8], 0);
    doc.circle(x + w / 2, y + h / 2, R * 0.6, "S");
    if (w > h * 2.8) { doc.circle(x + w * 0.18, y + h / 2, R, "S"); doc.circle(x + w * 0.82, y + h / 2, R, "S"); }
    doc.rect(x, y, w, h, "S");
    doc.setLineDashPattern([], 0);
  });
  const big = Math.min(26, w / 6, h / 2.4);
  doc.setFont("helvetica", "bold"); doc.setFontSize(big); doc.setTextColor(255, 255, 255);
  doc.text(screen.name.toUpperCase(), x + w / 2, y + h / 2 - big * 0.12, { align: "center" });
  const pill = `W ${screen.pixelWidth} x H ${screen.pixelHeight}`;
  const ps = Math.max(3, big * 0.32); doc.setFontSize(ps);
  const pw = doc.getTextWidth(pill) + 3;
  doc.setFillColor(10, 10, 10); doc.roundedRect(x + w / 2 - pw / 2, y + h / 2 + big * 0.08, pw, ps * 0.55, 0.8, 0.8, "F");
  doc.setTextColor(255, 255, 255); doc.text(pill, x + w / 2, y + h / 2 + big * 0.08 + ps * 0.41, { align: "center" });
  if (opts.logo) logo(doc, x + w / 2 - big * 1.2, y + h / 2 + big * 0.35, big * 2.4, big * 0.9);
  doc.setFont("helvetica", "normal");
  if (opts.badges !== false) {
    const bs = Math.max(2.5, Math.min(9, h / 7, w / 9));
    badge(doc, x + 0.5, y + 0.5, `${c.area.toFixed(0)} m²`, `${+c.actualWidth.toFixed(2)} x ${+c.actualHeight.toFixed(2)} m`, [10, 10, 10], GREEN, "l", bs);
    badge(doc, x + w - 0.5, y + 0.5, `P${screen.pixelPitch}`, `${(c.cabinetWidth * 100).toFixed(0)} x ${(c.cabinetHeight * 100).toFixed(0)} cm`, GREEN, [10, 10, 10], "r", bs);
  }
}

/* ---------- engineering sheet (data / power) ---------- */

function sheetFrame(doc: JsPDF, s: LedScreen, kind: "data" | "power", subtitle: string, project: Project, powerV = 230) {
  doc.addPage("a4", "landscape");
  doc.setFillColor(...BG); doc.rect(0, 0, W, H, "F");
  const c = cabinetCalc(s);
  const tag = kind === "data" ? GREEN : AMBER;
  doc.setFillColor(...CARD); doc.setDrawColor(...shade(GREEN, 0.5)); doc.setLineWidth(0.3);
  doc.roundedRect(10, 10, W - 20, 25, 1.5, 1.5, "FD");
  doc.setFillColor(...tag); doc.rect(10, 10, 1.2, 25, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(5.5); doc.setTextColor(...MUTED);
  doc.text("TARGET LED DISPLAY // SCREEN ID", 15, 15.5);
  doc.setFontSize(20); doc.setTextColor(255, 255, 255); doc.text(s.name.toUpperCase(), 15, 25);
  const nw = doc.getTextWidth(s.name.toUpperCase());
  const tl = kind === "data" ? "DATA / CAT6 RJ45" : `POWER / ${powerV}V AC`;
  doc.setFontSize(6.5); const tw = doc.getTextWidth(tl) + 5;
  doc.setFillColor(...tag); doc.roundedRect(18 + nw, 19.3, tw, 6, 0.8, 0.8, "F");
  doc.setTextColor(10, 10, 10); doc.text(tl, 20.5 + nw, 23.4);
  doc.setFontSize(5.5); doc.setTextColor(...MUTED); doc.text(subtitle, 15, 31);
  const stats: Array<[string, string, string, C3]> = [
    ["CABINET MATRIX", `${c.cols} x ${c.rows}`, `${c.total} Active Panels`, TEXT],
    ["PHYSICAL SIZE", `${+c.actualWidth.toFixed(2)} x ${+c.actualHeight.toFixed(2)} m`, `Area: ${c.area.toFixed(2)} m²`, GREEN],
    ["CABINET / PITCH", `P${s.pixelPitch}`, `${(c.cabinetWidth * 100).toFixed(0)}x${(c.cabinetHeight * 100).toFixed(0)} cm (${Math.round(s.pixelWidth / c.cols)}x${Math.round(s.pixelHeight / c.rows)}px)`, [24, 196, 240]],
    ["GEOMETRY / RES.", s.type === "curved" ? "CURVED" : "FLAT (0°)", `${s.pixelWidth} x ${s.pixelHeight} px`, TEXT],
  ];
  stats.forEach(([k, v, sub2, col], i) => {
    const bx = 157 + i * 32.5;
    doc.setFillColor(...PANEL); doc.setDrawColor(...LINE); doc.roundedRect(bx, 13, 30.5, 19, 1, 1, "FD");
    doc.setFont("helvetica", "bold"); doc.setFontSize(4.6); doc.setTextColor(...MUTED); doc.text(k, bx + 2, 17.5);
    doc.setFontSize(9); doc.setTextColor(...col); doc.text(v, bx + 2, 24);
    doc.setFont("courier", "normal"); doc.setFontSize(4.5); doc.setTextColor(...MUTED); doc.text(doc.splitTextToSize(sub2, 28)[0] ?? "", bx + 2, 29);
  });
  // drawing + summary panels
  doc.setFillColor(...CARD); doc.setDrawColor(...LINE);
  doc.roundedRect(10, 38, 204, 152, 1.5, 1.5, "FD");
  doc.roundedRect(217, 38, 70, 152, 1.5, 1.5, "FD");
  doc.setFont("courier", "bold"); doc.setFontSize(5.5); doc.setTextColor(...MUTED);
  doc.text(`PROJECT: ${project.name.toUpperCase()}   ·   DISPLAY: ${s.name.toUpperCase()}   ·   ${kind === "data" ? "CAT6 SIGNAL WIRING DIAGRAM" : "POWERCON ELECTRICAL DISTRIBUTION"}`, 12, 196);
  footer(doc);
  doc.setFont("helvetica", "normal");
}

interface Run { label: string; colour: C3; path: Array<[number, number]>; tag: string; feed?: string }

function wiringDrawing(doc: JsPDF, s: LedScreen, runs: Run[], prefix: string) {
  const c = cabinetCalc(s);
  doc.setFont("helvetica", "bold"); doc.setFontSize(6); doc.setTextColor(...GREEN);
  doc.text(`FRONT ASSEMBLY VIEW — COLUMNS C1 TO C${c.cols}  ·  ROWS R1 TO R${c.rows}`, 14, 45);
  // legend chips (right aligned)
  let lx = 211;
  doc.setFont("courier", "bold"); doc.setFontSize(5);
  for (const r of [...runs].reverse().slice(0, 8)) {
    const tw = doc.getTextWidth(r.tag) + 5; lx -= tw + 1.5;
    if (lx < 70) break;
    doc.setDrawColor(...r.colour); doc.setFillColor(...CARD); doc.roundedRect(lx, 41.5, tw, 5, 0.6, 0.6, "FD");
    doc.setFillColor(...r.colour); doc.rect(lx + 1, 43, 1.6, 2, "F");
    doc.setTextColor(...TEXT); doc.text(r.tag, lx + 3.6, 45.1);
  }
  doc.setDrawColor(...LINE); doc.line(10, 49, 214, 49);
  const f = fit(c.actualWidth, c.actualHeight, 26, 64, 180, 108);
  const w = c.actualWidth * f.s, h = c.actualHeight * f.s, cw = w / c.cols, ch = h / c.rows;
  const owner = new Map<string, number>();
  runs.forEach((r, i) => r.path.forEach(([a, b]) => owner.set(`${a},${b}`, i)));
  for (let r = 0; r < c.rows; r++) for (let col = 0; col < c.cols; col++) {
    const o = owner.get(`${col},${r}`); const pc = o === undefined ? MUTED : runs[o]!.colour;
    doc.setFillColor(...mix(CARD, pc, 0.18)); doc.setDrawColor(...mix(CARD, pc, 0.55)); doc.setLineWidth(0.25);
    doc.rect(f.x + col * cw, f.y + r * ch, cw, ch, "FD");
  }
  doc.setFont("helvetica", "normal"); doc.setFontSize(Math.min(5.5, cw * 0.6)); doc.setTextColor(...MUTED);
  for (let col = 0; col < c.cols; col++) doc.text(`C${col + 1}`, f.x + (col + 0.5) * cw, f.y - 2, { align: "center" });
  for (let r = 0; r < c.rows; r++) doc.text(`R${r + 1}`, f.x - 4, f.y + (r + 0.5) * ch + 1, { align: "center" });
  dimH(doc, f.x, f.x + w, f.y - 8, `${c.actualWidth.toFixed(2)} m  (${c.cols} Columns · ${s.pixelWidth} px)`);
  dimV(doc, f.x - 11, f.y, f.y + h, `${c.actualHeight.toFixed(2)}m`);
  const cx = (a: number) => f.x + (a + 0.5) * cw, cy = (b: number) => f.y + (b + 0.5) * ch;
  const box = Math.min(2.6, cw * 0.32, ch * 0.32);
  runs.forEach((run, ri) => {
    doc.setDrawColor(...run.colour); doc.setLineWidth(Math.min(0.7, cw * 0.06));
    for (let k = 1; k < run.path.length; k++) { const [a, b] = run.path[k - 1]!, [x2, y2] = run.path[k]!; doc.line(cx(a), cy(b), cx(x2), cy(y2)); }
    if (box > 1.2) {
      doc.setFont("helvetica", "bold"); doc.setFontSize(box * 1.9);
      run.path.forEach(([a, b], k) => {
        if (k === 0 || k === run.path.length - 1) return;
        doc.setFillColor(8, 8, 8); doc.setDrawColor(...run.colour); doc.setLineWidth(0.15);
        doc.rect(cx(a) - box / 2, cy(b) - box / 2, box, box, "FD");
        doc.setTextColor(255, 255, 255); doc.text(String(k + 1), cx(a), cy(b) + box * 0.3, { align: "center" });
      });
    }
    const [ea, eb] = run.path[run.path.length - 1]!;
    if (run.path.length > 1) { doc.setFillColor(8, 8, 8); doc.setDrawColor(...run.colour); doc.setLineWidth(0.35); doc.circle(cx(ea), cy(eb), Math.max(0.8, box * 0.55), "FD"); }
    const [sa, sb] = run.path[0]!;
    doc.setFont("courier", "bold"); doc.setFontSize(Math.max(3.5, Math.min(5.5, cw * 0.5)));
    const lab = `${run.label} IN`; const lw = doc.getTextWidth(lab) + 2;
    doc.setFillColor(...run.colour); doc.roundedRect(cx(sa) - lw / 2, cy(sb) - 2, lw, 4, 0.5, 0.5, "F");
    doc.setTextColor(10, 10, 10); doc.text(lab, cx(sa), cy(sb) + 0.8, { align: "center" });
    // bottom input tag
    const t = `${run.label}${run.feed ? ` [${run.feed}]` : " IN"} (C${sa + 1}·R${sb + 1})`; doc.setFontSize(4.6); const tw = doc.getTextWidth(t) + 3;
    const ty = f.y + h + 4 + (ri % 2) * 6;
    doc.setDrawColor(...run.colour); doc.setLineWidth(0.25); doc.line(cx(sa), f.y + h, cx(sa), ty);
    doc.setFillColor(...CARD); doc.roundedRect(cx(sa) - tw / 2, ty, tw, 4, 0.5, 0.5, "FD");
    doc.setTextColor(...run.colour); doc.text(t, cx(sa), ty + 2.8, { align: "center" });
  });
  doc.setFont("courier", "bold"); doc.setFontSize(5); doc.setTextColor(...MUTED);
  doc.text(`LEGEND:  [${prefix}n IN] = Line Start (Input)   ·   [ # ] = Cabinet Sequence   ·   ( o ) = Line End`, 14, 185);
  doc.setFont("helvetica", "normal");
}

function summaryCard(doc: JsPDF, title: string, heading: string, tint: C3, stats: Array<[string, string]>, head: string[], rows: Array<{ colour: C3; cells: string[]; pct?: number }>) {
  doc.setFillColor(...mix(CARD, tint, 0.18)); doc.setDrawColor(...mix(CARD, tint, 0.45)); doc.roundedRect(220, 41, 64, 16, 1, 1, "FD");
  doc.setFont("helvetica", "bold"); doc.setFontSize(5); doc.setTextColor(...tint); doc.text(title, 222.5, 46);
  doc.setFontSize(10); doc.setTextColor(255, 255, 255); doc.text(heading, 222.5, 53.5);
  let y = 63;
  doc.setFontSize(5.2);
  for (const [k, v] of stats) {
    doc.setFont("helvetica", "normal"); doc.setTextColor(...MUTED); doc.text(k, 220, y);
    doc.setFont("courier", "bold"); doc.setTextColor(...TEXT); doc.text(v, 284, y, { align: "right" }); y += 4.6;
  }
  y += 1; doc.setDrawColor(...LINE); doc.line(220, y, 284, y); y += 4;
  const xs = [220, 230, 250, 260, 270];
  doc.setFont("helvetica", "bold"); doc.setFontSize(4.6); doc.setTextColor(...tint);
  head.forEach((h, i) => doc.text(h, xs[i]!, y)); y += 3;
  for (const r of rows.slice(0, 24)) {
    doc.setFillColor(22, 27, 36); doc.rect(220, y, 64, 4.6, "F");
    doc.setFillColor(...r.colour); doc.roundedRect(220.8, y + 0.8, 7, 3, 0.4, 0.4, "F");
    doc.setFont("courier", "bold"); doc.setFontSize(4.4); doc.setTextColor(10, 10, 10); doc.text(r.cells[0]!, 224.3, y + 3, { align: "center" });
    doc.setTextColor(...TEXT);
    doc.text(doc.splitTextToSize(r.cells[1]!, 19)[0] ?? "", 230, y + 3);
    doc.text(r.cells[2]!, 250, y + 3); doc.text(r.cells[3]!, 258, y + 3);
    if (r.pct !== undefined) {
      doc.setFillColor(40, 44, 52); doc.roundedRect(268, y + 1.5, 9, 1.6, 0.6, 0.6, "F");
      doc.setFillColor(...(r.pct > 100 ? [248, 113, 113] as C3 : r.colour)); doc.roundedRect(268, y + 1.5, 9 * Math.min(1, r.pct / 100), 1.6, 0.6, 0.6, "F");
    }
    doc.setTextColor(...(r.pct !== undefined && r.pct > 100 ? [248, 113, 113] as C3 : r.colour)); doc.text(r.cells[4]!, 284, y + 3, { align: "right" });
    y += 5.2;
  }
  doc.setFont("helvetica", "normal");
  return y;
}

/* ---------- master stage sheet (blueprint, like the sample's SHEET 01) ---------- */

const CYAN: C3 = [56, 189, 248];
const RED: C3 = [239, 68, 68];

function viewPanel(doc: JsPDF, x: number, y: number, w: number, h: number, title: string) {
  doc.setFillColor(13, 17, 24); doc.setDrawColor(28, 36, 48); doc.setLineWidth(0.25);
  doc.rect(x, y, w, h, "FD");
  doc.setFont("courier", "bold"); doc.setFontSize(6); doc.setTextColor(...CYAN);
  doc.text(title, x + 2.5, y + 4.5);
}

function tagBox(doc: JsPDF, cx: number, cy: number, lines: string[], col: C3 = GREEN) {
  doc.setFont("courier", "bold"); doc.setFontSize(4.6);
  const w = Math.max(...lines.map((l) => doc.getTextWidth(l))) + 3, h = lines.length * 2.4 + 1.4;
  doc.setFillColor(10, 14, 20); doc.setDrawColor(...col); doc.setLineWidth(0.2);
  doc.rect(cx - w / 2, cy - h / 2, w, h, "FD");
  lines.forEach((l, i) => { doc.setTextColor(...(i === 0 ? TEXT : col)); doc.text(l, cx, cy - h / 2 + 2.6 + i * 2.4, { align: "center" }); });
}

function dimLine(doc: JsPDF, x0: number, y0: number, x1: number, y1: number, label: string, col: C3 = CYAN) {
  doc.setDrawColor(...col); doc.setFillColor(...col); doc.setLineWidth(0.2);
  doc.line(x0, y0, x1, y1);
  if (y0 === y1) { arrowHead(doc, x0, y0, "l"); arrowHead(doc, x1, y1, "r"); }
  else { arrowHead(doc, x0, Math.min(y0, y1), "u"); arrowHead(doc, x1, Math.max(y0, y1), "d"); }
  doc.setFont("courier", "bold"); doc.setFontSize(4.8);
  const tw = doc.getTextWidth(label) + 2, mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  doc.setFillColor(13, 17, 24); doc.rect(mx - tw / 2, my - 1.6, tw, 3.2, "F");
  doc.setTextColor(...col); doc.text(label, mx, my + 0.9, { align: "center" });
}

const m2 = (n: number) => `${+n.toFixed(2)}`;

function masterSheet(doc: JsPDF, project: Project, screens: LedScreen[], ps: ReturnType<typeof powerSettings>) {
  doc.addPage("a4", "landscape");
  doc.setFillColor(...BG); doc.rect(0, 0, W, H, "F");
  const stage = project.stage;
  const cabs = screens.reduce((n, s) => n + cabinetCalc(s).total, 0);
  const ports = screens.reduce((n, s) => n + screenChains(project, s).length, 0);
  const powers = screens.map((s) => screenPower(s, ps));
  const powerOk = powers.length > 0 && powers.every((p) => p.status === "ok");
  const peakW = powers.reduce((n, p) => n + p.totalMaxW, 0);

  // frame + header band
  doc.setFillColor(11, 15, 21); doc.setDrawColor(24, 32, 42); doc.setLineWidth(0.3); doc.rect(8, 8, W - 16, H - 18, "FD");
  doc.setDrawColor(...shade(GREEN, 0.45)); doc.line(8, 19, W - 8, 19);
  doc.setFillColor(...mix(BG, GREEN, 0.15)); doc.setDrawColor(...shade(GREEN, 0.6)); doc.rect(11.5, 10, 26, 7, "FD");
  doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...GREEN); doc.text("SHEET 01", 24.5, 14.8, { align: "center" });
  doc.setFontSize(9.5); doc.setTextColor(255, 255, 255);
  doc.text(`MASTER LED SCREENS PLACEMENT, RIGGING TRIM HEIGHTS${powerOk ? " & 3-PHASE POWER SCHEDULE" : ""}`, 40.5, 13.3);
  doc.setFont("helvetica", "normal"); doc.setFontSize(5.5); doc.setTextColor(...MUTED);
  doc.text(`PROJECT: ${project.name.toUpperCase()}   ·   SCREENS: ${screens.length} (${cabs} Cabinets)   ·   RJ45 PORTS: ${ports}${powerOk ? `   ·   POWER: ${(peakW / 1000).toFixed(2)} kW` : ""}`, 40.5, 17);

  // world extents
  let x0 = -stage.width / 2, x1 = stage.width / 2, top = stage.height, z0 = -stage.depth / 2, z1 = stage.depth / 2;
  for (const s of screens) {
    const c = cabinetCalc(s);
    x0 = Math.min(x0, s.position.x - c.actualWidth / 2); x1 = Math.max(x1, s.position.x + c.actualWidth / 2);
    top = Math.max(top, s.position.y + c.actualHeight / 2);
    z0 = Math.min(z0, s.position.z - 0.3); z1 = Math.max(z1, s.position.z + 0.3);
  }
  const padX = (x1 - x0) * 0.08; x0 -= padX; x1 += padX; top *= 1.12;

  /* VIEW 01 — front elevation */
  viewPanel(doc, 14, 21, 176, 83, "VIEW 01 // FRONT ELEVATION (X/Y SCALE · TRIM HEIGHTS)");
  {
    const f = fit(x1 - x0, top, 26, 30, 156, 60);
    const X = (m: number) => f.x + (m - x0) * f.s, Y = (m: number) => f.y + (top - m) * f.s;
    // floor
    doc.setDrawColor(...MUTED); doc.setLineWidth(0.3); doc.line(18, Y(0), 186, Y(0));
    doc.setFont("courier", "bold"); doc.setFontSize(4.6); doc.setTextColor(...MUTED); doc.text("F.F.L. +0.00m (FLOOR)", 19, Y(0) - 1);
    // stage deck
    doc.setFillColor(...mix([13, 17, 24], CYAN, 0.08)); doc.setDrawColor(...CYAN); doc.setLineWidth(0.3);
    doc.rect(X(-stage.width / 2), Y(stage.height), stage.width * f.s, stage.height * f.s, "FD");
    if (stage.backWall && stage.backWallHeight > 0) {
      doc.setDrawColor(...shade(CYAN, 0.6)); doc.setLineDashPattern([1, 0.8], 0);
      doc.rect(X(-stage.width / 2), Y(stage.height + stage.backWallHeight), stage.width * f.s, stage.backWallHeight * f.s, "S");
      doc.setLineDashPattern([], 0);
    }
    // centre line
    doc.setDrawColor(...RED); doc.setLineWidth(0.2); doc.setLineDashPattern([1.2, 1], 0);
    doc.line(X(0), 27, X(0), Y(0) + 4); doc.setLineDashPattern([], 0);
    doc.setFont("courier", "bold"); doc.setFontSize(4.6); doc.setTextColor(...RED); doc.text("CL (0.00m)", X(0) + 1, 29);
    // screens
    for (const s of screens) {
      const c = cabinetCalc(s);
      const left = s.position.x - c.actualWidth / 2, bottom = s.position.y - c.actualHeight / 2;
      doc.setFillColor(...mix([13, 17, 24], GREEN, 0.22)); doc.setDrawColor(...GREEN); doc.setLineWidth(0.35);
      doc.rect(X(left), Y(bottom + c.actualHeight), c.actualWidth * f.s, c.actualHeight * f.s, "FD");
      const trimRef = bottom - stage.height > 0.04 && Math.abs(s.position.x) < stage.width / 2 ? stage.height : 0;
      if (bottom - trimRef > 0.04) {
        const ax = X(left) + Math.min(3, c.actualWidth * f.s * 0.12);
        doc.setDrawColor(...AMBER); doc.setFillColor(...AMBER); doc.setLineWidth(0.2);
        doc.line(ax, Y(trimRef), ax, Y(bottom)); arrowHead(doc, ax, Y(bottom), "u"); arrowHead(doc, ax, Y(trimRef), "d");
        doc.setFont("courier", "bold"); doc.setFontSize(4.6); doc.setTextColor(...AMBER);
        doc.text(`+${m2(bottom - trimRef)}m`, ax + 1, (Y(trimRef) + Y(bottom)) / 2 + 0.8);
      }
      tagBox(doc, X(s.position.x), Y(s.position.y), [s.name.toUpperCase(), `${m2(c.actualWidth)}x${m2(c.actualHeight)}m | Trim +${m2(bottom)}m`]);
    }
    const hTop = Math.max(...screens.map((s) => s.position.y + cabinetCalc(s).actualHeight / 2), stage.height);
    dimLine(doc, X(x0) + 2, Y(hTop), X(x0) + 2, Y(0), `H: ${m2(hTop)}m`);
    dimLine(doc, X(-stage.width / 2), Y(0) + 6, X(stage.width / 2), Y(0) + 6, `STAGE SPAN: ${m2(stage.width)}m`);
  }

  /* VIEW 02 — top plan */
  viewPanel(doc, 14, 106, 106, 88, "VIEW 02 // TOP PLAN / STAGE PLOT (X/Z SCALE)");
  {
    const f = fit(x1 - x0, z1 - z0, 22, 116, 90, 64);
    const X = (m: number) => f.x + (m - x0) * f.s, Z = (m: number) => f.y + (m - z0) * f.s;
    doc.setDrawColor(...RED); doc.setLineWidth(0.15); doc.setLineDashPattern([1.2, 1], 0); doc.line(X(0), 110, X(0), 188); doc.setLineDashPattern([], 0);
    doc.setFillColor(...mix([13, 17, 24], CYAN, 0.08)); doc.setDrawColor(...CYAN); doc.setLineWidth(0.3);
    doc.rect(X(-stage.width / 2), Z(-stage.depth / 2), stage.width * f.s, stage.depth * f.s, "FD");
    dimLine(doc, X(stage.width / 2) + 3, Z(-stage.depth / 2), X(stage.width / 2) + 3, Z(stage.depth / 2), `DEPTH: ${m2(stage.depth)}m`);
    screens.forEach((s, i) => {
      const c = cabinetCalc(s); const a = s.rotation.y, hw = c.actualWidth / 2;
      const ax = s.position.x - Math.cos(a) * hw, az = s.position.z + Math.sin(a) * hw;
      const bx = s.position.x + Math.cos(a) * hw, bz = s.position.z - Math.sin(a) * hw;
      doc.setDrawColor(...GREEN); doc.setLineWidth(0.9); doc.line(X(ax), Z(az), X(bx), Z(bz));
      tagBox(doc, X(s.position.x), Z(s.position.z) - 3 - (i % 2) * 4.5, [`${s.name.toUpperCase()} (Z:${m2(s.position.z)}m)`]);
    });
    doc.setFont("courier", "bold"); doc.setFontSize(4.8); doc.setTextColor(...MUTED);
    doc.text("STAGE FRONT / AUDIENCE DIRECTION (FOH +Z)", 67, 191, { align: "center" });
  }

  /* VIEW 03 — side section */
  viewPanel(doc, 123, 106, 67, 88, "VIEW 03 // SIDE SECTION (Z/Y SECTION)");
  {
    const f = fit(z1 - z0, top, 129, 116, 55, 66);
    const Zs = (m: number) => f.x + (m - z0) * f.s, Y = (m: number) => f.y + (top - m) * f.s;
    doc.setDrawColor(...MUTED); doc.setLineWidth(0.3); doc.line(126, Y(0), 187, Y(0));
    doc.setFillColor(...mix([13, 17, 24], GREEN, 0.12)); doc.setDrawColor(...GREEN); doc.setLineWidth(0.3);
    doc.rect(Zs(-stage.depth / 2), Y(stage.height), stage.depth * f.s, stage.height * f.s, "FD");
    for (const s of screens) {
      const c = cabinetCalc(s); const b = s.position.y - c.actualHeight / 2;
      doc.setDrawColor(...GREEN); doc.setLineWidth(0.8); doc.line(Zs(s.position.z), Y(b), Zs(s.position.z), Y(b + c.actualHeight));
    }
    dimLine(doc, Zs(-stage.depth / 2), Y(0) + 5, Zs(stage.depth / 2), Y(0) + 5, `${m2(stage.depth)}m`);
  }

  /* right column — schedules */
  doc.setFillColor(13, 17, 24); doc.setDrawColor(28, 36, 48); doc.setLineWidth(0.25); doc.rect(192, 21, 91, 173, "FD");
  let y = 27;
  const head = (t: string) => {
    doc.setFont("courier", "bold"); doc.setFontSize(6.5); doc.setTextColor(...GREEN); doc.text(t, 195, y);
    y += 2; doc.setDrawColor(...shade(CYAN, 0.5)); doc.setLineWidth(0.5); doc.line(195, y, 280, y); y += 4;
  };
  head("1. RIGGING & SCREEN SCHEDULE");
  const cols = [195, 222, 240, 255, 268];
  doc.setFont("courier", "bold"); doc.setFontSize(4.6); doc.setTextColor(...TEXT);
  ["SCREEN", "DIMENSIONS", "BOT TRIM", "TOP", "PANELS"].forEach((h, i) => doc.text(h, cols[i]!, y)); y += 3.6;
  doc.setFont("courier", "normal");
  for (const s of screens.slice(0, 12)) {
    const c = cabinetCalc(s); const b = s.position.y - c.actualHeight / 2;
    [doc.splitTextToSize(s.name.toUpperCase(), 26)[0] ?? "", `${m2(c.actualWidth)}x${m2(c.actualHeight)}m`, `+${m2(b)}m`, `+${m2(b + c.actualHeight)}m`, `${c.total}`].forEach((v, i) => doc.text(v, cols[i]!, y));
    y += 3.6;
  }
  y += 5;
  head("2. POWER DISTRIBUTION (POWER DISTRO)");
  const kv = (k: string, v: string, col: C3 = GREEN) => {
    doc.setFont("helvetica", "normal"); doc.setFontSize(5); doc.setTextColor(...MUTED); doc.text(k, 195, y);
    doc.setFont("courier", "bold"); doc.setTextColor(...col); doc.text(v, 238, y); y += 4.2;
  };
  if (powerOk) {
    const typ = powers.every((p) => p.totalTypW !== undefined) ? powers.reduce((n, p) => n + (p.totalTypW ?? 0), 0) : undefined;
    const lines = powers.reduce((n, p) => n + p.circuits.length, 0);
    kv("LED Screens Power (Peak / Avg):", `${(peakW / 1000).toFixed(2)} kW${typ !== undefined ? ` / ${(typ / 1000).toFixed(2)} kW` : ""} (${lines} lines)`);
    kv("Supply:", `${ps.voltage} V · ${ps.circuitAmps} A circuits · ${ps.phases}-phase`);
    if (ps.phases === 3) {
      const ph = [0, 0, 0];
      for (const p of powers) for (const cir of p.circuits) ph[(Number(cir.phase.slice(-1)) || 1) - 1]! += cir.amps;
      kv("Phase Balance (L1 / L2 / L3):", `L1: ${ph[0]!.toFixed(1)}A | L2: ${ph[1]!.toFixed(1)}A | L3: ${ph[2]!.toFixed(1)}A`);
    } else kv("Total Current:", `${(peakW / ps.voltage).toFixed(1)} A`);
    kv("Usable circuit load:", `${ps.loadLimitPct}% of rating`);
  } else {
    doc.setFont("helvetica", "normal"); doc.setFontSize(5.5); doc.setTextColor(...AMBER);
    const t = doc.splitTextToSize("Power not calculated — enter cabinet max watts and circuit rating (Summary tab › Power Planning) from manufacturer and venue data.", 84);
    doc.text(t, 195, y); y += t.length * 3 + 2;
  }
  y += 4;
  head("3. DATA / PROCESSORS");
  for (const proc of project.processors.filter((p) => screens.some((s) => s.processorId === p.id))) {
    const used = screens.filter((s) => s.processorId === proc.id).reduce((n, s) => n + screenChains(project, s).length, 0);
    kv(`${proc.name ?? `${proc.brand} ${proc.label}`}:`, `${used} / ${proc.outputs} RJ45 ports`, used > proc.outputs ? RED : GREEN);
  }
  const free = screens.filter((s) => !project.processors.some((p) => p.id === s.processorId));
  if (free.length) kv("No processor:", free.map((s) => s.name).join(", "), AMBER);

  // title block
  doc.setFillColor(17, 24, 34); doc.rect(192, 170, 91, 24, "F");
  doc.setFont("courier", "bold"); doc.setFontSize(4.6); doc.setTextColor(...CYAN);
  doc.text("PRODUCTION BLUEPRINT — TECHNICAL SHEET", 195, 175);
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(255, 255, 255);
  doc.text(doc.splitTextToSize(project.name.toUpperCase(), 85)[0] ?? "", 195, 181);
  doc.setFont("courier", "normal"); doc.setFontSize(4.8); doc.setTextColor(...MUTED);
  doc.text(`DECK: ${m2(stage.width)}m x ${m2(stage.depth)}m (+${m2(stage.height)}m)`, 195, 185.5);
  doc.text(`SCREENS: ${screens.length} (${cabs} Cabinets)  |  RJ45 PORTS: ${ports}`, 195, 188.5);
  doc.setTextColor(...GREEN); doc.text(`SCALE: METERS (1:1 CAD)  |  DATE: ${new Date().toLocaleDateString()}`, 195, 191.5);
  footer(doc);
  doc.setFont("helvetica", "normal");
}

export async function downloadTechnicalReport(project: Project) {
  const doc = await buildTechnicalReport(project);
  doc.save(`${project.name.replace(/[^\w\- ]+/g, "").trim() || "project"}-technical-report.pdf`);
}

/** Builds the multipage report from saved project data. */
export async function buildTechnicalReport(project: Project) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  PAINT = screenPaint(project);
  const layout = globalLayout(project);
  const ps = powerSettings(project);
  const screens = project.screens.filter((s) => s.visible !== false);
  const today = new Date().toLocaleDateString();

  /* 1 — cover (logo, title, subtitle, date) */
  const cover = project.meta.coverImage ?? (project.meta.coverAssetId ? await getAsset(project.meta.coverAssetId) : null);
  LOGO = cover ?? null;
  doc.setFillColor(...BG); doc.rect(0, 0, W, H, "F");
  if (cover) logo(doc, 50, 30, W - 100, 75);
  doc.setTextColor(...TEXT); doc.setFont("helvetica", "normal"); doc.setFontSize(22);
  doc.text(project.name.toUpperCase(), W / 2, 125, { align: "center" });
  doc.setFontSize(9); doc.setTextColor(...MUTED);
  doc.text("PIXEL MAP - TECHNICAL REPORT", W / 2, 134, { align: "center" });
  doc.setFontSize(7); doc.setTextColor(110, 114, 120);
  doc.text(today, W / 2, 150, { align: "center" });
  const coverMeta = [project.meta.client, project.meta.venue, project.meta.eventDate].filter(Boolean).join("   ·   ");
  if (coverMeta) doc.text(coverMeta, W / 2, 156, { align: "center" });
  footer(doc);

  /* per-screen pixel maps */
  for (const s of screens) {
    const c = cabinetCalc(s);
    page(doc, s.name.toUpperCase(), "", project);
    const f = fit(c.actualWidth, c.actualHeight, 30, 48, W - 48, 92);
    const w = c.actualWidth * f.s, h = c.actualHeight * f.s;
    pixelMap(doc, s, f.x, f.y, w, h, 1, { logo: true });
    dimH(doc, f.x, f.x + w, f.y - 6, `${c.actualWidth.toFixed(2)} m`);
    dimV(doc, f.x - 8, f.y, f.y + h, `${c.actualHeight.toFixed(2)} m`);
    sectionTitle(doc, 15, 157, "Screen Details");
    details(doc, 15, 170, [
      ["Display Name", s.name.toUpperCase()], ["Module Type:", `P${s.pixelPitch} - ${(c.cabinetWidth * 100).toFixed(0)} × ${(c.cabinetHeight * 100).toFixed(0)} cm`],
      ["Screen Width (panels):", `${c.cols}`], ["Screen Height (panels):", `${c.rows}`],
      ["Physical Width:", `${c.actualWidth.toFixed(2)} m`], ["Physical Height:", `${c.actualHeight.toFixed(2)} m`],
      ["Active Panels:", `${c.total} un.`], ["Physical Area:", `${c.area.toFixed(2)} m2 (${c.actualWidth.toFixed(2)} x ${c.actualHeight.toFixed(2)} m)`],
    ], 68);
  }

  /* full canvas layout */
  page(doc, "Full Canvas Layout", "", project);
  if (layout.canvasWidth > 0) {
    const f = fit(layout.canvasWidth, layout.canvasHeight, 15, 45, W - 30, 100);
    doc.setFillColor(0, 0, 0); doc.rect(f.x, f.y, layout.canvasWidth * f.s, layout.canvasHeight * f.s, "F");
    for (const p of layout.placements) {
      const s = screens.find((x) => x.id === p.screenId)!;
      pixelMap(doc, s, f.x + p.x * f.s, f.y + p.y * f.s, p.width * f.s, p.height * f.s, 1, { logo: true });
    }
  }
  sectionTitle(doc, 15, 160, "Global Layout");
  doc.setFont("helvetica", "bold"); doc.setFontSize(8);
  const gl: Array<[string, string, number, number, boolean]> = [
    ["TOTAL CANVAS & AREA", `${layout.canvasWidth}px x ${layout.canvasHeight}px`, 15, 172, false],
    ["Active Panels:", `${layout.totalCabinets} un.`, 15, 180, false],
    ["Est. Total Width:", `${layout.footprintWidthM.toFixed(2)} m`, 112, 172, true],
    ["Est. Total Height:", `${layout.footprintHeightM.toFixed(2)} m`, 112, 180, true],
    ["Total Physical Area:", `${layout.activeAreaM2.toFixed(2)} m2`, 205, 180, false],
  ];
  for (const [k, v, x, y, g] of gl) { doc.setTextColor(...MUTED); doc.text(k, x, y); doc.setTextColor(...(g ? GREEN : TEXT)); doc.text(v, x + 36, y); }
  doc.setFont("helvetica", "normal");

  /* master stage sheet */
  masterSheet(doc, project, screens, ps);

  /* per-screen data and power sheets */
  for (const s of screens) {
    const c = cabinetCalc(s);
    const proc = project.processors.find((p) => p.id === s.processorId);
    const chains = screenChains(project, s);
    const pxCab = Math.round(s.pixelWidth / c.cols) * Math.round(s.pixelHeight / c.rows);
    const portMax = proc?.portMaxPixels ?? 650000;
    sheetFrame(doc, s, "data", "SIGNAL WIRING DIAGRAM (CAT6 RJ45 · DAISY-CHAIN)", project);
    const dRuns: Run[] = chains.map((ch2, i) => ({ label: `P${ch2.port}`, colour: PALETTE[i % PALETTE.length]!, path: ch2.path, tag: `P${ch2.port}: ${ch2.cabinets} cabs (C${ch2.colStart + 1}–C${ch2.colEnd + 1})` }));
    wiringDrawing(doc, s, dRuns, "P");
    const yEnd = summaryCard(doc, `DATA SIGNAL SUMMARY — ${s.name.toUpperCase()}`, `${chains.length} RJ45 PORTS (CAT6)`, GREEN, [
      ["Total RJ45 Lines:", `${chains.length} Cat6 lines`],
      ["Max Cabinets / Port:", `${Math.floor(portMax / Math.max(1, pxCab))} cabs (${Math.round(portMax / 1000)}k px)`],
      ["Total Resolution:", `${s.pixelWidth} x ${s.pixelHeight} px`],
      ["Footprint / Span:", `${+c.actualWidth.toFixed(2)}m W x ${+c.actualHeight.toFixed(2)}m H`],
      ["Processor:", proc ? `${proc.brand} ${proc.label}` : "not assigned"],
    ], ["PORT", "ROUTE (IN-OUT)", "CABS", "PIXELS", "LOAD"],
      chains.map((ch2, i) => {
        const a = ch2.path[0]!, b = ch2.path[ch2.path.length - 1]!;
        return { colour: PALETTE[i % PALETTE.length]!, pct: ch2.loadPct, cells: [`P${ch2.port}${ch2.overflow ? "*" : ""}`, `C${a[0] + 1}·R${a[1] + 1}–C${b[0] + 1}`, `${ch2.cabinets}c`, `${Math.round(ch2.pixels / 1000)}k px`, `${ch2.loadPct.toFixed(0)}%`] };
      }));
    doc.setFontSize(5); doc.setTextColor(...MUTED);
    const jm = chains.reduce((n, ch2) => n + chainCableM(s, ch2, 0).jumpersM, 0);
    doc.text(doc.splitTextToSize(`Panel-to-panel jumpers: ${jm.toFixed(1)} m total.${ps.dataHomeRunM ? ` Home run: ${ps.dataHomeRunM} m per port (estimate).` : " Home-run lengths: measure on site."}${chains.some((x) => x.overflow) ? ` * Port exceeds the ${proc?.outputs} outputs of this processor — add a second processor.` : ""}`, 62), 220, Math.min(yEnd + 4, 178));

    const pw = screenPower(s, ps);
    sheetFrame(doc, s, "power", `POWER DISTRIBUTION DIAGRAM (${ps.voltage}V · POWERCON)`, project, ps.voltage);
    const pRuns: Run[] = pw.circuits.map((cir, i) => ({ label: cir.id, colour: PALETTE[i % PALETTE.length]!, path: cir.path, feed: cir.phase, tag: `${cir.id}: ${cir.cabinets} cabs (C${cir.colStart + 1}–C${cir.colEnd + 1})` }));
    wiringDrawing(doc, s, pRuns, "C");
    if (pw.status === "missing") {
      summaryCard(doc, `POWER DISTRIBUTION SUMMARY — ${s.name.toUpperCase()}`, "POWER DATA MISSING", AMBER, [], [], []);
      doc.setFontSize(6.5); doc.setTextColor(...AMBER); doc.text(doc.splitTextToSize(pw.message ?? "", 62), 220, 66);
    } else {
      const pEnd = summaryCard(doc, `POWER DISTRIBUTION SUMMARY — ${s.name.toUpperCase()}`, `${pw.circuits.length} POWERCON CIRCUITS`, AMBER, [
        ["Total PowerCon Lines:", `${pw.circuits.length} circuits (${ps.voltage}V)`],
        ["Peak Load:", `${(pw.totalMaxW / 1000).toFixed(2)} kW`],
        ["Typical Load:", pw.totalTypW ? `${(pw.totalTypW / 1000).toFixed(2)} kW` : "not entered"],
        ["Total Current:", `${pw.totalAmps.toFixed(1)} A (${ps.phases}-phase)`],
        ["Max Cabinets / Circuit:", `${pw.cabinetsPerCircuit} cabinets`],
      ], ["CIRC.", "FEED-P / ROUTE", "CABS", "POWER", "AMP"],
        pw.circuits.map((cir, i) => ({ colour: PALETTE[i % PALETTE.length]!, pct: cir.loadPct, cells: [cir.id, `${cir.phase} C${cir.path[0]![0] + 1}·R${cir.path[0]![1] + 1}–C${cir.colEnd + 1}`, `${cir.cabinets}c`, `${cir.maxW}W`, `${cir.amps.toFixed(1)}A`] })));
      doc.setFontSize(5); doc.setTextColor(...MUTED);
      doc.text(doc.splitTextToSize(`Based on ${ps.cabinetMaxW} W max per cabinet and ${ps.circuitAmps} A circuits loaded to ${ps.loadLimitPct}%. Final electrical design must be verified by a qualified electrician.`, 62), 220, Math.min(pEnd + 4, 178));
    }
  }

  return doc;
}
