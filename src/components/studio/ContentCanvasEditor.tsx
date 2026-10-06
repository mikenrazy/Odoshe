import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image as ImageIcon, Layers, Square, Trash2, Type, Video } from "lucide-react";
import { useEditor } from "@/lib/led/store";
import { newAssetId, putAsset } from "@/lib/led/asset-store";
import { computeGridNumbers } from "@/lib/led/grid-numbering";
import type { LedScreen, MediaItem } from "@/lib/led/types";

// keep enough resolution for ultra-wide canvases (e.g. 3840 × 1080)
const MAX_UPLOAD_EDGE = 3840;

async function fileToDataUrl(file: File): Promise<{ src: string; width: number; height: number }> {
  const raw = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });

  if (file.type.startsWith("video/")) return { src: raw, width: 1280, height: 720 };

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("decode failed"));
    el.src = raw;
  });

  const scale = Math.min(1, MAX_UPLOAD_EDGE / Math.max(img.width, img.height));
  if (scale === 1) return { src: raw, width: img.width, height: img.height };

  const el = document.createElement("canvas");
  el.width = Math.round(img.width * scale);
  el.height = Math.round(img.height * scale);
  el.getContext("2d")?.drawImage(img, 0, 0, el.width, el.height);
  return { src: el.toDataURL("image/jpeg", 0.85), width: img.width, height: img.height };
}

type DragState = {
  id: string;
  target: "media" | "screen";
  mode: "move" | "resize";
  startX: number;
  startY: number;
  origin: { x: number; y: number; width: number; height: number };
};

/** Native pixel size of the media behind a layer (image or video). */
function useNaturalSize(src: string | undefined, kind: MediaItem["kind"]) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  useEffect(() => {
    setSize(null);
    if (!src || (kind !== "image" && kind !== "video")) return;
    let live = true;
    if (kind === "video") {
      const el = document.createElement("video");
      el.preload = "metadata";
      el.muted = true;
      el.onloadedmetadata = () =>
        live && setSize({ width: el.videoWidth, height: el.videoHeight });
      el.src = src;
      return () => {
        live = false;
      };
    }
    const img = new Image();
    img.onload = () => live && setSize({ width: img.naturalWidth, height: img.naturalHeight });
    img.src = src;
    return () => {
      live = false;
    };
  }, [src, kind]);
  return size;
}

/** How many pixels of the layer frame the media actually paints. */
function renderedSize(
  natural: { width: number; height: number } | null,
  item: MediaItem,
): { width: number; height: number } | null {
  if (!natural || !natural.width || !natural.height) return null;
  if (item.fit === "stretch") return { width: item.width, height: item.height };
  const ratio = natural.width / natural.height;
  const frame = item.width / item.height;
  const cover = item.fit === "cover";
  if (cover ? ratio > frame : ratio < frame) {
    return { width: Math.round(item.height * ratio), height: item.height };
  }
  return { width: item.width, height: Math.round(item.width / ratio) };
}



/**
 * Digital content canvas workspace: media is authored here in logical pixels,
 * and each LED screen simply reads the region of this canvas it is mapped to.
 */
