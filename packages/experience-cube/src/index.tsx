import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CubeScene, MOVE_SECONDS, type Playback, type View } from "./scene";
import {
  cubeAtMove,
  invertMoves,
  isSolved,
  makeScramble,
  type Cubie,
} from "./cube-state";
import "./styles.css";

const PALETTE = [
  "#e75b46",
  "#ef963b",
  "#f2d363",
  "#ece9db",
  "#56b49c",
  "#598ed7",
];
const FACES = [
  {
    name: "U",
    normal: [0, 1, 0],
    right: [1, 0, 0],
    down: [0, 0, 1],
    x: 3,
    y: 0,
  },
  {
    name: "L",
    normal: [-1, 0, 0],
    right: [0, 0, 1],
    down: [0, -1, 0],
    x: 0,
    y: 3,
  },
  {
    name: "F",
    normal: [0, 0, 1],
    right: [1, 0, 0],
    down: [0, -1, 0],
    x: 3,
    y: 3,
  },
  {
    name: "R",
    normal: [1, 0, 0],
    right: [0, 0, -1],
    down: [0, -1, 0],
    x: 6,
    y: 3,
  },
  {
    name: "B",
    normal: [0, 0, -1],
    right: [-1, 0, 0],
    down: [0, -1, 0],
    x: 9,
    y: 3,
  },
  {
    name: "D",
    normal: [0, -1, 0],
    right: [1, 0, 0],
    down: [0, 0, -1],
    x: 3,
    y: 6,
  },
];
function rotate(v: number[], q: number[]) {
  const [x = 0, y = 0, z = 0] = v,
    [qx = 0, qy = 0, qz = 0, qw = 1] = q;
  const tx = 2 * (qy * z - qz * y),
    ty = 2 * (qz * x - qx * z),
    tz = 2 * (qx * y - qy * x);
  return [
    x + qw * tx + qy * tz - qz * ty,
    y + qw * ty + qz * tx - qx * tz,
    z + qw * tz + qx * ty - qy * tx,
  ];
}
const dot = (a: number[], b: number[]) =>
  a.reduce((sum, value, i) => sum + value * (b[i] ?? 0), 0);
