import { useId } from "react";

/** A lightweight illustration; the actual Three.js lab loads only on its route. */
export function RobotPreview() {
  const id = useId().replace(/:/g, "");
  return (
    <div className="robot-plate" aria-hidden="true">
      <div className="robot-plate__label">
        <span>Aster / Field robotics</span>
        <span>Unit 04</span>
      </div>
      <svg viewBox="0 0 760 430" fill="none">
        <defs>
          <linearGradient id={`${id}-shell`} x1="0" y1="0" x2="1" y2="0">
            <stop stopColor="#e2e8df" />
            <stop offset="0.5" stopColor="#c3ceca" />
            <stop offset="1" stopColor="#799398" />
          </linearGradient>
          <linearGradient id={`${id}-floor`} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#344954" />
            <stop offset="1" stopColor="#14242e" />
          </linearGradient>
          <radialGradient id={`${id}-light`}>
            <stop stopColor="#7fc5ce" stopOpacity="0.13" />
            <stop offset="1" stopColor="#7fc5ce" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse
          cx="385"
          cy="210"
          rx="225"
          ry="200"
          fill={`url(#${id}-light)`}
        />
        <path d="M140 370V38h480v332" stroke="#36505a" strokeWidth="8" />
        <path
          d="M148 300V43m465 0v257M165 39h427"
          stroke="#b9d1d1"
          strokeWidth="2"
          opacity="0.65"
        />
        <path
          d="M0 408 320 220M760 408 440 220"
          stroke="#ed9e6a"
          opacity="0.28"
        />
        <ellipse
          cx="380"
          cy="377"
          rx="132"
          ry="25"
          fill="#0b1821"
          stroke="#49616a"
        />
        <ellipse
          cx="380"
          cy="370"
          rx="126"
          ry="25"
          fill={`url(#${id}-floor)`}
          stroke="#d99565"
          strokeWidth="2"
        />
        <g className="robot-plate__aster">
          <path
            d="M345 56 355 43h50l13 13v35l-9 11h-56l-8-11Z"
            fill={`url(#${id}-shell)`}
            stroke="#e3e8e0"
            strokeOpacity="0.45"
          />
          <rect
            x="349"
            y="64"
            width="64"
            height="27"
            rx="6"
            fill="#0b1b25"
            stroke="#5f797f"
          />
          <path d="M357 60h46" stroke="#efa16d" strokeWidth="3" />
          <path d="M358 77h16m14 0h16" stroke="#a1e5e7" strokeWidth="3" />
          <path d="M367 103v15h26v-15" fill="#203541" stroke="#688188" />
          <path
            d="m335 119 15-9h60l16 9-8 82-21 17h-36l-20-17Z"
            fill="#12242e"
            stroke="#3d5660"
          />
          <circle
            cx="381"
            cy="164"
            r="22"
            fill="#0c1d28"
            stroke="#526e78"
            strokeWidth="4"
          />
          <circle
            className="robot-plate__core"
            cx="381"
            cy="164"
            r="15"
            stroke="#9bdfdf"
            strokeWidth="3"
            strokeDasharray="25 6"
          />
          <path d="m337 120 25 5 4 23-7 42-16-2Z" fill={`url(#${id}-shell)`} />
          <path d="m424 120-25 5-4 23 7 42 16-2Z" fill={`url(#${id}-shell)`} />
          <path d="m343 135 13 2m49 0 13-2" stroke="#db8959" strokeWidth="2" />
          <path
            d="M365 211h31m-28 8h25m-22 8h19"
            stroke="#748c91"
            strokeWidth="4"
          />
          <path
            d="m351 235 9-5h42l9 5-5 23h-50Z"
            fill="#243b46"
            stroke="#688188"
          />
          <path
            d="M357 235h15v15h-15Zm33 0h15v15h-15Z"
            fill={`url(#${id}-shell)`}
          />
          {[-1, 1].map((side) => (
            <g
              key={side}
              transform={
                side === 1 ? "translate(761 0) scale(-1 1)" : undefined
              }
            >
              <path d="m329 124-14 13-6 56" stroke="#57737e" strokeWidth="12" />
              <rect
                x="298"
                y="117"
                width="33"
                height="29"
                rx="9"
                fill={`url(#${id}-shell)`}
              />
              <path d="M303 125h22" stroke="#e5a172" strokeWidth="3" />
              <rect
                x="302"
                y="153"
                width="20"
                height="34"
                rx="6"
                fill={`url(#${id}-shell)`}
              />
              <circle
                cx="309"
                cy="197"
                r="8"
                fill="#1a303c"
                stroke="#6a858e"
                strokeWidth="2"
              />
              <path d="m297 210 26-1-5 47-17-1Z" fill={`url(#${id}-shell)`} />
              <path d="M309 218v24" stroke="#203844" strokeWidth="3" />
              <rect
                x="301"
                y="260"
                width="16"
                height="13"
                rx="3"
                fill="#657e84"
              />
              <path
                d="M302 274v9m7-9v10m7-10v9"
                stroke="#8d9fa0"
                strokeWidth="3"
              />
              <path d="M355 262h23l-3 41h-17Z" fill={`url(#${id}-shell)`} />
              <rect
                x="359"
                y="307"
                width="17"
                height="9"
                rx="4"
                fill="#3d5c67"
                stroke="#8da4a7"
              />
              <path d="M358 320h18l-2 35h-14Z" fill={`url(#${id}-shell)`} />
              <path
                d="m359 357 16 1v11h-29v-6Z"
                fill={`url(#${id}-shell)`}
                stroke="#657f88"
              />
            </g>
          ))}
        </g>
        <g className="robot-plate__callout">
          <path d="M344 76h-80v-9h-42" />
          <text x="168" y="57">
            01 / VISION
          </text>
          <path d="M424 164h75v-18h44" />
          <text x="513" y="135">
            02 / POWER
          </text>
          <path d="M358 308h-95v-22h-34" />
          <text x="165" y="276">
            03 / MOTION
          </text>
        </g>
      </svg>
      <p className="robot-plate__caption">
        Engineered to explore. Waiting to wake up.
      </p>
    </div>
  );
}
