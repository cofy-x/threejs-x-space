import { BufferGeometry, Float32BufferAttribute, ShapeUtils, Vector2, Vector3 } from "three";

const TAU = Math.PI * 2;

export interface AirfoilOptions {
  hubRadius: number;
  span: number;
  chord: number;
  sweep?: number;
  twist?: number;
  spanSteps?: number;
}

/** Closed, cambered NACA-style section with spanwise sweep, taper, and twist. */
export function airfoilGeometry({ hubRadius, span, chord, sweep = 0.1, twist = 0.55, spanSteps = 12 }: AirfoilOptions) {
  const contourSteps = 32;
  const vertices: number[] = [];
  const indices: number[] = [];
  for (let row = 0; row <= spanSteps; row++) {
    const t = row / spanSteps;
    const width = chord * (0.72 + 0.43 * Math.sin(t * Math.PI * 0.65));
    const pitch = 0.38 + twist * t;
    for (let step = 0; step < contourSteps; step++) {
      const angle = (step / contourSteps) * TAU;
      const u = (1 - Math.cos(angle)) / 2;
      const thickness = 5 * (0.1 - 0.052 * t) * width * (
        0.2969 * Math.sqrt(u) - 0.126 * u - 0.3516 * u ** 2 + 0.2843 * u ** 3 - 0.1036 * u ** 4
      ) * (step < contourSteps / 2 ? 1 : -1);
      const camber = width * 0.075 * Math.sin(Math.PI * u);
      const across = (u - 0.46) * width;
      const height = camber + thickness;
      const tangential = across * Math.sin(pitch) + height * Math.cos(pitch) + sweep * t ** 1.7;
      const radius = hubRadius + span * t;
      vertices.push(
        across * Math.cos(pitch) - height * Math.sin(pitch) + sweep * 0.65 * t ** 1.8,
        Math.sqrt(Math.max(0, radius ** 2 - tangential ** 2)),
        tangential,
      );
    }
  }
  for (let row = 0; row < spanSteps; row++) {
    for (let step = 0; step < contourSteps; step++) {
      const a = row * contourSteps + step;
      const b = row * contourSteps + (step + 1) % contourSteps;
      indices.push(a, b, a + contourSteps, b, b + contourSteps, a + contourSteps);
    }
  }
  for (const row of [0, spanSteps]) {
    const base = row * contourSteps;
    const offset = vertices.length / 3;
    const contour = Array.from({ length: contourSteps }, (_, step) => {
      const index = (base + step) * 3;
      const { x, y, z } = new Vector3().fromArray(vertices, index);
      // Separate cap vertices preserve the sharp boundary against the blade skin.
      vertices.push(x, y, z);
      return new Vector2(x, z);
    });
    // The cambered contour is concave, so a fan from its leading edge overlaps itself.
    // CCW triangles in X/Z face toward negative Y, so reverse the tip cap.
    for (const [a, b, c] of ShapeUtils.triangulateShape(contour, [])) {
      if (a === undefined || b === undefined || c === undefined) continue;
      indices.push(offset + a, offset + (row === 0 ? b : c), offset + (row === 0 ? c : b));
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
