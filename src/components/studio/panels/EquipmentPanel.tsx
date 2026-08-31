import { useState } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";
import { useEditor } from "@/lib/led/store";
import { EQUIPMENT_LIBRARY } from "@/lib/led/equipment";
import { EQUIPMENT_CATEGORY_LABELS, type EquipmentCategory } from "@/lib/led/types";
import { NumberField, Section, SelectField, TextField } from "../Field";

const CATEGORIES = Object.keys(EQUIPMENT_CATEGORY_LABELS) as EquipmentCategory[];

export function EquipmentPanel() {
  const project = useEditor((s) => s.project);
  const selectedEquipmentId = useEditor((s) => s.selectedEquipmentId);
  const selectEquipment = useEditor((s) => s.selectEquipment);
  const addEquipment = useEditor((s) => s.addEquipment);
  const updateEquipment = useEditor((s) => s.updateEquipment);
  const deleteEquipment = useEditor((s) => s.deleteEquipment);
  const duplicateEquipment = useEditor((s) => s.duplicateEquipment);
  const [category, setCategory] = useState<EquipmentCategory>("video");

  if (!project) return null;
  const item = project.equipment.find((e) => e.id === selectedEquipmentId) ?? null;

  return (
    <>
      <Section title="Equipment Library">
        <SelectField
          label="Category"
          value={category}
          options={CATEGORIES.map((c) => ({ value: c, label: EQUIPMENT_CATEGORY_LABELS[c] }))}
          onChange={(c) => setCategory(c as EquipmentCategory)}
        />
        <div className="mt-2 grid gap-px bg-border/40">
          {EQUIPMENT_LIBRARY.filter((e) => e.category === category).map((def) => (
            <button
              key={def.key}
              type="button"
              onClick={() => addEquipment(def.key)}
              className="flex items-center gap-2 bg-card px-2 py-1.5 text-left transition-colors hover:bg-secondary"
            >
              <span className="h-2 w-2 shrink-0" style={{ backgroundColor: def.color }} />
              <span className="flex-1 truncate text-[11px] text-foreground">{def.name}</span>
              <span className="font-mono text-[9px] text-muted-foreground">
                {def.width}×{def.depth}×{def.height} m
              </span>
              <Plus className="h-3 w-3 text-primary" />
            </button>
          ))}
        </div>
      </Section>

      <Section title={`Placed Equipment (${project.equipment.length})`}>
        {project.equipment.length === 0 && (
          <p className="text-[11px] text-muted-foreground">
            Nothing placed yet — add items from the library above.
          </p>
        )}
        <div className="-mx-1">
          {project.equipment.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => selectEquipment(e.id)}
              className={`flex w-full items-center gap-2 px-1 py-1 text-left ${
                e.id === selectedEquipmentId ? "bg-primary/15" : "hover:bg-secondary/50"
              }`}
            >
              <span className="h-2 w-2 shrink-0" style={{ backgroundColor: e.color }} />
              <span className="flex-1 truncate text-[11px] text-foreground/90">{e.name}</span>
              <span className="font-mono text-[9px] text-muted-foreground">
                {EQUIPMENT_CATEGORY_LABELS[e.category]}
              </span>
            </button>
          ))}
        </div>
      </Section>

      {item && (
        <Section
          title="Item Properties"
          action={
            <span className="flex items-center gap-2">
              <button
                type="button"
                title="Duplicate"
                onClick={() => duplicateEquipment(item.id)}
                className="text-muted-foreground hover:text-foreground"
              >
                <Copy className="h-3 w-3" />
              </button>
              <button
                type="button"
                title="Delete"
                onClick={() => deleteEquipment(item.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </span>
          }
        >
          <TextField
            label="Name"
            value={item.name}
            onChange={(name) => updateEquipment(item.id, { name })}
          />
          <SelectField
            label="Category"
            value={item.category}
            options={CATEGORIES.map((c) => ({ value: c, label: EQUIPMENT_CATEGORY_LABELS[c] }))}
            onChange={(c) => updateEquipment(item.id, { category: c as EquipmentCategory })}
          />
          <NumberField
            label="Width"
            suffix="m"
            min={0.05}
            step={0.05}
            value={item.width}
            onChange={(width) => updateEquipment(item.id, { width })}
          />
          <NumberField
            label="Depth"
            suffix="m"
            min={0.05}
            step={0.05}
            value={item.depth}
            onChange={(depth) => updateEquipment(item.id, { depth })}
          />
          <NumberField
            label="Height"
            suffix="m"
            min={0.05}
            step={0.05}
            value={item.height}
            onChange={(height) => updateEquipment(item.id, { height })}
          />
          <NumberField
            label="X"
            suffix="m"
            value={item.position.x}
            onChange={(x) => updateEquipment(item.id, { position: { ...item.position, x } })}
          />
          <NumberField
            label="Y"
            suffix="m"
            value={item.position.y}
            onChange={(y) => updateEquipment(item.id, { position: { ...item.position, y } })}
          />
          <NumberField
            label="Z"
            suffix="m"
            value={item.position.z}
            onChange={(z) => updateEquipment(item.id, { position: { ...item.position, z } })}
          />
          <NumberField
            label="Rotation"
            suffix="°"
            step={5}
            value={item.rotation}
            onChange={(rotation) => updateEquipment(item.id, { rotation })}
          />
          <NumberField
            label="Quantity"
            step={1}
            min={1}
            value={item.quantity}
            onChange={(quantity) =>
              updateEquipment(item.id, { quantity: Math.max(1, Math.round(quantity)) })
            }
          />
        </Section>
      )}
    </>
  );
}
