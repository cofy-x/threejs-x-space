import { clamp } from "./math";

export function easeOutCubic(t: number): number {
  const x = clamp(t, 0, 1);
  return 1 - Math.pow(1 - x, 3);
}

export function approach(current: number, target: number, ratePerSecond: number, deltaSeconds: number): number {
  const step = ratePerSecond * deltaSeconds;
  if (current < target) return Math.min(current + step, target);
  if (current > target) return Math.max(current - step, target);
  return current;
}
