import { Canvas } from "@react-three/fiber";
import { Html } from "@react-three/drei";
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
  phase: "ready", assists: 0, score: 0, combo: 0, speed: 0, flightTime: 0, visitedBodies: [],
};
const DESTINATIONS = [
  { id: "pelagos", name: "Pelagos", type: "Ocean world", number: "01" },
  { id: "nyx", name: "Nyx", type: "Rocky world", number: "02" },
  { id: "helios", name: "Helios", type: "Solar flyby", number: "03" },
];

function useReducedMotionPreference() {
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reducedMotion;
}

function SceneLoading() {
  return <Html center><div className="orbital-loading" role="status">Preparing your little universe<span>Loading planetary surfaces</span></div></Html>;
}

function ArrowIcon() {
  return <svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true"><path d="M4 10h12M10 4l6 6-6 6" stroke="currentColor" strokeWidth="1.5" /></svg>;
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
    safe: "A clear path. Pull a little further to find a close approach.",
    assist: "A flyby is within reach. Release to follow this trajectory.",
    danger: "This path meets a planet. Widen your approach before release.",
  }[trajectoryState ?? "safe"];
  const statusCopy = {
    ready: "Take the guided flight, or pull the probe to chart your own course.",
    aiming: aimingCopy,
    flying: "Gravity is shaping your path. Follow the probe in chase view.",
    paused: "A moment in the void. Resume whenever you are ready.",
    crashed: "Your path met a world. Try again with a wider approach.",
    escaped: "The probe drifted beyond the system. Try a gentler launch.",
    complete: "Three worlds, one journey. You made it all the way.",
  }[snapshot.phase];
  const phaseLabel = {
    ready: "Ready for departure", aiming: "Charting a course", flying: "Flight in progress",
    paused: "Flight paused", crashed: "Contact lost", escaped: "Beyond the system", complete: "Mission accomplished",
  }[snapshot.phase];
  const canChase = ["flying", "paused", "complete"].includes(snapshot.phase);
  const signal = snapshot.phase === "aiming" ? `aiming-${trajectoryState ?? "safe"}` : snapshot.phase;
  const primaryAction: { label: string; type: SceneCommand["type"] } = snapshot.phase === "flying"
    ? { label: "Pause flight", type: "pause" }
    : snapshot.phase === "paused" ? { label: "Resume flight", type: "resume" }
    : snapshot.phase === "complete" ? { label: "Fly again", type: "reset" }
    : snapshot.phase === "crashed" || snapshot.phase === "escaped" ? { label: "Try again", type: "retry" }
    : { label: "Launch probe", type: "launch" };

  return (
    <section className="orbital-experience" aria-labelledby="orbital-title">
      <div className="orbital-stage">
      <div className="orbital-canvas" role="group" aria-label="An interactive miniature planetary system with a solar-powered probe. Use Launch probe for a guided flight, or drag the probe to aim.">
        <Canvas camera={{ position: [-6, 5, 12], fov: 48, near: 0.08, far: 180 }} dpr={[1, 1.5]}
          gl={{ antialias: true, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping }}
          shadows fallback={<div className="orbital-loading" role="alert">This little universe needs WebGL.<span>Try a browser with hardware acceleration enabled.</span></div>}>
          <Suspense fallback={<SceneLoading />}>
            <OrbitalScene command={command} cameraMode={cameraMode} reducedMotion={reducedMotion}
              onSnapshot={setSnapshot} onTrajectoryState={setTrajectoryState} />
          </Suspense>
        </Canvas>
      </div>

      <header className="orbital-header">
        <p className="orbital-kicker"><span /> A little universe to get lost in</p>
        <h1 id="orbital-title">Orbital<span>Playground</span></h1>
        <p className="orbital-intro">A small push. A different path.<br /> Let gravity take you somewhere new.</p>
      </header>

      <aside className="orbital-itinerary" aria-label="Mission destinations">
        <div className="orbital-itinerary__heading"><span>The grand tour</span><strong>{String(snapshot.assists).padStart(2, "0")} <small>/ 03</small></strong></div>
        <ol>{DESTINATIONS.map((body) => {
          const visited = snapshot.visitedBodies.includes(body.id);
          return <li key={body.id} className={visited ? "is-visited" : ""}>
            <span className={`orbital-world orbital-world--${body.id}`} aria-hidden="true" />
            <div><strong>{body.name}</strong><span>{body.type}</span></div>
            <span className="orbital-itinerary__check" aria-label={visited ? "Flyby complete" : "Flyby pending"}>{visited ? "✓" : body.number}</span>
          </li>;
        })}</ol>
        <p>One probe. Three close encounters.</p>
      </aside>

      <div className="orbital-viewbar">
        <span className="orbital-viewbar__caption">Your window into the unknown</span>
        <div className="orbital-camera" role="group" aria-label="Camera view">
          <button aria-pressed={cameraMode === "overview"} onClick={() => setCameraMode("overview")}>Overview</button>
          <button aria-pressed={cameraMode === "chase"} disabled={!canChase} onClick={() => setCameraMode("chase")} title={canChase ? "Follow the probe" : "Launch the probe to use chase view"}>Chase probe</button>
        </div>
      </div>

      <footer className="orbital-deck">
        <div className="orbital-deck__main">
          <div className="orbital-guide" role="status" aria-live="polite" aria-atomic="true">
            <p className="orbital-phase"><span className={`orbital-signal orbital-signal--${signal}`} />{phaseLabel}</p>
            <p className="orbital-guide__copy">{statusCopy}</p>
          </div>
          <div className="orbital-actions">
            <button className="orbital-reset" onClick={() => sendCommand("reset")} title="Reset the mission">Reset</button>
            <button className="orbital-launch" disabled={snapshot.phase === "aiming"} onClick={() => sendCommand(primaryAction.type)}>
              {primaryAction.label}<ArrowIcon />
            </button>
          </div>
        </div>
        <div className="orbital-deck__foot">
          <dl className="orbital-telemetry" aria-label="Flight telemetry">
            <div><dt>Flight time</dt><dd>{snapshot.flightTime.toFixed(1)}<span> s</span></dd></div>
            <div><dt>Velocity</dt><dd>{snapshot.speed.toFixed(2)}<span> u/s</span></dd></div>
            <div><dt>Mission score</dt><dd>{String(snapshot.score).padStart(5, "0")}</dd></div>
          </dl>
          <p className="orbital-help"><span>Drag probe to aim · Drag space to orbit · Scroll to explore</span><small>A playful gravity model · Not to scale</small></p>
        </div>
      </footer>
      </div>
    </section>
  );
}
