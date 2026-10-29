import { useEditor } from "@/lib/led/store";
import { processorGuide } from "@/lib/led/processor-guide";
import { Section } from "./Field";

export function ProcessorGuideSection() {
  const project = useEditor((s) => s.project);
  if (!project) return null;
  const used = project.processors.filter((p) => project.screens.some((s) => s.processorId === p.id));
  return (
    <Section title="Processor Setup Guide">
      <p className="mb-2 text-[10px] text-muted-foreground">Configuration worksheet from the NovaStar and VDWall LVP615 manuals. Hardware settings must be entered and checked on site.</p>
      {used.length === 0 && <p className="text-[11px] text-muted-foreground">Assign a screen to a processor first.</p>}
      {used.map((p) => {
        const g = processorGuide(project, p);
        return (
          <div key={p.id} className="mb-3 border-b border-border/60 pb-3 last:border-0">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-foreground">{p.name ?? p.label}</div>
            {!g.supported && <p className="text-[10px] text-muted-foreground">No verified manual guide for this model.</p>}
            {g.supported && <>
              <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-[10px] text-muted-foreground">{g.steps.map((s) => <li key={s}>{s}</li>)}</ol>
              {g.screens.map((sc) => (
                <div key={sc.screenName} className="mt-2 rounded border border-border p-2">
                  <div className="font-mono text-[10px] text-foreground">{sc.screenName} · Row Qty {sc.rows} · Column Qty {sc.cols}</div>
                  <div className="mt-1 grid grid-cols-3 gap-x-2 font-mono text-[10px] text-muted-foreground">
                    {sc.ports.map((pt) => <span key={pt.port}>Port {pt.port}: {pt.cabinets} cab</span>)}
                  </div>
                  {sc.problems.map((pr) => <p key={pr} className="mt-1 text-[10px] text-destructive">{pr}</p>)}
                </div>
              ))}
              <ul className="mt-2 list-disc space-y-0.5 pl-4 text-[10px] text-muted-foreground">{g.notes.map((n) => <li key={n}>{n}</li>)}</ul>
            </>}
          </div>
        );
      })}
    </Section>
  );
}
