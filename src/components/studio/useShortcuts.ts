import { useEffect } from "react";
import { useEditor } from "@/lib/led/store";

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || el.isContentEditable;
}

export function useShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const s = useEditor.getState();
      const meta = e.metaKey || e.ctrlKey;

      if (meta && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) s.redo();
        else s.undo();
        return;
      }
      if (meta && e.key.toLowerCase() === "s") {
        e.preventDefault();
        s.save();
        return;
      }
      switch (e.key.toLowerCase()) {
        case "delete":
        case "backspace":
          if (s.selectedId) {
            e.preventDefault();
            s.deleteScreen(s.selectedId);
          }
          break;
        case "g":
          s.setTransformMode("translate");
          break;
        case "r":
          s.setTransformMode("rotate");
          break;
        case "s":
          s.setTransformMode("scale");
          break;
        case "f":
          if (s.selectedId) s.setCamera("focus");
          break;
        case "escape":
          s.select(null);
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
