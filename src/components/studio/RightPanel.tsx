import { useEffect, useState } from "react";
import { useEditor } from "@/lib/led/store";
import { SetupPanel } from "./panels/SetupPanel";
import { StagePanel } from "./panels/StagePanel";
import { ScreenPanel } from "./panels/ScreenPanel";
import { CanvasPanel } from "./panels/CanvasPanel";
import { ProcessorPanel } from "./panels/ProcessorPanel";
import { EquipmentPanel } from "./panels/EquipmentPanel";
import { AssetLibrary } from "./panels/AssetLibrary";
import { LayersPanel } from "./panels/LayersPanel";
import { SummaryPanel } from "./panels/SummaryPanel";

type Tab = "setup" | "stage" | "led" | "canvas" | "video" | "gear" | "assets" | "layers" | "summary";

const TABS: Array<{ key: Tab; label: string }> = [
  { key: "setup", label: "Setup" },
  { key: "stage", label: "Stage" },
  { key: "led", label: "LED" },
  { key: "canvas", label: "Canvas" },
  { key: "video", label: "Video" },
  { key: "gear", label: "Gear" },
  { key: "assets", label: "Assets" },
  { key: "layers", label: "Layers" },
  { key: "summary", label: "Summary" },
];

const STEPS: Array<{ n: string; label: string; hint: string; tabs: Tab[] }> = [
  { n: "01", label: "Stage", hint: "Design the LED stage — stage, walls, curves, wings, U-shapes, overhead", tabs: ["stage", "setup", "gear"] },
  { n: "02", label: "Screens", hint: "Configure size, pitch, resolution, panels and processors", tabs: ["led", "video"] },
  { n: "03", label: "Map", hint: "Map content on the canvas across screens", tabs: ["canvas"] },
  { n: "04", label: "Preview", hint: "Upload media and preview the show from any camera angle", tabs: ["assets", "layers", "summary"] },
];

export function RightPanel() {
  const project = useEditor((s) => s.project);
  const selectedId = useEditor((s) => s.selectedId);
  const selectedEquipmentId = useEditor((s) => s.selectedEquipmentId);
  const setCamera = useEditor((s) => s.setCamera);
  const [tab, setTab] = useState<Tab>("stage");

  useEffect(() => {
    if (selectedId) setTab("led");
  }, [selectedId]);

  useEffect(() => {
    if (selectedEquipmentId) setTab("gear");
  }, [selectedEquipmentId]);

  if (!project) return null;

  return (
    <aside className="flex h-full w-[312px] shrink-0 flex-col border-l border-border bg-card">
      <ol aria-label="Workflow" className="grid shrink-0 grid-cols-4 gap-px border-b border-border bg-border/60">
        {STEPS.map((s) => {
          const active = s.tabs.includes(tab);
          return (
            <li key={s.n}>
              <button
                type="button"
                title={s.hint}
                onClick={() => {
                  setTab(s.tabs[0]!);
                  if (s.n === "04") setCamera("perspective");
                }}
                className={`flex w-full flex-col items-start px-2 py-1.5 text-left transition-colors ${
                  active ? "bg-secondary text-foreground" : "bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className={`font-mono text-[10px] ${active ? "text-primary" : ""}`}>{s.n}</span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.08em]">{s.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <nav className="grid shrink-0 grid-cols-4 gap-px border-b border-border bg-border/60">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-1 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] transition-colors ${
              tab === t.key
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "setup" && <SetupPanel />}
        {tab === "stage" && <StagePanel />}
        {tab === "led" && <ScreenPanel />}
        {tab === "canvas" && <CanvasPanel />}
        {tab === "video" && <ProcessorPanel />}
        {tab === "gear" && <EquipmentPanel />}
        {tab === "assets" && <AssetLibrary />}
        {tab === "layers" && <LayersPanel />}
        {tab === "summary" && <SummaryPanel />}
      </div>
    </aside>
  );
}
