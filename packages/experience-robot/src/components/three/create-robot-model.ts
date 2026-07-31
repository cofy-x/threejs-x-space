import {
  AdditiveBlending,
  CatmullRomCurve3,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  InstancedMesh,
  LatheGeometry,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Shape,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { BoxGeometry } from "three";
import {
  arrowMarkTexture,
  cachedTexture,
  cautionStripeTexture,
  decalPlane,
  holoDisplayTexture,
  hotLabelTexture,
  lensIrisTexture,
  scaleRingTexture,
  textTexture,
  waveformTexture,
} from "./create-decals";
import { getPartInfos } from "./part-infos";

export interface RobotPartInfo {
  id: string;
  title: string;
  summary: string;
  specs?: { label: string; value: string }[];
}

export interface SculptRuntime {
  parts: Record<string, Group>;
  partInfos: Record<string, RobotPartInfo>;
  materials: Record<string, MeshStandardMaterial | MeshPhysicalMaterial>;
  explode: (amount: number, perPart?: Partial<Record<string, number>>) => void;
}

interface MaterialSet {
  plastic: MeshPhysicalMaterial;
  plasticDark: MeshStandardMaterial;
  metal: MeshStandardMaterial;
  joint: MeshStandardMaterial;
  steel: MeshStandardMaterial;
  rubber: MeshStandardMaterial;
  lens: MeshPhysicalMaterial;
  hexCell: MeshStandardMaterial;
  led: MeshStandardMaterial;
  usb: MeshStandardMaterial;
  dongle: MeshStandardMaterial;
  tipLight: MeshStandardMaterial;
}

function createMaterials(): MaterialSet {
  const plastic = new MeshPhysicalMaterial({
    color: "#dcdbd7",
    roughness: 0.42,
    metalness: 0.0,
    clearcoat: 0.25,
    clearcoatRoughness: 0.35,
  });
  const plasticDark = new MeshStandardMaterial({ color: "#a3a19f", roughness: 0.48, metalness: 0.05 });
  const metal = new MeshStandardMaterial({ color: "#595856", roughness: 0.5, metalness: 0.35 });
  const joint = new MeshStandardMaterial({ color: "#4d4c4b", roughness: 0.55, metalness: 0.75 });
  const steel = new MeshStandardMaterial({ color: "#c4c3c3", roughness: 0.3, metalness: 0.9 });
  const rubber = new MeshStandardMaterial({ color: "#272727", roughness: 0.85, metalness: 0.0 });
  const lens = new MeshPhysicalMaterial({
    color: "#46483c",
    roughness: 0.15,
    metalness: 0.1,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
  });
  const hexCell = new MeshStandardMaterial({ color: "#262626", roughness: 0.7, metalness: 0.2 });
  const led = new MeshStandardMaterial({
    color: "#e8c93c",
    emissive: "#e8c93c",
    emissiveIntensity: 1.4,
    roughness: 0.3,
  });
  const usb = new MeshStandardMaterial({
    color: "#3c6fe1",
    emissive: "#274b9b",
    emissiveIntensity: 0.4,
    roughness: 0.35,
  });
  const dongle = new MeshStandardMaterial({
    color: "#67c8ff",
    emissive: "#2f8fe0",
    emissiveIntensity: 1.2,
    roughness: 0.2,
    metalness: 0.1,
    transparent: true,
    opacity: 0.85,
  });
  const tipLight = new MeshStandardMaterial({
    color: "#e04f4f",
    emissive: "#e04f4f",
    emissiveIntensity: 1.6,
    roughness: 0.3,
  });
  return { plastic, plasticDark, metal, joint, steel, rubber, lens, hexCell, led, usb, dongle, tipLight };
}

type Material = MeshStandardMaterial | MeshPhysicalMaterial;

function mesh(name: string, geometry: BoxGeometry | CylinderGeometry | SphereGeometry | LatheGeometry | RoundedBoxGeometry | ExtrudeGeometry | TorusGeometry | TubeGeometry, material: Material): Mesh {
  const m = new Mesh(geometry, material);
  m.name = name;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function roundedBox(
  name: string,
  w: number,
  h: number,
  d: number,
  material: Material,
  position: [number, number, number],
  radius = 0.02,
): Mesh {
  const m = mesh(name, new RoundedBoxGeometry(w, h, d, 3, radius), material);
  m.position.set(...position);
  return m;
}

function cylinder(
  name: string,
  rTop: number,
  rBottom: number,
  height: number,
  material: Material,
  position: [number, number, number],
  axis: "x" | "y" | "z" = "y",
  segments = 24,
): Mesh {
  const m = mesh(name, new CylinderGeometry(rTop, rBottom, height, segments), material);
  if (axis === "x") m.rotation.z = Math.PI / 2;
  if (axis === "z") m.rotation.x = Math.PI / 2;
  m.position.set(...position);
  return m;
}

function group(name: string, position: [number, number, number]): Group {
  const g = new Group();
  g.name = name;
  g.position.set(...position);
  return g;
}

function chamferedPlate(
  name: string,
  w: number,
  h: number,
  chamfer: number,
  depth: number,
  material: Material,
  position: [number, number, number],
): Mesh {
  const hw = w / 2;
  const hh = h / 2;
  const c = chamfer;
  const shape = new Shape();
  shape.moveTo(-hw + c, -hh);
  shape.lineTo(hw - c, -hh);
  shape.lineTo(hw, -hh + c);
  shape.lineTo(hw, hh - c);
  shape.lineTo(hw - c, hh);
  shape.lineTo(-hw + c, hh);
  shape.lineTo(-hw, hh - c);
  shape.lineTo(-hw, -hh + c);
  shape.closePath();
  const geometry = new ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geometry.translate(0, 0, -depth / 2);
  const m = mesh(name, geometry, material);
  m.position.set(...position);
  return m;
}

function seamPlate(
  name: string,
  w: number,
  h: number,
  material: Material,
  position: [number, number, number],
): Mesh {
  return roundedBox(name, w + 0.02, h + 0.02, 0.03, material, position, 0.012);
}

function bellows(name: string, radius: number, height: number, ridges: number, material: Material): Mesh {
  const points: Vector2[] = [];
  const steps = ridges * 4;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const phase = (t * ridges) % 1;
    const r = radius * (phase < 0.5 ? 0.93 + phase * 0.14 : 1.0 - (phase - 0.5) * 0.14);
    points.push(new Vector2(r, (t - 0.5) * height));
  }
  const m = mesh(name, new LatheGeometry(points, 28), material);
  return m;
}

function coilSpring(
  name: string,
  radius: number,
  height: number,
  turns: number,
  wireRadius: number,
  material: Material,
): Mesh {
  const points: Vector3[] = [];
  const segments = turns * 16;
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const angle = t * turns * Math.PI * 2;
    points.push(new Vector3(Math.cos(angle) * radius, t * height - height / 2, Math.sin(angle) * radius));
  }
  return mesh(name, new TubeGeometry(new CatmullRomCurve3(points), segments, wireRadius, 8), material);
}

function hexGrille(
  name: string,
  width: number,
  height: number,
  cellRadius: number,
  material: Material,
  position: [number, number, number],
): Group {
  const g = group(name, position);
  const stepX = Math.sqrt(3) * cellRadius * 1.2;
  const stepY = 1.5 * cellRadius * 1.2;
  const cols = Math.floor(width / stepX);
  const rows = Math.floor(height / stepY);
  const count = cols * rows;
  const geometry = new CylinderGeometry(cellRadius, cellRadius, 0.014, 6);
  geometry.rotateX(Math.PI / 2);
  const instanced = new InstancedMesh(geometry, material, count);
  instanced.name = `${name}-cells`;
  const matrix = new Matrix4();
  let index = 0;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x = (col - (cols - 1) / 2) * stepX + (row % 2 === 0 ? 0 : stepX / 2);
      const y = (row - (rows - 1) / 2) * stepY;
      matrix.makeTranslation(x, y, 0);
      instanced.setMatrixAt(index, matrix);
      index += 1;
    }
  }
  instanced.instanceMatrix.needsUpdate = true;
  g.add(instanced);
  return g;
}

