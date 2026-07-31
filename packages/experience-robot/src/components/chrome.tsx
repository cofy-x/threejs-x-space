import { useAssembly } from "../state/assembly";

export function Header() {
  return (
    <header className="robot-header">
      <p className="robot-header__kicker">Assembly lab · No. 04</p>
      <h1 className="robot-header__title">Retro Box Bot</h1>
      <p className="robot-header__premise">
        A desktop-computer robot you can pull apart to see how its assemblies connect.
      </p>
    </header>
  );
}

export function FooterBar() {
  const { selectedPartId, explodeAmount, playing, guided, step } = useAssembly();

  const status = playing
    ? "Assembling…"
    : guided
      ? `Guided assembly · step ${step}/8`
      : explodeAmount > 0.02
        ? `Exploded ${Math.round(explodeAmount * 100)}% · 8 assemblies`
        : "Assembled · 8/8 assemblies";

  return (
    <footer className="robot-footer">
      <span>{selectedPartId ? "Click empty space to deselect" : "Drag to orbit · scroll to zoom · click a part"}</span>
      <span className="robot-footer__status">{status}</span>
    </footer>
  );
}