function CubeNet({ cubies }: { cubies: Cubie[] }) {
  const squares = cubies.flatMap((c) =>
    c.home.flatMap((value, axis) => {
      if (!value) return [];
      const normal = [0, 0, 0];
      normal[axis] = value;
      const world = rotate(normal, c.orientation);
      const face = FACES.find((f) => dot(world, f.normal) > 0.99);
      if (!face) return [];
      const x = face.x + Math.round(dot(c.position, face.right)) + 1;
      const y = face.y + Math.round(dot(c.position, face.down)) + 1;
      return [
        <rect
          key={`${c.id}-${axis}`}
          x={x * 10 + Math.floor(face.x / 3) * 3}
          y={y * 10 + Math.floor(face.y / 3) * 3}
          width="8"
          height="8"
          rx="1.5"
          fill={PALETTE[axis * 2 + (value < 0 ? 1 : 0)]}
        />,
      ];
    }),
  );
  return (
    <svg
      className="octo-net"
      viewBox="-2 -2 133 99"
      role="img"
      aria-label="Unfolded cube colors at the last completed turn"
    >
      {squares}
      {FACES.map((face) => (
        <text
          key={face.name}
          x={(face.x + 1) * 10 + Math.floor(face.x / 3) * 3 + 4}
          y={(face.y + 1) * 10 + Math.floor(face.y / 3) * 3 + 6.5}
          textAnchor="middle"
          fontSize="5"
          fontWeight="700"
          fill="#151617"
        >
          {face.name}
        </text>
      ))}
    </svg>
  );
}
function Glyph({
  kind,
}: {
  kind:
    | "play"
    | "pause"
    | "reset"
    | "next"
    | "back"
    | "camera"
    | "shuffle"
    | "expand";
}) {
  const paths = {
    play: "m8 5 11 7-11 7Z",
    pause: "M8 5v14M16 5v14",
    reset: "M4 10a8 8 0 1 1 1 7M4 4v6h6",
    next: "m8 6 7 6-7 6M18 6v12",
    back: "m16 6-7 6 7 6M6 6v12",
    camera: "M3 7h4l2-3h6l2 3h4v13H3ZM16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
    shuffle:
      "M3 6h3c5 0 7 12 12 12h3m-4-4 4 4-4 4M3 18h3c2 0 4-3 6-6m3-5 3-1h3m-4-4 4 4-4 4",
    expand: "M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5",
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill={kind === "play" ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[kind]} />
    </svg>
  );
}
export function CubeExperience() {
  const [seed, setSeed] = useState(7);
  const scramble = useMemo(() => makeScramble(seed, 18), [seed]);
  const solution = useMemo(() => invertMoves(scramble), [scramble]);
  const playback = useRef<Playback>({ time: 0, playing: false, speed: 1 });
  const [time, setTime] = useState(0),
    [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1),
    [view, setView] = useState<View>("studio");
  const [quality, setQuality] = useState(true),
    [loaded, setLoaded] = useState(false);
  const [captureStatus, setCaptureStatus] = useState("");
  const capture = useRef<(() => void) | null>(null);
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const total = solution.length * MOVE_SECONDS,
    completed = Math.min(solution.length, Math.floor(time / MOVE_SECONDS));
  const cubies = useMemo(
    () => cubeAtMove(scramble, solution, completed),
    [scramble, solution, completed],
  );
  const solved = completed === solution.length && isSolved(cubies);
  const phase = solved
    ? "Six faces. A quiet little triumph."
    : !playing
      ? time > 0
        ? "Taking a little breather."
        : "A little curiosity goes a long way."
      : (time / MOVE_SECONDS) % 1 < 0.18
        ? "Finding the perfect grip."
        : (time / MOVE_SECONDS) % 1 < 0.82
          ? "One thoughtful turn at a time."
          : "A gentle grip. A precise turn.";
  useEffect(() => {
    const tick = setInterval(() => {
      setTime(playback.current.time);
      setPlaying(playback.current.playing);
    }, 90);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReduced(media.matches);
    const hidden = () => {
      if (document.hidden) {
        playback.current.playing = false;
        setPlaying(false);
      }
    };
    media.addEventListener("change", change);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      clearInterval(tick);
      media.removeEventListener("change", change);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, []);
  const ready = useCallback(() => setLoaded(true), []);
  const seek = (value: number) => {
    playback.current.time = Math.max(0, Math.min(total, value));
    playback.current.playing = false;
    setPlaying(false);
    setTime(playback.current.time);
  };
  const toggle = () => {
    if (solved) playback.current.time = 0;
    playback.current.playing = !playback.current.playing;
    setPlaying(playback.current.playing);
  };
  const shuffle = () => {
    seek(0);
    setSeed((value) => value + 1);
  };
  const save = () => {
    try {
      capture.current?.();
      setCaptureStatus("4K image saved");
    } catch {
      setCaptureStatus("Could not save image. Please try again.");
    }
  };
  return (
    <section className="octo" aria-label="Octo's Cube interactive experience">
      <header className="octo-header">
        <div className="octo-wordmark">
          <span className="octo-mark" aria-hidden="true">
            o.
          </span>
          <div>
            <h1>Octo’s Cube</h1>
            <p>A STUDY IN NATURAL INTELLIGENCE</p>
          </div>
        </div>
        <div className="octo-header-right">
          <span className="octo-edition">
            THE UNDERWATER OBSERVATORY <b>NO. 007</b>
          </span>
          <button
            className="octo-icon"
            onClick={save}
            disabled={!loaded}
            aria-label="Save 4K image"
            title="Save a 4K image"
          >
            <Glyph kind="camera" />
          </button>
        </div>
      </header>
      <div className="octo-main">
        <div className="octo-stage">
          <div className="octo-stage-copy">
            <p className="octo-eyebrow">CURIOSITY BENEATH THE SURFACE.</p>
            <h2>
              Eight arms.
              <br />
              <em>One obsession.</em>
            </h2>
            <p>
              Meet Octo. A curious mind.
              <br />A wonderfully colorful challenge.
            </p>
          </div>
          <div
            className="octo-canvas"
            aria-label="A coral octopus using coordinated tentacles to hold and solve a colorful 3D cube"
          >
            <CubeScene
              playback={playback}
              scramble={scramble}
              solution={solution}
              view={view}
              quality={quality}
              reduced={reduced}
              onReady={ready}
              capture={capture}
            />
          </div>
          {!loaded && (
            <div className="octo-loading" role="status">
              <i />A little life beneath the surface…
            </div>
          )}
          <div className="octo-stage-caption">
            <span className={`octo-dot ${playing ? "is-live" : ""}`} />
            <span>
              {solved
                ? "A LITTLE TRIUMPH"
                : playing
                  ? "CURIOSITY IN MOTION"
                  : "READY WHEN YOU ARE"}
            </span>
          </div>
          <div className="octo-view-tools">
            <div className="octo-segment" aria-label="Camera view">
              {(["studio", "closeup"] as const).map((value) => (
                <button
                  key={value}
                  aria-pressed={
                    view === value || (value === "studio" && view === "reset")
                  }
                  onClick={() => setView(value)}
                >
                  {value === "studio" ? "Studio" : "Close-up"}
                </button>
              ))}
            </div>
            <button
              className="octo-icon"
              aria-label="Reset camera"
              onClick={() =>
                setView((value) => (value === "studio" ? "reset" : "studio"))
              }
              title="Reset camera"
            >
              <Glyph kind="expand" />
            </button>
            <span>Drag to orbit</span>
          </div>
          <div className="octo-specimen">
            OCTO / OCEAN STUDY 07<span>EIGHT ARMS · SIX COLORS · ONE MIND</span>
          </div>
        </div>
        <aside className="octo-panel">
          <div className="octo-panel-top">
            <p className="octo-eyebrow">THE LITTLE CHALLENGE</p>
            <span className="octo-chip">3 × 3 × 3</span>
          </div>
          <h2>{solved ? "Nicely done, Octo." : "Order from chaos."}</h2>
          <p className="octo-panel-intro">
            Six colors. Eighteen moves.
            <br />A very determined little mind.
          </p>
          <div className="octo-cube-state">
            <CubeNet cubies={cubies} />
            <div>
              <span>LIVE CUBE STATE</span>
              <b>
                {solved
                  ? "Perfectly aligned"
                  : completed
                    ? "Coming together"
                    : "Beautifully scrambled"}
              </b>
            </div>
          </div>
          <div className="octo-current">
            <div>
              <span className="octo-eyebrow">
                {solved ? "COMPLETE" : "ON OCTO’S MIND"}
              </span>
              <p>{phase}</p>
            </div>
            <strong>
              {solved ? "✓" : (solution[completed]?.notation ?? "—")}
            </strong>
          </div>
          <div className="octo-move-heading">
            <span className="octo-eyebrow">THE WAY THROUGH</span>
            <span>
              {String(completed).padStart(2, "0")} <i>/ {solution.length}</i>
            </span>
          </div>
          <div className="octo-moves" aria-label="Solution moves">
            {solution.map((move, i) => (
              <button
                key={`${seed}-${i}`}
                onClick={() => seek(i * MOVE_SECONDS)}
                aria-label={`Go to move ${i + 1}: ${move.notation}`}
                aria-current={completed === i ? "step" : undefined}
                className={i < completed ? "is-done" : ""}
              >
                {move.notation}
              </button>
            ))}
          </div>
          <button className="octo-primary" onClick={toggle} disabled={!loaded}>
            <Glyph kind={playing ? "pause" : solved ? "reset" : "play"} />
            {playing
              ? "Pause a moment"
              : solved
                ? "Watch it again"
                : time
                  ? "Keep going, Octo"
                  : "Watch Octo solve"}
            <span>{solved ? "↻" : "↗"}</span>
          </button>
          <button className="octo-shuffle" onClick={shuffle} disabled={!loaded}>
            <Glyph kind="shuffle" />A fresh little puzzle
          </button>
          <details className="octo-about">
            <summary>
              Inside the experiment <span>+</span>
            </summary>
            <p>
              An original Blender octopus, brought to life in Three.js. Four
              arms support Octo while four hold and turn the cube. A seeded
              scramble and its inverse keep every move reproducible. The
              choreography is animated; it does not use contact physics or a
              general cube solver.
            </p>
            <p>
              The unfold shows the last completed turn. Select any move to
              inspect it.
            </p>
            <button
              onClick={() => setQuality((value) => !value)}
              aria-pressed={quality}
            >
              Render quality: {quality ? "High" : "Balanced"}
            </button>
            <button
              onClick={() => setReduced((value) => !value)}
              aria-pressed={reduced}
            >
              Ambient motion: {reduced ? "Still" : "Gentle"}
            </button>
          </details>
        </aside>
      </div>
      <footer className="octo-transport">
        <div className="octo-transport-buttons">
          <button
            className="octo-icon"
            disabled={!loaded}
            onClick={() => seek(0)}
            aria-label="Restart sequence"
          >
            <Glyph kind="reset" />
          </button>
          <button
            className="octo-icon"
            disabled={!loaded || time === 0}
            onClick={() =>
              seek((Math.ceil(time / MOVE_SECONDS) - 1) * MOVE_SECONDS)
            }
            aria-label="Previous move"
          >
            <Glyph kind="back" />
          </button>
          <button
            className="octo-transport-play"
            disabled={!loaded}
            onClick={toggle}
            aria-label={playing ? "Pause sequence" : "Play sequence"}
          >
            <Glyph kind={playing ? "pause" : "play"} />
          </button>
          <button
            className="octo-icon"
            disabled={!loaded || solved}
            onClick={() => seek((completed + 1) * MOVE_SECONDS)}
            aria-label="Next move"
          >
            <Glyph kind="next" />
          </button>
        </div>
        <span className="octo-time">
          {time.toFixed(1).padStart(4, "0")} <i>/ {total.toFixed(1)}s</i>
        </span>
        <input
          aria-label="Solution timeline"
          type="range"
          min="0"
          max={total}
          step=".01"
          value={time}
          disabled={!loaded}
          onChange={(e) => seek(Number(e.target.value))}
          style={
            { "--progress": `${(time / total) * 100}%` } as React.CSSProperties
          }
        />
        <div className="octo-speeds" aria-label="Playback speed">
          {[0.5, 1, 2].map((value) => (
            <button
              key={value}
              aria-pressed={speed === value}
              onClick={() => {
                playback.current.speed = value;
                setSpeed(value);
              }}
            >
              {value}×
            </button>
          ))}
        </div>
        <span className="octo-render-label">
          REAL-TIME / {quality ? "HI-DPI" : "BALANCED"}
        </span>
      </footer>
      <span className="octo-announcement" role="status" aria-live="polite">
        {solved ? "Cube solved. All six faces are aligned." : captureStatus}
      </span>
    </section>
  );
}