function screws(
  name: string,
  positions: [number, number][],
  z: number,
  material: Material,
): InstancedMesh {
  const geometry = new CylinderGeometry(0.009, 0.009, 0.008, 12);
  geometry.rotateX(Math.PI / 2);
  const instanced = new InstancedMesh(geometry, material, positions.length);
  instanced.name = name;
  const matrix = new Matrix4();
  positions.forEach(([x, y], i) => {
    matrix.makeTranslation(x, y, z);
    instanced.setMatrixAt(i, matrix);
  });
  instanced.instanceMatrix.needsUpdate = true;
  return instanced;
}

function buildHead(mats: MaterialSet): Group {
  const head = group("head", [0, 3.54, 0]);

  head.add(roundedBox("head-shell", 0.96, 0.4, 0.55, mats.plastic, [0, 0, 0], 0.05));
  head.add(chamferedPlate("faceplate", 0.9, 0.32, 0.07, 0.06, mats.metal, [0, -0.02, 0.27]));

  const screwPositions: [number, number][] = [
    [-0.38, 0.1], [-0.14, 0.1], [0.14, 0.1], [0.38, 0.1],
    [-0.38, -0.13], [-0.14, -0.13], [0.14, -0.13], [0.38, -0.13],
  ];
  head.add(screws("faceplate-screws", screwPositions, 0.295, mats.joint));

  const mainLens = group("main-lens", [0, 0, 0.28]);
  mainLens.add(cylinder("main-lens-bezel", 0.14, 0.14, 0.03, mats.steel, [0, 0, 0], "z", 32));
  mainLens.add(cylinder("main-lens-glass", 0.115, 0.115, 0.035, mats.lens, [0, 0, 0.004], "z", 32));
  mainLens.add(
    decalPlane("main-lens-iris", 0.21, 0.21, cachedTexture("lens-iris", lensIrisTexture), [0, 0, 0.0225], [0, 0, 0], true),
  );
  const domeGeo = new SphereGeometry(0.095, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2);
  domeGeo.rotateX(Math.PI / 2);
  domeGeo.scale(1, 1, 0.55);
  const dome = mesh("main-lens-dome", domeGeo, mats.lens);
  dome.position.set(0, 0, 0.02);
  mainLens.add(dome);
  mainLens.add(cylinder("main-lens-inner", 0.035, 0.035, 0.04, mats.rubber, [0, 0, 0.012], "z", 24));
  head.add(mainLens);

  head.add(decalPlane("label-cam", 0.13, 0.028, cachedTexture("cam-01", () => textTexture("CAM-01")), [0, -0.14, 0.302]));
  head.add(decalPlane("label-rng", 0.08, 0.025, cachedTexture("rng", () => textTexture("RNG")), [0.36, 0.01, 0.302]));
  head.add(decalPlane("align-mark-head", 0.04, 0.055, cachedTexture("arrow-mark", arrowMarkTexture), [0, -0.185, 0.281], [0, 0, Math.PI]));

  head.add(cylinder("blank-cap", 0.095, 0.095, 0.025, mats.plasticDark, [-0.28, 0, 0.295], "z", 28));
  head.add(cylinder("blank-cap-ring", 0.075, 0.075, 0.03, mats.joint, [-0.28, 0, 0.293], "z", 28));

  const secondaryLens = group("secondary-lens", [0.26, 0.01, 0.28]);
  secondaryLens.add(cylinder("secondary-lens-bezel", 0.065, 0.065, 0.03, mats.steel, [0, 0, 0], "z", 24));
  secondaryLens.add(cylinder("secondary-lens-glass", 0.048, 0.048, 0.034, mats.lens, [0, 0, 0.003], "z", 24));
  head.add(secondaryLens);
  head.add(cylinder("sensor-dot", 0.018, 0.018, 0.02, mats.rubber, [0.26, -0.1, 0.285], "z", 12));

  const topVent = group("head-top-vent", [0, 0.18, -0.11]);
  topVent.rotation.x = -0.38;
  topVent.add(roundedBox("head-top-vent-frame", 0.52, 0.3, 0.03, mats.plastic, [0, 0, 0], 0.015));
  topVent.add(roundedBox("head-top-vent-recess", 0.46, 0.24, 0.02, mats.hexCell, [0, 0, 0.01], 0.01));
  topVent.add(hexGrille("head-top-vent-cells", 0.42, 0.21, 0.013, mats.metal, [0, 0, 0.02]));
  head.add(topVent);

  const brain = group("head-brain-unit", [0, 0.01, -0.3]);
  brain.add(roundedBox("brain-body", 0.56, 0.26, 0.1, mats.plastic, [0, 0, 0], 0.025));
  for (let i = 0; i < 7; i += 1) {
    brain.add(roundedBox(`brain-fin-${i}`, 0.012, 0.07, 0.09, mats.steel, [-0.21 + i * 0.07, 0.165, 0], 0.003));
  }
  brain.add(roundedBox("brain-glow-strip", 0.3, 0.02, 0.012, mats.dongle, [0, -0.06, -0.056], 0.004));
  brain.add(cylinder("brain-port-1", 0.02, 0.02, 0.02, mats.joint, [-0.2, -0.06, -0.055], "z", 12));
  brain.add(cylinder("brain-port-2", 0.02, 0.02, 0.02, mats.joint, [0.2, -0.06, -0.055], "z", 12));
  brain.add(screws("brain-screws", [[-0.25, 0.09], [0.25, 0.09], [-0.25, -0.09], [0.25, -0.09]], -0.052, mats.joint));
  brain.add(
    decalPlane(
      "brain-label",
      0.14,
      0.028,
      cachedTexture("cpu-04", () => textTexture("CPU-04", { mirror: true })),
      [0, 0.05, -0.057],
      [0, Math.PI, 0],
    ),
  );
  head.add(brain);

  for (const sx of [-1, 1]) {
    head.add(roundedBox(`head-side-fin-${sx}`, 0.04, 0.24, 0.2, mats.plasticDark, [0.49 * sx, 0, -0.12], 0.015));
    for (let i = 0; i < 3; i += 1) {
      head.add(roundedBox(`head-fin-slot-${sx}-${i}`, 0.008, 0.15, 0.025, mats.joint, [0.515 * sx, 0, -0.17 + i * 0.05], 0.002));
    }
  }

  const stub = group("antenna-stub", [-0.2, 0.2, -0.1]);
  stub.rotation.z = 0.18;
  stub.add(cylinder("antenna-stub-rod", 0.016, 0.02, 0.24, mats.joint, [0, 0.12, 0], "y", 12));
  head.add(stub);

  const whip = group("antenna-whip", [0.28, 0.2, -0.08]);
  whip.add(cylinder("antenna-whip-base", 0.03, 0.035, 0.1, mats.joint, [0, 0.05, 0], "y", 12));
  whip.add(cylinder("antenna-whip-rod", 0.01, 0.012, 0.4, mats.joint, [0, 0.28, 0], "y", 10));
  const tip = mesh("antenna-tip-light", new SphereGeometry(0.014, 12, 10), mats.tipLight);
  tip.position.set(0, 0.49, 0);
  whip.add(tip);
  head.add(whip);

  return head;
}

