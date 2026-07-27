import type { Object3D, Vector3 } from "three";

export function rotateAroundAxis(
  object: Object3D,
  axis: Vector3,
  radiansPerSecond: number,
  deltaSeconds: number,
): void {
  object.rotateOnAxis(axis.clone().normalize(), radiansPerSecond * deltaSeconds);
}
