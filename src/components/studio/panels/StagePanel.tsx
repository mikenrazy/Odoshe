import { useEditor } from "@/lib/led/store";
import {
  STAGE_ELEMENT_LABELS,
  STAGE_ELEMENT_STYLES,
  STAGE_ORIENTATION_LABELS,
  STAGE_PLACEMENT_LABELS,
  defaultStageElements,
  type StageElementKey,
  type StagePlacement,
  type StageOrientation,
} from "@/lib/led/types";
import { elementSetup } from "@/lib/led/stage-elements";
import { fromDisplay, toDisplay, unitSuffix } from "@/lib/led/units";
import { ColorField, NumberField, Section, SelectField, ToggleField } from "../Field";

const ELEMENT_KEYS = Object.keys(STAGE_ELEMENT_LABELS) as StageElementKey[];
const PLACEMENTS = Object.keys(STAGE_PLACEMENT_LABELS) as StagePlacement[];

export function StagePanel() {
  const project = useEditor((s) => s.project);
  const setStage = useEditor((s) => s.setStage);

  if (!project) return null;
  const stage = project.stage;
  const units = project.meta.units;
  const suffix = unitSuffix(units);
  const num = (v: number) => +toDisplay(v, units).toFixed(3);
  const back = (v: number) => +fromDisplay(v, units).toFixed(4);

  const enabled: Record<StageElementKey, boolean> = {
    stairs: stage.stairs,
    podium: stage.podium,
    furniture: stage.furniture,
    truss: stage.truss,
    backdrop: stage.backdrop,
    fascia: stage.fascia,
  };

  const patchElement = (key: StageElementKey, patch: Partial<ReturnType<typeof elementSetup>>) =>
    setStage({
      elements: {
        ...defaultStageElements(),
        ...(stage.elements ?? {}),
        [key]: { ...elementSetup(stage, key), ...patch },
      },
    });


  return (
    <>
      <Section title="Stage Dimensions">
        <NumberField
          label="Width"
          suffix={suffix}
          value={num(stage.width)}
          min={0.5}
          onChange={(v) => setStage({ width: back(v) })}
        />
        <NumberField
          label="Depth"
          suffix={suffix}
          value={num(stage.depth)}
          min={0.5}
          onChange={(v) => setStage({ depth: back(v) })}
        />
        <NumberField
          label="Height"
          suffix={suffix}
          value={num(stage.height)}
          min={0.05}
          step={0.05}
          onChange={(v) => setStage({ height: back(v) })}
        />
        <NumberField
          label="Back Wall H"
          suffix={suffix}
          value={num(stage.backWallHeight)}
          min={1}
          onChange={(v) => setStage({ backWallHeight: back(v) })}
        />
        <SelectField
          label="Orientation"
          value={stage.orientation}
          options={(Object.keys(STAGE_ORIENTATION_LABELS) as StageOrientation[]).map((k) => ({
            value: k,
            label: STAGE_ORIENTATION_LABELS[k],
          }))}
          onChange={(orientation) => setStage({ orientation: orientation as StageOrientation })}
        />
      </Section>

      <Section title="Stage Elements">
        <ToggleField
          label="Back Wall"
          value={stage.backWall}
          onChange={(backWall) => setStage({ backWall })}
        />
        <ToggleField
          label="Backdrop"
          value={stage.backdrop}
          onChange={(backdrop) => setStage({ backdrop })}
        />
        <ToggleField label="Stairs" value={stage.stairs} onChange={(stairs) => setStage({ stairs })} />
        <ToggleField label="Fascia" value={stage.fascia} onChange={(fascia) => setStage({ fascia })} />
        <ToggleField
          label="Podium / Lectern"
          value={stage.podium}
          onChange={(podium) => setStage({ podium })}
        />
        <ToggleField
          label="Furniture"
          value={stage.furniture}
          onChange={(furniture) => setStage({ furniture })}
        />
        <ToggleField label="Truss" value={stage.truss} onChange={(truss) => setStage({ truss })} />
        <ToggleField
          label="Lighting Positions"
          value={stage.lightingPositions}
          onChange={(lightingPositions) => setStage({ lightingPositions })}
        />
        <ToggleField
          label="Audience Area"
          value={stage.audience}
          onChange={(audience) => setStage({ audience })}
        />
      </Section>

      {ELEMENT_KEYS.filter((k) => enabled[k]).map((key) => {
        const s = elementSetup(stage, key);
        return (
          <Section key={key} title={`${STAGE_ELEMENT_LABELS[key]} — Style & Position`}>
            <SelectField
              label="Style"
              value={s.style}
              options={STAGE_ELEMENT_STYLES[key]}
              onChange={(style) => patchElement(key, { style })}
            />
            <SelectField
              label="Placement"
              value={s.placement}
              options={PLACEMENTS.map((p) => ({ value: p, label: STAGE_PLACEMENT_LABELS[p] }))}
              onChange={(placement) => patchElement(key, { placement: placement as StagePlacement })}
            />
            <NumberField
              label="Offset X"
              suffix={suffix}
              step={0.1}
              value={num(s.offsetX)}
              onChange={(v) => patchElement(key, { offsetX: back(v) })}
            />
            <NumberField
              label="Offset Z"
              suffix={suffix}
              step={0.1}
              value={num(s.offsetZ)}
              onChange={(v) => patchElement(key, { offsetZ: back(v) })}
            />
            <NumberField
              label="Elevation"
              suffix={suffix}
              step={0.1}
              value={num(s.elevation)}
              onChange={(v) => patchElement(key, { elevation: back(v) })}
            />
            <NumberField
              label="Rotation"
              suffix="°"
              step={5}
              value={s.rotation}
              onChange={(rotation) => patchElement(key, { rotation })}
            />
            <NumberField
              label="Scale"
              suffix="×"
              step={0.05}
              min={0.2}
              value={s.scale}
              onChange={(scale) => patchElement(key, { scale })}
            />
            <button
              type="button"
              onClick={() =>
                patchElement(key, { offsetX: 0, offsetZ: 0, elevation: 0, rotation: 0, scale: 1 })
              }
              className="mt-1 w-full border border-border px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              Reset transform
            </button>
          </Section>
        );
      })}

      <Section title="Element Colours">

        <ColorField
          label="Stage Deck"
          value={stage.stageColor}
          onChange={(stageColor) => setStage({ stageColor })}
        />
        <ColorField
          label="Back Wall"
          value={stage.backWallColor}
          onChange={(backWallColor) => setStage({ backWallColor })}
        />
        <ColorField
          label="Stairs"
          value={stage.stairsColor}
          onChange={(stairsColor) => setStage({ stairsColor })}
        />
        <ColorField
          label="Fascia"
          value={stage.fasciaColor}
          onChange={(fasciaColor) => setStage({ fasciaColor })}
        />
        <ColorField
          label="Podium"
          value={stage.podiumColor}
          onChange={(podiumColor) => setStage({ podiumColor })}
        />
        <ColorField
          label="Truss"
          value={stage.trussColor}
          onChange={(trussColor) => setStage({ trussColor })}
        />
        <ColorField
          label="Venue Floor"
          value={stage.floorColor}
          onChange={(floorColor) => setStage({ floorColor })}
        />
      </Section>
    </>
  );
}
