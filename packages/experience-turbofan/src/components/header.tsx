import { useSimulation } from "../state/simulation";

const PHASE_LABEL = {
  stopped: "Ready to start",
  running: "Engine running",
  paused: "Simulation paused",
} as const;

export function Header() {
  const { phase } = useSimulation();

  return (
    <header className="app-header">
      <div className="app-header__brand">
        <p className="app-header__eyebrow">Propulsion study <span>/</span> 01</p>
        <h1>Inside the turbofan<span>.</span></h1>
      </div>
      <div className="app-header__intro">
        <p>Follow the air. Reveal the machinery.</p>
        <span className={`app-header__status app-header__status--${phase}`} role="status">
          <span aria-hidden="true" />
          {PHASE_LABEL[phase]}
        </span>
      </div>
    </header>
  );
}
