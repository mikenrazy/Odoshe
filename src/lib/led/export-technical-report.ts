import type { jsPDF as JsPDF } from "jspdf";
import type { LedScreen, Project } from "./types";
import { cabinetCalc } from "./calc";
import { computeGridNumbers } from "./grid-numbering";
import { validateMapping } from "./mapping";
import { billOfMaterials, globalLayout, powerSettings, screenChains, screenPower } from "./engineering";
import { getAsset } from "./asset-store";

const W = 297, H = 210, M = 12;
const BG: [number, number, number] = [14, 17, 23];
const PANEL: [number, number, number] = [22, 27, 36];
const TEXT: [number, number, number] = [226, 231, 238];
const MUTED: [number, number, number] = [138, 148, 163];
const ACCENT: [number, number, number] = [255, 157, 46];
const PALETTE: Array<[number, number, number]> = [[52, 211, 153], [56, 189, 248], [250, 204, 21], [244, 114, 182], [167, 139, 250], [251, 146, 60], [45, 212, 191], [248, 113, 113], [132, 204, 22], [96, 165, 250]];

function rgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [59, 130, 246];
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const shade = (c: [number, number, number], f: number): [number, number, number] => c.map((v) => Math.max(0, Math.min(255, Math.round(v * f)))) as [number, number, number];

function page(doc: JsPDF, title: string, sub: string, project: Project, first = false) {
  if (!first) doc.addPage("a4", "landscape");
  doc.setFillColor(...BG); doc.rect(0, 0, W, H, "F");
  doc.setTextColor(...TEXT); doc.setFont("helvetica", "bold"); doc.setFontSize(15);
  doc.text(title.toUpperCase(), M, 16);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...MUTED);
  doc.text(sub, M, 21.5);
  doc.setDrawColor(...ACCENT); doc.setLineWidth(0.4); doc.line(M, 24, W - M, 24);
  doc.setFontSize(7); doc.text(`${project.name}  ·  ${project.meta.client || ""}`, M, H - 6);
  doc.text(`DX5VE Studio · Page ${doc.getNumberOfPages()}`, W - M, H - 6, { align: "right" });
}

function table(doc: JsPDF, x: number, y: number, cols: Array<{ h: string; w: number }>, rows: string[][], rowH = 5.2) {
  doc.setFillColor(...PANEL); doc.rect(x, y, cols.reduce((n, c) => n + c.w, 0), rowH, "F");
  doc.setFontSize(6.5); doc.setFont("helvetica", "bold"); doc.setTextColor(...ACCENT);
  let cx = x; for (const c of cols) { doc.text(c.h, cx + 1.5, y + 3.6); cx += c.w; }
  doc.setFont("helvetica", "normal"); doc.setTextColor(...TEXT);
  rows.forEach((r, i) => {
    const ry = y + rowH * (i + 1);
    if (i % 2) { doc.setFillColor(18, 22, 30); doc.rect(x, ry, cols.reduce((n, c) => n + c.w, 0), rowH, "F"); }
    let rx = x; r.forEach((v, j) => { doc.text(doc.splitTextToSize(v, cols[j]!.w - 2)[0] ?? "", rx + 1.5, ry + 3.6); rx += cols[j]!.w; });
  });
  return y + rowH * (rows.length + 1);
}

function details(doc: JsPDF, x: number, y: number, pairs: Array<[string, string]>, colW = 68) {
  doc.setFontSize(7.5);
  pairs.forEach(([k, v], i) => {
    const cx = x + Math.floor(i / 4) * (colW * 2), cy = y + (i % 4) * 6;
    doc.setTextColor(...MUTED); doc.text(k, cx, cy);
    doc.setTextColor(...TEXT); doc.text(v, cx + colW * 0.75, cy);
  });
}

function dimH(doc: JsPDF, x0: number, x1: number, y: number, label: string) {
  doc.setDrawColor(...ACCENT); doc.setLineWidth(0.25); doc.line(x0, y, x1, y); doc.line(x0, y - 1.5, x0, y + 1.5); doc.line(x1, y - 1.5, x1, y + 1.5);
  doc.setFontSize(7); doc.setTextColor(...ACCENT); doc.text(label, (x0 + x1) / 2, y - 1.2, { align: "center" });
}
function dimV(doc: JsPDF, x: number, y0: number, y1: number, label: string) {
  doc.setDrawColor(...ACCENT); doc.setLineWidth(0.25); doc.line(x, y0, x, y1); doc.line(x - 1.5, y0, x + 1.5, y0); doc.line(x - 1.5, y1, x + 1.5, y1);
  doc.setFontSize(7); doc.setTextColor(...ACCENT); doc.text(label, x - 1.5, (y0 + y1) / 2, { align: "right" });
}

