import { cabinetCalc } from "./calc";
import { screenChains } from "./engineering";
import type { Project, ProcessorModel } from "./types";

/**
 * Manual configuration worksheet for NovaStar VX1000 / VX Pro series front-panel
 * Quick Configuration. Rules quoted from the NovaStar user manuals
 * (VX1000 V1.4.0 §5.2.1; VX Pro Series §5.2.1). This is a plan — it does not program hardware.
 */
export interface GuideScreen {
  screenName: string;
  rows: number;
  cols: number;
  ports: Array<{ port: number; cabinets: number; pixels: number }>;
  problems: string[];
}
export interface ProcessorGuide {
  processor: ProcessorModel;
  supported: boolean;
  steps: string[];
  screens: GuideScreen[];
  notes: string[];
}

export const PORT1_LIMIT = 650_000;

export function isNovaVx(p: ProcessorModel) {
  return p.brand === "NovaStar" && /^VX(1000|600)/i.test(p.label);
}

export function processorGuide(project: Project, processor: ProcessorModel): ProcessorGuide {
  const isPro = /pro/i.test(processor.label);
  const screens = project.screens.filter((s) => s.processorId === processor.id && s.visible !== false).map((s) => {
    const c = cabinetCalc(s);
    const chains = screenChains(project, s);
    const ports = chains.map((ch) => ({ port: ch.port, cabinets: ch.cabinets, pixels: ch.pixels }));
    const problems: string[] = [];
    if (ports[0] && ports[0].pixels > PORT1_LIMIT) problems.push(`Port ${ports[0].port} carries ${ports[0].pixels.toLocaleString()} px — the manual limits Ethernet port 1 to 650,000 px.`);
    for (let i = 1; i < ports.length; i++) if (ports[i]!.cabinets > ports[i - 1]!.cabinets) problems.push(`Port ${ports[i]!.port} has more cabinets than port ${ports[i - 1]!.port}; the manual requires port 1 ≥ port 2 ≥ … .`);
    if (ports.some((pt) => pt.cabinets % c.rows !== 0 && pt.cabinets % c.cols !== 0)) problems.push(`Some ports end part-way up a column — front-panel Quick Configuration cannot do this; send the layout from NovaLCT (Screen Configuration).`);
    for (const ch of chains) if (ch.overflow) problems.push(`Port ${ch.port} does not exist on the ${processor.label} (${processor.outputs} Ethernet ports).`);
    return { screenName: s.name, rows: c.rows, cols: c.cols, ports, problems };
  });
  const steps = [
    "Main menu: rotate the knob to Screen Configuration > Quick Configuration.",
    "Set Cabinet Row Qty and Cabinet Column Qty to the values below.",
    "Select Port 1 Cabinet Qty and enter the cabinets for Ethernet port 1 (then the following ports) as listed below.",
    "Select Data Flow (Front View) and choose the physical connection: start at Ethernet port 1, bottom-left cabinet, serpentine up/down by column.",
    "Check the LED screen live — no overlap or repetition — then press the knob to save.",
    "Screen Configuration > Save to RV Card, so receiving cards keep the settings after power loss.",
  ];
  const notes = [
    isPro
      ? `${processor.label}: OPT 1 is primary; Ethernet ports 1–${processor.outputs} carry OPT 1 data. OPT 2 is the backup connector.`
      : `${processor.label}: 10 Gigabit Ethernet ports, max 6.5 million pixels, max width 10,240 px, max height 8,192 px. OPT 2 copies or backs up the 10 Ethernet ports.`,
    "Quick Configuration handles one rectangular cabinet grid. For several screens on one processor, or Ethernet-port backup, configure in NovaLCT (Screen Configuration / Advanced Synchronous System).",
    "If a cabinet will not light, send the cabinet configuration file (.rcfgx) from NovaLCT, then repeat the steps.",
    "Low Latency requires all cabinets loaded by the Ethernet ports to be top-aligned.",
  ];
  return { processor, supported: isNovaVx(processor), steps, screens, notes };
}
