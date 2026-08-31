import { useEditor } from "@/lib/led/store";
import { RESOLUTION_PRESETS, type AspectPreset } from "@/lib/led/types";
import { aspectLabel } from "@/lib/led/calc";
import { NumberField, Readout, Section, SelectField } from "../Field";

export function CanvasPanel() {
  const project = useEditor((s) => s.project);
  const setCanvas = useEditor((s) => s.setCanvas);
  const updateScreen = useEditor((s) => s.updateScreen);

  if (!project) return null;
  const canvas = project.canvas;
  const activePreset =
    RESOLUTION_PRESETS.find((p) => p.width === canvas.width && p.height === canvas.height)?.key ??
    "custom";
  const mappedPixels = project.screens.reduce(
    (sum, s) => sum + s.content.width * s.content.height,
    0,
  );
  const canvasPixels = canvas.width * canvas.height;

  return (
    <>
      <Section title="Content Canvas">
        <SelectField
          label="Resolution"
          value={activePreset}
          options={RESOLUTION_PRESETS.map((p) => ({ value: p.key, label: p.label }))}
          onChange={(key) => {
            const preset = RESOLUTION_PRESETS.find((p) => p.key === key);
            if (!preset || preset.key === "custom") return;
            setCanvas({ width: preset.width, height: preset.height });
          }}
        />
        <NumberField
          label="Canvas Width"
          suffix="px"
          step={16}
          min={16}
          value={canvas.width}
          onChange={(width) => setCanvas({ width: Math.round(width) })}
        />
        <NumberField
          label="Canvas Height"
          suffix="px"
          step={16}
          min={16}
          value={canvas.height}
          onChange={(height) => setCanvas({ height: Math.round(height) })}
        />
        <SelectField
          label="Aspect Ratio"
          value={canvas.aspectPreset}
          options={[
            { value: "16:9", label: "16:9" },
            { value: "32:9", label: "32:9" },
            { value: "custom", label: "Custom" },
          ]}
          onChange={(aspectPreset) => setCanvas({ aspectPreset: aspectPreset as AspectPreset })}
        />
        <NumberField
          label="Refresh Rate"
          suffix="Hz"
          step={1}
          min={24}
          max={240}
          value={canvas.refreshRate}
          onChange={(refreshRate) => setCanvas({ refreshRate: Math.round(refreshRate) })}
        />
        <NumberField
          label="Outputs"
          step={1}
          min={1}
          max={32}
          value={canvas.outputs}
          onChange={(outputs) => setCanvas({ outputs: Math.round(outputs) })}
        />
        <Readout
          rows={[
            ["TRUE ASPECT", aspectLabel(canvas.width, canvas.height)],
            ["CANVAS PX", canvasPixels.toLocaleString()],
            ["MAPPED PX", mappedPixels.toLocaleString()],
            [
              "COVERAGE",
              `${canvasPixels ? ((mappedPixels / canvasPixels) * 100).toFixed(1) : "0.0"}%`,
              mappedPixels > canvasPixels ? "text-destructive" : "text-foreground/80",
            ],
          ]}
        />
        <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
          Physical LED size (metres) and content canvas (pixels) stay independent — changing one
          never rewrites the other.
        </p>
      </Section>

      <Section title="Canvas Regions">
        {project.screens.length === 0 && (
          <p className="text-[11px] text-muted-foreground">No LED surfaces yet.</p>
        )}
        {project.screens.map((screen) => (
          <div key={screen.id} className="border-b border-border/60 py-2 last:border-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-foreground">{screen.name}</span>
              <span className="font-mono text-[10px] text-muted-foreground">
                {screen.physicalWidth} × {screen.physicalHeight} m
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-2">
              <NumberField
                label="X"
                suffix="px"
                step={16}
                min={0}
                value={screen.content.x}
                onChange={(x) =>
                  updateScreen(screen.id, { content: { ...screen.content, x: Math.round(x) } })
                }
              />
              <NumberField
                label="Y"
                suffix="px"
                step={16}
                min={0}
                value={screen.content.y}
                onChange={(y) =>
                  updateScreen(screen.id, { content: { ...screen.content, y: Math.round(y) } })
                }
              />
              <NumberField
                label="W"
                suffix="px"
                step={16}
                min={16}
                value={screen.content.width}
                onChange={(width) =>
                  updateScreen(screen.id, {
                    content: { ...screen.content, width: Math.round(width) },
                  })
                }
              />
              <NumberField
                label="H"
                suffix="px"
                step={16}
                min={16}
                value={screen.content.height}
                onChange={(height) =>
                  updateScreen(screen.id, {
                    content: { ...screen.content, height: Math.round(height) },
                  })
                }
              />
            </div>
            <button
              type="button"
              onClick={() =>
                updateScreen(screen.id, {
                  content: {
                    ...screen.content,
                    width: screen.pixelWidth,
                    height: screen.pixelHeight,
                  },
                })
              }
              className="mt-1 w-full border border-border px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
            >
              Match physical resolution
            </button>
          </div>
        ))}
      </Section>
    </>
  );
}
