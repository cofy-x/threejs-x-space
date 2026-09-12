import { useId } from "react";
import { useSimulation, type HistorySample } from "../state/simulation";

function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function ThrustTrace({ history }: { history: HistorySample[] }) {
  const gradientId = useId();
  const samples = history.slice(-120);
  const end = samples.at(-1)?.t ?? 0;
  const start = Math.max(0, end - 30);
  const points = samples.map((sample): [number, number] => [
    2 + ((sample.t - start) / 30) * 234,
    58 - (sample.thrust / 40000) * 52,
  ]);
  const line = points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const lastPoint = points.at(-1);
  const firstPoint = points[0];

  return (
    <div className="thrust-trace">
      <div className="right-panel__section-heading">
        <h3>Thrust trace</h3>
        <span>30 s window</span>
      </div>
      <svg
        viewBox="0 0 240 64"
        className="thrust-trace__plot"
        role="img"
        aria-label={history.length ? "Simulated thrust history over the last 30 seconds" : "Thrust history will appear when the engine starts"}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#efa968" stopOpacity="0.19" />
            <stop offset="100%" stopColor="#efa968" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[6, 32, 58].map((y) => (
          <line key={y} x1="2" x2="238" y1={y} y2={y} className="thrust-trace__grid" />
        ))}
        {firstPoint && lastPoint ? (
          <>
            <polygon points={`${firstPoint[0]},58 ${line} ${lastPoint[0]},58`} fill={`url(#${gradientId})`} />
            <polyline points={line} fill="none" stroke="#efa968" strokeWidth="1.6" strokeLinejoin="round" />
            <circle cx={lastPoint[0]} cy={lastPoint[1]} r="2.5" fill="#efa968" />
          </>
        ) : (
          <text x="120" y="34" textAnchor="middle" className="thrust-trace__empty">Awaiting ignition</text>
        )}
      </svg>
      <div className="thrust-trace__axis" aria-hidden="true">
        <span>{formatClock(start)}</span>
        <span>{formatClock(Math.max(30, end))}</span>
      </div>
    </div>
  );
}

function ActionIcon({ paused }: { paused: boolean }) {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
      {paused ? <path d="M5 3.5 12 8l-7 4.5Z" /> : <path d="M4 3h3v10H4zM9 3h3v10H9z" />}
    </svg>
  );
}

export function RightPanel() {
  const {
    phase,
    progress,
    values,
    history,
    casingVisible,
    airflowVisible,
    start,
    pause,
    reset,
    toggleCasing,
    toggleAirflow,
  } = useSimulation();

  const actionLabel = phase === "stopped" ? "Start engine" : phase === "paused" ? "Resume engine" : "Pause engine";

  return (
    <aside className="right-panel" aria-label="Engine controls and simulated telemetry">
      <div className="right-panel__controls">
        <div className="right-panel__section-heading">
          <h2>Engine control</h2>
          <span>01 — 05</span>
        </div>
        <div className="right-panel__actions">
          <button
            type="button"
            className={`engine-button engine-button--primary${phase === "running" ? " is-running" : ""}`}
            onClick={phase === "stopped" ? start : pause}
          >
            <ActionIcon paused={phase !== "running"} />
            {actionLabel}
          </button>
          <button type="button" className="engine-button engine-button--reset" onClick={reset} disabled={phase === "stopped"} aria-label="Reset engine simulation" title="Reset engine simulation">
            <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
              <path d="M4 7a6.5 6.5 0 1 1-.3 5M4 3v4h4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <p className="right-panel__control-note">
          {phase === "stopped" ? "Start a 12-second spool-up." : phase === "paused" ? "Motion and telemetry on hold." : progress < 1 ? "Spooling to steady state…" : "Steady state. Explore the flow."}
        </p>
        <div className="right-panel__toggles" aria-label="Scene layers">
          <button type="button" onClick={toggleCasing} aria-pressed={casingVisible}>
            <span className="layer-switch" aria-hidden="true" />
            Casing
          </button>
          <button type="button" onClick={toggleAirflow} aria-pressed={airflowVisible}>
            <span className="layer-switch" aria-hidden="true" />
            Airflow
          </button>
        </div>
      </div>

      <section className="right-panel__telemetry" aria-label="Simulated engine readings">
        <div className="right-panel__thrust">
          <div className="right-panel__section-heading">
            <h2>Simulated thrust</h2>
            <span className={`right-panel__live right-panel__live--${phase}`}>
              {phase === "running" ? "Live" : phase === "paused" ? "Hold" : "Idle"}
            </span>
          </div>
          <p><strong>{Math.round(values.thrust).toLocaleString("en-US")}</strong><span>lbf</span></p>
        </div>

        <dl className="engine-metrics">
          <div className="engine-metrics__spool">
            <dt><span>N1</span> Fan speed</dt>
            <dd>{Math.round(values.n1).toLocaleString("en-US")} <span>rpm</span></dd>
            <span className="engine-metrics__track" aria-hidden="true"><i style={{ width: `${Math.min(100, values.n1 / 130)}%` }} /></span>
          </div>
          <div className="engine-metrics__spool">
            <dt><span>N2</span> Core speed</dt>
            <dd>{Math.round(values.n2).toLocaleString("en-US")} <span>rpm</span></dd>
            <span className="engine-metrics__track" aria-hidden="true"><i style={{ width: `${Math.min(100, values.n2 / 130)}%` }} /></span>
          </div>
          <div className="engine-metrics__row">
            <dt>Turbine inlet</dt>
            <dd>{Math.round(values.tit).toLocaleString("en-US")} <span>°C</span></dd>
          </div>
          <div className="engine-metrics__row">
            <dt>Pressure ratio</dt>
            <dd>{values.pressureRatio.toFixed(1)} <span>: 1</span></dd>
          </div>
          <div className="engine-metrics__row">
            <dt>Fuel flow</dt>
            <dd>{values.fuelFlow.toFixed(1)} <span>kg/min</span></dd>
          </div>
        </dl>
        <ThrustTrace history={history} />
      </section>
      <p className="right-panel__disclaimer">An illustrative engine. All readings are simulated.</p>
    </aside>
  );
}
