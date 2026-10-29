import { useEffect, useState } from "react";
import { Download, FlipHorizontal2, Maximize, PenTool, ZoomIn, ZoomOut } from "lucide-react";
import { useEditor } from "@/lib/led/store";
import { globalLayout } from "@/lib/led/engineering";
import { downloadDxf, downloadPixelMapPng, renderPixelMap } from "@/lib/led/pixel-map-export";
import { getAsset } from "@/lib/led/asset-store";

/** LEDMapper-style 2D pixel map: totals, live test card, zoom, mirror and exports. */
export function PixelMapBoard() {
  const project = useEditor((s) => s.project);
  const selectedId = useEditor((s) => s.selectedId);
  const mirrorScreen = useEditor((s) => s.mirrorScreen);
  const arrange = useEditor((s) => s.arrangeCanvasSideBySide);
  const [src, setSrc] = useState<string | null>(null);
  const [logo, setLogo] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    let live = true;
    const m = project?.meta;
    if (m?.coverImage) setLogo(m.coverImage);
    else if (m?.coverAssetId) void getAsset(m.coverAssetId).then((v) => live && setLogo(v ?? null));
    else setLogo(null);
    return () => { live = false; };
  }, [project?.meta]);

  useEffect(() => {
    if (!project) return;
    let live = true;
    const t = setTimeout(() => {
      void renderPixelMap(project, logo).then((cv) => {
        // preview at max 2400 px wide to stay light
        const s = Math.min(1, 2400 / cv.width);
        const p = document.createElement("canvas"); p.width = Math.max(1, cv.width * s); p.height = Math.max(1, cv.height * s);
        p.getContext("2d")!.drawImage(cv, 0, 0, p.width, p.height);
        if (live) setSrc(p.toDataURL("image/png"));
      });
    }, 150);
    return () => { live = false; clearTimeout(t); };
  }, [project, logo]);

  if (!project) return null;
  const L = globalLayout(project);
  const selected = project.screens.find((s) => s.id === selectedId);

  return (
    <section className="relative mb-6 overflow-hidden rounded-xl border border-border bg-grid">
      <div className="flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="flex items-center gap-4 rounded-xl border border-border bg-card/80 px-4 py-2">
          <div>
            <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Total pixels</div>
            <div className="text-lg font-extrabold text-primary">{L.canvasWidth} × {L.canvasHeight} px</div>
          </div>
          <div className="h-8 w-px bg-primary/60" />
          <div>
            <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Total area</div>
            <div className="text-lg font-extrabold text-primary">{L.activeAreaM2.toFixed(0)} m² <span className="text-xs font-medium text-muted-foreground">({L.footprintWidthM.toFixed(2)} × {L.footprintHeightM.toFixed(2)} m)</span></div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button disabled={!selected} title={selected ? `Mirror ${selected.name} to the other side` : "Select a screen first"} onClick={() => selected && mirrorScreen(selected.id)}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary disabled:opacity-40">
            <FlipHorizontal2 className="h-3.5 w-3.5" /> Mirror
          </button>
          <button onClick={() => void downloadPixelMapPng(project, logo)}
            className="flex items-center gap-1.5 rounded-lg border border-primary/50 bg-primary/10 px-3 py-1.5 text-xs font-bold uppercase text-primary hover:bg-primary/20">
            <Download className="h-3.5 w-3.5" /> Pixel map PNG
          </button>
          <button onClick={() => downloadDxf(project)}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary">
            <PenTool className="h-3.5 w-3.5" /> DXF
          </button>
        </div>
      </div>

      {L.packed && (
        <div className="mx-4 mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-accent/50 bg-accent/10 px-3 py-2 text-xs text-foreground">
          <span>Some screens overlap on your Content Canvas. The pixel map and report show them side by side.</span>
          <button onClick={arrange} className="rounded-md bg-accent px-3 py-1 font-bold text-accent-foreground">Fix Content Canvas too</button>
        </div>
      )}
      <div className="relative h-[340px] overflow-auto px-6 pb-6">
        <div className="pointer-events-none absolute inset-y-0 left-1/2 border-l border-dashed border-primary/50" />
        {src ? (
          <img src={src} alt="Pixel map" style={{ width: `${zoom * 100}%` }} className="relative mx-auto block max-w-none" />
        ) : (
          <p className="pt-24 text-center text-xs text-muted-foreground">Add an LED screen to see the pixel map.</p>
        )}
      </div>

      <div className="absolute bottom-4 right-3 flex flex-col items-center gap-1.5 rounded-full border border-border bg-card/90 p-1.5">
        {([[ZoomIn, "Zoom in", () => setZoom((z) => Math.min(4, z * 1.25))], [Maximize, "Fit", () => setZoom(1)], [ZoomOut, "Zoom out", () => setZoom((z) => Math.max(0.25, z / 1.25))]] as const).map(([Icon, t, fn]) => (
          <button key={t} title={t} onClick={fn} className="grid h-8 w-8 place-items-center rounded-full border border-border text-muted-foreground hover:text-primary">
            <Icon className="h-4 w-4" />
          </button>
        ))}
        <span className="text-[10px] font-bold text-foreground">{Math.round(zoom * 100)}%</span>
      </div>
    </section>
  );
}
