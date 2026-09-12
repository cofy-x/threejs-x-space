import * as THREE from "three";

type Point = readonly [number, number];

interface Current {
  points: readonly Point[];
  channel: number;
  width: number;
  fibers: number;
  phase: number;
  wash: number;
}

interface Sample {
  x: number;
  y: number;
  nx: number;
  ny: number;
  tx: number;
  ty: number;
  width: number;
}

const TAU = Math.PI * 2;
const SEGMENTS = 228;

// The three currents are composed together, with a loose central opening and
// different rhythms. Their palette is applied later by the paper compositor.
const CURRENTS: readonly Current[] = [
  {
    channel: 0,
    width: 0.11,
    fibers: 108,
    phase: 0.6,
    wash: 0.17,
    points: [
      [-0.94, -0.31], [-0.7, -0.33], [-0.43, -0.12], [-0.18, 0.11],
      [0.11, 0.17], [0.38, 0.12], [0.62, 0.25], [0.67, 0.49],
      [0.48, 0.61], [0.27, 0.52], [0.19, 0.29], [0.27, 0.04],
      [0.5, -0.11], [0.78, -0.07], [0.91, 0.09],
    ],
  },
  {
    channel: 2,
    width: 0.086,
    fibers: 86,
    phase: 2.8,
    wash: 0.145,
    points: [
      [-0.86, 0.23], [-0.6, 0.18], [-0.43, -0.03], [-0.44, -0.29],
      [-0.22, -0.47], [0.07, -0.41], [0.24, -0.19], [0.16, 0.04],
      [-0.04, 0.17], [-0.14, 0.34], [-0.05, 0.45], [0.17, 0.37],
      [0.42, 0.19], [0.71, 0.2],
    ],
  },
  {
    channel: 1,
    width: 0.063,
    fibers: 68,
    phase: 4.1,
    wash: 0.16,
    points: [
      [-0.92, -0.02], [-0.67, 0.03], [-0.5, 0.26], [-0.26, 0.38],
      [0.02, 0.26], [0.11, 0.03], [0.04, -0.24], [0.19, -0.51],
      [0.45, -0.59], [0.68, -0.48], [0.76, -0.29], [0.65, -0.15],
      [0.52, -0.23], [0.61, -0.36], [0.91, -0.43],
    ],
  },
];

const vertexShader = /* glsl */ `
  attribute vec3 pigment;
  varying vec3 vPigment;
  varying vec2 vPaper;
  varying vec2 vStroke;

  void main() {
    vPigment = pigment;
    vPaper = position.xy;
    vStroke = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const washFragmentShader = /* glsl */ `
  varying vec3 vPigment;
  varying vec2 vPaper;
  varying vec2 vStroke;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + 1.0), f.x), f.y);
  }

  void main() {
    float across = abs(vStroke.x);
    float mottle = noise(vPaper * 23.0) * 0.65 + noise(vPaper * 71.0) * 0.35;
    float feather = 1.0 - smoothstep(0.22, 1.0, across + (mottle - 0.5) * 0.15);
    float ends = smoothstep(0.0, 0.075, vStroke.y)
      * smoothstep(0.0, 0.11, 1.0 - vStroke.y);
    float grain = mix(0.62, 1.12, noise(vPaper * 360.0));
    float body = feather * (0.42 + mottle * 0.7) * grain;
    gl_FragColor = vec4(vPigment * body * ends, 1.0);
  }
`;

const fiberFragmentShader = /* glsl */ `
  varying vec3 vPigment;

  void main() {
    gl_FragColor = vec4(vPigment, 1.0);
  }
