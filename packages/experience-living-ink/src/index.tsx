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

function supportsWebGL2() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2"));
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
  const [hasInteracted, setHasInteracted] = useState(false);
  const [paletteName, setPaletteName] = useState<PaletteName>("mineral");
  const [paused, setPaused] = useState(false);
  const [strength, setStrength] = useState(0.62);
  const [turbulence, setTurbulence] = useState(0.48);
  const [status, setStatus] = useState("Ready to paint.");
  const [webglSupported] = useState(supportsWebGL2);
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

  const updatePointer = (event: ReactPointerEvent<HTMLElement>, active: boolean) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const coalesced = event.nativeEvent.getCoalescedEvents?.() ?? [];
    const sample = coalesced.at(-1) ?? event.nativeEvent;
    const x = ((sample.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
    const y = -(((sample.clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1);
    const now = sample.timeStamp || performance.now();
    const elapsed = Math.max(8, now - lastPointer.current.time) / 1000;
    const velocityX = Math.max(-2.4, Math.min(2.4, (x - lastPointer.current.x) / elapsed));
    const velocityY = Math.max(-2.4, Math.min(2.4, (y - lastPointer.current.y) / elapsed));

    interaction.current.x = x;
    interaction.current.y = y;
    interaction.current.active = active;
    interaction.current.velocityX = velocityX;
    interaction.current.velocityY = velocityY;
    lastPointer.current = { x, y, time: now };
    return { x, y };
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (paused) {
      setStatus("Resume the artwork to keep painting.");
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    lastPointer.current.time = event.nativeEvent.timeStamp || performance.now();
    const point = updatePointer(event, true);
    interaction.current.gesture += 1;
    interaction.current.pigment = (interaction.current.pigment + 1) % 3;
    interaction.current.queue = [point];
    interaction.current.burst = 1;
    setHasInteracted(true);
    setStatus("Pigment is flowing.");
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (!interaction.current.active) return;
    const point = updatePointer(event, true);
    interaction.current.queue.push(point);
    if (interaction.current.queue.length > 24) interaction.current.queue.shift();
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLElement>) => {
    if (!interaction.current.active) return;
    updatePointer(event, false);
    interaction.current.velocityX = 0;
    interaction.current.velocityY = 0;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setStatus("The current is settling.");
  };

  if (!webglSupported) {
    return (
      <section className="living-ink-experience living-ink-experience--unsupported" aria-labelledby="living-ink-title">
        <p className="living-ink-kicker">Experiment 03 · Generative pigment</p>
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
        className="living-ink-artboard"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
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
            onCapture={({ message }) => setStatus(message)}
          />
        </Canvas>
      </div>

      <header className="living-ink-header">
        <p className="living-ink-kicker">Experiment 03 · Generative pigment</p>
        <h1 id="living-ink-title">Living Ink</h1>
        <p>Guide a quiet current and let every gesture become a living composition.</p>
      </header>

      <div className={`living-ink-prompt${hasInteracted ? " living-ink-prompt--hidden" : ""}`}>
        <span aria-hidden="true" />
        <p>Tap to bloom · drag to guide the current</p>
      </div>

      <div className="living-ink-toolbar" aria-label="Living Ink controls">
        <button
          type="button"
          className="living-ink-button"
          onClick={() => {
            setPaused((value) => !value);
            setStatus(paused ? "The current is moving again." : "The artwork is paused.");
          }}
          aria-pressed={paused}
        >
          {paused ? "Resume" : "Pause"}
        </button>
        <button
          type="button"
          className="living-ink-button"
          onClick={() => {
            setClearRequest((value) => value + 1);
            interaction.current.queue = [];
            setHasInteracted(true);
            setStatus("The paper is clear.");
          }}
        >
          Clear
        </button>
        <label className="living-ink-select">
          <span>Palette</span>
          <select value={paletteName} onChange={(event) => setPaletteName(event.target.value as PaletteName)}>
            {Object.entries(PALETTES).map(([value, entry]) => (
              <option key={value} value={value}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>
        <details className="living-ink-tune">
          <summary>Tune</summary>
          <div>
            <label>
              <span>Flow strength</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={strength}
                onChange={(event) => setStrength(Number(event.target.value))}
              />
            </label>
            <label>
              <span>Turbulence</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={turbulence}
                onChange={(event) => setTurbulence(Number(event.target.value))}
              />
            </label>
          </div>
        </details>
        <button
          type="button"
          className="living-ink-button living-ink-button--primary"
          onClick={() => {
            setCaptureRequest((value) => value + 1);
            setStatus("Preparing the artwork…");
          }}
        >
          Save PNG
        </button>
      </div>

      <p className="living-ink-status" aria-live="polite">
        {status}
      </p>
    </section>
  );
}
