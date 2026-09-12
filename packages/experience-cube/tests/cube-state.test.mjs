import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

// Use the package's existing compiler so tests also run on Node 20.
const source = readFileSync(
  new URL("../src/cube-state.ts", import.meta.url),
  "utf8",
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
  },
});
const {
  solvedCubies,
  applyMove,
  makeScramble,
  invertMoves,
  cubeAtMove,
  isSolved,
} = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);

const faces = [
  { axis: "x", layer: 1, turns: -1, notation: "R" },
  { axis: "x", layer: -1, turns: 1, notation: "L" },
  { axis: "y", layer: 1, turns: -1, notation: "U" },
  { axis: "y", layer: -1, turns: 1, notation: "D" },
  { axis: "z", layer: 1, turns: -1, notation: "F" },
  { axis: "z", layer: -1, turns: 1, notation: "B" },
];

const replay = (moves, state = solvedCubies()) =>
  moves.reduce(applyMove, state);

test("the initial cube has 27 unique integer positions and 54 outward stickers", () => {
  const state = solvedCubies();
  assert.equal(state.length, 27);
  assert.equal(new Set(state.map((piece) => piece.position.join())).size, 27);
  assert.equal(
    state.reduce(
      (sum, piece) => sum + piece.home.filter((value) => value !== 0).length,
      0,
    ),
    54,
  );
  assert.ok(isSolved(state));
  assert.equal(isSolved([]), false);
  assert.equal(isSolved(Array(27).fill(state[0])), false);
});

for (const face of faces) {
  test(`${face.notation} moves exactly one layer and its inverse restores the complete state`, () => {
    const initial = solvedCubies();
    const moved = applyMove(initial, face);
    assert.equal(isSolved(moved), false);
    assert.equal(
      moved.filter(
        (piece, index) =>
          JSON.stringify(piece) !== JSON.stringify(initial[index]),
      ).length,
      9,
    );
    assert.deepEqual(replay(invertMoves([face]), moved), initial);
    assert.deepEqual(initial, solvedCubies());
  });

  test(`four ${face.notation} quarter turns and two half turns restore all transforms`, () => {
    assert.deepEqual(replay(Array(4).fill(face)), solvedCubies());
    assert.deepEqual(
      replay(Array(2).fill({ ...face, turns: face.turns * 2 })),
      solvedCubies(),
    );
  });
}

test("clockwise notation uses the outward-facing convention", () => {
  const positions = [
    [1, 1, -1],
    [-1, -1, 1],
    [-1, 1, 1],
    [1, -1, -1],
    [1, -1, 1],
    [-1, 1, -1],
  ];
  for (const [index, face] of faces.entries()) {
    const home = [1, 1, 1];
    home[{ x: 0, y: 1, z: 2 }[face.axis]] = face.layer;
    const piece = applyMove(solvedCubies(), face).find(
      (cubie) => cubie.id === home.join(),
    );
    assert.deepEqual(piece.position, positions[index], face.notation);
  }
});

test("seeded scrambles are deterministic and their inverse returns the exact original state", () => {
  for (const seed of [0, 1, 42, 2026, "Mochi", "midnight"]) {
    const scramble = makeScramble(seed);
    assert.equal(scramble.length, 18);
    assert.deepEqual(scramble, makeScramble(seed));
    for (let index = 1; index < scramble.length; index++) {
      assert.notEqual(scramble[index].axis, scramble[index - 1].axis);
    }
    assert.equal(isSolved(replay(scramble)), false);
    assert.deepEqual(
      replay([...scramble, ...invertMoves(scramble)]),
      solvedCubies(),
    );
    assert.deepEqual(invertMoves(invertMoves(scramble)), scramble);
  }
  assert.notDeepEqual(makeScramble(11), makeScramble(12));
  assert.deepEqual(makeScramble(0, 0), []);
});

test("long sequences preserve piece identity, the grid, unit rotations, and outward sticker normals", () => {
  let state = solvedCubies();
  for (const move of makeScramble(123, 500)) {
    state = applyMove(state, move);
    assert.equal(new Set(state.map((piece) => piece.position.join())).size, 27);
    for (const piece of state) {
      assert.ok(
        piece.position.every((coordinate) => [-1, 0, 1].includes(coordinate)),
      );
      assert.equal(piece.id, piece.home.join());
      assert.ok(Math.abs(Math.hypot(...piece.orientation) - 1) < 1e-12);
      // Independently rotate each original sticker's normal with a matrix.
      const [x, y, z, w] = piece.orientation;
      const matrix = [
        [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
        [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
        [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
      ];
      for (let homeAxis = 0; homeAxis < 3; homeAxis++) {
        if (!piece.home[homeAxis]) continue;
        const normal = matrix.map((row) =>
          Math.round(row[homeAxis] * piece.home[homeAxis]),
        );
        const worldAxis = normal.findIndex((value) => Math.abs(value) === 1);
        assert.notEqual(worldAxis, -1);
        assert.equal(piece.position[worldAxis], normal[worldAxis]);
      }
    }
  }
});

test("seeking reconstructs exactly the completed turns and safely clamps timeline input", () => {
  const scramble = makeScramble(99);
  const solution = invertMoves(scramble);
  let expected = replay(scramble);
  for (let completed = 0; completed <= solution.length; completed++) {
    assert.deepEqual(cubeAtMove(scramble, solution, completed), expected);
    if (completed < solution.length)
      expected = applyMove(expected, solution[completed]);
  }
  assert.deepEqual(cubeAtMove(scramble, solution, -10), replay(scramble));
  assert.deepEqual(cubeAtMove(scramble, solution, NaN), replay(scramble));
  assert.deepEqual(
    cubeAtMove(scramble, solution, 2.9),
    cubeAtMove(scramble, solution, 2),
  );
  assert.deepEqual(cubeAtMove(scramble, solution, 999), solvedCubies());
});

test("solved status ignores the invisible orientation of a face center", () => {
  const state = solvedCubies();
  const center = state.find((piece) => piece.id === "0,1,0");
  center.orientation = [0, Math.SQRT1_2, 0, Math.SQRT1_2];
  assert.ok(isSolved(state));
  center.orientation = [Math.SQRT1_2, 0, 0, Math.SQRT1_2];
  assert.equal(isSolved(state), false);
});

test("invalid move and scramble input fails before corrupting the cube", () => {
  for (const turns of [NaN, Infinity, 0.5]) {
    assert.throws(
      () => applyMove(solvedCubies(), { ...faces[0], turns }),
      RangeError,
    );
  }
  assert.throws(
    () => applyMove(solvedCubies(), { ...faces[0], layer: 0 }),
    RangeError,
  );
  assert.throws(() => makeScramble(Infinity), RangeError);
  assert.throws(() => makeScramble(1, -1), RangeError);
  assert.throws(() => makeScramble(1, 0.5), RangeError);
});
