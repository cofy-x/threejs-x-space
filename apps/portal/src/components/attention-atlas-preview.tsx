import { useId } from "react";

interface ModuleProps {
  x: number;
  y: number;
  color: string;
  width?: number;
  height?: number;
  cells?: number;
}

function ArchitectureModule({
  x,
  y,
  color,
  width = 88,
  height = 21,
  cells = 8,
}: ModuleProps) {
  return (
    <g transform={`translate(${x} ${y})`} stroke={color} strokeWidth="0.85">
      <path
        d={`M0 0h${width}l23-12H23Z`}
        fill={color}
        fillOpacity=".3"
      />
      <path
        d={`M0 0h${width}v${height}H0Z`}
        fill={color}
        fillOpacity=".13"
      />
      <path
        d={`M${width} 0l23-12v${height}l-23 12Z`}
        fill={color}
        fillOpacity=".2"
      />
      {Array.from({ length: cells }, (_, index) => (
        <path
          key={index}
          d={`M${10 + (index * (width - 23)) / Math.max(1, cells - 1)} 5v${height - 10}`}
          strokeWidth="3"
          opacity={index % 3 === 0 ? ".85" : ".3"}
        />
      ))}
      <path d={`M5 ${height + 3}h${width - 10}`} opacity=".15" />
    </g>
  );
}

