import { useCallback, useMemo, useRef, useState } from "react";
import { Image as ImageIcon, Layers, Square, Trash2, Type, Video } from "lucide-react";
import { useEditor } from "@/lib/led/store";
import type { MediaItem } from "@/lib/led/types";

const MAX_UPLOAD_EDGE = 1920;

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

  const frameRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [showRegions, setShowRegions] = useState(true);
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

  if (!project || !canvas) return null;

  const onPointerDown = (e: React.PointerEvent, item: MediaItem, mode: "move" | "resize") => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    selectMedia(item.id);
    dragRef.current = { id: item.id, mode, startX: e.clientX, startY: e.clientY, origin: item };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = (e.clientX - drag.startX) / scale;
    const dy = (e.clientY - drag.startY) / scale;
    if (drag.mode === "move") {
      updateMedia(
        drag.id,
        { x: Math.round(drag.origin.x + dx), y: Math.round(drag.origin.y + dy) },
        { history: false },
      );
    } else {
      updateMedia(
        drag.id,
        {
          width: Math.max(16, Math.round(drag.origin.width + dx)),
          height: Math.max(16, Math.round(drag.origin.height + dy)),
        },
        { history: false },
      );
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
      addMedia({
        kind: file.type.startsWith("video/") ? "video" : "image",
        name: file.name.replace(/\.[^.]+$/, ""),
        src,
        width: Math.round(width * fit),
        height: Math.round(height * fit),
      });
    }
  };

  const selected = ordered.find((m) => m.id === selectedMediaId) ?? null;

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
          project.screens.map((screen) => (
            <div
              key={screen.id}
              className="pointer-events-none absolute border border-dashed border-[#7fd4ff]/70"
              style={{
                left: screen.content.x * scale,
                top: screen.content.y * scale,
                width: screen.content.width * scale,
                height: screen.content.height * scale,
                zIndex: 999,
              }}
            >
              <span className="absolute left-1 top-1 bg-[#7fd4ff]/15 px-1 font-mono text-[9px] uppercase tracking-wider text-[#7fd4ff]">
                {screen.name} · OUT {screen.processorOutput}
              </span>
            </div>
          ))}
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
                ["W", "width"],
                ["H", "height"],
              ] as const
            ).map(([label, key]) => (
              <label key={key} className="flex items-center justify-between gap-2">
                {label}
                <input
                  type="number"
                  value={selected[key]}
                  onChange={(e) => updateMedia(selected.id, { [key]: Number(e.target.value) })}
                  className="w-24 border border-border bg-input px-2 py-1 text-right text-foreground outline-none focus:border-ring"
                />
              </label>
            ))}
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
