import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useEditor } from "@/lib/led/store";
import { NumberField, Readout, Section, SelectField, TextField } from "../Field";

export function ProcessorPanel() {
  const project = useEditor((s) => s.project);
  const addProcessor = useEditor((s) => s.addProcessor);
  const updateProcessor = useEditor((s) => s.updateProcessor);
  const removeProcessor = useEditor((s) => s.removeProcessor);
  const updateScreen = useEditor((s) => s.updateScreen);
  const select = useEditor((s) => s.select);

  const [open, setOpen] = useState(false);
  const [brand, setBrand] = useState("NovaStar");
  const [label, setLabel] = useState("");
  const [maxPixels, setMaxPixels] = useState(2_600_000);
  const [outputs, setOutputs] = useState(4);

  if (!project) return null;

  return (
    <>
      <Section
        title="Video Processors"
        action={
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-primary"
          >
            <Plus className="h-3 w-3" /> Model
          </button>
        }
      >
        {open && (
          <div className="mb-3 border border-border p-2">
            <TextField label="Brand" value={brand} onChange={setBrand} />
            <TextField label="Model" value={label} onChange={setLabel} />
            <NumberField
              label="Max Pixels"
              step={100000}
              min={1000}
              value={maxPixels}
              onChange={setMaxPixels}
            />
            <NumberField label="Outputs" step={1} min={1} max={32} value={outputs} onChange={setOutputs} />
            <button
              type="button"
              disabled={!label.trim()}
              onClick={() => {
                addProcessor({
                  brand: brand.trim() || "Custom",
                  label: label.trim(),
                  maxPixels,
                  outputs: Math.round(outputs),
                  outputWidth: 1920,
                  outputHeight: 1080,
                });
                setLabel("");
                setOpen(false);
              }}
              className="mt-1 w-full bg-primary px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary-foreground disabled:opacity-40"
            >
              Add processor model
            </button>
          </div>
        )}

        {project.processors.map((proc) => {
          const assigned = project.screens.filter((s) => s.processorId === proc.id);
          const load = assigned.reduce((sum, s) => sum + s.pixelWidth * s.pixelHeight, 0);
          const pct = proc.maxPixels > 0 ? (load / proc.maxPixels) * 100 : 0;
          return (
            <div key={proc.id} className="border-b border-border/60 py-2 last:border-0">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
                  {proc.brand} {proc.label}
                </span>
                {!proc.builtIn && (
                  <button
                    type="button"
                    onClick={() => removeProcessor(proc.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
              <NumberField
                label="Outputs"
                step={1}
                min={1}
                max={32}
                value={proc.outputs}
                onChange={(v) => updateProcessor(proc.id, { outputs: Math.round(v) })}
              />
              <NumberField
                label="Max Pixels"
                step={100000}
                min={1000}
                value={proc.maxPixels}
                onChange={(v) => updateProcessor(proc.id, { maxPixels: Math.round(v) })}
              />
              <NumberField
                label="Output W"
                suffix="px"
                step={16}
                min={16}
                value={proc.outputWidth}
                onChange={(v) => updateProcessor(proc.id, { outputWidth: Math.round(v) })}
              />
              <NumberField
                label="Output H"
                suffix="px"
                step={16}
                min={16}
                value={proc.outputHeight}
                onChange={(v) => updateProcessor(proc.id, { outputHeight: Math.round(v) })}
              />
              <Readout
                rows={[
                  ["SCREENS", String(assigned.length)],
                  ["LOAD", `${load.toLocaleString()} px`],
                  ["UTILISATION", `${pct.toFixed(1)}%`, pct > 100 ? "text-destructive" : undefined],
                ]}
              />
            </div>
          );
        })}
      </Section>

      <Section title="Output Assignment">
        {project.screens.length === 0 && (
          <p className="text-[11px] text-muted-foreground">No LED surfaces to patch.</p>
        )}
        {project.screens.map((screen) => {
          const proc = project.processors.find((p) => p.id === screen.processorId);
          return (
            <div key={screen.id} className="border-b border-border/60 py-2 last:border-0">
              <button
                type="button"
                onClick={() => select(screen.id)}
                className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-foreground hover:text-primary"
              >
                {screen.name}
              </button>
              <SelectField
                label="Processor"
                value={screen.processorId}
                options={project.processors.map((p) => ({
                  value: p.id,
                  label: `${p.brand} ${p.label}`,
                }))}
                onChange={(processorId) => updateScreen(screen.id, { processorId })}
              />
              <SelectField
                label="RJ45 Port"
                value={String(screen.rj45Port)}
                options={Array.from({ length: proc?.outputs ?? 4 }, (_, i) => ({
                  value: String(i + 1),
                  label: `RJ45 Port ${i + 1}`,
                }))}
                onChange={(v) => updateScreen(screen.id, { rj45Port: Number(v) })}
              />
              <SelectField
                label="Logical Output"
                value={String(screen.processorOutput)}
                options={Array.from({ length: proc?.outputs ?? 4 }, (_, i) => ({
                  value: String(i + 1),
                  label: `Output ${i + 1}`,
                }))}
                onChange={(v) => updateScreen(screen.id, { processorOutput: Number(v) })}
              />
            </div>
          );
        })}
      </Section>

      <Section title="Signal Flow">
        <div className="space-y-2 font-mono text-[10px]">
          {project.processors
            .filter((p) => project.screens.some((s) => s.processorId === p.id))
            .map((proc) => (
              <div key={proc.id} className="border border-border p-2">
                <div className="mb-1 text-[10px] uppercase tracking-wider text-primary">
                  {proc.brand} {proc.label}
                </div>
                {project.screens
                  .filter((s) => s.processorId === proc.id)
                  .sort((a, b) => a.processorOutput - b.processorOutput)
                  .map((s) => (
                    <div key={s.id} className="flex items-center gap-1 text-muted-foreground">
                      <span className="text-foreground/70">PC</span>
                      <span>→</span>
                      <span className="text-foreground/70">{proc.label}</span>
                      <span>→</span>
                      <span className="text-primary">OUT {s.processorOutput}</span>
                      <span>→</span>
                      <span className="text-[#7fd4ff]">RJ45 {s.rj45Port}</span>
                      <span>→</span>
                      <span className="truncate text-foreground/90">{s.name}</span>
                    </div>
                  ))}
              </div>
            ))}
          {project.screens.length === 0 && (
            <p className="text-[11px] text-muted-foreground">Add LED surfaces to see signal flow.</p>
          )}
        </div>
      </Section>
    </>
  );
}
