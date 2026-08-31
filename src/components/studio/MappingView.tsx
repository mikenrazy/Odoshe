import { useEditor } from "@/lib/led/store";
import { cabinetCalc } from "@/lib/led/calc";
import { computeGridNumbers } from "@/lib/led/grid-numbering";

/** LED Mapping Mode — physical layout (metres) vs content canvas (pixels). */
export function MappingView() {
  const project = useEditor((s) => s.project);
  const select = useEditor((s) => s.select);
  const selectedId = useEditor((s) => s.selectedId);

  if (!project) return null;
  const grids = computeGridNumbers(project);

  const screens = project.screens;
  const spanX = Math.max(project.stage.width, 4) * 1.3;
  const maxTop = Math.max(6, ...screens.map((s) => s.position.y + s.physicalHeight / 2 + 1));

  const px = 900 / spanX;
  const svgW = 900;
  const svgH = Math.max(240, maxTop * px + 40);

  const canvasScale = 880 / Math.max(1, project.canvas.width);

  return (
    <div className="min-w-0 flex-1 overflow-y-auto bg-[#05070b] p-6">
      <header className="mb-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.24em] text-foreground">
          LED Mapping
        </h2>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          Physical LED layout · processor mapping · canvas coordinates
        </p>
      </header>

      <section className="mb-6 border border-border bg-card p-4">
        <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Physical LED Layout — front elevation
        </h3>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full">
          <rect x={0} y={0} width={svgW} height={svgH} fill="#080a10" />
          <line
            x1={0}
            y1={svgH - 20}
            x2={svgW}
            y2={svgH - 20}
            stroke="#2b3a52"
            strokeDasharray="4 4"
          />
          {screens.map((screen) => {
            const w = screen.physicalWidth * px;
            const h = screen.physicalHeight * px;
            const cx = svgW / 2 + screen.position.x * px;
            const y = svgH - 20 - (screen.position.y + screen.physicalHeight / 2) * px;
            const calc = cabinetCalc(screen);
            const assignment = grids.get(screen.id);
            const selected = screen.id === selectedId;
            return (
              <g key={screen.id} onClick={() => select(screen.id)} className="cursor-pointer">
                <rect
                  x={cx - w / 2}
                  y={y}
                  width={w}
                  height={h}
                  fill={selected ? "#123044" : "#0d1a24"}
                  stroke={selected ? "#ff9d2e" : screen.color}
                  strokeWidth={selected ? 2 : 1}
                />
                {Array.from({ length: calc.cols - 1 }, (_, i) => (
                  <line
                    key={`c${i}`}
                    x1={cx - w / 2 + ((i + 1) * w) / calc.cols}
                    y1={y}
                    x2={cx - w / 2 + ((i + 1) * w) / calc.cols}
                    y2={y + h}
                    stroke="#1b2a3a"
                  />
                ))}
                {Array.from({ length: calc.rows - 1 }, (_, i) => (
                  <line
                    key={`r${i}`}
                    x1={cx - w / 2}
                    y1={y + ((i + 1) * h) / calc.rows}
                    x2={cx + w / 2}
                    y2={y + ((i + 1) * h) / calc.rows}
                    stroke="#1b2a3a"
                  />
                ))}
                <text
                  x={cx}
                  y={y - 8}
                  textAnchor="middle"
                  fill="#e6ecf5"
                  fontSize={12}
                  fontFamily="monospace"
                >
                  {screen.name.toUpperCase()}
                </text>
                <text
                  x={cx}
                  y={y + h + 16}
                  textAnchor="middle"
                  fill="#8b93a7"
                  fontSize={11}
                  fontFamily="monospace"
                >
                  {`${screen.physicalWidth} × ${screen.physicalHeight} m · ${screen.pixelWidth} × ${screen.pixelHeight} px`}
                </text>
                <text
                  x={cx}
                  y={y + h + 30}
                  textAnchor="middle"
                  fill="#7fd4ff"
                  fontSize={11}
                  fontFamily="monospace"
                >
                  {assignment
                    ? `${assignment.processorLabel} · OUT ${screen.processorOutput} · GRID ${assignment.start}–${assignment.start + assignment.count - 1}`
                    : ""}
                </text>
              </g>
            );
          })}
        </svg>
      </section>

      <section className="mb-6 border border-border bg-card p-4">
        <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Content Canvas — {project.canvas.width} × {project.canvas.height} px
        </h3>
        <svg
          viewBox={`0 0 880 ${Math.max(80, project.canvas.height * canvasScale)}`}
          className="w-full border border-border"
        >
          <rect
            x={0}
            y={0}
            width={880}
            height={project.canvas.height * canvasScale}
            fill="#0a0d14"
          />
          {screens.map((screen) => (
            <g key={screen.id} onClick={() => select(screen.id)} className="cursor-pointer">
              <rect
                x={screen.content.x * canvasScale}
                y={screen.content.y * canvasScale}
                width={screen.content.width * canvasScale}
                height={screen.content.height * canvasScale}
                fill="#12283a"
                stroke={screen.id === selectedId ? "#ff9d2e" : "#7fd4ff"}
                strokeWidth={1.5}
              />
              <text
                x={screen.content.x * canvasScale + 8}
                y={screen.content.y * canvasScale + 18}
                fill="#e6ecf5"
                fontSize={11}
                fontFamily="monospace"
              >
                {screen.name.toUpperCase()}
              </text>
              <text
                x={screen.content.x * canvasScale + 8}
                y={screen.content.y * canvasScale + 32}
                fill="#8b93a7"
                fontSize={10}
                fontFamily="monospace"
              >
                {`${screen.content.x},${screen.content.y} · ${screen.content.width}×${screen.content.height}`}
              </text>
            </g>
          ))}
        </svg>
      </section>

      <section className="border border-border bg-card">
        <table className="w-full font-mono text-[10px]">
          <thead>
            <tr className="bg-secondary/40 text-left uppercase tracking-[0.14em] text-muted-foreground">
              <th className="px-3 py-2">Screen</th>
              <th className="px-3 py-2">Physical</th>
              <th className="px-3 py-2">Cabinets</th>
              <th className="px-3 py-2">Resolution</th>
              <th className="px-3 py-2">Canvas</th>
              <th className="px-3 py-2">Processor</th>
              <th className="px-3 py-2">Grid</th>
            </tr>
          </thead>
          <tbody>
            {screens.map((s) => {
              const calc = cabinetCalc(s);
              const a = grids.get(s.id);
              return (
                <tr key={s.id} className="border-t border-border text-foreground/85">
                  <td className="px-3 py-2">{s.name}</td>
                  <td className="px-3 py-2">
                    {s.physicalWidth} × {s.physicalHeight} m
                  </td>
                  <td className="px-3 py-2">
                    {calc.cols} × {calc.rows} ({calc.total})
                  </td>
                  <td className="px-3 py-2">
                    {s.pixelWidth} × {s.pixelHeight}
                  </td>
                  <td className="px-3 py-2">
                    {s.content.x},{s.content.y} · {s.content.width}×{s.content.height}
                  </td>
                  <td className="px-3 py-2">
                    {a?.processorName} · OUT {s.processorOutput}
                  </td>
                  <td className="px-3 py-2 text-primary">
                    {a ? `${a.start}–${a.start + a.count - 1}` : "—"}
                  </td>
                </tr>
              );
            })}
            {screens.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-muted-foreground">
                  No LED surfaces configured.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
