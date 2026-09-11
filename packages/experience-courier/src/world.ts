import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { STAMPS, STATIONS } from "./game";

export const X = (x: number) => x - 7.5;
export const Z = (z: number) => z - 5.5;
export type Palette = ReturnType<typeof palette>;
function paperGrain() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 1100; i++) {
      const x = (Math.sin(i * 12.9898) * 43758.5453) % 1,
        y = (Math.sin(i * 78.233) * 12345.6789) % 1;
      ctx.fillStyle = i % 3 ? "#00000009" : "#a3916e0d";
      ctx.fillRect(Math.abs(x) * 128, Math.abs(y) * 128, 1, 1);
    }
  }
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  texture.wrapS = texture.wrapT = T.RepeatWrapping;
  return texture;
}
export function palette() {
  const mat = (
    color: string,
    metalness = 0,
    roughness = 0.65,
    emissive?: string,
  ) =>
    new T.MeshStandardMaterial({
      color,
      metalness,
      roughness,
      emissive: emissive ?? "#000000",
      emissiveIntensity: 0.6,
    });
  const result = {
    stone: mat("#e4d2aa"),
    tile: mat("#edddbc"),
    alternate: mat("#e1cfaa"),
    rim: mat("#8a9c8d"),
    rock: mat("#697e7b"),
    rockLight: mat("#95a491"),
    dark: mat("#294a48", 0.4),
    brass: mat("#bb8c45", 0.65, 0.35),
    orange: mat("#d86732", 0.25),
    cream: mat("#fff2d4", 0.15),
    wood: mat("#ab7954"),
    bark: mat("#66674a"),
    green: mat("#668c6d"),
    lightGreen: mat("#9daf71"),
    teal: mat("#397b75", 0.2),
    core: mat("#ffbd59", 0.4, 0.25, "#ff960d"),
    window: mat("#b9e2cd", 0.15, 0.25),
    cloud: mat("#f2e7d9"),
    bloom: mat("#f0b9a0"),
    white: mat("#fff2c6", 0.1, 0.3, "#ffe0a2"),
  };
  const grain = paperGrain();
  result.tile.map = grain;
  result.alternate.map = grain;
  return result;
}
export function mesh(
  g: T.BufferGeometry,
  m: T.Material,
  parent: T.Object3D,
  x = 0,
  y = 0,
  z = 0,
) {
  const item = new T.Mesh(g, m);
  item.position.set(x, y, z);
  item.castShadow = true;
  item.receiveShadow = true;
  parent.add(item);
  return item;
}
export function box(
  parent: T.Object3D,
  m: T.Material,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  r = 0.045,
) {
  return mesh(
    new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 3, h / 3, d / 3)),
    m,
    parent,
    x,
    y,
    z,
  );
}
export function cylinder(
  parent: T.Object3D,
  m: T.Material,
  x: number,
  y: number,
  z: number,
  r: number,
  h: number,
  top = r,
  sides = 24,
) {
  return mesh(new T.CylinderGeometry(top, r, h, sides), m, parent, x, y, z);
}
function orb(
  parent: T.Object3D,
  m: T.Material,
  x: number,
  y: number,
  z: number,
  r: number,
) {
  return mesh(new T.IcosahedronGeometry(r, 1), m, parent, x, y, z);
}
export function gear(parent: T.Object3D, p: Palette, r: number) {
  const g = new T.Group();
  parent.add(g);
  cylinder(g, p.brass, 0, 0, 0, r, 0.14);
  cylinder(g, p.dark, 0, 0.09, 0, r * 0.57, 0.04);
  cylinder(g, p.brass, 0, 0.14, 0, r * 0.22, 0.13);
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    const tooth = box(
      g,
      p.brass,
      Math.cos(a) * r,
      0,
      Math.sin(a) * r,
      r * 0.28,
      0.16,
      r * 0.28,
      0.018,
    );
    tooth.rotation.y = -a;
  }
  for (let i = 0; i < 4; i++) {
    const b = box(g, p.brass, 0, 0.12, 0, r * 1.65, 0.035, 0.05);
    b.rotation.y = (i * Math.PI) / 4;
  }
  batch(g);
  return g;
}
export function coreModel(p: Palette) {
  const g = new T.Group();
  box(g, p.core, 0, 0, 0, 0.34, 0.42, 0.34, 0.065);
  for (const y of [-0.22, 0.22])
    box(g, p.brass, 0, y, 0, 0.42, 0.07, 0.42, 0.025);
  for (const x of [-0.17, 0.17])
    for (const z of [-0.17, 0.17])
      box(g, p.brass, x, 0, z, 0.035, 0.43, 0.035, 0.008);
  cylinder(g, p.white, 0, 0.28, 0, 0.09, 0.06);
  batch(g);
  return g;
}
function label(
  parent: T.Object3D,
  text: string,
  x: number,
  y: number,
  z: number,
  color = "#f4ead3",
  background = "#315451",
  scale = 1,
) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(9, 9, 494, 110);
  ctx.fillStyle = color;
  ctx.font = "600 48px ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 67);
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  const item = mesh(
    new T.PlaneGeometry(1.6 * scale, 0.4 * scale),
    new T.MeshBasicMaterial({ map: texture }),
    parent,
    x,
    y,
    z,
  );
  item.rotation.x = -0.3;
  item.castShadow = false;
}
function tree(
  parent: T.Object3D,
  p: Palette,
  x: number,
  y: number,
  z: number,
  scale = 1,
) {
  const g = new T.Group();
  g.position.set(x, y, z);
  g.scale.setScalar(scale);
  parent.add(g);
  cylinder(g, p.bark, 0, 0.5, 0, 0.09, 1);
  for (let i = 0; i < 3; i++) {
    const leaf = mesh(
      new T.ConeGeometry(0.6 - i * 0.1, 0.85, 7),
      i === 2 ? p.lightGreen : p.green,
      g,
      0,
      0.8 + i * 0.38,
      0,
    );
    leaf.rotation.y = i * 0.6;
  }
}
function flowers(
  parent: T.Object3D,
  p: Palette,
  x: number,
  y: number,
  z: number,
) {
  for (let i = 0; i < 5; i++) {
    const dx = Math.sin(i * 8) * 0.23,
      dz = Math.cos(i * 5) * 0.22;
    cylinder(parent, p.green, x + dx, y + 0.12, z + dz, 0.018, 0.24, 0.018, 5);
    orb(parent, i % 2 ? p.bloom : p.cream, x + dx, y + 0.27, z + dz, 0.075);
  }
}
function island(
  parent: T.Object3D,
  p: Palette,
  x0: number,
  x1: number,
  z0: number,
  z1: number,
  y: number,
) {
  const cx = X((x0 + x1) / 2),
    cz = Z((z0 + z1) / 2),
    w = x1 - x0 + 1.12,
    d = z1 - z0 + 1.12;
  box(parent, p.dark, cx, y - 0.57, cz, w, 0.9, d, 0.3);
  box(parent, p.rim, cx, y - 0.18, cz, w + 0.08, 0.28, d + 0.08, 0.13);
  box(parent, p.brass, cx, y - 0.35, cz, w + 0.1, 0.06, d + 0.1, 0.02);
  for (let x = x0; x <= x1; x++)
    for (let z = z0; z <= z1; z++) {
      box(
        parent,
        (x + z) % 3 === 0 ? p.alternate : p.tile,
        X(x),
        y - 0.035,
        Z(z),
        0.967,
        0.12,
        0.967,
        0.06,
      );
      if ((x + z) % 3 === 0) {
        const bolt = cylinder(
          parent,
          p.brass,
          X(x) - 0.37,
          y + 0.03,
          Z(z) - 0.37,
          0.027,
          0.012,
          0.027,
          8,
        );
        bolt.castShadow = false;
      }
    }
  for (let i = 0; i < 9; i++) {
    const a = i * 2.399,
      r = 0.5 + (i % 3) * 0.55;
    const rock = mesh(
      new T.ConeGeometry(0.95 + (i % 2) * 0.4, 1.9 + (i % 3) * 0.38, 5),
      i % 2 ? p.rock : p.rockLight,
      parent,
      cx + Math.cos(a) * r,
      y - 1.78,
      cz + Math.sin(a) * r,
    );
    rock.rotation.z = Math.PI;
    rock.rotation.y = a;
  }
  for (let i = 0; i < 4; i++) {
    const vx = cx + (i - 1.5) * 1.12;
    const count = 2 + (i % 3);
    cylinder(
      parent,
      p.green,
      vx,
      y - 0.68 - count * 0.12,
      cz + d / 2 - 0.04,
      0.025,
      count * 0.24,
      0.025,
      5,
    );
    for (let j = 0; j < count; j++)
      for (const side of [-1, 1]) {
        const leaf = orb(
          parent,
          j % 2 ? p.green : p.lightGreen,
          vx + side * 0.09,
          y - 0.68 - j * 0.24,
          cz + d / 2 - 0.01,
          0.17,
        );
        leaf.scale.set(1, 0.42, 0.65);
        leaf.rotation.z = side * 0.45;
      }
  }
  // Corner caps and sparse rails leave the walkways visually open.
  for (const [dx, dz] of [
    [-1, -1],
    [1, 1],
  ] as const) {
    const xx = cx + dx * (w / 2 - 0.12),
      zz = cz + dz * (d / 2 - 0.12);
    cylinder(parent, p.dark, xx, y + 0.22, zz, 0.06, 0.5);
    cylinder(parent, p.brass, xx, y + 0.49, zz, 0.09, 0.06);
    box(parent, p.brass, xx - dx * 0.45, y + 0.31, zz, 0.9, 0.05, 0.045, 0.015);
    box(parent, p.brass, xx, y + 0.31, zz - dz * 0.45, 0.045, 0.05, 0.9, 0.015);
  }
}
function socket(
  parent: T.Object3D,
  p: Palette,
  x: number,
  z: number,
  y: number,
  n: string,
) {
  cylinder(parent, p.dark, X(x), y + 0.065, Z(z), 0.34, 0.13);
  cylinder(parent, p.brass, X(x), y + 0.145, Z(z), 0.28, 0.055);
  cylinder(parent, p.orange, X(x), y + 0.18, Z(z), 0.19, 0.025);
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3;
    box(
      parent,
      p.brass,
      X(x) + Math.cos(a) * 0.24,
      y + 0.25,
      Z(z) + Math.sin(a) * 0.24,
      0.08,
      0.19,
      0.08,
      0.02,
    );
  }
  label(parent, n, X(x), y + 0.42, Z(z) - 0.36, "#fff0d0", "#b2542c", 0.4);
}
export function createLever(p: Palette) {
  const root = new T.Group(),
    arm = new T.Group();
  box(root, p.dark, 0, 0.08, 0, 0.45, 0.16, 0.36);
  cylinder(root, p.brass, 0, 0.17, 0, 0.15, 0.05);
  root.add(arm);
  arm.position.y = 0.17;
  box(arm, p.brass, 0, 0.17, 0, 0.055, 0.34, 0.055);
  cylinder(arm, p.orange, 0, 0.34, 0, 0.07, 0.25).rotation.z = Math.PI / 2;
  const lamp = cylinder(root, p.orange, 0.15, 0.18, 0.09, 0.035, 0.025);
  return { root, arm, lamp };
}
function postOffice(parent: T.Object3D, p: Palette) {
  const g = new T.Group();
  g.position.set(X(-0.12), 0, Z(10));
  parent.add(g);
  box(g, p.teal, 0, 0.62, 0, 0.98, 1.18, 0.77, 0.12);
  box(g, p.cream, 0, 0.62, 0.415, 0.71, 0.9, 0.08, 0.045);
  box(g, p.dark, 0, 0.67, 0.465, 0.51, 0.19, 0.025, 0.025);
  box(g, p.brass, 0, 0.3, 0.47, 0.49, 0.025, 0.03);
  box(g, p.orange, 0, 1.24, 0, 1.12, 0.15, 0.95, 0.09);
  const roof = mesh(new T.ConeGeometry(0.84, 0.45, 4), p.orange, g, 0, 1.52, 0);
  roof.rotation.y = Math.PI / 4;
  roof.scale.z = 0.85;
  label(g, "POST", 0, 1.035, 0.48, "#fff1cb", "#397b75", 0.4);
  cylinder(g, p.brass, 0.62, 1.4, 0, 0.027, 1.8);
  box(g, p.orange, 0.82, 2.05, 0, 0.4, 0.24, 0.035);
}
function lighthouse(parent: T.Object3D, p: Palette) {
  const g = new T.Group();
  g.position.set(X(14.5), 2, Z(0.8));
  parent.add(g);
  cylinder(g, p.dark, 0, 0.12, 0, 0.85, 0.24);
  cylinder(g, p.brass, 0, 0.3, 0, 0.76, 0.16);
  cylinder(g, p.cream, 0, 1.52, 0, 0.63, 2.35, 0.43, 12);
  cylinder(g, p.teal, 0, 1.8, 0, 0.535, 0.37, 0.5, 12);
  for (const yy of [0.6, 2.42])
    cylinder(g, p.brass, 0, yy, 0, 0.65 - yy * 0.07, 0.1);
  box(g, p.dark, 0, 0.7, 0.61, 0.29, 0.51, 0.05, 0.1);
  for (const side of [-1, 1])
    box(g, p.dark, side * 0.28, 2.13, 0.45, 0.12, 0.28, 0.08, 0.05);
  cylinder(g, p.dark, 0, 2.79, 0, 0.83, 0.14);
  cylinder(g, p.brass, 0, 2.87, 0, 0.9, 0.045);
  cylinder(g, p.window, 0, 3.29, 0, 0.47, 0.7, 0.47, 12);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    cylinder(
      g,
      p.dark,
      Math.cos(a) * 0.5,
      3.29,
      Math.sin(a) * 0.5,
      0.035,
      0.82,
    );
    cylinder(
      g,
      p.brass,
      Math.cos(a) * 0.8,
      3.02,
      Math.sin(a) * 0.8,
      0.023,
      0.35,
    );
  }
  const ring = mesh(
    new T.TorusGeometry(0.8, 0.025, 6, 32),
    p.brass,
    g,
    0,
    3.18,
    0,
  );
  ring.rotation.x = Math.PI / 2;
  cylinder(g, p.teal, 0, 3.84, 0, 0.76, 0.48, 0, 12);
  cylinder(g, p.brass, 0, 4.2, 0, 0.04, 0.4);
  orb(g, p.orange, 0, 4.42, 0, 0.08);
  label(
    parent,
    "SKYMAIL  /  05",
    X(14),
    2.2,
    Z(4.57),
    "#eaddbe",
    "#315451",
    0.85,
  );
}
export function batch(group: T.Group) {
  group.updateMatrixWorld(true);
  const materials = new Map<T.Material, T.BufferGeometry[]>();
  const inverse = group.matrixWorld.clone().invert();
  const remove: T.Mesh[] = [];
  group.traverse((obj) => {
    if (
      !(obj instanceof T.Mesh) ||
      Array.isArray(obj.material) ||
      !(obj.material instanceof T.MeshStandardMaterial)
    )
      return;
    const geo = obj.geometry.index
      ? obj.geometry.toNonIndexed()
      : obj.geometry.clone();
    geo.applyMatrix4(
      new T.Matrix4().multiplyMatrices(inverse, obj.matrixWorld),
    );
    const list = materials.get(obj.material) ?? [];
    list.push(geo);
    materials.set(obj.material, list);
    remove.push(obj);
  });
  for (const item of remove) {
    item.removeFromParent();
    item.geometry.dispose();
  }
  for (const [mat, geos] of materials) {
    const merged = mergeGeometries(geos);
    if (merged) mesh(merged, mat, group);
    geos.forEach((g) => g.dispose());
  }
}
export function createWorld(p: Palette) {
  const g = new T.Group();
  island(g, p, 0, 4, 6, 10, 0);
  island(g, p, 6, 10, 6, 10, 0);
  island(g, p, 6, 10, 1, 4, 2);
  island(g, p, 12, 15, 1, 4, 2);
  postOffice(g, p);
  lighthouse(g, p);
  socket(g, p, ...STATIONS.bridge, 0, "01");
  socket(g, p, ...STATIONS.turntable, 2, "03");
  socket(g, p, ...STATIONS.beacon, 2, "04");

  cylinder(g, p.dark, X(1), 0.05, Z(8), 0.4, 0.1);
  cylinder(g, p.brass, X(1), 0.12, Z(8), 0.33, 0.05);
  label(g, "DEPARTURES", X(2), -0.36, Z(10.64), "#f9eccc", "#315451", 0.9);
  label(g, "THE WIND GARDEN", X(8), -0.4, Z(10.64), "#f9eccc", "#315451", 1.1);
  label(
    g,
    "SWITCHBACK TERRACE",
    X(8),
    1.62,
    Z(4.64),
    "#f9eccc",
    "#315451",
    1.1,
  );
  for (const [x, z, y, s] of [
    [4.35, 10.3, 0, 0.8],
    [6.2, 10.25, 0, 0.85],
    [10.45, 6.15, 0, 0.6],
    [6, 3.9, 2, 0.75],
    [12.1, 4.4, 2, 0.8],
    [15.4, 3.8, 2, 0.55],
  ] as const)
    tree(g, p, X(x), y, Z(z), s);
  for (const [x, z, y] of [
    [3.4, 6.25, 0],
    [6.5, 9.5, 0],
    [9.5, 9.5, 0],
    [6.2, 2.5, 2],
    [13, 1.15, 2],
    [15, 4, 2],
  ] as const)
    flowers(g, p, X(x), y, Z(z));
  for (const [i, [x, z]] of STAMPS.entries()) {
    cylinder(g, p.brass, X(x), i === 2 ? 2.07 : 0.07, Z(z), 0.28, 0.06);
    cylinder(g, p.teal, X(x), i === 2 ? 2.11 : 0.11, Z(z), 0.22, 0.025);
  }
  // Piston, guide rails, and lift housing.
  cylinder(g, p.dark, X(8), -0.65, Z(5), 0.66, 0.35);
  cylinder(g, p.brass, X(8), 0.35, Z(5), 0.19, 2.1);
  for (const x of [7.55, 8.45]) {
    cylinder(g, p.dark, X(x), 0.95, Z(4.75), 0.055, 2.9);
    cylinder(g, p.brass, X(x), 2.45, Z(4.75), 0.09, 0.08);
  }
  const cog = gear(g, p, 0.62);
  cog.position.set(X(8), -0.65, Z(6.1));
  cog.rotation.x = Math.PI / 2;
  // Bridge abutments make the gaps and their destinations legible.
  for (const x of [4.43, 5.57])
    box(g, p.brass, X(x), -0.15, Z(8), 0.16, 0.28, 1.05);
  for (const x of [10.43, 11.57])
    box(g, p.brass, X(x), 1.87, Z(2), 0.16, 0.24, 1.05);
  box(g, p.brass, X(4.23), 0.055, Z(7.5), 0.055, 0.035, 1.0, 0.01);
  box(g, p.brass, X(10.25), 2.055, Z(2.55), 0.055, 0.035, 0.8, 0.01);
  for (const [x, z, y] of [
    [3.5, 8, 0],
    [6.6, 8, 0],
    [8, 6.4, 0],
    [10, 2, 2],
    [12.5, 2, 2],
  ] as const) {
    for (const zz of [-0.055, 0.055]) {
      const arrow = box(
        g,
        p.brass,
        X(x),
        y + 0.06,
        Z(z) + zz,
        0.14,
        0.012,
        0.025,
        0.006,
      );
      arrow.rotation.y = zz > 0 ? -0.7 : 0.7;
    }
  }
  // Tiny rooftop observatory on the upper terrace.
  cylinder(g, p.teal, X(9.6), 2.32, Z(0.7), 0.46, 0.65, 0.4);
  const dome = mesh(
    new T.SphereGeometry(0.45, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    p.brass,
    g,
    X(9.6),
    2.63,
    Z(0.7),
  );
  dome.scale.y = 0.8;
  const telescope = cylinder(g, p.dark, X(9.6), 2.86, Z(0.4), 0.1, 0.7);
  telescope.rotation.x = Math.PI / 3;
  // Windmill, outside the walking grid.
  cylinder(g, p.stone, X(10.75), 0.33, Z(8.6), 0.46, 0.67, 0.31, 8);
  cylinder(g, p.cream, X(10.75), 1.0, Z(8.6), 0.27, 0.8, 0.2, 8);
  cylinder(g, p.teal, X(10.75), 1.54, Z(8.6), 0.42, 0.45, 0, 8);
  batch(g);
  return g;
}
export function createBridge(p: Palette, turn = false) {
  const g = new T.Group();
  box(g, p.dark, 0, -0.13, 0, 1.05, 0.18, 0.83);
  for (let i = 0; i < 5; i++)
    box(g, p.wood, (i - 2) * 0.205, 0.015, 0, 0.19, 0.11, 0.91, 0.025);
  for (const z of [-0.43, 0.43]) {
    box(g, p.brass, 0, 0.12, z, 1.1, 0.05, 0.055, 0.02);
    for (const x of [-0.42, 0.42])
      cylinder(g, p.brass, x, 0.27, z, 0.025, 0.32);
    box(g, p.brass, 0, 0.43, z, 1, 0.035, 0.035, 0.01);
  }
  if (turn) {
    g.children.forEach((o) => {
      o.position.x += 0.5;
    });
    cylinder(g, p.dark, 0, -0.25, 0, 0.28, 0.4);
    cylinder(g, p.brass, 0, -0.03, 0, 0.32, 0.07);
  }
  batch(g);
  return g;
}
export function createLift(p: Palette) {
  const g = new T.Group();
  cylinder(g, p.dark, 0, -0.1, 0, 0.57, 0.22);
  cylinder(g, p.brass, 0, 0.025, 0, 0.53, 0.04);
  cylinder(g, p.wood, 0, 0.06, 0, 0.46, 0.04);
  for (const z of [-0.4, 0.4]) {
    for (const x of [-0.25, 0.25]) cylinder(g, p.brass, x, 0.25, z, 0.022, 0.4);
    box(g, p.brass, 0, 0.45, z, 0.6, 0.035, 0.035);
  }
  batch(g);
  return g;
}
export function disposeTree(root: T.Object3D) {
  const geometries = new Set<T.BufferGeometry>(),
    materials = new Set<T.Material>();
  root.traverse((o) => {
    if (o instanceof T.Mesh) {
      geometries.add(o.geometry);
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
        materials.add(m),
      );
    }
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => {
    if ("map" in m && m.map instanceof T.Texture) m.map.dispose();
    m.dispose();
  });
}
