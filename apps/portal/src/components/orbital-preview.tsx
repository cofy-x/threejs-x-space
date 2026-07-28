export function OrbitalPreview() {
  return (
    <div className="orbit-plate" aria-hidden="true">
      <div className="orbit-plate__label">
        <span>Live experiment</span>
        <span>Gravity / slingshot</span>
      </div>
      <svg viewBox="0 0 760 430">
        <defs>
          <radialGradient id="orbit-space" cx="48%" cy="48%" r="72%">
            <stop offset="0" stopColor="#181a35" />
            <stop offset="0.58" stopColor="#0b0d1d" />
            <stop offset="1" stopColor="#05060d" />
          </radialGradient>
          <radialGradient id="orbit-sun" cx="38%" cy="32%">
            <stop offset="0" stopColor="#fffbd2" />
            <stop offset="0.22" stopColor="#ffd56b" />
            <stop offset="0.66" stopColor="#f47a2c" />
            <stop offset="1" stopColor="#b92f1d" />
          </radialGradient>
          <linearGradient id="orbit-solar-panel" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#4776a8" />
            <stop offset="0.5" stopColor="#142f59" />
            <stop offset="1" stopColor="#07162f" />
          </linearGradient>
          <linearGradient id="orbit-galaxy" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#5f5b8c" stopOpacity="0" />
            <stop offset="0.48" stopColor="#7b739e" stopOpacity="0.18" />
            <stop offset="0.62" stopColor="#b28a72" stopOpacity="0.12" />
            <stop offset="1" stopColor="#5f5b8c" stopOpacity="0" />
          </linearGradient>
          <clipPath id="orbit-earth-clip">
            <circle cx="165" cy="154" r="29" />
          </clipPath>
          <filter id="orbit-soft-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="orbit-wide-blur" x="-20%" y="-80%" width="140%" height="260%">
            <feGaussianBlur stdDeviation="18" />
          </filter>
        </defs>

        <rect x="20" y="20" width="720" height="390" rx="3" fill="url(#orbit-space)" />
        <path
          d="M32 314C182 237 325 196 486 151S672 81 744 52"
          stroke="url(#orbit-galaxy)"
          strokeWidth="82"
          filter="url(#orbit-wide-blur)"
          opacity="0.72"
        />

        <g className="orbit-plate__stars">
          {Array.from({ length: 64 }, (_, index) => (
            <circle
              key={index}
              cx={38 + ((index * 97) % 680)}
              cy={38 + ((index * 53) % 350)}
              r={index % 11 === 0 ? 1.5 : index % 5 === 0 ? 1 : 0.55}
            />
          ))}
        </g>

        <g className="orbit-plate__system">
          <ellipse className="orbit-plate__orbit" cx="344" cy="235" rx="218" ry="116" transform="rotate(-11 344 235)" />
          <path className="orbit-plate__gravity-line" d="M189 326C252 354 331 337 367 283" />
          <path className="orbit-plate__gravity-line" d="M209 341C284 370 361 342 391 289" />
        </g>

        <g className="orbit-plate__earth">
          <circle cx="165" cy="154" r="33" fill="#3d79a8" opacity="0.2" />
          <circle cx="165" cy="154" r="29" fill="#0d416e" />
          <g clipPath="url(#orbit-earth-clip)">
            <path fill="#5387b2" d="M136 143C148 122 176 117 193 132L181 143 171 144 164 155 149 158Z" />
            <path fill="#77975a" d="M137 137c10-11 24-12 36-5l-4 9-11 4-4 12-12-4Z" />
            <path fill="#6f9154" d="M174 153c9-7 20-3 26 5l-9 10-14-2-7-7Z" />
            <path fill="none" stroke="#d9e5eb" strokeOpacity="0.48" strokeWidth="2" d="M136 147c14 5 28 2 39-7s19-9 27-4" />
          </g>
          <path d="M143 174A29 29 0 0 0 190 136" fill="none" stroke="#79b9dd" strokeOpacity="0.48" strokeWidth="2" />
        </g>

        <g className="orbit-plate__sun" filter="url(#orbit-soft-glow)">
          <circle cx="344" cy="235" r="53" fill="#ef6b2b" opacity="0.18" />
          <circle cx="344" cy="235" r="45" fill="url(#orbit-sun)" />
          <path d="M310 225c21-12 47-10 69 4M315 246c17 8 39 9 57 1" fill="none" stroke="#ffbd58" strokeOpacity="0.42" strokeWidth="2" />
          <circle cx="327" cy="218" r="3.5" fill="#b83a22" opacity="0.72" />
          <circle cx="360" cy="251" r="2.5" fill="#ad2f1e" opacity="0.6" />
        </g>

        <g className="orbit-plate__mars">
          <circle cx="565" cy="113" r="16" fill="#9e4f39" />
          <path d="M552 108c9-7 19-6 27 0M558 121c6 2 11 1 16-2" fill="none" stroke="#d08664" strokeOpacity="0.45" />
        </g>

        <path className="orbit-plate__trajectory-shadow" d="M78 324C190 371 300 350 360 298C405 258 411 181 482 170C540 161 580 217 653 187" />
        <path className="orbit-plate__trajectory" d="M78 324C190 371 300 350 360 298C405 258 411 181 482 170C540 161 580 217 653 187" />

        <g className="orbit-plate__probe" transform="translate(653 187) rotate(-24)">
          <path className="orbit-plate__ion-trail" d="M-30 0H-72" />
          <rect className="orbit-plate__panel" x="-24" y="-22" width="17" height="13" rx="1" />
          <rect className="orbit-plate__panel" x="-24" y="9" width="17" height="13" rx="1" />
          <path className="orbit-plate__panel-grid" d="M-18-22v13M-12-22v13M-18 9v13M-12 9v13" />
          <rect className="orbit-plate__body" x="-10" y="-7" width="24" height="14" rx="3" />
          <path className="orbit-plate__dish" d="M8-12Q24 0 8 12M8-12v24" />
          <path className="orbit-plate__mast" d="M10 0h15" />
          <circle className="orbit-plate__sensor" cx="27" cy="0" r="2.5" />
        </g>

        <text x="52" y="378">LAUNCH · FLYBY · BEND THE PATH</text>
      </svg>
      <p className="orbit-plate__caption">Fig. 02 — A small push, reshaped by gravity.</p>
    </div>
  );
}
