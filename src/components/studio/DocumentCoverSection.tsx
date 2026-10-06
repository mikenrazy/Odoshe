import { useRef } from "react";
import { ImageUp, X } from "lucide-react";
import { newAssetId, putAsset } from "@/lib/led/asset-store";
import { useEditor } from "@/lib/led/store";
import { Section } from "./Field";

function prepareCoverImage(file: File, maxEdge = 2400): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Unable to read image"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Unable to open image"));
      image.onload = () => {
        const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Unable to prepare image"));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.88));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function DocumentCoverSection() {
  const project = useEditor((state) => state.project);
  const setMeta = useEditor((state) => state.setMeta);
  const setStatus = useEditor((state) => state.setStatus);
  const inputRef = useRef<HTMLInputElement | null>(null);

  if (!project) return null;

  const coverImage = project.meta.coverImage;

  return (
    <Section title="PDF Cover Image">
      <p className="mb-2 text-[10px] leading-relaxed text-muted-foreground">
        Optional image shown as the first page of the downloaded design document.
      </p>

      {coverImage ? (
        <div className="relative mb-2 overflow-hidden border border-border bg-input">
          <img
            src={coverImage}
            alt="PDF cover preview"
            className="block aspect-video w-full object-contain"
          />
          <button
            type="button"
            title="Remove PDF cover image"
            onClick={() =>
              setMeta({ coverImage: undefined, coverAssetId: undefined, coverImageName: undefined })
            }
            className="absolute right-1 top-1 bg-background/80 p-1 text-muted-foreground hover:text-destructive"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          try {
            const coverImageData = await prepareCoverImage(file);
            const coverAssetId = newAssetId();
            await putAsset(coverAssetId, coverImageData);
            setMeta({ coverImage: coverImageData, coverAssetId, coverImageName: file.name });
            setStatus("PDF cover image added");
          } catch {
            setStatus("Could not add the cover image");
          } finally {
            event.target.value = "";
          }
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full items-center justify-center gap-2 border border-border px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-foreground hover:bg-secondary"
      >
        <ImageUp className="h-3.5 w-3.5" /> {coverImage ? "Replace image" : "Add cover image"}
      </button>
      {project.meta.coverImageName ? (
        <p className="mt-1 truncate font-mono text-[9px] text-muted-foreground">
          {project.meta.coverImageName}
        </p>
      ) : null}
    </Section>
  );
}