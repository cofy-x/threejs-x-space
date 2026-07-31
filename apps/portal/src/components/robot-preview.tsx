export function RobotPreview() {
  return (
    <div className="robot-plate" aria-hidden="true">
      <div className="robot-plate__label">
        <span>Live preview</span>
        <span>Assembly / explode</span>
      </div>
      <svg viewBox="0 0 760 430">
        <g className="robot-plate__grid" opacity="0.3">
          {Array.from({ length: 14 }, (_, index) => (
            <line key={`v-${index}`} x1={50 + index * 50} y1="35" x2={50 + index * 50} y2="395" />
          ))}
          {Array.from({ length: 7 }, (_, index) => (
            <line key={`h-${index}`} x1="30" y1={65 + index * 50} x2="730" y2={65 + index * 50} />
          ))}
        </g>
        <g className="robot-plate__bot">
          <rect x="330" y="26" width="100" height="44" rx="8" className="robot-plate__shell" />
          <rect x="338" y="34" width="84" height="30" rx="5" className="robot-plate__dark" />
          <circle cx="380" cy="49" r="11" className="robot-plate__lens" />
          <circle cx="357" cy="49" r="7" className="robot-plate__dim" />
          <circle cx="404" cy="49" r="5" className="robot-plate__lens" />
          <line x1="352" y1="24" x2="346" y2="8" className="robot-plate__line" />
          <line x1="410" y1="24" x2="414" y2="4" className="robot-plate__line" />
          <rect x="368" y="72" width="24" height="10" rx="4" className="robot-plate__rubber" />
          <rect x="312" y="86" width="136" height="122" rx="8" className="robot-plate__shell" />
          <rect x="322" y="96" width="116" height="22" rx="3" className="robot-plate__panel" />
          <rect x="322" y="124" width="116" height="22" rx="3" className="robot-plate__panel" />
          <rect x="322" y="152" width="70" height="24" rx="3" className="robot-plate__dark" />
          <rect x="398" y="152" width="40" height="24" rx="3" className="robot-plate__panel" />
          <rect x="322" y="182" width="116" height="18" rx="3" className="robot-plate__dark" />
          <rect x="334" y="212" width="92" height="34" rx="7" className="robot-plate__shell" />
          <g className="robot-plate__limb">
            <rect x="282" y="92" width="24" height="58" rx="8" className="robot-plate__shell" />
            <rect x="286" y="154" width="16" height="52" rx="6" className="robot-plate__panel" />
            <circle cx="294" cy="212" r="9" className="robot-plate__dim" />
          </g>
          <g className="robot-plate__limb">
            <rect x="454" y="92" width="24" height="58" rx="8" className="robot-plate__shell" />
            <rect x="458" y="154" width="16" height="52" rx="6" className="robot-plate__panel" />
            <circle cx="466" cy="212" r="9" className="robot-plate__dim" />
          </g>
          <g className="robot-plate__limb">
            <rect x="322" y="252" width="34" height="78" rx="8" className="robot-plate__shell" />
            <rect x="326" y="334" width="30" height="24" rx="5" className="robot-plate__panel" />
          </g>
          <g className="robot-plate__limb">
            <rect x="404" y="252" width="34" height="78" rx="8" className="robot-plate__shell" />
            <rect x="404" y="334" width="30" height="24" rx="5" className="robot-plate__panel" />
          </g>
        </g>
        <g className="robot-plate__callout">
          <path d="M380 26V12h-60" />
          <text x="238" y="16">01 / SENSOR HEAD</text>
          <path d="M448 140h52v-40h60" />
          <text x="566" y="104">02 / CHASSIS</text>
          <path d="M356 300h-70v40" />
          <text x="160" y="344">03 / DRIVE LEGS</text>
        </g>
        <circle cx="428" cy="157" r="3" className="robot-plate__led" />
      </svg>
      <p className="robot-plate__caption">Fig. 04 — Eight assemblies, one desk companion.</p>
    </div>
  );
}
