import type { Project } from "./types";
import { renderComposite } from "./media";
import { getAsset } from "./asset-store";

/** Separate Canvas report; stage design downloads retain their existing page order. */
export async function downloadCanvasPdf(project: Project) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({orientation:"landscape",unit:"mm",format:"a3"});
  const W=420,H=297,M=14;
  const heading = (title:string) => {
    doc.setFillColor(12,16,24);doc.rect(0,0,W,27,"F");
    doc.setTextColor(255,157,46);doc.setFontSize(15);doc.text(title,M,12);
    doc.setTextColor(220,226,236);doc.setFontSize(8);doc.text(doc.splitTextToSize(`${project.name} | Client: ${project.meta.client || "—"} | Venue: ${project.meta.venue || "—"}`,W-M*2),M,20);
  };
  heading("DX5VE · CANVAS LAYOUT REPORT");
  const media = await Promise.all(project.media.map(async m => !m.src && m.assetId ? {...m,src:(await getAsset(m.assetId))??undefined}:m));
  const composite = await renderComposite(project.canvas,media);
  const scale = Math.min((W-2*M)/project.canvas.width,210/project.canvas.height);
  const w=project.canvas.width*scale,h=project.canvas.height*scale;
  const x=(W-w)/2,y=40+(210-h)/2;
  doc.setFillColor(0,0,0);doc.rect(x,y,w,h,"F");
  if(composite) doc.addImage(composite.toDataURL("image/jpeg",0.92),"JPEG",x,y,w,h);
  project.screens.forEach((screen,i) => {
    const r=screen.content;
    const left=Math.max(0,r.x),top=Math.max(0,r.y),right=Math.min(project.canvas.width,r.x+r.width),bottom=Math.min(project.canvas.height,r.y+r.height);
    if(right<=left || bottom<=top)return;
    doc.setDrawColor(screen.color);doc.setLineWidth(0.5);doc.rect(x+left*scale,y+top*scale,(right-left)*scale,(bottom-top)*scale);
    doc.setFillColor(12,16,24);doc.rect(x+left*scale,y+top*scale,Math.min(12,(right-left)*scale),5,"F");
    doc.setTextColor(255,255,255);doc.setFontSize(7);doc.text(String(i+1),x+left*scale+1,y+top*scale+3.5);
  });
  doc.setTextColor(40,45,52);doc.setFontSize(9);doc.text(`Canvas ${project.canvas.width} × ${project.canvas.height} px · ${project.screens.length} screens · ${project.canvas.refreshRate} Hz`,M,266);
  doc.setFontSize(7);doc.text(`Generated ${new Date().toLocaleString()} · DX5VE Studio`,M,H-9);
  doc.addPage();heading("CANVAS · SCREEN SCHEDULE");
  let rowY=39;
  const widths=[14,68,55,55,54,62,70];
  const row=(values:string[],header=false) => {
    const lines=values.map((v,i)=>doc.splitTextToSize(v,(widths[i]??40)-4));
    const rh=Math.max(9,...lines.map(l=>l.length*4+3));
    if(rowY+rh>H-15){doc.addPage();heading("CANVAS · SCREEN SCHEDULE CONTINUED");rowY=39;}
    doc.setFillColor(header?225:247,header?230:249,header?237:252);doc.rect(M,rowY-4,W-M*2,rh,"F");
    let cx=M;doc.setTextColor(25,30,38);doc.setFontSize(8);
    lines.forEach((l,i)=>{doc.text(l,cx+2,rowY);cx+=widths[i]??40;});rowY+=rh;
  };
  row(["#","Screen / colour","LED resolution px","Canvas region px","Position X / Y px","Module W × H m","Processor"],true);
  project.screens.forEach((s,i)=>row([String(i+1),`${s.name}\n${s.color}`,`${s.pixelWidth} × ${s.pixelHeight}`,`${s.content.width} × ${s.content.height}`,`${s.content.x} / ${s.content.y}`,`${s.panelConfiguration.panelWidth} × ${s.panelConfiguration.panelHeight}`,project.processors.find(p=>p.id===s.processorId)?.name || s.processorId || "Unassigned"]));
  doc.save(`${project.name.replace(/[^a-z0-9]+/gi,"-").toLowerCase()}-canvas-report.pdf`);
}