function buildNeck(mats: MaterialSet): Group {
  const neck = group("neck", [0, 3.3, 0]);
  const b = bellows("neck-bellows", 0.16, 0.14, 4, mats.rubber);
  neck.add(b);
  return neck;
}

function buildTorso(mats: MaterialSet): Group {
  const torso = group("torso", [0, 2.51, 0]);

  torso.add(roundedBox("torso-shell", 1.06, 1.5, 0.6, mats.plastic, [0, 0, 0], 0.04));

  const rivetYs: [number, number][] = [];
  for (let i = 0; i < 6; i += 1) {
    rivetYs.push([-0.5, -0.6 + i * 0.24], [0.5, -0.6 + i * 0.24]);
  }
  torso.add(screws("shell-rivets", rivetYs, 0.302, mats.joint));

  torso.add(decalPlane("align-mark-torso-top", 0.04, 0.055, cachedTexture("arrow-mark", arrowMarkTexture), [0, 0.705, 0.301]));
  torso.add(decalPlane("align-mark-torso-bottom", 0.04, 0.055, cachedTexture("arrow-mark", arrowMarkTexture), [0, -0.72, 0.301], [0, 0, Math.PI]));

  for (const [id, y, drive] of [["bay-panel-upper", 0.55, "DRIVE A"], ["bay-panel-lower", 0.21, "DRIVE B"]] as const) {
    const panel = group(id, [0, y, 0.29]);
    panel.add(seamPlate(`${id}-seam`, 0.94, 0.3, mats.joint, [0, 0, -0.012]));
    panel.add(roundedBox(`${id}-plate`, 0.94, 0.3, 0.04, mats.plasticDark, [0, 0, 0], 0.015));
    panel.add(roundedBox(`${id}-bay-1`, 0.52, 0.07, 0.015, mats.plastic, [-0.17, 0.06, 0.02], 0.008));
    panel.add(roundedBox(`${id}-bay-2`, 0.52, 0.07, 0.015, mats.plastic, [-0.17, -0.05, 0.02], 0.008));
    panel.add(roundedBox(`${id}-bay-1-line`, 0.5, 0.008, 0.006, mats.joint, [-0.17, 0.06, 0.028], 0.002));
    panel.add(roundedBox(`${id}-bay-2-line`, 0.5, 0.008, 0.006, mats.joint, [-0.17, -0.05, 0.028], 0.002));
    if (id === "bay-panel-upper") {
      panel.add(roundedBox(`${id}-lcd`, 0.1, 0.05, 0.015, mats.joint, [0.36, 0.06, 0.02], 0.005));
      panel.add(
        decalPlane(`${id}-lcd-screen`, 0.09, 0.042, cachedTexture("waveform", waveformTexture), [0.36, 0.06, 0.028]),
      );
    } else {
      panel.add(roundedBox(`${id}-ind-1`, 0.05, 0.035, 0.015, mats.metal, [0.38, 0.06, 0.02], 0.005));
    }
    panel.add(roundedBox(`${id}-ind-2`, 0.05, 0.035, 0.015, mats.metal, [0.38, -0.05, 0.02], 0.005));
    panel.add(decalPlane(`${id}-label`, 0.11, 0.022, cachedTexture(drive, () => textTexture(drive)), [-0.4, 0.115, 0.021]));
    torso.add(panel);
  }

  const mid = group("mid-grille-panel", [0, -0.09, 0.29]);
  mid.add(seamPlate("mid-grille-seam", 0.94, 0.26, mats.joint, [0, 0, -0.012]));
  mid.add(roundedBox("mid-grille-plate", 0.94, 0.26, 0.04, mats.metal, [0, 0, 0], 0.015));
  mid.add(roundedBox("mid-grille-recess", 0.46, 0.2, 0.03, mats.hexCell, [-0.21, 0, 0.012], 0.01));
  mid.add(hexGrille("hex-cells-mid", 0.42, 0.17, 0.011, mats.metal, [-0.21, 0, 0.026]));
  for (let i = 0; i < 3; i += 1) {
    const x = 0.2 + i * 0.09;
    mid.add(roundedBox(`connector-slot-${i}`, 0.05, 0.15, 0.025, mats.joint, [x, 0, 0.015], 0.006));
    mid.add(roundedBox(`connector-slot-${i}-pins`, 0.02, 0.11, 0.03, mats.steel, [x, 0, 0.014], 0.003));
  }
  const ledGeo = new SphereGeometry(0.011, 10, 10);
  for (const [i, y] of [[0, 0.06], [1, -0.06]] as const) {
    const dot = mesh(`led-dot-${i}`, ledGeo, mats.led);
    dot.position.set(0.1, y, 0.028);
    mid.add(dot);
  }
  mid.add(screws("mid-grille-screws", [[-0.44, 0.1], [0.44, 0.1], [-0.44, -0.1], [0.44, -0.1]], 0.022, mats.joint));
  mid.add(decalPlane("mid-label", 0.15, 0.024, cachedTexture("vent-04", () => textTexture("VENT-04")), [-0.21, -0.107, 0.021]));
  torso.add(mid);

  const io = group("io-panel", [0, -0.31, 0.29]);
  io.add(seamPlate("io-seam", 0.94, 0.16, mats.joint, [0, 0, -0.012]));
  io.add(roundedBox("io-plate", 0.94, 0.16, 0.04, mats.plasticDark, [0, 0, 0], 0.012));
  for (let i = 0; i < 4; i += 1) {
    const x = -0.36 + i * 0.13;
    io.add(roundedBox(`io-vent-${i}`, 0.09, 0.07, 0.02, mats.plastic, [x, 0, 0.015], 0.005));
    for (let s = 0; s < 3; s += 1) {
      io.add(roundedBox(`io-vent-${i}-slot-${s}`, 0.07, 0.008, 0.024, mats.joint, [x, 0.02 - s * 0.02, 0.014], 0.002));
    }
  }
  io.add(roundedBox("usb-port", 0.06, 0.032, 0.025, mats.usb, [0.22, 0, 0.014], 0.004));
  io.add(roundedBox("black-port", 0.05, 0.036, 0.025, mats.joint, [0.32, 0, 0.014], 0.004));
  const dongle = group("usb-dongle", [0.22, 0, 0.03]);
  dongle.add(roundedBox("dongle-collar", 0.04, 0.04, 0.02, mats.steel, [0, 0, 0.01], 0.006));
  dongle.add(roundedBox("dongle-shell", 0.034, 0.02, 0.055, mats.joint, [0, 0, 0.045], 0.008));
  dongle.add(roundedBox("dongle-core", 0.02, 0.01, 0.04, mats.dongle, [0, 0, 0.05], 0.004));
  dongle.add(roundedBox("dongle-grip", 0.026, 0.024, 0.012, mats.joint, [0, 0, 0.078], 0.004));
  io.add(dongle);
  io.add(screws("io-screws", [[-0.45, 0.05], [-0.45, -0.05], [0.45, 0.05], [0.45, -0.05]], 0.022, mats.joint));
  io.add(decalPlane("io-usb-label", 0.1, 0.02, cachedTexture("usb-30", () => textTexture("USB 3.0", { fontSize: 34 })), [0.22, -0.056, 0.021]));
  io.add(decalPlane("io-aux-label", 0.06, 0.02, cachedTexture("aux", () => textTexture("AUX", { fontSize: 34 })), [0.32, -0.056, 0.021]));
  torso.add(io);

  const bottom = group("bottom-grille", [0, -0.55, 0.29]);
  bottom.add(seamPlate("bottom-grille-seam", 0.94, 0.3, mats.joint, [0, 0, -0.012]));
  bottom.add(roundedBox("bottom-grille-plate", 0.94, 0.3, 0.05, mats.metal, [0, 0, 0], 0.015));
  bottom.add(roundedBox("bottom-grille-recess", 0.88, 0.22, 0.04, mats.hexCell, [0, 0, 0.012], 0.01));
  bottom.add(hexGrille("hex-cells-bottom", 0.84, 0.19, 0.012, mats.metal, [0, 0, 0.03]));
  bottom.add(roundedBox("bottom-grille-handle", 0.3, 0.055, 0.02, mats.plastic, [0, 0, 0.045], 0.02));
  bottom.add(decalPlane("bottom-caution", 0.26, 0.055, cachedTexture("caution", cautionStripeTexture), [-0.3, -0.105, 0.052]));
  bottom.add(decalPlane("bottom-exhaust", 0.15, 0.026, cachedTexture("exhaust", () => textTexture("EXHAUST", { color: "#8a8478", alpha: 0.8 })), [0.35, -0.105, 0.052]));
  bottom.add(decalPlane("bottom-hot", 0.09, 0.045, cachedTexture("hot-label", hotLabelTexture), [-0.41, 0.095, 0.052]));
  torso.add(bottom);

  for (const sx of [-1, 1]) {
    const ribs = group(`side-ribs-${sx}`, [0.53 * sx, 0, 0.1]);
    for (let i = 0; i < 5; i += 1) {
      ribs.add(roundedBox(`side-rib-${i}`, 0.03, 0.18, 0.3, mats.plasticDark, [0, 0.58 - i * 0.29, 0], 0.008));
    }
    torso.add(ribs);

    const sideVent = group(`side-vent-${sx}`, [0.52 * sx, -0.12, 0.02]);
    sideVent.rotation.y = (sx * Math.PI) / 2;
    sideVent.add(roundedBox("side-vent-plate", 0.32, 0.46, 0.025, mats.plasticDark, [0, 0, 0], 0.012));
    sideVent.add(roundedBox("side-vent-recess", 0.26, 0.2, 0.02, mats.hexCell, [0, -0.08, 0.008], 0.008));
    sideVent.add(hexGrille("side-vent-cells", 0.23, 0.17, 0.01, mats.metal, [0, -0.08, 0.016]));
    sideVent.add(roundedBox("side-vent-handle", 0.14, 0.035, 0.02, mats.plastic, [0, 0.16, 0.01], 0.01));
    sideVent.add(screws("side-vent-screws", [[-0.13, 0.2], [0.13, 0.2], [-0.13, -0.2], [0.13, -0.2]], 0.014, mats.joint));
    torso.add(sideVent);
  }

  const stencil = decalPlane(
    "torso-stencil",
    0.34,
    0.13,
    cachedTexture("rx-04", () => textTexture("RX-04", { fontSize: 52, alpha: 0.3, letterSpacing: 8 })),
    [0.531, 0.48, -0.05],
    [0, Math.PI / 2, 0],
  );
  torso.add(stencil);

  const rear = group("rear-panel", [0, 0, -0.29]);
  rear.rotation.y = Math.PI;
  rear.add(seamPlate("rear-panel-seam", 0.94, 1.42, mats.joint, [0, 0, -0.012]));
  rear.add(roundedBox("rear-panel-plate", 0.94, 1.42, 0.04, mats.plastic, [0, 0, 0], 0.02));

  const psu = group("rear-psu", [-0.22, 0.52, 0.025]);
  psu.add(roundedBox("rear-psu-frame", 0.42, 0.42, 0.02, mats.plasticDark, [0, 0, 0], 0.015));
  psu.add(cylinder("rear-psu-recess", 0.16, 0.16, 0.02, mats.hexCell, [0, 0, 0.008], "z", 32));
  psu.add(cylinder("rear-psu-hub", 0.045, 0.045, 0.025, mats.steel, [0, 0, 0.012], "z", 20));
  for (let i = 0; i < 7; i += 1) {
    const angle = (i * Math.PI) / 7;
    const spoke = roundedBox(`rear-psu-spoke-${i}`, 0.3, 0.014, 0.012, mats.metal, [0, 0, 0.014], 0.004);
    spoke.rotation.z = angle;
    psu.add(spoke);
  }
  const guardRing = mesh("rear-psu-guard-ring", new TorusGeometry(0.165, 0.012, 10, 40), mats.joint);
  guardRing.position.set(0, 0, 0.02);
  psu.add(guardRing);
  psu.add(cylinder("rear-psu-guard-cross-h", 0.008, 0.008, 0.32, mats.joint, [0, 0, 0.02], "x", 8));
  psu.add(cylinder("rear-psu-guard-cross-v", 0.008, 0.008, 0.32, mats.joint, [0, 0, 0.02], "y", 8));
  psu.add(screws("rear-psu-screws", [[-0.17, 0.17], [0.17, 0.17], [-0.17, -0.17], [0.17, -0.17]], 0.012, mats.joint));
  rear.add(psu);

  rear.add(decalPlane("rear-ac-label", 0.14, 0.026, cachedTexture("ac-220v", () => textTexture("AC 220V", { mirror: true })), [-0.22, 0.27, 0.045]));
  rear.add(decalPlane("rear-caution-label", 0.16, 0.026, cachedTexture("rear-caution", () => textTexture("CAUTION", { color: "#8a6a2a", mirror: true })), [0.14, -0.32, 0.045]));

  rear.add(cylinder("rear-thumb-1", 0.028, 0.028, 0.035, mats.steel, [0.42, -0.44, 0.02], "z", 16));
  rear.add(cylinder("rear-thumb-2", 0.028, 0.028, 0.035, mats.steel, [0.42, -0.6, 0.02], "z", 16));

  const pack = group("rear-power-pack", [0.24, 0.42, 0.11]);
  pack.add(roundedBox("pack-body", 0.3, 0.44, 0.13, mats.plastic, [0, 0, 0], 0.03));
  for (let i = 0; i < 4; i += 1) {
    pack.add(roundedBox(`pack-fin-${i}`, 0.26, 0.018, 0.16, mats.steel, [0, 0.14 - i * 0.09, 0.01], 0.004));
  }
  pack.add(roundedBox("pack-cell-frame", 0.11, 0.24, 0.03, mats.joint, [0, 0, 0.075], 0.008));
  pack.add(cylinder("pack-cell-core", 0.032, 0.032, 0.18, mats.dongle, [0, 0, 0.085], "y", 16));
  for (let i = 0; i < 3; i += 1) {
    pack.add(roundedBox(`pack-cell-bar-${i}`, 0.012, 0.22, 0.012, mats.joint, [-0.03 + i * 0.03, 0, 0.09], 0.003));
  }
  pack.add(screws("pack-screws", [[-0.12, 0.18], [0.12, 0.18], [-0.12, -0.18], [0.12, -0.18]], 0.07, mats.joint));
  const packCable = new CatmullRomCurve3([
    new Vector3(0.06, -0.22, 0.02),
    new Vector3(0.12, -0.32, 0.06),
    new Vector3(0.2, -0.42, 0.05),
  ]);
  pack.add(mesh("pack-cable", new TubeGeometry(packCable, 12, 0.016, 10), mats.rubber));
  rear.add(pack);

  const slots = group("rear-slots", [0.1, 0.02, 0.02]);
  for (let i = 0; i < 5; i += 1) {
    const x = -0.28 + i * 0.075;
    slots.add(roundedBox(`rear-slot-${i}`, 0.045, 0.34, 0.015, mats.metal, [x, 0, 0], 0.004));
    slots.add(cylinder(`rear-slot-screw-${i}`, 0.008, 0.008, 0.012, mats.joint, [x, 0.185, 0.004], "z", 8));
  }
  rear.add(slots);

  const ioCluster = group("rear-io", [-0.3, -0.3, 0.02]);
  ioCluster.add(roundedBox("rear-io-plate", 0.32, 0.18, 0.015, mats.metal, [0, 0, 0], 0.006));
  ioCluster.add(roundedBox("rear-io-usb-1", 0.05, 0.025, 0.02, mats.usb, [-0.09, 0.04, 0.004], 0.003));
  ioCluster.add(roundedBox("rear-io-usb-2", 0.05, 0.025, 0.02, mats.usb, [-0.09, -0.04, 0.004], 0.003));
  ioCluster.add(roundedBox("rear-io-eth", 0.07, 0.055, 0.02, mats.joint, [0.02, 0, 0.004], 0.004));
  ioCluster.add(cylinder("rear-io-jack-1", 0.014, 0.014, 0.02, mats.led, [0.11, 0.04, 0.004], "z", 12));
  ioCluster.add(cylinder("rear-io-jack-2", 0.014, 0.014, 0.02, mats.joint, [0.11, -0.04, 0.004], "z", 12));
  rear.add(ioCluster);

  const ventSlots = group("rear-vent-slots", [0.3, -0.3, 0.025]);
  for (let row = 0; row < 2; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      ventSlots.add(roundedBox(`rear-vent-slot-${row}-${col}`, 0.05, 0.01, 0.015, mats.joint, [-0.105 + col * 0.07, row * 0.035, 0], 0.003));
    }
  }
  rear.add(ventSlots);

  const cableCurve = new CatmullRomCurve3([
    new Vector3(-0.28, -0.28, 0.06),
    new Vector3(-0.38, -0.45, 0.12),
    new Vector3(-0.32, -0.65, 0.14),
    new Vector3(-0.16, -0.8, 0.08),
  ]);
  rear.add(mesh("rear-cable", new TubeGeometry(cableCurve, 24, 0.018, 10), mats.rubber));
  rear.add(roundedBox("rear-cable-plug", 0.06, 0.045, 0.05, mats.joint, [-0.28, -0.27, 0.05], 0.008));

  for (const cx of [0.45, 0.51]) {
    const spine = new CatmullRomCurve3([
      new Vector3(cx - 0.03, 0.72, 0.04),
      new Vector3(cx + 0.03, 0.3, 0.09),
      new Vector3(cx + 0.02, -0.2, 0.08),
      new Vector3(cx - 0.05, -0.78, 0.05),
    ]);
    rear.add(mesh(`spine-cable-${cx}`, new TubeGeometry(spine, 28, 0.018, 10), mats.rubber));
  }
  for (const [i, cy] of [[0, 0.5], [1, -0.05], [2, -0.58]] as const) {
    rear.add(roundedBox(`spine-clamp-${i}`, 0.1, 0.035, 0.05, mats.joint, [0.48, cy, 0.055], 0.008));
  }
  rear.add(cylinder("spine-fit-top", 0.026, 0.026, 0.05, mats.steel, [0.44, 0.72, 0.04], "y", 12));

  const aux = group("rear-aux-battery", [-0.32, -0.05, 0.08]);
  aux.add(roundedBox("aux-body", 0.24, 0.3, 0.1, mats.plasticDark, [0, 0, 0], 0.02));
  aux.add(roundedBox("aux-fin-1", 0.2, 0.015, 0.12, mats.steel, [0, 0.09, 0.01], 0.004));
  aux.add(roundedBox("aux-fin-2", 0.2, 0.015, 0.12, mats.steel, [0, 0.14, 0.01], 0.004));
  aux.add(roundedBox("aux-cell-frame", 0.08, 0.16, 0.025, mats.joint, [0, -0.04, 0.055], 0.006));
  aux.add(cylinder("aux-cell-core", 0.024, 0.024, 0.12, mats.dongle, [0, -0.04, 0.062], "y", 14));
  aux.add(screws("aux-screws", [[-0.09, 0.12], [0.09, 0.12], [-0.09, -0.12], [0.09, -0.12]], 0.052, mats.joint));
  rear.add(aux);

  const rearGrille = group("rear-grille", [0.14, -0.5, 0.02]);
  rearGrille.add(roundedBox("rear-grille-recess", 0.52, 0.26, 0.02, mats.hexCell, [0, 0, 0], 0.01));
  rearGrille.add(hexGrille("rear-grille-cells", 0.48, 0.22, 0.012, mats.metal, [0, 0, 0.01]));
  rear.add(rearGrille);

  const serial = group("rear-serial", [-0.3, -0.58, 0.02]);
  serial.add(roundedBox("rear-serial-plate", 0.2, 0.07, 0.012, mats.steel, [0, 0, 0], 0.004));
  for (let i = 0; i < 6; i += 1) {
    serial.add(roundedBox(`rear-serial-bar-${i}`, 0.008 + (i % 3) * 0.006, 0.045, 0.014, mats.joint, [-0.07 + i * 0.028, 0, 0.002], 0.001));
  }
  rear.add(serial);

  torso.add(rear);

  return torso;
}

