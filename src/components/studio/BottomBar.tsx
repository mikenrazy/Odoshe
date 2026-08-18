import { useEditor } from "@/lib/led/store";

function distance(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

export function BottomBar() {
  const project = useEditor((s) => s.project);
  const selectedId = useEditor((s) => s.selectedId);
  const status = useEditor((s) => s.status);
  const dirty = useEditor((s) => s.dirty);
  const lastSavedAt = useEditor((s) => s.lastSavedAt);
  const mode = useEditor((s) => s.mode);

  if (!project) return null;
  const screens = project.screens;
  const selected = screens.find((s) => s.id === selectedId) ?? null;
  const totalPixels = screens.reduce((sum, s) => sum + s.pixelWidth * s.pixelHeight, 0);
  const totalArea = screens.reduce((sum, s) => sum + s.physicalWidth * s.physicalHeight, 0);

  const neighbourGap = (() => {
    if (!selected) return null;
    const others = screens.filter((s) => s.id !== selected.id);
    if (others.length === 0) return null;
    const nearest = others.reduce((best, s) =>
      distance(s.position, selected.position) < distance(best.position, selected.position)
        ? s
        : best,
    );
    return { name: nearest.name, d: distance(nearest.position, selected.position) };
  })();

  return (
    <footer className="flex h-9 shrink-0 items-center gap-5 overflow-x-auto border-t border-border bg-card px-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
      <span className="text-primary">{mode}</span>
      <Stat label="Stage" value={`${project.stage.width} × ${project.stage.depth} × ${project.stage.height} m`} />
      <Stat label="Screens" value={String(screens.length)} />
      <Stat label="LED Area" value={`${totalArea.toFixed(2)} m²`} />
      <Stat label="Total Pixels" value={totalPixels.toLocaleString()} />
      {selected && (
        <>
          <Stat label="Selected" value={selected.name} />
          <Stat
            label="Pos"
            value={`${selected.position.x.toFixed(2)} / ${selected.position.y.toFixed(
              2,
            )} / ${selected.position.z.toFixed(2)} m`}
          />
          <Stat
            label="Elevation"
            value={`${(selected.position.y - selected.physicalHeight / 2).toFixed(2)} m`}
          />
          {neighbourGap && (
            <Stat
              label={`Dist → ${neighbourGap.name}`}
              value={`${neighbourGap.d.toFixed(2)} m`}
            />
          )}
        </>
      )}
      <span className="ml-auto flex items-center gap-4">
        <span className="normal-case tracking-normal">{status}</span>
        <span className={dirty ? "text-[#ffb454]" : "text-[#68d391]"}>
          {dirty
            ? "Autosaving…"
            : lastSavedAt
              ? `Saved ${new Date(lastSavedAt).toLocaleTimeString()}`
              : "Saved"}
        </span>
      </span>
    </footer>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      <span className="text-muted-foreground/60">{label}</span>
      <span className="text-foreground/85">{value}</span>
    </span>
  );
}
