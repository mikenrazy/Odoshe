import { useRef } from "react";
import { Download, Printer } from "lucide-react";
import { useEditor } from "@/lib/led/store";
import { layerForCategory } from "@/lib/led/types";

/** Top-down production plan drawing with layer control and export. */
export function PlanView() {
  const project = useEditor((s) => s.project);
  const select = useEditor((s) => s.select);
  const selectEquipment = useEditor((s) => s.selectEquipment);
  const selectedId = useEditor((s) => s.selectedId);
  const selectedEquipmentId = useEditor((s) => s.selectedEquipmentId);
  const svgRef = useRef<SVGSVGElement | null>(null);

  if (!project) return null;
  const layers = project.layers;

  const spanX = Math.max(project.stage.width * 1.8, 20);
  const spanZ = Math.max(project.stage.depth * 4, 24);
  const scale = 1000 / spanX;
  const svgW = 1000;
  const svgH = spanZ * scale;
  const cx = svgW / 2;
  const cz = svgH * 0.32;

  const X = (x: number) => cx + x * scale;
  const Z = (z: number) => cz + z * scale;

  const exportSvg = () => {
    const node = svgRef.current;
    if (!node) return;
    const blob = new Blob([new XMLSerializer().serializeToString(node)], {
      type: "image/svg+xml",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, "-").toLowerCase()}-production-plan.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-w-0 flex-1 overflow-auto bg-[#05070b] p-6">
      <header className="mb-4 flex items-center gap-3">
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.24em] text-foreground">
            Production Plan
          </h2>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {project.name} · {project.meta.venue || "Venue TBC"} ·{" "}
            {project.meta.eventDate || "Date TBC"}
          </p>
        </div>
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

      <svg
        ref={svgRef}
        viewBox={`0 0 ${svgW} ${svgH}`}
        xmlns="http://www.w3.org/2000/svg"
        className="w-full border border-border bg-[#080a10]"
      >
        {/* grid + rulers */}
        {Array.from({ length: Math.ceil(spanX) + 1 }, (_, i) => {
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
        {Array.from({ length: Math.ceil(spanZ) + 1 }, (_, i) => {
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

        {layers.audience.visible && project.stage.audience && (
          <rect
            x={X(-project.stage.width * 0.8)}
            y={Z(project.stage.depth / 2 + 1)}
            width={project.stage.width * 1.6 * scale}
            height={project.stage.depth * 2.4 * scale}
            fill="#0c1018"
            stroke="#1b2330"
            strokeDasharray="6 4"
          />
        )}

        {layers.stage.visible && (
          <g>
            <rect
              x={X(-project.stage.width / 2)}
              y={Z(-project.stage.depth / 2)}
              width={project.stage.width * scale}
              height={project.stage.depth * scale}
              fill="#141a24"
              stroke="#5d6c86"
              strokeWidth={1.5}
            />
            <text
              x={X(0)}
              y={Z(0)}
              textAnchor="middle"
              fill="#5d6c86"
              fontSize={12}
              fontFamily="monospace"
            >
              STAGE {project.stage.width} × {project.stage.depth} m
            </text>
          </g>
        )}

        {layers.led.visible &&
          project.screens.map((s) => {
            const w = s.physicalWidth * scale;
            const d = Math.max(s.physicalDepth, 0.25) * scale;
            return (
              <g
                key={s.id}
                onClick={() => select(s.id)}
                transform={`rotate(${-s.rotation.y} ${X(s.position.x)} ${Z(s.position.z)})`}
                className="cursor-pointer"
              >
                <rect
                  x={X(s.position.x) - w / 2}
                  y={Z(s.position.z) - d / 2}
                  width={w}
                  height={d}
                  fill={s.id === selectedId ? "#ff9d2e" : "#7fd4ff"}
                />
                <text
                  x={X(s.position.x)}
                  y={Z(s.position.z) - d / 2 - 6}
                  textAnchor="middle"
                  fill="#7fd4ff"
                  fontSize={11}
                  fontFamily="monospace"
                >
                  {s.name} · {s.physicalWidth}×{s.physicalHeight} m
                </text>
              </g>
            );
          })}

        {project.equipment.map((e) => {
          const layer = layers[layerForCategory(e.category)];
          if (!layer.visible) return null;
          const w = e.width * scale;
          const d = e.depth * scale;
          return (
            <g
              key={e.id}
              onClick={() => selectEquipment(e.id)}
              transform={`rotate(${e.rotation} ${X(e.position.x)} ${Z(e.position.z)})`}
              className="cursor-pointer"
            >
              <rect
                x={X(e.position.x) - w / 2}
                y={Z(e.position.z) - d / 2}
                width={Math.max(w, 6)}
                height={Math.max(d, 6)}
                fill={e.id === selectedEquipmentId ? "#ff9d2e" : e.color}
                opacity={0.9}
              />
              <text
                x={X(e.position.x)}
                y={Z(e.position.z) - Math.max(d, 6) / 2 - 4}
                textAnchor="middle"
                fill="#8b93a7"
                fontSize={9}
                fontFamily="monospace"
              >
                {e.quantity > 1 ? `${e.name} ×${e.quantity}` : e.name}
              </text>
            </g>
          );
        })}

        {layers.measurements.visible &&
          project.measurements.map((m) => {
            const length = Math.hypot(m.to.x - m.from.x, m.to.z - m.from.z);
            return (
              <g key={m.id}>
                <line
                  x1={X(m.from.x)}
                  y1={Z(m.from.z)}
                  x2={X(m.to.x)}
                  y2={Z(m.to.z)}
                  stroke="#68d391"
                  strokeWidth={1.2}
                />
                <text
                  x={X((m.from.x + m.to.x) / 2)}
                  y={Z((m.from.z + m.to.z) / 2) - 6}
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
          <rect
            x={svgW - 300}
            y={svgH - 96}
            width={288}
            height={84}
            fill="#0b0f16"
            stroke="#2b3a52"
          />
          <text x={svgW - 288} y={svgH - 74} fill="#e6ecf5" fontSize={13} fontFamily="monospace">
            {project.name.toUpperCase()}
          </text>
          <text x={svgW - 288} y={svgH - 56} fill="#8b93a7" fontSize={10} fontFamily="monospace">
            CLIENT: {project.meta.client || "—"}
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
