import { useState } from "react";
import {
  Boxes,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  Lightbulb,
  Lock,
  LockOpen,
  Monitor,
  Package,
  Plus,
  Trash2,
} from "lucide-react";
import { useEditor } from "@/lib/led/store";
import { SCREEN_PRESETS } from "@/lib/led/presets";
import { SCREEN_TYPE_LABELS } from "@/lib/led/types";

export function LeftSidebar() {
  const project = useEditor((s) => s.project);
  const selectedId = useEditor((s) => s.selectedId);
  const select = useEditor((s) => s.select);
  const addScreen = useEditor((s) => s.addScreen);
  const updateScreen = useEditor((s) => s.updateScreen);
  const deleteScreen = useEditor((s) => s.deleteScreen);
  const duplicateScreen = useEditor((s) => s.duplicateScreen);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [presetsOpen, setPresetsOpen] = useState(true);

  if (!project) return null;

  return (
    <aside className="flex h-full w-[264px] shrink-0 flex-col border-r border-border bg-card">
      <div className="border-b border-border p-3">
        <button
          onClick={() => addScreen()}
          className="flex w-full items-center justify-center gap-2 bg-primary px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground transition-colors hover:bg-primary/85"
        >
          <Plus className="h-3.5 w-3.5" /> Add LED Screen
        </button>
      </div>

      <div className="border-b border-border">
        <button
          onClick={() => setPresetsOpen((v) => !v)}
          className="flex w-full items-center gap-1.5 bg-secondary/40 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/80"
        >
          <ChevronRight
            className={`h-3 w-3 transition-transform ${presetsOpen ? "rotate-90" : ""}`}
          />
          Screen Presets
        </button>
        {presetsOpen && (
          <div className="grid gap-px bg-border/40 p-px">
            {SCREEN_PRESETS.map((preset) => (
              <button
                key={preset.key}
                onClick={() => addScreen(preset.key)}
                className="group flex flex-col items-start bg-card px-3 py-1.5 text-left transition-colors hover:bg-secondary"
              >
                <span className="text-xs font-medium text-foreground">{preset.label}</span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {preset.description}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="bg-secondary/40 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/80">
          Object Tree
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto py-1 text-xs">
          <TreeRow icon={<Boxes className="h-3.5 w-3.5" />} label={project.name} depth={0} bold />
          <TreeRow
            icon={<Package className="h-3.5 w-3.5" />}
            label="STAGE"
            depth={1}
            active={selectedId === null}
            onClick={() => select(null)}
          />
          <TreeRow icon={<Monitor className="h-3.5 w-3.5" />} label="LED SCREENS" depth={1} />
          {project.screens.length === 0 && (
            <div className="py-1 pl-12 text-[11px] text-muted-foreground">No screens yet</div>
          )}
          {project.screens.map((screen) => (
            <div
              key={screen.id}
              className={`group flex items-center gap-1 pr-2 ${
                selectedId === screen.id ? "bg-primary/15" : "hover:bg-secondary/60"
              }`}
            >
              <button
                onClick={() => select(screen.id)}
                onDoubleClick={() => setRenaming(screen.id)}
                className="flex min-w-0 flex-1 items-center gap-2 py-1 pl-12 text-left"
              >
                <span
                  className="h-2 w-2 shrink-0"
                  style={{ backgroundColor: screen.visible ? screen.color : "#3a3f4a" }}
                />
                {renaming === screen.id ? (
                  <input
                    autoFocus
                    defaultValue={screen.name}
                    onBlur={(e) => {
                      updateScreen(screen.id, { name: e.target.value || screen.name });
                      setRenaming(null);
                    }}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                      if (e.key === "Escape") setRenaming(null);
                    }}
                    className="w-full border border-ring bg-input px-1 text-xs outline-none"
                  />
                ) : (
                  <span className="truncate text-foreground/90">{screen.name}</span>
                )}
                <span className="ml-auto shrink-0 font-mono text-[9px] text-muted-foreground">
                  {SCREEN_TYPE_LABELS[screen.type].split(" ")[0]}
                </span>
              </button>
              <IconBtn
                title={screen.visible ? "Hide" : "Show"}
                onClick={() => updateScreen(screen.id, { visible: !screen.visible })}
              >
                {screen.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              </IconBtn>
              <IconBtn
                title={screen.locked ? "Unlock" : "Lock"}
                onClick={() => updateScreen(screen.id, { locked: !screen.locked })}
              >
                {screen.locked ? (
                  <Lock className="h-3 w-3 text-primary" />
                ) : (
                  <LockOpen className="h-3 w-3" />
                )}
              </IconBtn>
              <IconBtn title="Duplicate" onClick={() => duplicateScreen(screen.id)}>
                <Copy className="h-3 w-3" />
              </IconBtn>
              <IconBtn title="Delete" onClick={() => deleteScreen(screen.id)}>
                <Trash2 className="h-3 w-3" />
              </IconBtn>
            </div>
          ))}
          <TreeRow
            icon={<Lightbulb className="h-3.5 w-3.5" />}
            label="LIGHTING"
            depth={1}
            muted
            hint="venue rig"
          />
          <TreeRow
            icon={<Package className="h-3.5 w-3.5" />}
            label="PROPS"
            depth={1}
            muted
            hint="stairs / podium"
          />
        </div>
      </div>
    </aside>
  );
}

function IconBtn({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="p-1 text-muted-foreground opacity-0 transition hover:text-foreground group-hover:opacity-100"
    >
      {children}
    </button>
  );
}

function TreeRow({
  icon,
  label,
  depth,
  bold,
  muted,
  hint,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  depth: number;
  bold?: boolean;
  muted?: boolean;
  hint?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 py-1 text-left ${
        active ? "bg-primary/15" : onClick ? "hover:bg-secondary/60" : ""
      }`}
      style={{ paddingLeft: 12 + depth * 16 }}
    >
      <span className={muted ? "text-muted-foreground/60" : "text-muted-foreground"}>{icon}</span>
      <span
        className={`tracking-wide ${bold ? "font-semibold text-foreground" : ""} ${
          muted ? "text-muted-foreground/70" : "text-foreground/80"
        }`}
      >
        {label}
      </span>
      {hint && <span className="ml-auto pr-3 font-mono text-[9px] text-muted-foreground/60">{hint}</span>}
    </button>
  );
}
