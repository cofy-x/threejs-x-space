import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

// Transpile the isolated state machine with the package's existing TypeScript dependency.
// This keeps the tests compatible with Node 20 without a second test runner or generated files.
const source = readFileSync(
  new URL("../src/state/lab.ts", import.meta.url),
  "utf8",
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
  },
});
const { initialLabState, labReducer, statusMessage, SYSTEMS } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);
const send = (state, action) => labReducer(state, action);
function finish(state) {
  for (let i = 0; i < 100 && state.procedure; i++)
    state = send(state, { type: "tick", seconds: 0.1 });
  return state;
}
const powered = () => finish(send(initialLabState(), { type: "boot" }));

test("boot requires an explicit action and completes in a stable online state", () => {
  const initial = initialLabState();
  assert.equal(initial.power, "standby");
  assert.equal(initial.procedure, null);
  assert.equal(send(initial, { type: "tick", seconds: 10 }), initial);
  const online = powered();
  assert.equal(online.power, "online");
  assert.equal(online.procedure, null);
  assert.deepEqual(online.calibrated, []);
  assert.equal(send(online, { type: "boot" }), online);
});

test("calibration is unavailable without power, and concurrent procedures cannot replace one another", () => {
  const initial = initialLabState();
  assert.equal(send(initial, { type: "calibrate", system: "vision" }), initial);
  const booting = send(initial, { type: "boot" });
  assert.equal(send(booting, { type: "calibrate", system: "motion" }), booting);
  assert.equal(send(booting, { type: "mode", mode: "exploded" }), booting);
  assert.equal(send(booting, { type: "select", system: "power" }), booting);
});

test("pause freezes a running sequence and resume continues from the same progress", () => {
  let state = send(powered(), { type: "calibrate", system: "vision" });
  state = send(state, { type: "tick", seconds: 0.2 });
  state = send(state, { type: "pause" });
  assert.equal(send(state, { type: "tick", seconds: 0.25 }), state);
  assert.equal(statusMessage(state), "Sequence paused");
  state = send(state, { type: "pause" });
  assert.equal(state.procedure.elapsed, 0.2);
  state = finish(state);
  assert.deepEqual(state.calibrated, ["vision"]);
});

test("cancel preserves completed checks but never awards an unfinished check", () => {
  let state = finish(send(powered(), { type: "calibrate", system: "vision" }));
  state = send(state, { type: "calibrate", system: "power" });
  state = send(state, { type: "tick", seconds: 0.25 });
  state = send(state, { type: "cancel" });
  assert.equal(state.procedure, null);
  assert.deepEqual(state.calibrated, ["vision"]);
  assert.equal(state.power, "online");
});

test("all three distinct completed checks are required for field-ready status", () => {
  let state = powered();
  for (const system of SYSTEMS)
    state = finish(send(state, { type: "calibrate", system: system.id }));
  assert.equal(state.calibrated.length, 3);
  assert.match(statusMessage(state), /field-ready/);
  state = finish(send(state, { type: "calibrate", system: "vision" }));
  assert.equal(state.calibrated.length, 3);
});

test("reset clears progress and pause and requests a camera reset even during a procedure", () => {
  let state = send(powered(), { type: "calibrate", system: "motion" });
  state = send(state, { type: "pause" });
  state = send(state, { type: "reset" });
  assert.deepEqual(state, { ...initialLabState(), cameraRevision: 1 });
  state = finish(send(state, { type: "boot" }));
  assert.equal(state.power, "online");
});

test("invalid time and slider input cannot corrupt progress or transforms", () => {
  const state = send(initialLabState(), { type: "boot" });
  for (const seconds of [NaN, Infinity, -1, 0])
    assert.equal(send(state, { type: "tick", seconds }), state);
  assert.equal(
    send(state, { type: "tick", seconds: 900 }).procedure.elapsed,
    0.25,
  );
  assert.equal(send(state, { type: "separate", amount: NaN }), state);
  assert.equal(send(state, { type: "separate", amount: 9 }).separation, 1);
  assert.equal(send(state, { type: "separate", amount: -2 }).separation, 0);
});

test("diagnostics selects the next unchecked system and exploration preserves completed checks", () => {
  let state = finish(send(powered(), { type: "calibrate", system: "vision" }));
  state = send(state, { type: "mode", mode: "overview" });
  state = send(state, { type: "mode", mode: "systems" });
  assert.equal(state.selection, "power");
  state = send(state, { type: "mode", mode: "exploded" });
  assert.deepEqual(state.calibrated, ["vision"]);
  assert.equal(state.selection, null);
});
