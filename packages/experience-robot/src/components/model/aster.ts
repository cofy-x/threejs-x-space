import {
  Group,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Vector3,
} from "three";
import type { SystemId } from "../../state/lab";
import {
  batchSurfaces,
  box,
  cable,
  cylinder,
  label,
  ring,
  shell,
} from "./geometry";
import type { Point } from "./geometry";

export interface MovingAssembly {
  group: Group;
  home: Vector3;
  offset: Vector3;
  stage: "shell" | "assembly";
}

export interface AsterRig {
  root: Group;
  head: Group;
  arms: { shoulder: Group; elbow: Group; fingers: Group[]; side: number }[];
  assemblies: MovingAssembly[];
  emitters: Record<SystemId, MeshStandardMaterial>;
  circuits: MeshStandardMaterial[];
}

function materials() {
  return {
    ceramic: new MeshPhysicalMaterial({
      color: "#d6ddda",
      roughness: 0.28,
      metalness: 0.18,
      clearcoat: 0.4,
      clearcoatRoughness: 0.3,
    }),
    inset: new MeshStandardMaterial({
      color: "#9eafaf",
      metalness: 0.6,
      roughness: 0.32,
    }),
    frame: new MeshStandardMaterial({
      color: "#151f27",
      metalness: 0.72,
      roughness: 0.36,
    }),
    titanium: new MeshStandardMaterial({
      color: "#82969b",
      metalness: 0.92,
      roughness: 0.23,
    }),
    rubber: new MeshStandardMaterial({
      color: "#0b1115",
      metalness: 0.05,
      roughness: 0.83,
    }),
    orange: new MeshStandardMaterial({
      color: "#ea7138",
      metalness: 0.32,
      roughness: 0.32,
    }),
    glass: new MeshPhysicalMaterial({
      color: "#071821",
      metalness: 0.65,
      roughness: 0.1,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
    }),
    vision: new MeshStandardMaterial({
      color: "#7bdde4",
      emissive: "#63d9e9",
      emissiveIntensity: 0.1,
      roughness: 0.2,
      metalness: 0.3,
    }),
    power: new MeshStandardMaterial({
      color: "#82e0df",
      emissive: "#68d8dd",
      emissiveIntensity: 0.1,
      roughness: 0.2,
      metalness: 0.35,
    }),
    motion: new MeshStandardMaterial({
      color: "#eecbb0",
      emissive: "#ee9b5d",
      emissiveIntensity: 0.05,
      roughness: 0.3,
    }),
  };
}

type Materials = ReturnType<typeof materials>;

function group(parent: Group, position: Point, system: SystemId): Group {
  const child = new Group();
  child.position.set(...position);
  child.userData.system = system;
  parent.add(child);
  return child;
}

function fasteners(
  parent: Group,
  locations: Point[],
  m: Materials,
  axis: "x" | "y" | "z" = "z",
) {
  locations.forEach((p) => {
    cylinder(parent, 0.026, 0.014, p, m.titanium, axis);
  });
}

function joint(
  parent: Group,
  radius: number,
  position: Point,
  m: Materials,
  axis: "x" | "y" | "z" = "x",
) {
  cylinder(parent, radius, radius * 1.4, position, m.frame, axis);
  ring(parent, radius * 0.84, 0.017, position, m.titanium, axis);
  const end: Point = [...position];
  end[axis === "x" ? 0 : axis === "y" ? 1 : 2] += radius * 0.73;
  cylinder(parent, radius * 0.64, 0.025, end, m.titanium, axis);
  cylinder(parent, radius * 0.3, 0.036, end, m.frame, axis);
}

