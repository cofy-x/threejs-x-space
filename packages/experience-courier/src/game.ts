export type Point = readonly [number, number];
export type Core =
  "ground" | "carried" | "bridge" | "lift" | "turntable" | "beacon";
export type Phase = "ready" | "playing" | "paused" | "won";
export interface Game {
  phase: Phase;
  player: Point;
  core: Core;
  bridgeLocked: boolean;
  liftHigh: boolean;
  turn: number;
  turnLocked: boolean;
  stamps: number[];
  steps: number;
  recoveries: number;
  seconds: number;
  checkpoint: number;
  message: string;
}
export const STAMPS: Point[] = [
  [0, 6],
  [10, 10],
  [6, 1],
];
export const STATIONS = {
  parcel: [1, 8],
  bridge: [4, 7],
  lockBridge: [6, 7],
  lift: [8, 5],
  turntable: [10, 3],
  lockTurn: [12, 3],
  beacon: [14, 2],
} as const;
export const INITIAL: Game = {
  phase: "ready",
  player: [2, 9],
  core: "ground",
  bridgeLocked: false,
  liftHigh: false,
  turn: 0,
  turnLocked: false,
  stamps: [],
  steps: 0,
  recoveries: 0,
  seconds: 0,
  checkpoint: 0,
  message: "A little courier. One very important delivery.",
};
export const equal = (a: Point, b: Point) => a[0] === b[0] && a[1] === b[1];
const near = (a: Point, b: Point) =>
  Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) <= 1;
const rect = (
  x: number,
  z: number,
  a: number,
  b: number,
  c: number,
  d: number,
) => x >= a && x <= b && z >= c && z <= d;
export function heightAt(p: Point, s: Game): number | null {
  const [x, z] = p;
  if (!Number.isInteger(x) || !Number.isInteger(z)) return null;
  if ((x === 0 && z === 10) || (x === 6 && z === 10) || (x === 6 && z === 4))
    return null;
  if (rect(x, z, 0, 4, 6, 10) || rect(x, z, 6, 10, 6, 10)) return 0;
  if (rect(x, z, 6, 10, 1, 4) || rect(x, z, 12, 15, 1, 4)) {
    if (z === 1 && x >= 14) return null;
    return 2;
  }
  if (x === 5 && z === 8 && (s.core === "bridge" || s.bridgeLocked)) return 0;
  if (x === 8 && z === 5) return s.liftHigh ? 2 : 0;
  if (
    x === 11 &&
    z === 2 &&
    (s.turnLocked || (s.core === "turntable" && s.turn === 2))
  )
    return 2;
  return null;
}
export function canStep(a: Point, b: Point, s: Game) {
  const h1 = heightAt(a, s),
    h2 = heightAt(b, s);
  return (
    !equal(a, b) &&
    near(a, b) &&
    h1 !== null &&
    h2 !== null &&
    Math.abs(h1 - h2) < 0.1
  );
}
export function findPath(from: Point, to: Point, s: Game): Point[] {
  if (heightAt(to, s) === null) return [];
  const queue: { p: Point; path: Point[] }[] = [{ p: from, path: [] }];
  const seen = new Set([from.join(",")]);
  for (const node of queue) {
    if (equal(node.p, to)) return node.path;
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as Point[]) {
      const p: Point = [node.p[0] + dx, node.p[1] + dz];
      if (!seen.has(p.join(",")) && canStep(node.p, p, s)) {
        seen.add(p.join(","));
        queue.push({ p, path: [...node.path, p] });
      }
    }
  }
  return [];
}
export type Interaction =
  | "pick"
  | "insert-bridge"
  | "take-bridge"
  | "lock-bridge"
  | "insert-lift"
  | "take-lift"
  | "ride"
  | "insert-turn"
  | "take-turn"
  | "rotate"
  | "lock-turn"
  | "deliver";
