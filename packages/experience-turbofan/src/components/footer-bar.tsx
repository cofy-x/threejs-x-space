import { useSimulation } from "../state/simulation";

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function FooterBar() {
  const { elapsedSeconds } = useSimulation();

  return (
    <footer className="footer-bar">
      <span>Interactive engineering study</span>
      <span className="footer-bar__time">Simulation time <strong>{formatElapsed(elapsedSeconds)}</strong></span>
      <span className="footer-bar__credit">Air in. Motion out.</span>
    </footer>
  );
}