function buildPelvis(mats: MaterialSet): Group {
  const pelvis = group("pelvis", [0, 1.55, 0]);
  pelvis.add(roundedBox("pelvis-block", 0.65, 0.42, 0.48, mats.plastic, [0, 0, 0], 0.04));
  pelvis.add(seamPlate("pelvis-panel-seam", 0.44, 0.28, mats.joint, [0, 0, 0.228]));
  pelvis.add(roundedBox("pelvis-panel", 0.44, 0.28, 0.03, mats.plasticDark, [0, 0, 0.24], 0.015));
  pelvis.add(decalPlane("align-mark-pelvis", 0.04, 0.055, cachedTexture("arrow-mark", arrowMarkTexture), [0, 0.19, 0.245]));
  pelvis.add(roundedBox("pelvis-rear-panel", 0.4, 0.24, 0.03, mats.plasticDark, [0, 0, -0.24], 0.015));
  pelvis.add(screws("pelvis-rear-screws", [[-0.16, 0.08], [0.16, 0.08], [-0.16, -0.08], [0.16, -0.08]], -0.252, mats.joint));

  const coreRing = mesh("pelvis-core-ring", new TorusGeometry(0.075, 0.014, 10, 32), mats.steel);
  coreRing.position.set(0, 0, 0.258);
  pelvis.add(coreRing);
  pelvis.add(cylinder("pelvis-core", 0.055, 0.055, 0.02, mats.dongle, [0, 0, 0.252], "z", 24));

  for (const sx of [-1, 1]) {
    const cable = new CatmullRomCurve3([
      new Vector3(0.42 * sx, 0.31, 0.12),
      new Vector3(0.52 * sx, 0.14, 0.18),
      new Vector3(0.44 * sx, -0.04, 0.1),
    ]);
    pelvis.add(mesh(`hip-cable-${sx < 0 ? "L" : "R"}`, new TubeGeometry(cable, 16, 0.014, 10), mats.rubber));
    pelvis.add(cylinder(`hip-cable-fit-top-${sx}`, 0.02, 0.02, 0.035, mats.joint, [0.42 * sx, 0.31, 0.12], "y", 10));
    pelvis.add(cylinder(`hip-cable-fit-bottom-${sx}`, 0.02, 0.02, 0.035, mats.joint, [0.44 * sx, -0.04, 0.1], "y", 10));
  }
  pelvis.add(screws("pelvis-panel-screws", [[-0.18, 0.1], [0.18, 0.1], [-0.18, -0.1], [0.18, -0.1]], 0.252, mats.joint));
  for (const sx of [-1, 1]) {
    const b = bellows(`hip-bellows-${sx < 0 ? "L" : "R"}`, 0.12, 0.14, 3, mats.rubber);
    b.rotation.z = Math.PI / 2;
    b.position.set(0.34 * sx, -0.16, 0);
    pelvis.add(b);
  }
  return pelvis;
}