/** An original SVG study; the interactive WebGL scene loads only on its route. */
export function AttentionAtlasPreview() {
  const id = useId().replace(/:/g, "");
  const amber = "#ecb66d";
  const mint = "#83d4c1";

  return (
    <div
      aria-hidden="true"
      style={{
        position: "relative",
        overflow: "hidden",
        width: "100%",
        minHeight: 320,
        aspectRatio: "760 / 510",
        border: "1px solid #2a4249",
        background: "#0b1820",
        boxShadow: "16px 20px 0 rgba(37, 35, 31, 0.055)",
      }}
    >
      <svg
        viewBox="0 0 760 510"
        fill="none"
        style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}
      >
        <defs>
          <radialGradient id={`${id}-atmosphere`} cx=".68" cy=".55" r=".65">
            <stop stopColor="#19333b" />
            <stop offset="1" stopColor="#0b1820" />
          </radialGradient>
          <linearGradient id={`${id}-trace`} x1="0" x2="1">
            <stop stopColor={amber} />
            <stop offset="1" stopColor={mint} />
          </linearGradient>
        </defs>
        <path d="M0 0h760v510H0Z" fill={`url(#${id}-atmosphere)`} />

        <g stroke="#56717a" strokeWidth=".7" opacity=".13">
          {Array.from({ length: 14 }, (_, index) => (
            <path
              key={index}
              d={`M${index * 66 - 280} 510 380 278M${index * 66 + 300} 510 380 278`}
            />
          ))}
          {[335, 354, 381, 418, 468].map((y) => (
            <path key={y} d={`M0 ${y}h760`} />
          ))}
        </g>

        <g fontFamily="ui-monospace, monospace" fontSize="10" letterSpacing="2">
          <text x="30" y="34" fill="#97aeb4">
            AN ATLAS OF ATTENTION
          </text>
          <text x="665" y="34" fill="#6c858d">
            NO. 006
          </text>
        </g>
        <path d="M30 50h700" stroke="#3e555e" strokeOpacity=".5" />

        <g fontFamily="ui-sans-serif, system-ui, sans-serif">
          <text x="64" y="98" fill={amber} fontSize="19" fontWeight="550">
            Original Transformer
          </text>
          <text x="431" y="98" fill={mint} fontSize="19" fontWeight="550">
            DeepSeek-V4.1-Flash
          </text>
          <text x="64" y="119" fill="#8fa3aa" fontSize="11" letterSpacing="1.5">
            2017
          </text>
          <text x="431" y="119" fill="#8fa3aa" fontSize="11" letterSpacing="1.5">
            2026
          </text>
        </g>

        <g stroke={amber} strokeOpacity=".13">
          {[0, 6, 12].map((offset) => (
            <path key={offset} d={`M${80 + offset} 397V250h99v147m54-5V192h105v200`} />
          ))}
        </g>
        <g stroke={mint} strokeOpacity=".13">
          {[0, 6, 12, 18].map((offset) => (
            <path key={offset} d={`M${425 + offset} 392V183h100v209m53-5V151h100v236`} />
          ))}
        </g>

        <g strokeDasharray="2 6" strokeWidth="2" strokeLinecap="round">
          <path d="M135 420V248m136 167V156" stroke={amber} opacity=".75" />
          <path d="M480 415V145m151 266V136" stroke={mint} opacity=".8" />
        </g>
        <g strokeWidth="1" strokeOpacity=".5">
          <path d="M135 279h61v27h74" stroke={amber} />
          <path d="M480 197h67v57h83M480 312h84v-99h65" stroke={mint} />
          <path d="M499 338h-87v-42h-25M650 256h65v75h-54" stroke={mint} />
        </g>

        <ArchitectureModule x={83} y={396} color="#bd94aa" height={17} />
        <ArchitectureModule x={83} y={354} color={amber} height={29} />
        <ArchitectureModule x={83} y={328} color="#d9c596" height={12} />
        <ArchitectureModule x={83} y={288} color="#88b7d1" height={25} />
        <ArchitectureModule x={83} y={261} color="#d9c596" height={12} />

        <ArchitectureModule x={221} y={406} color="#bd94aa" height={17} />
        <ArchitectureModule x={221} y={361} color={amber} height={29} />
        <ArchitectureModule x={221} y={335} color="#d9c596" height={12} />
        <ArchitectureModule x={221} y={294} color={amber} height={26} />
        <ArchitectureModule x={221} y={267} color="#d9c596" height={12} />
        <ArchitectureModule x={221} y={227} color="#88b7d1" height={25} />
        <ArchitectureModule x={221} y={200} color="#d9c596" height={12} />
        <ArchitectureModule x={221} y={165} color="#aeacdf" height={18} />

        <ArchitectureModule x={430} y={398} color="#b0a1d7" height={18} />
        <ArchitectureModule x={430} y={354} color={mint} height={24} />
        <ArchitectureModule x={430} y={314} color="#8fbbd1" height={22} />
        <ArchitectureModule x={430} y={274} color={mint} height={22} />
        <ArchitectureModule x={430} y={234} color="#8fbbd1" height={22} />
        <ArchitectureModule x={430} y={194} color={mint} height={22} />
        <ArchitectureModule x={430} y={155} color={mint} height={18} />
        <ArchitectureModule x={357} y={294} color="#b0a1d7" width={42} height={18} cells={4} />

        <ArchitectureModule x={580} y={393} color={mint} height={24} />
        <ArchitectureModule x={580} y={353} color="#8fbbd1" height={22} />
        <ArchitectureModule x={580} y={313} color={mint} height={22} />
        <ArchitectureModule x={580} y={273} color="#8fbbd1" height={22} />
        <ArchitectureModule x={580} y={233} color={mint} height={22} />
        <ArchitectureModule x={580} y={193} color="#8fbbd1" height={22} />
        <ArchitectureModule x={580} y={151} color="#aeacdf" height={22} />

        <g fill="#a8c8cc">
          {[164, 239, 284, 330, 374].map((y) => <circle key={y} cx="480" cy={y} r="1.8" />)}
          {[179, 219, 259, 299, 339, 379].map((y) => <circle key={y} cx="631" cy={y} r="1.8" />)}
        </g>
        <path d="M65 443h631" stroke={`url(#${id}-trace)`} strokeOpacity=".3" />
        <g fill="#a9b9bd" fontFamily="ui-monospace, monospace" fontSize="10" letterSpacing="1.8">
          <text x="65" y="472">TWO ARCHITECTURES. A CLOSER LOOK.</text>
          <path d="M675 466h22m-5-5 5 5-5 5" stroke={mint} strokeWidth="1.5" />
        </g>
      </svg>
    </div>
  );
}
