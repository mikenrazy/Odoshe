<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Store user-uploaded project media as lightweight asset references with IndexedDB payloads, because project JSON must remain within browser storage limits.
- Keep Canvas snapping/intersection rules in a browser-safe pure module with concrete tests, so layout and output padding remain consistent.
- Render monitor test windows from the editor's current shared media compositor at native logical resolution, with per-window animation and explicit user clicks, because permission and popup restrictions apply.
- Export Canvas reports separately from stage production PDFs, so existing client delivery page order remains unchanged.
- Keep engineering maths (global canvas, data chains, power circuits, equipment list) in src/lib/led/engineering.ts with tests, and build the technical report only from it, so report figures match the app; power uses only operator-entered ratings.
- Data chains and power circuits cut one bottom-left column serpentine into runs of floor(capacity ÷ per-cabinet load) cabinets, so splits match the user's LEDMapper sample report.
- The technical report keeps the sample's page set (cover, screen pages, full canvas, Sheet 01, data/power sheets) and ends with the equipment list page (added by user request); only the setup guide stays a separate download.
- Pixel-map PNG and DXF exports live in src/lib/led/pixel-map-export.ts and read only globalLayout/cabinetCalc, so exports match the report figures.
- Shared-input screen sets preserve native LED pixels and stage positions; engineering screenChains is authoritative for their separate physical ports, while source crops and processor-local output offsets remain distinct from the project canvas.
- Model LVP615 video timings separately from operator-confirmed downstream sending-card capacity; never allocate verified LED chains with unknown sender limits, because DVI and control LAN are not LED RJ45 outputs. Processor-panel planning previews may balance cabinets across fitted ports, but remain separate from authoritative chains and explicitly unverified until sender ratings are entered.
- Derive Processor-panel sender warnings from engineering screen chains and combined assigned loads, so individual screens expose both pixel overloads and nonexistent physical ports.
- Derive custom cabinet resolutions from a complete operator-entered native matrix before pitch estimates, so cabinet grid maths stays consistent across mapping and reports.
- Apply measured P2 LVP615 setup through a pure project transform and undoable store action; preserve existing native matrices only for unchanged cabinet sizes, and never infer pixel capacities from port count.