function armorScrews(name: string, w: number, h: number, z: number, mats: MaterialSet): InstancedMesh {
  return screws(name, [[-w / 2, h / 2], [w / 2, h / 2], [-w / 2, -h / 2], [w / 2, -h / 2]], z, mats.joint);
}

function buildArm(side: "L" | "R", sx: number, mats: MaterialSet): Group {
  const arm = group(`arm-${side}`, [0.66 * sx, 2.0, 0]);
  arm.rotation.z = sx * 0.1;

  arm.add(cylinder(`shoulder-housing-${side}`, 0.12, 0.12, 0.2, mats.joint, [0.02 * sx, 0.98, 0], "x", 28));
  const ball = mesh(`shoulder-ball-${side}`, new SphereGeometry(0.11, 24, 18), mats.joint);
  ball.position.set(0.12 * sx, 0.98, 0);
  arm.add(ball);
  const shoulderCap = cylinder(`shoulder-cap-${side}`, 0.13, 0.13, 0.06, mats.plastic, [0.18 * sx, 0.98, 0], "x", 6);
  arm.add(shoulderCap);
  arm.add(cylinder(`shoulder-cap-bolt-${side}`, 0.035, 0.035, 0.07, mats.steel, [0.18 * sx, 0.98, 0], "x", 12));
  arm.add(
    decalPlane(
      `shoulder-scale-${side}`,
      0.2,
      0.2,
      cachedTexture("scale-ring", scaleRingTexture),
      [0.213 * sx, 0.98, 0],
      [0, (sx * Math.PI) / 2, 0],
      true,
    ),
  );

  const upper = group(`upper-arm-${side}`, [0.16 * sx, 0.66, 0]);
  upper.add(roundedBox("upper-arm-shell", 0.2, 0.5, 0.24, mats.plastic, [0, 0, 0], 0.04));
  upper.add(seamPlate("upper-arm-panel-seam", 0.14, 0.36, mats.joint, [0, 0, 0.108]));
  upper.add(roundedBox("upper-arm-panel", 0.14, 0.36, 0.02, mats.plasticDark, [0, 0, 0.12], 0.01));
  upper.add(armorScrews("upper-arm-screws", 0.11, 0.15, 0.125, mats));
  upper.add(cylinder("upper-arm-rail-f", 0.012, 0.012, 0.44, mats.steel, [0, 0, 0.135], "y", 10));
  upper.add(cylinder("upper-arm-rail-b", 0.012, 0.012, 0.44, mats.steel, [0, 0, -0.135], "y", 10));
  upper.add(roundedBox("upper-arm-hinge-cover", 0.16, 0.08, 0.2, mats.plasticDark, [0, 0.27, 0], 0.02));
  arm.add(upper);

  arm.add(cylinder(`elbow-joint-${side}`, 0.09, 0.09, 0.16, mats.joint, [0.19 * sx, 0.35, 0], "x", 24));
  arm.add(cylinder(`elbow-cap-${side}`, 0.05, 0.05, 0.18, mats.steel, [0.19 * sx, 0.35, 0], "x", 20));
  arm.add(
    decalPlane(
      `elbow-scale-${side}`,
      0.13,
      0.13,
      cachedTexture("scale-ring", scaleRingTexture),
      [0.283 * sx, 0.35, 0],
      [0, (sx * Math.PI) / 2, 0],
      true,
    ),
  );
  for (const [by, bz] of [[0.06, 0.06], [0.06, -0.06], [-0.06, 0.06], [-0.06, -0.06]] as const) {
    arm.add(cylinder(`elbow-bolt-${by}-${bz}`, 0.012, 0.012, 0.17, mats.joint, [0.19 * sx, 0.35 + by, bz], "x", 8));
  }

  const forearm = group(`forearm-${side}`, [0.19 * sx, -0.02, 0.02]);
  forearm.add(roundedBox("forearm-frame", 0.16, 0.62, 0.18, mats.plastic, [0, 0, 0], 0.03));
  forearm.add(roundedBox("forearm-channel", 0.1, 0.5, 0.02, mats.joint, [0, 0, 0.095], 0.008));
  for (let i = 0; i < 6; i += 1) {
    forearm.add(roundedBox(`forearm-spine-${i}`, 0.08, 0.025, 0.012, mats.steel, [0, 0.19 - i * 0.075, 0.1], 0.003));
  }
  forearm.add(cylinder("piston-cylinder", 0.045, 0.045, 0.32, mats.joint, [-0.02, 0.08, 0.11], "y", 16));
  forearm.add(cylinder("piston-rod", 0.02, 0.02, 0.28, mats.steel, [-0.02, -0.18, 0.11], "y", 12));
  forearm.add(cylinder("piston-cylinder-b", 0.045, 0.045, 0.32, mats.joint, [0.04, 0.08, 0.11], "y", 16));
  forearm.add(cylinder("piston-rod-b", 0.02, 0.02, 0.28, mats.steel, [0.04, -0.18, 0.11], "y", 12));
  forearm.add(cylinder("piston-rear-cylinder", 0.04, 0.04, 0.3, mats.joint, [0.01, 0.06, -0.1], "y", 16));
  forearm.add(cylinder("piston-rear-rod", 0.018, 0.018, 0.26, mats.steel, [0.01, -0.17, -0.1], "y", 12));
  const hoseCurve = new CatmullRomCurve3([
    new Vector3(0.05, 0.3, -0.07),
    new Vector3(0.1, 0.1, -0.14),
    new Vector3(0.1, -0.14, -0.14),
    new Vector3(0.05, -0.3, -0.07),
  ]);
  forearm.add(mesh("forearm-hose", new TubeGeometry(hoseCurve, 20, 0.016, 10), mats.rubber));
  forearm.add(cylinder("hose-fitting-top", 0.024, 0.024, 0.04, mats.joint, [0.05, 0.3, -0.07], "y", 12));
  forearm.add(cylinder("hose-fitting-bottom", 0.024, 0.024, 0.04, mats.joint, [0.05, -0.3, -0.07], "y", 12));
  forearm.add(cylinder("hose-clip-1", 0.026, 0.026, 0.016, mats.steel, [0.095, 0.1, -0.13], "z", 12));
  forearm.add(cylinder("hose-clip-2", 0.026, 0.026, 0.016, mats.steel, [0.095, -0.14, -0.13], "z", 12));
  if (side === "L") {
    const scanner = group("forearm-scanner", [-0.095, 0.05, -0.02]);
    scanner.add(roundedBox("scanner-body", 0.05, 0.16, 0.06, mats.joint, [0, 0, 0], 0.012));
    scanner.add(roundedBox("scanner-slit", 0.012, 0.1, 0.02, mats.dongle, [-0.02, 0, 0.02], 0.004));
    scanner.add(cylinder("scanner-tip", 0.012, 0.012, 0.03, mats.steel, [0, 0.095, 0.01], "y", 10));
    scanner.add(cylinder("scanner-tip-light", 0.009, 0.009, 0.012, mats.tipLight, [0, 0.115, 0.01], "y", 10));
    forearm.add(scanner);
  }
  arm.add(forearm);

  arm.add(cylinder(`wrist-${side}`, 0.07, 0.07, 0.1, mats.joint, [0.19 * sx, -0.37, 0.02], "y", 20));
  arm.add(cylinder(`wrist-flange-${side}`, 0.088, 0.088, 0.025, mats.steel, [0.19 * sx, -0.43, 0.02], "y", 24));

  const hand = group(`hand-${side}`, [0.19 * sx, -0.52, 0.03]);
  hand.add(roundedBox("palm", 0.13, 0.14, 0.14, mats.joint, [0, 0, 0], 0.03));
  hand.add(roundedBox("palm-plate", 0.1, 0.1, 0.02, mats.plasticDark, [0, 0, 0.075], 0.012));
  for (const [fi, fx] of [[0, -0.035], [1, 0.035]] as const) {
    const finger = group(`finger-${fi}`, [fx, -0.09, 0.04]);
    finger.add(cylinder("finger-base", 0.02, 0.02, 0.07, mats.joint, [0, -0.025, 0], "y", 10));
    const knuckle = mesh("finger-knuckle", new SphereGeometry(0.022, 12, 10), mats.steel);
    knuckle.position.set(0, -0.06, 0);
    finger.add(knuckle);
    const tip = cylinder("finger-tip", 0.015, 0.015, 0.065, mats.joint, [0, -0.095, 0.018], "y", 10);
    tip.rotation.x = -0.55;
    finger.add(tip);
    const pad = cylinder("finger-pad", 0.017, 0.017, 0.02, mats.rubber, [0, -0.115, 0.032], "y", 10);
    pad.rotation.x = -0.55;
    finger.add(pad);
    hand.add(finger);
  }
  const thumb = group("finger-thumb", [-0.075 * (sx > 0 ? 1 : -1) * 1, -0.03, 0.02]);
  thumb.rotation.z = (sx > 0 ? 1 : -1) * 0.7;
  thumb.add(cylinder("thumb-base", 0.02, 0.02, 0.06, mats.joint, [0, -0.025, 0], "y", 10));
  const thumbTip = cylinder("thumb-tip", 0.015, 0.015, 0.055, mats.joint, [0, -0.08, 0.012], "y", 10);
  thumbTip.rotation.x = -0.4;
  thumb.add(thumbTip);
  hand.add(thumb);

  if (side === "R") {
    const holoMaterial = new MeshBasicMaterial({
      map: cachedTexture("holo-display", holoDisplayTexture),
      transparent: true,
      opacity: 0.75,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
    });
    const holo = new Mesh(new PlaneGeometry(0.2, 0.125), holoMaterial);
    holo.name = "holo-display";
    holo.position.set(0, -0.06, 0.19);
    holo.rotation.x = -0.12;
    hand.add(holo);
    hand.add(cylinder("holo-projector", 0.012, 0.016, 0.02, mats.steel, [0, -0.06, 0.085], "z", 10));
  }
  arm.add(hand);

  return arm;
}

