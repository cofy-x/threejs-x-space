import { useId } from "react";

export interface ChartSeries {
  label: string;
  color: string;
  values: number[];
  axis?: "left" | "right";
  fill?: boolean;
}

export interface TimeSeriesChartProps {
  title: string;
  series: ChartSeries[];
  xLabels?: string[];
  height?: number;
  fillHeight?: boolean;
}

const VIEW_WIDTH = 380;
const VIEW_HEIGHT = 170;
const PADDING_TOP = 10;
const PADDING_BOTTOM = 24;
const PADDING_LEFT = 46;
const PADDING_RIGHT = 46;
const GRID_LINES = 4;

function formatTick(value: number): string {
  if (Math.abs(value) >= 1000) {
    return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }
  return value.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

function niceRange(values: number[]): { min: number; max: number } {
  if (values.length === 0) return { min: 0, max: 1 };
  let min = Infinity;
  let max = -Infinity;
  values.forEach((v) => {
    if (v < min) min = v;
    if (v > max) max = v;
  });
  if (min === max) {
    return { min: min - 1, max: max + 1 };
  }
  const margin = (max - min) * 0.1;
  return { min: Math.max(0, min - margin), max: max + margin };
}

export function TimeSeriesChart({ title, series, xLabels, height = 170, fillHeight = false }: TimeSeriesChartProps) {
  const gradientBaseId = useId();
  const innerWidth = VIEW_WIDTH - PADDING_LEFT - PADDING_RIGHT;
  const innerHeight = VIEW_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const hasRightAxis = series.some((s) => s.axis === "right");
  const leftRange = niceRange(series.filter((s) => s.axis !== "right").flatMap((s) => s.values));
  const rightRange = hasRightAxis
    ? niceRange(series.filter((s) => s.axis === "right").flatMap((s) => s.values))
    : leftRange;
  const pointCount = Math.max(...series.map((s) => s.values.length), 0);

  const buildPath = (s: ChartSeries): string => {
    const range = s.axis === "right" ? rightRange : leftRange;
    return s.values
      .map((value, index) => {
        const x = PADDING_LEFT + (pointCount > 1 ? (index / (pointCount - 1)) * innerWidth : 0);
        const ratio = (value - range.min) / (range.max - range.min);
        const y = PADDING_TOP + (1 - ratio) * innerHeight;
        return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  };

  const gridLines = Array.from({ length: GRID_LINES + 1 }, (_, i) => {
    const ratio = i / GRID_LINES;
    const y = PADDING_TOP + ratio * innerHeight;
    const leftValue = leftRange.max - ratio * (leftRange.max - leftRange.min);
    const rightValue = rightRange.max - ratio * (rightRange.max - rightRange.min);
    return { y, leftValue, rightValue };
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        flex: fillHeight ? 1 : undefined,
        minHeight: fillHeight ? 0 : undefined,
      }}
    >
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "var(--ui-data-muted, #7d8fa8)" }}>
        {title}
      </span>
      {pointCount < 2 ? (
        <div
          role="status"
          style={{
            flex: fillHeight ? 1 : undefined,
            minHeight: fillHeight ? 0 : undefined,
            height: fillHeight ? undefined : height,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--ui-data-soft, #475569)",
            fontSize: 11,
            border: "1px dashed var(--ui-data-track, #1e293b)",
            borderRadius: 4,
          }}
        >
          Awaiting simulation data
        </div>
      ) : (
        <svg
          role="img"
          aria-label={title}
          width="100%"
          height={fillHeight ? "100%" : height}
          viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
          preserveAspectRatio="none"
          style={{ display: "block", flex: fillHeight ? 1 : undefined, minHeight: fillHeight ? 0 : undefined }}
        >
          <defs>
            {series
              .filter((s) => s.fill)
              .map((s, index) => (
                <linearGradient
                  key={`${gradientBaseId}-${index}`}
                  id={`${gradientBaseId}-${index}`}
                  x1="0%"
                  y1="0%"
                  x2="0%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
                </linearGradient>
              ))}
          </defs>
          {gridLines.map((line, index) => (
            <g key={index}>
              <line
                x1={PADDING_LEFT}
                y1={line.y}
                x2={VIEW_WIDTH - PADDING_RIGHT}
                y2={line.y}
                stroke="var(--ui-data-track, #1e293b)"
                strokeWidth={1}
              />
              <text
                x={PADDING_LEFT - 6}
                y={line.y + 3}
                textAnchor="end"
                fill="var(--ui-data-soft, #5b6b80)"
                fontSize={8}
                fontFamily="inherit"
              >
                {formatTick(line.leftValue)}
              </text>
              {hasRightAxis ? (
                <text
                  x={VIEW_WIDTH - PADDING_RIGHT + 6}
                  y={line.y + 3}
                  textAnchor="start"
                  fill="var(--ui-data-soft, #5b6b80)"
                  fontSize={8}
                  fontFamily="inherit"
                >
                  {formatTick(line.rightValue)}
                </text>
              ) : null}
            </g>
          ))}
          {series.map((s, seriesIndex) => {
            const linePath = buildPath(s);
            const firstX = PADDING_LEFT;
            const lastX =
              PADDING_LEFT +
              (pointCount > 1 ? ((s.values.length - 1) / (pointCount - 1)) * innerWidth : 0);
            const baseline = PADDING_TOP + innerHeight;
            return (
              <g key={s.label}>
                {s.fill ? (
                  <path
                    d={`${linePath} L${lastX.toFixed(1)},${baseline} L${firstX.toFixed(1)},${baseline} Z`}
                    fill={`url(#${gradientBaseId}-${seriesIndex})`}
                    stroke="none"
                  />
                ) : null}
                <path
                  d={linePath}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={1.5}
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            );
          })}
          {xLabels && xLabels.length > 0
            ? xLabels.map((labelText, index) => {
                const x =
                  PADDING_LEFT +
                  (xLabels.length > 1 ? (index / (xLabels.length - 1)) * innerWidth : 0);
                return (
                  <text
                    key={index}
                    x={x}
                    y={VIEW_HEIGHT - 8}
                    textAnchor="middle"
                    fill="var(--ui-data-soft, #5b6b80)"
                    fontSize={8}
                    fontFamily="inherit"
                  >
                    {labelText}
                  </text>
                );
              })
            : null}
        </svg>
      )}
      <div style={{ display: "flex", gap: 12 }}>
        {series.map((s) => (
          <span
            key={s.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 9,
              color: "var(--ui-data-muted, #7d8fa8)",
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
