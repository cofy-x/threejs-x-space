import * as THREE from "three";

export interface GravityBody {
  id: string;
  position: THREE.Vector3;
  radius: number;
  mass: number;
}

export const LAUNCH_POINT = new THREE.Vector3(3.8, -1.15, 1.75);

export const BODIES = [
  { id: "helios", position: new THREE.Vector3(-0.7, 0.1, -1.4), radius: 1.3, mass: 38 },
  { id: "nyx", position: new THREE.Vector3(-4.35, -1.65, -3.2), radius: 0.84, mass: 7 },
  { id: "pelagos", position: new THREE.Vector3(3.25, 2.05, 1.35), radius: 0.96, mass: 11 },
] as const satisfies readonly GravityBody[];
