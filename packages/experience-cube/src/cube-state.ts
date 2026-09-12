export type Axis = "x" | "y" | "z";
export type Coordinate = [number, number, number];
export type Orientation = [number, number, number, number];

export interface Move {
  axis: Axis;
  layer: -1 | 1;
  /** Right-handed quarter turns about the positive world axis. */
  turns: number;
  notation: string;
}

export interface Cubie {
  id: string;
  position: Coordinate;
  /** A normalized quaternion in Three.js order: x, y, z, w. */
  orientation: Orientation;
  /** Initial coordinates identify the stickers attached to this cubie. */
  home: Coordinate;
}

const axisIndex: Record<Axis, 0 | 1 | 2> = { x: 0, y: 1, z: 2 };
const faces: { axis: Axis; layer: -1 | 1; notation: string }[] = [
  { axis: "x", layer: 1, notation: "R" },
  { axis: "x", layer: -1, notation: "L" },
  { axis: "y", layer: 1, notation: "U" },
  { axis: "y", layer: -1, notation: "D" },
  { axis: "z", layer: 1, notation: "F" },
  { axis: "z", layer: -1, notation: "B" },
];

const positiveModulo = (value: number, divisor: number) =>
  ((value % divisor) + divisor) % divisor;
const cleanZero = (value: number) => (value === 0 ? 0 : value);

/** All 27 pieces, including the unstickered core, have stable identities. */
export function solvedCubies(): Cubie[] {
  const cubies: Cubie[] = [];
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        cubies.push({
          id: `${x},${y},${z}`,
          position: [x, y, z],
          orientation: [0, 0, 0, 1],
          home: [x, y, z],
        });
      }
    }
  }
  return cubies;
}

function rotatePosition(position: Coordinate, axis: Axis): Coordinate {
  const [x, y, z] = position;
  switch (axis) {
    case "x":
      return [x, cleanZero(-z), y];
    case "y":
      return [z, y, cleanZero(-x)];
    case "z":
      return [cleanZero(-y), x, z];
  }
}

function snapQuaternion(value: Orientation): Orientation {
  const length = Math.hypot(...value);
  // Cube rotations form a finite group. Snap its quaternion components to
  // prevent tiny errors accumulating across scrambles, seeks, and replays.
  const components = [0, 0.5, Math.SQRT1_2, 1];
  const snapped = value.map((component) => {
    const normalized = component / length;
    const magnitude = Math.abs(normalized);
    const nearest = components.reduce((best, candidate) =>
      Math.abs(candidate - magnitude) < Math.abs(best - magnitude)
        ? candidate
        : best,
    );
    return cleanZero(Math.sign(normalized) * nearest);
  }) as Orientation;
  // q and -q express the same rotation; use one stable representation.
  const firstNonzero = snapped[3] || snapped[0] || snapped[1] || snapped[2];
  return firstNonzero < 0
    ? (snapped.map((component) => cleanZero(-component)) as Orientation)
    : snapped;
}

function multiplyQuaternion(a: Orientation, b: Orientation): Orientation {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return snapQuaternion([
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ]);
}

/**
 * Commit one legal layer turn without mutating a previous snapshot.
 * Renderers can animate the selected layer from the input snapshot, then
 * replace it with this exact integer-coordinate result at the turn boundary.
 */
export function applyMove(cubies: readonly Cubie[], move: Move): Cubie[] {
  if (
    !(move.axis in axisIndex) ||
    (move.layer !== -1 && move.layer !== 1) ||
    !Number.isSafeInteger(move.turns)
  ) {
    throw new RangeError(
      "A move requires a cube axis, outer layer, and integer quarter turns.",
    );
  }

  const turns = positiveModulo(move.turns, 4);
  const rotation: Orientation = [0, 0, 0, Math.cos((turns * Math.PI) / 4)];
  rotation[axisIndex[move.axis]] = Math.sin((turns * Math.PI) / 4);

  return cubies.map((cubie) => {
    let position: Coordinate = [...cubie.position];
    let orientation: Orientation = [...cubie.orientation];
    if (position[axisIndex[move.axis]] === move.layer && turns !== 0) {
      for (let turn = 0; turn < turns; turn++) {
        position = rotatePosition(position, move.axis);
      }
      orientation = multiplyQuaternion(rotation, orientation);
    }
    return { ...cubie, position, orientation, home: [...cubie.home] };
  });
}

