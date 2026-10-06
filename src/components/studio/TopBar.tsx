import { Link } from "@tanstack/react-router";
import {
  Download,
  Grid3x3,
  Move3d,
  Redo2,
  Rotate3d,
  Ruler,
  Save,
  Scale3d,
  Undo2,
  LayoutGrid,
} from "lucide-react";
import {
  useEditor,
  type CameraView,
  type ViewportMode,
  type Workspace,
} from "@/lib/led/store";
import { downloadDesignPdf } from "@/lib/led/export-pdf";

const WORKSPACES: Array<{ key: Workspace; label: string }> = [
  { key: "stage", label: "2D / 3D Preview" },
  { key: "canvas", label: "Content Canvas" },
  { key: "mapping", label: "LED Mapping" },
  { key: "plan", label: "Production Plan" },
];

const MODES: Array<{ key: ViewportMode; label: string }> = [
  { key: "design", label: "Design" },
  { key: "configuration", label: "Config" },
  { key: "preview", label: "Preview" },
];

const VIEWS: Array<{ key: CameraView; label: string }> = [
  { key: "front", label: "Front" },
  { key: "left", label: "Side" },
  { key: "top", label: "Top" },
  { key: "perspective", label: "3D" },
  { key: "reset", label: "Reset" },
];

export function TopBar() {
  const project = useEditor((s) => s.project);
  const mode = useEditor((s) => s.mode);
  const setMode = useEditor((s) => s.setMode);
  const workspace = useEditor((s) => s.workspace);
  const setWorkspace = useEditor((s) => s.setWorkspace);
  const transformMode = useEditor((s) => s.transformMode);
  const setTransformMode = useEditor((s) => s.setTransformMode);
  const setCamera = useEditor((s) => s.setCamera);
  const save = useEditor((s) => s.save);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const showMeasurements = useEditor((s) => s.showMeasurements);
  const toggleMeasurements = useEditor((s) => s.toggleMeasurements);
  const snapToGrid = useEditor((s) => s.snapToGrid);
  const toggleSnap = useEditor((s) => s.toggleSnap);
  const renameProject = useEditor((s) => s.renameProject);

  if (!project) return null;

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 overflow-x-auto border-b border-border bg-card px-3">
      <Link to="/" className="flex shrink-0 items-center gap-2 pr-2">
        <LayoutGrid className="h-4 w-4 text-primary" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-foreground">
          DX5VE
        </span>
      </Link>

      <input
        value={project.name}
        onChange={(e) => renameProject(project.id, e.target.value)}
        onKeyDown={(e) => e.stopPropagation()}
        className="w-44 shrink-0 border border-transparent bg-transparent px-2 py-1 text-sm text-foreground outline-none hover:border-border focus:border-ring"
      />

      <div className="flex shrink-0 items-center gap-px bg-border/60 p-px">
        {WORKSPACES.map((w) => (
          <button
            key={w.key}
            onClick={() => setWorkspace(w.key)}
            className={`px-3 py-1 text-[10px] font-medium uppercase tracking-[0.14em] transition-colors ${
              workspace === w.key
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {w.label}
          </button>
        ))}
      </div>

      {workspace === "stage" && (
        <>
          <div className="flex shrink-0 items-center gap-px bg-border/60 p-px">
            {MODES.map((m) => (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                className={`px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em] transition-colors ${
                  mode === m.key
                    ? "bg-secondary text-foreground"
                    : "bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {mode !== "preview" && (
            <div className="flex shrink-0 items-center gap-px bg-border/60 p-px">
              {(
                [
                  ["translate", Move3d, "Move (G)"],
                  ["rotate", Rotate3d, "Rotate (R)"],
                  ["scale", Scale3d, "Scale (S)"],
                ] as const
              ).map(([key, Icon, title]) => (
                <button
                  key={key}
                  title={title}
                  onClick={() => setTransformMode(key)}
                  className={`p-1.5 transition-colors ${
                    transformMode === key
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          )}

          <div className="ml-auto flex shrink-0 items-center gap-px bg-border/60 p-px">
            {VIEWS.map((v) => (
              <button
                key={v.key}
                onClick={() => setCamera(v.key)}
                className="bg-card px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
              >
                {v.label}
              </button>
            ))}
          </div>

          <button
            title="Snap to grid"
            onClick={toggleSnap}
            className={`shrink-0 p-1.5 transition-colors ${
              snapToGrid ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Grid3x3 className="h-4 w-4" />
          </button>
        </>
      )}

      <button
        title="Toggle measurements"
        onClick={toggleMeasurements}
        className={`shrink-0 p-1.5 transition-colors ${
          workspace !== "stage" ? "ml-auto " : ""
        }${showMeasurements ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
      >
        <Ruler className="h-4 w-4" />
      </button>
      <button
        title="Undo (Ctrl+Z)"
        onClick={undo}
        className="shrink-0 p-1.5 text-muted-foreground hover:text-foreground"
      >
        <Undo2 className="h-4 w-4" />
      </button>
      <button
        title="Redo (Ctrl+Shift+Z)"
        onClick={redo}
        className="shrink-0 p-1.5 text-muted-foreground hover:text-foreground"
      >
        <Redo2 className="h-4 w-4" />
      </button>
      <button
        title="Download design spec (PDF)"
        onClick={() => downloadDesignPdf(project)}
        className="flex shrink-0 items-center gap-1.5 border border-border px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-foreground hover:bg-secondary"
      >
        <Download className="h-3.5 w-3.5" /> Download
      </button>
      <button
        onClick={save}
        className="flex shrink-0 items-center gap-1.5 border border-border px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-foreground hover:bg-secondary"
      >
        <Save className="h-3.5 w-3.5" /> Save
      </button>
    </header>
  );
}