function buildLeg(side: "L" | "R", sx: number, mats: MaterialSet): Group {
  const leg = group(`leg-${side}`, [0.38 * sx, 0.72, 0]);
  leg.rotation.z = sx * 0.04;

  leg.add(cylinder(`hip-joint-${side}`, 0.11, 0.11, 0.18, mats.joint, [0, 0.73, 0], "x", 24));

  const thigh = group(`thigh-${side}`, [0.03 * sx, 0.28, 0]);
  thigh.add(roundedBox("thigh-shell", 0.3, 0.7, 0.32, mats.plastic, [0, 0, 0], 0.05));
  thigh.add(seamPlate("thigh-panel-seam", 0.22, 0.5, mats.joint, [0, 0, 0.148]));
  thigh.add(roundedBox("thigh-panel", 0.22, 0.5, 0.02, mats.plasticDark, [0, 0, 0.16], 0.012));
  thigh.add(armorScrews("thigh-screws", 0.09, 0.22, 0.165, mats));
  thigh.add(
    decalPlane(
      `thigh-label-${side}`,
      0.09,
      0.03,
      cachedTexture(`leg-${side}-01`, () => textTexture(`${side}-01`)),
      [0, 0.19, 0.171],
    ),
  );
  for (let i = 0; i < 3; i += 1) {
    thigh.add(roundedBox(`thigh-vent-${i}`, 0.012, 0.09, 0.05, mats.joint, [0.155 * sx, 0.14 - i * 0.13, 0.02], 0.003));
  }
  thigh.add(roundedBox("thigh-marker-light", 0.014, 0.03, 0.014, mats.dongle, [0.155 * sx, 0.3, 0.02], 0.004));

  const actuator = group(`thigh-actuator-${side}`, [0, 0.02, -0.19]);
  actuator.add(roundedBox("actuator-body", 0.16, 0.42, 0.08, mats.plasticDark, [0, 0, 0], 0.02));
  actuator.add(cylinder("actuator-piston-1", 0.015, 0.015, 0.3, mats.steel, [-0.045, 0, -0.045], "y", 12));
  actuator.add(cylinder("actuator-piston-2", 0.015, 0.015, 0.3, mats.steel, [0.045, 0, -0.045], "y", 12));
  actuator.add(roundedBox("actuator-cap-top", 0.12, 0.04, 0.05, mats.joint, [0, 0.22, -0.02], 0.01));
  actuator.add(roundedBox("actuator-cap-bottom", 0.12, 0.04, 0.05, mats.joint, [0, -0.22, -0.02], 0.01));
  actuator.add(screws("actuator-screws", [[-0.06, 0.16], [0.06, 0.16], [-0.06, -0.16], [0.06, -0.16]], -0.042, mats.joint));
  const actuatorCable = new CatmullRomCurve3([
    new Vector3(0.03 * sx, 0.24, -0.02),
    new Vector3(0.1 * sx, 0.38, -0.08),
    new Vector3(0.02 * sx, 0.47, -0.05),
  ]);
  actuator.add(mesh("actuator-cable", new TubeGeometry(actuatorCable, 12, 0.012, 10), mats.rubber));
  thigh.add(actuator);
  leg.add(thigh);

  const legCable = new CatmullRomCurve3([
    new Vector3(0.04 * sx, 0.68, 0.1),
    new Vector3(0.17 * sx, 0.42, 0.17),
    new Vector3(0.13 * sx, 0.06, 0.1),
  ]);
  leg.add(mesh(`leg-cable-${side}`, new TubeGeometry(legCable, 16, 0.012, 10), mats.rubber));
  leg.add(cylinder(`leg-cable-fit-t-${side}`, 0.018, 0.018, 0.03, mats.joint, [0.04 * sx, 0.68, 0.1], "y", 10));
  leg.add(cylinder(`leg-cable-fit-b-${side}`, 0.018, 0.018, 0.03, mats.joint, [0.13 * sx, 0.06, 0.1], "y", 10));

  leg.add(cylinder(`knee-joint-${side}`, 0.09, 0.09, 0.16, mats.joint, [0.06 * sx, -0.05, 0], "x", 24));
  leg.add(cylinder(`knee-cap-${side}`, 0.05, 0.05, 0.18, mats.steel, [0.06 * sx, -0.05, 0], "x", 20));
  const gearRing = mesh(`knee-gear-ring-${side}`, new TorusGeometry(0.105, 0.016, 10, 32), mats.joint);
  gearRing.position.set(0.06 * sx, -0.05, 0);
  gearRing.rotation.y = Math.PI / 2;
  leg.add(gearRing);
  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2;
    const tooth = roundedBox(
      `knee-gear-tooth-${i}`,
      0.03,
      0.028,
      0.024,
      mats.joint,
      [0.06 * sx, -0.05 + Math.cos(angle) * 0.112, Math.sin(angle) * 0.112],
      0.004,
    );
    tooth.rotation.x = -angle;
    leg.add(tooth);
  }
  const kneeLight = mesh(`knee-light-${side}`, new SphereGeometry(0.012, 10, 8), mats.led);
  kneeLight.position.set(0.06 * sx, -0.05, 0.1);
  leg.add(kneeLight);
  leg.add(
    decalPlane(
      `knee-scale-${side}`,
      0.15,
      0.15,
      cachedTexture("scale-ring", scaleRingTexture),
      [0.153 * sx, -0.05, 0],
      [0, (sx * Math.PI) / 2, 0],
      true,
    ),
  );

  const shin = group(`shin-${side}`, [0.06 * sx, -0.33, 0]);
  shin.add(roundedBox("shin-shell", 0.24, 0.5, 0.28, mats.plastic, [0, 0, 0], 0.04));
  shin.add(seamPlate("shin-panel-seam", 0.17, 0.36, mats.joint, [0, 0, 0.128]));
  shin.add(roundedBox("shin-panel", 0.17, 0.36, 0.02, mats.plasticDark, [0, 0, 0.14], 0.01));
  shin.add(armorScrews("shin-screws", 0.07, 0.15, 0.145, mats));
  shin.add(cylinder("shin-piston-cylinder", 0.035, 0.035, 0.32, mats.joint, [0, 0.06, -0.15], "y", 14));
  shin.add(cylinder("shin-piston-rod", 0.016, 0.016, 0.26, mats.steel, [0, -0.19, -0.15], "y", 10));
  shin.add(roundedBox("shin-light-strip", 0.01, 0.3, 0.014, mats.dongle, [0.125 * sx, 0, 0.05], 0.004));
  leg.add(shin);

  const strut = group(`shock-strut-${side}`, [0.06 * sx, -0.28, 0.15]);
  strut.add(cylinder("strut-housing", 0.04, 0.04, 0.16, mats.joint, [0, 0.16, 0], "y", 16));
  strut.add(cylinder("strut-rod", 0.018, 0.018, 0.24, mats.steel, [0, -0.04, 0], "y", 12));
  strut.add(coilSpring("strut-spring", 0.032, 0.2, 5, 0.008, mats.steel));
  strut.add(roundedBox("strut-mount-top", 0.07, 0.03, 0.05, mats.joint, [0, 0.25, 0], 0.008));
  strut.add(roundedBox("strut-mount-bottom", 0.07, 0.03, 0.05, mats.joint, [0, -0.17, 0], 0.008));
  leg.add(strut);

  const ankleBall = mesh(`ankle-${side}`, new SphereGeometry(0.07, 20, 14), mats.joint);
  ankleBall.position.set(0.06 * sx, -0.52, 0);
  leg.add(ankleBall);
  leg.add(roundedBox(`ankle-guard-o-${side}`, 0.035, 0.17, 0.22, mats.plastic, [0.06 * sx + 0.12, -0.52, 0], 0.012));
  leg.add(roundedBox(`ankle-guard-i-${side}`, 0.035, 0.17, 0.22, mats.plastic, [0.06 * sx - 0.12, -0.52, 0], 0.012));
  leg.add(cylinder(`ankle-link-${side}`, 0.014, 0.014, 0.16, mats.steel, [0.06 * sx, -0.47, 0.1], "y", 10));
  leg.add(cylinder(`ankle-link-housing-${side}`, 0.026, 0.026, 0.08, mats.joint, [0.06 * sx, -0.42, 0.1], "y", 12));

  const foot = group(`foot-${side}`, [0.06 * sx, -0.62, 0.09]);
  foot.add(roundedBox("foot-block", 0.28, 0.2, 0.46, mats.plastic, [0, 0, 0], 0.04));
  foot.add(roundedBox("foot-sole", 0.29, 0.05, 0.48, mats.rubber, [0, -0.115, 0], 0.015));
  foot.add(roundedBox("foot-toe-cap", 0.26, 0.14, 0.1, mats.plasticDark, [0, -0.02, 0.22], 0.03));
  for (let i = 0; i < 3; i += 1) {
    foot.add(roundedBox(`toe-tread-${i}`, 0.22, 0.01, 0.015, mats.joint, [0, 0.045, 0.19 + i * 0.04], 0.003));
  }
  foot.add(roundedBox("foot-heel-cap", 0.24, 0.13, 0.08, mats.plasticDark, [0, -0.03, -0.21], 0.025));
  foot.add(roundedBox("foot-heel-ledge", 0.26, 0.035, 0.1, mats.plasticDark, [0, 0.065, -0.18], 0.01));
  foot.add(roundedBox("foot-side-trim", 0.02, 0.08, 0.3, mats.metal, [0.14, -0.04, 0.02], 0.006));
  foot.add(roundedBox("foot-side-trim-b", 0.02, 0.08, 0.3, mats.metal, [-0.14, -0.04, 0.02], 0.006));
  foot.add(cylinder("heel-shock-l", 0.02, 0.02, 0.1, mats.joint, [0.11, 0.0, -0.15], "y", 12));
  foot.add(cylinder("heel-shock-r", 0.02, 0.02, 0.1, mats.joint, [-0.11, 0.0, -0.15], "y", 12));
  foot.add(cylinder("heel-shock-rod-l", 0.01, 0.01, 0.06, mats.steel, [0.11, 0.06, -0.15], "y", 10));
  foot.add(cylinder("heel-shock-rod-r", 0.01, 0.01, 0.06, mats.steel, [-0.11, 0.06, -0.15], "y", 10));
  const treadGeo = new RoundedBoxGeometry(0.05, 0.014, 0.06, 2, 0.005);
  const tread = new InstancedMesh(treadGeo, mats.rubber, 20);
  tread.name = "sole-tread";
  const treadMatrix = new Matrix4();
  let treadIndex = 0;
  for (let row = 0; row < 5; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      treadMatrix.makeTranslation(-0.075 + col * 0.05, -0.148, -0.16 + row * 0.08);
      tread.setMatrixAt(treadIndex, treadMatrix);
      treadIndex += 1;
    }
  }
  tread.instanceMatrix.needsUpdate = true;
  foot.add(tread);
  leg.add(foot);

  return leg;
}

