import { jsPDF } from "jspdf";
import type { Project } from "./types";
import { billOfMaterials } from "./engineering";

export function downloadEquipmentPdf(project: Project) {
  const rows = billOfMaterials(project);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = 297, H = 210, M = 12;
  const cols = [
    { k: "item", t: "ITEM", w: 70 }, { k: "model", t: "MODEL", w: 40 }, { k: "qty", t: "QTY", w: 14 },
    { k: "location", t: "LOCATION", w: 34 }, { k: "spec", t: "SPEC", w: 60 }, { k: "notes", t: "NOTES", w: 55 },
  ] as const;
  let page = 0;
  const header = () => {
    page++;
    doc.setFillColor(18, 18, 18); doc.rect(0, 0, W, H, "F");
    doc.setTextColor(52, 211, 153); doc.setFont("helvetica", "bold"); doc.setFontSize(16);
    doc.text("EQUIPMENT LIST", M, 16);
    doc.setTextColor(200, 200, 200); doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text(`${project.name} · ${new Date().toLocaleDateString()}`, M, 22);
    doc.text(`Page ${page}`, W - M, H - 6, { align: "right" });
    doc.text("dx5ve studio", M, H - 6);
    let x = M;
    doc.setFillColor(52, 211, 153); doc.rect(M, 28, W - 2 * M, 7, "F");
    doc.setTextColor(10, 10, 10); doc.setFont("helvetica", "bold"); doc.setFontSize(8);
    for (const c of cols) { doc.text(c.t, x + 1.5, 32.8); x += c.w; }
    return 39;
  };
  let y = header();
  doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  rows.forEach((r, i) => {
    const cells = cols.map((c) => doc.splitTextToSize(String(r[c.k] ?? ""), c.w - 3) as string[]);
    const h = Math.max(...cells.map((l) => l.length)) * 3.6 + 2;
    if (y + h > H - 12) { y = header(); doc.setFont("helvetica", "normal"); doc.setFontSize(8); }
    if (i % 2) { doc.setFillColor(30, 30, 30); doc.rect(M, y - 3.5, W - 2 * M, h, "F"); }
    doc.setTextColor(230, 230, 230);
    let x = M;
    cells.forEach((l, ci) => { doc.text(l, x + 1.5, y); x += cols[ci].w; });
    y += h;
  });
  doc.save(`${project.name}-equipment-list.pdf`);
}
