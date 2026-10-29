import { useRef } from "react";
import { Stamp, X } from "lucide-react";
import { newAssetId, putAsset } from "@/lib/led/asset-store";
import { useEditor } from "@/lib/led/store";
import { Section } from "./Field";

/**
 * Prepares a logo image, preserving transparency (PNG/WebP stay PNG).
 * Logos are small, so they are capped at 800 px on the long edge.
 */
function prepareLogoImage(file: File, maxEdge = 800): Promise<string> {
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
        const isPng = file.type === "image/png" || file.type === "image/webp";
        resolve(canvas.toDataURL(isPng ? "image/png" : "image/jpeg", 0.92));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function ReportLogoSection() {
  const project = useEditor((state) => state.project);
  const setMeta = useEditor((state) => state.setMeta);
  const setStatus = useEditor((state) => state.setStatus);
  const inputRef = useRef<HTMLInputElement | null>(null);

  if (!project) return null;

  const logo = project.meta.reportLogo;

  return (
    <Section title="Technical Report Logo">
      <p className="mb-2 text-[10px] leading-relaxed text-muted-foreground">
        Optional logo stamped on every page of the technical report (top-right corner and pixel
        maps). Transparent PNG works best.
      </p>

      {logo ? (
        <div
          className="relative mb-2 overflow-hidden border border-border"
          style={{
            backgroundImage:
              "linear-gradient(45deg, #2a2a2a 25%, transparent 25%, transparent 75%, #2a2a2a 75%), linear-gradient(45deg, #2a2a2a 25%, transparent 25%, transparent 75%, #2a2a2a 75%)",
            backgroundSize: "12px 12px",
            backgroundPosition: "0 0, 6px 6px",
            backgroundColor: "#1a1a1a",
          }}
        >
          <img src={logo} alt="Report logo preview" className="block h-20 w-full object-contain" />
          <button
            type="button"
            title="Remove report logo"
            onClick={() =>
              setMeta({ reportLogo: undefined, reportLogoAssetId: undefined, reportLogoName: undefined })
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
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          try {
            const logoData = await prepareLogoImage(file);
            const logoAssetId = newAssetId();
            await putAsset(logoAssetId, logoData);
            setMeta({ reportLogo: logoData, reportLogoAssetId: logoAssetId, reportLogoName: file.name });
            setStatus("Technical report logo added");
          } catch {
            setStatus("Could not add the logo");
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
        <Stamp className="h-3.5 w-3.5" /> {logo ? "Replace logo" : "Add report logo"}
      </button>
      {project.meta.reportLogoName ? (
        <p className="mt-1 truncate font-mono text-[9px] text-muted-foreground">
          {project.meta.reportLogoName}
        </p>
      ) : null}
    </Section>
  );
}