function buildHead(root: Group, m: Materials): Group {
  const head = group(root, [0, 4.02, 0], "vision");
  box(head, [0.83, 0.43, 0.58], [0, 0.08, 0], m.frame, 0.12);
  shell(
    head,
    [
      [-0.43, -0.1],
      [-0.47, 0.15],
      [-0.32, 0.3],
      [0.32, 0.3],
      [0.47, 0.15],
      [0.43, -0.1],
    ],
    0.45,
    [0, 0.07, -0.055],
    m.ceramic,
    0.055,
  );
  box(head, [0.79, 0.225, 0.13], [0, 0.085, 0.286], m.glass, 0.065);
  box(head, [0.61, 0.026, 0.02], [0, 0.25, 0.32], m.orange, 0.008);
  for (const side of [-1, 1]) {
    box(head, [0.19, 0.036, 0.016], [side * 0.21, 0.09, 0.36], m.vision, 0.01);
    box(
      head,
      [0.07, 0.009, 0.01],
      [side * 0.21, 0.033, 0.357],
      m.vision,
      0.003,
    );
    cylinder(head, 0.115, 0.055, [side * 0.474, 0.08, -0.015], m.frame, "x");
    ring(head, 0.083, 0.012, [side * 0.51, 0.08, -0.015], m.orange, "x");
    for (let i = 0; i < 3; i++)
      box(
        head,
        [0.02, 0.075, 0.15],
        [side * 0.432, 0.14, -0.16 + i * 0.065],
        m.titanium,
        0.005,
      );
  }
  shell(
    head,
    [
      [-0.29, 0.035],
      [-0.22, -0.1],
      [0.22, -0.1],
      [0.29, 0.035],
    ],
    0.18,
    [0, -0.135, 0.09],
    m.ceramic,
    0.025,
  );
  cylinder(head, 0.17, 0.29, [0, -0.28, 0], m.frame);
  for (let i = 0; i < 3; i++)
    ring(head, 0.173, 0.018, [0, -0.23 - i * 0.064, 0], m.titanium, "y");
  label(head, "A / 04", [0.23, 0.057], [0, 0.28, 0.204]);
  return head;
}

function buildTorso(
  root: Group,
  m: Materials,
  assemblies: MovingAssembly[],
  circuits: MeshStandardMaterial[],
) {
  const body = group(root, [0, 3.13, 0], "power");
  shell(
    body,
    [
      [-0.38, -0.5],
      [-0.64, 0.39],
      [-0.49, 0.58],
      [0.49, 0.58],
      [0.64, 0.39],
      [0.38, -0.5],
    ],
    0.48,
    [0, 0, 0],
    m.frame,
    0.08,
  );
  box(body, [1.06, 0.11, 0.37], [0, 0.59, 0], m.titanium, 0.03);
  for (let i = 0; i < 5; i++) {
    box(
      body,
      [0.78 - i * 0.06, 0.045, 0.4],
      [0, -0.29 - i * 0.083, -0.02],
      m.titanium,
      0.012,
    );
  }
  cylinder(body, 0.275, 0.14, [0, 0.05, 0.29], m.titanium, "z");
  cylinder(body, 0.226, 0.16, [0, 0.05, 0.3], m.frame, "z");
  circuits.forEach((material, i) => {
    const sector = ring(
      body,
      0.187,
      0.019,
      [0, 0.05, 0.392],
      material,
      "z",
      Math.PI * 0.59,
    );
    sector.rotation.z = (i / 3) * Math.PI * 2;
  });
  ring(body, 0.25, 0.012, [0, 0.05, 0.365], m.orange);
  cylinder(body, 0.13, 0.045, [0, 0.05, 0.379], m.glass, "z");
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const blade = box(
      body,
      [0.022, 0.06, 0.022],
      [Math.sin(angle) * 0.15, 0.05 + Math.cos(angle) * 0.15, 0.406],
      circuits[Math.floor(i / 4)] ?? m.power,
      0.004,
    );
    blade.rotation.z = -angle;
  }
  for (const side of [-1, 1]) {
    const panel = group(body, [side * 0.38, 0.075, 0.31], "power");
    shell(
      panel,
      [
        [-0.16, -0.38],
        [-0.25, 0.28],
        [-0.19, 0.41],
        [0.16, 0.36],
        [0.21, -0.26],
        [0.12, -0.42],
      ],
      0.15,
      [0, 0, 0],
      m.ceramic,
      0.035,
    );
    panel.rotation.z = side * -0.13;
    assemblies.push({
      group: panel,
      home: panel.position.clone(),
      offset: new Vector3(side * 0.44, 0.03, 0.76),
      stage: "shell",
    });
    box(panel, [0.19, 0.021, 0.011], [0, 0.23, 0.117], m.orange, 0.003);
    fasteners(
      panel,
      [
        [-0.12, 0.32, 0.118],
        [0.12, -0.28, 0.118],
      ],
      m,
    );
    label(panel, side < 0 ? "ASTER" : "04", [0.2, 0.05], [0, 0.13, 0.116]);
    cable(
      body,
      [
        [side * 0.43, 0.48, -0.1],
        [side * 0.68, 0.2, -0.1],
        [side * 0.45, -0.49, -0.15],
      ],
      0.033,
      m.rubber,
    );
    cable(
      body,
      [
        [side * 0.2, -0.4, 0.15],
        [side * 0.22, -0.64, 0.2],
        [side * 0.17, -0.78, 0],
      ],
      0.027,
      m.orange,
    );
  }
  const pack = group(body, [0, 0.07, -0.36], "power");
  box(pack, [0.74, 0.99, 0.25], [0, 0, 0], m.ceramic, 0.08);
  box(pack, [0.59, 0.67, 0.12], [0, 0.04, -0.17], m.frame, 0.025);
  for (let i = 0; i < 9; i++)
    box(
      pack,
      [0.5, 0.026, 0.15],
      [0, 0.3 - i * 0.064, -0.22],
      m.titanium,
      0.005,
    );
  box(pack, [0.37, 0.045, 0.024], [0, -0.42, -0.14], m.orange, 0.01);
  assemblies.push({
    group: pack,
    home: pack.position.clone(),
    offset: new Vector3(0, 0, -0.85),
    stage: "shell",
  });
  assemblies.push({
    group: body,
    home: body.position.clone(),
    offset: new Vector3(0, 0.22, 0),
    stage: "assembly",
  });
  const spine = group(root, [0, 2.46, -0.035], "power");
  cylinder(spine, 0.19, 0.52, [0, 0, 0], m.frame);
  for (let i = 0; i < 3; i++)
    box(
      spine,
      [0.49 - i * 0.035, 0.09, 0.38],
      [0, 0.14 - i * 0.12, 0],
      m.inset,
      0.035,
    );
}

