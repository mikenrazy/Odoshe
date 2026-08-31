import { useMemo, useRef, useState } from "react";
import { Download, Printer } from "lucide-react";
import { useEditor } from "@/lib/led/store";
import { layerForCategory } from "@/lib/led/types";

type PlanAxis = "top" | "front" | "side";

const VIEWS: Array<{ key: PlanAxis; label: string; h: string; v: string }> = [
  { key: "top", label: "Top View", h: "X", v: "Z" },
  { key: "front", label: "Front View", h: "X", v: "Y" },
  { key: "side", label: "Side View", h: "Z", v: "Y" },
];

interface PlanItem {
  id: string;
  kind: "screen" | "equipment";
  label: string;
  color: string;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  rotation: number;
  selected: boolean;
}

/** Technical 2D production plan: top / front / side, rulers, grid and measurements. */
export function PlanView() {
  const project = useEditor((s) => s.project);
  const select = useEditor((s) => s.select);
  const selectEquipment = useEditor((s) => s.selectEquipment);
  const selectedId = useEditor((s) => s.selectedId);
  const selectedEquipmentId = useEditor((s) => s.selectedEquipmentId);
  const snapToGrid = useEditor((s) => s.snapToGrid);
  const toggleSnap = useEditor((s) => s.toggleSnap);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [view, setView] = useState<PlanAxis>("top");

  const items = useMemo<PlanItem[]>(() => {
    if (!project) return [];
    const list: PlanItem[] = [];
    if (project.layers.led.visible) {
      for (const s of project.screens) {
        list.push({
          id: s.id,
          kind: "screen",
          label: `${s.name} · ${s.physicalWidth}×${s.physicalHeight} m`,
          color: s.id === selectedId ? "#ff9d2e" : "#7fd4ff",
          x: s.position.x,
          y: s.position.y,
          z: s.position.z,
          w: s.physicalWidth,
          h: s.physicalHeight,
          d: Math.max(s.physicalDepth, 0.25),
          rotation: -s.rotation.y,
          selected: s.id === selectedId,
        });
      }
    }
    for (const e of project.equipment) {
      if (!project.layers[layerForCategory(e.category)]?.visible) continue;
      list.push({
        id: e.id,
        kind: "equipment",
        label: e.quantity > 1 ? `${e.name} ×${e.quantity}` : e.name,
        color: e.id === selectedEquipmentId ? "#ff9d2e" : e.color,
        x: e.position.x,
        y: e.position.y + e.height / 2,
        z: e.position.z,
        w: e.width,
        h: e.height,
        d: e.depth,
        rotation: e.rotation,
        selected: e.id === selectedEquipmentId,
      });
    }
    return list;
  }, [project, selectedId, selectedEquipmentId]);

  if (!project) return null;
  const layers = project.layers;
  const stage = project.stage;

  const spanH = Math.max(stage.width * 1.8, 20);
  const spanV = view === "top" ? Math.max(stage.depth * 4, 24) : Math.max(stage.backWallHeight * 2.6, 14);
  const scale = 1000 / spanH;
  const svgW = 1000;
  const svgH = spanV * scale;
  const RULER = 26;
  const originH = svgW / 2;
  const originV = view === "top" ? svgH * 0.32 : svgH - RULER - 1 * scale;

  /** world → svg */
  const H = (v: number) => originH + v * scale;
  const V = (v: number) => (view === "top" ? originV + v * scale : originV - v * scale);

  const project2D = (it: PlanItem) => {
    if (view === "top") return { cx: it.x, cv: it.z, w: it.w, hgt: it.d, rot: it.rotation };
    if (view === "front") return { cx: it.x, cv: it.y, w: it.w, hgt: it.h, rot: 0 };
    return { cx: it.z, cv: it.y, w: it.d, hgt: it.h, rot: 0 };
  };

  const selected = items.find((i) => i.selected) ?? null;

  const exportSvg = () => {
    const node = svgRef.current;
    if (!node) return;
    const blob = new Blob([new XMLSerializer().serializeToString(node)], {
      type: "image/svg+xml",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, "-").toLowerCase()}-${view}-plan.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stagePlan =
    view === "top"
      ? { cx: 0, cv: 0, w: stage.width, hgt: stage.depth }
      : view === "front"
        ? { cx: 0, cv: stage.height / 2, w: stage.width, hgt: stage.height }
        : { cx: 0, cv: stage.height / 2, w: stage.depth, hgt: stage.height };

  return (
    <div className="min-w-0 flex-1 overflow-auto bg-[#05070b] p-6">
      <header className="mb-4 flex flex-wrap items-center gap-3">
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.24em] text-foreground">
            2D Production Plan
          </h2>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {project.name} · {project.meta.venue || "Venue TBC"} ·{" "}
            {project.meta.eventDate || "Date TBC"}
          </p>
        </div>

        <div className="flex items-center gap-px bg-border/60">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => setView(v.key)}
              className={`px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] ${
                view === v.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={toggleSnap}
          className={`border px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] ${
            snapToGrid ? "border-primary text-primary" : "border-border text-muted-foreground"
          }`}
        >
          Snap {snapToGrid ? "on" : "off"}
        </button>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={exportSvg}
            className="flex items-center gap-1.5 border border-border px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-foreground hover:bg-secondary"
          >
            <Download className="h-3.5 w-3.5" /> Export SVG
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 border border-border px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-foreground hover:bg-secondary"
          >
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
        </div>
      </header>

      {selected && (
        <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1 border border-border bg-card px-3 py-2 font-mono text-[10px] text-muted-foreground">
          <span className="text-foreground">{selected.label}</span>
          <span>W {selected.w.toFixed(2)} m</span>
          <span>H {selected.h.toFixed(2)} m</span>
          <span>D {selected.d.toFixed(2)} m</span>
          <span>X {selected.x.toFixed(2)}</span>
          <span>Y {selected.y.toFixed(2)}</span>
          <span>Z {selected.z.toFixed(2)}</span>
          <span>ROT {selected.rotation.toFixed(1)}°</span>
        </div>
      )}

      <svg
        ref={svgRef}
        viewBox={`0 0 ${svgW} ${svgH}`}
        xmlns="http://www.w3.org/2000/svg"
        className="w-full border border-border bg-[#080a10]"
      >
        {/* grid */}
        {Array.from({ length: Math.ceil(spanH) + 1 }, (_, i) => {
          const x = i * scale;
          return (
            <line
              key={`gx${i}`}
              x1={x}
              y1={0}
              x2={x}
              y2={svgH}
              stroke={i % 5 === 0 ? "#1b2330" : "#111823"}
            />
          );
        })}
        {Array.from({ length: Math.ceil(spanV) + 1 }, (_, i) => {
          const y = i * scale;
          return (
            <line
              key={`gz${i}`}
              x1={0}
              y1={y}
              x2={svgW}
              y2={y}
              stroke={i % 5 === 0 ? "#1b2330" : "#111823"}
            />
          );
        })}

        {/* rulers */}
        <rect x={0} y={svgH - RULER} width={svgW} height={RULER} fill="#0a0e15" stroke="#1b2330" />
        <rect x={0} y={0} width={RULER} height={svgH} fill="#0a0e15" stroke="#1b2330" />
        {Array.from({ length: Math.ceil(spanH) + 1 }, (_, i) => {
          const world = Math.round(-spanH / 2 + i);
          const x = H(world);
          if (x < RULER || x > svgW) return null;
          const major = world % 5 === 0;
          return (
            <g key={`rh${i}`}>
              <line x1={x} y1={svgH - RULER} x2={x} y2={svgH - RULER + (major ? 10 : 5)} stroke="#3a4a63" />
              {major && (
                <text x={x} y={svgH - 6} textAnchor="middle" fill="#6b7a94" fontSize={9} fontFamily="monospace">
                  {world}
                </text>
              )}
            </g>
          );
        })}
        {Array.from({ length: Math.ceil(spanV) + 1 }, (_, i) => {
          const world = view === "top" ? Math.round(-spanV * 0.32 + i) : Math.round(i);
          const y = V(world);
          if (y < 0 || y > svgH - RULER) return null;
          const major = world % 5 === 0;
          return (
            <g key={`rv${i}`}>
              <line x1={RULER - (major ? 10 : 5)} y1={y} x2={RULER} y2={y} stroke="#3a4a63" />
              {major && (
                <text x={4} y={y - 3} fill="#6b7a94" fontSize={9} fontFamily="monospace">
                  {world}
                </text>
              )}
            </g>
          );
        })}

        {/* audience */}
        {view === "top" && layers.audience.visible && stage.audience && (
          <rect
            x={H(-stage.width * 0.8)}
            y={V(stage.depth / 2 + 1)}
            width={stage.width * 1.6 * scale}
            height={stage.depth * 2.4 * scale}
            fill="#0c1018"
            stroke="#1b2330"
            strokeDasharray="6 4"
          />
        )}

        {/* stage */}
        {layers.stage.visible && (
          <g>
            <rect
              x={H(stagePlan.cx - stagePlan.w / 2)}
              y={V(stagePlan.cv + (view === "top" ? -stagePlan.hgt / 2 : stagePlan.hgt / 2))}
              width={stagePlan.w * scale}
              height={stagePlan.hgt * scale}
              fill="#141a24"
              stroke="#5d6c86"
              strokeWidth={1.5}
            />
            <text
              x={H(stagePlan.cx)}
              y={V(stagePlan.cv)}
              textAnchor="middle"
              fill="#5d6c86"
              fontSize={12}
              fontFamily="monospace"
            >
              STAGE {stage.width} × {stage.depth} × {stage.height} m
            </text>
            {view !== "top" && stage.backWall && (
              <rect
                x={H(stagePlan.cx - stagePlan.w / 2)}
                y={V(stage.backWallHeight)}
                width={stagePlan.w * scale}
                height={stage.backWallHeight * scale}
                fill="none"
                stroke="#2b3a52"
                strokeDasharray="4 4"
              />
            )}
          </g>
        )}

        {/* objects */}
        {items.map((it) => {
          const p = project2D(it);
          const w = Math.max(p.w * scale, 5);
          const h = Math.max(p.hgt * scale, 5);
          const cx = H(p.cx);
          const cv = V(p.cv);
          const img = it.kind === "screen" ? screenImages[it.id] : undefined;
          return (
            <g
              key={it.id}
              transform={`rotate(${p.rot} ${cx} ${cv})`}
              className="cursor-pointer"
              onClick={() => (it.kind === "screen" ? select(it.id) : selectEquipment(it.id))}
            >
              <rect
                x={cx - w / 2}
                y={cv - h / 2}
                width={w}
                height={h}
                fill={it.color}
                opacity={it.kind === "screen" ? 1 : 0.9}
                stroke={it.selected ? "#ff9d2e" : "none"}
                strokeWidth={it.selected ? 1.5 : 0}
              />
              {img && (
                <image
                  href={img}
                  x={cx - w / 2}
                  y={cv - h / 2}
                  width={w}
                  height={h}
                  preserveAspectRatio="none"
                />
              )}
              <text
                x={cx}
                y={cv - h / 2 - 4}
                textAnchor="middle"
                fill={it.kind === "screen" ? "#7fd4ff" : "#8b93a7"}
                fontSize={it.kind === "screen" ? 11 : 9}
                fontFamily="monospace"
              >
                {it.label}
              </text>
            </g>
          );
        })}


        {/* measurements */}
        {layers.measurements.visible &&
          view === "top" &&
          project.measurements.map((m) => {
            const length = Math.hypot(m.to.x - m.from.x, m.to.z - m.from.z);
            return (
              <g key={m.id}>
                <line
                  x1={H(m.from.x)}
                  y1={V(m.from.z)}
                  x2={H(m.to.x)}
                  y2={V(m.to.z)}
                  stroke="#68d391"
                  strokeWidth={1.2}
                />
                <text
                  x={H((m.from.x + m.to.x) / 2)}
                  y={V((m.from.z + m.to.z) / 2) - 6}
                  textAnchor="middle"
                  fill="#68d391"
                  fontSize={11}
                  fontFamily="monospace"
                >
                  {m.label} — {length.toFixed(2)} m
                </text>
              </g>
            );
          })}

        {/* title block */}
        <g>
          <rect x={svgW - 300} y={svgH - 96} width={288} height={84} fill="#0b0f16" stroke="#2b3a52" />
          <text x={svgW - 288} y={svgH - 74} fill="#e6ecf5" fontSize={13} fontFamily="monospace">
            {project.name.toUpperCase()}
          </text>
          <text x={svgW - 288} y={svgH - 56} fill="#8b93a7" fontSize={10} fontFamily="monospace">
            {VIEWS.find((v) => v.key === view)?.label.toUpperCase()} · CLIENT:{" "}
            {project.meta.client || "—"}
          </text>
          <text x={svgW - 288} y={svgH - 42} fill="#8b93a7" fontSize={10} fontFamily="monospace">
            VENUE: {project.meta.venue || "—"}
          </text>
          <text x={svgW - 288} y={svgH - 28} fill="#8b93a7" fontSize={10} fontFamily="monospace">
            CANVAS: {project.canvas.width} × {project.canvas.height} · SCALE 1 SQ = 1 m
          </text>
        </g>
      </svg>
    </div>
  );
}