export interface Command {
  id: Interaction;
  label: string;
}
export function commands(s: Game): Command[] {
  if (s.phase !== "playing") return [];
  const result: Command[] = [];
  const at = (p: Point) =>
    near(s.player, p) && heightAt(s.player, s) === heightAt(p, s);
  const add = (id: Interaction, label: string) => result.push({ id, label });
  if (at(STATIONS.parcel) && s.core === "ground")
    add("pick", "Pick up the core");
  if (at(STATIONS.lockBridge) && !s.bridgeLocked && s.core === "bridge")
    add("lock-bridge", "Lock the bridge");
  if (at(STATIONS.bridge)) {
    if (s.core === "carried" && !s.bridgeLocked)
      add("insert-bridge", "Power the bridge");
    if (s.core === "bridge") add("take-bridge", "Take back the core");
  }
  if (at(STATIONS.lift)) {
    if (s.core === "carried") add("insert-lift", "Power the lift");
    if (s.core === "lift") {
      if (equal(s.player, STATIONS.lift) && !s.liftHigh)
        add("ride", "Ride to the terrace");
      add("take-lift", "Take back the core");
      if (equal(s.player, STATIONS.lift) && s.liftHigh)
        add("ride", "Ride down");
    }
  }
  if (
    at(STATIONS.lockTurn) &&
    !s.turnLocked &&
    s.core === "turntable" &&
    s.turn === 2
  )
    add("lock-turn", "Lock the turnbridge");
  if (at(STATIONS.turntable)) {
    if (s.core === "carried" && !s.turnLocked)
      add("insert-turn", "Power the turnbridge");
    if (s.core === "turntable") {
      if (!s.turnLocked) add("rotate", "Rotate the bridge");
      add("take-turn", "Take back the core");
    }
  }
  if (at(STATIONS.beacon) && s.core === "carried")
    add("deliver", "Light the lighthouse");
  return result;
}
export function objective(s: Game): [string, string, number] {
  if (s.phase === "won")
    return [
      "A light in the clouds.",
      "Special delivery, beautifully delivered.",
      4,
    ];
  if (!s.bridgeLocked)
    return [
      "Cross the drawbridge",
      s.core === "ground"
        ? "Find the amber core at the post office."
        : s.core === "bridge"
          ? "Cross the bridge and pull the brass locking lever."
          : "Carry the core to the amber socket by the gap.",
      0,
    ];
  if (s.core === "bridge")
    return [
      "Bring your energy with you",
      "The bridge is locked. Go back and retrieve the core.",
      0,
    ];
  if (!s.liftHigh)
    return [
      "Catch a lift",
      s.core === "lift"
        ? "Step onto the round lift, then ride to the terrace."
        : "Take the core to the round lift at the back of the garden.",
      1,
    ];
  if (s.core === "lift")
    return [
      "Next stop: the terrace",
      "Take the core out of the lift. The platform stays here.",
      1,
    ];
  if (!s.turnLocked)
    return [
      "Find the right direction",
      s.core === "turntable"
        ? s.turn === 2
          ? "The bridge is aligned. Cross over and lock it."
          : "Rotate the powered bridge until it points to the lighthouse."
        : "Power the terrace socket to turn the last bridge.",
      2,
    ];
  if (s.core === "turntable")
    return [
      "One last trip back",
      "Retrieve the core. The turnbridge will stay locked.",
      2,
    ];
  return [
    "Deliver a little daylight",
    "Bring the core to the lighthouse socket.",
    3,
  ];
}
export type Action =
  | { type: "start" | "pause" | "reset" | "recover" | "tick" }
  | { type: "move"; to: Point }
  | { type: "interact"; id: Interaction };
