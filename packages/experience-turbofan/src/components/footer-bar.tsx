import { useSimulation } from "../state/simulation";

function formatElapsed(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

const PHASE_LABEL = {
  stopped: "SIMULATION STOPPED",
  running: "SIMULATION RUNNING",
  paused: "SIMULATION PAUSED",
} as const;

const STATUS_LABEL = {
  stopped: { text: "STANDBY (Gray)", color: "#a29d93" },
  running: { text: "OPTIMAL (Green)", color: "#67c58b" },
  paused: { text: "HOLD (Amber)", color: "#fbbf24" },
} as const;

export function FooterBar() {
  const { phase, elapsedSeconds } = useSimulation();
  const status = STATUS_LABEL[phase];

  return (
    <footer className="footer-bar">
      <span className="footer-bar__status">
        <span className={`footer-bar__dot footer-bar__dot--${phase}`} />
        <span>{PHASE_LABEL[phase]}</span>
      </span>
      <span className="footer-bar__divider">|</span>
      <span>Elapsed: {formatElapsed(elapsedSeconds)}</span>
      <span className="footer-bar__divider">|</span>
      <span>42 sensors</span>
      <span className="footer-bar__divider">|</span>
      <span>
        Status: <span style={{ color: status.color, fontWeight: 700 }}>{status.text}</span>
      </span>
    </footer>
  );
}
