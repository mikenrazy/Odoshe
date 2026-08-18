import { lazy, Suspense, useEffect, useState } from "react";
import { useEditor } from "@/lib/led/store";

const Viewport = lazy(() => import("./Viewport"));

export function ViewportHost() {
  const [mounted, setMounted] = useState(false);
  const mode = useEditor((s) => s.mode);
  const selectedId = useEditor((s) => s.selectedId);
  const project = useEditor((s) => s.project);

  useEffect(() => setMounted(true), []);

  const selected = project?.screens.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="relative min-w-0 flex-1 bg-[#05070b]">
      {mounted ? (
        <Suspense fallback={<Loading />}>
          <Viewport />
        </Suspense>
      ) : (
        <Loading />
      )}

      <div className="pointer-events-none absolute left-3 top-3 space-y-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        <div className="text-foreground/70">{mode} mode</div>
        {mode === "preview" && <div className="text-primary">Editing disabled</div>}
        {selected && mode !== "preview" && (
          <div className="text-[#ff9d2e]">{selected.name} selected</div>
        )}
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 font-mono text-[10px] leading-relaxed text-muted-foreground/70">
        <div>LMB orbit · RMB pan · Wheel zoom</div>
        <div>G move · R rotate · S scale · F focus · Del delete</div>
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex h-full items-center justify-center font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
      Initialising 3D engine…
    </div>
  );
}
