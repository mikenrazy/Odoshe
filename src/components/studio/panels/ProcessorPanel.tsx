import { useState } from "react";
import { Plus, Trash2, Link2, Unlink } from "lucide-react";
import { useEditor, groupResolution } from "@/lib/led/store";
import {
  PROCESSOR_CATALOG,
  processorName,
  RESOLUTION_PRESETS,
  type ProcessorModel,
} from "@/lib/led/types";
import { aspectLabel } from "@/lib/led/calc";
import { computeGridNumbers } from "@/lib/led/grid-numbering";
import { NumberField, Readout, Section, SelectField, TextField } from "../Field";
import { PortMap } from "../PortMap";

function sourceOptions(proc: ProcessorModel) {
  const catalog = PROCESSOR_CATALOG.find((c) => c.key === (proc.modelKey ?? proc.id));
  const presets = catalog?.inputPresets ?? RESOLUTION_PRESETS.filter((p) => p.width > 0);
  const list = presets.map((p) => ({
    value: `${p.width}x${p.height}`,
    label: `${p.width} × ${p.height}`,
  }));
  const current = `${proc.inputWidth ?? 1920}x${proc.inputHeight ?? 1080}`;
  if (!list.some((o) => o.value === current)) {
    list.push({ value: current, label: `${proc.inputWidth} × ${proc.inputHeight} (custom)` });
  }
  return list;
}