const EXPLODE_OFFSETS: Record<string, [number, number, number]> = {
  head: [0, 0.35, 0],
  neck: [0, 0.2, 0],
  torso: [0, 0, 0],
  pelvis: [0, -0.12, 0],
  "arm-L": [-0.75, 0.1, 0],
  "arm-R": [0.75, 0.1, 0],
  "leg-L": [-0.5, -0.08, 0],
  "leg-R": [0.5, -0.08, 0],
};

export function createRobotModel(): Group {
  const mats = createMaterials();
  const root = new Group();
  root.name = "retroboxbot";

  const parts: Record<string, Group> = {
    head: buildHead(mats),
    neck: buildNeck(mats),
    torso: buildTorso(mats),
    pelvis: buildPelvis(mats),
    "arm-L": buildArm("L", -1, mats),
    "arm-R": buildArm("R", 1, mats),
    "leg-L": buildLeg("L", -1, mats),
    "leg-R": buildLeg("R", 1, mats),
  };

  const basePositions = new Map<string, Vector3>();
  for (const part of Object.values(parts)) {
    root.add(part);
    basePositions.set(part.name, part.position.clone());
  }

  const partInfos = getPartInfos();

  const explode = (amount: number, perPart?: Partial<Record<string, number>>) => {
    for (const [name, part] of Object.entries(parts)) {
      const base = basePositions.get(name);
      const offset = EXPLODE_OFFSETS[name];
      if (!base || !offset) continue;
      const t = Math.min(1, Math.max(0, perPart?.[name] ?? amount));
      part.position.set(
        base.x + offset[0] * t,
        base.y + offset[1] * t,
        base.z + offset[2] * t,
      );
    }
  };

  root.userData.sculptRuntime = {
    parts,
    partInfos,
    materials: mats as unknown as Record<string, MeshStandardMaterial | MeshPhysicalMaterial>,
    explode,
  } satisfies SculptRuntime;

  return root;
}

export function getSculptRuntime(root: Group): SculptRuntime {
  return root.userData.sculptRuntime as SculptRuntime;
}
