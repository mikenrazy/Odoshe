import { useState } from "react";
import { Link2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEditor } from "@/lib/led/store";
import { processorLayout } from "@/lib/led/engineering";
import { processorName } from "@/lib/led/types";
import { Readout, Section, SelectField, TextField } from "./Field";

export function ScreenSetsSection() {
  const project = useEditor((s) => s.project);
  const addGroup = useEditor((s) => s.addGroup);
  const updateGroup = useEditor((s) => s.updateGroup);
  const removeGroup = useEditor((s) => s.removeGroup);
  const updateScreen = useEditor((s) => s.updateScreen);
  const configure = useEditor((s) => s.splitGroupResolution);
  const [name, setName] = useState("LEFT + RIGHT");
  const [ids, setIds] = useState<string[]>([]);
  const [processorId, setProcessorId] = useState("");
  if (!project) return null;
  const selectedProcessor = processorId || project.processors.find((p) => p.modelKey === "vx600pro")?.id || project.processors[0]?.id || "";
  return (
    <Section title="Shared-input screen sets">
      <TextField label="Set name" value={name} onChange={setName} />
      <SelectField label="Set processor" value={selectedProcessor} options={project.processors.map((p) => ({ value: p.id, label: processorName(p) }))} onChange={setProcessorId} />
      <div className="my-2 space-y-1">
        {project.screens.map((s) => (
          <label key={s.id} className="flex items-center gap-2 text-xs text-foreground">
            <input type="checkbox" checked={ids.includes(s.id)} onChange={(e) => setIds((prev) => e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id))} className="accent-primary" />
            <span className="min-w-0 break-words">{s.name}</span>
          </label>
        ))}
      </div>
      <Button size="sm" className="w-full" disabled={ids.length < 2 || !selectedProcessor} onClick={() => {
        addGroup(name, ids);
        const g = useEditor.getState().project?.groups?.at(-1);
        const member = useEditor.getState().project?.screens.find((s) => s.groupId === g?.id);
        if (member) updateScreen(member.id, { processorId: selectedProcessor });
        setIds([]);
      }}><Link2 /> Create shared-input set</Button>
      {(project.groups ?? []).map((g) => {
        const members = project.screens.filter((s) => s.groupId === g.id);
        const lead = members[0];
        const layout = lead ? processorLayout(project, lead.processorId) : null;
        const proc = layout?.processor;
        return (
          <div key={g.id} className="mt-3 border-t border-border pt-2">
            <div className="flex items-center justify-between gap-2">
              <input aria-label="Screen set name" value={g.name} onChange={(e) => updateGroup(g.id, { name: e.target.value })} className="min-w-0 flex-1 bg-transparent text-xs font-semibold text-primary" />
              <Button variant="ghost" size="icon" title="Remove screen set" aria-label={`Remove ${g.name}`} onClick={() => removeGroup(g.id)}><Trash2 /></Button>
            </div>
            {lead && <SelectField label="Shared processor" value={lead.processorId} options={project.processors.map((p) => ({ value: p.id, label: processorName(p) }))} onChange={(processorId) => updateScreen(lead.id, { processorId })} />}
            <Readout rows={[
              ["ONE SOURCE INPUT", proc ? `${layout?.sourceWidth} × ${layout?.sourceHeight} px` : "Not assigned"],
              ["LED OUTPUT CANVAS", layout ? `${layout.width} × ${layout.height} px` : "—"],
              ["SOURCE → OUTPUT", layout?.exact ? "1:1" : "Scale full input to output"],
              ["LED LOAD", layout ? `${layout.totalPixels.toLocaleString()} px` : "—"],
            ]} />
            {layout?.placements.filter((p) => members.some((s) => s.id === p.screenId)).map((p) => (
              <div key={p.screenId} className="mt-2 border-l-2 border-primary pl-2 font-mono text-[10px] leading-relaxed text-foreground">
                <div className="break-words font-semibold">{p.name} · P{p.chains[0]?.port ?? "—"}–P{p.chains.at(-1)?.port ?? "—"}</div>
                <div>Output X {p.x}, Y {p.y} · {p.width} × {p.height}</div>
                <div className="text-muted-foreground">Input crop {p.sourceRegion.x}, {p.sourceRegion.y} · {p.sourceRegion.width} × {p.sourceRegion.height}</div>
                <div className="text-muted-foreground">Cabinets / cable: {p.chains.map((c) => c.cabinets).join(" + ")}</div>
              </div>
            ))}
            {layout?.issues.map((issue) => <p key={issue} className="mt-1 text-xs text-destructive">{issue}</p>)}
            <Button variant="outline" size="sm" className="mt-2 w-full" onClick={() => configure(g.id)}><Link2 /> {g.mappingMode === "shared-input" ? "Rebuild set mapping" : "Use shared-input mapping"}</Button>
          </div>
        );
      })}
    </Section>
  );
}