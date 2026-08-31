import { useEditor, groupResolution } from "@/lib/led/store";
import type { LedScreen } from "@/lib/led/types";
import { computeGridNumbers } from "@/lib/led/grid-numbering";
import { processorName } from "@/lib/led/types";
import {
  processorChain,
  STATUS_ICON,
  STATUS_LABEL,
  STATUS_TONE,
} from "@/lib/led/resolution";
import { Readout, Section, SelectField } from "./Field";
import { PortMap } from "./PortMap";
import { processorPortMap, portsNeeded } from "@/lib/led/ports";

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
  const group = screen.groupId ? groupResolution(project, screen.groupId) : null;
  const chain = processorChain(project, active);
  const portMapData = processorPortMap(project, active);
  const span = Math.max(1, Math.round(screen.portSpan ?? 1));
  const needed = portsNeeded(screen, active);
  const myPorts = portMapData.ports.filter(
    (p) => p.port >= screen.rj45Port && p.port < screen.rj45Port + span,
  );
  const screenPixels = myPorts.reduce((sum, p) => sum + p.pixels, 0);
  const scalingLabel: Record<string, string> = {
    "1:1": "1:1 — pixel perfect",
    upscale: "Upscaling source → LED",
    downscale: "Downscaling source → LED",
    letterbox: "Letterboxing (pillar/letter bars)",
    crop: "Cropping (source wider than LED)",
  };

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
          ...(group
            ? ([
                [
                  "GROUP RES",
                  `${group.width} × ${group.height} px (${group.count} sections)`,
                  "text-right text-primary",
                ],
                ["THIS SECTION", `${screen.pixelWidth} × ${screen.pixelHeight} px`],
              ] as [string, string, string?][])
            : []),
          [
            "PORT SPAN",
            span > 1
              ? `RJ45 ${screen.rj45Port}–${screen.rj45Port + span - 1} (${span} ports)`
              : `RJ45 ${screen.rj45Port} (1 port)`,
            needed > span ? "text-right text-destructive" : "text-right text-[#7fd4ff]",
          ],
          [
            "PORTS REQUIRED",
            `${needed} at ${(active.portMaxPixels ?? 650000).toLocaleString()} px/port`,
            needed > span ? "text-right text-destructive" : undefined,
          ],
          ["SECTION LOAD", `${screenPixels.toLocaleString()} px on these ports`],
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

      <div className="mt-3 border-t border-border pt-2">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Signal chain
        </div>
        <Readout
          rows={[
            ["1 · SOURCE", `${chain.sourceWidth} × ${chain.sourceHeight} px (laptop / playback)`],
            [
              "2 · PROC IN",
              `${chain.sourceWidth} × ${chain.sourceHeight} · max ${active.maxInputWidth ?? 1920} × ${active.maxInputHeight ?? 1080}`,
            ],
            [
              "3 · MAPPING",
              chain.ledWidth > 0 ? `${chain.ledWidth} × ${chain.ledHeight} px canvas` : "—",
            ],
            [
              "4 · LED WALL",
              `${chain.ledPixels.toLocaleString()} px · ${chain.screens} section(s) · ${chain.portsUsed}/${active.outputs} ports`,
            ],
            ["SCALING", scalingLabel[chain.scaling] ?? chain.scaling],
            [
              "CHAIN STATUS",
              `${STATUS_ICON[chain.status]} ${STATUS_LABEL[chain.status]}`,
              STATUS_TONE[chain.status],
            ],
          ]}
        />
        {chain.notes.length > 0 && (
          <ul className="mt-2 space-y-1 text-[10px] leading-relaxed text-muted-foreground">
            {chain.notes.map((n) => (
              <li key={n}>• {n}</li>
            ))}
          </ul>
        )}
      </div>

      <PortMap project={project} processor={active} />

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