export function ContentCanvasEditor() {
  const project = useEditor((s) => s.project);
  const addMedia = useEditor((s) => s.addMedia);
  const updateMedia = useEditor((s) => s.updateMedia);
  const deleteMedia = useEditor((s) => s.deleteMedia);
  const selectMedia = useEditor((s) => s.selectMedia);
  const raiseMedia = useEditor((s) => s.raiseMedia);
  const selectedMediaId = useEditor((s) => s.selectedMediaId);
  const updateScreen = useEditor((s) => s.updateScreen);
  const setCanvas = useEditor((s) => s.setCanvas);
  const select = useEditor((s) => s.select);
  const selectedId = useEditor((s) => s.selectedId);


  const frameRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [showRegions, setShowRegions] = useState(true);
  const [lockAspect, setLockAspect] = useState(true);
  const [viewWidth, setViewWidth] = useState(1000);

  const measure = useCallback((node: HTMLDivElement | null) => {
    frameRef.current = node;
    if (node) setViewWidth(node.clientWidth);
  }, []);

  const canvas = project?.canvas;
  const scale = canvas ? viewWidth / Math.max(1, canvas.width) : 1;

  const ordered = useMemo(
    () => [...(project?.media ?? [])].sort((a, b) => a.z - b.z),
    [project?.media],
  );
  const grids = useMemo(
    () => (project ? computeGridNumbers(project) : new Map()),
    [project],
  );


  if (!project || !canvas) return null;

  const onPointerDown = (e: React.PointerEvent, item: MediaItem, mode: "move" | "resize") => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    selectMedia(item.id);
    dragRef.current = {
      id: item.id,
      target: "media",
      mode,
      startX: e.clientX,
      startY: e.clientY,
      origin: { x: item.x, y: item.y, width: item.width, height: item.height },
    };
  };

  const onScreenPointerDown = (
    e: React.PointerEvent,
    screen: LedScreen,
    mode: "move" | "resize",
  ) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    select(screen.id);
    dragRef.current = {
      id: screen.id,
      target: "screen",
      mode,
      startX: e.clientX,
      startY: e.clientY,
      origin: { ...screen.content },
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = (e.clientX - drag.startX) / scale;
    const dy = (e.clientY - drag.startY) / scale;
    const patch =
      drag.mode === "move"
        ? { x: Math.round(drag.origin.x + dx), y: Math.round(drag.origin.y + dy) }
        : {
            width: Math.max(16, Math.round(drag.origin.width + dx)),
            height: Math.max(16, Math.round(drag.origin.height + dy)),
          };

    if (drag.target === "media") {
      updateMedia(drag.id, patch, { history: false });
    } else {
      const screen = project?.screens.find((s) => s.id === drag.id);
      if (screen) {
        updateScreen(drag.id, { content: { ...screen.content, ...patch } }, { history: false });
      }
    }
  };


  const endDrag = () => {
    dragRef.current = null;
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      const { src, width, height } = await fileToDataUrl(file);
      const fit = Math.min(canvas.width / width, canvas.height / height, 1);
      // heavy payloads live in IndexedDB; the project only keeps the asset id
      const assetId = newAssetId();
      await putAsset(assetId, src);
      addMedia({
        kind: file.type.startsWith("video/") ? "video" : "image",
        name: file.name.replace(/\.[^.]+$/, ""),
        src,
        assetId,
        width: Math.round(width * fit),
        height: Math.round(height * fit),
      });
    }
  };

  const selected = ordered.find((m) => m.id === selectedMediaId) ?? null;
  const natural = useNaturalSize(selected?.src, selected?.kind ?? "image");
  const painted = selected ? renderedSize(natural, selected) : null;
  /** contain-fitted media leaves black bars — the previews then look "smaller" */
  const letterboxed =
    !!selected &&
    !!painted &&
    selected.fit === "contain" &&
    (painted.width < selected.width - 2 || painted.height < selected.height - 2);



  /** true when the layer sticks out of the canvas — that part is never mapped */
  const overflows =
    !!selected &&
    (selected.x < 0 ||
      selected.y < 0 ||
      selected.x + selected.width > canvas.width ||
      selected.y + selected.height > canvas.height);

  const resizeSelected = (key: "width" | "height", raw: number) => {
    if (!selected) return;
    const value = Math.max(16, Math.round(raw));
    if (!lockAspect) {
      updateMedia(selected.id, { [key]: value });
      return;
    }
    const ratio = selected.width / Math.max(1, selected.height);
    updateMedia(
      selected.id,
      key === "width"
        ? { width: value, height: Math.max(16, Math.round(value / ratio)) }
        : { height: value, width: Math.max(16, Math.round(value * ratio)) },
    );
  };

  /** stretch the layer to exactly cover the canvas (1:1 with processor source) */
  const fillCanvas = () => {
    if (!selected) return;
    updateMedia(selected.id, {
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height,
      fit: "cover",
    });
  };

  /** scale the layer down/up to fit inside the canvas, keeping its aspect */
  const fitCanvas = () => {
    if (!selected) return;
    const k = Math.min(canvas.width / selected.width, canvas.height / selected.height);
    const width = Math.max(16, Math.round(selected.width * k));
    const height = Math.max(16, Math.round(selected.height * k));
    updateMedia(selected.id, {
      width,
      height,
      x: Math.round((canvas.width - width) / 2),
      y: Math.round((canvas.height - height) / 2),
    });
  };

  const centerLayer = () => {
    if (!selected) return;
    updateMedia(selected.id, {
      x: Math.round((canvas.width - selected.width) / 2),
      y: Math.round((canvas.height - selected.height) / 2),
    });
  };

  /** grow the canvas (and processor source) to the layer's own size */
  const canvasToLayer = () => {
    if (!selected) return;
    setCanvas({
      width: Math.max(16, Math.round(selected.width)),
      height: Math.max(16, Math.round(selected.height)),
    });
    updateMedia(selected.id, { x: 0, y: 0 });
  };

  /** snap the layer onto one LED screen's mapped canvas region */
  const fitToScreen = (screenId: string) => {
    const screen = project.screens.find((s) => s.id === screenId);
    if (!screen || !selected) return;
    updateMedia(selected.id, {
      x: screen.content.x,
      y: screen.content.y,
      width: screen.content.width,
      height: screen.content.height,
      fit: "cover",
    });
  };

  return (
    <div className="min-w-0 flex-1 overflow-y-auto bg-[#05070b] p-6">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.24em] text-foreground">
            Content Canvas
          </h2>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {canvas.width} × {canvas.height} px digital canvas · media authored in logical pixels
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em]">
          <label className="cursor-pointer border border-border px-3 py-1.5 text-muted-foreground hover:text-foreground">
            <ImageIcon className="mr-1 inline h-3 w-3" /> Upload media
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(e) => void upload(e.target.files)}
            />
          </label>
          <button
            type="button"
            onClick={() => addMedia({ kind: "text", name: "Text", text: "DX5VE" })}
            className="border border-border px-3 py-1.5 text-muted-foreground hover:text-foreground"
          >
            <Type className="mr-1 inline h-3 w-3" /> Text
          </button>
          <button
            type="button"
            onClick={() => addMedia({ kind: "shape", name: "Colour block" })}
            className="border border-border px-3 py-1.5 text-muted-foreground hover:text-foreground"
          >
            <Square className="mr-1 inline h-3 w-3" /> Block
          </button>
          <button
            type="button"
            onClick={() => setShowRegions((v) => !v)}
            className={`border border-border px-3 py-1.5 ${
              showRegions ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Layers className="mr-1 inline h-3 w-3" /> Screen regions
          </button>
        </div>
      </header>

      <div
        ref={measure}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onPointerDown={() => selectMedia(null)}
        className="relative w-full select-none overflow-hidden border border-border bg-black"
        style={{ height: canvas.height * scale }}
      >
        {ordered.map((item) => (
          <div
            key={item.id}
            onPointerDown={(e) => onPointerDown(e, item, "move")}
            className={`absolute cursor-move overflow-hidden ${
              item.id === selectedMediaId ? "outline outline-1 outline-primary" : ""
            }`}
            style={{
              left: item.x * scale,
              top: item.y * scale,
              width: item.width * scale,
              height: item.height * scale,
              opacity: item.visible ? item.opacity : 0.15,
              zIndex: item.z + 1,
            }}
          >
            {item.kind === "image" && item.src && (
              <img
                src={item.src}
                alt={item.name}
                draggable={false}
                className="h-full w-full"
                style={{ objectFit: item.fit === "stretch" ? "fill" : item.fit }}
              />
            )}
            {item.kind === "video" && item.src && (
              <video src={item.src} muted loop autoPlay playsInline className="h-full w-full object-cover" />
            )}
            {item.kind === "shape" && (
              <div className="h-full w-full" style={{ background: item.color }} />
            )}
            {item.kind === "text" && (
              <div
                className="flex h-full w-full items-center justify-center text-center font-semibold leading-none"
                style={{ color: item.color, fontSize: item.fontSize * scale }}
              >
                {item.text}
              </div>
            )}
            {item.id === selectedMediaId && (
              <span
                onPointerDown={(e) => onPointerDown(e, item, "resize")}
                className="absolute bottom-0 right-0 h-3 w-3 cursor-nwse-resize bg-primary"
              />
            )}
          </div>
        ))}

        {showRegions &&
          project.screens.map((screen) => {
            const proc = project.processors.find((p) => p.id === screen.processorId);
            const assignment = grids.get(screen.id);
            return (
              <div
                key={screen.id}
                onPointerDown={(e) => onScreenPointerDown(e, screen, "move")}
                className={`absolute cursor-move border border-dashed ${
                  screen.id === selectedId ? "border-primary bg-primary/5" : "border-[#7fd4ff]/70"
                }`}
                style={{
                  left: screen.content.x * scale,
                  top: screen.content.y * scale,
                  width: screen.content.width * scale,
                  height: screen.content.height * scale,
                  zIndex: 999,
                }}
              >
                <span className="pointer-events-none absolute left-1 top-1 bg-[#7fd4ff]/15 px-1 font-mono text-[9px] uppercase leading-relaxed tracking-wider text-[#7fd4ff]">
                  {screen.name} · {proc ? `${proc.brand} ${proc.label}` : "UNPATCHED"} · RJ45 PORT{" "}
                  {screen.rj45Port} · OUT {screen.processorOutput}
                  {assignment
                    ? ` · GRID ${assignment.start}–${assignment.start + assignment.count - 1}`
                    : ""}
                </span>
                <span className="pointer-events-none absolute bottom-1 left-1 bg-black/40 px-1 font-mono text-[9px] text-muted-foreground">
                  {screen.content.x},{screen.content.y} · {screen.content.width}×
                  {screen.content.height} px
                </span>
                <span
                  onPointerDown={(e) => onScreenPointerDown(e, screen, "resize")}
                  className="absolute bottom-0 right-0 h-3 w-3 cursor-nwse-resize bg-[#7fd4ff]"
                />
              </div>
            );
          })}


      </div>

      <section className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="border border-border bg-card">
          <table className="w-full font-mono text-[10px]">
            <thead>
              <tr className="bg-secondary/40 text-left uppercase tracking-[0.14em] text-muted-foreground">
                <th className="px-3 py-2">Layer</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Position</th>
                <th className="px-3 py-2">Size</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {[...ordered].reverse().map((m) => (
                <tr
                  key={m.id}
                  onClick={() => selectMedia(m.id)}
                  className={`cursor-pointer border-t border-border ${
                    m.id === selectedMediaId ? "bg-secondary/40 text-primary" : "text-foreground/85"
                  }`}
                >
                  <td className="px-3 py-2">{m.name}</td>
                  <td className="px-3 py-2 uppercase text-muted-foreground">
                    {m.kind === "video" ? <Video className="inline h-3 w-3" /> : m.kind}
                  </td>
                  <td className="px-3 py-2">
                    {m.x}, {m.y}
                  </td>
                  <td className="px-3 py-2">
                    {m.width} × {m.height}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMedia(m.id);
                      }}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}
              {ordered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-muted-foreground">
                    No media on the canvas yet — upload an image or video to begin.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {selected && (
          <div className="space-y-2 border border-border bg-card p-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <div className="text-primary">{selected.name}</div>
            {(
              [
                ["X", "x"],
                ["Y", "y"],
              ] as const
            ).map(([label, key]) => (
              <label key={key} className="flex items-center justify-between gap-2">
                {label}
                <PxInput
                  value={selected[key]}
                  onCommit={(v) => updateMedia(selected.id, { [key]: Math.round(v) })}
                />
              </label>
            ))}
            {(
              [
                ["W", "width"],
                ["H", "height"],
              ] as const
            ).map(([label, key]) => (
              <label key={key} className="flex items-center justify-between gap-2">
                {label}
                <PxInput value={selected[key]} onCommit={(v) => resizeSelected(key, v)} />
              </label>
            ))}
            <label className="flex items-center justify-between gap-2">
              Lock aspect
              <input
                type="checkbox"
                checked={lockAspect}
                onChange={(e) => setLockAspect(e.target.checked)}
                className="h-3 w-3 accent-primary"
              />
            </label>

            <div className="grid grid-cols-2 gap-1 pt-1">
              <button
                type="button"
                onClick={fillCanvas}
                className="border border-border py-1 hover:text-foreground"
              >
                Fill canvas
              </button>
              <button
                type="button"
                onClick={fitCanvas}
                className="border border-border py-1 hover:text-foreground"
              >
                Fit canvas
              </button>
              <button
                type="button"
                onClick={centerLayer}
                className="border border-border py-1 hover:text-foreground"
              >
                Centre
              </button>
              <button
                type="button"
                onClick={canvasToLayer}
                className="border border-border py-1 hover:text-foreground"
              >
                Canvas → layer
              </button>
            </div>

            {project.screens.length > 0 && (
              <label className="flex items-center justify-between gap-2">
                Fit to screen
                <select
                  value=""
                  onChange={(e) => e.target.value && fitToScreen(e.target.value)}
                  className="w-24 border border-border bg-input px-2 py-1 text-foreground outline-none"
                >
                  <option value="">Select…</option>
                  {project.screens.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {overflows && (
              <p className="border border-destructive/60 bg-destructive/10 p-2 text-[9px] leading-relaxed tracking-normal text-destructive">
                Layer is {selected.width}×{selected.height} px but the canvas is {canvas.width}×
                {canvas.height} px — anything outside the canvas is never mapped to the LED
                surfaces. Use “Fit canvas”, or “Canvas → layer” to raise the source resolution.
              </p>
            )}
            <label className="flex items-center justify-between gap-2">
              Opacity
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={selected.opacity}
                onChange={(e) => updateMedia(selected.id, { opacity: Number(e.target.value) })}
                className="w-24"
              />
            </label>
            <label className="flex items-center justify-between gap-2">
              Fit
              <select
                value={selected.fit}
                onChange={(e) =>
                  updateMedia(selected.id, { fit: e.target.value as MediaItem["fit"] })
                }
                className="w-24 border border-border bg-input px-2 py-1 text-foreground outline-none"
              >
                <option value="cover">Cover</option>
                <option value="contain">Contain</option>
                <option value="stretch">Stretch</option>
              </select>
            </label>
            {natural && (
              <div className="flex items-center justify-between gap-2 text-[9px] text-muted-foreground">
                <span>Source</span>
                <span className="font-mono text-foreground">
                  {natural.width}×{natural.height}
                  {painted ? ` → ${painted.width}×${painted.height}` : ""}
                </span>
              </div>
            )}
            {letterboxed && painted && (
              <div className="space-y-1 border border-amber-500/60 bg-amber-500/10 p-2 text-[9px] leading-relaxed tracking-normal text-amber-400">
                <p>
                  Fit is “Contain”, so the media only paints {painted.width}×{painted.height} of the{" "}
                  {selected.width}×{selected.height} layer — the rest is black in the 2D/3D previews
                  and on the LED output.
                </p>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => updateMedia(selected.id, { fit: "cover" })}
                    className="border border-amber-500/60 py-1 hover:text-foreground"
                  >
                    Cover (crop)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateMedia(selected.id, { fit: "stretch" })}
                    className="border border-amber-500/60 py-1 hover:text-foreground"
                  >
                    Stretch
                  </button>
                </div>
              </div>
            )}

            {(selected.kind === "text" || selected.kind === "shape") && (
              <label className="flex items-center justify-between gap-2">
                Colour
                <input
                  type="color"
                  value={selected.color}
                  onChange={(e) => updateMedia(selected.id, { color: e.target.value })}
                  className="h-6 w-24 border border-border bg-input"
                />
              </label>
            )}
            {selected.kind === "text" && (
              <label className="flex items-center justify-between gap-2">
                Copy
                <input
                  value={selected.text ?? ""}
                  onChange={(e) => updateMedia(selected.id, { text: e.target.value })}
                  onKeyDown={(e) => e.stopPropagation()}
                  className="w-24 border border-border bg-input px-2 py-1 text-foreground outline-none"
                />
              </label>
            )}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => raiseMedia(selected.id, 1)}
                className="flex-1 border border-border py-1 hover:text-foreground"
              >
                Bring forward
              </button>
              <button
                type="button"
                onClick={() => raiseMedia(selected.id, -1)}
                className="flex-1 border border-border py-1 hover:text-foreground"
              >
                Send back
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

/** Number box that lets you type freely and applies on Enter / leaving the field. */
function PxInput({ value, onCommit }: { value: number; onCommit: (v: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = () => {
    const n = Number(draft);
    if (draft.trim() !== "" && Number.isFinite(n)) onCommit(n);
    else setDraft(String(value));
  };
  return (
    <span className="flex items-center gap-1">
      <input
        type="number"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setDraft(String(value));
        }}
        className="w-24 border border-border bg-input px-2 py-1 text-right text-foreground outline-none focus:border-ring"
      />
      <span className="normal-case">px</span>
    </span>
  );
}
