import { useId } from "react";

type Point = readonly [number, number];
interface Arm {
  start: Point;
  curves: readonly (readonly [Point, Point, Point])[];
  side?: number;
}
const ARMS: Arm[] = [
  {
    start: [356, 207],
    curves: [
      [
        [300, 203],
        [277, 253],
        [239, 259],
      ],
      [
        [194, 263],
        [181, 221],
        [208, 215],
      ],
      [
        [237, 208],
        [231, 244],
        [218, 234],
      ],
    ],
  },
  {
    start: [403, 205],
    curves: [
      [
        [463, 197],
        [476, 239],
        [517, 250],
      ],
      [
        [564, 264],
        [576, 223],
        [550, 214],
      ],
      [
        [529, 207],
        [528, 225],
        [536, 228],
      ],
    ],
    side: -1,
  },
  {
    start: [359, 207],
    curves: [
      [
        [352, 251],
        [307, 278],
        [291, 322],
      ],
      [
        [274, 368],
        [217, 349],
        [226, 321],
      ],
      [
        [231, 300],
        [253, 309],
        [246, 321],
      ],
    ],
  },
  {
    start: [396, 206],
    curves: [
      [
        [401, 258],
        [451, 287],
        [468, 325],
      ],
      [
        [488, 367],
        [548, 345],
        [533, 317],
      ],
      [
        [523, 297],
        [507, 308],
        [514, 319],
      ],
    ],
    side: -1,
  },
  {
    start: [353, 207],
    curves: [
      [
        [291, 208],
        [286, 153],
        [318, 158],
      ],
      [
        [346, 163],
        [317, 207],
        [353, 229],
      ],
      [
        [363, 235],
        [372, 228],
        [371, 220],
      ],
    ],
  },
  {
    start: [407, 207],
    curves: [
      [
        [466, 194],
        [476, 148],
        [448, 155],
      ],
      [
        [420, 163],
        [450, 207],
        [424, 230],
      ],
      [
        [417, 238],
        [408, 228],
        [412, 220],
      ],
    ],
    side: -1,
  },
  {
    start: [355, 213],
    curves: [
      [
        [315, 236],
        [317, 288],
        [350, 291],
      ],
      [
        [368, 294],
        [378, 282],
        [367, 267],
      ],
    ],
  },
  {
    start: [404, 213],
    curves: [
      [
        [451, 231],
        [455, 283],
        [423, 291],
      ],
      [
        [411, 295],
        [402, 282],
        [412, 270],
      ],
    ],
    side: -1,
  },
];

function armGeometry(arm: Arm) {
  const points: { x: number; y: number; nx: number; ny: number; r: number }[] =
    [];
  let start = arm.start;
  arm.curves.forEach(([a, b, end], segment) => {
    for (let step = 0; step <= 22; step++) {
      if (segment && step === 0) continue;
      const t = step / 22,
        u = 1 - t;
      const x =
        u ** 3 * start[0] +
        3 * u ** 2 * t * a[0] +
        3 * u * t ** 2 * b[0] +
        t ** 3 * end[0];
      const y =
        u ** 3 * start[1] +
        3 * u ** 2 * t * a[1] +
        3 * u * t ** 2 * b[1] +
        t ** 3 * end[1];
      const dx =
        3 * u ** 2 * (a[0] - start[0]) +
        6 * u * t * (b[0] - a[0]) +
        3 * t ** 2 * (end[0] - b[0]);
      const dy =
        3 * u ** 2 * (a[1] - start[1]) +
        6 * u * t * (b[1] - a[1]) +
        3 * t ** 2 * (end[1] - b[1]);
      const length = Math.hypot(dx, dy) || 1;
      const progress = (segment + t) / arm.curves.length;
      points.push({
        x,
        y,
        nx: -dy / length,
        ny: dx / length,
        r: 18 * (1 - progress) ** 0.72 + 1,
      });
    }
    start = end;
  });
  const outline = (offset: number, width: number) => {
    const sides = [1, -1].map((side) =>
      points.map((p) => {
        const radius = p.r * (offset + width * side);
        return `${(p.x + p.nx * radius).toFixed(2)},${(p.y + p.ny * radius).toFixed(2)}`;
      }),
    );
    return `M${sides[0]?.join("L")}L${sides[1]?.reverse().join("L")}Z`;
  };
  return {
    skin: outline(0, 1),
    underside: outline((arm.side ?? 1) * 0.4, 0.4),
    points,
  };
}
const ARM_GEOMETRY = ARMS.map(armGeometry);

