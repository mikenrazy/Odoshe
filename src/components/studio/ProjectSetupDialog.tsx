import { useState } from "react";
import { X } from "lucide-react";
import { useEditor, type ProjectSetup } from "@/lib/led/store";
import {
  DEFAULT_PROCESSORS,
  RESOLUTION_PRESETS,
  type AspectPreset,
  type UnitSystem,
} from "@/lib/led/types";
import { fromDisplay, toDisplay, unitSuffix } from "@/lib/led/units";
import { DateField, NumberField, SelectField, TextAreaField, TextField } from "./Field";

interface Props {
  onClose: () => void;
  onCreate: (projectId: string) => void;
}

export function ProjectSetupDialog({ onClose, onCreate }: Props) {
  const newProject = useEditor((s) => s.newProject);
  const [setup, setSetup] = useState<ProjectSetup>({
    name: "",
    client: "",
    venue: "",
    eventDate: "",
    notes: "",
    units: "metric",
    stageWidth: 15,
    stageDepth: 6,
    stageHeight: 0.6,
    aspectPreset: "16:9",
    canvasWidth: 3840,
    canvasHeight: 1080,
    pixelPitch: 3.9,
    processorId: DEFAULT_PROCESSORS[0]!.id,
    outputs: 2,
  });

  const patch = (p: Partial<ProjectSetup>) => setSetup((s) => ({ ...s, ...p }));
  const suffix = unitSuffix(setup.units);
  const disp = (v: number) => +toDisplay(v, setup.units).toFixed(2);
  const store = (v: number) => +fromDisplay(v, setup.units).toFixed(4);

  const create = () => {
    const project = newProject(setup.name.trim() || "Untitled Show", setup);
    onCreate(project.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/85 p-6">
      <div className="w-full max-w-lg border border-border bg-card">
        <header className="flex items-center justify-between border-b border-border bg-secondary/40 px-4 py-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground">
            Project Setup
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="max-h-[70vh] overflow-y-auto px-4 py-3">
          <Group title="Event">
            <TextField label="Project / Event" value={setup.name} onChange={(name) => patch({ name })} />
            <TextField label="Client" value={setup.client} onChange={(client) => patch({ client })} />
            <TextField label="Venue" value={setup.venue} onChange={(venue) => patch({ venue })} />
            <DateField
              label="Event Date"
              value={setup.eventDate}
              onChange={(eventDate) => patch({ eventDate })}
            />
            <SelectField
              label="Units"
              value={setup.units}
              options={[
                { value: "metric", label: "Metric (m)" },
                { value: "imperial", label: "Feet / Inches" },
              ]}
              onChange={(units) => patch({ units: units as UnitSystem })}
            />
          </Group>

          <Group title="Stage">
            <NumberField
              label="Stage Width"
              suffix={suffix}
              min={1}
              value={disp(setup.stageWidth)}
              onChange={(v) => patch({ stageWidth: store(v) })}
            />
            <NumberField
              label="Stage Depth"
              suffix={suffix}
              min={1}
              value={disp(setup.stageDepth)}
              onChange={(v) => patch({ stageDepth: store(v) })}
            />
            <NumberField
              label="Stage Height"
              suffix={suffix}
              min={0.05}
              step={0.05}
              value={disp(setup.stageHeight)}
              onChange={(v) => patch({ stageHeight: store(v) })}
            />
          </Group>

          <Group title="Canvas & LED">
            <SelectField
              label="Aspect Ratio"
              value={setup.aspectPreset}
              options={[
                { value: "16:9", label: "16:9" },
                { value: "32:9", label: "32:9" },
                { value: "custom", label: "Custom" },
              ]}
              onChange={(v) => patch({ aspectPreset: v as AspectPreset })}
            />
            <SelectField
              label="Output Resolution"
              value={
                RESOLUTION_PRESETS.find(
                  (p) => p.width === setup.canvasWidth && p.height === setup.canvasHeight,
                )?.key ?? "custom"
              }
              options={RESOLUTION_PRESETS.map((p) => ({ value: p.key, label: p.label }))}
              onChange={(key) => {
                const preset = RESOLUTION_PRESETS.find((p) => p.key === key);
                if (!preset || preset.key === "custom") return;
                patch({ canvasWidth: preset.width, canvasHeight: preset.height });
              }}
            />
            <NumberField
              label="Canvas Width"
              suffix="px"
              step={16}
              min={16}
              value={setup.canvasWidth}
              onChange={(canvasWidth) => patch({ canvasWidth: Math.round(canvasWidth) })}
            />
            <NumberField
              label="Canvas Height"
              suffix="px"
              step={16}
              min={16}
              value={setup.canvasHeight}
              onChange={(canvasHeight) => patch({ canvasHeight: Math.round(canvasHeight) })}
            />
            <NumberField
              label="LED Pixel Pitch"
              suffix="mm"
              step={0.1}
              min={0.5}
              value={setup.pixelPitch}
              onChange={(pixelPitch) => patch({ pixelPitch })}
            />
            <SelectField
              label="LED Processor"
              value={setup.processorId}
              options={DEFAULT_PROCESSORS.map((p) => ({
                value: p.id,
                label: `${p.brand} ${p.label}`,
              }))}
              onChange={(processorId) => patch({ processorId })}
            />
            <NumberField
              label="LED Outputs"
              step={1}
              min={1}
              max={32}
              value={setup.outputs}
              onChange={(outputs) => patch({ outputs: Math.round(outputs) })}
            />
          </Group>

          <Group title="Notes">
            <TextAreaField
              label="Notes"
              value={setup.notes}
              onChange={(notes) => patch({ notes })}
            />
          </Group>
        </div>

        <footer className="flex items-center gap-2 border-t border-border px-4 py-3">
          <button
            onClick={onClose}
            className="border border-border px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={create}
            className="ml-auto bg-primary px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary-foreground hover:bg-primary/85"
          >
            Create project
          </button>
        </footer>
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-3 border-b border-border pb-2 last:border-0">
      <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}
