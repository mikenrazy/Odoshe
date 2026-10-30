import { useState } from "react";
import { Plus, Trash2, Link2, Unlink } from "lucide-react";
import { useEditor } from "@/lib/led/store";
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
import { ScreenSetsSection } from "../ScreenSetsSection";
import { SenderCablePaths } from "../SenderCablePaths";
import { screenChains, senderScreenCapacity } from "@/lib/led/engineering";
import { isLvp615, LVP615_TIMINGS, senderReady } from "@/lib/led/vdwall";

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
  const setScreenGroup = useEditor((s) => s.setScreenGroup);
  const applySource = useEditor((s) => s.applyProcessorSourceToCanvas);
  const select = useEditor((s) => s.select);

  const [model, setModel] = useState(PROCESSOR_CATALOG[0]?.key ?? "vx1000");

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
                label={isLvp615(proc) ? "Sender RJ45 ports" : "Outputs"}
                step={1}
                min={isLvp615(proc) ? 0 : 1}
                max={32}
                value={proc.outputs}
                onChange={(v) => updateProcessor(proc.id, { outputs: Math.round(v), ...(isLvp615(proc) ? { senderPortsConfirmed: true } : {}) })}
              />
              <NumberField
                label={isLvp615(proc) ? "Sender total pixels" : "Max Pixels"}
                step={100000}
                min={isLvp615(proc) ? 0 : 1000}
                value={proc.maxPixels}
                onChange={(v) => updateProcessor(proc.id, { maxPixels: Math.round(v) })}
              />
              {isLvp615(proc) && <>
                <TextField label="Sender model" value={proc.senderModel ?? ""} onChange={(senderModel) => updateProcessor(proc.id, { senderModel })} />
                <NumberField label="Sender px / port" min={0} step={1000} value={proc.portMaxPixels ?? 0} onChange={(v) => updateProcessor(proc.id, { portMaxPixels: Math.round(v) })} />
                <SelectField label="Input socket" value={proc.inputConnector ?? "HDMI"} options={["HDMI", "DVI", "DP", "VGA"].map((value) => ({ value, label: value }))} onChange={(v) => updateProcessor(proc.id, { inputConnector: v as ProcessorModel["inputConnector"], maxInputWidth: v === "DVI" ? 2304 : v === "VGA" ? 2048 : 1920, maxInputHeight: v === "DVI" || v === "VGA" ? 1152 : 1080 })} />
                <SelectField label="DVI output (60 Hz)" value={`${proc.videoOutputWidth ?? 1920}x${proc.videoOutputHeight ?? 1080}`} options={LVP615_TIMINGS.map(([w, h]) => ({ value: `${w}x${h}`, label: `${w} × ${h}` }))} onChange={(v) => { const [w, h] = v.split("x").map(Number); updateProcessor(proc.id, { videoOutputWidth: w, videoOutputHeight: h }); }} />
                <Readout rows={[["VIDEO OUT", "2 mirrored DVI outputs"], ["LED DATA", proc.senderModel || "Sender unconfirmed"], ["CONTROL", "LAN / USB / RS232"]]} />
                <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
                  The LVP615 manual specifies DVI video timings, not sending-card or RJ45 pixel limits. Enter limits from the fitted sending card’s specifications; DVI resolution is not LED port capacity.
                </p>
                <div className="mt-2 space-y-2" aria-label={`${processorName(proc)} screen capacity`}>
                  {senderScreenCapacity(project, proc).map((capacity) => (
                    <div key={capacity.screenId} className="border-l-2 border-border pl-2 text-[11px] leading-relaxed">
                      <div className="break-words font-semibold text-foreground">{capacity.name}</div>
                      <div className="text-muted-foreground">
                        {capacity.pixels.toLocaleString()} px / {proc.maxPixels > 0 ? `${proc.maxPixels.toLocaleString()} px per sending card` : "card limit unconfirmed"}
                      </div>
                      <div className="text-muted-foreground">
                        {proc.portMaxPixels ? `${proc.portMaxPixels.toLocaleString()} px / RJ45 port` : "RJ45 pixel limit unconfirmed"}
                      </div>
                      {capacity.issues.map((issue) => <div key={issue} role="alert" className="break-words text-destructive">{issue}</div>)}
                      {!capacity.verified && <div className="text-muted-foreground">Not verified — sender specifications required.</div>}
                      {capacity.verified && !capacity.issues.length && <div className="text-primary">Within sender pixel and port limits.</div>}
                    </div>
                  ))}
                </div>
              </>}
              <Readout
                rows={[
                  [
                    "SOURCE RANGE",
                    `${proc.minInputWidth ?? 1024} × ${proc.minInputHeight ?? 640} – ${
                      proc.maxInputWidth ?? 1920
                    } × ${proc.maxInputHeight ?? 1080}`,
                  ],
                  ["SOURCE ASPECT", aspectLabel(inW, inH)],
                  [isLvp615(proc) ? "CUSTOM TIMING LIMIT" : "PORT MAX", `${proc.outputWidth} × ${proc.outputHeight}`],
                  ["LED LOAD", `${load.toLocaleString()} px`],
                  [
                    "UTILISATION",
                    isLvp615(proc) && !senderReady(proc) ? "Unconfirmed" : `${pct.toFixed(1)}%`,
                    pct > 100 ? "text-destructive" : undefined,
                  ],
                  [
                    "LED SECTIONS",
                    groupNames.length ? groupNames.join(", ") : "None",
                    "text-right text-[#7fd4ff]",
                  ],
                ]}
              />
              {isLvp615(proc) && <SenderCablePaths project={project} processor={proc} />}
              <PortMap project={project} processor={proc} />
            </div>
          );
        })}
      </Section>

      <ScreenSetsSection />

      <Section title="Output Assignment">
        {project.screens.length === 0 && (
          <p className="text-[11px] text-muted-foreground">No LED surfaces to patch.</p>
        )}
        {project.screens.map((screen) => {
          const proc = project.processors.find((p) => p.id === screen.processorId);
          const assignment = grids.get(screen.id);
          const shared = isLvp615(proc) || groups.some((g) => g.mappingMode === "shared-input" && project.screens.some((s) => s.groupId === g.id && s.processorId === screen.processorId));
          const chains = screenChains(project, screen);
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
              {!shared && (!isLvp615(proc) || (proc?.outputs ?? 0) > 0) && <SelectField
                label="RJ45 Port"
                value={String(screen.rj45Port)}
                options={Array.from({ length: proc?.outputs ?? 4 }, (_, i) => ({
                  value: String(i + 1),
                  label: `RJ45 Port ${i + 1}`,
                }))}
                onChange={(v) => updateScreen(screen.id, { rj45Port: Number(v) })}
              />}
              {!isLvp615(proc) && <SelectField
                label="Logical Output"
                value={String(screen.processorOutput)}
                options={Array.from({ length: proc?.outputs ?? 4 }, (_, i) => ({
                  value: String(i + 1),
                  label: `Output ${i + 1}`,
                }))}
                onChange={(v) => updateScreen(screen.id, { processorOutput: Number(v) })}
              />}
              <Readout
                rows={[
                  ["LED RES", `${screen.pixelWidth} × ${screen.pixelHeight} px`],
                  ...(shared ? [["DATA CABLES", `P${chains[0]?.port ?? "—"}–P${chains.at(-1)?.port ?? "—"}`, "text-primary"] as [string, string, string]] : []),
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
                      {isLvp615(proc) && <span className="text-primary">→ DVI → {proc.senderModel || "sender unconfirmed"}</span>}
                      <span>→</span>
                      <span className="text-primary">OUT {s.processorOutput}</span>
                      <span>→</span>
                      <span className="text-[#7fd4ff]">RJ45 {s.rj45Port}</span>
                      <span>→</span>
                      <span className="truncate text-foreground/90">
                        {groups.find((g) => g.id === s.groupId)?.name
                          ? `${groups.find((g) => g.id === s.groupId)?.name} · ${s.name}`
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