/** Fits a w×h box into an area; returns origin and scale. */
function fit(w: number, h: number, ax: number, ay: number, aw: number, ah: number) {
  const s = Math.min(aw / w, ah / h);
  return { x: ax + (aw - w * s) / 2, y: ay + (ah - h * s) / 2, s };
}

function pixelMap(doc: JsPDF, screen: LedScreen, x: number, y: number, w: number, h: number, gridStart: number) {
  const c = cabinetCalc(screen);
  const base = rgb(screen.color);
  const cw = w / c.cols, ch = h / c.rows;
  for (let r = 0; r < c.rows; r++) for (let col = 0; col < c.cols; col++) {
    doc.setFillColor(...shade(base, (r + col) % 2 ? 0.72 : 1));
    doc.rect(x + col * cw, y + r * ch, cw, ch, "F");
    if (cw > 4) { doc.setFontSize(Math.min(7, cw * 0.9)); doc.setTextColor(255, 255, 255); doc.text(String(gridStart + r * c.cols + col).padStart(2, "0"), x + col * cw + cw / 2, y + r * ch + ch / 2 + 1, { align: "center" }); }
  }
  doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.15);
  doc.line(x, y, x + w, y + h); doc.line(x + w, y, x, y + h);
  doc.setFontSize(Math.min(18, w / 8)); doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255);
  doc.text(screen.name.toUpperCase(), x + w / 2, y + h / 2 - 1, { align: "center" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(Math.min(8, w / 18));
  doc.text(`W ${screen.pixelWidth} x H ${screen.pixelHeight}`, x + w / 2, y + h / 2 + 5, { align: "center" });
}

export async function downloadTechnicalReport(project: Project) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const grids = computeGridNumbers(project);
  const layout = globalLayout(project);
  const ps = powerSettings(project);
  const screens = project.screens.filter((s) => s.visible !== false);
  const today = new Date().toLocaleDateString();

  /* 1 — cover */
  doc.setFillColor(...BG); doc.rect(0, 0, W, H, "F");
  const cover = project.meta.coverImage ?? (project.meta.coverAssetId ? await getAsset(project.meta.coverAssetId) : null);
  if (cover) {
    try { const p = doc.getImageProperties(cover); const f = fit(p.width, p.height, 60, 25, W - 120, 80); doc.addImage(cover, p.fileType, f.x, f.y, p.width * f.s, p.height * f.s); } catch { /* unreadable image */ }
  }
  doc.setTextColor(...TEXT); doc.setFont("helvetica", "bold"); doc.setFontSize(24);
  doc.text(project.name.toUpperCase(), W / 2, 125, { align: "center" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...ACCENT);
  doc.text("PIXEL MAP · TECHNICAL REPORT", W / 2, 133, { align: "center" });
  doc.setFontSize(8); doc.setTextColor(...MUTED);
  const meta = project.meta as unknown as Record<string, string | undefined>;
  [
    `Client / event: ${project.meta.client || "—"}`,
    `Venue: ${project.meta.venue || "—"}   ·   Event date: ${project.meta.eventDate || "—"}`,
    `Prepared by: ${meta["preparedBy"] || meta["designer"] || "DX5VE Studio"}   ·   Revision: ${meta["revision"] || "1"}   ·   Generated: ${today}`,
    `${screens.length} LED surfaces · ${layout.totalCabinets} cabinets · ${layout.activeAreaM2.toFixed(2)} m² · canvas ${layout.canvasWidth} × ${layout.canvasHeight} px`,
  ].forEach((l, i) => doc.text(l, W / 2, 145 + i * 6, { align: "center" }));

  /* per-screen pixel maps */
  for (const s of screens) {
    const c = cabinetCalc(s);
    page(doc, s.name, "LED screen · front-facing pixel map", project);
    const f = fit(c.actualWidth, c.actualHeight, M + 14, 34, W - 2 * M - 20, 112);
    const w = c.actualWidth * f.s, h = c.actualHeight * f.s;
    pixelMap(doc, s, f.x, f.y, w, h, grids.get(s.id)?.start ?? 1);
    dimH(doc, f.x, f.x + w, f.y - 3, `${c.actualWidth.toFixed(2)} m · ${s.pixelWidth} px`);
    dimV(doc, f.x - 3, f.y, f.y + h, `${c.actualHeight.toFixed(2)} m`);
    doc.setFontSize(10); doc.setTextColor(...TEXT); doc.setFont("helvetica", "bold"); doc.text("Screen Details", M, 160); doc.setFont("helvetica", "normal");
    details(doc, M, 168, [
      ["Display name", s.name], ["Module type", `P${s.pixelPitch} · ${(c.cabinetWidth * 100).toFixed(0)} × ${(c.cabinetHeight * 100).toFixed(0)} cm`],
      ["Panels (W × H)", `${c.cols} × ${c.rows}`], ["Panel resolution", `${Math.round(s.pixelWidth / c.cols)} × ${Math.round(s.pixelHeight / c.rows)} px`],
      ["Physical size", `${c.actualWidth.toFixed(2)} × ${c.actualHeight.toFixed(2)} m`], ["Active panels", `${c.total} un.`],
      ["Physical area", `${c.area.toFixed(2)} m²`], ["Resolution", `${s.pixelWidth} × ${s.pixelHeight} px (${(s.pixelWidth * s.pixelHeight).toLocaleString()})`],
      ["Canvas offset", `X ${s.content.x} · Y ${s.content.y} px`], ["Position", `X ${s.position.x.toFixed(2)} · Y ${s.position.y.toFixed(2)} · Z ${s.position.z.toFixed(2)} m`],
      ["Rotation", `${s.rotation.y.toFixed(0)}° yaw · ${s.rotation.x.toFixed(0)}° tilt`], ["Grid numbers", `${grids.get(s.id)?.start ?? 1}–${(grids.get(s.id)?.start ?? 1) + c.total - 1}`],
    ], 66);
  }

  /* full canvas layout */
  page(doc, "Full Canvas Layout", "Logical graphics canvas — screens at their configured pixel offsets", project);
  if (layout.canvasWidth > 0) {
    const f = fit(layout.canvasWidth, layout.canvasHeight, M, 34, W - 2 * M, 90);
    doc.setFillColor(0, 0, 0); doc.rect(f.x, f.y, layout.canvasWidth * f.s, layout.canvasHeight * f.s, "F");
    for (const p of layout.placements) {
      const s = screens.find((x) => x.id === p.screenId)!;
      pixelMap(doc, s, f.x + p.x * f.s, f.y + p.y * f.s, p.width * f.s, p.height * f.s, grids.get(s.id)?.start ?? 1);
    }
    dimH(doc, f.x, f.x + layout.canvasWidth * f.s, f.y - 3, `${layout.canvasWidth} px`);
    dimV(doc, f.x - 2, f.y, f.y + layout.canvasHeight * f.s, `${layout.canvasHeight} px`);
  }
  doc.setFontSize(10); doc.setTextColor(...TEXT); doc.setFont("helvetica", "bold"); doc.text("Global Layout", M, 134); doc.setFont("helvetica", "normal");
  details(doc, M, 141, [
    ["Total canvas", `${layout.canvasWidth} × ${layout.canvasHeight} px`], ["Active panels", `${layout.totalCabinets} un.`],
    ["Unused canvas", `${layout.unusedPixels.toLocaleString()} px`], ["Active area", `${layout.activeAreaM2.toFixed(2)} m²`],
    ["Footprint width", `${layout.footprintWidthM.toFixed(2)} m`], ["Footprint height", `${layout.footprintHeightM.toFixed(2)} m`],
    ["Occupied pixels", layout.occupiedPixels.toLocaleString()], ["Note", "Logical canvas ≠ processor output"],
  ], 66);
  table(doc, M, 168, [{ h: "SCREEN", w: 60 }, { h: "X", w: 30 }, { h: "Y", w: 30 }, { h: "WIDTH", w: 35 }, { h: "HEIGHT", w: 35 }, { h: "PANELS", w: 30 }, { h: "AREA", w: 30 }],
    layout.placements.slice(0, 5).map((p) => [p.name, `${p.x}`, `${p.y}`, `${p.width} px`, `${p.height} px`, `${p.cols}×${p.rows}`, `${p.areaM2.toFixed(2)} m²`]));

  /* master elevation */
  page(doc, "Master Stage Elevation & Rigging", "Front elevation · screen trim heights above floor", project);
  {
    const stage = project.stage;
    let x0 = -stage.width / 2, x1 = stage.width / 2, top = stage.height + 1;
    for (const s of screens) { const c = cabinetCalc(s); x0 = Math.min(x0, s.position.x - c.actualWidth / 2); x1 = Math.max(x1, s.position.x + c.actualWidth / 2); top = Math.max(top, s.position.y + c.actualHeight / 2); }
    const f = fit(x1 - x0, top, M + 15, 34, 175, 120);
    const X = (m: number) => f.x + (m - x0) * f.s, Y = (m: number) => f.y + (top - m) * f.s;
    doc.setDrawColor(...MUTED); doc.setLineWidth(0.3); doc.line(X(x0) - 5, Y(0), X(x1) + 5, Y(0));
    doc.setFillColor(60, 66, 78); doc.rect(X(-stage.width / 2), Y(stage.height), stage.width * f.s, stage.height * f.s, "F");
    dimH(doc, X(-stage.width / 2), X(stage.width / 2), Y(0) + 6, `Stage ${stage.width.toFixed(2)} m`);
    dimV(doc, X(x0) - 4, Y(stage.height), Y(0), `${stage.height.toFixed(2)} m`);
    for (const s of screens) {
      const c = cabinetCalc(s);
      const left = s.position.x - c.actualWidth / 2, bottom = s.position.y - c.actualHeight / 2;
      doc.setFillColor(...rgb(s.color)); doc.rect(X(left), Y(bottom + c.actualHeight), c.actualWidth * f.s, c.actualHeight * f.s, "F");
      doc.setFontSize(6.5); doc.setTextColor(255, 255, 255); doc.text(s.name, X(s.position.x), Y(s.position.y), { align: "center" });
    }
    table(doc, 205, 34, [{ h: "SCREEN", w: 28 }, { h: "BOTTOM", w: 18 }, { h: "TOP", w: 18 }, { h: "SIZE", w: 16 }],
      screens.map((s) => { const c = cabinetCalc(s); const b = s.position.y - c.actualHeight / 2; return [s.name, `${b.toFixed(2)} m`, `${(b + c.actualHeight).toFixed(2)} m`, `${c.actualWidth}×${c.actualHeight}`]; }));
    doc.setFontSize(6.5); doc.setTextColor(...MUTED);
    doc.text(doc.splitTextToSize("Heights are measured from venue floor to the LED's bottom and top edges using the saved screen positions. Rigging points, loads and structure must be verified on site by a qualified rigger.", 80), 205, 150);
  }

  /* per-screen data and power */
  for (const s of screens) {
    const c = cabinetCalc(s);
    const proc = project.processors.find((p) => p.id === s.processorId);
    const chains = screenChains(project, s);
    page(doc, `${s.name} · Data / Port Mapping`, `Signal wiring · ${proc ? `${proc.brand} ${proc.label}` : "no processor"} · ${chains.length} RJ45 ports (CAT6) · serpentine by column`, project);
    const f = fit(c.actualWidth, c.actualHeight, M + 8, 36, 175, 140);
    const cw = c.actualWidth * f.s / c.cols, ch = c.actualHeight * f.s / c.rows;
    chains.forEach((chain, i) => {
      const col = PALETTE[i % PALETTE.length]!;
      for (const [cc, rr] of chain.path) { doc.setFillColor(...shade(col, 0.28)); doc.setDrawColor(...shade(col, 0.7)); doc.setLineWidth(0.2); doc.rect(f.x + cc * cw, f.y + rr * ch, cw, ch, "FD"); }
      doc.setDrawColor(...col); doc.setLineWidth(0.6);
      for (let k = 1; k < chain.path.length; k++) { const [a, b] = chain.path[k - 1]!, [cc, d] = chain.path[k]!; doc.line(f.x + (a + 0.5) * cw, f.y + (b + 0.5) * ch, f.x + (cc + 0.5) * cw, f.y + (d + 0.5) * ch); }
      const [sc, sr] = chain.path[0]!; doc.setFillColor(...col); doc.circle(f.x + (sc + 0.5) * cw, f.y + (sr + 0.5) * ch, Math.min(1.4, cw / 4), "F");
      doc.setFontSize(6); doc.setTextColor(...col); doc.text(`P${chain.port}`, f.x + (sc + 0.5) * cw, f.y + c.actualHeight * f.s + 4, { align: "center" });
    });
    dimH(doc, f.x, f.x + c.actualWidth * f.s, f.y - 3, `${c.actualWidth.toFixed(2)} m · ${c.cols} columns · ${s.pixelWidth} px`);
    table(doc, 200, 36, [{ h: "PORT", w: 12 }, { h: "COLUMNS", w: 20 }, { h: "CAB", w: 12 }, { h: "PIXELS", w: 22 }, { h: "LOAD", w: 19 }],
      chains.map((ch2) => [`P${ch2.port}`, `C${ch2.colStart + 1}–C${ch2.colEnd + 1}`, `${ch2.cabinets}`, ch2.pixels.toLocaleString(), `${ch2.loadPct.toFixed(0)}%${ch2.loadPct > 100 ? " !" : ""}`]));

    const pw = screenPower(s, ps);
    page(doc, `${s.name} · Power Distribution`, `Power wiring · ${ps.voltage} V · ${ps.phases}-phase · ${pw.circuits.length} circuits`, project);
    for (let r = 0; r < c.rows; r++) for (let col = 0; col < c.cols; col++) {
      const ci = pw.circuits.findIndex((x) => col >= x.colStart && col <= x.colEnd);
      const pc = ci >= 0 ? PALETTE[ci % PALETTE.length]! : MUTED;
      doc.setFillColor(...shade(pc, 0.28)); doc.setDrawColor(...shade(pc, 0.7)); doc.setLineWidth(0.2); doc.rect(f.x + col * cw, f.y + r * ch, cw, ch, "FD");
    }
    pw.circuits.forEach((cir, i) => { doc.setFontSize(6); doc.setTextColor(...PALETTE[i % PALETTE.length]!); doc.text(`${cir.id}·${cir.phase}`, f.x + ((cir.colStart + cir.colEnd + 1) / 2) * cw, f.y + c.actualHeight * f.s + 4, { align: "center" }); });
    if (pw.status === "missing") {
      doc.setFontSize(8); doc.setTextColor(...ACCENT); doc.text(doc.splitTextToSize(`Power specification missing — ${pw.message}`, 85), 200, 40);
    } else {
      const end = table(doc, 200, 36, [{ h: "CIRCUIT", w: 15 }, { h: "PHASE", w: 12 }, { h: "CAB", w: 11 }, { h: "MAX W", w: 18 }, { h: "AMPS", w: 14 }, { h: "LOAD", w: 15 }],
        pw.circuits.map((x) => [x.id, x.phase, `${x.cabinets}`, `${x.maxW}`, x.amps.toFixed(1), `${x.loadPct.toFixed(0)}%`]));
      details(doc, 200, end + 8, [["Max load", `${(pw.totalMaxW / 1000).toFixed(2)} kW`], ["Typical", pw.totalTypW ? `${(pw.totalTypW / 1000).toFixed(2)} kW` : "not entered"], ["Total current", `${pw.totalAmps.toFixed(1)} A`], ["Cab / circuit", `${pw.cabinetsPerCircuit}`]], 30);
      doc.setFontSize(6.5); doc.setTextColor(...MUTED); doc.text(doc.splitTextToSize(`Based on ${ps.cabinetMaxW} W max per cabinet and ${ps.circuitAmps} A circuits loaded to ${ps.loadLimitPct}%. Final electrical design must be verified by a qualified electrician.`, 85), 200, end + 36);
    }
  }

  /* validation & equipment */
  page(doc, "Validation & Equipment", "Engineering warnings and bill of materials (quantities only — no prices)", project);
  const issues = validateMapping(project).slice(0, 14);
  const vEnd = table(doc, M, 30, [{ h: "STATE", w: 20 }, { h: "ISSUE", w: 85 }, { h: "DETAIL", w: 168 }],
    issues.length ? issues.map((i) => [i.level === "error" ? "Blocked" : "Warning", i.title, i.detail]) : [["Passed", "No issues", "All configured checks passed."]]);
  table(doc, M, vEnd + 6, [{ h: "ITEM", w: 90 }, { h: "MODEL", w: 55 }, { h: "QTY", w: 15 }, { h: "LOCATION", w: 45 }, { h: "SPEC", w: 68 }],
    billOfMaterials(project).slice(0, Math.max(3, Math.floor((H - vEnd - 22) / 5.2) - 1)).map((r) => [r.item, r.model, String(r.qty), r.location, r.spec]));

  doc.save(`${project.name.replace(/[^\w\- ]+/g, "").trim() || "project"}-technical-report.pdf`);
}
