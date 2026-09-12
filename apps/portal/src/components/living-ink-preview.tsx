const currents = [
  {
    name: "indigo",
    color: "#233751",
    width: 25,
    path: (offset: number) => `M75 ${273 + offset * 0.12}
      C159 ${310 + offset} ${235 + offset * 0.3} ${208 + offset} 314 ${193 + offset * 0.8}
      C396 ${166 + offset} 480 ${232 + offset * 0.7} ${551 + offset * 0.8} ${177 + offset * 0.4}
      C${627 + offset} ${115 - offset * 0.2} ${565 + offset * 0.5} ${50 - offset} 503 ${75 - offset}
      C${442 - offset} ${98 - offset} ${434 - offset} 166 ${468 - offset * 0.8} ${220 + offset * 0.5}
      C515 ${291 + offset} 602 ${283 + offset * 0.8} 683 ${222 + offset * 0.05}`,
  },
  {
    name: "vermilion",
    color: "#bb503e",
    width: 19,
    path: (offset: number) => `M92 ${145 + offset * 0.1}
      C174 ${132 + offset} ${235 + offset} ${164 + offset * 0.3} ${226 + offset} 235
      C${205 + offset} ${304 + offset} 296 ${336 + offset} ${367 + offset * 0.5} ${293 + offset}
      C${425 + offset} 257 ${405 + offset} ${210 - offset * 0.3} 359 ${186 - offset}
      C${311 - offset} ${160 - offset * 0.3} ${314 - offset} ${109 - offset} 353 ${100 - offset}
      C416 ${88 - offset} 474 ${174 + offset * 0.8} 610 ${156 + offset * 0.04}`,
  },
  {
    name: "ochre",
    color: "#b68432",
    width: 15,
    path: (offset: number) => `M62 ${226 + offset * 0.1}
      C150 ${243 + offset} ${167 - offset} ${132 - offset} 255 ${121 - offset}
      C328 ${107 - offset} ${367 + offset} 166 ${356 + offset} 217
      C${334 + offset} ${284 + offset * 0.4} 401 ${340 + offset} 475 ${335 + offset}
      C540 ${331 + offset} ${576 + offset} ${273 - offset * 0.2} 537 ${250 - offset}
      C505 ${233 - offset} ${488 - offset} 264 513 ${281 + offset}
      C547 ${308 + offset} 629 ${303 + offset * 0.8} 690 ${319 + offset * 0.1}`,
  },
];

export function LivingInkPreview() {
  return (
    <div className="ink-plate" aria-hidden="true">
      <div className="ink-plate__label">
        <span>Living pigment</span>
        <span>A study in flow</span>
      </div>
      <svg viewBox="0 0 760 430">
        <defs>
          <filter id="ink-wash" x="-15%" y="-15%" width="130%" height="130%">
            <feTurbulence baseFrequency="0.027" numOctaves="2" seed="8" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" />
            <feGaussianBlur stdDeviation="2.2" />
          </filter>
          {currents.map((current) => (
            <linearGradient key={current.name} id={`ink-${current.name}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor={current.color} stopOpacity="0.12" />
              <stop offset="0.24" stopColor={current.color} stopOpacity="0.7" />
              <stop offset="0.68" stopColor={current.color} stopOpacity="0.85" />
              <stop offset="1" stopColor={current.color} stopOpacity="0.15" />
            </linearGradient>
          ))}
        </defs>
        <rect x="20" y="20" width="720" height="390" rx="3" fill="#f3ebdd" />
        <g className="ink-plate__fibers" opacity="0.085">
          {Array.from({ length: 23 }, (_, index) => (
            <path key={index} d={`M38 ${35 + index * 16}C220 ${32 + index * 16} 516 ${43 + index * 15.6} 722 ${33 + index * 16}`} />
          ))}
        </g>
        <g fill="none" strokeLinecap="round" style={{ mixBlendMode: "multiply" }}>
          <g filter="url(#ink-wash)" opacity="0.2">
            {currents.map((current) => (
              <path key={current.name} d={current.path(0)} stroke={`url(#ink-${current.name})`} strokeWidth={current.width} />
            ))}
          </g>
          {currents.map((current) => (
            <g key={current.name} stroke={`url(#ink-${current.name})`}>
              {Array.from({ length: 32 }, (_, index) => {
                const offset = (index / 31 - 0.5) * current.width;
                return (
                  <path
                    key={index}
                    d={current.path(offset + Math.sin(index * 2.7) * 0.6)}
                    strokeWidth={index % 7 === 0 ? 0.85 : 0.45}
                    opacity={0.34 + (Math.sin(index * 3.8) + 1) * 0.2}
                  />
                );
              })}
              <path d={current.path(-current.width * 0.73)} strokeWidth="0.5" opacity="0.23" />
              <path d={current.path(current.width * 0.66)} strokeWidth="0.45" opacity="0.17" />
            </g>
          ))}
        </g>
        <text x="52" y="386">TOUCH · GUIDE · LET THE CURRENT SETTLE</text>
      </svg>
      <p className="ink-plate__caption">Fig. 03 — Pigment that remembers how you moved.</p>
    </div>
  );
}