export function ProcessorPanel() {
  const project = useEditor((s) => s.project);
  const addProcessorInstance = useEditor((s) => s.addProcessorInstance);
  const updateProcessor = useEditor((s) => s.updateProcessor);
  const removeProcessor = useEditor((s) => s.removeProcessor);
  const updateScreen = useEditor((s) => s.updateScreen);
  const addGroup = useEditor((s) => s.addGroup);
  const removeGroup = useEditor((s) => s.removeGroup);
  const updateGroup = useEditor((s) => s.updateGroup);
  const setScreenGroup = useEditor((s) => s.setScreenGroup);
  const splitGroupResolution = useEditor((s) => s.splitGroupResolution);
  const applySource = useEditor((s) => s.applyProcessorSourceToCanvas);
  const select = useEditor((s) => s.select);

  const [model, setModel] = useState(PROCESSOR_CATALOG[0]!.key);
  const [groupName, setGroupName] = useState("Side LED (L+R)");

  if (!project) return null;
  const groups = project.groups ?? [];
  const grids = computeGridNumbers(project);

  return (
    <>
      <Section title="Processors">
        <div className="mb-3 border border-border p-2">
          <SelectField
            label="Model"
            value={model}
            options={PROCESSOR_CATALOG.map((c) => ({
              value: c.key,
              label: `${c.brand} ${c.label}`,
            }))}
            onChange={setModel}
          />
          <button
            type="button"
            onClick={() => addProcessorInstance(model)}
            className="mt-1 flex w-full items-center justify-center gap-1 bg-primary px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary-foreground"
          >
            <Plus className="h-3 w-3" /> Add processor unit
          </button>
          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
            Add as many units as the rig needs — two VX600s or two VX1000s stay independently
            named, patched and configurable.
          </p>
        </div>

        {project.processors.map((proc) => {
          const assigned = project.screens.filter((s) => s.processorId === proc.id);
          const load = assigned.reduce((sum, s) => sum + s.pixelWidth * s.pixelHeight, 0);
          const pct = proc.maxPixels > 0 ? (load / proc.maxPixels) * 100 : 0;
          const inW = proc.inputWidth ?? 1920;
          const inH = proc.inputHeight ?? 1080;
          const isCanvasSource = project.canvas.sourceProcessorId === proc.id;
          const groupNames = [
            ...new Set(
              assigned.map((s) => groups.find((g) => g.id === s.groupId)?.name ?? s.name),
            ),
          ];
          return (
            <div key={proc.id} className="border-b border-border/60 py-2 last:border-0">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
                  {processorName(proc)}
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
              <TextField
                label="Unit Name"
                value={proc.name ?? `${proc.brand} ${proc.label}`}
                onChange={(name) => updateProcessor(proc.id, { name })}
              />
              <SelectField
                label="Source In"
                value={`${inW}x${inH}`}
                options={sourceOptions(proc)}
                onChange={(v) => {
                  const [w, h] = v.split("x").map(Number);
                  updateProcessor(proc.id, {
                    inputWidth: w ?? inW,
                    inputHeight: h ?? inH,
                  });
                  if (project.canvas.sourceProcessorId === proc.id) applySource(proc.id);
                }}

              />
              <div className="grid grid-cols-2 gap-x-2">
                <NumberField
                  label="Src W"
                  suffix="px"
                  step={16}
                  min={320}
                  value={inW}
                  onChange={(v) => updateProcessor(proc.id, { inputWidth: Math.round(v) })}
                />
                <NumberField
                  label="Src H"
                  suffix="px"
                  step={8}
                  min={240}
                  value={inH}
                  onChange={(v) => updateProcessor(proc.id, { inputHeight: Math.round(v) })}
                />
              </div>
              <button
                type="button"
                onClick={() => applySource(proc.id)}
                className={`mt-1 w-full border px-2 py-1 text-[10px] uppercase tracking-[0.14em] ${
                  isCanvasSource
                    ? "border-primary text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {isCanvasSource ? "Canvas source (active)" : "Use as canvas source"}
              </button>
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
              <Readout
                rows={[
                  [
                    "SOURCE RANGE",
                    `${proc.minInputWidth ?? 1024} × ${proc.minInputHeight ?? 640} – ${
                      proc.maxInputWidth ?? 1920
                    } × ${proc.maxInputHeight ?? 1080}`,
                  ],
                  ["SOURCE ASPECT", aspectLabel(inW, inH)],
                  ["PORT MAX", `${proc.outputWidth} × ${proc.outputHeight}`],
                  ["LED LOAD", `${load.toLocaleString()} px`],
                  [
                    "UTILISATION",
                    `${pct.toFixed(1)}%`,
                    pct > 100 ? "text-destructive" : undefined,
                  ],
                  [
                    "LED SECTIONS",
                    groupNames.length ? groupNames.join(", ") : "None",
                    "text-right text-[#7fd4ff]",
                  ],
                ]}
              />
              <PortMap project={project} processor={proc} />
            </div>
          );
        })}
      </Section>

      <Section title="LED Groups">
        <div className="mb-2 flex items-end gap-1">
          <div className="flex-1">
            <TextField label="Group Name" value={groupName} onChange={setGroupName} />
          </div>
          <button
            type="button"
            onClick={() => addGroup(groupName)}
            className="mb-[6px] flex items-center gap-1 border border-border px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-primary"
          >
            <Plus className="h-3 w-3" /> Group
          </button>
        </div>
        {groups.length === 0 && (
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Create a group to treat separate sections — e.g. the left and right side screens — as
            one continuous logical screen on a single processor output.
          </p>
        )}
        {groups.map((group) => {
          const members = project.screens.filter((s) => s.groupId === group.id);
          const px = members.reduce((sum, s) => sum + s.pixelWidth * s.pixelHeight, 0);
          const lead = members[0];
          const proc = project.processors.find((p) => p.id === lead?.processorId);
          const res = groupResolution(project, group.id);
          const perSection = members.length
            ? `${Math.floor((proc?.inputWidth ?? project.canvas.width) / members.length)} × ${
                proc?.inputHeight ?? project.canvas.height
              }`
            : "—";
          return (
            <div key={group.id} className="border-b border-border/60 py-2 last:border-0">
              <div className="flex items-center justify-between gap-1">
                <input
                  value={group.name}
                  onChange={(e) => updateGroup(group.id, { name: e.target.value })}
                  className="w-full bg-transparent text-[11px] font-semibold uppercase tracking-wider text-foreground outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeGroup(group.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Unlink className="h-3 w-3" />
                </button>
              </div>
              <Readout
                rows={[
                  ["SECTIONS", members.length ? members.map((m) => m.name).join(" + ") : "None"],
                  [
                    "GROUP RES",
                    res ? `${res.width} × ${res.height} px` : "—",
                    "text-right text-primary",
                  ],
                  ["SOURCE IN", `${proc?.inputWidth ?? "—"} × ${proc?.inputHeight ?? "—"} px`],
                  ["PER SECTION", perSection, "text-right text-[#7fd4ff]"],
                  ["TOTAL PX", px.toLocaleString()],
                  [
                    "DRIVEN BY",
                    proc ? `${processorName(proc)} · RJ45 ${lead?.rj45Port}` : "—",
                    "text-right text-primary",
                  ],
                ]}
              />
              <button
                type="button"
                onClick={() => splitGroupResolution(group.id)}
                className="mt-1 w-full border border-border px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
              >
                Split source equally across sections
              </button>
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
          const assignment = grids.get(screen.id);
          return (
            <div key={screen.id} className="border-b border-border/60 py-2 last:border-0">
              <button
                type="button"
                onClick={() => select(screen.id)}
                className="mb-1 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-foreground hover:text-primary"
              >
                {screen.groupId && <Link2 className="h-3 w-3 text-primary" />}
                {screen.name}
              </button>
              <SelectField
                label="LED Group"
                value={screen.groupId ?? "none"}
                options={[
                  { value: "none", label: "Independent screen" },
                  ...groups.map((g) => ({ value: g.id, label: g.name })),
                ]}
                onChange={(v) => setScreenGroup(screen.id, v === "none" ? null : v)}
              />
              <SelectField
                label="Processor"
                value={screen.processorId}
                options={project.processors.map((p) => ({
                  value: p.id,
                  label: processorName(p),
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
              <Readout
                rows={[
                  ["LED RES", `${screen.pixelWidth} × ${screen.pixelHeight} px`],
                  [
                    "GRID",
                    assignment
                      ? `${assignment.start}–${assignment.start + assignment.count - 1}`
                      : "—",
                    "text-right text-primary",
                  ],
                ]}
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
                <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wider text-primary">
                  <span>{processorName(proc)}</span>
                  <span className="text-muted-foreground">
                    IN {proc.inputWidth} × {proc.inputHeight}
                  </span>
                </div>
                {project.screens
                  .filter((s) => s.processorId === proc.id)
                  .sort((a, b) => a.rj45Port - b.rj45Port)
                  .map((s) => (
                    <div key={s.id} className="flex items-center gap-1 text-muted-foreground">
                      <span className="text-foreground/70">MAC</span>
                      <span>→</span>
                      <span className="text-foreground/70">{proc.label}</span>
                      <span>→</span>
                      <span className="text-primary">OUT {s.processorOutput}</span>
                      <span>→</span>
                      <span className="text-[#7fd4ff]">RJ45 {s.rj45Port}</span>
                      <span>→</span>
                      <span className="truncate text-foreground/90">
                        {groups.find((g) => g.id === s.groupId)?.name
                          ? `${groups.find((g) => g.id === s.groupId)!.name} · ${s.name}`
                          : s.name}
                      </span>
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
