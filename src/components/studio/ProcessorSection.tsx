import { useEditor } from "@/lib/led/store";
import type { LedScreen } from "@/lib/led/types";
import { computeGridNumbers } from "@/lib/led/grid-numbering";
import { processorName } from "@/lib/led/types";
import { Readout, Section, SelectField } from "./Field";

interface Props {
  screen: LedScreen;
}

export function ProcessorSection({ screen }: Props) {
  const project = useEditor((s) => s.project);
  const updateScreen = useEditor((s) => s.updateScreen);
  const renumberGrids = useEditor((s) => s.renumberGrids);

  if (!project) return null;
  const processors = project.processors;
  const active = processors.find((p) => p.id === screen.processorId) ?? processors[0]!;
  const pixels = screen.pixelWidth * screen.pixelHeight;
  const load = active.maxPixels > 0 ? (pixels / active.maxPixels) * 100 : 0;
  const assignment = computeGridNumbers(project).get(screen.id);

  return (
    <Section title="Video Processor">
      <SelectField
        label="Processor"
        value={active.id}
        options={processors.map((p) => ({ value: p.id, label: processorName(p) }))}
        onChange={(processorId) => updateScreen(screen.id, { processorId })}
      />
      <SelectField
        label="RJ45 Port"
        value={String(screen.rj45Port)}
        options={Array.from({ length: active.outputs }, (_, i) => ({
          value: String(i + 1),
          label: `RJ45 Port ${i + 1}`,
        }))}
        onChange={(v) => updateScreen(screen.id, { rj45Port: Number(v) })}
      />
      <SelectField
        label="Logical Output"
        value={String(screen.processorOutput)}
        options={Array.from({ length: active.outputs }, (_, i) => ({
          value: String(i + 1),
          label: `Output ${i + 1}`,
        }))}
        onChange={(v) => updateScreen(screen.id, { processorOutput: Number(v) })}
      />

      <Readout
        rows={[
          ["SOURCE IN", `${active.inputWidth ?? 1920} × ${active.inputHeight ?? 1080} px`],
          ["CAPACITY", `${active.maxPixels.toLocaleString()} px`],
          ["SCREEN LOAD", `${load.toFixed(1)}%`, load > 100 ? "text-destructive" : undefined],
          ["PHYSICAL PORT", `RJ45 Port ${screen.rj45Port}`, "text-right text-[#7fd4ff]"],
          ["OUTPUT MAX", `${active.outputWidth} × ${active.outputHeight}`],
          [
            "GRID RANGE",
            assignment
              ? `${active.label} – Grid ${assignment.start}${
                  assignment.count > 1 ? `–${assignment.start + assignment.count - 1}` : ""
                }`
              : "—",
            "text-right text-primary",
          ],
        ]}
      />

      <button
        type="button"
        onClick={renumberGrids}
        className="mt-2 w-full border border-border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
      >
        Renumber grids (left → right)
      </button>
    </Section>
  );
}
