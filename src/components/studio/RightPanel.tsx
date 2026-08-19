import { useEditor } from "@/lib/led/store";
import { SCREEN_PRESETS } from "@/lib/led/presets";
import {
  PANEL_SIZE_PRESETS,
  SCREEN_TYPE_LABELS,
  type PanelSizeKey,
  type ScreenType,
} from "@/lib/led/types";
import {
  ColorField,
  NumberField,
  Section,
  SelectField,
  TextField,
  ToggleField,
} from "./Field";
import { ProcessorSection } from "./ProcessorSection";

const TYPE_OPTIONS = (Object.keys(SCREEN_TYPE_LABELS) as ScreenType[]).map((value) => ({
  value,
  label: SCREEN_TYPE_LABELS[value],
}));

export function RightPanel() {
  const project = useEditor((s) => s.project);
  const selectedId = useEditor((s) => s.selectedId);
  const updateScreen = useEditor((s) => s.updateScreen);
  const applyPreset = useEditor((s) => s.applyPreset);
  const setStage = useEditor((s) => s.setStage);

  if (!project) return null;
  const screen = project.screens.find((s) => s.id === selectedId) ?? null;

  return (
    <aside className="flex h-full w-[312px] shrink-0 flex-col overflow-y-auto border-l border-border bg-card">
      {!screen ? (
        <>
          <Section title="Stage Dimensions">
            <NumberField
              label="Width"
              suffix="m"
              value={project.stage.width}
              min={1}
              onChange={(width) => setStage({ width })}
            />
            <NumberField
              label="Depth"
              suffix="m"
              value={project.stage.depth}
              min={1}
              onChange={(depth) => setStage({ depth })}
            />
            <NumberField
              label="Height"
              suffix="m"
              value={project.stage.height}
              min={0.05}
              step={0.05}
              onChange={(height) => setStage({ height })}
            />
            <NumberField
              label="Back Wall H"
              suffix="m"
              value={project.stage.backWallHeight}
              min={1}
              onChange={(backWallHeight) => setStage({ backWallHeight })}
            />
          </Section>
          <Section title="Stage Elements">
            <ToggleField
              label="Back Wall"
              value={project.stage.backWall}
              onChange={(backWall) => setStage({ backWall })}
            />
            <ToggleField
              label="Stairs"
              value={project.stage.stairs}
              onChange={(stairs) => setStage({ stairs })}
            />
            <ToggleField
              label="Podium"
              value={project.stage.podium}
              onChange={(podium) => setStage({ podium })}
            />
            <ToggleField
              label="Audience Area"
              value={project.stage.audience}
              onChange={(audience) => setStage({ audience })}
            />
          </Section>
          <Section title="Element Colours">
            <ColorField
              label="Stage Deck"
              value={project.stage.stageColor}
              onChange={(stageColor) => setStage({ stageColor })}
            />
            <ColorField
              label="Back Wall"
              value={project.stage.backWallColor}
              onChange={(backWallColor) => setStage({ backWallColor })}
            />
            <ColorField
              label="Stairs"
              value={project.stage.stairsColor}
              onChange={(stairsColor) => setStage({ stairsColor })}
            />
            <ColorField
              label="Podium"
              value={project.stage.podiumColor}
              onChange={(podiumColor) => setStage({ podiumColor })}
            />
            <ColorField
              label="Venue Floor"
              value={project.stage.floorColor}
              onChange={(floorColor) => setStage({ floorColor })}
            />
          </Section>
          <div className="p-4 text-[11px] leading-relaxed text-muted-foreground">
            Select an LED screen in the viewport or object tree to edit its physical dimensions,
            pixel configuration, transform and curvature.
          </div>
        </>
      ) : (
        <>
          <Section title="Identification">
            <TextField
              label="Screen Name"
              value={screen.name}
              onChange={(name) => updateScreen(screen.id, { name })}
            />
            <TextField label="Screen ID" value={screen.id} readOnly onChange={() => {}} />
            <SelectField
              label="Screen Type"
              value={screen.type}
              options={TYPE_OPTIONS}
              onChange={(type) =>
                updateScreen(screen.id, {
                  type: type as ScreenType,
                  curvature: { ...screen.curvature, enabled: type === "curved" },
                })
              }
            />
            <SelectField
              label="Load Preset"
              value=""
              options={[
                { value: "", label: "— select preset —" },
                ...SCREEN_PRESETS.map((p) => ({ value: p.key, label: p.label })),
              ]}
              onChange={(key) => key && applyPreset(screen.id, key)}
            />
          </Section>

          <Section title="Physical Dimensions">
            <NumberField
              label="Width"
              suffix="m"
              min={0.1}
              value={screen.physicalWidth}
              onChange={(physicalWidth) =>
                updateScreen(screen.id, {
                  physicalWidth,
                  curvature: {
                    ...screen.curvature,
                    radius:
                      screen.curvature.angle > 0
                        ? physicalWidth / ((screen.curvature.angle * Math.PI) / 180)
                        : screen.curvature.radius,
                  },
                })
              }
            />
            <NumberField
              label="Height"
              suffix="m"
              min={0.1}
              value={screen.physicalHeight}
              onChange={(physicalHeight) => updateScreen(screen.id, { physicalHeight })}
            />
            <NumberField
              label="Depth"
              suffix="m"
              min={0.02}
              step={0.01}
              value={screen.physicalDepth}
              onChange={(physicalDepth) => updateScreen(screen.id, { physicalDepth })}
            />
          </Section>

          <Section title="Pixel Configuration">
            <NumberField
              label="Pixel Width"
              suffix="px"
              step={16}
              min={16}
              value={screen.pixelWidth}
              onChange={(pixelWidth) => updateScreen(screen.id, { pixelWidth })}
            />
            <NumberField
              label="Pixel Height"
              suffix="px"
              step={16}
              min={16}
              value={screen.pixelHeight}
              onChange={(pixelHeight) => updateScreen(screen.id, { pixelHeight })}
            />
            <NumberField
              label="Pixel Pitch"
              suffix="mm"
              step={0.1}
              min={0.5}
              value={screen.pixelPitch}
              onChange={(pixelPitch) => updateScreen(screen.id, { pixelPitch })}
            />
            <div className="mt-1 grid grid-cols-2 gap-2 border-t border-border pt-2 font-mono text-[10px] text-muted-foreground">
              <span>PX TOTAL</span>
              <span className="text-right text-foreground/80">
                {(screen.pixelWidth * screen.pixelHeight).toLocaleString()}
              </span>
              <span>NATIVE PITCH</span>
              <span className="text-right text-foreground/80">
                {((screen.physicalWidth * 1000) / screen.pixelWidth).toFixed(2)} mm
              </span>
              <span>ASPECT</span>
              <span className="text-right text-foreground/80">
                {(screen.pixelWidth / screen.pixelHeight).toFixed(3)}
              </span>
            </div>
          </Section>

          <Section title="Position">
            <NumberField
              label="X"
              suffix="m"
              value={screen.position.x}
              onChange={(x) => updateScreen(screen.id, { position: { ...screen.position, x } })}
            />
            <NumberField
              label="Y"
              suffix="m"
              value={screen.position.y}
              onChange={(y) => updateScreen(screen.id, { position: { ...screen.position, y } })}
            />
            <NumberField
              label="Z"
              suffix="m"
              value={screen.position.z}
              onChange={(z) => updateScreen(screen.id, { position: { ...screen.position, z } })}
            />
          </Section>

          <Section title="Rotation">
            <NumberField
              label="X"
              suffix="°"
              step={1}
              value={screen.rotation.x}
              onChange={(x) => updateScreen(screen.id, { rotation: { ...screen.rotation, x } })}
            />
            <NumberField
              label="Y"
              suffix="°"
              step={1}
              value={screen.rotation.y}
              onChange={(y) => updateScreen(screen.id, { rotation: { ...screen.rotation, y } })}
            />
            <NumberField
              label="Z"
              suffix="°"
              step={1}
              value={screen.rotation.z}
              onChange={(z) => updateScreen(screen.id, { rotation: { ...screen.rotation, z } })}
            />
          </Section>

          <Section title="Scale">
            <NumberField
              label="X"
              step={0.05}
              min={0.05}
              value={screen.scale.x}
              onChange={(x) => updateScreen(screen.id, { scale: { ...screen.scale, x } })}
            />
            <NumberField
              label="Y"
              step={0.05}
              min={0.05}
              value={screen.scale.y}
              onChange={(y) => updateScreen(screen.id, { scale: { ...screen.scale, y } })}
            />
            <NumberField
              label="Z"
              step={0.05}
              min={0.05}
              value={screen.scale.z}
              onChange={(z) => updateScreen(screen.id, { scale: { ...screen.scale, z } })}
            />
          </Section>

          <Section title="Curvature">
            <ToggleField
              label="Curved"
              value={screen.curvature.enabled}
              onChange={(enabled) =>
                updateScreen(screen.id, {
                  curvature: {
                    ...screen.curvature,
                    enabled,
                    angle: enabled && screen.curvature.angle < 1 ? 45 : screen.curvature.angle,
                  },
                })
              }
            />
            <NumberField
              label="Curve Angle"
              suffix="°"
              step={1}
              min={0}
              max={180}
              disabled={!screen.curvature.enabled}
              value={screen.curvature.angle}
              onChange={(angle) =>
                updateScreen(screen.id, {
                  curvature: {
                    ...screen.curvature,
                    angle,
                    radius: angle > 0 ? screen.physicalWidth / ((angle * Math.PI) / 180) : 0,
                  },
                })
              }
            />
            <NumberField
              label="Curve Radius"
              suffix="m"
              step={0.1}
              min={0.1}
              disabled={!screen.curvature.enabled}
              value={+screen.curvature.radius.toFixed(3)}
              onChange={(radius) => {
                const angle = Math.min(
                  180,
                  Math.max(1, (screen.physicalWidth / radius) * (180 / Math.PI)),
                );
                updateScreen(screen.id, {
                  curvature: { ...screen.curvature, radius, angle: +angle.toFixed(2) },
                });
              }}
            />
            <NumberField
              label="Sections"
              step={1}
              min={4}
              max={128}
              disabled={!screen.curvature.enabled}
              value={screen.curvature.sections}
              onChange={(sections) =>
                updateScreen(screen.id, {
                  curvature: { ...screen.curvature, sections: Math.round(sections) },
                })
              }
            />
            <ToggleField
              label="Concave"
              value={screen.curvature.concave}
              onChange={(concave) =>
                updateScreen(screen.id, { curvature: { ...screen.curvature, concave } })
              }
            />
          </Section>

          <Section title="LED Panel Grid">
            <ToggleField
              label="Show LED Panel Grid"
              value={screen.panelConfiguration.show}
              onChange={(show) =>
                updateScreen(screen.id, {
                  panelConfiguration: { ...screen.panelConfiguration, show },
                })
              }
            />
            <SelectField
              label="Cabinet Size"
              value={screen.panelConfiguration.sizeKey}
              options={PANEL_SIZE_PRESETS.map((p) => ({ value: p.key, label: p.label }))}
              onChange={(key) => {
                const preset = PANEL_SIZE_PRESETS.find((p) => p.key === key)!;
                const panelWidth =
                  key === "custom" ? screen.panelConfiguration.panelWidth : preset.width;
                const panelHeight =
                  key === "custom" ? screen.panelConfiguration.panelHeight : preset.height;
                updateScreen(screen.id, {
                  panelConfiguration: {
                    ...screen.panelConfiguration,
                    sizeKey: key as PanelSizeKey,
                    panelWidth,
                    panelHeight,
                    cols: Math.max(1, Math.round(screen.physicalWidth / panelWidth)),
                    rows: Math.max(1, Math.round(screen.physicalHeight / panelHeight)),
                  },
                });
              }}
            />
            <NumberField
              label="Cabinet W"
              suffix="m"
              step={0.05}
              min={0.05}
              value={screen.panelConfiguration.panelWidth}
              onChange={(panelWidth) =>
                updateScreen(screen.id, {
                  panelConfiguration: {
                    ...screen.panelConfiguration,
                    sizeKey: "custom",
                    panelWidth,
                    cols: Math.max(1, Math.round(screen.physicalWidth / panelWidth)),
                  },
                })
              }
            />
            <NumberField
              label="Cabinet H"
              suffix="m"
              step={0.05}
              min={0.05}
              value={screen.panelConfiguration.panelHeight}
              onChange={(panelHeight) =>
                updateScreen(screen.id, {
                  panelConfiguration: {
                    ...screen.panelConfiguration,
                    sizeKey: "custom",
                    panelHeight,
                    rows: Math.max(1, Math.round(screen.physicalHeight / panelHeight)),
                  },
                })
              }
            />
            <NumberField
              label="Panels Across"
              step={1}
              min={1}
              max={200}
              value={screen.panelConfiguration.cols}
              onChange={(cols) =>
                updateScreen(screen.id, {
                  panelConfiguration: {
                    ...screen.panelConfiguration,
                    sizeKey: "custom",
                    cols: Math.max(1, Math.round(cols)),
                    panelWidth: +(screen.physicalWidth / Math.max(1, Math.round(cols))).toFixed(3),
                  },
                })
              }
            />
            <NumberField
              label="Panels Down"
              step={1}
              min={1}
              max={200}
              value={screen.panelConfiguration.rows}
              onChange={(rows) =>
                updateScreen(screen.id, {
                  panelConfiguration: {
                    ...screen.panelConfiguration,
                    sizeKey: "custom",
                    rows: Math.max(1, Math.round(rows)),
                    panelHeight: +(
                      screen.physicalHeight / Math.max(1, Math.round(rows))
                    ).toFixed(3),
                  },
                })
              }
            />
            <div className="mt-1 grid grid-cols-2 gap-2 border-t border-border pt-2 font-mono text-[10px] text-muted-foreground">
              <span>PANEL SIZE</span>
              <span className="text-right text-foreground/80">
                {(
                  (screen.physicalWidth / screen.panelConfiguration.cols) *
                  1000
                ).toFixed(0)}{" "}
                ×{" "}
                {((screen.physicalHeight / screen.panelConfiguration.rows) * 1000).toFixed(0)} mm
              </span>
              <span>PANEL COUNT</span>
              <span className="text-right text-foreground/80">
                {screen.panelConfiguration.cols * screen.panelConfiguration.rows}
              </span>
            </div>
          </Section>

          <ProcessorSection screen={screen} />

          <Section title="Appearance">
            <NumberField
              label="Brightness"
              step={0.05}
              min={0}
              max={4}
              value={screen.brightness}
              onChange={(brightness) => updateScreen(screen.id, { brightness })}
            />
            <label className="flex items-center justify-between gap-2 py-[3px]">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                LED Tint
              </span>
              <input
                type="color"
                value={screen.color}
                onChange={(e) => updateScreen(screen.id, { color: e.target.value })}
                className="h-6 w-[150px] border border-border bg-input"
              />
            </label>
          </Section>
        </>
      )}
    </aside>
  );
}