export function reducer(s: Game, action: Action): Game {
  if (action.type === "reset") return { ...INITIAL, stamps: [] };
  if (action.type === "start" && s.phase === "ready")
    return {
      ...s,
      phase: "playing",
      message: "Click a walkway to move. Find your glowing parcel.",
    };
  if (action.type === "pause")
    return s.phase === "playing"
      ? { ...s, phase: "paused" }
      : s.phase === "paused"
        ? { ...s, phase: "playing" }
        : s;
  if (s.phase !== "playing") return s;
  if (action.type === "tick") return { ...s, seconds: s.seconds + 1 };
  if (action.type === "recover") {
    const point: Point =
      s.checkpoint >= 3
        ? [12, 3]
        : s.checkpoint >= 2
          ? [8, 4]
          : s.checkpoint >= 1
            ? [6, 8]
            : [2, 9];
    return {
      ...s,
      player: point,
      core: s.checkpoint ? "carried" : "ground",
      liftHigh: s.checkpoint >= 2,
      bridgeLocked: s.checkpoint >= 1,
      turnLocked: s.checkpoint >= 3,
      turn: s.checkpoint >= 3 ? 2 : 0,
      recoveries: s.recoveries + 1,
      message: "Back at your checkpoint. Your parcel is safe.",
    };
  }
  if (action.type === "move") {
    if (!canStep(s.player, action.to, s))
      return {
        ...s,
        message: "No walkway here yet. Try powering the nearby mechanism.",
      };
    const stamp = STAMPS.findIndex((p) => equal(p, action.to));
    const found = stamp >= 0 && !s.stamps.includes(stamp);
    return {
      ...s,
      player: action.to,
      steps: s.steps + 1,
      stamps: found ? [...s.stamps, stamp] : s.stamps,
      message: found
        ? "A sky-mail stamp! A little reward for taking the scenic route."
        : s.message,
    };
  }
  if (
    action.type !== "interact" ||
    !commands(s).some((c) => c.id === action.id)
  )
    return s;
  switch (action.id) {
    case "pick":
      return {
        ...s,
        core: "carried",
        message: "Precious cargo aboard. One core powers one machine.",
      };
    case "insert-bridge":
      return {
        ...s,
        core: "bridge",
        message:
          "Bridge lowering. Leave the core here and find the lever across the gap.",
      };
    case "take-bridge":
      return {
        ...s,
        core: "carried",
        message: s.bridgeLocked
          ? "Bridge secured. On to the garden lift!"
          : "Without power or a lock, the bridge folds away.",
      };
    case "lock-bridge":
      return {
        ...s,
        bridgeLocked: true,
        checkpoint: Math.max(1, s.checkpoint),
        message: "Click! The bridge stays open. Go back for your core.",
      };
    case "insert-lift":
      return {
        ...s,
        core: "lift",
        message: "Lift ready. Step onto the circular platform to travel.",
      };
    case "take-lift":
      return {
        ...s,
        core: "carried",
        checkpoint: s.liftHigh ? Math.max(2, s.checkpoint) : s.checkpoint,
        message: "Core recovered. The lift holds its position without power.",
      };
    case "ride":
      return {
        ...s,
        liftHigh: !s.liftHigh,
        message: s.liftHigh
          ? "Returning to the garden."
          : "Welcome to the terrace. Remember to take your core.",
      };
    case "insert-turn":
      return {
        ...s,
        core: "turntable",
        message: "Turnbridge powered. Rotate it toward the opposite landing.",
      };
    case "rotate":
      return {
        ...s,
        turn: (s.turn + 1) % 4,
        message:
          (s.turn + 1) % 4 === 2
            ? "Perfect alignment! Cross the bridge and secure the lever."
            : "Not aligned yet. Turn it another quarter.",
      };
    case "take-turn":
      return {
        ...s,
        core: "carried",
        message: s.turnLocked
          ? "Last stop: the lighthouse."
          : "The turnbridge needs power until it is locked.",
      };
    case "lock-turn":
      return {
        ...s,
        turnLocked: true,
        checkpoint: 3,
        message: "Turnbridge locked. Retrieve the core for your delivery.",
      };
    case "deliver":
      return {
        ...s,
        core: "beacon",
        phase: "won",
        message: "Delivery complete. The sky has its lighthouse back.",
      };
  }
}
