import { useState } from "react";
import { AlignCenterHorizontal, AlignStartVertical, AlignEndVertical } from "lucide-react";
import { useEditor } from "@/lib/led/store";
import { SCREEN_PRESETS } from "@/lib/led/presets";
import {
  PANEL_SIZE_PRESETS,
  SCREEN_TYPE_LABELS,
  type PanelSizeKey,
  type ScreenType,
} from "@/lib/led/types";
import { cabinetCalc } from "@/lib/led/calc";
import {
  CABINET_CATALOG,
  PITCH_PRESETS,
  STATUS_ICON,
  STATUS_LABEL,
  STATUS_TONE,
  derivedResolution,
  screenStatus,
} from "@/lib/led/resolution";
import { NumberField, Readout, Section, SelectField, TextField, ToggleField } from "../Field";
import { ProcessorSection } from "../ProcessorSection";
import { ScreenContentSection } from "../ScreenContentSection";

const TYPE_OPTIONS = (Object.keys(SCREEN_TYPE_LABELS) as ScreenType[]).map((value) => ({
  value,
  label: SCREEN_TYPE_LABELS[value],
}));

export function ScreenPanel() {
  const project = useEditor((s) => s.project);
  const selectedId = useEditor((s) => s.selectedId);
  const updateScreen = useEditor((s) => s.updateScreen);
  const applyPreset = useEditor((s) => s.applyPreset);
  const alignScreens = useEditor((s) => s.alignScreens);
  const spaceScreens = useEditor((s) => s.spaceScreens);
  const setGapBetween = useEditor((s) => s.setGapBetween);
  const addScreen = useEditor((s) => s.addScreen);
  const applyCabinetSpec = useEditor((s) => s.applyCabinetSpec);
  const syncScreenResolution = useEditor((s) => s.syncScreenResolution);
  const [gap, setGap] = useState(0.5);
  const [pairTargetId, setPairTargetId] = useState("");

  if (!project) return null;
  const screen = project.screens.find((s) => s.id === selectedId) ?? null;

  const spacingSection = (
    <Section title="Screen Spacing">
      <NumberField
        label="Gap Between Screens"
        suffix="m"
        step={0.05}
        min={0}
        value={gap}
        onChange={(v) => setGap(Math.max(0, v))}
      />
      <div className="mt-1 flex gap-px bg-border/60 p-px">
        <button
          type="button"
          onClick={() => spaceScreens(gap, "horizontal")}
          className="flex-1 bg-card px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
        >
          Space ↔ Horizontal
        </button>
        <button
          type="button"
          onClick={() => spaceScreens(gap, "vertical")}
          className="flex-1 bg-card px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
        >
          Space ↕ Vertical
        </button>
      </div>
      {screen && project.screens.length > 1 && (
        <>
          <SelectField
            label="Gap to Screen"
            value={pairTargetId}
            options={[
              { value: "", label: "— select screen —" },
              ...project.screens
                .filter((s) => s.id !== screen.id)
                .map((s) => ({ value: s.id, label: s.name })),
            ]}
            onChange={setPairTargetId}
          />
          <button
            type="button"
            disabled={!pairTargetId}
            onClick={() => pairTargetId && setGapBetween(screen.id, pairTargetId, gap)}
            className="mt-1 w-full border border-border px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            Set gap between "{screen.name}" and selected
          </button>
        </>
      )}
      <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
        Arranges all screens edge-to-edge with the chosen gap, starting from the leftmost (or
        bottom-most) screen. Use "Gap to Screen" to set the distance between two specific screens
        — the other screen moves along the direction it already sits.
      </p>
    </Section>
  );

  if (!screen) {
    return (
      <>
        <Section title="LED Screens">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Select an LED surface in the viewport or object tree to edit its physical dimensions,
            pixel configuration, cabinets, transform and curvature.
          </p>
          <button
            type="button"
            onClick={() => addScreen()}
            className="mt-2 w-full bg-primary px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary-foreground"
          >
            Add LED screen
          </button>
        </Section>
        {project.screens.length > 1 && spacingSection}
      </>
    );
  }

  const calc = cabinetCalc(screen);
  const derived = derivedResolution(screen);
  const resStatus = screenStatus(project, screen);

  return (
    <>
      <ScreenContentSection screen={screen} />

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
              panelConfiguration: screen.panelConfiguration.manual
                ? screen.panelConfiguration
                : {
                    ...screen.panelConfiguration,
                    cols: Math.max(
                      1,
                      Math.round(physicalWidth / screen.panelConfiguration.panelWidth),
                    ),
                  },
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
          onChange={(physicalHeight) =>
            updateScreen(screen.id, {
              physicalHeight,
              panelConfiguration: screen.panelConfiguration.manual
                ? screen.panelConfiguration
                : {
                    ...screen.panelConfiguration,
                    rows: Math.max(
                      1,
                      Math.round(physicalHeight / screen.panelConfiguration.panelHeight),
                    ),
                  },
            })
          }
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

      <Section title="LED Resolution (derived)">
        <SelectField
          label="Cabinet Spec"
          value={
            CABINET_CATALOG.find(
              (c) =>
                c.key === screen.cabinetKey ||
                (Math.abs(c.width - screen.panelConfiguration.panelWidth) < 0.005 &&
                  Math.abs(c.height - screen.panelConfiguration.panelHeight) < 0.005 &&
                  Math.abs(c.pitch - screen.pixelPitch) < 0.01),
            )?.key ?? ""
          }
          options={[
            { value: "", label: "— custom / not in catalogue —" },
            ...CABINET_CATALOG.map((c) => ({ value: c.key, label: c.label })),
          ]}
          onChange={(key) => key && applyCabinetSpec(screen.id, key)}
        />
        <SelectField
          label="Pixel Pitch"
          value={String(screen.pixelPitch)}
          options={[
            ...(PITCH_PRESETS.includes(screen.pixelPitch)
              ? []
              : [{ value: String(screen.pixelPitch), label: `P${screen.pixelPitch} (custom)` }]),
            ...PITCH_PRESETS.map((p) => ({ value: String(p), label: `P${p}` })),
          ]}
          onChange={(v) =>
            updateScreen(screen.id, { pixelPitch: Number(v), cabinetKey: undefined })
          }
        />
        <Readout
          rows={[
            ["CABINET RES", `${derived.cabinetPixelWidth} × ${derived.cabinetPixelHeight} px`],
            ["CABINET GRID", `${derived.cols} × ${derived.rows} (${derived.totalCabinets})`],
            ["DERIVED RES", `${derived.pixelWidth} × ${derived.pixelHeight} px`, "text-right text-primary"],
            ["SOURCE OF TRUTH", derived.source === "catalog" ? "Cabinet catalogue" : "Pitch maths"],
            ["PX TOTAL", (screen.pixelWidth * screen.pixelHeight).toLocaleString()],
            ["ASPECT", calc.aspectLabel],
            [
              "STATUS",
              `${STATUS_ICON[resStatus.status]} ${STATUS_LABEL[resStatus.status]}`,
              STATUS_TONE[resStatus.status],
            ],
          ]}
        />
        {resStatus.notes.length > 0 && (
          <ul className="mt-1 space-y-0.5 text-[10px] leading-relaxed text-muted-foreground">
            {resStatus.notes.map((n) => <li key={n}>• {n}</li>)}
          </ul>
        )}
        <ToggleField
          label="Manual resolution override"
          value={!!screen.resolutionOverride}
          onChange={(resolutionOverride) => updateScreen(screen.id, { resolutionOverride })}
        />
        {screen.resolutionOverride ? (
          <>
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
          </>
        ) : (
          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
            Resolution is calculated from pixel pitch × cabinet grid. Enable the override only if
            the physical wall differs from the catalogue specification.
          </p>
        )}
        {derived.overridden && (
          <button
            type="button"
            onClick={() => syncScreenResolution(screen.id)}
            className="mt-1 w-full border border-border px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary hover:bg-secondary"
          >
            Sync to cabinet resolution ({derived.pixelWidth} × {derived.pixelHeight})
          </button>
        )}
        {resStatus.notes.length > 0 && (
          <ul className="mt-2 space-y-1 text-[10px] leading-relaxed text-muted-foreground">
            {resStatus.notes.map((n) => (
              <li key={n}>• {n}</li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="LED Cabinet Calculator">
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
                manual: false,
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
        <ToggleField
          label="Manual cabinet count"
          value={!!screen.panelConfiguration.manual}
          onChange={(manual) =>
            updateScreen(screen.id, {
              panelConfiguration: { ...screen.panelConfiguration, manual },
            })
          }
        />
        <NumberField
          label="Cabinet Columns"
          step={1}
          min={1}
          max={400}
          value={screen.panelConfiguration.cols}
          onChange={(cols) =>
            updateScreen(screen.id, {
              panelConfiguration: {
                ...screen.panelConfiguration,
                manual: true,
                cols: Math.max(1, Math.round(cols)),
              },
            })
          }
        />
        <NumberField
          label="Cabinet Rows"
          step={1}
          min={1}
          max={400}
          value={screen.panelConfiguration.rows}
          onChange={(rows) =>
            updateScreen(screen.id, {
              panelConfiguration: {
                ...screen.panelConfiguration,
                manual: true,
                rows: Math.max(1, Math.round(rows)),
              },
            })
          }
        />
        <ToggleField
          label="Show LED Panel Grid"
          value={screen.panelConfiguration.show}
          onChange={(show) =>
            updateScreen(screen.id, {
              panelConfiguration: { ...screen.panelConfiguration, show },
            })
          }
        />
        <Readout
          rows={[
            ["H CABINETS", String(calc.cols)],
            ["V CABINETS", String(calc.rows)],
            ["TOTAL CABINETS", String(calc.total)],
            ["ACTUAL SIZE", `${calc.actualWidth.toFixed(2)} × ${calc.actualHeight.toFixed(2)} m`],
            ["PITCH RESOLUTION", `${calc.nativePixelWidth} × ${calc.nativePixelHeight} px`],
            ["LED AREA", `${calc.area.toFixed(2)} m²`],
          ]}
        />
        {calc.warnings.length > 0 && (
          <ul className="mt-2 space-y-1 border-t border-border pt-2">
            {calc.warnings.map((w) => (
              <li key={w} className="text-[10px] leading-relaxed text-[#ffb454]">
                ⚠ {w}
              </li>
            ))}
          </ul>
        )}
        {calc.warnings.length > 0 && (
          <button
            type="button"
            onClick={() =>
              updateScreen(screen.id, {
                physicalWidth: calc.actualWidth,
                physicalHeight: calc.actualHeight,
                pixelWidth: calc.nativePixelWidth,
                pixelHeight: calc.nativePixelHeight,
              })
            }
            className="mt-2 w-full border border-border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
          >
            Snap screen to cabinet grid
          </button>
        )}
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
        <NumberField
          label="Space above stage"
          suffix="m"
          step={0.1}
          value={Math.round(Math.max(0, screen.position.y - screen.physicalHeight / 2 - project.stage.height) * 1000) / 1000}
          onChange={(gap) =>
            updateScreen(screen.id, {
              position: {
                ...screen.position,
                y: project.stage.height + Math.max(0, gap) + screen.physicalHeight / 2,
              },
            })
          }
        />
        <div className="mt-2 flex items-center gap-px bg-border/60 p-px">
          {(
            [
              ["left", AlignStartVertical, "Align left edges"],
              ["centerX", AlignCenterHorizontal, "Align centres"],
              ["right", AlignEndVertical, "Align right edges"],
            ] as const
          ).map(([axis, Icon, title]) => (
            <button
              key={axis}
              type="button"
              title={title}
              onClick={() => alignScreens(axis)}
              className="flex-1 bg-card p-1.5 text-muted-foreground hover:text-foreground"
            >
              <Icon className="mx-auto h-3.5 w-3.5" />
            </button>
          ))}
          <button
            type="button"
            title="Align vertical centres"
            onClick={() => alignScreens("middleY")}
            className="flex-1 bg-card px-2 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
          >
            Y
          </button>
        </div>
      </Section>

      {spacingSection}

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
  );
}
