import { useEffect, useId, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { AtlasScene } from "./scene";
import { getMechanism } from "./mechanisms";
import { EDGES, NODES, PAPERS, ROLE_COLORS, ROLE_NAMES, TOUR, layerMode, layerNode } from "./architecture";
import type { AtlasKind, AtlasNode, AtlasView } from "./architecture";
import "./styles.css";

function useQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const change = () => setMatches(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, [query]);
  return matches;
}
function Icon({ name }: { name: "play" | "pause" | "reset" | "book" | "expand" | "close" | "arrow" }) {
  const paths: Record<typeof name, ReactNode> = {
    play: <path d="m8 4 12 8-12 8Z" />,
    pause: <path d="M8 5v14M16 5v14" />,
    reset: <><path d="M4 9a8 8 0 1 1 1 9M4 3v6h6" /></>,
    book: <><path d="M12 5C8 2 3 3 3 3v16s5-1 9 2c4-3 9-2 9-2V3s-5-1-9 2ZM12 5v16" /></>,
    expand: <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    arrow: <path d="M4 12h15m-6-6 6 6-6 6" />,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
function Sources() {
  return <div className="atlas-sources">
    <p className="atlas-eyebrow">THE READING ROOM</p>
    <h2>Back to the papers.</h2>
    <p>The models follow the published architectures. Every component links to its relevant paper section.</p>
    <a className="atlas-paper" href={PAPERS.original} target="_blank" rel="noreferrer"><span>01 / 2017</span><strong>Attention Is All You Need</strong><small>Vaswani et al. · Figure 1, Section 3</small><b>Read the paper ↗</b></a>
    <a className="atlas-paper" href={PAPERS.deepseek} target="_blank" rel="noreferrer"><span>02 / 2026</span><strong>DeepSeek-V4.1-Flash</strong><small>Pushing the Limits of KV Cache Compression<br />DeepSeek-AI · Figures 3–5, Sections 2 & 4.2.1</small><b>Read the technical report ↗</b></a>
    <p className="atlas-small">The original Transformer uses the base configuration. DeepSeek's 552B backbone and 196B Engram parameters are separate counts.</p>
    <p className="atlas-small">Repeated layers are grouped. Geometry, token motion, and spacing are explanatory; they do not represent measured tensor sizes or inference speed.</p>
    <a className="atlas-reference" href="https://transformer-architecture.petergostev.chatgpt.site/" target="_blank" rel="noreferrer">Visual inspiration · Peter Gostev ↗</a>
  </div>;
}
function Introduction({ onStart }: { onStart: () => void }) {
  return <div className="atlas-introduction">
    <p className="atlas-eyebrow">A FIELD GUIDE TO ATTENTION</p>
    <h2>Same idea.<br /><em>New architecture.</em></h2>
    <p>From the original sequence-to-sequence Transformer to a causal model that shares memory and routes computation.</p>
    <div className="atlas-comparison">
      <div><span>STRUCTURE</span><b className="atlas-amber">6 + 6</b><b className="atlas-mint">20 + 20</b></div>
      <div><span>ENCODER</span><b>Bidirectional</b><b>Causal</b></div>
      <div><span>FEED-FORWARD</span><b>Dense</b><b>Mixture of experts</b></div>
      <div><span>GLOBAL KV</span><b>Per sublayer</b><b>Shared in decoder</b></div>
    </div>
    <div className="atlas-invitation"><span className="atlas-invitation-icon">↖</span><p><strong>Pick a component.</strong><br />Click a block to look inside. Drag to orbit, scroll to zoom, or use the component list below.</p></div>
    <button className="atlas-text-button" onClick={onStart}>Take the guided tour <Icon name="arrow" /></button>
  </div>;
}
function ComponentDetail({ node, selectedLayer }: { node: AtlasNode; selectedLayer: string | null }) {
  return <div className="atlas-detail" style={{ "--part-color": ROLE_COLORS[node.kind] } as CSSProperties}>
    <p className="atlas-eyebrow">{node.model === "original" ? "01 / ORIGINAL TRANSFORMER" : "02 / DEEPSEEK V4.1 FLASH"}</p>
    <span className="atlas-kind"><i />{ROLE_NAMES[node.kind]}</span>
    <h2>{node.title}</h2>
    {selectedLayer && <p className="atlas-layer-selection">{selectedLayer} · {node.shortTitle.replace(/ ×\d+/, "")} + MoE</p>}
    <p>{node.detail}</p>
    <div className="atlas-fact"><span>ARCHITECTURE NOTE</span><strong>{node.fact}</strong></div>
    <a className="atlas-source-link" href={node.source} target="_blank" rel="noreferrer"><Icon name="book" /><span>{node.section}<small>Open the paper ↗</small></span></a>
  </div>;
}
export function AttentionAtlasExperience() {
  const mobile = useQuery("(max-width: 700px)");
  const reducedMotion = useQuery("(prefers-reduced-motion: reduce)");
  const [view, setView] = useState<AtlasView>(() => window.matchMedia("(max-width: 700px)").matches ? "original" : "compare");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
  const [exploded, setExploded] = useState(false);
  const [playing, setPlaying] = useState(!reducedMotion);
  const [resetKey, setResetKey] = useState(0);
  const [panel, setPanel] = useState<"notes" | "sources" | null>(null);
  const [contextPower, setContextPower] = useState(12);
  const [phase, setPhase] = useState<"prefill" | "decode">("decode");
  const [tourStep, setTourStep] = useState<number | null>(null);
  const [tourComplete, setTourComplete] = useState(false);
  const [gestures, setGestures] = useState(false);
  const [zoomDelta, setZoomDelta] = useState(0);
  const [detailPhase, setDetailPhase] = useState(0);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [compareInternals, setCompareInternals] = useState(true);
  const [replayKey, setReplayKey] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const inspector = useRef<HTMLElement>(null);
  const inspectorBody = useRef<HTMLDivElement>(null);
  const componentSelectId = useId();
  const contextId = useId();
  const node = NODES.find((item) => item.id === selectedId);
  const spec = node ? getMechanism(node) : null;
  const peer = view === "compare" && compareInternals && !mobile && spec?.counterpart
    ? NODES.find((item) => item.id === spec.counterpart) : undefined;
  const captionView = peer ? "compare" : node?.model ?? view;
  const contextSize = 2 ** contextPower;
  const contextLabel = contextPower === 20 ? "1M" : contextPower < 10 ? `${contextSize}` : `${contextSize / 1024}K`;
  const cacheMB = (contextSize * 890 / 1e6).toFixed(contextPower < 17 ? 1 : 0);
  const currentTour = tourStep === null ? null : TOUR[tourStep];
  const visibleNodes = NODES.filter((item) => view === "compare" || item.model === view);
  const sources = panel === "sources";

  function resetMechanism() {
    setDetailPhase(0);
    setReplayKey((value) => value + 1);
  }
  function select(id: string, layer: string | null = null) {
    const next = NODES.find((item) => item.id === id);
    if (!next) return;
    setSelectedId(id);
    setSelectedLayer(layer);
    if (view !== "compare" && next.model !== view) setView(next.model);
    setPanel(null);
    setTourStep(null);
    setTourComplete(false);
    resetMechanism();
    if (mobile) root.current?.scrollTo({ top: 0, behavior: "instant" });
  }
  function goTour(step: number) {
    const item = TOUR[step];
    if (!item) return;
    setTourStep(step);
    setSelectedId(item.node);
    setSelectedLayer(null);
    setPanel(null);
    setTourComplete(false);
    resetMechanism();
    setView(mobile ? NODES.find((part) => part.id === item.node)?.model ?? "original" : "compare");
    if (mobile) root.current?.scrollTo({ top: 0, behavior: "instant" });
  }
  function overview() {
    setSelectedId(null);
    setSelectedLayer(null);
    setPanel(null);
    setTourStep(null);
    setTourComplete(false);
    resetMechanism();
    setResetKey((key) => key + 1);
    if (mobile) root.current?.scrollTo({ top: 0, behavior: "instant" });
  }
  function changeView(next: AtlasView) {
    setView(next);
    overview();
  }
  function nextComponent(direction: -1 | 1) {
    const index = visibleNodes.findIndex((part) => part.id === selectedId);
    const next = visibleNodes[(index + direction + visibleNodes.length) % visibleNodes.length];
    if (next) select(next.id);
  }
  useEffect(() => {
    if (inspectorBody.current) inspectorBody.current.scrollTop = 0;
    if (panel && mobile) {
      const frame = requestAnimationFrame(() => inspector.current?.scrollIntoView({ block: "start", behavior: "instant" }));
      return () => cancelAnimationFrame(frame);
    }
  }, [selectedId, panel, mobile]);
  useEffect(() => {
    if (!selectedId || !playing || reducedMotion) return;
    const interval = window.setInterval(() => setDetailPhase((value) => (value + 1) % 3), 2200 / animationSpeed);
    return () => window.clearInterval(interval);
  }, [selectedId, playing, reducedMotion, animationSpeed, replayKey]);
  useEffect(() => {
    if (tourStep === null || !playing || reducedMotion || tourComplete || sources) return;
    const timeout = window.setTimeout(() => {
      const next = TOUR[tourStep + 1];
      if (next) {
        setTourStep(tourStep + 1);
        setSelectedId(next.node);
        setDetailPhase(0);
        setReplayKey((value) => value + 1);
        if (mobile) setView(NODES.find((part) => part.id === next.node)?.model ?? "original");
      } else setTourComplete(true);
    }, 8500);
    return () => window.clearTimeout(timeout);
  }, [tourStep, playing, reducedMotion, mobile, tourComplete, sources]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setPanel(null);
      setSelectedId(null);
      setSelectedLayer(null);
      setTourStep(null);
      setTourComplete(false);
      setDetailPhase(0);
      setResetKey((key) => key + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return <div className={`attention-atlas ${node ? "attention-atlas--opened" : ""}`} ref={root}>
    <header className="atlas-header">
      <div className="atlas-title"><span className="atlas-edition">EXPERIMENT 06</span><h1>Attention <em>Atlas</em><span className="atlas-title-dot">.</span></h1></div>
      <p className="atlas-header-note">Inside the architecture of attention.</p>
      <div className="atlas-header-actions">
        <button className={`atlas-icon-button ${sources ? "is-active" : ""}`} onClick={() => setPanel(sources ? null : "sources")} aria-label={sources ? "Close paper sources" : "Open paper sources"} aria-pressed={sources}><Icon name="book" /></button>
        <button className="atlas-tour-button" onClick={() => { goTour(0); setPlaying(!reducedMotion); }}><Icon name="play" /><span>Guided tour</span><small>1 min</small></button>
      </div>
    </header>
    <div className="atlas-workspace">
      <section className="atlas-stage" aria-label="Interactive architecture comparison">
        <div className="atlas-stage-toolbar">
          <div className="atlas-view-switch" role="group" aria-label="Architecture view">
            {([ ["compare", "Compare"], ["original", "Transformer"], ["deepseek", "DeepSeek"] ] as const).map(([value, label]) => <button key={value} aria-pressed={view === value} onClick={() => changeView(value)}>{label}</button>)}
          </div>
          <label className="atlas-browse-control" htmlFor={componentSelectId}><span>EXPLORE</span><select id={componentSelectId} aria-label="Browse every component" value={selectedId ?? ""} onChange={(event) => event.target.value ? select(event.target.value) : overview()}>
            <option value="">Choose a module to open…</option>
            {(["original", "deepseek"] as const).map((model) => <optgroup key={model} label={model === "original" ? "Original Transformer" : "DeepSeek V4.1 Flash"}>{visibleNodes.filter((item) => item.model === model).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</optgroup>)}
          </select></label>
          <button className="atlas-notes-toggle" onClick={() => setPanel(panel === "notes" ? null : "notes")} aria-expanded={panel === "notes"}>Field notes <span>↗</span></button>
          <button className="atlas-overview" onClick={overview} aria-label={node ? "Close module" : "Overview"}><Icon name="reset" /><span>{node ? "Close module" : "Overview"}</span></button>
        </div>
        <div className={`atlas-model-titles atlas-model-titles--${captionView}`}>
          {(captionView === "compare" || captionView === "original") && <div className="atlas-model-title atlas-model-title--original"><span>2017 / THE FOUNDATION</span><h2>Original Transformer</h2><p>{node ? "Opened mechanism · base model" : "6 encoder + 6 decoder · base model"}</p></div>}
          {(captionView === "compare" || captionView === "deepseek") && <div className="atlas-model-title atlas-model-title--deepseek"><span>2026 / THE EVOLUTION</span><h2>DeepSeek V4.1 Flash</h2><p>{node ? "Opened mechanism · causal architecture" : "20 causal encoder + 20 decoder"}</p></div>}
        </div>
        <div className="atlas-canvas-wrap" data-gestures={mobile && !gestures ? "scroll" : "orbit"}>
          <AtlasScene nodes={NODES} edges={EDGES} selectedId={selectedId} onSelect={(id) => select(id)} view={view} exploded={exploded} playing={playing} reducedMotion={reducedMotion} resetKey={resetKey} contextSize={contextSize} phase={phase} interactionEnabled={!mobile || gestures} zoomDelta={zoomDelta} detailPhase={detailPhase} animationSpeed={animationSpeed} replayKey={replayKey} compareInternals={compareInternals && !mobile} />
          <div className="atlas-camera-tools">
            <button aria-label="Zoom in" onClick={() => setZoomDelta((value) => value + 1)}>+</button>
            <button aria-label="Zoom out" onClick={() => setZoomDelta((value) => value - 1)}>−</button>
            {!node && <button aria-label={exploded ? "Collapse component spacing" : "Expand component spacing"} aria-pressed={exploded} onClick={() => setExploded(!exploded)}><Icon name="expand" /></button>}
          </div>
          {mobile && <button className={`atlas-gesture-toggle ${gestures ? "is-active" : ""}`} onClick={() => setGestures(!gestures)} aria-pressed={gestures}>{gestures ? "3D gestures on · tap to scroll" : "Enable 3D gestures"}</button>}
          <div className="atlas-scene-caption"><span className="atlas-live-dot" />{node ? "INSIDE THE MODULE" : "CLICK ANY MODULE TO UNFOLD ITS MECHANISM"}<span>{node ? "Illustrative values · published architecture" : "Drag to orbit · scroll to zoom"}</span></div>
        </div>
        {node && spec && <div className="atlas-mechanism-controls" aria-label="Opened module controls">
          <div className="atlas-mechanism-heading"><div><span className="atlas-eyebrow">{peer ? "RELATED MECHANISMS" : "OPENED MODULE"}{selectedLayer ? ` · ${selectedLayer}` : ""}</span><h3>{node.title}</h3></div><div className="atlas-mechanism-actions">
            {spec.counterpart && (mobile ? <button onClick={() => select(spec.counterpart ?? node.id)}>View related module ↔</button> : view === "compare" && <button aria-pressed={compareInternals} onClick={() => setCompareInternals(!compareInternals)}>{compareInternals ? "Paired view" : "Single module"} <span>↔</span></button>)}
            <button onClick={() => { resetMechanism(); setPlaying(!reducedMotion); }} aria-label="Replay module animation"><Icon name="reset" /><span>Replay</span></button>
            <button aria-label="Previous component" onClick={() => nextComponent(-1)}>←</button><button aria-label="Next component" onClick={() => nextComponent(1)}>→</button>
          </div></div>
          <div className="atlas-mechanism-sequence" role="group" aria-label="Computation steps">{spec.phases.map((step, index) => <button key={step.title} aria-pressed={detailPhase === index} onClick={() => { setDetailPhase(index); setPlaying(false); }}><span>{index + 1}</span>{step.title}</button>)}</div>
          <div className="atlas-mechanism-description"><p role="status">{spec.phases[detailPhase]?.detail}</p><button className="atlas-inline-notes" onClick={() => setPanel("notes")}>Explanation & paper ↗</button></div>
        </div>}
        {currentTour && <div className="atlas-tour-strip" aria-live="polite">
          <div className="atlas-tour-progress">{String((tourStep ?? 0) + 1).padStart(2, "0")}<span>/ 07</span></div>
          <div><span className="atlas-eyebrow">{tourComplete ? "TOUR COMPLETE" : reducedMotion ? "GUIDED TOUR · MANUAL" : playing ? "GUIDED TOUR" : "GUIDED TOUR · PAUSED"}</span><strong>{currentTour.title}</strong><p>{currentTour.text}</p></div>
          <div className="atlas-tour-controls"><button aria-label="Previous tour step" disabled={tourStep === 0} onClick={() => goTour((tourStep ?? 0) - 1)}>←</button><button aria-label={tourStep === TOUR.length - 1 ? "Finish guided tour" : "Next tour step"} onClick={() => tourStep === TOUR.length - 1 ? overview() : goTour((tourStep ?? 0) + 1)}>{tourStep === TOUR.length - 1 ? "✓" : "→"}</button><button aria-label="Close guided tour" onClick={() => { setTourStep(null); setTourComplete(false); }}><Icon name="close" /></button></div>
        </div>}
        {!node && <div className="atlas-legend" aria-label="Component color key">{Object.entries(ROLE_COLORS).map(([kind, color]) => <span key={kind}><i style={{ background: color }} />{ROLE_NAMES[kind as AtlasKind]}</span>)}<small>Representative repeated layers · not model inference</small></div>}
      </section>
      {panel && <aside className="atlas-inspector" aria-label="Component inspector" ref={inspector}>
        <div className="atlas-inspector-heading"><span>{sources ? "SOURCES & NOTES" : node ? "COMPONENT NOTES" : "THE BIG PICTURE"}</span><button aria-label="Close field notes" onClick={() => setPanel(null)}><Icon name="close" /></button></div>
        <div className="atlas-inspector-body" ref={inspectorBody}>
          {sources ? <Sources /> : node ? <ComponentDetail node={node} selectedLayer={selectedLayer} /> : <Introduction onStart={() => { goTour(0); setPlaying(!reducedMotion); }} />}
          {!sources && <details className="atlas-layer-map"><summary>Explore the 40-layer schedule <span>+</span></summary><p>One-based layer numbers. Every layer includes MoE. Select a layer to open its attention mechanism.</p>{(["encoder", "decoder"] as const).map((stack) => <div key={stack}><h3>Causal {stack}</h3><div className="atlas-layer-grid">{Array.from({ length: 20 }, (_, i) => { const layer = i + 1; const mode = layerMode(stack, layer); const name = `${stack === "encoder" ? "Encoder" : "Decoder"} L${layer}`; return <button key={layer} className={`atlas-layer atlas-layer--${mode.toLowerCase()}`} aria-label={`${name}: ${mode}${stack === "encoder" && [2, 15].includes(layer) ? ", Engram" : ""}`} aria-pressed={selectedLayer === name} title={`${name}: ${mode}`} onClick={() => { select(layerNode(stack, layer), name); setView("deepseek"); }}><b>{layer}</b><small>{mode === "Reindex" ? "Idx" : mode}</small>{stack === "encoder" && [2, 15].includes(layer) && <i />}</button>; })}</div></div>)}<p>Dot: Engram at encoder L2 and L15. Full / Idx / Reuse describe global retrieval; each also has local SWA.</p></details>}
        </div>
        <div className="atlas-inspector-foot">READ THE STRUCTURE. FOLLOW THE SIGNAL.</div>
      </aside>}
    </div>
    <footer className="atlas-controls">
      <button className="atlas-play-button" aria-label={playing ? "Pause animation and tour" : "Resume animation and tour"} aria-pressed={playing} onClick={() => setPlaying(!playing)}><Icon name={playing ? "pause" : "play"} /></button>
      <div className="atlas-context-control"><label htmlFor={contextId}>CONTEXT <strong>{contextLabel}<span> tokens</span></strong></label><input id={contextId} type="range" min="8" max="20" step="1" value={contextPower} aria-valuetext={`${contextSize.toLocaleString()} tokens`} onChange={(event) => setContextPower(Number(event.target.value))} /></div>
      <div className="atlas-phase-controls"><span className="atlas-control-label">DEEPSEEK PATH</span><div role="group" aria-label="DeepSeek processing phase"><button aria-pressed={phase === "prefill"} onClick={() => setPhase("prefill")}>Prefill</button><button aria-pressed={phase === "decode"} onClick={() => setPhase("decode")}>Decode</button></div></div>
      <div className="atlas-phase-note" role="status">{phase === "prefill" ? "Encoder + global KV; decoder SWA replays the final 128 tokens." : node ? "Example signals explain the operation; they are not learned model weights." : "Each new token passes through both causal stacks."}<small>{cacheMB} MB estimated global KV · excludes SWA and weights{reducedMotion ? " · Reduced motion: use step controls" : ""}</small></div>
      <label className="atlas-speed-control"><span>ANIMATION</span><select aria-label="Animation speed" value={animationSpeed} onChange={(event) => setAnimationSpeed(Number(event.target.value))}><option value="0.5">0.5×</option><option value="1">1×</option><option value="2">2×</option></select></label>
    </footer>
  </div>;
}
