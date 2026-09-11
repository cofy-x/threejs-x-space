import {
  CanvasTexture,
  CatmullRomCurve3,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Shape,
  SRGBColorSpace,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from "three";
import type { BufferGeometry, Material } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type Point = [number, number, number];

export function box(
  parent: Group,
  size: Point,
  position: Point,
  material: Material,
  radius = 0.035,
): Mesh {
  const geometry = new RoundedBoxGeometry(
    ...size,
    2,
    Math.min(radius, ...size.map((v) => v / 3)),
  );
  return add(parent, geometry, position, material);
}

export function add(
  parent: Group,
  geometry: BufferGeometry,
  position: Point,
  material: Material,
): Mesh {
  const mesh = new Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function cylinder(
  parent: Group,
  radius: number,
  depth: number,
  position: Point,
  material: Material,
  axis: "x" | "y" | "z" = "y",
  topRadius = radius,
): Mesh {
  const mesh = add(
    parent,
    new CylinderGeometry(topRadius, radius, depth, 32),
    position,
    material,
  );
  if (axis === "x") mesh.rotation.z = Math.PI / 2;
  if (axis === "z") mesh.rotation.x = Math.PI / 2;
  return mesh;
}

export function ring(
  parent: Group,
  radius: number,
  tube: number,
  position: Point,
  material: Material,
  axis: "x" | "y" | "z" = "z",
  arc = Math.PI * 2,
): Mesh {
  const mesh = add(
    parent,
    new TorusGeometry(radius, tube, 8, 48, arc),
    position,
    material,
  );
  if (axis === "x") mesh.rotation.y = Math.PI / 2;
  if (axis === "y") mesh.rotation.x = Math.PI / 2;
  return mesh;
}

export function shell(
  parent: Group,
  points: [number, number][],
  depth: number,
  position: Point,
  material: Material,
  bevel = 0.04,
): Mesh {
  const shape = new Shape();
  const first = points[0];
  if (!first) throw new Error("An armor panel requires a polygon.");
  shape.moveTo(...first);
  points.slice(1).forEach((p) => shape.lineTo(...p));
  shape.closePath();
  const geometry = new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: bevel,
    bevelThickness: bevel,
  });
  geometry.translate(0, 0, -depth / 2);
  return add(parent, geometry, position, material);
}

export function cable(
  parent: Group,
  points: Point[],
  radius: number,
  material: Material,
): Mesh {
  return add(
    parent,
    new TubeGeometry(
      new CatmullRomCurve3(points.map((p) => new Vector3(...p))),
      18,
      radius,
      6,
      false,
    ),
    [0, 0, 0],
    material,
  );
}

export function label(
  parent: Group,
  text: string,
  size: [number, number],
  position: Point,
  color = "#253035",
  background?: string,
): Mesh {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas texture creation is unavailable.");
  if (background) {
    context.fillStyle = background;
    context.fillRect(0, 0, 512, 128);
  }
  context.fillStyle = color;
  context.font = "600 58px monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, 256, 66, 480);
  const map = new CanvasTexture(canvas);
  map.colorSpace = SRGBColorSpace;
  const material = new MeshStandardMaterial({
    map,
    transparent: !background,
    roughness: 0.6,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  const mesh = add(parent, new PlaneGeometry(...size), position, material);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

/** Batch static surfaces within each joint; animated child groups retain their pivots. */
export function batchSurfaces(group: Group): void {
  const buckets = new Map<Material, Mesh[]>();
  for (const child of [...group.children]) {
    if (child instanceof Group) batchSurfaces(child);
    if (child instanceof Mesh && !Array.isArray(child.material)) {
      const entries = buckets.get(child.material) ?? [];
      entries.push(child);
      buckets.set(child.material, entries);
    }
  }
  for (const [material, meshes] of buckets) {
    if (meshes.length < 2) continue;
    const geometries = meshes.map((mesh) => {
      mesh.updateMatrix();
      const geometry = mesh.geometry.index
        ? mesh.geometry.toNonIndexed()
        : mesh.geometry.clone();
      geometry.applyMatrix4(mesh.matrix);
      return geometry;
    });
    const merged = mergeGeometries(geometries);
    geometries.forEach((geometry) => geometry.dispose());
    if (!merged) continue;
    for (const mesh of meshes) {
      group.remove(mesh);
      mesh.geometry.dispose();
    }
    add(group, merged, [0, 0, 0], material);
  }
}

export function disposeModel(root: Group): void {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  root.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    geometries.add(child.geometry);
    (Array.isArray(child.material) ? child.material : [child.material]).forEach(
      (m) => materials.add(m),
    );
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => {
    if (material instanceof MeshStandardMaterial) material.map?.dispose();
    material.dispose();
  });
}