function seedNumber(seed: number | string): number {
  if (typeof seed === "number") {
    if (!Number.isFinite(seed))
      throw new RangeError("The scramble seed must be finite.");
    return Math.trunc(seed) >>> 0;
  }
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index++) {
    hash = Math.imul(hash ^ seed.charCodeAt(index), 16777619);
  }
  return hash >>> 0;
}

/** A repeatable legal scramble, avoiding consecutive turns on the same axis. */
export function makeScramble(seed: number | string, length = 18): Move[] {
  if (!Number.isSafeInteger(length) || length < 0) {
    throw new RangeError("The scramble length must be a nonnegative integer.");
  }
  let state = seedNumber(seed);
  const random = () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  const result: Move[] = [];
  let previousAxis: Axis | undefined;
  for (let index = 0; index < length; index++) {
    const available = faces.filter((face) => face.axis !== previousAxis);
    const face = available[Math.floor(random() * available.length)];
    if (!face) throw new Error("No scramble face is available.");
    const variant = Math.floor(random() * 3);
    const clockwiseTurns = variant === 0 ? 1 : variant === 1 ? -1 : 2;
    result.push({
      axis: face.axis,
      layer: face.layer,
      turns: -face.layer * clockwiseTurns,
      notation:
        face.notation +
        (clockwiseTurns === -1 ? "'" : clockwiseTurns === 2 ? "2" : ""),
    });
    previousAxis = face.axis;
  }
  return result;
}

/** Reverse a known sequence; this is not an arbitrary-state solving algorithm. */
export function invertMoves(moves: readonly Move[]): Move[] {
  return [...moves].reverse().map((move) => ({
    ...move,
    turns: -move.turns,
    notation: move.notation.endsWith("2")
      ? move.notation
      : move.notation.endsWith("'")
        ? move.notation.slice(0, -1)
        : `${move.notation}'`,
  }));
}

/** Reconstruct a seekable snapshot from the scramble and completed replay moves. */
export function cubeAtMove(
  scramble: readonly Move[],
  solution: readonly Move[],
  completedMoves: number,
): Cubie[] {
  const completed = Number.isFinite(completedMoves)
    ? Math.max(0, Math.min(solution.length, Math.trunc(completedMoves)))
    : 0;
  let cubies = solvedCubies();
  for (const move of scramble) cubies = applyMove(cubies, move);
  for (const move of solution.slice(0, completed))
    cubies = applyMove(cubies, move);
  return cubies;
}

function rotateNormal(normal: Coordinate, quaternion: Orientation): Coordinate {
  const [x, y, z] = normal;
  const [qx, qy, qz, qw] = quaternion;
  const tx = 2 * (qy * z - qz * y);
  const ty = 2 * (qz * x - qx * z);
  const tz = 2 * (qx * y - qy * x);
  return [
    Math.round(x + qw * tx + qy * tz - qz * ty),
    Math.round(y + qw * ty + qz * tx - qx * tz),
    Math.round(z + qw * tz + qx * ty - qy * tx),
  ];
}

/** Check visible sticker alignment; a rotated center sticker is still solved. */
export function isSolved(cubies: readonly Cubie[]): boolean {
  if (
    cubies.length !== 27 ||
    new Set(cubies.map((cubie) => cubie.id)).size !== 27
  ) {
    return false;
  }
  return cubies.every((cubie) => {
    if (cubie.position.some((value, index) => value !== cubie.home[index]))
      return false;
    for (const axis of [0, 1, 2] as const) {
      if (cubie.home[axis] === 0) continue;
      const normal: Coordinate = [0, 0, 0];
      normal[axis] = cubie.home[axis];
      const rotated = rotateNormal(normal, cubie.orientation);
      if (rotated.some((value, index) => value !== normal[index])) return false;
    }
    return true;
  });
}
