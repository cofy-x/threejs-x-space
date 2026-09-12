import * as THREE from "three";

export interface GravityBody {
  id: string;
  position: THREE.Vector3;
  radius: number;
  mass: number;
  assistRange: number;
}

export type FlightPhase = "ready" | "aiming" | "flying" | "paused" | "crashed" | "escaped" | "complete";
export type TrajectoryState = "safe" | "assist" | "danger";
export type OrbitPoint = [number, number, number];

export interface OrbitFlight {
  phase: FlightPhase;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  visitedBodies: Set<string>;
  score: number;
  combo: number;
  flightTime: number;
}

export interface OrbitPrediction {
  points: OrbitPoint[];
  state: TrajectoryState;
  marker: THREE.Vector3 | null;
}

export const LAUNCH_POINT = new THREE.Vector3(3.8, -1.15, 1.75);
export const GUIDED_PULL = new THREE.Vector3(0.176, -0.383, 0.303);
export const MAX_PULL = 2.65;
export const LAUNCH_POWER = 2.65;
export const SIMULATION_STEP = 1 / 120;
export const PROBE_CLEARANCE = 0.16;
export const ESCAPE_RADIUS = 17.5;
const GRAVITY = 0.82;
const PREDICTION_SECONDS = 16;
const PREDICTION_SAMPLE_STEPS = 6;

export const BODIES = [
  { id: "helios", position: new THREE.Vector3(-0.7, 0.1, -1.4), radius: 1.3, mass: 38, assistRange: 2.35 },
  { id: "nyx", position: new THREE.Vector3(-4.35, -1.65, -3.2), radius: 0.84, mass: 7, assistRange: 1.45 },
  { id: "pelagos", position: new THREE.Vector3(3.25, 2.05, 1.35), radius: 0.96, mass: 11, assistRange: 1.72 },
] as const satisfies readonly GravityBody[];

export function createFlight(): OrbitFlight {
  return {
    phase: "ready",
    position: LAUNCH_POINT.clone(),
    velocity: new THREE.Vector3(),
    visitedBodies: new Set(),
    score: 0,
    combo: 0,
    flightTime: 0,
  };
}

function flightBoundary(position: THREE.Vector3): "crashed" | "escaped" | null {
  if (BODIES.some((body) => position.distanceToSquared(body.position) < (body.radius + PROBE_CLEARANCE) ** 2)) {
    return "crashed";
  }
  return position.lengthSq() > ESCAPE_RADIUS ** 2 ? "escaped" : null;
}

// Prediction and live flight use this identical fixed-step integrator and event order.
export function stepFlight(flight: OrbitFlight) {
  if (flight.phase !== "flying") return;
  let boundary = flightBoundary(flight.position);
  if (!boundary) {
    let accelerationX = 0;
    let accelerationY = 0;
    let accelerationZ = 0;
    for (const body of BODIES) {
      const x = body.position.x - flight.position.x;
      const y = body.position.y - flight.position.y;
      const z = body.position.z - flight.position.z;
      const distanceSquared = Math.max(x * x + y * y + z * z, 0.48);
      const force = (GRAVITY * body.mass) / Math.pow(distanceSquared, 1.5);
      accelerationX += x * force;
      accelerationY += y * force;
      accelerationZ += z * force;
    }
    flight.velocity.x += accelerationX * SIMULATION_STEP;
    flight.velocity.y += accelerationY * SIMULATION_STEP;
    flight.velocity.z += accelerationZ * SIMULATION_STEP;
    flight.position.addScaledVector(flight.velocity, SIMULATION_STEP);
    flight.flightTime += SIMULATION_STEP;
    boundary = flightBoundary(flight.position);
  }
  if (boundary) {
    flight.phase = boundary;
    flight.combo = 0;
    flight.velocity.set(0, 0, 0);
    return;
  }
  for (const body of BODIES) {
    if (!flight.visitedBodies.has(body.id) && flight.position.distanceToSquared(body.position) < body.assistRange ** 2) {
      flight.visitedBodies.add(body.id);
      flight.combo += 1;
      flight.score += 900 * flight.combo;
    }
  }
  if (flight.visitedBodies.size === BODIES.length) {
    flight.phase = "complete";
    flight.score += 3000;
  }
}

export function predictOrbit(position: THREE.Vector3, velocity: THREE.Vector3, visitedBodies: ReadonlySet<string> = new Set()): OrbitPrediction {
  const flight = createFlight();
  flight.position.copy(position);
  flight.velocity.copy(velocity);
  flight.visitedBodies = new Set(visitedBodies);
  flight.phase = "flying";
  const points: OrbitPoint[] = [position.toArray()];
  let state: TrajectoryState = "safe";
  const marker = new THREE.Vector3();
  let closestClearance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < PREDICTION_SECONDS / SIMULATION_STEP; index += 1) {
    const previousAssists = flight.visitedBodies.size;
    stepFlight(flight);
    if (flight.visitedBodies.size > previousAssists) state = "assist";
    for (const body of BODIES) {
      const clearance = flight.position.distanceTo(body.position) - body.radius - PROBE_CLEARANCE;
      if (clearance < closestClearance) {
        closestClearance = clearance;
        marker.copy(flight.position);
      }
    }
    const nextPhase = flight.phase as FlightPhase;
    if ((index + 1) % PREDICTION_SAMPLE_STEPS === 0 || nextPhase !== "flying") {
      points.push(flight.position.toArray());
    }
    if (nextPhase === "crashed") state = "danger";
    if (nextPhase !== "flying") break;
  }
  return { points, state, marker: Number.isFinite(closestClearance) ? marker : null };
}