/** Original SVG portrait; the Three.js scene and Blender model load on the route only. */
export function CubePreview() {
  const id = useId().replace(/:/g, "");
  const drawArm = (index: number) => {
    const arm = ARM_GEOMETRY[index];
    if (!arm) return null;
    const side = ARMS[index]?.side ?? 1;
    return (
      <g key={index}>
        <path
          d={arm.skin}
          fill={`url(#${id}-skin)`}
          stroke="#d57665"
          strokeOpacity=".4"
          strokeWidth=".7"
        />
        <path d={arm.underside} fill={`url(#${id}-underside)`} />
        {arm.points
          .filter((_, i) => i > 7 && i % 4 === 0)
          .map((p, i) => (
            <g
              key={i}
              transform={`translate(${p.x + p.nx * p.r * side * 0.43} ${p.y + p.ny * p.r * side * 0.43}) rotate(${(Math.atan2(p.ny, p.nx) * 180) / Math.PI})`}
            >
              <ellipse
                rx={p.r * 0.3}
                ry={p.r * 0.4}
                fill="#dbadbd"
                stroke="#976c9b"
                strokeWidth=".8"
              />
              <ellipse rx={p.r * 0.14} ry={p.r * 0.23} fill="#724b79" />
              <path
                d={`M${-p.r * 0.18} 0a${p.r * 0.18} ${p.r * 0.28} 0 0 1 ${p.r * 0.18} ${-p.r * 0.28}`}
                stroke="#f4d2d1"
                strokeWidth=".7"
              />
            </g>
          ))}
      </g>
    );
  };

  return (
    <div
      aria-hidden="true"
      style={{
        height: "100%",
        minHeight: 310,
        background: "#071c27",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <svg
        viewBox="0 0 760 430"
        fill="none"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          display: "block",
        }}
      >
        <defs>
          <radialGradient id={`${id}-ocean`} cx=".48" cy=".42" r=".66">
            <stop stopColor="#254b54" />
            <stop offset=".65" stopColor="#102f3b" />
            <stop offset="1" stopColor="#071a27" />
          </radialGradient>
          <linearGradient id={`${id}-skin`} x1=".1" y1="0" x2=".8" y2="1">
            <stop stopColor="#f6b295" />
            <stop offset=".38" stopColor="#d9785f" />
            <stop offset=".76" stopColor="#b95551" />
            <stop offset="1" stopColor="#853f56" />
          </linearGradient>
          <radialGradient id={`${id}-mantle`} cx=".29" cy=".22" r=".83">
            <stop stopColor="#fbc1a3" />
            <stop offset=".36" stopColor="#e59473" />
            <stop offset=".75" stopColor="#ca6656" />
            <stop offset="1" stopColor="#8d4052" />
          </radialGradient>
          <linearGradient id={`${id}-underside`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#b08eaa" />
            <stop offset=".6" stopColor="#8f628f" />
            <stop offset="1" stopColor="#513e69" />
          </linearGradient>
          <radialGradient id={`${id}-iris`}>
            <stop stopColor="#e6bb6d" />
            <stop offset=".7" stopColor="#dca85c" />
            <stop offset="1" stopColor="#8f6333" />
          </radialGradient>
          <clipPath id={`${id}-mantle-clip`}>
            <path d="M315 159c-6-35 1-90 45-98 45-10 84 17 91 56 5 25 1 50-17 70l-15 27c-15 10-60 11-78-1l-11-28Z" />
          </clipPath>
          <clipPath id={`${id}-grip-clip`}>
            <path d="M0 237h760v193H0Z" />
          </clipPath>
        </defs>
        <path fill={`url(#${id}-ocean)`} d="M0 0h760v430H0z" />
        <path
          d="M175 0h49l193 360-90-1ZM295 0h22l167 360-48-4ZM473 0h26l54 334-36 1Z"
          fill="#a9d4c5"
          opacity=".026"
        />
        {Array.from({ length: 28 }, (_, i) => (
          <circle
            key={i}
            cx={80 + ((i * 131) % 619)}
            cy={53 + ((i * 67) % 299)}
            r={i % 4 === 0 ? 1.4 : 0.7}
            fill="#a5d9d2"
            opacity={i % 3 === 0 ? 0.36 : 0.14}
          />
        ))}
        <ellipse
          cx="380"
          cy="365"
          rx="192"
          ry="26"
          fill="#05151d"
          opacity=".65"
        />
        <path d="M211 337v13c0 36 338 36 338 0v-13Z" fill="#152c33" />
        <ellipse
          cx="380"
          cy="337"
          rx="169"
          ry="28"
          fill="#294049"
          stroke="#6c9b98"
          strokeOpacity=".35"
        />
        <path
          d="M224 346c67 29 230 30 312-2"
          stroke="#79b9b2"
          strokeOpacity=".2"
        />
        <ellipse cx="380" cy="329" rx="112" ry="20" fill="#162e35" />
        {[0, 1, 2, 3, 4, 5, 6, 7].map(drawArm)}
        <path
          d="M315 159c-6-35 1-90 45-98 45-10 84 17 91 56 5 25 1 50-17 70l-15 27c-15 10-60 11-78-1l-11-28Z"
          fill={`url(#${id}-mantle)`}
          stroke="#efaa8b"
          strokeOpacity=".4"
        />
        <g clipPath={`url(#${id}-mantle-clip)`}>
          {Array.from({ length: 125 }, (_, i) => (
            <ellipse
              key={i}
              cx={310 + ((i * 47) % 147)}
              cy={65 + ((i * 73) % 141)}
              rx={0.65 + (i % 4) * 0.36}
              ry={0.45 + (i % 3) * 0.36}
              fill={i % 3 === 0 ? "#ffe0b7" : "#ac534c"}
              opacity={i % 3 === 0 ? 0.48 : 0.3}
            />
          ))}
          <path
            d="M322 114c14-26 38-32 61-27M320 127c10-19 25-26 46-28"
            stroke="#ffdab8"
            opacity=".15"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
        <path
          d="M322 171c-4-28 23-38 37-16l-1 28c-18 10-29 7-36-12Zm85-16c17-21 42-8 35 19-6 13-20 17-35 6Z"
          fill="#b85b52"
          stroke="#f1a888"
          strokeOpacity=".5"
        />
        <ellipse
          cx="339"
          cy="165"
          rx="16"
          ry="19"
          fill={`url(#${id}-iris)`}
          transform="rotate(-11 339 165)"
        />
        <ellipse
          cx="423"
          cy="164"
          rx="16"
          ry="19"
          fill={`url(#${id}-iris)`}
          transform="rotate(9 423 164)"
        />
        <path
          d="M327 166c7-4 17-4 25-1-3 6-20 7-25 1Zm84-2c8-4 17-3 25 1-6 5-21 5-25-1Z"
          fill="#122631"
        />
        <ellipse
          cx="334"
          cy="156"
          rx="3.6"
          ry="2.6"
          fill="#ffeac5"
          opacity=".85"
        />
        <ellipse
          cx="419"
          cy="155"
          rx="3.6"
          ry="2.6"
          fill="#ffeac5"
          opacity=".85"
        />
        <path
          d="M357 199c6 10 35 10 45-1"
          stroke="#a84c4c"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="m365 206-5 12c4 10 20 13 25 3l-2-13"
          fill="#cf7969"
          stroke="#efa58a"
          strokeOpacity=".3"
        />
        <ellipse cx="372" cy="221" rx="9" ry="4.5" fill="#794551" />
        <g transform="translate(382 272) rotate(-9)">
          <path
            d="m-34-27 47-19 39 26-5 56-48 17-39-27Z"
            fill="#13262b"
            stroke="#0b2028"
            strokeWidth="5"
            strokeLinejoin="round"
          />
          <g transform="matrix(1 -.39 .77 .5 -33 -27)">
            {[
              "#efca63",
              "#efe7d6",
              "#d8704c",
              "#519d92",
              "#efca63",
              "#4f83b4",
              "#efe7d6",
              "#d8704c",
              "#efca63",
            ].map((color, index) => (
              <rect
                key={index}
                x={(index % 3) * 16}
                y={Math.floor(index / 3) * 16}
                width="14"
                height="14"
                rx="1.5"
                fill={color}
              />
            ))}
          </g>
          <g transform="matrix(.81 .55 -.08 1 -34 -25)">
            {[
              "#d8684b",
              "#538bbd",
              "#ebe3d0",
              "#e6bd56",
              "#d8684b",
              "#d8684b",
              "#d8684b",
              "#5e9f91",
              "#4b81af",
            ].map((color, index) => (
              <rect
                key={index}
                x={(index % 3) * 16}
                y={Math.floor(index / 3) * 17}
                width="14"
                height="15"
                rx="1.5"
                fill={color}
              />
            ))}
          </g>
          <g transform="matrix(1 -.37 -.09 1 5 1)">
            {[
              "#558cb8",
              "#ebc568",
              "#519e8d",
              "#519e8d",
              "#efe5d0",
              "#d7744e",
              "#d7744e",
              "#519e8d",
              "#efe5d0",
            ].map((color, index) => (
              <rect
                key={index}
                x={(index % 3) * 16}
                y={Math.floor(index / 3) * 17}
                width="14"
                height="15"
                rx="1.5"
                fill={color}
              />
            ))}
          </g>
        </g>
        <g clipPath={`url(#${id}-grip-clip)`}>{[6, 7].map(drawArm)}</g>
        <g
          fill="#a4c0bd"
          fontFamily="ui-monospace,monospace"
          fontSize="10"
          letterSpacing="2"
        >
          <text x="29" y="31">
            OCTO / BENEATH THE SURFACE
          </text>
          <text x="647" y="31">
            NO. 007
          </text>
          <text x="271" y="399">
            EIGHT ARMS. ONE OBSESSION.
          </text>
        </g>
      </svg>
    </div>
  );
}
