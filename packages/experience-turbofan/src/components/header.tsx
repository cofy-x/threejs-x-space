import { useSimulation } from "../state/simulation";

const PHASE_PILL = {
  stopped: { text: "STANDBY", className: "app-header__pill--standby" },
  running: { text: "OPTIMAL", className: "app-header__pill--optimal" },
  paused: { text: "HOLD", className: "app-header__pill--hold" },
} as const;

export function Header() {
  const { phase } = useSimulation();
  const pill = PHASE_PILL[phase];

  return (
    <header className="app-header">
      <div className="app-header__brand">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="3" stroke="var(--tf-cobalt)" strokeWidth="1.5" />
          {Array.from({ length: 8 }, (_, i) => {
            const angle = (i / 8) * Math.PI * 2;
            const x1 = 12 + Math.cos(angle) * 5;
            const y1 = 12 + Math.sin(angle) * 5;
            const x2 = 12 + Math.cos(angle) * 10;
            const y2 = 12 + Math.sin(angle) * 10;
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="var(--tf-cobalt)"
                strokeWidth="1.5"
              />
            );
          })}
          <circle cx="12" cy="12" r="10.5" stroke="var(--tf-line-strong)" strokeWidth="1" />
        </svg>
        <div>
          <p>Experiment 01 · Aerospace</p>
          <h1>Turbofan Airflow</h1>
        </div>
      </div>
      <div className="app-header__controls">
        <span className={`app-header__pill ${pill.className}`} role="status" aria-live="polite">
          {pill.text}
        </span>
        <span className="app-header__status-label">Interactive cutaway · 42 live sensors</span>
      </div>
    </header>
  );
}
