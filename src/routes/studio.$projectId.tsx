import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEditor } from "@/lib/led/store";
import { TopBar } from "@/components/studio/TopBar";
import { LeftSidebar } from "@/components/studio/LeftSidebar";
import { RightPanel } from "@/components/studio/RightPanel";
import { BottomBar } from "@/components/studio/BottomBar";
import { ViewportHost } from "@/components/studio/ViewportHost";
import { MappingView } from "@/components/studio/MappingView";
import { ContentCanvasEditor } from "@/components/studio/ContentCanvasEditor";
import { PlanView } from "@/components/studio/PlanView";
import { useShortcuts } from "@/components/studio/useShortcuts";

export const Route = createFileRoute("/studio/$projectId")({
  head: () => ({
    meta: [
      { title: "Stage Designer — DX5VE LED Previsualizer" },
      {
        name: "description",
        content:
          "3D stage designer workspace: configure LED screens, pixel resolutions, curvature and panel grids in real time.",
      },
      { property: "og:title", content: "Stage Designer — DX5VE LED Previsualizer" },
      {
        property: "og:description",
        content: "Design LED stages in a realistic 3D viewport with precise real-world units.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Studio,
});

function Studio() {
  const { projectId } = Route.useParams();
  const hydrate = useEditor((s) => s.hydrate);
  const openProject = useEditor((s) => s.openProject);
  const project = useEditor((s) => s.project);
  const projects = useEditor((s) => s.projects);
  const workspace = useEditor((s) => s.workspace);
  useShortcuts();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (projects.length > 0) openProject(projectId);
  }, [projectId, projects.length, openProject]);

  // Flush pending autosave when leaving or closing the studio.
  useEffect(() => {
    const flush = () => {
      const s = useEditor.getState();
      if (s.project && s.dirty) s.save();
    };
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", flush);
    return () => {
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", flush);
      flush();
    };
  }, []);


  if (!project) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Loading project…
        </p>
        <Link to="/" className="text-xs text-primary underline">
          Back to projects
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <LeftSidebar />
        {workspace === "stage" && <ViewportHost />}
        {workspace === "canvas" && <ContentCanvasEditor />}
        {workspace === "mapping" && <MappingView />}
        {workspace === "plan" && <PlanView />}
        <RightPanel />
      </div>
      <BottomBar />
    </div>
  );
}
