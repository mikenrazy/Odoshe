import { useEditor } from "@/lib/led/store";
import { aspectLabel, cabinetCalc, projectSummary } from "@/lib/led/calc";
import { formatArea, formatLength } from "@/lib/led/units";
import { Readout, Section } from "../Field";
import { EngineeringSection } from "../EngineeringSection";

export function SummaryPanel() {
  const project = useEditor((s) => s.project);
  if (!project) return null;

  const units = project.meta.units;
  const summary = projectSummary(project);
  const primary = [...project.screens].sort(
    (a, b) => b.physicalWidth * b.physicalHeight - a.physicalWidth * a.physicalHeight,
  )[0];
  const processor = project.processors.find((p) => p.id === primary?.processorId);

  return (
    <>
      <Section title="Project Summary">
        <Readout
          rows={[
            ["STAGE", formatLength(project.stage.width, units) + " wide"],
            [
              "LED",
              primary
                ? `${formatLength(primary.physicalWidth, units)} × ${formatLength(
                    primary.physicalHeight,
                    units,
                  )}`
                : "—",
            ],
            ["CANVAS", `${project.canvas.width} × ${project.canvas.height}`],
            [
              "ASPECT RATIO",
              `${project.canvas.aspectPreset} (${aspectLabel(project.canvas.width, project.canvas.height)})`,
            ],
            ["PROCESSOR", processor ? `${processor.brand} ${processor.label}` : "—"],
          ]}
        />
      </Section>

      <Section title="Calculated Totals">
        <Readout
          rows={[
            ["TOTAL LED AREA", formatArea(summary.totalLedArea, units)],
            ["TOTAL CABINETS", String(summary.totalCabinets)],
            ["LED RESOLUTION", `${summary.totalPixels.toLocaleString()} px`],
            ["PROCESSORS", String(summary.processorCount)],
            ["PROCESSOR OUTPUTS", String(summary.processorOutputs)],
            ["CAMERAS", String(summary.cameraCount)],
            ["LIGHTING FIXTURES", String(summary.lightingCount)],
            ["STRUCTURAL ELEMENTS", String(summary.structureCount)],
            ["FURNITURE", String(summary.furnitureCount)],
          ]}
        />
      </Section>

      <Section title="LED Surfaces">
        {project.screens.length === 0 && (
          <p className="text-[11px] text-muted-foreground">No LED surfaces configured.</p>
        )}
        {project.screens.map((screen) => {
          const calc = cabinetCalc(screen);
          return (
            <div key={screen.id} className="border-b border-border/60 py-2 last:border-0">
              <div className="text-[11px] font-medium uppercase tracking-wider text-foreground">
                {screen.name}
              </div>
              <div className="font-mono text-[10px] text-muted-foreground">
                {formatLength(calc.actualWidth, units)} × {formatLength(calc.actualHeight, units)} ·{" "}
                {calc.cols}×{calc.rows} cabinets · {screen.pixelWidth}×{screen.pixelHeight} px
              </div>
              {calc.warnings.length > 0 && (
                <div className="mt-1 font-mono text-[10px] text-[#ffb454]">
                  {calc.warnings.length} cabinet warning{calc.warnings.length > 1 ? "s" : ""}
                </div>
              )}
            </div>
          );
        })}
      </Section>
      <EngineeringSection />
    </>
  );
}
