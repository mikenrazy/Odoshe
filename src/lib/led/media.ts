import { useEffect, useMemo, useState } from "react";
import { useEditor } from "./store";
import type { CanvasConfig, MediaItem } from "./types";

/** Composite render resolution cap — keeps textures light for WebGL. */
const MAX_COMPOSITE_WIDTH = 2048;

const imageCache = new Map<string, HTMLImageElement>();
const videoCache = new Map<string, HTMLVideoElement>();

function loadImage(src: string): Promise<HTMLImageElement | null> {
  const cached = imageCache.get(src);
  if (cached) return Promise.resolve(cached);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Looping, muted video element used as a live texture source. */
function loadVideo(src: string): HTMLVideoElement | null {
  if (typeof document === "undefined") return null;
  const cached = videoCache.get(src);
  if (cached) return cached;
  const el = document.createElement("video");
  el.src = src;
  el.muted = true;
  el.loop = true;
  el.autoplay = true;
  el.playsInline = true;
  el.crossOrigin = "anonymous";
  void el.play().catch(() => undefined);
  videoCache.set(src, el);
  return el;
}

function drawFitted(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | HTMLVideoElement,
  item: MediaItem,
  s: number,
) {
  const iw = img instanceof HTMLVideoElement ? img.videoWidth : img.width;
  const ih = img instanceof HTMLVideoElement ? img.videoHeight : img.height;
  if (!iw || !ih) return;
  const dx = item.x * s;
  const dy = item.y * s;
  const dw = item.width * s;
  const dh = item.height * s;

  if (item.fit === "stretch") {
    ctx.drawImage(img, dx, dy, dw, dh);
    return;
  }

  const ratio = iw / ih;
  const frame = dw / dh;
  const cover = item.fit === "cover";
  let w = dw;
  let h = dh;
  if (cover ? ratio > frame : ratio < frame) {
    h = dh;
    w = dh * ratio;
  } else {
    w = dw;
    h = dw / ratio;
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(dx, dy, dw, dh);
  ctx.clip();
  ctx.drawImage(img, dx + (dw - w) / 2, dy + (dh - h) / 2, w, h);
  ctx.restore();
}

/** Rasterise every media item into one canvas at (scaled) content-canvas size. */
export async function renderComposite(
  canvasConfig: CanvasConfig,
  media: MediaItem[],
): Promise<HTMLCanvasElement | null> {
  if (typeof document === "undefined") return null;
  const scale = Math.min(1, MAX_COMPOSITE_WIDTH / Math.max(1, canvasConfig.width));
  const el = document.createElement("canvas");
  el.width = Math.max(2, Math.round(canvasConfig.width * scale));
  el.height = Math.max(2, Math.round(canvasConfig.height * scale));
  const ctx = el.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, el.width, el.height);

  const ordered = [...media].filter((m) => m.visible).sort((a, b) => a.z - b.z);
  for (const item of ordered) {
    ctx.globalAlpha = item.opacity;
    if (item.kind === "shape") {
      ctx.fillStyle = item.color;
      ctx.fillRect(item.x * scale, item.y * scale, item.width * scale, item.height * scale);
    } else if (item.kind === "text") {
      ctx.fillStyle = item.color;
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      ctx.font = `700 ${Math.max(8, item.fontSize * scale)}px Barlow, system-ui, sans-serif`;
      ctx.fillText(
        item.text ?? item.name,
        (item.x + item.width / 2) * scale,
        (item.y + item.height / 2) * scale,
      );
    } else if (item.kind === "video" && item.src) {
      const video = loadVideo(item.src);
      if (video && video.readyState >= 2) drawFitted(ctx, video, item, scale);
      else {
        ctx.fillStyle = "#11151d";
        ctx.fillRect(item.x * scale, item.y * scale, item.width * scale, item.height * scale);
      }
    } else if (item.src) {
      const img = await loadImage(item.src);
      if (img) drawFitted(ctx, img, item, scale);
    }
    ctx.globalAlpha = 1;
  }
  return el;
}

/** Live composite of the project's content canvas, re-rendered as media changes. */
export function useCanvasComposite() {
  const media = useEditor((s) => s.project?.media);
  const canvas = useEditor((s) => s.project?.canvas);
  const [composite, setComposite] = useState<HTMLCanvasElement | null>(null);
  const signature = JSON.stringify({ canvas, media });

  useEffect(() => {
    let cancelled = false;
    if (!canvas || !media || media.length === 0) {
      setComposite(null);
      return;
    }
    void renderComposite(canvas, media).then((el) => {
      if (!cancelled) setComposite(el);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return composite;
}

/** Crop a region (in logical canvas pixels) of the composite to a data URL. */
export function cropRegion(
  composite: HTMLCanvasElement,
  canvasWidth: number,
  region: { x: number; y: number; width: number; height: number },
): string | null {
  if (typeof document === "undefined") return null;
  const scale = composite.width / Math.max(1, canvasWidth);
  const el = document.createElement("canvas");
  el.width = Math.max(2, Math.round(region.width * scale));
  el.height = Math.max(2, Math.round(region.height * scale));
  const ctx = el.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, el.width, el.height);
  ctx.drawImage(
    composite,
    region.x * scale,
    region.y * scale,
    Math.max(2, region.width * scale),
    Math.max(2, region.height * scale),
    0,
    0,
    el.width,
    el.height,
  );
  return el.toDataURL("image/jpeg", 0.8);
}

/** Per-screen preview images (uploaded artwork wins, else the mapped canvas region). */
export function useScreenImages(): Record<string, string> {
  const screens = useEditor((s) => s.project?.screens);
  const canvasWidth = useEditor((s) => s.project?.canvas.width ?? 1920);
  const composite = useCanvasComposite();

  return useMemo(() => {
    const out: Record<string, string> = {};
    for (const s of screens ?? []) {
      if (s.contentImage) {
        out[s.id] = s.contentImage;
      } else if (composite) {
        const url = cropRegion(composite, canvasWidth, s.content);
        if (url) out[s.id] = url;
      }
    }
    return out;
  }, [screens, canvasWidth, composite]);
}

