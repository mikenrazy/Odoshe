import { useEditor, groupResolution } from "@/lib/led/store";
import type { LedScreen } from "@/lib/led/types";
import { computeGridNumbers } from "@/lib/led/grid-numbering";
import { processorName } from "@/lib/led/types";
import {
  processorChain,
  recommendedSource,
  STATUS_ICON,
  STATUS_LABEL,
  STATUS_TONE,
} from "@/lib/led/resolution";
import { Readout, Section, SelectField } from "./Field";
import { PortMap } from "./PortMap";
import { processorPortMap, portsNeeded } from "@/lib/led/ports";
import { screenChains } from "@/lib/led/engineering";
import { isLvp615, senderReady } from "@/lib/led/vdwall";

interface Props {
  screen: LedScreen;
}

export function ProcessorSection({ screen }: Props) {
  const project = useEditor((s) => s.project);
  const updateScreen = useEditor((s) => s.updateScreen);
  const renumberGrids = useEditor((s) => s.renumberGrids);
  const updateProcessor = useEditor((s) => s.updateProcessor);

  if (!project) return null;
  const processors = project.processors;
  const active = processors.find((p) => p.id === screen.processorId) ?? processors[0];
  if (!active) return null;
  const pixels = screen.pixelWidth * screen.pixelHeight;
  const load = active.maxPixels > 0 ? (pixels / active.maxPixels) * 100 : 0;
  const assignment = computeGridNumbers(project).get(screen.id);
  const group = screen.groupId ? groupResolution(project, screen.groupId) : null;
  const chain = processorChain(project, active);
  const portMapData = processorPortMap(project, active);
  const shared = isLvp615(active) || project.groups?.some((g) => g.mappingMode === "shared-input" && project.screens.some((s) => s.processorId === active.id && s.groupId === g.id));
  const chains = screenChains(project, screen);
  const span = shared ? chains.length : Math.max(1, Math.round(screen.portSpan ?? 1));
  const startPort = shared ? chains[0]?.port ?? screen.rj45Port : screen.rj45Port;
  const needed = portsNeeded(screen, active);
  const myPorts = portMapData.ports.filter(
    (p) => p.port >= startPort && p.port < startPort + span,
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
      {!shared && senderReady(active) && <SelectField
        label="RJ45 Port"
        value={String(screen.rj45Port)}
        options={Array.from({ length: active.outputs }, (_, i) => ({
          value: String(i + 1),
          label: `RJ45 Port ${i + 1}`,
        }))}
        onChange={(v) => updateScreen(screen.id, { rj45Port: Number(v) })}
      />}
      {!isLvp615(active) && <SelectField
        label="Logical Output"
        value={String(screen.processorOutput)}
        options={Array.from({ length: active.outputs }, (_, i) => ({
          value: String(i + 1),
          label: `Output ${i + 1}`,
        }))}
        onChange={(v) => updateScreen(screen.id, { processorOutput: Number(v) })}
      />}

      <Readout
        rows={[
          ["SOURCE IN", `${active.inputWidth ?? 1920} × ${active.inputHeight ?? 1080} px`],
          ["CAPACITY", senderReady(active) ? `${active.maxPixels.toLocaleString()} px` : "Sender unconfirmed"],
          ["SCREEN LOAD", `${load.toFixed(1)}%`, load > 100 ? "text-destructive" : undefined],
          ["PHYSICAL PORT", isLvp615(active) ? senderReady(active) ? `Sender RJ45 ${startPort}` : "DVI → sender (unconfirmed)" : `RJ45 Port ${startPort}`, "text-right text-primary"],
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
              ? `RJ45 ${startPort}–${startPort + span - 1} (${span} ports)`
              : `RJ45 ${startPort} (1 port)`,
            needed > span ? "text-right text-destructive" : "text-right text-[#7fd4ff]",
          ],
          [
            "PORTS REQUIRED",
            senderReady(active) ? `${needed} at ${(active.portMaxPixels ?? 650000).toLocaleString()} px/port` : "Enter sender specifications in Video",
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
        {(() => {
          const rec = recommendedSource(active, chain.ledWidth, chain.ledHeight);
          if (chain.ledWidth === 0 || (rec.width === chain.sourceWidth && rec.height === chain.sourceHeight))
            return <p className="mt-2 text-[10px] text-[#4ade80]">Source resolution is the best match for this processor.</p>;
          return (
            <button
              type="button"
              onClick={() => updateProcessor(active.id, { inputWidth: rec.width, inputHeight: rec.height })}
              className="mt-2 w-full border border-primary px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary hover:bg-primary hover:text-primary-foreground"
            >
              Use compatible source {rec.width} × {rec.height}{rec.exact ? " (1:1)" : ""}
            </button>
          );
        })()}
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
