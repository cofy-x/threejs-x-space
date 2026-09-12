import { Canvas } from "@react-three/fiber";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { LivingInkScene, type InkInteraction, type InkPalette } from "./living-ink-scene";
import "./styles.css";

const PALETTES = {
  mineral: {
    label: "Mineral",
    paper: "#f3ebdd",
    pigments: ["#263b70", "#d59a38", "#b65349"],
  },
  botanical: {
    label: "Botanical",
    paper: "#f1eee3",
    pigments: ["#315c4a", "#82a16b", "#c8754f"],
  },
  dusk: {
    label: "Dusk",
    paper: "#f0e7e2",
    pigments: ["#533b6b", "#336b87", "#c25e78"],
  },
} satisfies Record<string, InkPalette & { label: string }>;

type PaletteName = keyof typeof PALETTES;
type ToolIconName = "pause" | "play" | "clear" | "tune" | "save";

function ToolIcon({ name }: { name: ToolIconName }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      aria-hidden="true"
    >
      {name === "pause" && <path d="M7 4v12M13 4v12" strokeWidth="2.3" />}
      {name === "play" && <path d="m7 4 9 6-9 6V4Z" strokeLinejoin="round" />}
      {name === "clear" && <path d="M5 6h10M8 6V4h4v2M6.5 6l.8 10h5.4l.8-10" strokeLinecap="round" />}
      {name === "tune" && (
        <>
          <path d="M4 6h4m4 0h4M4 14h8m4 0h0" strokeLinecap="round" />
          <circle cx="10" cy="6" r="2" />
          <circle cx="14" cy="14" r="2" />
        </>
      )}
      {name === "save" && (
        <path d="M10 3v9m-3-3 3 3 3-3M4 13v3h12v-3" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

function supportsWebGL2() {
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2");
    if (!context) return false;
    context.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

function useReducedMotionPreference() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reducedMotion;
}

export function LivingInkExperience() {
  const reducedMotion = useReducedMotionPreference();
  const [captureRequest, setCaptureRequest] = useState(0);
  const [clearRequest, setClearRequest] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const [paletteName, setPaletteName] = useState<PaletteName>("mineral");
  const [paused, setPaused] = useState(false);
  const [strength, setStrength] = useState(0.62);
  const [turbulence, setTurbulence] = useState(0.48);
  const [status, setStatus] = useState("A little movement. Endless possibility.");
  const [webglSupported] = useState(supportsWebGL2);
  const artboard = useRef<HTMLDivElement>(null);
  const tune = useRef<HTMLDetailsElement>(null);
  const activePointer = useRef<number | null>(null);
  const interaction = useRef<InkInteraction>({
    active: false,
    burst: 0,
    gesture: 0,
    pigment: 0,
    queue: [],
    x: 0,
    y: 0,
    velocityX: 0,
    velocityY: 0,
  });
  const lastPointer = useRef({ x: 0, y: 0, time: 0 });

  useEffect(() => {
    const closeTune = (event: PointerEvent) => {
      if (tune.current?.open && !tune.current.contains(event.target as Node)) tune.current.open = false;
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && tune.current?.open) {
        tune.current.open = false;
        tune.current.querySelector("summary")?.focus();
      }
    };
    const stopOnBlur = () => {
      const pointerId = activePointer.current;
      activePointer.current = null;
      interaction.current.active = false;
      interaction.current.burst = 0;
      interaction.current.queue = [];
      interaction.current.velocityX = 0;
      interaction.current.velocityY = 0;
      if (pointerId !== null && artboard.current?.hasPointerCapture(pointerId)) {
        artboard.current.releasePointerCapture(pointerId);
      }
    };
    document.addEventListener("pointerdown", closeTune);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("blur", stopOnBlur);
    return () => {
      document.removeEventListener("pointerdown", closeTune);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("blur", stopOnBlur);
    };
  }, []);

  const updatePointer = (event: ReactPointerEvent<HTMLElement>, active: boolean, starting = false) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const coalesced = event.nativeEvent.getCoalescedEvents?.() ?? [];
    const sample = coalesced.at(-1) ?? event.nativeEvent;
    const x = Math.max(-1, Math.min(1, ((sample.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1));
    const y = Math.max(-1, Math.min(1, -(((sample.clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1)));
    const now = sample.timeStamp || performance.now();
    const elapsed = Math.max(8, now - lastPointer.current.time) / 1000;

    interaction.current.x = x;
    interaction.current.y = y;
    interaction.current.active = active;
    interaction.current.velocityX = starting ? 0 : Math.max(-2.4, Math.min(2.4, (x - lastPointer.current.x) / elapsed));
    interaction.current.velocityY = starting ? 0 : Math.max(-2.4, Math.min(2.4, (y - lastPointer.current.y) / elapsed));
    lastPointer.current = { x, y, time: now };
    return { x, y };
  };

  const stopGesture = () => {
    const pointerId = activePointer.current;
    activePointer.current = null;
    interaction.current.active = false;
    interaction.current.burst = 0;
    interaction.current.queue = [];
    interaction.current.velocityX = 0;
    interaction.current.velocityY = 0;
    if (pointerId !== null && artboard.current?.hasPointerCapture(pointerId)) {
      artboard.current.releasePointerCapture(pointerId);
    }
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (!event.isPrimary || event.button !== 0 || activePointer.current !== null) return;
    if (paused) {
      setStatus("The artwork is paused. Resume to add ink.");
      return;
    }
    activePointer.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = updatePointer(event, true, true);
    interaction.current.gesture += 1;
    interaction.current.pigment = (interaction.current.pigment + 1) % 3;
    interaction.current.queue = [point];
    interaction.current.burst = 1;
    setStatus("Follow the flow.");
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (activePointer.current !== event.pointerId || !interaction.current.active) return;
    const point = updatePointer(event, true);
    interaction.current.queue.push(point);
    if (interaction.current.queue.length > 24) interaction.current.queue.shift();
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLElement>) => {
    if (activePointer.current !== event.pointerId) return;
    const point = updatePointer(event, false);
    interaction.current.queue.push(point);
    activePointer.current = null;
    interaction.current.velocityX = 0;
    interaction.current.velocityY = 0;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setStatus("Let the pigment find its way.");
  };

  const handlePointerCancel = (event: ReactPointerEvent<HTMLElement>) => {
    if (activePointer.current !== event.pointerId) return;
    stopGesture();
    setStatus("Touch the paper to begin again.");
  };

  const addInk = () => {
    if (paused) {
      setStatus("The artwork is paused. Resume to add ink.");
      return;
    }
    stopGesture();
    const bloom = interaction.current.gesture % 3;
    const point = { x: [-0.24, 0.18, 0.02][bloom] ?? 0, y: [0.08, -0.12, 0.22][bloom] ?? 0 };
    Object.assign(interaction.current, point, {
      burst: 1,
      gesture: interaction.current.gesture + 1,
      pigment: (interaction.current.pigment + 1) % 3,
      queue: [point],
    });
    setStatus("A new bloom is finding its shape.");
  };

  if (!webglSupported) {
    return (
      <section className="living-ink-experience living-ink-experience--unsupported" aria-labelledby="living-ink-title">
        <p className="living-ink-kicker">A study in pigment &amp; motion</p>
        <h1 id="living-ink-title">Living Ink</h1>
        <p>This experiment needs a browser with WebGL 2 support.</p>
        <button type="button" onClick={() => window.location.reload()}>
          Retry experiment
        </button>
      </section>
    );
  }

  const palette = PALETTES[paletteName];

  return (
    <section className="living-ink-experience" aria-labelledby="living-ink-title">
      <div
        ref={artboard}
        className={`living-ink-artboard${paused ? " living-ink-artboard--paused" : ""}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerCancel}
        onLostPointerCapture={handlePointerCancel}
      >
        <Canvas
          aria-hidden="true"
          dpr={[1, 1.25]}
          gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
        >
          <LivingInkScene
            captureRequest={captureRequest}
            clearRequest={clearRequest}
            interaction={interaction}
            palette={palette}
            paused={paused}
            reducedMotion={reducedMotion}
            strength={strength}
            turbulence={turbulence}
            onCapture={({ message }) => {
              setCapturing(false);
              setStatus(message);
            }}
          />
        </Canvas>
      </div>

      <header className="living-ink-header">
        <p className="living-ink-kicker">A study in pigment &amp; motion</p>
        <h1 id="living-ink-title">
          Living <em>Ink</em><span aria-hidden="true">.</span>
        </h1>
        <p>Make a mark. Let it become.</p>
      </header>

      <aside className="living-ink-guide" aria-label="How to paint">
        <span className="living-ink-edition" aria-hidden="true">03 / An open canvas</span>
        <p>
          Tap to bloom. <br />Drag to guide the current.
        </p>
      </aside>

      <div className="living-ink-toolbar" role="group" aria-label="Living Ink controls">
        <div className="living-ink-palettes" role="group" aria-label="Color palette">
          {Object.entries(PALETTES).map(([value, entry]) => (
            <button
              key={value}
              type="button"
              className="living-ink-palette"
              aria-pressed={paletteName === value}
              aria-label={`${entry.label} palette`}
              onClick={() => {
                setPaletteName(value as PaletteName);
                setStatus(`${entry.label} pigments. A different mood for the same marks.`);
              }}
            >
              <span className="living-ink-pigments" aria-hidden="true">
                {entry.pigments.map((pigment) => (
                  <i key={pigment} style={{ backgroundColor: pigment }} />
                ))}
              </span>
              <span>{entry.label}</span>
            </button>
          ))}
        </div>

        <div className="living-ink-tools">
          <button
            type="button"
            className="living-ink-button"
            onClick={() => {
              stopGesture();
              setPaused((value) => !value);
              setStatus(paused ? "The current is moving again." : "A moment, held still. Resume to add ink.");
            }}
            aria-pressed={paused}
          >
            <ToolIcon name={paused ? "play" : "pause"} />
            {paused ? "Resume" : "Pause"}
          </button>
          <button
            type="button"
            className="living-ink-button"
            onClick={() => {
              stopGesture();
              setClearRequest((value) => value + 1);
              setStatus(paused ? "The paper is clear. Resume to begin." : "Fresh paper. A new possibility.");
            }}
          >
            <ToolIcon name="clear" />
            Clear
          </button>
          <details ref={tune} className="living-ink-tune">
            <summary>
              <ToolIcon name="tune" />
              Tune
            </summary>
            <div className="living-ink-tune-panel">
              <p className="living-ink-tune-heading">Find your flow</p>
              <label htmlFor="living-ink-flow-strength">
                <span>Flow strength <output aria-hidden="true">{Math.round(strength * 100)}%</output></span>
                <input
                  id="living-ink-flow-strength"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={strength}
                  aria-valuetext={`${Math.round(strength * 100)} percent`}
                  onChange={(event) => setStrength(Number(event.target.value))}
                />
              </label>
              <label htmlFor="living-ink-turbulence">
                <span>Turbulence <output aria-hidden="true">{Math.round(turbulence * 100)}%</output></span>
                <input
                  id="living-ink-turbulence"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={turbulence}
                  aria-valuetext={`${Math.round(turbulence * 100)} percent`}
                  onChange={(event) => setTurbulence(Number(event.target.value))}
                />
              </label>
              <button type="button" className="living-ink-add" onClick={addInk}>
                Add ink <span aria-hidden="true">+</span>
              </button>
              <p className="living-ink-tune-note">A fresh bloom, with a click or a key.</p>
            </div>
          </details>
          <button
            type="button"
            className="living-ink-button living-ink-button--primary"
            disabled={capturing}
            onClick={() => {
              setCapturing(true);
              setCaptureRequest((value) => value + 1);
              setStatus("Preparing your artwork…");
            }}
          >
            <ToolIcon name="save" />
            {capturing ? "Saving…" : "Save PNG"}
          </button>
        </div>
      </div>

      <div className="living-ink-footer">
        <span className="living-ink-flow-state">
          <i className={paused ? "is-paused" : ""} aria-hidden="true" />
          {paused ? "Paused" : "Living pigment"}
        </span>
        <p className="living-ink-status" role="status">{status}</p>
        <span className="living-ink-paper-note" aria-hidden="true">Pigment on digital paper</span>
      </div>
    </section>
  );
}
