import { useState } from "react";
import { FileText, Sheet, Image as ImageIcon, PenTool } from "lucide-react";
import { downloadDxf, downloadPixelMapPng } from "@/lib/led/pixel-map-export";
import { getAsset } from "@/lib/led/asset-store";
import { useEditor } from "@/lib/led/store";
import { billOfMaterials, bomCsv, globalLayout, graphicsSpec, graphicsSpecCsv, powerSettings } from "@/lib/led/engineering";
import { downloadTechnicalReport } from "@/lib/led/export-technical-report";
import { Button } from "@/components/ui/button";
import { ProcessorGuideSection } from "./ProcessorGuideSection";
import { NumberField, Readout, Section } from "./Field";

export function EngineeringSection() {
  const project = useEditor((s) => s.project);
  const setPower = useEditor((s) => s.setPower);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!project) return null;
  const ps = powerSettings(project);
  const layout = globalLayout(project);

  const downloadCsv = (csv: string, suffix: string) => {
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${project.name}-${suffix}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <Section title="Global Pixel Canvas">
        <Readout rows={[
          ["CANVAS", `${layout.canvasWidth} × ${layout.canvasHeight} px`],
          ["ACTIVE PANELS", `${layout.totalCabinets}`],
          ["ACTIVE AREA", `${layout.activeAreaM2.toFixed(2)} m²`],
          ["FOOTPRINT", `${layout.footprintWidthM.toFixed(2)} × ${layout.footprintHeightM.toFixed(2)} m`],
          ["UNUSED CANVAS", `${layout.unusedPixels.toLocaleString()} px`],
        ]} />
      </Section>
      <Section title="Power Planning">
        <p className="mb-2 text-[10px] text-muted-foreground">Enter figures from the cabinet datasheet and venue supply. Nothing is assumed.</p>
        <NumberField label="Cabinet max power" suffix="W" min={0} value={ps.cabinetMaxW ?? 0} onChange={(v) => setPower({ cabinetMaxW: v > 0 ? v : undefined })} />
        <NumberField label="Cabinet typical power" suffix="W" min={0} value={ps.cabinetTypW ?? 0} onChange={(v) => setPower({ cabinetTypW: v > 0 ? v : undefined })} />
        <NumberField label="Supply voltage" suffix="V" min={1} value={ps.voltage} onChange={(v) => setPower({ voltage: v })} />
        <NumberField label="Circuit rating" suffix="A" min={0} value={ps.circuitAmps ?? 0} onChange={(v) => setPower({ circuitAmps: v > 0 ? v : undefined })} />
        <NumberField label="Usable load limit" suffix="%" min={1} value={ps.loadLimitPct} onChange={(v) => setPower({ loadLimitPct: Math.min(100, v) })} />
        <NumberField label="Data cable run to screens" suffix="m" min={0} value={ps.dataHomeRunM ?? 0} onChange={(v) => setPower({ dataHomeRunM: v > 0 ? v : undefined })} />
        <div className="mt-1 flex gap-1">
          {([1, 3] as const).map((n) => (
            <Button key={n} size="sm" variant={ps.phases === n ? "secondary" : "ghost"} onClick={() => setPower({ phases: n })}>{n}-phase</Button>
          ))}
        </div>
      </Section>
      <ProcessorGuideSection />
      <Section title="Reports">
        <div className="flex flex-col gap-2">
          <Button size="sm" disabled={busy} onClick={async () => { setBusy(true); setError(""); try { await downloadTechnicalReport(project); } catch { setError("Could not create the report. Please try again."); } finally { setBusy(false); } }}>
            <FileText /> {busy ? "Generating…" : "Technical report (PDF)"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => downloadCsv(bomCsv(billOfMaterials(project)), "equipment-list")}><Sheet /> Equipment list (CSV)</Button>
          <Button size="sm" variant="outline" onClick={() => downloadCsv(graphicsSpecCsv(graphicsSpec(project)), "graphics-spec")}><Sheet /> Graphics spec for designer (CSV)</Button>
          <Button size="sm" variant="outline" onClick={async () => { setError(""); try { const logo = project.meta.coverImage ?? (project.meta.coverAssetId ? await getAsset(project.meta.coverAssetId) : null); await downloadPixelMapPng(project, logo); } catch { setError("Could not create the pixel map image."); } }}><ImageIcon /> Pixel map image (PNG, {layout.canvasWidth}×{layout.canvasHeight})</Button>
          <Button size="sm" variant="outline" onClick={() => downloadDxf(project)}><PenTool /> AutoCAD drawing (DXF, 1:1 mm)</Button>
          {error && <p className="text-[10px] text-destructive">{error}</p>}
        </div>
      </Section>
    </>
  );
}
