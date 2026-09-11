import assert from "node:assert/strict";
import test from "node:test";
import {
  INITIAL,
  STAMPS,
  commands,
  findPath,
  heightAt,
  reducer,
} from "../src/game.ts";

const begin = () => reducer({ ...INITIAL, stamps: [] }, { type: "start" });
function walk(s, to) {
  const path = findPath(s.player, to, s);
  assert.ok(
    path.length || s.player.join() === to.join(),
    `No route from ${s.player} to ${to}`,
  );
  for (const next of path) s = reducer(s, { type: "move", to: next });
  return s;
}
function act(s, id) {
  assert.ok(
    commands(s).some((c) => c.id === id),
    `${id} unavailable at ${s.player}, core=${s.core}`,
  );
  return reducer(s, { type: "interact", id });
}
function firstBridge(s) {
  s = walk(s, [1, 8]);
  s = act(s, "pick");
  s = walk(s, [4, 7]);
  s = act(s, "insert-bridge");
  s = walk(s, [6, 7]);
  s = act(s, "lock-bridge");
  s = walk(s, [4, 7]);
  s = act(s, "take-bridge");
  return s;
}
function lift(s) {
  s = walk(s, [8, 6]);
  s = act(s, "insert-lift");
  s = walk(s, [8, 5]);
  s = act(s, "ride");
  s = act(s, "take-lift");
  return s;
}
function turn(s) {
  s = walk(s, [10, 3]);
  s = act(s, "insert-turn");
  s = act(s, "rotate");
  s = act(s, "rotate");
  s = walk(s, [12, 3]);
  s = act(s, "lock-turn");
  s = walk(s, [10, 3]);
  s = act(s, "take-turn");
  return s;
}
test("The full three-machine delivery is solvable with all optional stamps", () => {
  let s = begin();
  s = walk(s, STAMPS[0]);
  s = firstBridge(s);
  s = walk(s, STAMPS[1]);
  s = lift(s);
  s = walk(s, STAMPS[2]);
  s = turn(s);
  s = walk(s, [14, 2]);
  s = act(s, "deliver");
  assert.equal(s.phase, "won");
  assert.equal(s.core, "beacon");
  assert.equal(s.stamps.length, 3);
  assert.equal(s.recoveries, 0);
  assert.ok(s.steps > 50);
  assert.equal(s.checkpoint, 3);
});
test("Gaps, height differences, and the post office prevent movement", () => {
  const s = begin();
  assert.equal(heightAt([0, 10], s), null);
  assert.equal(findPath(s.player, [6, 8], s).length, 0);
  assert.equal(findPath([8, 5], [8, 4], s).length, 0);
  const blocked = reducer(
    { ...s, player: [4, 8] },
    { type: "move", to: [5, 8] },
  );
  assert.deepEqual(blocked.player, [4, 8]);
  assert.equal(blocked.steps, 0);
  assert.deepEqual(reducer(s, { type: "move", to: [4, 9] }).player, s.player);
});
test("An unlatched bridge retracts when its single core is removed", () => {
  let s = walk(begin(), [1, 8]);
  s = act(s, "pick");
  s = walk(s, [4, 7]);
  s = act(s, "insert-bridge");
  assert.equal(heightAt([5, 8], s), 0);
  s = act(s, "take-bridge");
  assert.equal(heightAt([5, 8], s), null);
  assert.equal(s.core, "carried");
  assert.equal(s.bridgeLocked, false);
});
test("The turnbridge connects only in the indicated orientation", () => {
  let s = lift(firstBridge(begin()));
  s = walk(s, [10, 3]);
  s = act(s, "insert-turn");
  assert.equal(heightAt([11, 2], s), null);
  s = act(s, "rotate");
  assert.equal(heightAt([11, 2], s), null);
  s = act(s, "rotate");
  assert.equal(heightAt([11, 2], s), 2);
  s = act(s, "rotate");
  assert.equal(heightAt([11, 2], s), null);
});
test("Lift travel requires both the core and the courier aboard", () => {
  let s = firstBridge(begin());
  s = walk(s, [8, 6]);
  s = act(s, "insert-lift");
  assert.ok(!commands(s).some((c) => c.id === "ride"));
  s = walk(s, [8, 5]);
  s = act(s, "ride");
  assert.equal(heightAt(s.player, s), 2);
  s = act(s, "take-lift");
  assert.equal(s.liftHigh, true);
  assert.equal(s.checkpoint, 2);
  assert.ok(findPath(s.player, [10, 3], s).length > 0);
});
test("Checkpoint recovery restores a reachable core at every milestone", () => {
  for (const s of [
    begin(),
    firstBridge(begin()),
    lift(firstBridge(begin())),
    turn(lift(firstBridge(begin()))),
  ]) {
    const restored = reducer({ ...s, stamps: [0] }, { type: "recover" });
    assert.equal(restored.recoveries, 1);
    assert.deepEqual(restored.stamps, [0]);
    assert.notEqual(heightAt(restored.player, restored), null);
    let completed = restored;
    if (completed.checkpoint < 1) completed = firstBridge(completed);
    if (completed.checkpoint < 2) completed = lift(completed);
    if (completed.checkpoint < 3) completed = turn(completed);
    completed = walk(completed, [14, 2]);
    completed = act(completed, "deliver");
    assert.equal(completed.phase, "won");
  }
});
test("Pause freezes gameplay, time, and inventory, then resumes", () => {
  const s = reducer(begin(), { type: "pause" });
  for (const action of [
    { type: "tick" },
    { type: "move", to: [2, 8] },
    { type: "interact", id: "pick" },
    { type: "recover" },
  ])
    assert.equal(reducer(s, action), s);
  assert.equal(reducer(s, { type: "pause" }).phase, "playing");
});
test("Remote interactions cannot skip puzzles and stamps cannot be duplicated", () => {
  let s = begin();
  for (const id of ["deliver", "ride", "lock-bridge", "insert-turn"])
    assert.equal(reducer(s, { type: "interact", id }), s);
  s = walk(s, STAMPS[0]);
  s = walk(s, [1, 6]);
  s = walk(s, STAMPS[0]);
  assert.deepEqual(s.stamps, [0]);
  assert.deepEqual(reducer(s, { type: "reset" }), INITIAL);
});

test("Standing still and fractional destinations never count as steps", () => {
  const s = begin();
  for (const to of [s.player, [2.5, 9], [2, 9.5]]) {
    const next = reducer(s, { type: "move", to });
    assert.deepEqual(next.player, s.player);
    assert.equal(next.steps, 0);
  }
});
