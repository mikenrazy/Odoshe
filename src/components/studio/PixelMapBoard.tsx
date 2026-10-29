import { useEffect, useRef, useState } from "react";
import { CanvasScreenInspector } from "./CanvasScreenInspector";
import { snapRegion } from "@/lib/led/canvas-layout";
import { AlignCenterHorizontal, AlignEndVertical, AlignStartHorizontal, AlignStartVertical, Copy, Download, FlipHorizontal2, Magnet, Plus, Trash2, Maximize, PenTool, ZoomIn, ZoomOut } from "lucide-react";
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
  const [snap, setSnap] = useState(true);
  const [grid, setGrid] = useState(0);
  const [guides, setGuides] = useState<{ axis: "x" | "y"; value: number }[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);

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
  const ed = useEditor.getState();
  const minX = Math.min(0, ...project.screens.filter((s) => s.visible !== false).map((s) => s.content.x));
  const minY = Math.min(0, ...project.screens.filter((s) => s.visible !== false).map((s) => s.content.y));
  const regionOf = (id: string) => { const s = project.screens.find((x) => x.id === id)!; return { x: s.content.x, y: s.content.y, width: s.pixelWidth, height: s.pixelHeight }; };
  const moveTo = (id: string, x: number, y: number, history: boolean) => {
    const s = useEditor.getState().project!.screens.find((q) => q.id === id)!;
    ed.updateScreen(id, { content: { ...s.content, x: Math.round(x), y: Math.round(y) } }, { history });
  };
  const onDown = (e: React.PointerEvent, id: string) => {
    if (L.packed) return;
    e.preventDefault(); ed.select(id);
    const r = regionOf(id);
    drag.current = { id, sx: e.clientX, sy: e.clientY, ox: r.x, oy: r.y, moved: false };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current; const box = boxRef.current; if (!d || !box) return;
    const scale = box.clientWidth / Math.max(1, L.canvasWidth);
    const r = { ...regionOf(d.id), x: d.ox + (e.clientX - d.sx) / scale, y: d.oy + (e.clientY - d.sy) / scale };
    const others = project.screens.filter((s) => s.id !== d.id && s.visible !== false).map((s) => regionOf(s.id));
    const res = snapRegion(r, "move", others, { width: L.canvasWidth, height: L.canvasHeight }, grid, snap, 24 / scale);
    const out = "region" in (res as object) ? (res as unknown as { region: typeof r; guides: typeof guides }) : null;
    const nr = out ? out.region : (res as unknown as typeof r);
    setGuides(out?.guides ?? []);
    d.moved = true; moveTo(d.id, nr.x, nr.y, false);
  };
  const onUp = () => {
    const d = drag.current; drag.current = null; setGuides([]);
    if (d?.moved) { const r = regionOf(d.id); moveTo(d.id, d.ox, d.oy, false); moveTo(d.id, r.x, r.y, true); }
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (!selected) return;
    const step = e.shiftKey ? 10 : 1;
    const k: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (k[e.key]) { e.preventDefault(); moveTo(selected.id, selected.content.x + k[e.key][0], selected.content.y + k[e.key][1], true); }
    if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); ed.deleteScreen(selected.id); }
  };
  const align = (mode: "left" | "top" | "bottom" | "center") => {
    if (!selected) return;
    const others = project.screens.filter((s) => s.id !== selected.id && s.visible !== false);
    const c = selected.content;
    if (mode === "left") moveTo(selected.id, 0, c.y, true);
    if (mode === "top") moveTo(selected.id, c.x, 0, true);
    if (mode === "bottom") moveTo(selected.id, c.x, Math.max(selected.pixelHeight, ...others.map((o) => o.content.y + o.pixelHeight)) - selected.pixelHeight, true);
    if (mode === "center") moveTo(selected.id, c.x, Math.max(selected.pixelHeight, ...others.map((o) => o.content.y + o.pixelHeight)) / 2 - selected.pixelHeight / 2, true);
  };
  const tool = "flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary disabled:opacity-40";

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

      <div className="mx-4 mb-3 flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-card/70 p-1.5">
        <span className="px-1 text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Design</span>
        <button className={tool} onClick={() => ed.addScreen()}><Plus className="h-3.5 w-3.5" /> Add screen</button>
        <button className={tool} disabled={!selected} title="Duplicate" onClick={() => selected && ed.duplicateScreen(selected.id)}><Copy className="h-3.5 w-3.5" /></button>
        <button className={tool} disabled={!selected} title="Delete" onClick={() => selected && ed.deleteScreen(selected.id)}><Trash2 className="h-3.5 w-3.5" /></button>
        <span className="mx-1 h-5 w-px bg-border" />
        <button className={tool} disabled={!selected} title="Align left edge to canvas" onClick={() => align("left")}><AlignStartVertical className="h-3.5 w-3.5" /></button>
        <button className={tool} disabled={!selected} title="Align to top" onClick={() => align("top")}><AlignStartHorizontal className="h-3.5 w-3.5" /></button>
        <button className={tool} disabled={!selected} title="Centre vertically" onClick={() => align("center")}><AlignCenterHorizontal className="h-3.5 w-3.5" /></button>
        <button className={tool} disabled={!selected} title="Align bottoms" onClick={() => align("bottom")}><AlignEndVertical className="h-3.5 w-3.5" /></button>
        <button className={tool} title="Place all screens side by side" onClick={arrange}>Side by side</button>
        <span className="mx-1 h-5 w-px bg-border" />
        <button className={`${tool} ${snap ? "border-primary/60 text-primary" : ""}`} onClick={() => setSnap(!snap)}><Magnet className="h-3.5 w-3.5" /> Smart snap</button>
        <label className="flex items-center gap-1 text-xs text-muted-foreground">Grid
          <select value={grid} onChange={(e) => setGrid(Number(e.target.value))} className="rounded-md border border-border bg-card px-1 py-1 text-xs text-foreground">
            {[0, 8, 16, 32, 64, 128].map((g) => <option key={g} value={g}>{g ? `${g} px` : "Off"}</option>)}
          </select>
        </label>
        <span className="ml-auto pr-1 text-[10px] text-muted-foreground">Drag screens · arrows nudge 1 px (Shift 10) · Del removes</span>
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
          <div ref={boxRef} tabIndex={0} onKeyDown={onKey} onPointerMove={onMove} onPointerUp={onUp} style={{ width: `${zoom * 100}%` }} className="relative mx-auto outline-none">
            <img src={src} alt="Pixel map" className="block w-full max-w-none select-none" draggable={false} />
            {L.placements.map((p) => {
              const sel = p.screenId === selectedId;
              const s = project.screens.find((q) => q.id === p.screenId);
              const x = L.packed ? p.x : (s ? s.content.x - minX : p.x), y = L.packed ? p.y : (s ? s.content.y - minY : p.y);
              return (
                <div key={p.screenId} onPointerDown={(e) => onDown(e, p.screenId)} onClick={() => ed.select(p.screenId)}
                  title={`${p.name} · ${p.width}×${p.height} px`}
                  style={{ left: `${(x / L.canvasWidth) * 100}%`, top: `${(y / L.canvasHeight) * 100}%`, width: `${(p.width / L.canvasWidth) * 100}%`, height: `${(p.height / L.canvasHeight) * 100}%` }}
                  className={`absolute ${L.packed ? "cursor-pointer" : "cursor-move"} ${sel ? "outline outline-2 outline-primary" : "hover:outline hover:outline-1 hover:outline-primary/60"}`}>
                  {sel && <span className="absolute -top-5 left-0 whitespace-nowrap rounded bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">{p.name} · X {s?.content.x} Y {s?.content.y}</span>}
                </div>
              );
            })}
            {guides.map((g, i) => (
              <div key={i} className="pointer-events-none absolute bg-accent" style={g.axis === "x" ? { left: `${((g.value - minX) / L.canvasWidth) * 100}%`, top: 0, bottom: 0, width: 1 } : { top: `${((g.value - minY) / L.canvasHeight) * 100}%`, left: 0, right: 0, height: 1 }} />
            ))}
          </div>
        ) : (
          <p className="pt-24 text-center text-xs text-muted-foreground">Add an LED screen to see the pixel map.</p>
        )}
      </div>

      <div className="px-4 pb-4"><CanvasScreenInspector /></div>
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
