export function TurbofanPreview() {
  return (
    <div className="engine-plate" aria-hidden="true">
      <div className="engine-plate__label">
        <span>Live preview</span>
        <span>Cutaway / airflow</span>
      </div>
      <svg viewBox="0 0 760 430">
        <defs>
          <linearGradient id="engine-shell" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f8f6f0" />
            <stop offset="0.5" stopColor="#aeb8c8" />
            <stop offset="1" stopColor="#667387" />
          </linearGradient>
          <linearGradient id="engine-core" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#6b7787" />
            <stop offset="0.65" stopColor="#303b4b" />
            <stop offset="1" stopColor="#d65a31" />
          </linearGradient>
          <filter id="soft-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g className="engine-plate__grid" opacity="0.25">
          {Array.from({ length: 14 }, (_, index) => (
            <line key={`v-${index}`} x1={50 + index * 50} y1="35" x2={50 + index * 50} y2="395" />
          ))}
          {Array.from({ length: 7 }, (_, index) => (
            <line key={`h-${index}`} x1="30" y1={65 + index * 50} x2="730" y2={65 + index * 50} />
          ))}
        </g>
        <line className="engine-plate__axis" x1="72" y1="220" x2="700" y2="220" />
        <g className="engine-plate__engine">
          <path
            d="M150 144C260 114 480 128 632 174L686 220 632 266C480 312 260 326 150 296Z"
            fill="url(#engine-shell)"
            opacity="0.96"
          />
          <path d="M175 174C300 156 496 166 624 192L654 220 624 248C496 274 300 284 175 266Z" fill="#141b26" />
          <path d="M226 190H596L630 220 596 250H226Z" fill="url(#engine-core)" />
          <ellipse cx="166" cy="220" rx="50" ry="96" fill="#dfe5ed" stroke="#5e6b7c" strokeWidth="5" />
          <ellipse cx="166" cy="220" rx="28" ry="78" fill="#1f2937" />
          <circle cx="166" cy="220" r="14" fill="#d65a31" />
          {Array.from({ length: 12 }, (_, index) => {
            const angle = (index / 12) * Math.PI * 2;
            const x = 166 + Math.cos(angle) * 45;
            const y = 220 + Math.sin(angle) * 74;
            return <line key={index} x1="166" y1="220" x2={x} y2={y} stroke="#7f8da0" strokeWidth="7" />;
          })}
          {[280, 320, 360, 400, 440].map((x, index) => (
            <path
              key={x}
              d={`M${x} 178l${18 + index * 2} 42-${18 + index * 2} 42`}
              fill="none"
              stroke="#c8d0dc"
              strokeWidth="12"
            />
          ))}
          <path d="M462 182h74l34 38-34 38h-74l28-38Z" fill="#d65a31" opacity="0.88" />
          <path d="M622 188l84 32-84 32 22-32Z" fill="#8491a2" />
        </g>
        <g className="engine-plate__flow engine-plate__flow--cool" filter="url(#soft-glow)">
          <path d="M36 194C190 194 300 202 454 206" />
          <path d="M36 220C210 220 370 220 680 220" />
          <path d="M36 246C190 246 300 238 454 234" />
        </g>
        <g className="engine-plate__flow engine-plate__flow--hot" filter="url(#soft-glow)">
          <path d="M454 206C540 206 606 210 716 216" />
          <path d="M454 234C540 234 606 230 716 224" />
        </g>
        <g className="engine-plate__callout">
          <path d="M166 112V74H96" />
          <text x="96" y="61">01 / FAN</text>
          <path d="M384 166V98H445" />
          <text x="454" y="102">02 / CORE</text>
          <path d="M558 270v62h72" />
          <text x="640" y="337">03 / EXHAUST</text>
        </g>
      </svg>
      <p className="engine-plate__caption">Fig. 01 — Five stages, one continuous flow.</p>
    </div>
  );
}
