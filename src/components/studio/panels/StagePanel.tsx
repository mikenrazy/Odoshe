import { useEditor } from "@/lib/led/store";
import { STAGE_ORIENTATION_LABELS, type StageOrientation } from "@/lib/led/types";
import { fromDisplay, toDisplay, unitSuffix } from "@/lib/led/units";
import { ColorField, NumberField, Section, SelectField, ToggleField } from "../Field";

export function StagePanel() {
  const project = useEditor((s) => s.project);
  const setStage = useEditor((s) => s.setStage);

  if (!project) return null;
  const stage = project.stage;
  const units = project.meta.units;
  const suffix = unitSuffix(units);
  const num = (v: number) => +toDisplay(v, units).toFixed(3);
  const back = (v: number) => +fromDisplay(v, units).toFixed(4);

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
