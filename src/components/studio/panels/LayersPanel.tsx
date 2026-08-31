import { Eye, EyeOff, Lock, LockOpen, Plus, Trash2 } from "lucide-react";
import { useEditor } from "@/lib/led/store";
import { LAYER_LABELS, LAYER_ORDER } from "@/lib/led/types";
import { NumberField, Section, TextField } from "../Field";

export function LayersPanel() {
  const project = useEditor((s) => s.project);
  const toggleLayer = useEditor((s) => s.toggleLayer);
  const addMeasurement = useEditor((s) => s.addMeasurement);
  const updateMeasurement = useEditor((s) => s.updateMeasurement);
  const deleteMeasurement = useEditor((s) => s.deleteMeasurement);

  if (!project) return null;

  return (
    <>
      <Section title="Layers">
        <div className="-mx-1">
          {LAYER_ORDER.map((key) => {
            const layer = project.layers[key];
            return (
              <div
                key={key}
                className="flex items-center gap-2 px-1 py-1 hover:bg-secondary/40"
              >
                <span className="flex-1 text-[11px] uppercase tracking-wider text-foreground/80">
                  {LAYER_LABELS[key]}
                </span>
                <button
                  type="button"
                  title={layer.visible ? "Hide layer" : "Show layer"}
                  onClick={() => toggleLayer(key, "visible")}
                  className={layer.visible ? "text-primary" : "text-muted-foreground"}
                >
                  {layer.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  title={layer.locked ? "Unlock layer" : "Lock layer"}
                  onClick={() => toggleLayer(key, "locked")}
                  className={layer.locked ? "text-destructive" : "text-muted-foreground"}
                >
                  {layer.locked ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
                </button>
              </div>
            );
          })}
        </div>
      </Section>

      <Section
        title="Measurement Lines"
        action={
          <button
            type="button"
            onClick={addMeasurement}
            className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-primary"
          >
            <Plus className="h-3 w-3" /> Add
          </button>
        }
      >
        {project.measurements.length === 0 && (
          <p className="text-[11px] text-muted-foreground">
            No measurement lines. Add one to annotate the production plan.
          </p>
        )}
        {project.measurements.map((m) => (
          <div key={m.id} className="border-b border-border/60 py-2 last:border-0">
            <TextField
              label="Label"
              value={m.label}
              onChange={(label) => updateMeasurement(m.id, { label })}
            />
            <div className="grid grid-cols-2 gap-x-2">
              <NumberField
                label="From X"
                suffix="m"
                value={m.from.x}
                onChange={(x) => updateMeasurement(m.id, { from: { ...m.from, x } })}
              />
              <NumberField
                label="From Z"
                suffix="m"
                value={m.from.z}
                onChange={(z) => updateMeasurement(m.id, { from: { ...m.from, z } })}
              />
              <NumberField
                label="To X"
                suffix="m"
                value={m.to.x}
                onChange={(x) => updateMeasurement(m.id, { to: { ...m.to, x } })}
              />
              <NumberField
                label="To Z"
                suffix="m"
                value={m.to.z}
                onChange={(z) => updateMeasurement(m.id, { to: { ...m.to, z } })}
              />
            </div>
            <button
              type="button"
              onClick={() => deleteMeasurement(m.id)}
              className="mt-1 flex items-center gap-1 text-[10px] uppercase tracking-wider text-destructive"
            >
              <Trash2 className="h-3 w-3" /> Remove
            </button>
          </div>
        ))}
      </Section>
    </>
  );
}
