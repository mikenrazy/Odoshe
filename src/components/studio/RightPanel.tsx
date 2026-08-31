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

export function RightPanel() {
  const project = useEditor((s) => s.project);
  const selectedId = useEditor((s) => s.selectedId);
  const selectedEquipmentId = useEditor((s) => s.selectedEquipmentId);
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
