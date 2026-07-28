export function LivingInkPreview() {
  return (
    <div className="ink-plate" aria-hidden="true">
      <div className="ink-plate__label">
        <span>Live canvas</span>
        <span>Gesture / pigment</span>
      </div>
      <svg viewBox="0 0 760 430">
        <defs>
          <filter id="ink-soften" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence baseFrequency="0.012 0.026" numOctaves="2" seed="8" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="14" />
            <feGaussianBlur stdDeviation="0.7" />
          </filter>
          <linearGradient id="ink-indigo" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#263b70" stopOpacity="0.86" />
            <stop offset="1" stopColor="#5576a8" stopOpacity="0.28" />
          </linearGradient>
          <linearGradient id="ink-saffron" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#d59a38" stopOpacity="0.28" />
            <stop offset="1" stopColor="#d59a38" stopOpacity="0.82" />
          </linearGradient>
        </defs>
        <rect x="20" y="20" width="720" height="390" rx="3" fill="#f3ebdd" />
        <g className="ink-plate__fibers" opacity="0.18">
          {Array.from({ length: 18 }, (_, index) => (
            <path key={index} d={`M38 ${44 + index * 19}C220 ${37 + index * 20} 516 ${55 + index * 18} 722 ${42 + index * 19}`} />
          ))}
        </g>
        <g className="ink-plate__currents" filter="url(#ink-soften)">
          <path
            className="ink-plate__current ink-plate__current--indigo"
            d="M76 286C150 124 266 116 354 220S548 350 692 148"
          />
          <path
            className="ink-plate__current ink-plate__current--saffron"
            d="M58 264C202 356 278 282 346 186S526 88 704 218"
          />
          <path
            className="ink-plate__current ink-plate__current--madder"
            d="M112 120C222 162 232 314 398 286S574 118 676 112"
          />
        </g>
        <g className="ink-plate__blooms">
          <circle cx="212" cy="210" r="44" fill="url(#ink-indigo)" />
          <circle cx="466" cy="206" r="54" fill="url(#ink-saffron)" />
          <circle cx="548" cy="270" r="31" fill="#b65349" fillOpacity="0.34" />
        </g>
        <text x="52" y="378">TOUCH · GUIDE · LET THE CURRENT SETTLE</text>
      </svg>
      <p className="ink-plate__caption">Fig. 03 — Pigment that remembers how you moved.</p>
    </div>
  );
}
