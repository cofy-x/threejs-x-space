export function OrbitalPreview() {
  return (
    <div className="orbit-plate" aria-hidden="true">
      <div className="orbit-plate__label">
        <span>Live experiment</span>
        <span>Gravity / slingshot</span>
      </div>
      <svg viewBox="0 0 760 430">
        <defs>
          <radialGradient id="orbit-sun">
            <stop offset="0" stopColor="#fff1a8" />
            <stop offset="0.52" stopColor="#ff9b32" />
            <stop offset="1" stopColor="#e6471e" />
          </radialGradient>
          <radialGradient id="orbit-space">
            <stop offset="0" stopColor="#25254b" />
            <stop offset="1" stopColor="#070711" />
          </radialGradient>
          <radialGradient id="orbit-earth" cx="35%" cy="30%">
            <stop offset="0" stopColor="#4fa4d8" />
            <stop offset="0.58" stopColor="#14518a" />
            <stop offset="1" stopColor="#071b3d" />
          </radialGradient>
          <clipPath id="orbit-earth-clip">
            <circle cx="166" cy="150" r="24" />
          </clipPath>
          <filter id="orbit-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <rect x="20" y="20" width="720" height="390" rx="3" fill="url(#orbit-space)" />
        <g className="orbit-plate__stars">
          {Array.from({ length: 54 }, (_, index) => (
            <circle
              key={index}
              cx={38 + ((index * 89) % 680)}
              cy={38 + ((index * 47) % 350)}
              r={index % 7 === 0 ? 1.5 : 0.7}
            />
          ))}
        </g>
        <g className="orbit-plate__paths">
          <ellipse cx="335" cy="220" rx="206" ry="116" transform="rotate(-14 335 220)" />
          <path d="M650 324C529 322 486 254 435 196S300 92 164 139" />
        </g>
        <g className="orbit-plate__sun" filter="url(#orbit-glow)">
          <circle cx="335" cy="220" r="48" fill="url(#orbit-sun)" />
        </g>
        <g className="orbit-plate__planet">
          <circle cx="166" cy="150" r="24" fill="url(#orbit-earth)" />
          <g clipPath="url(#orbit-earth-clip)" fill="#739a55">
            <path d="M147 137c7-8 17-7 23-2l-2 8-9 3-4 9-8-4Z" />
            <path d="M172 153c8-6 18-2 23 5l-8 8-12-2-6-6Z" />
          </g>
        </g>
        <g className="orbit-plate__probe" filter="url(#orbit-glow)">
          <path d="M626 321C577 297 546 275 520 246" />
          <path className="orbit-plate__probe-body" d="M619 315l18 6-18 7 5-7Z" />
        </g>
        <text x="52" y="378">LAUNCH · FLYBY · BEND THE PATH</text>
      </svg>
      <p className="orbit-plate__caption">Fig. 02 — A tiny universe with a playful amount of gravity.</p>
    </div>
  );
}
