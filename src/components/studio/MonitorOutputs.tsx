import { useEffect, useRef, useState } from "react";
import { Monitor, Play, Square, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEditor } from "@/lib/led/store";
import { renderComposite } from "@/lib/led/media";
import { regionIntersection, TARGET_OUTPUT_FPS, TEST_OUTPUT_COUNT } from "@/lib/led/canvas-layout";
import type { ContentRegion } from "@/lib/led/types";
import { NumberField } from "./Field";

type Display = { label?: string; width: number; height: number; availLeft: number; availTop: number; availWidth: number; availHeight: number; devicePixelRatio?: number };
type Slot = { region: ContentRegion; display: number; pattern: boolean };
type Running = { popup: Window; frame: number; fps: number; frames: number; since: number; composite: HTMLCanvasElement };
type ScreenWindow = Window & { getScreenDetails?: () => Promise<{ screens: Display[] }> };

export function MonitorOutputs() {
  const project = useEditor(s => s.project);
  const [displays, setDisplays] = useState<Display[]>([]);
  const [message, setMessage] = useState("");
  const [slots, setSlots] = useState<Slot[]>(() => Array.from({length:TEST_OUTPUT_COUNT}, (_,i) => ({region:{x:i*960,y:0,width:960,height:1080},display:i,pattern:false})));
  const slotsRef = useRef(slots);
  slotsRef.current = slots;
  const running = useRef(new Map<number,Running>());
  const [stats, setStats] = useState<Record<number,string>>({});
  const stop = (index: number) => { const r = running.current.get(index); if (r) { r.popup.cancelAnimationFrame(r.frame); r.popup.close(); running.current.delete(index); } setStats(s => ({...s,[index]:"Stopped"})); };
  useEffect(() => {
    const timer = setInterval(() => {
      const values: Record<number,string> = {};
      for (const [index,r] of running.current) {
        if (r.popup.closed) { running.current.delete(index); values[index] = "Stopped"; }
        else values[index] = `${r.popup.screen.width} × ${r.popup.screen.height} display · ${r.popup.innerWidth} × ${r.popup.innerHeight} window · ${r.fps} FPS`;
      }
      setStats(values);
    }, 1000);
    return () => { clearInterval(timer); for (const r of running.current.values()) { r.popup.cancelAnimationFrame(r.frame); r.popup.close(); } running.current.clear(); };
  }, []);
  const detect = async () => {
    const getDetails = (window as ScreenWindow).getScreenDetails;
    if (!getDetails) { setMessage("Automatic display detection is unavailable here. Outputs can still be moved to monitors manually."); return; }
    try { const details = await getDetails.call(window); setDisplays(details.screens); setMessage(`${details.screens.length} connected display${details.screens.length === 1 ? "" : "s"} detected`); }
    catch { setMessage("Display permission was not granted. Manual output windows remain available."); }
  };
  const patch = (i: number, patch: Partial<Slot>) => setSlots(s => s.map((v,j) => i === j ? {...v,...patch} : v));
  const open = (index: number) => {
    const old = running.current.get(index);
    if (old && !old.popup.closed) { old.popup.focus(); return; }
    const slot = slotsRef.current[index];
    if (!slot) return;
    const display = displays[slot.display];
    const features = display ? `popup=yes,left=${display.availLeft},top=${display.availTop},width=${display.availWidth},height=${display.availHeight}` : "popup=yes,width=960,height=540";
    const popup = window.open("about:blank", `dx5ve-output-${index}`, features);
    if (!popup) { setMessage("Output window blocked. Allow popups for this website, then try again."); return; }
    const doc = popup.document;
    doc.title = `DX5VE · Test output ${index+1}`;
    // Device pixels are a render surface, not UI theme colors.
    doc.body.style.cssText = "margin:0;overflow:hidden;background:black";
    const canvas = doc.createElement("canvas");
    canvas.style.cssText = "display:block;width:100vw;height:100vh;cursor:none";
    canvas.title = "Double-click for fullscreen";
    doc.body.append(canvas);
    canvas.addEventListener("dblclick", () => { void canvas.requestFullscreen().catch(() => undefined); });
    const ctx = canvas.getContext("2d");
    if (!ctx) { popup.close(); setMessage("This browser cannot create an output drawing surface."); return; }
    const state: Running = {popup,frame:0,fps:0,frames:0,since:0,composite:document.createElement("canvas")};
    running.current.set(index,state);
    let previous = 0;
    const frame = async (time: number) => {
      if (popup.closed || running.current.get(index) !== state) return;
      if (time - previous < 1000 / TARGET_OUTPUT_FPS - 1) { state.frame = popup.requestAnimationFrame(frame); return; }
      previous = time;
      const current = useEditor.getState().project;
      const config = slotsRef.current[index];
      if (!current || !config) return;
      const source = await renderComposite(current.canvas, current.media ?? [], {target:state.composite,nativeResolution:true});
      if (popup.closed || running.current.get(index) !== state) return;
      if (source) {
        if (config.pattern) {
          const c = source.getContext("2d");
          if (c) {
            const colors = ["#ffffff","#ffff00","#00ffff","#00ff00","#ff00ff","#ff0000","#0000ff","#000000"];
            colors.forEach((color,i) => { c.fillStyle=color; c.fillRect(i*source.width/8,0,source.width/8,source.height); });
            c.strokeStyle="#808080"; c.lineWidth=1;
            for(let x=0;x<source.width;x+=100) { c.beginPath();c.moveTo(x,0);c.lineTo(x,source.height);c.stroke(); }
            for(let y=0;y<source.height;y+=100) { c.beginPath();c.moveTo(0,y);c.lineTo(source.width,y);c.stroke(); }
          }
        }
        const dpr = popup.devicePixelRatio || 1;
        const w = Math.max(1,Math.round(popup.innerWidth*dpr)), h = Math.max(1,Math.round(popup.innerHeight*dpr));
        if(canvas.width !== w) canvas.width=w;
        if(canvas.height !== h) canvas.height=h;
        ctx.fillStyle="#000000";ctx.fillRect(0,0,w,h);
        const fit = Math.min(w/config.region.width,h/config.region.height);
        const part = regionIntersection(config.region,current.canvas.width,current.canvas.height);
        if(part.width>0 && part.height>0) ctx.drawImage(source,part.x,part.y,part.width,part.height,(w-config.region.width*fit)/2+part.offsetX*fit,(h-config.region.height*fit)/2+part.offsetY*fit,part.width*fit,part.height*fit);
      }
      state.frames++;
      if (!state.since) state.since=time;
      if(time-state.since>=1000) {state.fps=Math.round(state.frames*1000/(time-state.since));state.frames=0;state.since=time;}
      state.frame=popup.requestAnimationFrame(frame);
    };
    state.frame=popup.requestAnimationFrame(frame);
    setMessage("");
  };
  if (!project) return null;
  return <section className="mt-5 border-t border-border pt-4">
    <header className="mb-3 flex items-center justify-between gap-2"><h3 className="text-xs font-semibold uppercase">Monitor outputs <span className="text-muted-foreground">· target {TARGET_OUTPUT_FPS} FPS</span></h3><Button size="sm" variant="outline" onClick={() => void detect()}><ScanLine/>Detect displays</Button></header>
    {message && <p role="status" className="mb-3 text-xs text-muted-foreground">{message}</p>}
    <div className="grid gap-3 md:grid-cols-2">{slots.map((slot,i) => <div key={i} className="border border-border bg-card p-3">
      <header className="mb-2 flex items-center gap-2"><Monitor className="h-4 w-4 text-accent"/><span className="text-xs font-semibold">Output {i+1}</span><Button size="icon" variant="outline" className="ml-auto" title={`Open output ${i+1}`} onClick={() => open(i)}><Play/></Button><Button size="icon" variant="ghost" title={`Stop output ${i+1}`} onClick={() => stop(i)}><Square/></Button></header>
      <label className="mb-2 flex justify-between gap-2 text-xs text-muted-foreground">Region<select aria-label={`Output ${i+1} screen region`} value="" className="min-w-0 max-w-[65%] border border-border bg-input text-foreground" onChange={e => {const s=project.screens.find(s => s.id===e.target.value);if(s)patch(i,{region:{...s.content}});}}><option value="">Custom</option>{project.screens.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      {displays.length>0 && <select aria-label={`Output ${i+1} display`} value={slot.display} className="mb-2 w-full border border-border bg-input text-xs" onChange={e => patch(i,{display:Number(e.target.value)})}>{displays.map((d,j) => <option key={j} value={j}>{d.label || `Display ${j+1}`} · {d.width} × {d.height}</option>)}</select>}
      <div className="grid grid-cols-2 gap-x-3">{(["x","y","width","height"] as const).map(key => <NumberField key={key} label={`O${i+1} ${key}`} value={slot.region[key]} min={key==="width"||key==="height"?1:undefined} step={1} onChange={v=>patch(i,{region:{...slot.region,[key]:Math.round(v)}})}/>)}</div>
      <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={slot.pattern} onChange={e=>patch(i,{pattern:e.target.checked})}/>Test pattern</label>
      <p className="mt-2 min-h-8 font-mono text-[10px] text-muted-foreground">{stats[i] || "Not running"}</p>
    </div>)}</div>
  </section>;
}