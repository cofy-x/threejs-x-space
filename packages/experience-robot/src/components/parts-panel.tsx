import { useAssembly } from "../state/assembly";
import { ASSEMBLY_ORDER, getPartInfos } from "./three/part-infos";

export function PartsPanel() {
  const {
    explodeAmount,
    setExplodeAmount,
    selectedPartId,
    setSelectedPartId,
    playing,
    playAssembly,
    guided,
    step,
    attachNext,
    detachLast,
  } = useAssembly();
  const infos = getPartInfos();
  const selected = selectedPartId ? infos[selectedPartId] : undefined;
  const nextPartId = guided && step < ASSEMBLY_ORDER.length ? ASSEMBLY_ORDER[step] : undefined;
  const nextPart = nextPartId ? infos[nextPartId] : undefined;

  return (
    <aside className="parts-panel">
      <button
        type="button"
        className="parts-panel__play"
        onClick={playAssembly}
        disabled={playing}
      >
        {playing ? "Assembling…" : "Play assembly"}
      </button>

      <div className="parts-panel__guided">
        <div className="parts-panel__dots" role="presentation">
          {ASSEMBLY_ORDER.map((id, index) => (
            <span
              key={id}
              className={
                index < step
                  ? "parts-panel__dot parts-panel__dot--done"
                  : "parts-panel__dot"
              }
            />
          ))}
        </div>
        <div className="parts-panel__step-controls">
          <button
            type="button"
            className="parts-panel__step-btn"
            onClick={detachLast}
            disabled={playing || step <= 0}
          >
            − Detach
          </button>
          <button
            type="button"
            className="parts-panel__step-btn parts-panel__step-btn--primary"
            onClick={attachNext}
            disabled={playing || step >= ASSEMBLY_ORDER.length}
          >
            + Attach
          </button>
        </div>
        <p className="parts-panel__step-hint" aria-live="polite">
          {playing
            ? "Assembling all parts…"
            : nextPart
              ? `Next: ${nextPart.title} (${step}/${ASSEMBLY_ORDER.length})`
              : guided
                ? "Fully assembled — detach to take it apart"
                : "Free explode mode"}
        </p>
      </div>

      <div className="parts-panel__control">
        <label htmlFor="explode-slider" className="parts-panel__label">
          Explode view
        </label>
        <input
          id="explode-slider"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={explodeAmount}
          disabled={playing}
          onChange={(event) => setExplodeAmount(Number(event.target.value))}
        />
      </div>

      <div className="parts-panel__list" role="list">
        {Object.values(infos).map((info, index) => (
          <button
            key={info.id}
            type="button"
            role="listitem"
            className={
              info.id === selectedPartId
                ? "parts-panel__item parts-panel__item--active"
                : "parts-panel__item"
            }
            onClick={() => setSelectedPartId(info.id === selectedPartId ? null : info.id)}
          >
            <span className="parts-panel__item-index">{String(index + 1).padStart(2, "0")}</span>
            {info.title}
          </button>
        ))}
      </div>

      <div className="parts-panel__info" aria-live="polite">
        {selected ? (
          <>
            <h2 className="parts-panel__info-title">{selected.title}</h2>
            <p className="parts-panel__info-body">{selected.summary}</p>
            {selected.specs && (
              <dl className="parts-panel__specs">
                {selected.specs.map((spec) => (
                  <div key={spec.label} className="parts-panel__spec-row">
                    <dt>{spec.label}</dt>
                    <dd>{spec.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </>
        ) : (
          <p className="parts-panel__info-hint">
            Select an assembly from the list or click it on the robot to learn what it does.
          </p>
        )}
      </div>
    </aside>
  );
}
