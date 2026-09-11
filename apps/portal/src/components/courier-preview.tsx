import { useId } from "react";

/** A small SVG postcard: no WebGL runtime or game assets load in the portal. */
export function CourierPreview() {
  const id = useId().replace(/:/g, "");
  return (
    <div
      aria-hidden="true"
      style={{
        height: "100%",
        minHeight: 310,
        background: "#e7e6d7",
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
          <radialGradient id={`${id}-sky`}>
            <stop stopColor="#f8eed6" />
            <stop offset="1" stopColor="#dbe1d2" />
          </radialGradient>
          <linearGradient id={`${id}-rock`} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#839890" />
            <stop offset="1" stopColor="#b8c4af" />
          </linearGradient>
        </defs>
        <path fill={`url(#${id}-sky)`} d="M0 0h760v430H0z" />
        <g fill="#f4f0e0" opacity=".75">
          <ellipse cx="150" cy="325" rx="135" ry="24" />
          <ellipse cx="605" cy="345" rx="165" ry="30" />
          <ellipse cx="90" cy="180" rx="100" ry="17" />
        </g>
        <g stroke="#536f64" strokeWidth="1.5" strokeLinejoin="round">
          <path d="m123 280 78 92 66-43 14-77Z" fill={`url(#${id}-rock)`} />
          <path d="m93 258 117-63 127 60-115 69Z" fill="#eddfb9" />
          <path
            d="M93 258v18l129 69v-21Zm129 66 115-69v18l-115 72Z"
            fill="#819886"
          />
          <path d="m321 210 76 111 71-59 14-65Z" fill={`url(#${id}-rock)`} />
          <path d="m298 184 106-53 133 61-113 62Z" fill="#eedfba" />
          <path
            d="M298 184v18l126 68v-16Zm126 70 113-62v18l-113 60Z"
            fill="#829986"
          />
          <path d="m504 164 61 94 65-44 20-58Z" fill={`url(#${id}-rock)`} />
          <path d="m479 140 111-56 112 52-116 64Z" fill="#eedfba" />
          <path
            d="M479 140v18l107 60v-18Zm107 60 116-64v18l-116 64Z"
            fill="#879d89"
          />
          <path d="m305 241 61-33 21 12-61 34Z" fill="#b78b5b" />
          <path d="m493 184 41-25 21 12-41 25Z" fill="#b78b5b" />
        </g>
        <g stroke="#c4b08a" opacity=".8">
          <path d="m135 239 126 61m-86-82 126 60m-165 3 116-64m-77 84 116-66m43-58 124 61m-85-82 125 60m-164 0 110-57m-70 79 108-61" />
        </g>
        <g fill="#63876b">
          <path d="m148 204 24-68 23 68Z" />
          <path d="m460 177 24-65 23 65Z" />
          <path d="m634 169 17-48 18 48Z" />
        </g>
        <g stroke="#a17b4b" strokeWidth="4">
          <path d="M172 207v-30m312 1v-29m168 22v-21" />
        </g>
        <g transform="translate(590 125) scale(.65)">
          <ellipse cy="15" rx="30" ry="14" fill="#48685e" />
          <path
            d="m-20 10 5-104h30l5 104q-20 15-40 0Z"
            fill="#faf0d2"
            stroke="#8c9d81"
          />
          <path d="m-18-22 1-19h34l1 19q-18 12-36 0Z" fill="#498579" />
          <ellipse cy="-91" rx="30" ry="12" fill="#45695d" />
          <path
            d="M-16-94v-32h32v32q-16 8-32 0Z"
            fill="#f9d896"
            stroke="#a6854d"
          />
          <path d="m-28-124 28-24 28 24q-28 17-56 0Z" fill="#3e7c70" />
          <path d="M0-148v-11" stroke="#bb8b47" strokeWidth="3" />
          <path d="M-5 6v-18a5 5 0 0 1 10 0V6" fill="#48685e" />
        </g>
        <g transform="translate(228 253)">
          <ellipse cy="32" rx="25" ry="9" fill="#6b806e" opacity=".25" />
          <path d="M-14 20v12m26-12v12" stroke="#45625a" strokeWidth="12" />
          <rect
            x="-21"
            y="-20"
            width="42"
            height="42"
            rx="10"
            fill="#f4e8c9"
            stroke="#758c76"
          />
          <rect x="-12" y="-11" width="24" height="23" rx="4" fill="#d6733c" />
          <rect x="-7" y="-4" width="14" height="10" rx="1" fill="#eee2bb" />
          <path d="m-7-4 7 5 7-5" stroke="#b67f45" />
          <path
            d="M-25-10v27m50-27v27"
            stroke="#a18f66"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <rect
            x="-25"
            y="-55"
            width="50"
            height="34"
            rx="11"
            fill="#faf0d4"
            stroke="#88977d"
          />
          <rect x="-20" y="-47" width="40" height="17" rx="7" fill="#315751" />
          <path
            d="M-10-42v6m19-6v6"
            stroke="#afdfc7"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path d="M16-55v-14" stroke="#9b814d" strokeWidth="2" />
          <circle cx="16" cy="-70" r="4" fill="#d36b39" />
        </g>
        <g
          fill="#526e5f"
          fontFamily="ui-monospace,monospace"
          fontSize="10"
          letterSpacing="2"
        >
          <text x="29" y="31">
            SKYMAIL / SPECIAL DELIVERY
          </text>
          <text x="647" y="31">
            NO. 005
          </text>
          <text x="233" y="399">
            SMALL STEPS. BRIGHT SKIES.
          </text>
        </g>
      </svg>
    </div>
  );
}
