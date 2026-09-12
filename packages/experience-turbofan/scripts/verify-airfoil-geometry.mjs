import assert from "node:assert/strict";
import test from "node:test";
import { airfoilGeometry } from "../src/components/three/airfoil-geometry.ts";

// Use the actual fan recipe: its concave root/tip exposed the overlapping-cap bug.
const FAN = { hubRadius: 0.42, span: 1.055, chord: 0.54, sweep: 0.26, twist: 0.65, spanSteps: 16 };
const CONTOUR_STEPS = 32;
const CAP_TRIANGLES = CONTOUR_STEPS - 2;

function capAreaChecks(geometry, spanSteps) {
  const positions = geometry.getAttribute("position");
  const indices = geometry.getIndex();
  const skinVertices = (spanSteps + 1) * CONTOUR_STEPS;
  const skinIndexCount = spanSteps * CONTOUR_STEPS * 6;

  for (const cap of [0, 1]) {
    const firstVertex = skinVertices + cap * CONTOUR_STEPS;
    let polygonArea = 0;
    let triangleArea = 0;
    for (let step = 0; step < CONTOUR_STEPS; step++) {
      const a = firstVertex + step;
      const b = firstVertex + (step + 1) % CONTOUR_STEPS;
      polygonArea += positions.getX(a) * positions.getZ(b) - positions.getX(b) * positions.getZ(a);
    }
    polygonArea = Math.abs(polygonArea / 2);

    for (let triangle = 0; triangle < CAP_TRIANGLES; triangle++) {
      const offset = skinIndexCount + (cap * CAP_TRIANGLES + triangle) * 3;
      const a = indices.getX(offset);
      const b = indices.getX(offset + 1);
      const c = indices.getX(offset + 2);
      const area = (
        (positions.getX(b) - positions.getX(a)) * (positions.getZ(c) - positions.getZ(a)) -
        (positions.getX(c) - positions.getX(a)) * (positions.getZ(b) - positions.getZ(a))
      ) / 2;
      assert.ok(area * (cap === 0 ? 1 : -1) > 0, `Cap ${cap}, triangle ${triangle}: reversed or degenerate winding`);
      triangleArea += Math.abs(area);
    }

    assert.ok(
      Math.abs(triangleArea - polygonArea) < polygonArea * 0.00001,
      `Cap ${cap}: triangle area ${triangleArea} must equal contour area ${polygonArea}; overlapping fans fail this check`,
    );
  }
}

function withGeometry(options, check) {
  const geometry = airfoilGeometry(options);
  try {
    check(geometry);
  } finally {
    geometry.dispose();
  }
}

test("actual fan root and tip cover their concave contours without overlap or flipped triangles", () => {
  withGeometry(FAN, (geometry) => capAreaChecks(geometry, FAN.spanSteps));
});

test("compressor, stator, and support caps remain correctly triangulated with different twist and sweep", () => {
  const rows = [
    { hubRadius: 0.4, span: 0.5, chord: 0.17, sweep: 0.06, twist: 0.43, spanSteps: 8 },
    { hubRadius: 0.4, span: 0.464, chord: 0.072, sweep: -0.04, twist: -0.82, spanSteps: 5 },
    { hubRadius: 0.93, span: 0.64, chord: 0.28, sweep: 0.03, twist: 0.06, spanSteps: 5 },
  ];
  for (const row of rows) withGeometry(row, (geometry) => capAreaChecks(geometry, row.spanSteps));
});

test("fan cap vertices retain radial bounds and independent outward-facing normals", () => {
  withGeometry(FAN, (geometry) => {
    const positions = geometry.getAttribute("position");
    const normals = geometry.getAttribute("normal");
    const skinVertices = (FAN.spanSteps + 1) * CONTOUR_STEPS;
    assert.equal(positions.count, skinVertices + 2 * CONTOUR_STEPS);

    for (const cap of [0, 1]) {
      const radius = FAN.hubRadius + cap * FAN.span;
      const firstVertex = skinVertices + cap * CONTOUR_STEPS;
      for (let step = 0; step < CONTOUR_STEPS; step++) {
        const index = firstVertex + step;
        const y = positions.getY(index);
        const z = positions.getZ(index);
        assert.ok(Math.abs(Math.hypot(y, z) - radius) < 0.000001);
        const radialNormal = (normals.getY(index) * y + normals.getZ(index) * z) / radius;
        assert.ok(radialNormal * (cap === 0 ? -1 : 1) > 0, `Cap ${cap}, vertex ${step}: cap normal points into the solid`);
      }
    }
  });
});

test("the capped fan is a closed, consistently wound surface after welding normal seams", () => {
  withGeometry(FAN, (geometry) => {
    const positions = geometry.getAttribute("position");
    const indices = geometry.getIndex();
    const vertexIds = new Map();
    const welded = [];
    for (let index = 0; index < positions.count; index++) {
      const key = [positions.getX(index), positions.getY(index), positions.getZ(index)]
        .map((coordinate) => Math.round(coordinate * 1000000)).join(",");
      if (!vertexIds.has(key)) vertexIds.set(key, vertexIds.size);
      welded.push(vertexIds.get(key));
    }
    const edges = new Map();
    for (let offset = 0; offset < indices.count; offset += 3) {
      for (let side = 0; side < 3; side++) {
        const a = welded[indices.getX(offset + side)];
        const b = welded[indices.getX(offset + (side + 1) % 3)];
        assert.notEqual(a, b, "Triangle edge must not collapse");
        const key = `${Math.min(a, b)},${Math.max(a, b)}`;
        const entry = edges.get(key) ?? { count: 0, winding: 0 };
        entry.count++;
        entry.winding += a < b ? 1 : -1;
        edges.set(key, entry);
      }
    }
    for (const [edge, entry] of edges) {
      assert.equal(entry.count, 2, `Edge ${edge} must have exactly two incident triangles`);
      assert.equal(entry.winding, 0, `Edge ${edge} must have opposite directions in its two triangles`);
    }
  });
});
