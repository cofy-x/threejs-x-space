import { useId } from "react";

export interface GaugeProps {
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  valueText?: string;
  subText?: string;
  size?: number;
  decimals?: number;
}

const SWEEP_DEGREES = 270;
const START_ANGLE_DEGREES = 135;

function polarToCartesian(cx: number, cy: number, radius: number, angleDegrees: number) {
  const angleRadians = (angleDegrees * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleRadians),
    y: cy + radius * Math.sin(angleRadians),
  };
}

function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, radius, startAngle);
  const end = polarToCartesian(cx, cy, radius, endAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

export function Gauge({
  label,
  value,
  min,
  max,
  unit,
  valueText,
  subText,
  size = 130,
  decimals = 0,
}: GaugeProps) {
  const gradientId = useId();
  const cx = size / 2;
  const cy = size / 2 + size * 0.04;
  const radius = size * 0.38;
  const fraction = max > min ? Math.min(Math.max((value - min) / (max - min), 0), 1) : 0;
  const valueAngle = START_ANGLE_DEGREES + fraction * SWEEP_DEGREES;
  const needleTip = polarToCartesian(cx, cy, radius * 0.72, valueAngle);
  const tickCount = 11;
  const ticks = Array.from({ length: tickCount }, (_, i) => {
    const angle = START_ANGLE_DEGREES + (i / (tickCount - 1)) * SWEEP_DEGREES;
    const outer = polarToCartesian(cx, cy, radius + size * 0.02, angle);
    const inner = polarToCartesian(cx, cy, radius + size * 0.07, angle);
    return { x1: outer.x, y1: outer.y, x2: inner.x, y2: inner.y };
  });
  const displayValue = valueText ?? value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={[displayValue, subText, unit].filter(Boolean).join(" ")}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 1.5,
          color: "var(--ui-data-muted, #7d8fa8)",
        }}
      >
        {label}
      </span>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--ui-data-live, #22d3ee)" />
            <stop offset="65%" stopColor="var(--ui-data-warning, #fbbf24)" />
            <stop offset="100%" stopColor="var(--ui-data-danger, #ef4444)" />
          </linearGradient>
        </defs>
        <path
          d={describeArc(cx, cy, radius, START_ANGLE_DEGREES, START_ANGLE_DEGREES + SWEEP_DEGREES)}
          fill="none"
          stroke="var(--ui-data-track, #1e293b)"
          strokeWidth={size * 0.055}
          strokeLinecap="round"
        />
        {fraction > 0.01 ? (
          <path
            d={describeArc(cx, cy, radius, START_ANGLE_DEGREES, valueAngle)}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={size * 0.055}
            strokeLinecap="round"
          />
        ) : null}
        {ticks.map((tick, index) => (
          <line
            key={index}
            x1={tick.x1}
            y1={tick.y1}
            x2={tick.x2}
            y2={tick.y2}
            stroke="var(--ui-data-tick, #334155)"
            strokeWidth={1}
          />
        ))}
        <line
          x1={cx}
          y1={cy}
          x2={needleTip.x}
          y2={needleTip.y}
          stroke="var(--ui-data-ink, #f8fafc)"
          strokeWidth={2}
          strokeLinecap="round"
        />
        <circle
          cx={cx}
          cy={cy}
          r={size * 0.045}
          fill="var(--ui-data-tick, #334155)"
          stroke="var(--ui-data-soft, #94a3b8)"
          strokeWidth={1}
        />
        <text
          x={cx}
          y={cy + radius * 0.68}
          textAnchor="middle"
          fill="var(--ui-data-ink, #f1f5f9)"
          fontSize={size * 0.105}
          fontWeight={600}
          fontFamily="inherit"
        >
          {displayValue}
        </text>
        {subText ? (
          <text
            x={cx}
            y={cy + radius * 0.95}
            textAnchor="middle"
            fill="var(--ui-data-muted, #7d8fa8)"
            fontSize={size * 0.08}
            fontWeight={600}
            fontFamily="inherit"
          >
            {subText}
          </text>
        ) : null}
      </svg>
      {unit ? (
        <span style={{ fontSize: 9, color: "var(--ui-data-soft, #64748b)", marginTop: -12 }}>{unit}</span>
      ) : null}
    </div>
  );
}
