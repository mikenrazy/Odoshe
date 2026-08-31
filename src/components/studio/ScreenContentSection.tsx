import { useRef } from "react";
import { ImageUp, X } from "lucide-react";
import { useEditor } from "@/lib/led/store";
import type { LedScreen } from "@/lib/led/types";
import { Section } from "./Field";

/** Downscale uploads so project content stays lightweight in local storage. */
function toDataUrl(file: File, maxWidth = 1600): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode failed"));
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no canvas"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function ScreenContentSection({ screen }: { screen: LedScreen }) {
  const updateScreen = useEditor((s) => s.updateScreen);
  const input = useRef<HTMLInputElement | null>(null);

  return (
    <Section title="Screen Content (3D Preview)">
      <p className="mb-2 text-[10px] leading-relaxed text-muted-foreground">
        Upload artwork, a holding slide or a screen grab to see it mapped onto this LED surface in
        the realistic 3D view.
      </p>

      {screen.contentImage ? (
        <div className="relative mb-2 border border-border">
          <img
            src={screen.contentImage}
            alt={`${screen.name} content preview`}
            className="block w-full"
          />
          <button
            type="button"
            title="Remove content"
            onClick={() => updateScreen(screen.id, { contentImage: undefined })}
            className="absolute right-1 top-1 bg-background/80 p-1 text-muted-foreground hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : null}

      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const contentImage = await toDataUrl(file);
          updateScreen(screen.id, { contentImage });
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="flex w-full items-center justify-center gap-2 border border-border px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-foreground hover:bg-secondary"
      >
        <ImageUp className="h-3.5 w-3.5" /> {screen.contentImage ? "Replace" : "Upload"} content
      </button>
    </Section>
  );
}
