import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { useEditor } from "@/lib/led/store";
import { EQUIPMENT_LIBRARY, type EquipmentDefinition } from "@/lib/led/equipment";
import { EQUIPMENT_CATEGORY_LABELS, type EquipmentCategory } from "@/lib/led/types";
import { NumberField, Section, SelectField, TextField } from "../Field";

const CATEGORIES = Object.keys(EQUIPMENT_CATEGORY_LABELS) as EquipmentCategory[];

/** Tiny top-down glyph so each asset reads at a glance in the library list. */
function Thumb({ def }: { def: EquipmentDefinition }) {
  const ratio = Math.min(2.4, Math.max(0.4, def.width / Math.max(def.depth, 0.05)));
  const w = Math.min(20, 10 * ratio);
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-border/70 bg-[#0a0e15]">
      <span
        className="block"
        style={{
          backgroundColor: def.color,
          width: `${w}px`,
          height: `${Math.min(20, w / ratio)}px`,
          borderRadius: def.category === "people" ? "50%" : "1px",
        }}
      />
    </span>
  );
}

export function AssetLibrary() {
  const addEquipment = useEditor((s) => s.addEquipment);
  const addSeatingRows = useEditor((s) => s.addSeatingRows);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | EquipmentCategory>("all");

  const [seat, setSeat] = useState({
    typeKey: "conference-chair",
    rows: 5,
    perRow: 10,
    rowSpacing: 0.9,
    seatSpacing: 0.6,
    startZ: 6,
    section: "Section A",
  });

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EQUIPMENT_LIBRARY.filter(
      (d) =>
        (category === "all" || d.category === category) &&
        (!q ||
          d.name.toLowerCase().includes(q) ||
          d.key.includes(q) ||
          (d.spec ?? "").toLowerCase().includes(q)),
    );
  }, [query, category]);

  return (
    <>
      <Section title={`3D Asset Library (${results.length})`}>
        <label className="mb-2 flex items-center gap-2 border border-border bg-[#0a0e15] px-2 py-1.5">
          <Search className="h-3 w-3 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chairs, people, cameras, truss…"
            className="w-full bg-transparent text-[11px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>
        <SelectField
          label="Category"
          value={category}
          options={[
            { value: "all", label: "All categories" },
            ...CATEGORIES.map((c) => ({ value: c, label: EQUIPMENT_CATEGORY_LABELS[c] })),
          ]}
          onChange={(c) => setCategory(c as EquipmentCategory | "all")}
        />
        <div className="mt-2 grid max-h-[320px] gap-px overflow-auto bg-border/40">
          {results.map((def) => (
            <button
              key={def.key}
              type="button"
              draggable
              onDragStart={(e) => e.dataTransfer.setData("text/asset-key", def.key)}
              onClick={() => addEquipment(def.key)}
              className="flex items-center gap-2 bg-card px-2 py-1.5 text-left transition-colors hover:bg-secondary"
            >
              <Thumb def={def} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] text-foreground">{def.name}</span>
                <span className="block truncate font-mono text-[9px] text-muted-foreground">
                  {EQUIPMENT_CATEGORY_LABELS[def.category]} · {def.width}×{def.depth}×{def.height} m
                  {def.spec ? ` · ${def.spec}` : ""}
                </span>
              </span>
              <span
                className={`shrink-0 border px-1 font-mono text-[8px] uppercase tracking-[0.1em] ${
                  def.realistic
                    ? "border-[#2e6f5f] text-[#68d391]"
                    : "border-[#6b552a] text-[#c98b3a]"
                }`}
              >
                {def.realistic ? "3D" : "Placeholder"}
              </span>
              <Plus className="h-3 w-3 shrink-0 text-primary" />
            </button>
          ))}
          {results.length === 0 && (
            <p className="bg-card px-2 py-3 text-[11px] text-muted-foreground">No assets match.</p>
          )}
        </div>
      </Section>

      <Section title="Seating Section Builder">
        <SelectField
          label="Chair model"
          value={seat.typeKey}
          options={EQUIPMENT_LIBRARY.filter((d) => d.category === "seating").map((d) => ({
            value: d.key,
            label: d.name,
          }))}
          onChange={(typeKey) => setSeat((s) => ({ ...s, typeKey }))}
        />
        <TextField
          label="Section name"
          value={seat.section}
          onChange={(section) => setSeat((s) => ({ ...s, section }))}
        />
        <NumberField
          label="Rows"
          step={1}
          min={1}
          value={seat.rows}
          onChange={(rows) => setSeat((s) => ({ ...s, rows }))}
        />
        <NumberField
          label="Chairs / row"
          step={1}
          min={1}
          value={seat.perRow}
          onChange={(perRow) => setSeat((s) => ({ ...s, perRow }))}
        />
        <NumberField
          label="Row spacing"
          suffix="m"
          step={0.05}
          min={0.4}
          value={seat.rowSpacing}
          onChange={(rowSpacing) => setSeat((s) => ({ ...s, rowSpacing }))}
        />
        <NumberField
          label="Chair spacing"
          suffix="m"
          step={0.05}
          min={0.35}
          value={seat.seatSpacing}
          onChange={(seatSpacing) => setSeat((s) => ({ ...s, seatSpacing }))}
        />
        <NumberField
          label="First row Z"
          suffix="m"
          step={0.25}
          value={seat.startZ}
          onChange={(startZ) => setSeat((s) => ({ ...s, startZ }))}
        />
        <button
          type="button"
          onClick={() => addSeatingRows(seat)}
          className="mt-2 w-full bg-primary px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary-foreground"
        >
          Place {Math.max(1, Math.round(seat.rows)) * Math.max(1, Math.round(seat.perRow))} chairs
        </button>
      </Section>
    </>
  );
}
