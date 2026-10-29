import { cabinetCalc } from "./calc";
import { screenChains, processorLayout } from "./engineering";
import type { Project, ProcessorModel } from "./types";
import { isLvp615, senderReady, lvp615Issues } from "./vdwall";

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
  if (isLvp615(processor)) {
    const cfg = processorLayout(project, processor.id);
    const issues = lvp615Issues(project, processor);
    const w = processor.videoOutputWidth ?? 1920, h = processor.videoOutputHeight ?? 1080;
    return { processor, supported: true,
      steps: [
        `Connect playback ${processor.inputWidth ?? 1920} x ${processor.inputHeight ?? 1080} at 60 Hz to ${processor.inputConnector ?? "HDMI"}; select that input on the LVP615.`,
        "Connect DVI OUT1 (or its mirrored DVI OUT2) to the installed/external LED sending card or sending box, then its LED RJ45 ports to receiving cards. Do not use the LVP615 control LAN for LED data.",
        `Setup > 1. Out Image > 1.1 Resolution: select ${w} x ${h} at 60 Hz. Press OK, confirm and allow the automatic restart (manual pp. 27–28).`,
        `Set 1.2 Out Width=${cfg.width}, 1.3 Out Height=${cfg.height}, 1.4 Out H_Start=0 and 1.5 Out V_Start=0 only when this image area fits ${w} x ${h}. Press OK to save (p. 29).`,
        ...(processor.inputConnector === "DVI" ? ["For verified custom DVI 1:1 timings: Setup > 2. Input Video Signal > 2.1 DVI EDID; match custom width, height and V frequency to the output timing and Apply. Re-detect the laptop display (p. 31)."] : ["HDMI/DP standard input is limited to 1920 x 1080 at 60 Hz. A different LED raster requires source scaling, not a change to cabinet pixels."]),
        "In the sending-card manufacturer's configuration software, load the supplier's receiving-card file and enter the native cabinet matrix. NovaLCT is appropriate only if the installed sender/receivers are NovaStar.",
        ...cfg.placements.map((p) => `${p.name}: sender section X=${p.x}, Y=${p.y}, native ${p.width} x ${p.height} px; ${senderReady(processor) ? `LED ports P${p.chains[0]?.port ?? "?"}–P${p.chains.at(-1)?.port ?? "?"}, follow the data sheet's bottom-left column serpentine` : "port route pending sender specifications"}.`),
        "With a valid input connected, use 1.6 Test Pattern to check every cabinet and seam (p. 30). Turn the pattern off and save the receiving-card mapping with the sender software.",
      ],
      screens: project.screens.filter((s) => s.processorId === processor.id).map((s) => ({ screenName: s.name, rows: s.panelConfiguration.rows, cols: s.panelConfiguration.cols, ports: screenChains(project, s).map((c) => ({ port: c.port, cabinets: c.cabinets, pixels: c.pixels })), problems: issues })),
      notes: ["Source: supplied LVP615 series manual pp. 7, 10–11, 27–31. DVI outputs are identical, not two independent LED canvases.", "The manual does not establish the fitted sending-card model, LED RJ45 count or per-port capacity. Enter those from the sender label/datasheet; do not assume 650,000 pixels per port.", "P2 identifies pixel pitch, not cabinet size. Confirm the measured cabinet dimensions and native matrix before issuing a final configuration.", ...issues],
    };
  }
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
  const sets = (project.groups ?? []).filter((g) => g.mappingMode === "shared-input" && project.screens.some((s) => s.groupId === g.id && s.processorId === processor.id));
  if (sets.length) {
    const cfg = processorLayout(project, processor.id);
    steps.splice(0, steps.length,
      `Feed ONE source input (${cfg.sourceWidth} x ${cfg.sourceHeight}) to ${processor.name ?? processor.label}.`,
      `Use NovaLCT Screen Configuration for the separated screens, with one ${cfg.width} x ${cfg.height} px output canvas; do not use rectangular front-panel Quick Configuration for this layout.`,
      "Load the supplier's receiving-card configuration; keep each cabinet's native pixel dimensions.",
      ...cfg.placements.map((p) => `${p.name}: output X=${p.x}, Y=${p.y}, ${p.width} x ${p.height} px. Run P${p.chains[0]?.port ?? "?"}-P${p.chains.at(-1)?.port ?? "?"} separately to this screen; follow the cabinet chain on its data sheet.`),
      cfg.exact ? "Map source to output 1:1." : `Scale the full input to ${cfg.width} x ${cfg.height}; source crop references in the report describe the same split, not new cabinet sizes.`,
      "Test with LEFT/RIGHT labels; verify each cable's first cabinet and serpentine order, then save to receiving cards. No data jumper is required across the stage gap.",
    );
    notes.push(...cfg.issues);
  }
  return { processor, supported: isNovaVx(processor), steps, screens, notes };
}
