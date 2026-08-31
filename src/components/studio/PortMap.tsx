import { useEditor } from "@/lib/led/store";
import {
  PORT_ICON,
  PORT_LABEL,
  PORT_TONE,
  planPortDistribution,
  portMaxPixels,
  processorPortMap,
} from "@/lib/led/ports";
import type { ProcessorModel, Project } from "@/lib/led/types";

interface Props {
  project: Project;
  processor: ProcessorModel;
  /** hide the auto-distribute button (read-only contexts) */
  readOnly?: boolean;
}

/** Processor → Output Ports → LED Sections → LED Cabinets. */
export function PortMap({ project, processor, readOnly }: Props) {
  const autoDistribute = useEditor((s) => s.autoDistributePorts);
  const map = processorPortMap(project, processor);
  const plan = planPortDistribution(project, processor);
  const perPort = portMaxPixels(processor);

  const compatible = map.status !== "over";

  return (
    <div className="mt-2 border-t border-border pt-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {processor.label} — {processor.outputs} ports
        </span>
        <span className="text-[10px] text-muted-foreground">
          {perPort.toLocaleString()} px / port · {map.maxPanelsPerPort} panels max
        </span>
      </div>

      <div
        className={`mb-2 border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
          compatible ? "border-[#4ade80]/50 text-[#4ade80]" : "border-destructive/60 text-destructive"
        }`}
      >
        {compatible
          ? `🟢 ${processor.label} configuration compatible`
          : `🔴 ${processor.label} configuration exceeds capacity`}
      </div>



      <div className="space-y-[3px]">
        {map.ports.map((p) => (
          <div key={p.port} className="flex items-center gap-2 text-[10px]">
            <span className="w-14 shrink-0 tabular-nums text-muted-foreground">
              Port {p.port}
            </span>
            <div className="h-[6px] flex-1 border border-border/70 bg-background">
              <div
                className={
                  p.status === "over"
                    ? "h-full bg-destructive"
                    : p.status === "warn"
                      ? "h-full bg-primary"
                      : "h-full bg-[#4ade80]"
                }
                style={{ width: `${Math.min(100, p.loadPct)}%` }}
              />
            </div>
            <span className="w-16 shrink-0 text-right tabular-nums text-muted-foreground">
              {p.cabinets}/{p.maxCabinets || map.maxPanelsPerPort}
            </span>
            <span className={`w-12 shrink-0 text-right tabular-nums ${PORT_TONE[p.status]}`}>
              {p.loadPct.toFixed(0)}%
            </span>
            <span className="w-4 shrink-0 text-right">{PORT_ICON[p.status]}</span>

          </div>
        ))}
      </div>

      <div className="mt-2 space-y-[2px] text-[10px] leading-relaxed">
        {map.ports
          .filter((p) => p.sections.length > 0)
          .map((p) => (
            <div key={p.port} className="flex items-start justify-between gap-2">
              <span className="text-muted-foreground">
                Port {p.port} · {PORT_LABEL[p.status]}
              </span>
              <span className="text-right text-[#7fd4ff]">
                {p.sections.map((s) => s.screenName).join(", ")} · {p.cabinets} cab ·{" "}
                {p.width} × {p.height} px ({p.pixels.toLocaleString()} px, {" "}
                {p.remaining.toLocaleString()} px free)
                {p.notes.length > 0 && (
                  <span className={`block ${PORT_TONE[p.status]}`}>{p.notes.join(" ")}</span>
                )}
              </span>
            </div>
          ))}
        {map.portsUsed === 0 && (
          <div className="text-muted-foreground">No LED sections patched to this processor.</div>
        )}
      </div>

      <div className="mt-2 border-t border-border/60 pt-1 text-[10px]">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">TOTAL PROCESSOR LOAD</span>
          <span
            className={
              map.loadPct > 100
                ? "text-destructive"
                : map.loadPct >= 85
                  ? "text-primary"
                  : "text-[#4ade80]"
            }
          >
            {map.totalPixels.toLocaleString()} / {map.maxPixels.toLocaleString()} px (
            {map.loadPct.toFixed(1)}%)
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">PANELS ASSIGNED</span>
          <span className="text-foreground">
            {map.panelsAssigned} / {map.panelCapacity} · {Math.max(0, map.panelCapacity - map.panelsAssigned)} remaining
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">PORTS USED</span>
          <span className="text-foreground">
            {map.portsUsed} / {processor.outputs} · minimum required {Math.min(map.portsRequired, processor.outputs)}
          </span>
        </div>
      </div>


      {(map.issues.length > 0 || map.recommendations.length > 0) && (
        <ul className="mt-2 space-y-1 text-[10px] leading-relaxed">
          {map.issues.map((n) => (
            <li key={n} className="text-destructive">
              🔴 {n}
            </li>
          ))}
          {map.recommendations.map((n) => (
            <li key={n} className="text-muted-foreground">
              → {n}
            </li>
          ))}
        </ul>
      )}

      {!readOnly && (
        <button
          type="button"
          onClick={() => autoDistribute(processor.id)}
          className="mt-2 w-full border border-border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
        >
          Auto-distribute LED across ports ({plan.portsNeeded} needed)
        </button>
      )}
    </div>
  );
}
