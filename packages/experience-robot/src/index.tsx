import { useState } from "react";
import type { Dispatch, ReactNode } from "react";
import { LabScene } from "./components/lab-scene";
import { SYSTEMS, procedureProgress, statusMessage } from "./state/lab";
import type { LabAction, LabMode, LabState } from "./state/lab";
import { useLab, useMediaQuery } from "./state/use-lab";
import "./styles.css";

type IconName =
  | "power"
  | "vision"
  | "motion"
  | "overview"
  | "systems"
  | "exploded"
  | "reset"
  | "pause"
  | "play"
  | "check"
  | "arrow"
  | "camera";

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    power: <path d="M12 3v8M7 5.8a8 8 0 1 0 10 0" />,
    vision: (
      <>
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
        <circle cx="12" cy="12" r="2.8" />
      </>
    ),
    motion: (
      <>
        <circle cx="6" cy="17" r="3" />
        <circle cx="18" cy="6" r="3" />
        <path d="m8 15 8-7M3 9V3h6m12 12v6h-6" />
      </>
    ),
    overview: (
      <>
        <circle cx="12" cy="12" r="8" />
        <ellipse cx="12" cy="12" rx="4" ry="8" />
        <path d="M4 12h16" />
      </>
    ),
    systems: (
      <>
        <path d="M4 6h16M4 12h16M4 18h16" />
        <circle cx="8" cy="6" r="2" />
        <circle cx="16" cy="12" r="2" />
        <circle cx="10" cy="18" r="2" />
      </>
    ),
    exploded: (
      <>
        <path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5" />
      </>
    ),
    reset: <path d="M4 10a8 8 0 1 1 1 7M4 4v6h6" />,
    pause: <path d="M8 5v14M16 5v14" />,
    play: <path d="m8 4 12 8-12 8V4Z" />,
    check: <path d="m5 12 4 4L19 6" />,
    arrow: <path d="M4 12h15m-6-6 6 6-6 6" />,
    camera: (
      <>
        <path d="M8 4H4v4m12-4h4v4M4 16v4h4m12-4v4h-4" />
        <circle cx="12" cy="12" r="4" />
      </>
    ),
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

function Command({
  state,
  dispatch,
}: {
  state: LabState;
  dispatch: Dispatch<LabAction>;
}) {
  const selected =
    SYSTEMS.find((system) => system.id === state.selection) ?? SYSTEMS[0];
  const progress = procedureProgress(state.procedure);
  if (state.procedure)
    return (
      <div className="aster-command">
        <div className="aster-progress-label">
          <span>
            {state.paused
              ? "Sequence paused"
              : state.procedure.kind === "boot"
                ? "Initializing"
                : "Calibration in progress"}
          </span>
          <span>{Math.round(progress * 100)}%</span>
        </div>
        <div
          className="aster-progress"
          role="progressbar"
          aria-label={
            state.procedure.kind === "boot" ? "Initialization" : "Calibration"
          }
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
        >
          <span style={{ width: `${progress * 100}%` }} />
        </div>
        <button
          type="button"
          className="aster-text-button"
          onClick={() => dispatch({ type: "cancel" })}
        >
          Cancel sequence
        </button>
      </div>
    );
  if (state.mode === "exploded")
    return (
      <div className="aster-command">
        <label className="aster-range-label" htmlFor="aster-separation">
          <span>Assembly separation</span>
          <span>{Math.round(state.separation * 100)}%</span>
        </label>
        <input
          id="aster-separation"
          className="aster-range"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={state.separation}
          onChange={(event) =>
            dispatch({ type: "separate", amount: Number(event.target.value) })
          }
        />
        <button
          type="button"
          className="aster-secondary"
          onClick={() => dispatch({ type: "mode", mode: "overview" })}
        >
          Reassemble unit
          <Icon name="arrow" />
        </button>
      </div>
    );
  if (state.power === "standby")
    return (
      <div className="aster-command">
        <button
          type="button"
          className="aster-primary"
          onClick={() => dispatch({ type: "boot" })}
        >
          <Icon name="power" />
          <span>Initialize Aster</span>
          <Icon name="arrow" />
        </button>
        <p>Start the unit. Discover what makes it move.</p>
      </div>
    );
  if (state.mode === "systems")
    return (
      <div className="aster-command">
        <button
          type="button"
          className="aster-primary"
          onClick={() => dispatch({ type: "calibrate", system: selected.id })}
        >
          <Icon name={selected.id} />
          <span>
            {state.calibrated.includes(selected.id)
              ? "Run check again"
              : selected.test}
          </span>
          <Icon name="arrow" />
        </button>
        <p>A simulated diagnostic, made visible.</p>
      </div>
    );
  return (
    <div className="aster-command">
      <button
        type="button"
        className="aster-primary"
        onClick={() => dispatch({ type: "mode", mode: "systems" })}
      >
        <Icon name="systems" />
        <span>
          {state.calibrated.length === 3
            ? "Explore the systems"
            : "Begin calibration"}
        </span>
        <Icon name="arrow" />
      </button>
      <p>
        {state.calibrated.length === 3
          ? "Every system checked. Ready for the unknown."
          : "Three systems. One capable little explorer."}
      </p>
    </div>
  );
}

