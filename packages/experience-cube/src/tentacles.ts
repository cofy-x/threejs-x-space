import * as T from "three";
import type { Move } from "./cube-state";

const LENGTH_SEGMENTS = 56,
  RADIAL_SEGMENTS = 16,
  SUCKERS = 24;
const UP = new T.Vector3(0, 1, 0),
  DOWN = new T.Vector3(0, -1, 0);
const AXES = { x: new T.Vector3(1, 0, 0), y: UP, z: new T.Vector3(0, 0, 1) };
const smooth = (value: number) => {
  const t = T.MathUtils.clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};
const radiusAt = (t: number) => 0.189 * Math.pow(1 - t, 1.15);

function skinBump() {
  const n = 256,
    data = new Uint8Array(n * n * 4);
  let seed = 73;
  for (let i = 0; i < n * n; i++) {
    seed = Math.imul(seed, 1664525) + 1013904223;
    const value = 110 + ((seed >>> 24) % 65);
    data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = value;
    data[i * 4 + 3] = 255;
  }
  const texture = new T.DataTexture(data, n, n);
  texture.wrapS = texture.wrapT = T.RepeatWrapping;
  texture.magFilter = T.LinearFilter;
  texture.minFilter = T.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.repeat.set(3, 1);
  texture.needsUpdate = true;
  return texture;
}