function buildArm(
  root: Group,
  side: number,
  m: Materials,
  assemblies: MovingAssembly[],
) {
  const shoulder = group(root, [side * 0.85, 3.47, 0], "motion");
  joint(shoulder, 0.205, [0, 0, 0], m);
  const armor = group(shoulder, [side * 0.055, 0.02, 0], "motion");
  box(armor, [0.46, 0.41, 0.53], [side * 0.075, 0.02, 0], m.ceramic, 0.12);
  box(armor, [0.29, 0.049, 0.018], [side * 0.09, 0.08, 0.273], m.orange, 0.012);
  label(
    armor,
    side < 0 ? "L / 04" : "R / 04",
    [0.22, 0.052],
    [side * 0.085, -0.05, 0.273],
  );
  assemblies.push({
    group: armor,
    home: armor.position.clone(),
    offset: new Vector3(side * 0.38, 0.17, 0),
    stage: "shell",
  });
  cylinder(shoulder, 0.082, 0.5, [0, -0.42, 0], m.titanium);
  box(
    shoulder,
    [0.25, 0.39, 0.26],
    [0.025 * side, -0.41, 0.028],
    m.ceramic,
    0.07,
  );
  for (const x of [-0.08, 0.08])
    cylinder(shoulder, 0.025, 0.39, [x, -0.44, -0.13], m.titanium);
  cable(
    shoulder,
    [
      [side * 0.13, -0.13, -0.11],
      [side * 0.23, -0.4, -0.15],
      [side * 0.1, -0.68, -0.1],
    ],
    0.026,
    m.rubber,
  );
  const elbow = group(shoulder, [0, -0.78, 0], "motion");
  joint(elbow, 0.135, [0, 0, 0], m);
  cylinder(elbow, 0.085, 0.55, [0, -0.35, 0], m.frame);
  shell(
    elbow,
    [
      [-0.13, -0.3],
      [-0.19, 0.2],
      [-0.12, 0.29],
      [0.12, 0.29],
      [0.19, 0.2],
      [0.13, -0.3],
    ],
    0.22,
    [0, -0.34, 0.055],
    m.ceramic,
    0.05,
  );
  box(elbow, [0.085, 0.32, 0.019], [0, -0.29, 0.208], m.frame, 0.018);
  box(elbow, [0.018, 0.23, 0.013], [0, -0.27, 0.223], m.motion, 0.005);
  ring(elbow, 0.12, 0.025, [0, -0.64, 0], m.orange, "y");
  const hand = group(elbow, [0, -0.8, 0.04], "motion");
  box(hand, [0.245, 0.21, 0.17], [0, 0, 0], m.frame, 0.045);
  box(hand, [0.2, 0.14, 0.043], [0, 0.014, 0.104], m.ceramic, 0.026);
  const fingers: Group[] = [];
  for (let i = 0; i < 3; i++) {
    const finger = group(hand, [(i - 1) * 0.09, -0.105, 0.007], "motion");
    cylinder(finger, 0.035, 0.069, [0, -0.022, 0], m.titanium, "x");
    box(finger, [0.058, 0.15, 0.065], [0, -0.095, 0.013], m.inset, 0.021);
    box(finger, [0.06, 0.09, 0.071], [0, -0.198, 0.051], m.rubber, 0.025);
    fingers.push(finger);
  }
  assemblies.push({
    group: shoulder,
    home: shoulder.position.clone(),
    offset: new Vector3(side * 0.88, 0.02, 0),
    stage: "assembly",
  });
  return { shoulder, elbow, fingers, side };
}

