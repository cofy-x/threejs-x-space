import assert from "node:assert/strict";
import { Vector3 } from "three";
import {
  BODIES,
  createFlight,
  GUIDED_PULL,
  LAUNCH_POWER,
  MAX_PULL,
  predictOrbit,
  PROBE_CLEARANCE,
  SIMULATION_STEP,
  stepFlight,
  type FlightPhase,
  type OrbitFlight,
  type TrajectoryState,
} from "../src/space-config.ts";

// Run with Node.js 22.6+; all physics and prediction come from the application.
function launch(pull: Vector3): OrbitFlight {
  assert.ok(pull.length() <= MAX_PULL, "The launch fixture must be reachable with the configured pull limit.");
  const flight = createFlight();
  flight.phase = "flying";
  flight.position.add(pull);
  flight.velocity.copy(pull).multiplyScalar(-LAUNCH_POWER);
  return flight;
}

function snapshot(flight: OrbitFlight) {
  return {
    phase: flight.phase,
    position: flight.position.toArray(),
    velocity: flight.velocity.toArray(),
    visitedBodies: [...flight.visitedBodies],
    score: flight.score,
    combo: flight.combo,
    flightTime: flight.flightTime,
  };
}

function finish(flight: OrbitFlight, afterStep?: (current: OrbitFlight) => void) {
  const maxSteps = Math.ceil(16 / SIMULATION_STEP);
  for (let index = 0; index < maxSteps && flight.phase === "flying"; index += 1) {
    stepFlight(flight);
    afterStep?.(flight);
  }
  assert.notEqual(flight.phase, "flying", "The fixture should finish within the 16-second prediction horizon.");
  return flight;
}

const guided = launch(GUIDED_PULL);
let minimumClearance = Number.POSITIVE_INFINITY;
const visits: { body: string; time: number }[] = [];
finish(guided, (current) => {
  for (const body of BODIES) {
    minimumClearance = Math.min(
      minimumClearance,
      current.position.distanceTo(body.position) - body.radius - PROBE_CLEARANCE,
    );
  }
  if (current.visitedBodies.size > visits.length) {
    for (const body of [...current.visitedBodies].slice(visits.length)) {
      visits.push({ body, time: current.flightTime });
    }
  }
});
assert.equal(guided.phase, "complete", "Guided flight must complete the mission.");
assert.equal(guided.visitedBodies.size, 3, "Guided flight must visit three distinct bodies.");
assert.deepEqual([...guided.visitedBodies], ["pelagos", "nyx", "helios"], "The demonstrated itinerary must remain stable.");
assert.equal(guided.score, 8400, "A clean three-assist mission must award 8400 points.");
assert.ok(guided.flightTime <= 10, "The guided mission should finish in ten simulation seconds.");
assert.ok(minimumClearance > 0.2, "The guided route must keep more than 0.2 units beyond every collision shell.");
const guidedResult = snapshot(guided);
stepFlight(guided);
assert.deepEqual(snapshot(guided), guidedResult, "Completed flights must not move or repeatedly award the completion bonus.");

const fixtures: {
  name: string;
  pull: Vector3;
  phase: FlightPhase;
  prediction: TrajectoryState;
}[] = [
  { name: "guided three-assist mission", pull: GUIDED_PULL, phase: "complete", prediction: "assist" },
  { name: "inner-system collision", pull: new Vector3(1, 0.2, 0.5), phase: "crashed", prediction: "danger" },
  { name: "collision after a longer arc", pull: new Vector3(-1, 0.7, 0.2), phase: "crashed", prediction: "danger" },
  { name: "escape after an assist", pull: new Vector3(1, 1, 1), phase: "escaped", prediction: "assist" },
  { name: "clear outward escape", pull: new Vector3(-1.5, -0.7, -1), phase: "escaped", prediction: "safe" },
];

for (const fixture of fixtures) {
  const flight = launch(fixture.pull);
  const initial = snapshot(flight);
  const predicted = predictOrbit(flight.position, flight.velocity, flight.visitedBodies);
  assert.deepEqual(snapshot(flight), initial, `${fixture.name}: prediction must not mutate the live flight.`);
  finish(flight);
  assert.equal(flight.phase, fixture.phase, `${fixture.name}: unexpected flight outcome.`);
  assert.equal(predicted.state, fixture.prediction, `${fixture.name}: incorrect preview safety state.`);
  assert.deepEqual(predicted.points[0], initial.position, `${fixture.name}: preview must start at the launch position.`);
  assert.deepEqual(predicted.points.at(-1), flight.position.toArray(), `${fixture.name}: preview and live endpoints diverged.`);
}

const paused = launch(GUIDED_PULL);
for (let index = 0; index < Math.ceil(2 / SIMULATION_STEP); index += 1) stepFlight(paused);
assert.equal(paused.visitedBodies.size, 1, "The pause fixture should contain earned progress.");
paused.phase = "paused";
const pausedResult = snapshot(paused);
for (let index = 0; index < 240; index += 1) stepFlight(paused);
assert.deepEqual(snapshot(paused), pausedResult, "Pause must freeze position, velocity, time, score, and visits.");
paused.phase = "flying";
finish(paused);
assert.deepEqual(snapshot(paused), guidedResult, "Resume must reach the same result as uninterrupted flight.");

const frameRates = [24, 30, 60, 120, 144];
for (const fps of frameRates) {
  const flight = launch(GUIDED_PULL);
  let accumulator = 0;
  for (let frame = 0; frame < 16 * fps && flight.phase === "flying"; frame += 1) {
    accumulator += Math.min(1 / fps, 0.05);
    while (accumulator >= SIMULATION_STEP && flight.phase === "flying") {
      stepFlight(flight);
      accumulator -= SIMULATION_STEP;
    }
  }
  assert.deepEqual(snapshot(flight), guidedResult, `Grouping fixed steps at ${fps} FPS must preserve the mission result.`);
}

console.log("Orbital flight verification passed.");
console.log(`Guided mission: ${guided.flightTime.toFixed(3)} s, ${guided.score} points, ${minimumClearance.toFixed(3)} units minimum clearance.`);
console.log(`Visits: ${visits.map((visit) => `${visit.body} at ${visit.time.toFixed(3)} s`).join(" → ")}.`);
console.log(`Prediction: ${fixtures.length} completed, crashed, and escaped flight fixtures match the live simulation.`);
console.log(`Pause/resume: frozen while paused; identical final result. Frame grouping: ${frameRates.join(", ")} FPS.`);
