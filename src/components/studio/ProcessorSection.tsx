import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useEditor } from "@/lib/led/store";
import type { LedScreen } from "@/lib/led/types";
import { computeGridNumbers } from "@/lib/led/grid-numbering";
import { NumberField, Section, SelectField, TextField } from "./Field";

interface Props {
  screen: LedScreen;
}

export function ProcessorSection({ screen }: Props) {
  const project = useEditor((s) => s.project);
  const updateScreen = useEditor((s) => s.updateScreen);
  const addProcessor = useEditor((s) => s.addProcessor);
  const removeProcessor = useEditor((s) => s.removeProcessor);
  const renumberGrids = useEditor((s) => s.renumberGrids);
  const [open, setOpen] = useState(false);
  const [brand, setBrand] = useState("NovaStar");
  const [label, setLabel] = useState("");
  const [maxPixels, setMaxPixels] = useState(2_600_000);

  if (!project) return null;
  const processors = project.processors;
  const active = processors.find((p) => p.id === screen.processorId) ?? processors[0]!;
  const pixels = screen.pixelWidth * screen.pixelHeight;
  const load = active.maxPixels > 0 ? (pixels / active.maxPixels) * 100 : 0;
  const unitsNeeded = active.maxPixels > 0 ? Math.ceil(pixels / active.maxPixels) : 1;
  const grids = computeGridNumbers(project);
  const assignment = grids.get(screen.id);

  return (
    <Section
      title="Video Processor"
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
      <SelectField
        label="Processor"
        value={active.id}
        options={processors.map((p) => ({ value: p.id, label: `${p.brand} ${p.label}` }))}
        onChange={(processorId) => updateScreen(screen.id, { processorId })}
      />

      <div className="mt-1 grid grid-cols-2 gap-2 border-t border-border pt-2 font-mono text-[10px] text-muted-foreground">
        <span>CAPACITY</span>
        <span className="text-right text-foreground/80">
          {active.maxPixels.toLocaleString()} px
        </span>
        <span>SCREEN LOAD</span>
        <span
          className={`text-right ${load > 100 ? "text-destructive" : "text-foreground/80"}`}
        >
          {load.toFixed(1)}%
        </span>
        <span>UNITS NEEDED</span>
        <span className="text-right text-foreground/80">{unitsNeeded}</span>
        <span>GRID RANGE</span>
        <span className="text-right text-primary">
          {assignment
            ? `${active.label} – Grid ${assignment.start}${
                assignment.count > 1 ? `–${assignment.start + assignment.count - 1}` : ""
              }`
            : "—"}
        </span>
      </div>

      <button
        type="button"
        onClick={renumberGrids}
        className="mt-2 w-full border border-border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
      >
        Renumber grids (left → right)
      </button>

      {!active.builtIn && (
        <button
          type="button"
          onClick={() => removeProcessor(active.id)}
          className="mt-2 flex items-center gap-1 text-[10px] uppercase tracking-wider text-destructive"
        >
          <Trash2 className="h-3 w-3" /> Remove model
        </button>
      )}

      {open && (
        <div className="mt-2 border-t border-border pt-2">
          <TextField label="Brand" value={brand} onChange={setBrand} />
          <TextField label="Model" value={label} onChange={setLabel} />
          <NumberField
            label="Max Pixels"
            step={100000}
            min={1000}
            value={maxPixels}
            onChange={setMaxPixels}
          />
          <button
            type="button"
            disabled={!label.trim()}
            onClick={() => {
              addProcessor({ brand: brand.trim() || "Custom", label: label.trim(), maxPixels });
              setLabel("");
              setOpen(false);
            }}
            className="mt-1 w-full bg-primary px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary-foreground disabled:opacity-40"
          >
            Add processor model
          </button>
        </div>
      )}
    </Section>
  );
}