function Inspector({
  state,
  dispatch,
  compact,
}: {
  state: LabState;
  dispatch: Dispatch<LabAction>;
  compact: boolean;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const selected =
    SYSTEMS.find((system) => system.id === state.selection) ?? SYSTEMS[0];
  const ready = state.calibrated.length === SYSTEMS.length;
  return (
    <aside
      className={`aster-inspector aster-inspector--${state.mode}`}
      aria-label="Robot controls"
    >
      {state.mode === "overview" && (
        <div className="aster-overview-copy">
          <p className="aster-eyebrow">
            {ready
              ? "Commissioning complete"
              : "Your next expedition starts here"}
          </p>
          <h2>
            {ready ? (
              <>
                Ready for
                <br />
                the unknown.
              </>
            ) : (
              <>
                A little curiosity.
                <br />A lot of capability.
              </>
            )}
          </h2>
          <p>
            Meet your field companion. Bring Aster online, get to know its
            systems, and prepare it for the world beyond the bay.
          </p>
          <dl className="aster-specs">
            <div>
              <dt>Unit</dt>
              <dd>AST–04</dd>
            </div>
            <div>
              <dt>Class</dt>
              <dd>Field robotics</dd>
            </div>
            <div>
              <dt>Systems checked</dt>
              <dd>{String(state.calibrated.length).padStart(2, "0")} / 03</dd>
            </div>
          </dl>
        </div>
      )}
      {state.mode === "systems" && (
        <>
          <p className="aster-eyebrow">
            System diagnostics <span>{state.calibrated.length} / 3</span>
          </p>
          <div
            className="aster-system-list"
            role="group"
            aria-label="Select a system"
          >
            {SYSTEMS.map((system) => (
              <button
                key={system.id}
                type="button"
                disabled={Boolean(state.procedure)}
                aria-pressed={state.selection === system.id}
                onClick={() => dispatch({ type: "select", system: system.id })}
              >
                <Icon name={system.id} />
                <span>{system.shortName}</span>
                {state.calibrated.includes(system.id) ? (
                  <Icon name="check" />
                ) : (
                  <span className="aster-system-number">{system.number}</span>
                )}
              </button>
            ))}
          </div>
          <div className="aster-system-detail">
            <div className="aster-system-title">
              <span>{selected.number}</span>
              <h2>{selected.name}</h2>
              {state.calibrated.includes(selected.id) && (
                <span className="aster-checked" aria-label="Calibrated">
                  <Icon name="check" />
                </span>
              )}
            </div>
            <div
              className="aster-system-description"
              id="aster-system-description"
              hidden={compact && !detailsOpen}
            >
              <p className="aster-system-subtitle">{selected.subtitle}</p>
              <p>{selected.description}</p>
              <small>{selected.specification}</small>
            </div>
          </div>
        </>
      )}
      {state.mode === "exploded" && (
        <div className="aster-exploded-copy">
          <p className="aster-eyebrow">Under the surface</p>
          <h2>
            Every part.
            <br />
            With a purpose.
          </h2>
          <p>
            Separate the ceramic armor to reveal the energy module and
            mechanical frame. Keep pulling to see how the major assemblies fit
            together.
          </p>
          <ol>
            <li>
              <span>01</span>Ceramic armor releases
            </li>
            <li>
              <span>02</span>Core assemblies separate
            </li>
            <li>
              <span>03</span>Orbit to explore every connection
            </li>
          </ol>
        </div>
      )}
      <Command state={state} dispatch={dispatch} />
      {compact && state.mode === "systems" && (
        <button
          type="button"
          className="aster-detail-toggle"
          aria-expanded={detailsOpen}
          aria-controls="aster-system-description"
          onClick={() => setDetailsOpen((open) => !open)}
        >
          {detailsOpen ? "Hide system details" : "How this system works"}
          <span aria-hidden="true">{detailsOpen ? "−" : "+"}</span>
        </button>
      )}
      <p className="aster-live-status" role="status" aria-live="polite">
        <span aria-hidden="true" />
        {statusMessage(state)}
      </p>
    </aside>
  );
}

const MODES: { mode: LabMode; name: string; number: string }[] = [
  { mode: "overview", name: "Observe", number: "01" },
  { mode: "systems", name: "Diagnose", number: "02" },
  { mode: "exploded", name: "Disassemble", number: "03" },
];

export function RobotExperience() {
  const { state, dispatch } = useLab();
  const compact = useMediaQuery("(max-width: 760px)");
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const ready = state.calibrated.length === SYSTEMS.length;
  return (
    <section
      className={`aster-lab aster-lab--${state.mode}`}
      aria-label="Aster robotics lab"
    >
      <header className="aster-heading">
        <p className="aster-eyebrow">
          <span className="aster-brand-mark" aria-hidden="true">
            ✳
          </span>{" "}
          FIELD ROBOTICS <span>/</span> BAY 04
        </p>
        <h1>
          ASTER<span>04</span>
        </h1>
        <p className="aster-tagline">Engineered to explore.</p>
      </header>
      <div
        className={`aster-unit-status ${state.power === "online" ? "is-online" : ""}`}
      >
        <span className="aster-status-dot" />
        <span>
          {state.procedure?.kind === "boot"
            ? "Initializing"
            : ready
              ? "Field-ready"
              : state.power === "online"
                ? "Unit online"
                : "Standby"}
        </span>
        <span className="aster-unit-id">AST–04</span>
      </div>
      <div className="aster-stage">
        <LabScene
          state={state}
          dispatch={dispatch}
          compact={compact}
          reducedMotion={reducedMotion}
        />
        <div className="aster-stage-caption" aria-hidden="true">
          <span>04 / AUTONOMOUS FIELD UNIT</span>
          <span>
            {state.mode === "exploded" ? "ASSEMBLY VIEW" : "COMMISSIONING BAY"}
          </span>
        </div>
        <div className="aster-tools" role="group" aria-label="Scene controls">
          <button
            type="button"
            title="Reset camera"
            aria-label="Reset camera"
            onClick={() => dispatch({ type: "camera" })}
          >
            <Icon name="camera" />
          </button>
          <button
            type="button"
            title={state.paused ? "Resume motion" : "Pause motion"}
            aria-label={state.paused ? "Resume motion" : "Pause motion"}
            aria-pressed={state.paused}
            onClick={() => dispatch({ type: "pause" })}
          >
            <Icon name={state.paused ? "play" : "pause"} />
          </button>
          <button
            type="button"
            title="Reset unit"
            aria-label="Reset unit"
            onClick={() => dispatch({ type: "reset" })}
          >
            <Icon name="reset" />
          </button>
        </div>
      </div>
      <nav className="aster-modes" aria-label="Lab mode">
        {MODES.map(({ mode, name, number }) => (
          <button
            key={mode}
            type="button"
            aria-pressed={state.mode === mode}
            disabled={Boolean(state.procedure)}
            onClick={() => dispatch({ type: "mode", mode })}
          >
            <span className="aster-mode-number">{number}</span>
            <Icon name={mode} />
            <span>{name}</span>
          </button>
        ))}
      </nav>
      <Inspector state={state} dispatch={dispatch} compact={compact} />
      <footer className="aster-footer">
        <span>
          <span className="aster-input-symbol" aria-hidden="true">
            ↔
          </span>
          {compact
            ? "Drag sideways to orbit · Swipe up to explore"
            : "Drag to orbit · Scroll to zoom · Select a component"}
        </span>
        <span>AN INTERACTIVE ROBOTICS STUDY</span>
      </footer>
    </section>
  );
}