`;

function randomSource(seed: number) {
  let state = seed;
  return () => {
    state += 0x6d2b79f5;
    let n = state;
    n = Math.imul(n ^ (n >>> 15), n | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}

function smoothEdge(value: number, edge: number) {
  const t = Math.min(1, Math.max(0, value / edge));
  return t * t * (3 - 2 * t);
}

function makeMaterial(fragmentShader: string) {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}

/** Creates dry pigment in clip space, independent of the live particle state. */
export function createInkComposition(aspect: number): {
  scene: THREE.Scene;
  dispose: () => void;
} {
  const scene = new THREE.Scene();
  const geometries: THREE.BufferGeometry[] = [];
  const washMaterial = makeMaterial(washFragmentShader);
  const fiberMaterial = makeMaterial(fiberFragmentShader);
  const random = randomSource(821073);
  const mobile = aspect < 0.8;
  const widthScale = mobile ? 0.43 : 0.84;
  const safeAspect = Math.max(0.3, aspect);
  const fiberPositions: number[] = [];
  const fiberPigments: number[] = [];

  for (const current of CURRENTS) {
    const curve = new THREE.CatmullRomCurve3(
      current.points.map(([x, y]) => new THREE.Vector3(
        x * (mobile ? 0.89 : 0.83) + (mobile ? 0.015 : 0.065),
        y * (mobile ? 0.71 : 0.83) - (mobile ? 0.085 : 0.055),
        0,
      )),
      false,
      "centripetal",
    );
    const samples: Sample[] = [];
    const position = new THREE.Vector3();
    const tangent = new THREE.Vector3();

    for (let i = 0; i <= SEGMENTS; i++) {
      const t = i / SEGMENTS;
      curve.getPoint(t, position);
      curve.getTangent(t, tangent);
      const tx = tangent.x * safeAspect;
      const ty = tangent.y;
      const length = Math.hypot(tx, ty);
      const taper = Math.pow(Math.sin(Math.PI * t), 0.56);
      const breathing = 0.76 + Math.sin(t * TAU * 2.2 + current.phase) * 0.19
        + Math.sin(t * TAU * 5.6 - current.phase) * 0.1;
      samples.push({
        x: position.x,
        y: position.y,
        nx: -ty / length / safeAspect,
        ny: tx / length,
        tx: tx / length / safeAspect,
        ty: ty / length,
        width: current.width * widthScale * taper * breathing,
      });
    }

    const washPositions: number[] = [];
    const washPigments: number[] = [];
    const washUvs: number[] = [];
    const washIndices: number[] = [];

    for (let i = 0; i <= SEGMENTS; i++) {
      const sample = samples[i];
      if (!sample) continue;
      for (const side of [-1, 1]) {
        const offset = sample.width * side * 1.35;
        washPositions.push(sample.x + sample.nx * offset, sample.y + sample.ny * offset, 0);
        washPigments.push(
          current.channel === 0 ? current.wash : 0,
          current.channel === 1 ? current.wash : 0,
          current.channel === 2 ? current.wash : 0,
        );
        washUvs.push(side, i / SEGMENTS);
      }
      if (i < SEGMENTS) {
        const vertex = i * 2;
        washIndices.push(vertex, vertex + 1, vertex + 2, vertex + 1, vertex + 3, vertex + 2);
      }
    }

    const washGeometry = new THREE.BufferGeometry();
    washGeometry.setAttribute("position", new THREE.Float32BufferAttribute(washPositions, 3));
    washGeometry.setAttribute("pigment", new THREE.Float32BufferAttribute(washPigments, 3));
    washGeometry.setAttribute("uv", new THREE.Float32BufferAttribute(washUvs, 2));
    washGeometry.setIndex(washIndices);
    geometries.push(washGeometry);
    const wash = new THREE.Mesh(washGeometry, washMaterial);
    wash.frustumCulled = false;
    scene.add(wash);

    for (let fiber = 0; fiber < current.fibers; fiber++) {
      const across = (fiber / (current.fibers - 1) * 2 - 1) + (random() - 0.5) * 0.028;
      const phase = random() * TAU;
      const frequency = 1.3 + random() * 2.1;
      const wandering = 0.035 + random() * 0.07;
      const stray = fiber % 13 === 0;
      const spread = stray ? 1.25 + random() * 0.34 : 1;
      const start = Math.floor(random() * (stray ? 25 : 9));
      const end = SEGMENTS - Math.floor(random() * (stray ? 34 : 12));
      const strength = (0.035 + Math.pow(random(), 1.7) * 0.093) * (stray ? 0.6 : 1);
      let previousX = 0;
      let previousY = 0;
      let previousStrength = 0;

      for (let i = start; i <= end; i++) {
        const t = i / SEGMENTS;
        const sample = samples[i];
        if (!sample) continue;
        const flow = Math.sin(t * TAU * frequency + phase) * wandering
          + Math.sin(t * TAU * (frequency * 2.3) - phase) * 0.018;
        const fold = Math.sin(t * TAU * 1.7 + current.phase) * (1 - across * across) * 0.2;
        const offset = (across * spread + flow + fold) * sample.width;
        const lengthwise = Math.sin(t * TAU * 3 + phase) * sample.width * across * 0.11;
        const x = sample.x + sample.nx * offset + sample.tx * lengthwise;
        const y = sample.y + sample.ny * offset + sample.ty * lengthwise;
        const endFade = smoothEdge((i - start) / SEGMENTS, 0.04)
          * smoothEdge((end - i) / SEGMENTS, 0.065);
        const dry = 0.42 + 0.58 * Math.pow(0.5 + 0.5 * Math.sin(t * TAU * 6.2 + phase), 0.7);
        const energy = strength * dry * endFade;

        if (i > start) {
          fiberPositions.push(previousX, previousY, 0, x, y, 0);
          for (const value of [previousStrength, energy]) {
            fiberPigments.push(
              current.channel === 0 ? value : 0,
              current.channel === 1 ? value : 0,
              current.channel === 2 ? value : 0,
            );
          }
        }
        previousX = x;
        previousY = y;
        previousStrength = energy;
      }
    }
  }

  const fiberGeometry = new THREE.BufferGeometry();
  fiberGeometry.setAttribute("position", new THREE.Float32BufferAttribute(fiberPositions, 3));
  fiberGeometry.setAttribute("pigment", new THREE.Float32BufferAttribute(fiberPigments, 3));
  geometries.push(fiberGeometry);
  const fibers = new THREE.LineSegments(fiberGeometry, fiberMaterial);
  fibers.frustumCulled = false;
  scene.add(fibers);

  return {
    scene,
    dispose: () => {
      geometries.forEach((geometry) => geometry.dispose());
      washMaterial.dispose();
      fiberMaterial.dispose();
      scene.clear();
    },
  };
}
