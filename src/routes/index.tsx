import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Copy, LayoutGrid, Monitor, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { useEditor } from "@/lib/led/store";
import { ProjectSetupDialog } from "@/components/studio/ProjectSetupDialog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LED Stage Designer & Previsualizer — DX5VE Studio" },
      {
        name: "description",
        content:
          "Design LED stages in 3D, configure LED screens, pixel resolutions and panel grids, and previsualize live-event stages.",
      },
      { property: "og:title", content: "LED Stage Designer & Previsualizer — DX5VE Studio" },
      {
        property: "og:description",
        content:
          "Professional 3D LED stage design and screen configuration for live-event production teams.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const projects = useEditor((s) => s.projects);
  const hydrate = useEditor((s) => s.hydrate);
  const createSample = useEditor((s) => s.createSample);
  const renameProject = useEditor((s) => s.renameProject);
  const duplicateProject = useEditor((s) => s.duplicateProject);
  const deleteProject = useEditor((s) => s.deleteProject);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);

  useEffect(() => hydrate(), [hydrate]);

  const open = (id: string) => navigate({ to: "/studio/$projectId", params: { projectId: id } });

  return (
    <main className="min-h-screen bg-background">
      <header className="flex items-center gap-3 border-b border-border bg-card px-6 py-4">
        <LayoutGrid className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-sm font-semibold uppercase tracking-[0.24em] text-foreground">
            LED Stage Designer &amp; Previsualizer
          </h1>
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            DX5VE Studio · Stage &amp; LED configuration
          </p>
        </div>
        <button
          onClick={() => open(createSample().id)}
          className="ml-auto flex items-center gap-2 border border-border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
        >
          <Sparkles className="h-3.5 w-3.5" /> Sample Project
        </button>
        <button
          onClick={() => setSetupOpen(true)}
          className="flex items-center gap-2 bg-primary px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground hover:bg-primary/85"
        >
          <Plus className="h-3.5 w-3.5" /> New Project
        </button>
      </header>

      {setupOpen && (
        <ProjectSetupDialog
          onClose={() => setSetupOpen(false)}
          onCreate={(id) => {
            setSetupOpen(false);
            open(id);
          }}
        />
      )}

      <section className="mx-auto max-w-6xl px-6 py-8">
        <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          Projects
        </h2>
        {projects.length === 0 && (
          <p className="border border-border bg-card p-6 text-sm text-muted-foreground">
            No projects yet. Create one to start designing a stage.
          </p>
        )}
        <div className="grid gap-px bg-border/60 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <article
              key={p.id}
              className="group flex flex-col gap-3 bg-card p-4 transition-colors hover:bg-secondary/40"
            >
              <button onClick={() => open(p.id)} className="text-left">
                {renaming === p.id ? (
                  <input
                    autoFocus
                    defaultValue={p.name}
                    onClick={(e) => e.stopPropagation()}
                    onBlur={(e) => {
                      renameProject(p.id, e.target.value || p.name);
                      setRenaming(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    }}
                    className="w-full border border-ring bg-input px-2 py-1 text-sm outline-none"
                  />
                ) : (
                  <h3 className="text-base font-medium text-foreground">{p.name}</h3>
                )}
                <p className="mt-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  <Monitor className="h-3 w-3" />
                  {p.screens.length} screens · stage {p.stage.width}×{p.stage.depth} m
                </p>
                <p className="font-mono text-[10px] text-muted-foreground/70">
                  Updated {new Date(p.updatedAt).toLocaleString()}
                </p>
              </button>
              <div className="mt-auto flex items-center gap-1 border-t border-border pt-3">
                <button
                  onClick={() => open(p.id)}
                  className="border border-border px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-foreground hover:bg-secondary"
                >
                  Open
                </button>
                <button
                  title="Rename"
                  onClick={() => setRenaming(p.id)}
                  className="ml-auto p-1.5 text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  title="Duplicate"
                  onClick={() => duplicateProject(p.id)}
                  className="p-1.5 text-muted-foreground hover:text-foreground"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button
                  title="Delete"
                  onClick={() => {
                    if (confirm(`Delete “${p.name}”? This cannot be undone.`)) deleteProject(p.id);
                  }}
                  className="p-1.5 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