/** Continuous tapered surfaces, with independently posed concave suction cups. */
export function createTentacles(
  cubePosition: T.Vector3,
  cubeRotation: T.Quaternion,
) {
  const root = new T.Group();
  root.name = "OctoArms";
  const bump = skinBump();
  const skin = new T.MeshPhysicalMaterial({
    color: "#ffffff",
    vertexColors: true,
    roughness: 0.39,
    metalness: 0,
    clearcoat: 0.28,
    clearcoatRoughness: 0.32,
    sheen: 0.55,
    sheenColor: new T.Color("#e9918f"),
    sheenRoughness: 0.6,
    bumpMap: bump,
    bumpScale: 0.016,
  });
  const suckerMaterial = new T.MeshPhysicalMaterial({
    color: "#cf9caa",
    roughness: 0.4,
    clearcoat: 0.22,
    side: T.DoubleSide,
  });
  const cupGeometry = new T.LatheGeometry(
    [
      [0, -0.035],
      [0.35, -0.03],
      [0.55, 0.025],
      [0.77, 0.16],
      [0.96, 0.2],
      [1.06, 0.11],
      [0.99, -0.05],
      [0.63, -0.17],
      [0, -0.18],
    ].map(([r = 0, y = 0]) => new T.Vector2(r, y)),
    20,
  );
  const cups = new T.InstancedMesh(
    cupGeometry,
    suckerMaterial,
    8 * SUCKERS * 2,
  );
  cups.name = "DoubleRowSuctionCups";
  cups.castShadow = true;
  cups.receiveShadow = true;
  cups.frustumCulled = false;
  cups.instanceMatrix.setUsage(T.DynamicDrawUsage);
  root.add(cups);
  const colorTop = new T.Color("#b9503e"),
    colorLight = new T.Color("#df8461"),
    colorBottom = new T.Color("#8e6587"),
    color = new T.Color();
  const angles = [-0.48, 0.48, -1.12, 1.12, -1.89, 1.89, -2.65, 2.65];
  const arms = angles.map((angle, index) => {
    const points = Array.from({ length: 8 }, () => new T.Vector3());
    const curve = new T.CatmullRomCurve3(points, false, "centripetal");
    const geometry = new T.BufferGeometry();
    const vertices = (LENGTH_SEGMENTS + 1) * (RADIAL_SEGMENTS + 1);
    const positions = new Float32Array(vertices * 3),
      normals = new Float32Array(vertices * 3),
      colors = new Float32Array(vertices * 3),
      uvs = new Float32Array(vertices * 2),
      indices: number[] = [];
    for (let i = 0; i <= LENGTH_SEGMENTS; i++) {
      const t = i / LENGTH_SEGMENTS;
      for (let j = 0; j <= RADIAL_SEGMENTS; j++) {
        const v = i * (RADIAL_SEGMENTS + 1) + j,
          phi = (j / RADIAL_SEGMENTS) * Math.PI * 2;
        const underside = smooth((Math.cos(phi) - 0.15) / 0.6);
        const mottle =
          0.5 +
          Math.sin(t * 3.2 + index * 0.9) * Math.cos(phi + index * 0.4) * 0.5;
        color
          .copy(colorTop)
          .lerp(colorLight, 0.18 + mottle * 0.12)
          .lerp(colorBottom, underside * 0.85);
        colors.set([color.r, color.g, color.b], v * 3);
        uvs.set([t * 2, j / RADIAL_SEGMENTS], v * 2);
        if (i < LENGTH_SEGMENTS && j < RADIAL_SEGMENTS) {
          const next = v + RADIAL_SEGMENTS + 1;
          indices.push(v, v + 1, next);
          if (i < LENGTH_SEGMENTS - 1) indices.push(v + 1, next + 1, next);
        }
      }
    }
    const positionAttribute = new T.BufferAttribute(positions, 3).setUsage(
      T.DynamicDrawUsage,
    );
    const normalAttribute = new T.BufferAttribute(normals, 3).setUsage(
      T.DynamicDrawUsage,
    );
    geometry.setIndex(indices);
    geometry.setAttribute("position", positionAttribute);
    geometry.setAttribute("normal", normalAttribute);
    geometry.setAttribute("color", new T.BufferAttribute(colors, 3));
    geometry.setAttribute("uv", new T.BufferAttribute(uvs, 2));
    const mesh = new T.Mesh(geometry, skin);
    mesh.name = `Arm${index + 1}_${index < 4 ? "Manipulation" : "Support"}`;
    mesh.castShadow = true;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;
    root.add(mesh);
    const frames = Array.from({ length: LENGTH_SEGMENTS + 1 }, () => ({
      center: new T.Vector3(),
      tangent: new T.Vector3(),
      normal: new T.Vector3(),
      radius: 0,
    }));
    return {
      index,
      angle,
      name: mesh.name,
      side: angle < 0 ? -1 : 1,
      points,
      curve,
      frames,
      geometry,
      positions,
      normals,
      positionAttribute,
      normalAttribute,
      tipNormal: new T.Vector3(0, -1, 0),
    };
  });
  const center = new T.Vector3(),
    tangent = new T.Vector3(),
    normal = new T.Vector3(),
    binormal = new T.Vector3(),
    radial = new T.Vector3();
  const q = new T.Quaternion(),
    contact = new T.Vector3(),
    rest = new T.Vector3(),
    contactNormal = new T.Vector3(),
    desiredNormal = new T.Vector3();
  const sampleBefore = new T.Vector3(),
    sampleAfter = new T.Vector3(),
    slide = new T.Vector3(),
    chord = new T.Vector3(),
    cross = new T.Vector3();
  const localPoint = new T.Vector3(),
    cubeInverse = cubeRotation.clone().invert();
  const frameRotation = new T.Quaternion();
  const helper = new T.Object3D();
  function cubeDistance(x: number, y: number, z: number) {
    const dx = Math.abs(x) - 0.39,
      dy = Math.abs(y) - 0.39,
      dz = Math.abs(z) - 0.39;
    return (
      Math.hypot(Math.max(dx, 0), Math.max(dy, 0), Math.max(dz, 0)) +
      Math.min(Math.max(dx, dy, dz), 0)
    );
  }
  function clearCube(point: T.Vector3, t: number, side: number) {
    localPoint.copy(point).sub(cubePosition).applyQuaternion(cubeInverse);
    const margin = radiusAt(t) * 1.3 + 0.006;
    if (cubeDistance(localPoint.x, localPoint.y, localPoint.z) >= margin)
      return;
    if (localPoint.lengthSq() < 1e-8) localPoint.set(side * 0.001, 0.001, 0);
    // Radial projection onto an expanded rounded box is continuous across
    // face changes. Its clearance includes the body and protruding cup rims.
    let lo = 1,
      hi = Math.max(1, (Math.sqrt(3) * (0.39 + margin)) / localPoint.length());
    for (let iteration = 0; iteration < 12; iteration++) {
      const scale = (lo + hi) * 0.5;
      if (
        cubeDistance(
          localPoint.x * scale,
          localPoint.y * scale,
          localPoint.z * scale,
        ) < margin
      )
        lo = scale;
      else hi = scale;
    }
    point
      .copy(localPoint)
      .multiplyScalar(hi)
      .applyQuaternion(cubeRotation)
      .add(cubePosition);
  }
  function buildFrames(arm: (typeof arms)[number]) {
    const frames = arm.frames;
    for (let i = 0; i <= LENGTH_SEGMENTS; i++) {
      const current = frames[i];
      if (current) {
        const t = i / LENGTH_SEGMENTS;
        arm.curve.getPoint(t, current.center);
        if (arm.index < 4) clearCube(current.center, t, arm.side);
      }
    }
    for (let i = 0; i <= LENGTH_SEGMENTS; i++) {
      const current = frames[i],
        before = frames[Math.max(0, i - 1)],
        after = frames[Math.min(LENGTH_SEGMENTS, i + 1)];
      if (!current || !before || !after) continue;
      current.tangent.subVectors(after.center, before.center).normalize();
      current.radius = radiusAt(i / LENGTH_SEGMENTS);
      if (i > 0 && i < LENGTH_SEGMENTS) {
        sampleBefore.subVectors(current.center, before.center);
        sampleAfter.subVectors(after.center, current.center);
        chord.subVectors(after.center, before.center);
        const area = cross.crossVectors(sampleBefore, sampleAfter).length();
        if (area > 1e-10) {
          // A tube thicker than its local bend radius folds through itself.
          const bendRadius =
            (sampleBefore.length() * sampleAfter.length() * chord.length()) /
            (2 * area);
          current.radius = Math.min(current.radius, bendRadius * 0.65);
        }
      }
      if (i === 0) {
        current.normal
          .copy(DOWN)
          .addScaledVector(current.tangent, -DOWN.dot(current.tangent));
        if (current.normal.lengthSq() < 0.001)
          current.normal
            .set(1, 0, 0)
            .addScaledVector(current.tangent, -current.tangent.x);
      } else {
        frameRotation.setFromUnitVectors(before.tangent, current.tangent);
        current.normal.copy(before.normal).applyQuaternion(frameRotation);
        current.normal.addScaledVector(
          current.tangent,
          -current.normal.dot(current.tangent),
        );
      }
      current.normal.normalize();
    }
    // Spread a tight bend's radius limit across its neighbors instead of
    // creating a one-ring pinch with nearly vertical cone walls.
    for (let i = 1; i <= LENGTH_SEGMENTS; i++) {
      const current = frames[i],
        before = frames[i - 1];
      if (current && before)
        current.radius = Math.min(
          current.radius,
          before.radius + current.center.distanceTo(before.center) * 0.6,
        );
    }
    for (let i = LENGTH_SEGMENTS - 1; i >= 0; i--) {
      const current = frames[i],
        after = frames[i + 1];
      if (current && after)
        current.radius = Math.min(
          current.radius,
          after.radius + current.center.distanceTo(after.center) * 0.6,
        );
    }
    const end = frames[LENGTH_SEGMENTS];
    if (!end) return;
    desiredNormal
      .copy(arm.tipNormal)
      .addScaledVector(end.tangent, -arm.tipNormal.dot(end.tangent));
    if (desiredNormal.lengthSq() < 0.001) desiredNormal.copy(end.normal);
    desiredNormal.normalize();
    const twist = Math.atan2(
      end.tangent.dot(cross.crossVectors(end.normal, desiredNormal)),
      end.normal.dot(desiredNormal),
    );
    for (let i = 0; i <= LENGTH_SEGMENTS; i++) {
      const current = frames[i];
      if (!current) continue;
      frameRotation.setFromAxisAngle(
        current.tangent,
        twist * smooth(i / LENGTH_SEGMENTS),
      );
      current.normal.applyQuaternion(frameRotation);
    }
  }
  function frame(arm: (typeof arms)[number], t: number) {
    const sample = t * LENGTH_SEGMENTS,
      index = Math.min(LENGTH_SEGMENTS - 1, Math.floor(sample));
    const a = arm.frames[index],
      b = arm.frames[index + 1];
    if (!a || !b) return 0;
    const fraction = sample - index;
    center.copy(a.center).lerp(b.center, fraction);
    tangent.copy(a.tangent).lerp(b.tangent, fraction).normalize();
    normal.copy(a.normal).lerp(b.normal, fraction);
    normal.addScaledVector(tangent, -normal.dot(tangent));
    normal.normalize();
    binormal.crossVectors(tangent, normal).normalize();
    return T.MathUtils.lerp(a.radius, b.radius, fraction);
  }
  function update(
    move: Move | undefined,
    fraction: number,
    turn: number,
    index: number,
    idle: number,
  ) {
    q.identity();
    if (move)
      q.setFromAxisAngle(AXES[move.axis], ((move.turns * Math.PI) / 2) * turn);
    for (const arm of arms) {
      const { side: s, points: p } = arm;
      p[0]?.set(Math.sin(arm.angle) * 0.22, 0.77, Math.cos(arm.angle) * 0.22);
      if (arm.index >= 4) {
        const back = arm.index >= 6,
          z = back ? -0.95 : 0.12;
        p[1]?.set(s * (back ? 0.47 : 0.73), 0.43, back ? -0.5 : -0.12);
        p[2]?.set(s * (back ? 0.92 : 1.2), 0.23, z);
        p[3]?.set(s * (back ? 1.42 : 1.77), 0.21, z + 0.04);
        p[4]?.set(s * (back ? 1.69 : 1.99), 0.42 + idle * 0.025, z + 0.42);
        p[5]?.set(s * (back ? 1.56 : 1.88), 0.75 + idle * 0.035, z + 0.72);
        p[6]?.set(s * (back ? 1.32 : 1.64), 0.77 + idle * 0.035, z + 0.76);
        p[7]?.set(s * (back ? 1.23 : 1.59), 0.58 + idle * 0.03, z + 0.59);
        arm.tipNormal.set(-s * 0.4, 0.15, 1).normalize();
      } else {
        const lower = arm.index >= 2;
        rest.set(
          s * (lower ? 0.23 : 0.435),
          lower ? -0.44 : -0.07,
          lower ? 0.035 : -0.015,
        );
        contact.copy(rest);
        contactNormal.set(lower ? 0 : s, lower ? -1 : 0, 0);
        const activeSide =
          move?.axis === "x" ? move.layer : index % 2 === 0 ? 1 : -1;
        if (move && !lower && s === activeSide) {
          const reach =
            smooth(fraction / 0.18) * (1 - smooth((fraction - 0.82) / 0.18));
          if (move.axis === "x") {
            rest.set(move.layer * 0.435, -0.04, 0.04);
            desiredNormal.set(move.layer, 0, 0);
          } else if (move.axis === "y") {
            rest.set(s * 0.19, move.layer * 0.435, 0.045);
            desiredNormal.set(0, move.layer, 0);
          } else {
            rest.set(s * 0.16, -0.045, move.layer * 0.435);
            desiredNormal.set(0, 0, move.layer);
          }
          rest.applyQuaternion(q);
          contact.lerp(rest, reach);
          contactNormal.lerp(desiredNormal, reach).normalize();
        }
        // A transition between two faces follows the outside of the cube,
        // rather than cutting through its interior along the diagonal chord.
        contact.multiplyScalar(
          0.435 /
            Math.max(
              Math.abs(contact.x),
              Math.abs(contact.y),
              Math.abs(contact.z),
            ),
        );
        contact.applyQuaternion(cubeRotation).add(cubePosition);
        contactNormal.applyQuaternion(cubeRotation);
        slide
          .copy(DOWN)
          .applyQuaternion(cubeRotation)
          .addScaledVector(contactNormal, -slide.dot(contactNormal));
        if (slide.lengthSq() < 0.001)
          slide
            .set(-s, 0, 0)
            .applyQuaternion(cubeRotation)
            .addScaledVector(contactNormal, -slide.dot(contactNormal));
        slide.normalize();
        arm.tipNormal.copy(contactNormal).negate();
        p[1]?.set(
          s * (lower ? 0.79 : 0.55),
          lower ? 0.34 : 0.63,
          lower ? 0.34 : 0.55,
        );
        p[2]?.set(
          s * (lower ? 0.96 : 0.77),
          lower ? 0.3 : 0.61,
          lower ? 0.93 : 0.91,
        );
        rest
          .copy(contact)
          .addScaledVector(contactNormal, 0.23)
          .addScaledVector(slide, -0.16);
        p[3]
          ?.set(
            s * (lower ? 0.96 : 0.77),
            lower ? 0.3 : 0.61,
            lower ? 0.93 : 0.91,
          )
          .lerp(rest, 0.55)
          .addScaledVector(AXES.x, s * 0.16)
          .addScaledVector(UP, lower ? 0 : 0.035);
        p[4]?.copy(rest);
        p[5]
          ?.copy(contact)
          .addScaledVector(contactNormal, 0.075)
          .addScaledVector(slide, -0.065);
        p[6]
          ?.copy(contact)
          .addScaledVector(contactNormal, 0.02)
          .addScaledVector(slide, 0.035);
        p[7]
          ?.copy(contact)
          .addScaledVector(contactNormal, 0.01)
          .addScaledVector(slide, 0.13);
      }
      buildFrames(arm);
      for (let i = 0; i <= LENGTH_SEGMENTS; i++) {
        const t = i / LENGTH_SEGMENTS,
          radius = frame(arm, t);
        for (let j = 0; j <= RADIAL_SEGMENTS; j++) {
          const phi = (j / RADIAL_SEGMENTS) * Math.PI * 2,
            v = (i * (RADIAL_SEGMENTS + 1) + j) * 3;
          radial
            .copy(normal)
            .multiplyScalar(Math.cos(phi))
            .addScaledVector(binormal, Math.sin(phi));
          arm.positions[v] = center.x + radial.x * radius;
          arm.positions[v + 1] = center.y + radial.y * radius;
          arm.positions[v + 2] = center.z + radial.z * radius;
          const vertexNormal = i === LENGTH_SEGMENTS ? tangent : radial;
          arm.normals[v] = vertexNormal.x;
          arm.normals[v + 1] = vertexNormal.y;
          arm.normals[v + 2] = vertexNormal.z;
        }
      }
      arm.positionAttribute.needsUpdate = true;
      arm.normalAttribute.needsUpdate = true;
      for (let i = 0; i < SUCKERS; i++) {
        const t = 0.12 + (i / (SUCKERS - 1)) * 0.83,
          radius = frame(arm, t),
          cupSize = radius * 0.55;
        for (let row = 0; row < 2; row++) {
          radial
            .copy(normal)
            .multiplyScalar(0.89)
            .addScaledVector(binormal, row === 0 ? -0.46 : 0.46)
            .normalize();
          helper.position
            .copy(center)
            .addScaledVector(radial, radius + cupSize * 0.11);
          helper.quaternion.setFromUnitVectors(UP, radial);
          helper.scale.set(cupSize, cupSize * 0.85, cupSize);
          helper.updateMatrix();
          cups.setMatrixAt(
            arm.index * SUCKERS * 2 + i * 2 + row,
            helper.matrix,
          );
        }
      }
    }
    cups.instanceMatrix.needsUpdate = true;
  }
  root.userData.sculptRuntime = {
    parts: arms.map((arm) => arm.name),
    anchors: { cube: cubePosition.toArray() },
    actions: ["grip", "turn", "release", "support"],
  };
  update(undefined, 0, 0, 0, 0);
  return {
    root,
    update,
    dispose: () => {
      arms.forEach((arm) => arm.geometry.dispose());
      cupGeometry.dispose();
      skin.dispose();
      suckerMaterial.dispose();
      bump.dispose();
    },
  };
}
