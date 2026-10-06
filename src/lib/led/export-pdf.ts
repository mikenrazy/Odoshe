import type { Project } from "./types";
import { cabinetCalc } from "./calc";
import { computeGridNumbers } from "./grid-numbering";
import { renderComposite } from "./media";
import { getAsset } from "./asset-store";

/** Builds and downloads an A3 landscape design spec PDF for the project. */
export async function downloadDesignPdf(project: Project) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a3" });
  const W = 420;
  const H = 297;
  const M = 12;
  const grids = computeGridNumbers(project);
  const screens = project.screens;

  // Header
  doc.setFillColor(12, 16, 24);
  doc.rect(0, 0, W, 22, "F");
  doc.setTextColor(255, 157, 46);
  doc.setFontSize(16);
  doc.text("DX5VE · LED STAGE DESIGN SPECIFICATION", M, 14);
  doc.setTextColor(220, 226, 236);
  doc.setFontSize(9);
  doc.text(
    `${project.name}  |  Client: ${project.meta.client || "—"}  |  Venue: ${project.meta.venue || "—"}  |  Date: ${project.meta.eventDate || "—"}`,
    W - M,
    14,
    { align: "right" },
  );

  // Front elevation drawing
  const drawTop = 30;
  const drawH = 120;
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(10);
  doc.text("FRONT ELEVATION — LED SCREENS (cabinet grid & grid numbers)", M, drawTop - 2);
  doc.setDrawColor(180);
  doc.rect(M, drawTop, W - 2 * M, drawH);

  if (screens.length) {
    const minX = Math.min(...screens.map((s) => s.position.x - s.physicalWidth / 2));
    const maxX = Math.max(...screens.map((s) => s.position.x + s.physicalWidth / 2));
    const minY = Math.min(0, ...screens.map((s) => s.position.y - s.physicalHeight / 2));
    const maxY = Math.max(...screens.map((s) => s.position.y + s.physicalHeight / 2));
    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);
    const scale = Math.min((W - 2 * M - 30) / spanX, (drawH - 30) / spanY);
    const ox = M + (W - 2 * M - spanX * scale) / 2 - minX * scale;
    const floorY = drawTop + drawH - 12 + minY * scale;
    doc.setDrawColor(120);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(M + 2, floorY, W - M - 2, floorY);
    doc.setLineDashPattern([], 0);
    doc.setFontSize(7);
    doc.text("FLOOR 0.00 m", M + 3, floorY - 1);

    screens.forEach((s) => {
      const c = cabinetCalc(s);
      const g = grids.get(s.id);
      const w = s.physicalWidth * scale;
      const h = s.physicalHeight * scale;
      const x = ox + (s.position.x - s.physicalWidth / 2) * scale;
      const y = floorY - (s.position.y + s.physicalHeight / 2) * scale;
      doc.setFillColor(18, 40, 58);
      doc.setDrawColor(40, 120, 170);
      doc.rect(x, y, w, h, "FD");
      const cw = w / c.cols;
      const ch = h / c.rows;
      doc.setDrawColor(90, 150, 190);
      doc.setLineWidth(0.1);
      for (let i = 1; i < c.cols; i++) doc.line(x + i * cw, y, x + i * cw, y + h);
      for (let j = 1; j < c.rows; j++) doc.line(x, y + j * ch, x + w, y + j * ch);
      doc.setLineWidth(0.2);
      if (g && cw > 3 && ch > 2.5) {
        doc.setTextColor(127, 212, 255);
        doc.setFontSize(Math.max(3, Math.min(7, cw * 0.9, ch * 1.3)));
        for (let r = 0; r < c.rows; r++)
          for (let col = 0; col < c.cols; col++)
            doc.text(String(g.start + r * c.cols + col), x + col * cw + cw / 2, y + r * ch + ch / 2 + 1, {
              align: "center",
            });
      }
      doc.setTextColor(20, 20, 20);
      doc.setFontSize(8);
      doc.text(s.name.toUpperCase(), x + w / 2, y - 6, { align: "center" });
      doc.setFontSize(7);
      doc.text(`${s.physicalWidth} m`, x + w / 2, y - 2, { align: "center" });
      doc.text(`${s.physicalHeight} m`, x + w + 1.5, y + h / 2);
      doc.text(`${c.cols}×${c.rows} = ${c.total} panels`, x + w / 2, y + h + 4, { align: "center" });
    });
  }

  // Screen table
  let y = drawTop + drawH + 10;
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 20);
  doc.text("LED SCREEN SCHEDULE", M, y);
  y += 4;
  const cols = [
    ["Screen", 40],
    ["Size (m)", 30],
    ["Panel size (m)", 30],
    ["Pitch", 18],
    ["Panels (C×R)", 30],
    ["Total panels", 24],
    ["Resolution (px)", 32],
    ["Processor", 50],
    ["Port / Out", 26],
    ["Grid range", 30],
    ["Position X/Y/Z (m)", 40],
  ] as const;
  const row = (vals: string[], header = false) => {
    let x = M;
    if (header) {
      doc.setFillColor(230, 233, 238);
      doc.rect(M, y - 4, W - 2 * M, 6, "F");
    }
    doc.setFontSize(8);
    vals.forEach((v, i) => {
      doc.text(v, x + 1, y);
      x += cols[i]![1];
    });
    y += 6;
  };
  row(cols.map((c) => c[0]), true);
  let totalPanels = 0;
  screens.forEach((s) => {
    const c = cabinetCalc(s);
    const g = grids.get(s.id);
    totalPanels += c.total;
    row([
      s.name,
      `${s.physicalWidth} × ${s.physicalHeight}`,
      `${c.cabinetWidth} × ${c.cabinetHeight}`,
      `P${s.pixelPitch}`,
      `${c.cols} × ${c.rows}`,
      String(c.total),
      `${s.pixelWidth} × ${s.pixelHeight}`,
      g?.processorName ?? "—",
      `P${s.rj45Port} / O${s.processorOutput}`,
      g ? `${g.start}–${g.start + g.count - 1}` : "—",
      `${s.position.x.toFixed(2)} / ${s.position.y.toFixed(2)} / ${s.position.z.toFixed(2)}`,
    ]);
  });

  // Processors + totals
  y += 4;
  doc.setFontSize(10);
  doc.text("PROCESSORS", M, y);
  y += 6;
  doc.setFontSize(8);
  project.processors
    .filter((p) => screens.some((s) => (s.processorId ?? project.processors[0]?.id) === p.id))
    .forEach((p) => {
      const assigned = screens.filter((s) => (s.processorId ?? project.processors[0]?.id) === p.id);
      const panels = assigned.reduce((n, s) => n + cabinetCalc(s).total, 0);
      const px = assigned.reduce((n, s) => n + s.pixelWidth * s.pixelHeight, 0);
      doc.text(
        `${p.brand} ${p.label}${p.name ? ` (${p.name})` : ""} — ${p.outputs} ports · ${panels} panels · ${px.toLocaleString()} / ${p.maxPixels.toLocaleString()} px · input ${p.inputWidth ?? "—"}×${p.inputHeight ?? "—"} · screens: ${assigned.map((s) => s.name).join(", ")}`,
        M,
        y,
      );
      y += 5;
    });

  y += 3;
  const st = project.stage;
  doc.text(
    `STAGE ${st.width} × ${st.depth} × ${st.height} m  |  CANVAS ${project.canvas.width} × ${project.canvas.height} px  |  TOTAL LED PANELS: ${totalPanels}  |  SCREENS: ${screens.length}`,
    M,
    y,
  );

  doc.setFontSize(7);
  doc.setTextColor(120);
  doc.text(`Generated ${new Date().toLocaleString()} · DX5VE LED Stage Designer`, M, H - 6);

  // Page 2 — content canvas
  doc.addPage("a3", "landscape");
  doc.setFillColor(12, 16, 24);
  doc.rect(0, 0, W, 22, "F");
  doc.setTextColor(255, 157, 46);
  doc.setFontSize(16);
  doc.text(`CONTENT CANVAS — ${project.canvas.width} × ${project.canvas.height} px`, M, 14);

  const media = await Promise.all(
    (project.media ?? []).map(async (m) =>
      !m.src && m.assetId ? { ...m, src: (await getAsset(m.assetId)) ?? undefined } : m,
    ),
  );
  const boxW = W - 2 * M;
  const boxH = 150;
  const cs = Math.min(boxW / project.canvas.width, boxH / project.canvas.height);
  const cw = project.canvas.width * cs;
  const chh = project.canvas.height * cs;
  const cx0 = M + (boxW - cw) / 2;
  const cy0 = 30;
  const comp = await renderComposite(project.canvas, media);
  if (comp) doc.addImage(comp.toDataURL("image/jpeg", 0.9), "JPEG", cx0, cy0, cw, chh);
  else {
    doc.setFillColor(0, 0, 0);
    doc.rect(cx0, cy0, cw, chh, "F");
  }
  doc.setDrawColor(150);
  doc.rect(cx0, cy0, cw, chh);
  screens.forEach((s) => {
    doc.setDrawColor(255, 157, 46);
    doc.setLineWidth(0.4);
    doc.rect(cx0 + s.content.x * cs, cy0 + s.content.y * cs, s.content.width * cs, s.content.height * cs);
    doc.setTextColor(255, 157, 46);
    doc.setFontSize(7);
    doc.text(
      `${s.name.toUpperCase()} · ${s.content.x},${s.content.y} · ${s.content.width}×${s.content.height}`,
      cx0 + s.content.x * cs + 1.5,
      cy0 + s.content.y * cs + 4,
    );
  });
  doc.setLineWidth(0.2);

  y = cy0 + chh + 12;
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(10);
  doc.text("MEDIA LAYERS", M, y);
  y += 4;
  const mcols = [["Layer", 80], ["Type", 25], ["Position X,Y (px)", 40], ["Size W×H (px)", 40], ["Fit", 25], ["Opacity", 22], ["Visible", 20], ["On screens", 120]] as const;
  const mrow = (vals: string[], header = false) => {
    let x = M;
    if (header) {
      doc.setFillColor(230, 233, 238);
      doc.rect(M, y - 4, W - 2 * M, 6, "F");
    }
    doc.setFontSize(8);
    vals.forEach((v, i) => {
      doc.text(v, x + 1, y);
      x += mcols[i]![1];
    });
    y += 6;
  };
  mrow(mcols.map((c) => c[0]), true);
  [...media].sort((a, b) => b.z - a.z).forEach((m) => {
    if (y > H - 12) return;
    const on = screens
      .filter((s) => m.x < s.content.x + s.content.width && m.x + m.width > s.content.x && m.y < s.content.y + s.content.height && m.y + m.height > s.content.y)
      .map((s) => s.name)
      .join(", ");
    mrow([
      m.kind === "text" ? `${m.name} ("${(m.text ?? "").slice(0, 30)}")` : m.name.slice(0, 45),
      m.kind,
      `${m.x}, ${m.y}`,
      `${m.width} × ${m.height}`,
      m.fit,
      `${Math.round(m.opacity * 100)}%`,
      m.visible ? "Yes" : "No",
      on || "—",
    ]);
  });
  if (!media.length) mrow(["No media on the content canvas", "", "", "", "", "", "", ""]);

  doc.save(`${project.name.replace(/\s+/g, "-").toLowerCase()}-design-spec.pdf`);
}