function buildLeg(
  root: Group,
  side: number,
  m: Materials,
  assemblies: MovingAssembly[],
) {
  const leg = group(root, [side * 0.325, 2.0, 0], "motion");
  joint(leg, 0.18, [0, 0, 0], m);
  cylinder(leg, 0.1, 0.64, [0, -0.4, -0.01], m.titanium);
  shell(
    leg,
    [
      [-0.14, -0.29],
      [-0.21, 0.24],
      [-0.13, 0.35],
      [0.15, 0.33],
      [0.21, 0.22],
      [0.13, -0.29],
    ],
    0.23,
    [0, -0.41, 0.1],
    m.ceramic,
    0.05,
  );
  box(leg, [0.13, 0.025, 0.014], [0, -0.31, 0.265], m.orange, 0.006);
  for (const x of [-0.14, 0.14])
    cylinder(leg, 0.036, 0.58, [x, -0.4, -0.12], m.frame);
  joint(leg, 0.16, [0, -0.86, 0], m);
  box(leg, [0.23, 0.18, 0.14], [0, -0.86, 0.135], m.frame, 0.042);
  box(leg, [0.15, 0.022, 0.013], [0, -0.83, 0.214], m.motion, 0.005);
  const shin = group(leg, [0, -1.25, 0], "motion");
  cylinder(shin, 0.075, 0.61, [0, 0, 0], m.titanium);
  shell(
    shin,
    [
      [-0.115, -0.28],
      [-0.16, 0.27],
      [0.16, 0.27],
      [0.115, -0.28],
    ],
    0.16,
    [0, 0, 0.15],
    m.ceramic,
    0.045,
  );
  for (const x of [-0.13, 0.13]) {
    cylinder(shin, 0.04, 0.51, [x, 0.02, -0.1], m.frame);
    cylinder(shin, 0.022, 0.37, [x, -0.16, -0.1], m.titanium);
  }
  box(shin, [0.025, 0.32, 0.022], [0, -0.005, 0.256], m.inset, 0.006);
  joint(leg, 0.105, [0, -1.69, 0], m);
  box(leg, [0.43, 0.105, 0.76], [0, -1.865, 0.17], m.rubber, 0.045);
  box(leg, [0.4, 0.2, 0.64], [0, -1.745, 0.16], m.ceramic, 0.065);
  box(leg, [0.29, 0.05, 0.13], [0, -1.78, 0.48], m.titanium, 0.018);
  for (let i = 0; i < 3; i++)
    box(
      leg,
      [0.29, 0.014, 0.021],
      [0, -1.627, 0.29 + i * 0.065],
      m.frame,
      0.004,
    );
  assemblies.push({
    group: leg,
    home: leg.position.clone(),
    offset: new Vector3(side * 0.45, -0.03, 0.22),
    stage: "assembly",
  });
}

export function createAster(): AsterRig {
  const m = materials();
  const root = new Group();
  root.position.y = 0.17;
  const assemblies: MovingAssembly[] = [];
  const head = buildHead(root, m);
  assemblies.push({
    group: head,
    home: head.position.clone(),
    offset: new Vector3(0, 0.75, 0),
    stage: "assembly",
  });
  const circuits = [m.power.clone(), m.power.clone(), m.power.clone()];
  buildTorso(root, m, assemblies, circuits);
  const pelvis = group(root, [0, 2.03, 0], "motion");
  shell(
    pelvis,
    [
      [-0.35, -0.16],
      [-0.44, 0.17],
      [-0.31, 0.28],
      [0.31, 0.28],
      [0.44, 0.17],
      [0.35, -0.16],
    ],
    0.37,
    [0, 0, 0],
    m.frame,
    0.055,
  );
  for (const side of [-1, 1]) {
    const hipPlate = box(
      pelvis,
      [0.25, 0.26, 0.11],
      [side * 0.245, 0.025, 0.231],
      m.ceramic,
      0.04,
    );
    hipPlate.rotation.z = side * 0.12;
    cable(
      root,
      [
        [side * 0.3, 2.65, -0.06],
        [side * 0.41, 2.45, -0.15],
        [side * 0.36, 2.16, 0],
      ],
      0.035,
      m.rubber,
    );
    buildLeg(root, side, m, assemblies);
  }
  box(pelvis, [0.1, 0.1, 0.045], [0, 0.07, 0.239], m.orange, 0.02);
  const arms = [-1, 1].map((side) => buildArm(root, side, m, assemblies));
  batchSurfaces(root);
  return {
    root,
    head,
    arms,
    assemblies,
    circuits,
    emitters: { vision: m.vision, power: m.power, motion: m.motion },
  };
}
