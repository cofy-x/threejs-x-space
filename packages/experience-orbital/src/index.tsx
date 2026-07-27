import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import {
  OrbitalScene,
  type CameraMode,
  type MissionSnapshot,
  type SceneCommand,
  type TrajectoryState,
} from "./orbital-scene";
import "./styles.css";

const INITIAL_SNAPSHOT: MissionSnapshot = {
  phase: "ready",
  assists: 0,
  score: 0,
  combo: 0,
  speed: 0,
};

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

export function OrbitalExperience() {
  const reducedMotion = useReducedMotionPreference();
  const [snapshot, setSnapshot] = useState(INITIAL_SNAPSHOT);
  const [trajectoryState, setTrajectoryState] = useState<TrajectoryState | null>(null);
  const [cameraMode, setCameraMode] = useState<CameraMode>("overview");
  const [commandId, setCommandId] = useState(0);
  const [commandType, setCommandType] = useState<SceneCommand["type"]>("reset");
  const command = useMemo(() => ({ id: commandId, type: commandType }), [commandId, commandType]);

  const sendCommand = (type: SceneCommand["type"]) => {
    if (type === "reset" || type === "retry") setCameraMode("overview");
    setCommandType(type);
    setCommandId((value) => value + 1);
  };

  const aimingCopy = {
    safe: "Safe trajectory. Keep pulling to shape a closer planetary flyby.",
    assist: "Gravity-assist window acquired. Release to attempt the flyby.",
    danger: "Collision risk detected. Widen the projected approach before release.",
  }[trajectoryState ?? "safe"];
  const statusCopy = {
    ready: "Orbit the scene, then pull the probe back to plan a planetary flyby.",
    aiming: aimingCopy,
    flying: "The probe is coasting. Switch to chase view and follow its gravity assist.",
    crashed: "The probe was lost. Retry with a wider approach.",
    complete: "Three gravity assists complete. Mission accomplished.",
  }[snapshot.phase];
  const guideSignalState = snapshot.phase === "aiming" ? `aiming-${trajectoryState ?? "safe"}` : snapshot.phase;

  return (
    <section className="orbital-experience" aria-labelledby="orbital-title">
      <div className="orbital-canvas" aria-hidden="true">
        <Canvas
          camera={{ position: [6.4, 4.5, 10], fov: 48, near: 0.08, far: 120 }}
          dpr={[1, 1.5]}
          gl={{ antialias: true, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping }}
          shadows
        >
          <Suspense fallback={null}>
            <OrbitalScene
              command={command}
              cameraMode={cameraMode}
              reducedMotion={reducedMotion}
              onSnapshot={setSnapshot}
              onTrajectoryState={setTrajectoryState}
            />
          </Suspense>
        </Canvas>
      </div>

      <header className="orbital-header">
        <div>
          <p className="orbital-kicker">Experiment 02 · WebGL gravity space</p>
          <h1 id="orbital-title">Orbital Playground</h1>
        </div>
        <div className="orbital-mission" aria-live="polite">
          <span>Mission</span>
          <strong>Complete three gravity assists</strong>
        </div>
      </header>

      <div className="orbital-guide" aria-live="polite">
        <span className={`orbital-guide__signal orbital-guide__signal--${guideSignalState}`} aria-hidden="true" />
        <p>{statusCopy}</p>
      </div>

      <aside className="orbital-telemetry" aria-label="Flight telemetry">
        <div>
          <span>Assists</span>
          <strong>{snapshot.assists}<small>/03</small></strong>
        </div>
        <div>
          <span>Velocity</span>
          <strong>{snapshot.speed.toFixed(1)}<small> AU/s</small></strong>
        </div>
        <div>
          <span>Combo</span>
          <strong>×{Math.max(1, snapshot.combo)}</strong>
        </div>
      </aside>

      <footer className="orbital-controls">
        <div className="orbital-score">
          <span>Stardust score</span>
          <strong>{snapshot.score.toLocaleString("en-US").padStart(5, "0")}</strong>
        </div>
        <div className="orbital-actions">
          {snapshot.phase === "ready" ? (
            <button className="orbital-button orbital-button--primary" onClick={() => sendCommand("launch")}>
              Launch probe
            </button>
          ) : null}
          {snapshot.phase === "crashed" ? (
            <button className="orbital-button orbital-button--primary" onClick={() => sendCommand("retry")}>
              Retry launch
            </button>
          ) : null}
          {snapshot.phase === "complete" ? (
            <button className="orbital-button orbital-button--primary" onClick={() => sendCommand("reset")}>
              Play again
            </button>
          ) : null}
          <button
            className="orbital-button"
            onClick={() => setCameraMode((mode) => (mode === "overview" ? "chase" : "overview"))}
            aria-pressed={cameraMode === "chase"}
          >
            Camera · {cameraMode === "overview" ? "Overview" : "Chase"}
          </button>
          <button className="orbital-button" onClick={() => sendCommand("reset")}>
            Reset mission
          </button>
        </div>
      </footer>
      <p className="orbital-help">
        <span className="orbital-help__desktop">Drag probe to launch · Drag space to orbit · Scroll to travel</span>
        <span className="orbital-help__mobile">Drag probe · Orbit empty space</span>
      </p>
    </section>
  );
}
