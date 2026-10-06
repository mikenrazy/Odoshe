import type { Project } from "./types";
import { cabinetCalc } from "./calc";
import { computeGridNumbers } from "./grid-numbering";
import { cropRegion, renderComposite } from "./media";
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
  const coverImage =
    project.meta.coverImage ??
    (project.meta.coverAssetId ? await getAsset(project.meta.coverAssetId) : null);
  const media = await Promise.all(
    (project.media ?? []).map(async (item) =>
      !item.src && item.assetId
        ? { ...item, src: (await getAsset(item.assetId)) ?? undefined }
        : item,
    ),
  );
  const composite = await renderComposite(project.canvas, media);

  if (coverImage) {
    doc.setFillColor(12, 16, 24);
    doc.rect(0, 0, W, H, "F");
    const imageProps = doc.getImageProperties(coverImage);
    const imageAreaW = W - 2 * M;
    const imageAreaH = H - 62;
    const imageScale = Math.min(imageAreaW / imageProps.width, imageAreaH / imageProps.height);
    const imageW = imageProps.width * imageScale;
    const imageH = imageProps.height * imageScale;
    const imageX = (W - imageW) / 2;
    const imageY = 12 + (imageAreaH - imageH) / 2;
    doc.addImage(coverImage, imageProps.fileType, imageX, imageY, imageW, imageH);
    doc.setTextColor(255, 157, 46);
    doc.setFontSize(18);
    doc.text(project.name.toUpperCase(), M, H - 35);
    doc.setTextColor(220, 226, 236);
    doc.setFontSize(10);
    doc.text("LED STAGE DESIGN SPECIFICATION", M, H - 27);
    doc.setFontSize(8);
    doc.text(
      `Client: ${project.meta.client || "—"}  |  Venue: ${project.meta.venue || "—"}  |  Date: ${project.meta.eventDate || "—"}`,
      M,
      H - 19,
    );
    doc.setTextColor(140, 150, 165);
    doc.text("DX5VE Studio", W - M, H - 19, { align: "right" });
    doc.addPage("a3", "landscape");
  }

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

  // Production plan — dedicated, readable front elevation
  doc.addPage("a3", "landscape");
  doc.setFillColor(12, 16, 24);
  doc.rect(0, 0, W, 24, "F");
  doc.setTextColor(255, 157, 46);
  doc.setFontSize(16);
  doc.text("PRODUCTION PLAN · FRONT ELEVATION", M, 14);
  doc.setTextColor(220, 226, 236);
  doc.setFontSize(8);
  doc.text(`${project.name} · ${project.meta.venue || "Venue TBC"} · ${project.meta.eventDate || "Date TBC"}`, W - M, 14, {
    align: "right",
  });

  const planX = M;
  const planY = 34;
  const planW = 282;
  const planH = 230;
  const infoX = planX + planW + 8;
  const infoW = W - M - infoX;
  doc.setFillColor(247, 249, 252);
  doc.setDrawColor(180, 190, 204);
  doc.rect(planX, planY, planW, planH, "FD");

  const stage = project.stage;
  const leftExtent = Math.min(
    -stage.width / 2,
    ...screens.map((screen) => screen.position.x - screen.physicalWidth / 2),
  );
  const rightExtent = Math.max(
    stage.width / 2,
    ...screens.map((screen) => screen.position.x + screen.physicalWidth / 2),
  );
  const highestPoint = Math.max(
    stage.height,
    stage.backWall ? stage.backWallHeight : 0,
    ...screens.map((screen) => screen.position.y + screen.physicalHeight / 2),
  );
  const worldWidth = Math.max(1, rightExtent - leftExtent);
  const worldHeight = Math.max(1, highestPoint);
  const planScale = Math.min((planW - 32) / worldWidth, (planH - 38) / worldHeight);
  const worldToX = (value: number) =>
    planX + 16 + (planW - 32 - worldWidth * planScale) / 2 + (value - leftExtent) * planScale;
  const floorLineY = planY + planH - 19;
  const worldToY = (value: number) => floorLineY - value * planScale;

  // Metre grid, centre line and floor datum.
  doc.setLineWidth(0.12);
  doc.setDrawColor(224, 229, 236);
  for (let metre = Math.ceil(leftExtent); metre <= Math.floor(rightExtent); metre += 1) {
    doc.line(worldToX(metre), planY + 9, worldToX(metre), floorLineY);
  }
  for (let metre = 1; metre <= Math.floor(highestPoint); metre += 1) {
    doc.line(planX + 8, worldToY(metre), planX + planW - 8, worldToY(metre));
  }
  doc.setDrawColor(255, 157, 46);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(worldToX(0), planY + 8, worldToX(0), floorLineY);
  doc.setLineDashPattern([], 0);
  doc.setDrawColor(60, 70, 84);
  doc.setLineWidth(0.45);
  doc.line(planX + 7, floorLineY, planX + planW - 7, floorLineY);
  doc.setTextColor(70, 80, 94);
  doc.setFontSize(6.5);
  doc.text("FLOOR DATUM 0.00 m", planX + 9, floorLineY - 2);
  doc.text("CL", worldToX(0) + 1.5, planY + 13);

  // Stage deck and back wall.
  const stageLeft = worldToX(-stage.width / 2);
  const stageRight = worldToX(stage.width / 2);
  const stageTop = worldToY(stage.height);
  doc.setFillColor(45, 52, 64);
  doc.setDrawColor(24, 28, 36);
  doc.rect(stageLeft, stageTop, stageRight - stageLeft, Math.max(2, stage.height * planScale), "FD");
  if (stage.backWall) {
    doc.setFillColor(228, 232, 239);
    doc.setDrawColor(125, 135, 150);
    doc.rect(stageLeft, worldToY(stage.backWallHeight), stageRight - stageLeft, (stage.backWallHeight - stage.height) * planScale, "FD");
  }

  screens.forEach((screen) => {
    const calc = cabinetCalc(screen);
    const grid = grids.get(screen.id);
    const screenLeft = worldToX(screen.position.x - screen.physicalWidth / 2);
    const screenTop = worldToY(screen.position.y + screen.physicalHeight / 2);
    const screenW = screen.physicalWidth * planScale;
    const screenH = screen.physicalHeight * planScale;
    doc.setFillColor(18, 40, 58);
    doc.setDrawColor(30, 132, 185);
    doc.setLineWidth(0.45);
    doc.rect(screenLeft, screenTop, screenW, screenH, "FD");
    const screenContent = composite
      ? cropRegion(composite, project.canvas.width, screen.content)
      : screen.contentImage;
    if (screenContent) {
      doc.addImage(screenContent, "JPEG", screenLeft, screenTop, screenW, screenH);
      doc.setDrawColor(30, 132, 185);
      doc.setLineWidth(0.45);
      doc.rect(screenLeft, screenTop, screenW, screenH);
    }
    doc.setDrawColor(74, 126, 156);
    doc.setLineWidth(0.1);
    for (let col = 1; col < calc.cols; col += 1) {
      doc.line(screenLeft + (col * screenW) / calc.cols, screenTop, screenLeft + (col * screenW) / calc.cols, screenTop + screenH);
    }
    for (let rowIndex = 1; rowIndex < calc.rows; rowIndex += 1) {
      doc.line(screenLeft, screenTop + (rowIndex * screenH) / calc.rows, screenLeft + screenW, screenTop + (rowIndex * screenH) / calc.rows);
    }
    doc.setTextColor(20, 25, 32);
    doc.setFontSize(7.5);
    doc.text(screen.name.toUpperCase(), screenLeft + screenW / 2, screenTop - 7, { align: "center" });
    doc.setFontSize(6.5);
    doc.text(`${screen.physicalWidth.toFixed(2)} m`, screenLeft + screenW / 2, screenTop - 3, { align: "center" });
    doc.text(`${screen.physicalHeight.toFixed(2)} m`, screenLeft + screenW + 2, screenTop + screenH / 2);
    doc.setTextColor(118, 214, 255);
    doc.text(
      `${calc.cols} × ${calc.rows} · ${calc.total} panels${grid ? ` · grids ${grid.start}–${grid.start + grid.count - 1}` : ""}`,
      screenLeft + screenW / 2,
      screenTop + screenH / 2 + 2,
      { align: "center", maxWidth: Math.max(12, screenW - 3) },
    );
  });

  // Overall stage dimensions.
  doc.setDrawColor(255, 157, 46);
  doc.setLineWidth(0.3);
  const widthDimY = floorLineY + 8;
  doc.line(stageLeft, widthDimY, stageRight, widthDimY);
  doc.line(stageLeft, widthDimY - 2, stageLeft, widthDimY + 2);
  doc.line(stageRight, widthDimY - 2, stageRight, widthDimY + 2);
  doc.setTextColor(35, 39, 47);
  doc.setFontSize(7);
  doc.text(`STAGE WIDTH ${stage.width.toFixed(2)} m`, (stageLeft + stageRight) / 2, widthDimY - 1.5, { align: "center" });
  const heightDimX = planX + 9;
  doc.line(heightDimX, worldToY(highestPoint), heightDimX, floorLineY);
  doc.line(heightDimX - 2, worldToY(highestPoint), heightDimX + 2, worldToY(highestPoint));
  doc.line(heightDimX - 2, floorLineY, heightDimX + 2, floorLineY);
  doc.text(`MAX HEIGHT ${highestPoint.toFixed(2)} m`, heightDimX + 2, worldToY(highestPoint) + 4);

  // Right-side production summary.
  doc.setFillColor(238, 241, 246);
  doc.setDrawColor(190, 198, 210);
  doc.rect(infoX, planY, infoW, planH, "FD");
  let infoY = planY + 10;
  const infoHeading = (label: string) => {
    doc.setFillColor(24, 31, 42);
    doc.rect(infoX, infoY - 5.5, infoW, 8, "F");
    doc.setTextColor(255, 157, 46);
    doc.setFontSize(8);
    doc.text(label, infoX + 4, infoY);
    infoY += 9;
  };
  const infoLine = (label: string, value: string) => {
    doc.setTextColor(88, 98, 113);
    doc.setFontSize(6.5);
    doc.text(label.toUpperCase(), infoX + 4, infoY);
    doc.setTextColor(24, 29, 37);
    doc.setFontSize(7.5);
    const lines = doc.splitTextToSize(value, infoW - 42);
    doc.text(lines, infoX + 38, infoY);
    infoY += Math.max(6, lines.length * 4);
  };

  infoHeading("STAGE");
  infoLine("Overall", `${stage.width} × ${stage.depth} × ${stage.height} m`);
  infoLine("Shape", (stage.shape ?? "rectangle").replaceAll("-", " "));
  infoLine("Deck", (stage.deckFinish ?? "matte").replaceAll("-", " "));
  infoLine("Back wall", stage.backWall ? `${stage.backWallHeight} m high` : "Not included");
  infoHeading("LED SUMMARY");
  infoLine("Screens", String(screens.length));
  infoLine("Panels", String(totalPanels));
  infoLine("Canvas", `${project.canvas.width} × ${project.canvas.height} px`);
  infoLine("Refresh", `${project.canvas.refreshRate} Hz`);
  infoHeading("PROCESSING");
  project.processors
    .filter((processor) => screens.some((screen) => (screen.processorId ?? project.processors[0]?.id) === processor.id))
    .forEach((processor) => {
      const assigned = screens.filter((screen) => (screen.processorId ?? project.processors[0]?.id) === processor.id);
      const pixels = assigned.reduce((sum, screen) => sum + screen.pixelWidth * screen.pixelHeight, 0);
      infoLine(
        processor.name || `${processor.brand} ${processor.label}`,
        `${assigned.length} screen${assigned.length === 1 ? "" : "s"} · ${pixels.toLocaleString()} px · ${processor.outputs} ports`,
      );
    });
  infoHeading("DRAWING NOTES");
  infoLine("View", "Front elevation · dimensions in metres");
  infoLine("Status", "For production coordination — verify site conditions before build");

  doc.setFontSize(6.5);
  doc.setTextColor(110, 118, 130);
  doc.text("Drawing: FP-01  ·  Not to scale  ·  DX5VE Studio", M, H - 7);
  doc.text(`Generated ${new Date().toLocaleString()}`, W - M, H - 7, { align: "right" });

  doc.save(`${project.name.replace(/\s+/g, "-").toLowerCase()}-design-spec.pdf`);
}
