import { useEditor } from "@/lib/led/store";
import { ColorField, NumberField, TextField } from "./Field";
import { Button } from "@/components/ui/button";
import { Copy, Trash2 } from "lucide-react";

export function CanvasScreenInspector() {
  const project = useEditor(s => s.project);
  const selectedId = useEditor(s => s.selectedId);
  const update = useEditor(s => s.updateScreen);
  const duplicate = useEditor(s => s.duplicateScreen);
  const remove = useEditor(s => s.deleteScreen);
  const screen = project?.screens.find(s => s.id === selectedId);
  if (!project) return null;
  return <section className="mt-4 border-t border-border pt-3">
    <div className="mb-2 flex items-center justify-between"><h3 className="text-xs font-semibold uppercase text-foreground">Canvas screens · {project.screens.length}</h3></div>
    <div className="mb-3 flex flex-wrap gap-1">{project.screens.map(s => <Button key={s.id} size="sm" variant={s.id === selectedId ? "secondary" : "ghost"} onClick={() => useEditor.getState().select(s.id)}>{s.name}</Button>)}</div>
    {screen && <div className="grid gap-4 xl:grid-cols-3">
      <div><TextField label="Screen name" value={screen.name} onChange={name => update(screen.id,{name})}/><ColorField label="Screen colour" value={screen.color} onChange={color => update(screen.id,{color})}/>
      <div className="mt-2 flex gap-1"><Button size="icon" variant="outline" title="Duplicate screen" onClick={() => duplicate(screen.id)}><Copy/></Button><Button size="icon" variant="outline" title="Delete screen" onClick={() => remove(screen.id)}><Trash2/></Button></div></div>
      <div>{(["x","y","width","height"] as const).map(key => <NumberField key={key} label={`Region ${key}`} suffix="px" value={screen.content[key]} step={1} min={key === "width" || key === "height" ? 1 : undefined} onChange={v => update(screen.id,{content:{...screen.content,[key]:Math.round(v)}})}/>)}</div>
      <div><NumberField label="LED resolution W" suffix="px" step={1} min={1} value={screen.pixelWidth} onChange={v => update(screen.id,{pixelWidth:Math.round(v),resolutionOverride:true})}/><NumberField label="LED resolution H" suffix="px" step={1} min={1} value={screen.pixelHeight} onChange={v => update(screen.id,{pixelHeight:Math.round(v),resolutionOverride:true})}/>
      <NumberField label="Module width" suffix="m" min={0.001} value={screen.panelConfiguration.panelWidth} onChange={v => update(screen.id,{panelConfiguration:{...screen.panelConfiguration,sizeKey:"custom",panelWidth:v}})}/><NumberField label="Module height" suffix="m" min={0.001} value={screen.panelConfiguration.panelHeight} onChange={v => update(screen.id,{panelConfiguration:{...screen.panelConfiguration,sizeKey:"custom",panelHeight:v}})}/></div>
    </div>}
  </section>;
}