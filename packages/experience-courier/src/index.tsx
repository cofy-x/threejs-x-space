import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CourierScene } from "./scene";
import {
  INITIAL,
  commands,
  equal,
  findPath,
  objective,
  reducer,
  type Action,
  type Point,
} from "./game";
import "./styles.css";

type IconName =
  | "arrow"
  | "parcel"
  | "stamp"
  | "sound"
  | "mute"
  | "pause"
  | "play"
  | "map"
  | "focus"
  | "reset"
  | "sun"
  | "check";
function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    arrow: <path d="M4 12h15m-6-6 6 6-6 6" />,
    parcel: (
      <>
        <path d="m3 7 9-4 9 4-9 4-9-4Zm0 0v10l9 4 9-4V7M12 11v10M7 5l10 4v5" />
      </>
    ),
    stamp: (
      <>
        <path d="M5 3h14v2l2 1v3l-2 1v4l2 1v3l-2 1v2H5v-2l-2-1v-3l2-1v-4L3 9V6l2-1V3Z" />
        <path d="m12 7 1.5 3 3.5.5-2.5 2.5.5 3.5-3-1.7-3 1.7.5-3.5L7 10.5l3.5-.5L12 7Z" />
      </>
    ),
    sound: (
      <>
        <path d="m11 4-6 5H2v6h3l6 5V4Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" />
      </>
    ),
    mute: (
      <>
        <path d="m11 4-6 5H2v6h3l6 5V4Zm5 5 6 6m0-6-6 6" />
      </>
    ),
    pause: <path d="M8 5v14M16 5v14" />,
    play: <path d="m8 4 12 8-12 8V4Z" />,
    map: <path d="m3 5 6-2 6 3 6-2v15l-6 2-6-3-6 2V5Zm6-2v15m6-12v15" />,
    focus: (
      <>
        <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" />
        <circle cx="12" cy="12" r="4" />
      </>
    ),
    reset: <path d="M4 10a8 8 0 1 1 1 7M4 4v6h6" />,
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
const formatTime = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
const DIRECTIONS: Record<string, Point> = {
  ArrowUp: [0, -1],
  KeyW: [0, -1],
  ArrowDown: [0, 1],
  KeyS: [0, 1],
  ArrowLeft: [-1, 0],
  KeyA: [-1, 0],
  ArrowRight: [1, 0],
  KeyD: [1, 0],
};
const CHAPTERS = [
  "The drawbridge",
  "The garden lift",
  "The turnbridge",
  "The lighthouse",
];
function readBest(): { seconds: number; stamps: number } | null {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem("clockwork-courier.best.v1") ?? "null",
    );
    if (
      value &&
      typeof value === "object" &&
      "seconds" in value &&
      "stamps" in value &&
      typeof value.seconds === "number" &&
      typeof value.stamps === "number" &&
      Number.isFinite(value.seconds) &&
      value.seconds >= 0 &&
      value.stamps >= 0 &&
      value.stamps <= 3
    )
      return { seconds: value.seconds, stamps: value.stamps };
  } catch {
    /* Storage is optional, including in private browsing. */
  }
  return null;
}
export function CourierExperience() {
  const [game, rawDispatch] = useReducer(reducer, INITIAL);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState<"map" | "follow">("map");
  const [sound, setSound] = useState(false);
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [target, setTarget] = useState<Point | null>(null);
  const [busy, setBusy] = useState(false);
  const [best, setBest] = useState(readBest);
  const state = useRef(game);
  state.current = game;
  const held = useRef<string | null>(null);
  const nextRepeat = useRef(0);
  const path = useRef<Point[]>([]);
  const busyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busyRef = useRef(false);
  const audio = useRef<AudioContext | null>(null);
  const soundRef = useRef(sound);
  soundRef.current = sound;
  const chime = useCallback((type: "step" | "action" | "win") => {
    if (!soundRef.current || !audio.current) return;
    const ctx = audio.current;
    if (ctx.state !== "running") return;
    const notes =
      type === "win"
        ? [523.25, 659.25, 783.99, 1046.5]
        : type === "step"
          ? [440]
          : [659.25, 880];
    notes.forEach((frequency, i) => {
      const oscillator = ctx.createOscillator(),
        gain = ctx.createGain(),
        at = ctx.currentTime + i * 0.12;
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(
        type === "step" ? 0.012 : 0.07,
        at + 0.01,
      );
      gain.gain.exponentialRampToValueAtTime(0.001, at + 0.5);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(at);
      oscillator.stop(at + 0.55);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    });
  }, []);
  const stop = useCallback(() => {
    held.current = null;
    path.current = [];
    setTarget(null);
  }, []);
  const send = useCallback(
    (action: Action) => {
      if (
        action.type === "pause" ||
        action.type === "reset" ||
        action.type === "recover"
      )
        stop();
      if (action.type === "interact") {
        if (busyRef.current) return;
        chime(action.id === "deliver" ? "win" : "action");
        if (action.id === "ride") {
          busyRef.current = true;
          setBusy(true);
          busyTimer.current = setTimeout(() => {
            busyRef.current = false;
            setBusy(false);
          }, 750);
        }
      }
      rawDispatch(action);
    },
    [chime, stop],
  );
  const walk = useCallback(
    (point: Point) => {
      const current = state.current;
      if (current.phase !== "playing" || busyRef.current) return;
      stop();
      if (equal(point, current.player)) {
        const command = commands(current)[0];
        if (command) send({ type: "interact", id: command.id });
        return;
      }
      const route = findPath(current.player, point, current);
      if (route.length) {
        path.current = route;
        setTarget(point);
      }
    },
    [send, stop],
  );
  const step = useCallback(
    (code: string) => {
      const direction = DIRECTIONS[code];
      if (!direction || state.current.phase !== "playing" || busyRef.current)
        return;
      const [x, z] = state.current.player;
      send({ type: "move", to: [x + direction[0], z + direction[1]] });
    },
    [send],
  );
  useEffect(() => {
    const timer = setInterval(() => {
      if (state.current.phase !== "playing" || busyRef.current) return;
      if (held.current) {
        if (performance.now() >= nextRepeat.current) {
          step(held.current);
          nextRepeat.current = performance.now() + 185;
        }
      } else {
        const next = path.current.shift();
        if (next) send({ type: "move", to: next });
        else setTarget((current) => (current ? null : current));
      }
    }, 185);
    return () => clearInterval(timer);
  }, [step, send]);
  useEffect(() => {
    if (game.phase !== "playing") return;
    const timer = setInterval(() => rawDispatch({ type: "tick" }), 1000);
    return () => clearInterval(timer);
  }, [game.phase]);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        (e.target instanceof HTMLElement &&
          e.target.matches("input,textarea,select"))
      )
        return;
      if (
        e.code === "Escape" &&
        ["playing", "paused"].includes(state.current.phase)
      ) {
        e.preventDefault();
        if (!e.repeat) send({ type: "pause" });
        return;
      }
      if (state.current.phase !== "playing") return;
      if (DIRECTIONS[e.code]) {
        e.preventDefault();
        if (!e.repeat) {
          stop();
          held.current = e.code;
          nextRepeat.current = performance.now() + 185;
          step(e.code);
        }
      }
      if (e.code === "KeyE" && !e.repeat) {
        e.preventDefault();
        stop();
        const command = commands(state.current)[0];
        if (command) send({ type: "interact", id: command.id });
      }
    };
    const up = (e: KeyboardEvent) => {
      if (held.current === e.code) held.current = null;
    };
    const blur = () => {
      stop();
    };
    const hide = () => {
      if (document.hidden && state.current.phase === "playing")
        send({ type: "pause" });
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", hide);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [send, step, stop]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(
    () => () => {
      if (busyTimer.current) clearTimeout(busyTimer.current);
      void audio.current?.close();
    },
    [],
  );
  useEffect(() => {
    if (game.phase !== "won") return;
    const candidate = { seconds: game.seconds, stamps: game.stamps.length };
    const old = readBest();
    if (
      !old ||
      candidate.stamps > old.stamps ||
      (candidate.stamps === old.stamps && candidate.seconds < old.seconds)
    ) {
      setBest(candidate);
      try {
        localStorage.setItem(
          "clockwork-courier.best.v1",
          JSON.stringify(candidate),
        );
      } catch {
        /* Optional best-run storage. */
      }
    }
  }, [game.phase, game.seconds, game.stamps.length]);
  const ready = useCallback(() => setLoaded(true), []);
  const toggleSound = () => {
    const enabled = !soundRef.current;
    soundRef.current = enabled;
    setSound(enabled);
    if (!enabled) return;
    try {
      audio.current ??= new AudioContext();
      void audio.current
        .resume()
        .then(() => {
          if (soundRef.current) chime("action");
        })
        .catch(() => {
          soundRef.current = false;
          setSound(false);
        });
    } catch {
      soundRef.current = false;
      setSound(false);
    }
  };
  const start = () => {
    setView("follow");
    send({ type: "start" });
  };
  const currentCommands = commands(game),
    primary = currentCommands[0],
    secondary = currentCommands[1];
  const [title, hint, chapter] = objective(game);
  const playing = game.phase === "playing" || game.phase === "paused";
  return (
    <section
      className={`courier courier--${game.phase}`}
      aria-label="Clockwork Courier game"
    >
      <header className="courier-header">
        <div className="courier-identity">
          <span className="courier-emblem">
            <Icon name="parcel" />
          </span>
          <div>
            <p className="courier-eyebrow">
              A SKYMAIL ADVENTURE <span>№ 005</span>
            </p>
            <h1>
              Clockwork Courier<span>.</span>
            </h1>
          </div>
        </div>
        <div className="courier-header-actions">
          <div
            className="courier-stamps"
            aria-label={`${game.stamps.length} of 3 stamps collected`}
          >
            <Icon name="stamp" />
            <span>
              {game.stamps.length}
              <i>/ 3</i>
            </span>
          </div>
          <button
            type="button"
            className="courier-icon-button"
            aria-label={sound ? "Mute sound" : "Enable sound"}
            aria-pressed={sound}
            onClick={toggleSound}
          >
            <Icon name={sound ? "sound" : "mute"} />
          </button>
          {playing && (
            <button
              type="button"
              className="courier-icon-button"
              aria-label={
                game.phase === "paused" ? "Resume delivery" : "Pause delivery"
              }
              onClick={() => send({ type: "pause" })}
            >
              <Icon name={game.phase === "paused" ? "play" : "pause"} />
            </button>
          )}
        </div>
      </header>
      <div className="courier-content">
        <aside className="courier-sidebar">
          {game.phase === "ready" ? (
            <div className="courier-intro">
              <p className="courier-eyebrow courier-orange">SPECIAL DELIVERY</p>
              <h2>
                Small steps.
                <br />
                <em>Bright skies.</em>
              </h2>
              <p className="courier-story">
                The lighthouse has gone quiet.
                <br />
                One little robot. One energy core.
                <br />A whole sky counting on you.
              </p>
              <div className="courier-mail-ticket">
                <span>
                  FROM
                  <br />
                  <strong>The post office</strong>
                </span>
                <Icon name="arrow" />
                <span>
                  TO
                  <br />
                  <strong>A brighter sky</strong>
                </span>
              </div>
              <button
                type="button"
                className="courier-primary"
                disabled={!loaded}
                onClick={start}
              >
                {loaded ? "Begin delivery" : "Preparing your world…"}
                <Icon name="arrow" />
              </button>
              <p className="courier-small">
                Three little puzzles. Take your time.
              </p>
              <div className="courier-intro-guide">
                <span>
                  <b>01</b> Carry the core
                </span>
                <span>
                  <b>02</b> Wake the machines
                </span>
                <span>
                  <b>03</b> Bring back the light
                </span>
              </div>
              {best && (
                <p className="courier-best">
                  Your best · {best.stamps}/3 stamps ·{" "}
                  {formatTime(best.seconds)}
                </p>
              )}
            </div>
          ) : game.phase === "won" ? (
            <div className="courier-receipt">
              <span className="courier-delivered-seal">
                <Icon name="check" />
                DELIVERED
              </span>
              <p className="courier-eyebrow courier-orange">
                THE SKY SAYS THANK YOU
              </p>
              <h2>
                A little light.
                <br />
                <em>A long way.</em>
              </h2>
              <p>
                The lighthouse is awake again.
                <br />
                Nice work, little courier.
              </p>
              <dl>
                <div>
                  <dt>Journey time</dt>
                  <dd>{formatTime(game.seconds)}</dd>
                </div>
                <div>
                  <dt>Little steps</dt>
                  <dd>{game.steps}</dd>
                </div>
                <div>
                  <dt>Stamps found</dt>
                  <dd>{game.stamps.length} / 3</dd>
                </div>
                <div>
                  <dt>Checkpoint returns</dt>
                  <dd>{game.recoveries}</dd>
                </div>
              </dl>
              <p className="courier-small">
                {game.stamps.length === 3
                  ? "Every stamp, every stop. A first-class delivery."
                  : "There are still stamps in the clouds. Try the scenic route."}
              </p>
              <button
                type="button"
                className="courier-primary"
                onClick={() => send({ type: "reset" })}
              >
                Another delivery
                <Icon name="reset" />
              </button>
            </div>
          ) : (
            <div className="courier-mission">
              <p className="courier-eyebrow courier-orange">
                YOUR DELIVERY ROUTE
              </p>
              <ol className="courier-chapters">
                {CHAPTERS.map((name, i) => (
                  <li
                    key={name}
                    className={
                      i === chapter
                        ? "is-current"
                        : i < chapter
                          ? "is-complete"
                          : ""
                    }
                    aria-current={i === chapter ? "step" : undefined}
                  >
                    <span>
                      {i < chapter ? <Icon name="check" /> : `0${i + 1}`}
                    </span>
                    <span>{name}</span>
                  </li>
                ))}
              </ol>
              <div className="courier-objective">
                <p className="courier-eyebrow">NEXT LITTLE STEP</p>
                <h2>{title}</h2>
                <p>{hint}</p>
              </div>
              <div
                className={`courier-cargo ${game.core === "carried" ? "has-cargo" : ""}`}
              >
                <Icon name="parcel" />
                <div>
                  <span>PRECIOUS CARGO</span>
                  <strong>
                    {game.core === "carried"
                      ? "Core on board"
                      : game.core === "ground"
                        ? "Awaiting collection"
                        : `Powering the ${game.core}`}
                  </strong>
                </div>
                <i />
              </div>
              <details className="courier-help">
                <summary>A little guidance</summary>
                <p>
                  Click or tap a walkway to move. Use the action button near a
                  socket or lever. On a keyboard, use WASD or arrows, then E.
                </p>
                <p>
                  Leave the core in a machine, cross over and lock its bridge,
                  then return for the core. The lift holds its height without
                  power.
                </p>
                <p>
                  Collect three floating stamps before your final delivery.
                  There is no time limit.
                </p>
              </details>
              <button
                type="button"
                className="courier-text-button"
                disabled={game.phase === "paused" || busy}
                onClick={() => send({ type: "recover" })}
              >
                <Icon name="reset" />
                Return to checkpoint
              </button>
            </div>
          )}
        </aside>
        <div
          className="courier-stage"
          aria-label="Floating mechanical islands. Click walkways to move your courier."
        >
          <div className="courier-sky-lines" aria-hidden="true">
            <span>UP IN THE CLOUDS</span>
            <i />
            <span>EST. 1925</span>
          </div>
          <CourierScene
            game={game}
            view={view}
            reduced={reduced}
            target={target}
            onWalk={walk}
            onReady={ready}
          />
          {!loaded && (
            <div className="courier-loading" role="status">
              <span />
              <p>Unpacking a small world…</p>
            </div>
          )}
          <div className="courier-view-controls" aria-label="Camera view">
            <button
              type="button"
              disabled={game.phase === "paused"}
              aria-pressed={!playing || view === "map"}
              onClick={() => setView("map")}
            >
              <Icon name="map" />
              Island map
            </button>
            <button
              type="button"
              disabled={!playing || game.phase === "paused"}
              aria-pressed={view === "follow" && playing}
              onClick={() => setView("follow")}
            >
              <Icon name="focus" />
              Follow Pip
            </button>
          </div>
          {game.phase === "playing" && (
            <p className="courier-feedback" role="status" aria-live="polite">
              {game.message}
            </p>
          )}
          <div className="courier-world-caption" aria-hidden="true">
            <span>THE CLOUDLINE ISLES</span>
            <span>✦</span>
            <span>A SMALL WORLD, HANDCRAFTED</span>
          </div>
          {game.phase === "paused" && (
            <div
              className="courier-pause"
              role="region"
              aria-label="Delivery paused"
            >
              <div>
                <span className="courier-eyebrow">OFF THE CLOCK</span>
                <h2>Take a breather.</h2>
                <p>Your parcel is in safe hands.</p>
                <button
                  type="button"
                  className="courier-primary"
                  onClick={() => send({ type: "pause" })}
                >
                  Keep going
                  <Icon name="play" />
                </button>
                <button
                  type="button"
                  className="courier-text-button"
                  onClick={() => send({ type: "reset" })}
                >
                  Start a new delivery
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {playing ? (
        <footer className="courier-controls">
          <div className="courier-travel-stats">
            <span>
              ON THE CLOCK <b>{formatTime(game.seconds)}</b>
            </span>
            <span>
              LITTLE STEPS <b>{String(game.steps).padStart(3, "0")}</b>
            </span>
          </div>
          <div className="courier-move">
            <div
              className="courier-dpad"
              role="group"
              aria-label="Move the courier"
            >
              {(
                [
                  ["ArrowUp", "↗", "Move north"],
                  ["ArrowLeft", "↖", "Move west"],
                  ["ArrowDown", "↙", "Move south"],
                  ["ArrowRight", "↘", "Move east"],
                ] as const
              ).map(([code, arrow, label]) => (
                <button
                  key={code}
                  type="button"
                  className={`courier-dir courier-dir--${code}`}
                  aria-label={label}
                  disabled={game.phase !== "playing" || busy}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    stop();
                    held.current = code;
                    nextRepeat.current = performance.now() + 185;
                    step(code);
                  }}
                  onPointerUp={() => {
                    held.current = null;
                  }}
                  onPointerCancel={() => {
                    held.current = null;
                  }}
                  onLostPointerCapture={() => {
                    held.current = null;
                  }}
                  onClick={(e) => {
                    if (e.detail === 0) step(code);
                  }}
                >
                  {arrow}
                </button>
              ))}
            </div>
            <span>
              WASD / ARROWS
              <br />
              <small>or click a walkway</small>
            </span>
          </div>
          <div className="courier-action-area">
            <button
              type="button"
              className="courier-primary courier-interact"
              disabled={!primary || busy}
              onClick={() => {
                stop();
                if (primary) send({ type: "interact", id: primary.id });
              }}
            >
              <kbd>E</kbd>
              <span>
                {busy
                  ? "Lift in motion…"
                  : (primary?.label ?? "Move near a mechanism")}
              </span>
              <Icon name={primary?.id === "deliver" ? "sun" : "arrow"} />
            </button>
            {secondary && (
              <button
                type="button"
                disabled={busy}
                className="courier-secondary-action"
                onClick={() => {
                  stop();
                  send({ type: "interact", id: secondary.id });
                }}
              >
                {secondary.label}
              </button>
            )}
          </div>
        </footer>
      ) : (
        <footer className="courier-footer">
          <span>
            <i />A quiet adventure above the clouds
          </span>
          <span>BLENDER × THREE.JS</span>
          <span>MADE TO BE PLAYED</span>
        </footer>
      )}
    </section>
  );
}
