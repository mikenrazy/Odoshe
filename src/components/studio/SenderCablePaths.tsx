import { cabinetCalc } from "@/lib/led/calc";
import { senderPortPreview } from "@/lib/led/engineering";
import type { ProcessorModel, Project } from "@/lib/led/types";

export function SenderCablePaths({ project, processor }: { project: Project; processor: ProcessorModel }) {
  const previews = senderPortPreview(project, processor);
  if (!previews.length) return null;
  return (
    <section className="mt-3 border-t border-border pt-2" aria-label="Sender cabinet cable paths">
      <h3 className="text-[11px] font-semibold text-foreground">Two-port cabinet cable map</h3>
      {previews.map(({ screen, chains, provisional, issue }) => {
        const c = cabinetCalc(screen);
        const nativeConfirmed = Boolean(screen.cabinetKey || (screen.panelConfiguration.nativePixelWidth && screen.panelConfiguration.nativePixelHeight));
        const cell = 36;
        const margin = 18;
        return (
          <div key={screen.id} className="mt-3 space-y-2 text-[11px]" aria-label={`${screen.name} cable map`}>
            <div className="break-words font-semibold text-foreground">{screen.name} · {c.cols} × {c.rows} · {c.total} cabinets</div>
            <div className="text-muted-foreground">{c.cabinetWidth} × {c.cabinetHeight} m · {screen.pixelWidth} × {screen.pixelHeight} px{!nativeConfirmed && " (pitch estimate)"}</div>
            {provisional && <p className="text-accent">Provisional cable plan — balanced across two fitted ports. Sender pixel limits are unconfirmed; do not configure hardware from this preview.</p>}
            {!nativeConfirmed && <p className="text-muted-foreground">Native cabinet pixels still need supplier confirmation.</p>}
            {issue && <p role="alert" className="text-destructive">{issue}</p>}
            {chains.length > 0 && <svg role="img" aria-label={`${screen.name} front-view cabinet cable paths`} viewBox={`0 0 ${c.cols * cell + margin * 2} ${c.rows * cell + margin * 2}`} className="max-h-80 w-full bg-background">
              {chains.map((chain) => <g key={chain.port} className={chain.overflow || chain.loadPct > 100 ? "text-destructive" : chain.port === 1 ? "text-primary" : "text-accent"}>
                {chain.path.map(([col, row], i) => <g key={`${col}-${row}`}>
                  <rect x={margin + col * cell + 2} y={margin + row * cell + 2} width={cell - 4} height={cell - 4} fill="currentColor" fillOpacity={0.12} stroke="currentColor" strokeOpacity={0.4} />
                  <text x={margin + col * cell + cell / 2} y={margin + row * cell + 12} textAnchor="middle" fill="currentColor" fontSize={8}>{`P${chain.port}·${i + 1}`}</text>
                </g>)}
                <polyline points={chain.path.map(([col, row]) => `${margin + col * cell + cell / 2},${margin + row * cell + 24}`).join(" ")} fill="none" stroke="currentColor" strokeWidth={2} />
                {chain.path[0] && <circle cx={margin + chain.path[0][0] * cell + cell / 2} cy={margin + chain.path[0][1] * cell + 24} r={4} fill="currentColor" />}
              </g>)}
            </svg>}
            {[1, 2].map((port) => {
              const chain = chains.find((value) => value.port === port);
              const start = chain?.path[0];
              const end = chain?.path.at(-1);
              return <div key={port} className="border-l-2 border-border pl-2">
                <div className={port === 1 ? "font-semibold text-primary" : "font-semibold text-accent"}>Port {port} · {chain?.cabinets ?? 0} cabinets · {chain?.pixels.toLocaleString() ?? 0} px</div>
                {start && end ? <>
                  <div className="break-words text-muted-foreground">Sender P{port} → C{start[0] + 1}/R{start[1] + 1} → {chain.cabinets - 1} cabinet jumpers → C{end[0] + 1}/R{end[1] + 1}</div>
                  <details className="text-muted-foreground"><summary className="cursor-pointer">Full cable order · columns left to right, rows top to bottom</summary><p className="mt-1 break-words">{chain.path.map(([col, row]) => `C${col + 1}/R${row + 1}`).join(" → ")}</p></details>
                </> : <div className="text-muted-foreground">No cable assigned on this screen.</div>}
              </div>;
            })}
            {chains.some((chain) => chain.overflow || chain.loadPct > 100) && <p role="alert" className="text-destructive">Invalid cable plan: sender limits are exceeded. Do not connect unavailable ports.</p>}
          </div>
        );
      })}
    </section>
  );
}