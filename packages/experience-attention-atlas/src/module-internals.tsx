import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode, type RefObject } from "react";
import * as THREE from "three";
import type { AtlasNode } from "./architecture";
import type { MechanismSpec } from "./mechanisms";

interface ModuleInternalsProps {
  node: AtlasNode;
  spec: MechanismSpec;
  phase: number;
  playing: boolean;
  reducedMotion: boolean;
  speed: number;
  replayKey: number;
  contextSize: number;
}

type Point = [number, number, number];
const Q = "#83bdf0";
const K = "#ba9fe8";
const V = "#e8bf79";
const MUTED = "#627d8d";
const WHITE = "#e4f0ee";
const BACK = "#122532";
// Both bar charts use these same toy logits; their vertical scales are labeled separately.
const TOY_LOGITS = Array.from({ length: 16 }, (_, column) => 5 * Math.exp(-Math.pow((column - 16 * 0.62) / (16 * 0.19), 2)));
const TOY_EXP_SUM = TOY_LOGITS.reduce((sum, value) => sum + Math.exp(value), 0);
const TOY_PROBABILITIES = TOY_LOGITS.map((value) => Math.exp(value) / TOY_EXP_SUM);

interface VisualState {
  time: RefObject<number>;
  phase: number;
  color: string;
  contextSize: number;
  cube: THREE.BoxGeometry;
  dot: THREE.SphereGeometry;
  material: THREE.MeshStandardMaterial;
}
const VisualContext = createContext<VisualState | null>(null);
function useVisual() {
  const state = useContext(VisualContext);
  if (!state) throw new Error("Module detail requires its visual context.");
  return state;
}

function Label({ children, at, color = "#b9cbd5", small = false }: {
  children: ReactNode; at: Point; color?: string; small?: boolean;
}) {
  return <Html center position={at} zIndexRange={[19, 12]} style={{ pointerEvents: "none" }}>
    <span style={{ display: "block", whiteSpace: "nowrap", textAlign: "center", color,
      fontFamily: "inherit", fontSize: small ? 10 : 11, fontWeight: small ? 400 : 550,
      lineHeight: 1.4, textShadow: "0 1px 5px #07121b, 0 0 9px #07121b" }}>{children}</span>
  </Html>;
}

function Tray({ at, width, height, color = MUTED }: { at: Point; width: number; height: number; color?: string }) {
  const { cube } = useVisual();
  return <group position={at}>
    <mesh geometry={cube} scale={[width, height, 0.075]} position={[0, 0, -0.1]}>
      <meshStandardMaterial color={BACK} transparent opacity={0.57} metalness={0.18} roughness={0.45} depthWrite={false} />
    </mesh>
    <mesh geometry={cube} position={[0, height / 2, 0]} scale={[width, 0.013, 0.045]}><meshBasicMaterial color={color} transparent opacity={0.36} /></mesh>
    <mesh geometry={cube} position={[0, -height / 2, 0]} scale={[width, 0.013, 0.045]}><meshBasicMaterial color={color} transparent opacity={0.36} /></mesh>
    <mesh geometry={cube} position={[-width / 2, 0, 0]} scale={[0.013, height, 0.045]}><meshBasicMaterial color={color} transparent opacity={0.36} /></mesh>
    <mesh geometry={cube} position={[width / 2, 0, 0]} scale={[0.013, height, 0.045]}><meshBasicMaterial color={color} transparent opacity={0.36} /></mesh>
  </group>;
}

type GridMode = "steady" | "vector" | "heads" | "lookup" | "experts" | "weights" | "histogram" | "image" | "gate" | "normalized" | "candidate" | "draft" | "probability" | "interleaved" | "prefix";
interface GridProps {
  at: Point;
  columns: number;
  rows: number;
  width: number;
  height: number;
  color?: string;
  mode?: GridMode;
  stage?: number;
  seed?: number;
  framed?: boolean;
}

/** Small cell fields share one box geometry and material throughout an inspection bay. */
function Grid({ at, columns, rows, width, height, color: tint, mode = "vector", stage = 0, seed = 0, framed = false }: GridProps) {
  const { cube, material, time, phase, color } = useVisual();
  const mesh = useRef<THREE.InstancedMesh>(null);
  const scratch = useMemo(() => ({ object: new THREE.Object3D(), color: new THREE.Color(), base: new THREE.Color(tint ?? color), dark: new THREE.Color("#1d3948") }), [tint, color]);
  const last = useRef({ time: -1, phase: -1 });
  const draw = () => {
    if (!mesh.current) return;
    const progress = time.current;
    if (last.current.time === progress && last.current.phase === phase) return;
    last.current.time = progress;
    last.current.phase = phase;
    const { object, color: cellColor, base, dark } = scratch;
    const count = columns * rows;
    const scan = Math.floor(progress * 4 + seed) % Math.max(rows, columns);
    const expertSeed = Math.floor(progress * 0.48);
    for (let i = 0; i < count; i++) {
      const column = i % columns;
      const row = Math.floor(i / columns);
      const signal = 0.5 + 0.5 * Math.sin(progress * 4 - i * 0.47);
      let light = phase === stage ? 0.9 : phase > stage ? 0.68 : 0.3;
      let depth = 0.105;
      let sizeY = height / rows * 0.7;
      let offsetY = 0;
      cellColor.copy(base);
      if (mode === "vector") {
        depth += ((i * 11 + seed) % 9) * 0.012;
        if (phase >= stage && (rows > 1 ? row === scan % rows : column === scan % columns)) { light = 1.32; depth += 0.16 * signal; }
      } else if (mode === "heads") {
        light = phase === 0 ? 0.65 + signal * 0.6 : 0.65;
        if (i === Math.floor(progress * 8) % count) { light = 1.6; depth = 0.23; }
      } else if (mode === "lookup") {
        const chosen = (Math.floor(progress * 1.5) + seed) % rows;
        light = phase >= stage && row === chosen ? 1.3 : 0.32;
        depth = row === chosen && phase >= stage ? 0.32 : 0.07;
      } else if (mode === "experts") {
        let selected = false;
        for (let expert = 0; expert < 6; expert++) if ((expertSeed * 5 + expert * 7) % count === i) selected = true;
        light = phase >= 1 && selected ? 1.4 : 0.25;
        depth = phase >= 1 && selected ? 0.27 + signal * 0.07 : 0.08;
        if (!selected) cellColor.copy(dark);
      } else if (mode === "weights") {
        light = 0.35 + ((i * 7 + seed * 3) % 11) / 15;
        if (phase === stage && column === scan % columns) { light = 1.5; depth = 0.31; }
      } else if (mode === "histogram" || mode === "probability") {
        const value = mode === "probability" ? (TOY_PROBABILITIES[column] ?? 0) / 0.25 : (TOY_LOGITS[column] ?? 0) / 5;
        const growth = phase >= stage ? 1 : 0.16;
        sizeY = Math.max(0.025, value * height * growth);
        offsetY = -height / 2 + sizeY / 2;
        light = phase >= stage ? 0.62 + value * 0.7 : 0.35;
        depth = 0.22;
      } else if (mode === "image") {
        cellColor.setRGB(0.18 + column / columns * 0.38, 0.35 + row / rows * 0.4, 0.52 + ((row + column) % 4) * 0.09);
        light = 0.7 + (row === scan % rows && phase === stage ? 0.65 : 0);
        depth = 0.07 + (phase === stage && row === scan % rows ? 0.22 : 0);
      } else if (mode === "gate") {
        sizeY *= phase >= stage ? 0.25 + ((i * 13 + 2) % 9) / 9 : 0.18;
        light = phase >= stage ? 1.1 : 0.25;
        depth = 0.13 + (phase === stage ? signal * 0.12 : 0);
      } else if (mode === "normalized") {
        const variation = ((i * 7 + seed) % 11) / 11;
        sizeY *= phase >= stage ? 0.35 + variation * 0.6 : 0.16 + variation * 0.84;
        light = phase >= stage ? 0.8 + signal * 0.35 : 0.4;
        depth = 0.2;
      } else if (mode === "candidate") {
        const chosen = (column * 7 + row * 3 + seed) % 5 < 2;
        light = chosen && phase >= stage ? 1.2 : 0.22;
        depth = chosen && phase >= stage ? 0.22 + signal * 0.05 : 0.07;
      } else if (mode === "interleaved") {
        const image = (column >= 3 && column <= 5) || column === 9 || column === 10;
        cellColor.set(image ? K : Q);
        light = phase === 2 ? 1 : phase === 1 && image ? 1.2 : 0.3;
        if (phase === 2 && column === scan % columns) { light = 1.5; depth = 0.28; }
      } else if (mode === "prefix") {
        const verified = phase === 2 ? Math.min(4, Math.floor(progress * 2.5) + 1) : 0;
        cellColor.copy(column < verified ? base : dark);
        light = column < verified ? 1.3 : 0.5;
        depth = column < verified ? 0.25 : 0.07;
      } else if (mode === "draft") {
        const cursor = Math.floor(progress * 2.5) % columns;
        light = phase >= stage ? 0.75 : 0.3;
        if (phase === 2 && column === cursor) { cellColor.set(WHITE); light = 1.3; depth = 0.34; }
      }
      object.position.set((column - (columns - 1) / 2) * width / columns,
        mode === "histogram" || mode === "probability" ? offsetY : ((rows - 1) / 2 - row) * height / rows, depth / 2);
      object.scale.set(width / columns * 0.76, sizeY, depth);
      object.updateMatrix();
      mesh.current.setMatrixAt(i, object.matrix);
      mesh.current.setColorAt(i, cellColor.multiplyScalar(light));
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  };
  useLayoutEffect(() => { last.current.time = -1; draw(); });
  useFrame(draw);
  return <group position={at}>
    {framed && <Tray at={[0, 0, -0.03]} width={width + 0.2} height={height + 0.2} color={tint ?? color} />}
    <instancedMesh ref={mesh} args={[cube, material, columns * rows]} frustumCulled={false} />
  </group>;
}

/** The moving bead follows a computation edge, and freezes at exactly the paused time. */
function Flow({ points, color = MUTED, stage = 0, offset = 0, quiet = false }: {
  points: Point[]; color?: string; stage?: number; offset?: number; quiet?: boolean;
}) {
  const { time, phase, dot } = useVisual();
  const bead = useRef<THREE.Mesh>(null);
  const data = useMemo(() => {
    const vectors = points.map((point) => new THREE.Vector3(...point));
    const lengths = [0];
    const segments: THREE.Vector3[] = [];
    for (let i = 1; i < vectors.length; i++) {
      const current = vectors[i];
      const previous = vectors[i - 1];
      if (!current || !previous) continue;
      lengths.push((lengths[i - 1] ?? 0) + current.distanceTo(previous));
      segments.push(previous, current);
    }
    return { geometry: new THREE.BufferGeometry().setFromPoints(segments), vectors, lengths, total: lengths.at(-1) ?? 1 };
  }, [points]);
  useEffect(() => () => data.geometry.dispose(), [data]);
  useFrame(() => {
    if (!bead.current) return;
    const position = ((time.current * 0.52 + offset) % 1) * data.total;
    let segment = 1;
    while (segment < data.lengths.length - 1 && (data.lengths[segment] ?? 0) < position) segment++;
    const start = data.vectors[segment - 1];
    const end = data.vectors[segment];
    if (!start || !end) return;
    const fraction = (position - (data.lengths[segment - 1] ?? 0)) / ((data.lengths[segment] ?? 1) - (data.lengths[segment - 1] ?? 0) || 1);
    bead.current.position.lerpVectors(start, end, fraction);
    bead.current.visible = phase === stage && !quiet;
  });
  return <>
    <lineSegments geometry={data.geometry}><lineBasicMaterial color={color} transparent opacity={phase === stage ? 0.6 : 0.2} /></lineSegments>
    <mesh ref={bead} geometry={dot} visible={phase === stage && !quiet}><meshBasicMaterial color={color} /></mesh>
  </>;
}

function AttentionMatrix({ spec }: { spec: MechanismSpec }) {
  const { cube, material, time, phase, color, contextSize } = useVisual();
  const mesh = useRef<THREE.InstancedMesh>(null);
  const scratch = useMemo(() => ({ object: new THREE.Object3D(), color: new THREE.Color(), base: new THREE.Color(color), dark: new THREE.Color("#193440") }), [color]);
  const mask = spec.attention?.mask ?? "dense";
  const rows = mask === "dense" && spec.attention?.querySource !== spec.attention?.kvSource ? 12 : 16;
  const compression = spec.attention?.compression ?? 1;
  const visibility = useMemo(() => {
    const cells = new Uint8Array(rows * 16);
    const localCells = Math.max(1, Math.min(16, Math.ceil(128 / contextSize * 16)));
    const globalEntries = contextSize / compression;
    const globalCells = Math.max(1, Math.min(16, Math.ceil(512 / globalEntries * 16)));
    for (let row = 0; row < rows; row++) {
      const eligible = Array.from({ length: row + 1 }, (_, column) => column);
      eligible.sort((a, b) => (a * 43 + row * 17) % 67 - (b * 43 + row * 17) % 67);
      const chosen = new Set(eligible.slice(0, globalCells));
      for (let column = 0; column < 16; column++) {
        cells[row * 16 + column] = Number(mask === "dense" || (column <= row && (mask === "causal" || (mask === "window" ? row - column < localCells : chosen.has(column)))));
      }
    }
    return cells;
  }, [rows, mask, contextSize, compression]);
  const last = useRef({ time: -1, phase: -1 });
  const draw = () => {
    if (!mesh.current) return;
    if (last.current.time === time.current && last.current.phase === phase) return;
    last.current.time = time.current;
    last.current.phase = phase;
    const scanRow = Math.floor(time.current * 4 + 9) % rows;
    const { object, color: cellColor, base, dark } = scratch;
    for (let row = 0; row < rows; row++) for (let column = 0; column < 16; column++) {
      const allowed = visibility[row * 16 + column] === 1;
      const current = row === scanRow && allowed;
      const weight = 0.35 + ((row * 11 + column * 7) % 13) / 16;
      const depth = allowed ? 0.09 + (current && phase >= 1 ? 0.22 + weight * 0.12 : 0) : 0.025;
      object.position.set((column - 7.5) * 0.252, ((rows - 1) / 2 - row) * 0.252 - 0.3, depth / 2);
      object.scale.set(0.21, 0.203, depth);
      object.updateMatrix();
      cellColor.copy(allowed ? base : dark).multiplyScalar(allowed ? (phase === 0 ? 0.36 : current ? 1.25 : phase === 2 ? weight : 0.57) : 0.58);
      mesh.current.setMatrixAt(row * 16 + column, object.matrix);
      mesh.current.setColorAt(row * 16 + column, cellColor);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  };
  useLayoutEffect(() => { last.current.time = -1; draw(); });
  useFrame(draw);
  return <>
    <Tray at={[0, -0.3, -0.03]} width={4.19} height={rows * 0.252 + 0.17} color={color} />
    <instancedMesh ref={mesh} args={[cube, material, 16 * rows]} frustumCulled={false} />
  </>;
}

function AttentionDetail({ spec }: { spec: MechanismSpec }) {
  const { color } = useVisual();
  const attention = spec.attention;
  const sparse = attention?.mask === "sparse";
  const heads = attention?.heads ?? 8;
  const reuse = attention?.mode === "reuse";
  const cross = attention?.mask === "dense" && attention.querySource !== attention.kvSource;
  return <>
    <Label at={[0, 3.31, 0.2]} color={color}>{heads} {heads === 64 ? "Q heads" : "attention heads"}</Label>
    <Grid at={[0, 2.72, 0]} columns={8} rows={Math.ceil(heads / 8)} width={3.97} height={heads === 8 ? 0.32 : 0.73} mode="heads" color={color} />
    <Label at={[-2.83, 2.15, 0.2]} color={Q}>Q · queries</Label>
    <Label at={[0, 2.16, 0.2]} color={K}>{sparse ? `K · global ${attention?.compression ?? 1}:1` : cross ? "K · encoder" : "K · keys"}</Label>
    <Label at={[2.83, 2.15, 0.2]} color={V}>{sparse ? "V · global + local" : "V · values"}</Label>
    <Grid at={[-2.84, -0.3, 0]} columns={2} rows={cross ? 12 : 16} width={0.61} height={cross ? 3.024 : 4.032} color={Q} stage={0} seed={9} />
    <Grid at={[0, 1.93, 0]} columns={16} rows={1} width={4.03} height={0.27} color={K} stage={0} mode={attention?.mode && attention.mode !== "full" ? "steady" : "vector"} />
    <Grid at={[2.84, -0.3, 0]} columns={2} rows={16} width={0.61} height={4.032} color={V} stage={2} seed={9} />
    <AttentionMatrix spec={spec} />
    <Flow points={[[-2.48, 0, 0.22], [-2.12, 0, 0.22]]} color={Q} stage={0} />
    <Flow points={[[2.13, -0.3, 0.22], [2.48, -0.3, 0.22]]} color={color} stage={2} />
    <Flow points={[[2.84, -2.44, 0.2], [2.84, -2.85, 0.2], [1.2, -2.85, 0.2]]} color={V} stage={2} />
    <Grid at={[0, -2.85, 0]} columns={12} rows={1} width={2.35} height={0.28} color={color} stage={2} />
    <Label at={[0, -3.18, 0.2]} color={color}>{sparse ? "Jointly weighted output" : "Weighted output"}</Label>
    {sparse && <>
      <Grid at={[-3.15, -2.83, 0]} columns={8} rows={4} width={1.01} height={0.43} color={K} mode={reuse ? "steady" : "heads"} stage={reuse ? 0 : 1} />
      <Label at={[-3.15, -3.22, 0.2]} color={K} small>{reuse ? "Shared indices" : `${attention.indexHeads ?? 32} index heads`}</Label>
      <Grid at={[3.15, -2.83, 0.06]} columns={8} rows={3} width={1.01} height={0.4} color={Q} stage={1} />
      <Label at={[3.15, -3.22, 0.2]} color={Q} small>Local SWA · 128</Label>
      <Flow points={[[3.15, -2.57, 0.25], [3.65, -2.57, 0.25], [3.65, -0.45, 0.25], [3.2, -0.45, 0.25]]} color={Q} stage={2} />
    </>}
    <Label at={[0, -2.51, 0.2]} small>{cross ? "12 target × 16 source positions · sampled" : attention?.mask === "dense" ? "Dense access · every source position" : attention?.mask === "causal" ? "Causal mask · future positions blocked" : attention?.mask === "window" ? "Causal local window · 128 tokens" : "Global Top-512 · causal, sampled access"}</Label>
  </>;
}

function ExpertRoutes() {
  const { time, phase, color, dot, material } = useVisual();
  const particles = useRef<THREE.InstancedMesh>(null);
  const data = useMemo(() => {
    const positions = new Float32Array(6 * 4 * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return { positions, geometry, object: new THREE.Object3D(), color: new THREE.Color(color) };
  }, [color]);
  useEffect(() => () => data.geometry.dispose(), [data]);
  useFrame(() => {
    const selection = Math.floor(time.current * 0.48);
    for (let expert = 0; expert < 6; expert++) {
      const index = (selection * 5 + expert * 7) % 48;
      const x = -0.62 + (index % 8 - 3.5) * 4.28 / 8;
      const y = 0.08 + (2.5 - Math.floor(index / 8)) * 2.7 / 6;
      const offset = expert * 12;
      data.positions[offset] = -0.2; data.positions[offset + 1] = 2.26; data.positions[offset + 2] = 0.18;
      data.positions[offset + 3] = x; data.positions[offset + 4] = y; data.positions[offset + 5] = 0.18;
      data.positions[offset + 6] = x; data.positions[offset + 7] = y; data.positions[offset + 8] = 0.18;
      data.positions[offset + 9] = 0; data.positions[offset + 10] = -2.3; data.positions[offset + 11] = 0.18;
      if (particles.current) for (let segment = 0; segment < 2; segment++) {
        const fraction = (time.current * 0.6 + expert / 6) % 1;
        data.object.position.set(segment === 0 ? THREE.MathUtils.lerp(-0.2, x, fraction) : THREE.MathUtils.lerp(x, 0, fraction),
          segment === 0 ? THREE.MathUtils.lerp(2.26, y, fraction) : THREE.MathUtils.lerp(y, -2.3, fraction), 0.33);
        data.object.scale.setScalar(phase === segment + 1 ? 1 : 0);
        data.object.updateMatrix();
        particles.current.setMatrixAt(expert * 2 + segment, data.object.matrix);
        particles.current.setColorAt(expert * 2 + segment, data.color);
      }
    }
    const positions = data.geometry.getAttribute("position");
    positions.needsUpdate = true;
    if (particles.current) {
      particles.current.instanceMatrix.needsUpdate = true;
      if (particles.current.instanceColor) particles.current.instanceColor.needsUpdate = true;
    }
  });
  return <>
    <lineSegments geometry={data.geometry} frustumCulled={false}><lineBasicMaterial color={color} transparent opacity={phase >= 1 ? 0.32 : 0.08} /></lineSegments>
    <instancedMesh ref={particles} args={[dot, material, 12]} frustumCulled={false} />
  </>;
}

function MoEDetail() {
  const { color } = useVisual();
  return <>
    <Label at={[0, 3.04, 0.2]} color={color}>Router · a choice for each token</Label>
    <Grid at={[0, 2.39, 0]} columns={12} rows={1} width={2.2} height={0.44} color={K} mode="weights" stage={0} framed />
    <Label at={[-0.62, 1.84, 0.2]} small>384 routed experts · representative grid</Label>
    <Grid at={[-0.62, 0.08, 0]} columns={8} rows={6} width={4.28} height={2.7} color={color} mode="experts" stage={1} framed />
    <ExpertRoutes />
    <Grid at={[2.85, 0.05, 0]} columns={4} rows={4} width={0.9} height={0.95} color={V} mode="weights" stage={1} framed />
    <Label at={[2.85, 1.06, 0.2]} color={V}>1 shared</Label>
    <Label at={[2.85, -0.81, 0.2]} small>Always active</Label>
    <Flow points={[[0.85, 2.3, 0.22], [2.85, 2.3, 0.22], [2.85, 0.7, 0.22]]} color={V} stage={1} />
    <Flow points={[[2.85, -0.6, 0.22], [2.85, -2.3, 0.22], [0.65, -2.3, 0.22]]} color={V} stage={2} />
    <Grid at={[0, -2.32, 0]} columns={12} rows={1} width={2.8} height={0.36} color={color} stage={2} />
    <Label at={[0, -2.94, 0.2]} color={color}>6 routed + 1 shared → weighted sum</Label>
  </>;
}

function DenseDetail() {
  const { color } = useVisual();
  return <>
    <Label at={[-2.67, 2.65, 0.2]} color={Q}>512</Label>
    <Label at={[0, 2.65, 0.2]} color={color}>2,048 · ReLU</Label>
    <Label at={[2.67, 2.65, 0.2]} color={V}>512</Label>
    <Grid at={[-2.67, 0, 0]} columns={1} rows={10} width={0.45} height={3.5} color={Q} stage={0} />
    <Grid at={[0, 0, 0]} columns={4} rows={16} width={1.55} height={4.2} color={color} mode="weights" stage={1} framed />
    <Grid at={[2.67, 0, 0]} columns={1} rows={10} width={0.45} height={3.5} color={V} stage={2} />
    {Array.from({ length: 7 }, (_, index) => <group key={index}>
      <Flow points={[[-2.35, (index - 3) * 0.5, 0.15], [-0.9, (3 - index) * 0.58, 0.15]]} color={Q} stage={0} offset={index / 7} />
      <Flow points={[[0.9, (3 - index) * 0.58, 0.15], [2.35, (index - 3) * 0.5, 0.15]]} color={V} stage={2} offset={index / 7} />
    </group>)}
    <Label at={[0, -2.85, 0.2]} color={color}>Every token uses the full dense network</Label>
  </>;
}

function EmbeddingDetail() {
  const { color } = useVisual();
  return <>
    <Label at={[-2.8, 2.38, 0.2]} color={Q}>Token IDs</Label>
    <Label at={[0, 2.38, 0.2]} color={color}>Learned lookup table</Label>
    <Label at={[2.83, 2.38, 0.2]} color={V}>Scaled vectors</Label>
    <Grid at={[-2.8, 0, 0]} columns={1} rows={7} width={0.58} height={2.85} color={Q} mode="lookup" stage={0} />
    <Grid at={[0, 0, 0]} columns={10} rows={12} width={3.2} height={3.62} color={color} mode="lookup" stage={1} framed />
    <Grid at={[2.83, 0, 0]} columns={3} rows={7} width={0.8} height={2.85} color={V} stage={2} />
    <Flow points={[[-2.38, 0, 0.25], [-1.75, 0, 0.25]]} color={Q} stage={0} />
    <Flow points={[[1.75, 0, 0.25], [2.28, 0, 0.25]]} color={V} stage={2} />
    <Label at={[0, -2.7, 0.2]} small>Learned row × √512 → token embedding</Label>
  </>;
}

function MultimodalDetail() {
  const { color } = useVisual();
  return <>
    <Label at={[-2.02, 2.83, 0.2]} color={Q}>Text embeddings</Label>
    <Label at={[2.02, 2.83, 0.2]} color={K}>Projected image embeddings</Label>
    <Grid at={[-2.02, 1.57, 0]} columns={6} rows={4} width={1.9} height={1.47} color={Q} stage={0} framed />
    <Grid at={[2.02, 1.57, 0]} columns={6} rows={4} width={1.9} height={1.47} color={K} stage={1} framed />
    <Flow points={[[-2.02, 0.66, 0.18], [-2.02, -0.12, 0.18], [-0.55, -0.12, 0.18], [-0.55, -0.72, 0.18]]} color={Q} stage={2} />
    <Flow points={[[2.02, 0.66, 0.18], [2.02, -0.12, 0.18], [0.55, -0.12, 0.18], [0.55, -0.72, 0.18]]} color={K} stage={2} />
    <Grid at={[0, -1.22, 0]} columns={12} rows={3} width={5.8} height={0.79} color={color} mode="interleaved" stage={2} framed />
    <Label at={[0, -2.08, 0.2]} color={color}>Interleave into a 5,120-wide language sequence</Label>
    <Flow points={[[-2.9, -2.56, 0.18], [2.9, -2.56, 0.18]]} color={color} stage={2} />
    <Label at={[0, -3.03, 0.2]} small>Causal processing follows sequence order</Label>
  </>;
}

function PositionDetail() {
  const { color } = useVisual();
  const curves = useMemo(() => [1, 2, 4].map((frequency, index) => Array.from({ length: 61 }, (_, step): Point => {
    const x = (step / 60 - 0.5) * 2.4;
    return [x, (1 - index) * 1.13 + Math.sin(step / 60 * Math.PI * 2 * frequency) * 0.37, 0.18];
  })), []);
  return <>
    <Label at={[-2.73, 2.35, 0.2]} color={Q}>Embedding</Label>
    <Label at={[0, 2.35, 0.2]} color={K}>Sine / cosine signals</Label>
    <Label at={[2.73, 2.35, 0.2]} color={color}>Sum</Label>
    <Grid at={[-2.73, 0, 0]} columns={2} rows={10} width={0.62} height={3} color={Q} stage={0} />
    {curves.map((points, index) => <Flow key={index} points={points} color={index === 1 ? V : K} stage={1} offset={index / 3} />)}
    <Label at={[1.69, 0, 0.3]} color={WHITE}>+</Label>
    <Grid at={[2.73, 0, 0]} columns={2} rows={10} width={0.62} height={3} color={color} stage={2} />
    <Flow points={[[-2.7, -1.85, 0.18], [-2.7, -2.17, 0.18], [2.73, -2.17, 0.18], [2.73, -1.7, 0.18]]} color={Q} stage={2} />
    <Label at={[0, -2.85, 0.2]} small>Different frequencies make positions distinguishable</Label>
  </>;
}

function NormDetail() {
  const { color } = useVisual();
  return <>
    <Label at={[0, 2.96, 0.2]} color={Q}>Input x</Label>
    <Grid at={[0, 2.48, 0]} columns={12} rows={1} width={2.38} height={0.33} color={Q} stage={0} />
    <Flow points={[[0, 2.2, 0.18], [0, 1.6, 0.18]]} color={Q} stage={0} />
    <Tray at={[0, 1.03, 0]} width={2.12} height={0.78} color={K} />
    <Label at={[0, 1.03, 0.2]} color={K}>Sublayer F(x)</Label>
    <Flow points={[[-1.3, 2.48, 0.18], [-2.7, 2.48, 0.18], [-2.7, -0.35, 0.18], [-0.45, -0.35, 0.18]]} color={Q} stage={1} />
    <Label at={[-2.7, 0.65, 0.2]} small>Residual</Label>
    <Flow points={[[0, 0.5, 0.18], [0, -0.08, 0.18]]} color={K} stage={1} />
    <Label at={[0, -0.35, 0.2]} color={WHITE}>+</Label>
    <Flow points={[[0, -0.67, 0.18], [0, -1.25, 0.18]]} color={color} stage={2} />
    <Grid at={[0, -1.8, 0]} columns={14} rows={1} width={3.6} height={0.82} color={color} mode="normalized" stage={2} framed />
    <Label at={[0, -2.68, 0.2]} color={color}>LayerNorm(x + F(x))</Label>
    <Label at={[0, -3.07, 0.2]} small>Recenter and rescale features after the residual sum</Label>
  </>;
}

function StreamsDetail() {
  const { color } = useVisual();
  return <>
    <Label at={[0, 3.03, 0.2]} color={color}>Four residual streams</Label>
    {[0, 1, 2, 3].map((index) => {
      const lane = (index - 1.5) * 1.35;
      const port = -1.65 + (index - 1.5) * 0.27;
      return <group key={index}>
        <Grid at={[lane, 2.45, 0]} columns={3} rows={1} width={0.8} height={0.35} color={index % 2 ? K : Q} stage={0} />
        <Flow points={[[lane, 2.1, 0.12], [port, 0.77, 0.12]]} color={K} stage={1} offset={index / 4} />
        <Flow points={[[lane, 2.15, 0.3], [1.63 + (index - 1.5) * 0.3, 1.78, 0.3]]} color={Q} stage={0} offset={index / 4} />
        <Flow points={[[port, -0.62, 0.12], [lane, -1.5, 0.12], [lane, -1.94, 0.12]]} color={K} stage={2} offset={index / 4} />
        <Flow points={[[1.85, -0.94 - index * 0.19, 0.3], [2.67 + index * 0.12, -0.94 - index * 0.19, 0.3], [2.67 + index * 0.12, -1.69 - index * 0.05, 0.3], [lane, -1.69 - index * 0.05, 0.3], [lane, -1.94, 0.3]]} color={V} stage={2} offset={index / 4} />
        <Label at={[lane, -2.09, 0.34]} color={WHITE}>+</Label>
        <Flow points={[[lane, -2.25, 0.2], [lane, -2.4, 0.2]]} color={color} stage={2} offset={index / 4} />
        <Grid at={[lane, -2.65, 0]} columns={3} rows={1} width={0.8} height={0.35} color={color} stage={2} />
      </group>;
    })}
    <Label at={[-1.7, 1.15, 0.2]} color={K}>B · residual mix 4 × 4</Label>
    <Grid at={[-1.7, 0.08, 0]} columns={4} rows={4} width={1.48} height={1.25} color={K} mode="weights" stage={1} framed />
    <Label at={[1.63, 2.05, 0.38]} color={Q}>A · input mix 1 × 4</Label>
    <Grid at={[1.63, 1.53, 0]} columns={4} rows={1} width={1.35} height={0.32} color={Q} mode="weights" stage={0} />
    <Flow points={[[1.63, 1.27, 0.18], [1.63, 0.6, 0.18]]} color={Q} stage={0} />
    <Tray at={[1.63, 0.16, 0]} width={1.7} height={0.73} color={color} />
    <Label at={[1.63, 0.16, 0.2]} color={color}>Attention / MoE</Label>
    <Flow points={[[1.63, -0.35, 0.18], [1.63, -0.73, 0.18]]} color={V} stage={1} />
    <Grid at={[1.63, -1.2, 0]} columns={1} rows={4} width={0.3} height={0.78} color={V} mode="weights" stage={2} />
    <Label at={[0.44, -0.96, 0.34]} color={V} small>C · scatter 4 × 1</Label>
    <Label at={[0, -3.14, 0.2]} small>Xnext = B X + C F(Aprev X)</Label>
  </>;
}

function CacheDetail() {
  const { color } = useVisual();
  return <>
    <Label at={[0, 3.04, 0.2]} color={color}>Final encoder states → global KV</Label>
    <Grid at={[0, 2.49, 0]} columns={12} rows={1} width={3.25} height={0.3} color={Q} stage={0} />
    <Flow points={[[-0.6, 2.2, 0.18], [-1.16, 1.55, 0.18]]} color={K} stage={0} />
    <Flow points={[[0.6, 2.2, 0.18], [1.16, 1.55, 0.18]]} color={V} stage={0} />
    <Grid at={[0, 0.63, 0]} columns={16} rows={7} width={4.13} height={1.72} color={K} mode="lookup" stage={1} framed />
    <Label at={[0, 1.81, 0.2]} color={K}>Global KV latent · 512 features</Label>
    <Label at={[0, -0.83, 0.2]} color={color}>One shared global cache · FP4</Label>
    {[0, 1, 2, 3].map((index) => <group key={index}>
      <Flow points={[[0, -0.42, 0.13], [0, -1.35, 0.13], [(index - 1.5) * 1.63, -1.35, 0.13], [(index - 1.5) * 1.63, -1.88, 0.13]]} color={color} stage={2} offset={index / 4} />
      <Grid at={[(index - 1.5) * 1.63, -2.22, 0]} columns={3} rows={2} width={0.98} height={0.47} color={Q} stage={2} />
    </group>)}
    <Label at={[0, -2.94, 0.2]} small>20 decoder layers · fresh Q and separate local SWA KV</Label>
  </>;
}

function EngramDetail() {
  const { color } = useVisual();
  return <>
    {[2, 3, 4].map((order, index) => <group key={order}>
      <Label at={[(index - 1) * 2.25, 2.98, 0.2]} color={Q}>{order}-gram</Label>
      <Grid at={[(index - 1) * 2.25, 2.45, 0]} columns={order} rows={1} width={1.35} height={0.35} color={Q} stage={0} />
      <Flow points={[[(index - 1) * 2.25, 2.13, 0.18], [(index - 1) * 2.25, 1.5, 0.18]]} color={K} stage={0} offset={index / 3} />
      <Grid at={[(index - 1) * 2.25, 1.09, 0]} columns={4} rows={2} width={1.1} height={0.47} color={K} mode="heads" stage={1} />
      <Flow points={[[(index - 1) * 2.25, 0.69, 0.18], [(index - 1) * 1.36, 0.25, 0.18]]} color={K} stage={1} offset={index / 3} />
    </group>)}
    <Label at={[0, 1.8, 0.2]} color={K} small>8 hash heads per N-gram order</Label>
    <Grid at={[0, -0.46, 0]} columns={12} rows={5} width={4.55} height={1.14} color={K} mode="lookup" stage={1} framed />
    <Flow points={[[0, -1.16, 0.18], [0, -1.71, 0.18]]} color={color} stage={2} />
    <Grid at={[0, -2.04, 0]} columns={12} rows={1} width={2.7} height={0.42} color={color} mode="gate" stage={2} />
    <Flow points={[[3.1, -1.38, 0.18], [3.1, -2.04, 0.18], [1.65, -2.04, 0.18]]} color={Q} stage={2} />
    <Label at={[2.97, -1.13, 0.2]} color={Q} small>Context</Label>
    <Label at={[0, -2.7, 0.2]} color={color}>Context gate → residual update</Label>
    <Label at={[0, -3.12, 0.2]} small>Conditional memory at encoder layers 2 and 15</Label>
  </>;
}

function VisionDetail() {
  const { color } = useVisual();
  return <>
    <Label at={[-2.47, 2.72, 0.2]} color={Q}>Image patches · 14 px</Label>
    <Grid at={[-2.47, 1.02, 0]} columns={6} rows={6} width={1.83} height={2.12} mode="image" stage={0} framed />
    <Flow points={[[-1.36, 1.02, 0.18], [-0.84, 1.02, 0.18]]} color={Q} stage={0} />
    <Tray at={[0.02, 1.02, 0]} width={1.42} height={1.85} color={K} />
    <Grid at={[0.02, 1.1, 0]} columns={4} rows={8} width={0.94} height={1.2} color={K} mode="weights" stage={1} />
    <Label at={[0.02, 2.5, 0.2]} color={K}>32-layer ViT</Label>
    <Flow points={[[0.86, 1.02, 0.18], [1.42, 1.02, 0.18]]} color={K} stage={1} />
    <Grid at={[2.32, 1.02, 0]} columns={3} rows={3} width={1.4} height={1.42} color={V} mode="image" stage={1} framed />
    <Label at={[2.32, 2.5, 0.2]} color={V}>3 × 3 unshuffle</Label>
    <Flow points={[[2.32, 0.09, 0.18], [2.32, -1.18, 0.18], [1.34, -1.18, 0.18]]} color={V} stage={2} />
    <Grid at={[0, -1.2, 0]} columns={10} rows={2} width={2.45} height={0.69} color={color} mode="weights" stage={2} framed />
    <Label at={[0, -0.48, 0.2]} color={color}>Two-layer MLP projector</Label>
    <Flow points={[[0, -1.68, 0.18], [0, -2.19, 0.18]]} color={color} stage={2} />
    <Grid at={[0, -2.5, 0]} columns={12} rows={1} width={4.2} height={0.34} color={color} stage={2} />
    <Label at={[0, -3.05, 0.2]} small>Visual embeddings join the language sequence</Label>
  </>;
}

function ProjectionDetail() {
  const { color } = useVisual();
  return <>
    <Label at={[-2.76, 2.38, 0.2]} color={Q}>Hidden state</Label>
    <Label at={[0, 2.38, 0.2]} color={K}>Learned projection W</Label>
    <Label at={[2.79, 2.38, 0.2]} color={color}>Logits</Label>
    <Grid at={[-2.76, 0.34, 0]} columns={1} rows={10} width={0.42} height={3.1} color={Q} stage={0} />
    <Grid at={[0, 0.34, 0]} columns={12} rows={10} width={3.14} height={3.1} color={K} mode="weights" stage={1} framed />
    <Grid at={[2.79, 0.34, 0]} columns={1} rows={12} width={0.42} height={3.1} color={color} stage={2} />
    <Flow points={[[-2.42, 0.34, 0.18], [-1.77, 0.34, 0.18]]} color={Q} stage={0} />
    <Flow points={[[1.77, 0.34, 0.18], [2.45, 0.34, 0.18]]} color={color} stage={2} />
    <Grid at={[0, -2.25, 0]} columns={16} rows={1} width={4.26} height={0.62} color={color} mode="histogram" stage={2} />
    <Label at={[0, -2.93, 0.2]} small>One score for every vocabulary token</Label>
  </>;
}

function SoftmaxDetail() {
  const { color } = useVisual();
  return <>
    <Label at={[0, 2.99, 0.2]} color={V}>Toy logits · vertical scale 0–5</Label>
    <Grid at={[0, 1.79, 0]} columns={16} rows={1} width={5.3} height={1.35} color={V} mode="histogram" stage={0} />
    <Tray at={[0, 0, 0]} width={3.25} height={0.7} color={K} />
    <Label at={[0, 0, 0.2]} color={K}>exp(logit) / Σ exp(logits)</Label>
    <Flow points={[[0, 0.98, 0.18], [0, 0.48, 0.18]]} color={V} stage={1} />
    <Flow points={[[0, -0.49, 0.18], [0, -1.01, 0.18]]} color={color} stage={2} />
    <Grid at={[0, -1.72, 0]} columns={16} rows={1} width={5.3} height={1.19} color={color} mode="probability" stage={2} />
    <Label at={[0, -2.79, 0.2]} color={color}>Probabilities · Σ p = 1 · scale 0–25%</Label>
    <Label at={[0, -3.18, 0.2]} small>Token selection happens after this distribution</Label>
  </>;
}

function DraftDetail() {
  const { color } = useVisual();
  return <>
    <Label at={[0, 3.03, 0.2]} color={K}>Three auxiliary drafter blocks</Label>
    {[0, 1, 2].map((index) => <group key={index}>
      <Grid at={[(index - 1) * 2.08, 2.18, 0]} columns={6} rows={3} width={1.5} height={0.69} color={K} mode="weights" stage={0} framed />
      {index < 2 && <Flow points={[[index * 2.08 - 1.19, 2.18, 0.18], [index * 2.08 - 0.89, 2.18, 0.18]]} color={K} stage={0} />}
    </group>)}
    <Flow points={[[0, 1.65, 0.18], [0, 1.11, 0.18]]} color={K} stage={0} />
    <Label at={[0, 1.42, 0.2]} small>Five parallel draft positions</Label>
    <Grid at={[0, 0.72, 0]} columns={5} rows={1} width={5.3} height={0.45} color={K} mode="draft" stage={0} />
    <Flow points={[[0, 0.35, 0.18], [0, 0.04, 0.18]]} color={V} stage={1} />
    <Tray at={[0, -0.3, 0]} width={4.2} height={0.54} color={V} />
    <Label at={[0, -0.3, 0.2]} color={V}>Markov head · schedule prefix length</Label>
    <Flow points={[[0, -0.72, 0.18], [0, -1.05, 0.18]]} color={Q} stage={2} />
    <Tray at={[0, -1.44, 0]} width={4.2} height={0.58} color={Q} />
    <Label at={[0, -1.44, 0.2]} color={Q}>Backbone verification</Label>
    <Flow points={[[0, -1.88, 0.18], [0, -2.15, 0.18]]} color={color} stage={2} />
    <Grid at={[0, -2.5, 0]} columns={5} rows={1} width={5.3} height={0.41} color={color} mode="prefix" stage={2} />
    <Label at={[0, -3.03, 0.2]} small>Accepted prefix · illustrative; acceptance varies</Label>
  </>;
}

function CandidateDetail() {
  const { color } = useVisual();
  return <>
    <Label at={[0, 3.05, 0.2]} color={Q}>Full causally visible range</Label>
    <Grid at={[0, 2.03, 0]} columns={16} rows={5} width={5.6} height={1.23} color={Q} mode="lookup" stage={0} framed />
    <Flow points={[[0, 1.25, 0.18], [0, 0.73, 0.18]]} color={K} stage={1} />
    <Label at={[0, 0.89, 0.2]} color={K} small>Up to 2,048 blocks × 8 positions</Label>
    <Grid at={[0, -0.08, 0]} columns={8} rows={4} width={4.3} height={1.24} color={K} mode="candidate" stage={1} framed />
    <Flow points={[[0, -0.87, 0.18], [0, -1.55, 0.18]]} color={color} stage={2} />
    <Label at={[0, -1.13, 0.2]} small>Reindex searches inside this query-specific pool</Label>
    <Grid at={[0, -2.08, 0]} columns={8} rows={2} width={3.25} height={0.63} color={color} mode="candidate" stage={2} />
    <Label at={[0, -2.98, 0.2]} color={color}>Top-512 selected entries</Label>
  </>;
}

function RepresentationDetail({ node }: { node: AtlasNode }) {
  const { color } = useVisual();
  const interleaved = node.id === "d-input";
  return <>
    <Label at={[0, 3.03, 0.2]} color={color}>{interleaved ? "One causal multimodal sequence" : "Final contextual representations"}</Label>
    <Grid at={[-2.18, 0.55, 0]} columns={4} rows={10} width={1.16} height={3.22} color={Q} stage={0} framed />
    <Grid at={[0, 0.55, 0]} columns={4} rows={10} width={1.16} height={3.22} color={color} stage={1} framed />
    <Flow points={[[-1.41, 0.55, 0.18], [-0.79, 0.55, 0.18]]} color={Q} stage={0} />
    <Flow points={[[0.78, 0.55, 0.18], [1.33, 0.55, 0.18], [1.33, 1.29, 0.18], [1.7, 1.29, 0.18]]} color={K} stage={2} />
    <Flow points={[[0.78, 0.55, 0.18], [1.33, 0.55, 0.18], [1.33, -0.67, 0.18], [1.7, -0.67, 0.18]]} color={V} stage={2} />
    <Grid at={[2.34, 1.29, 0]} columns={4} rows={3} width={1.03} height={0.76} color={K} stage={2} />
    <Grid at={[2.34, -0.67, 0]} columns={4} rows={3} width={1.03} height={0.76} color={V} stage={2} />
    <Label at={[2.34, 2.09, 0.2]} color={K}>{interleaved ? "Text tokens" : node.model === "original" ? "Cross-attention K" : "Decoder states"}</Label>
    <Label at={[2.34, -1.47, 0.2]} color={V}>{interleaved ? "Visual tokens" : node.model === "original" ? "Cross-attention V" : "Global KV"}</Label>
    <Label at={[0, -2.68, 0.2]} small>{interleaved ? "Text and projected image embeddings share one input" : node.model === "original" ? "Source states supply K and V to all six decoder layers" : "Hidden-state input and global-KV projection are separate paths"}</Label>
  </>;
}

function Diagram({ node, spec }: { node: AtlasNode; spec: MechanismSpec }) {
  switch (spec.kind) {
    case "attention": return <AttentionDetail spec={spec} />;
    case "moe": return <MoEDetail />;
    case "dense": return <DenseDetail />;
    case "embedding": return node.id === "d-input" ? <MultimodalDetail /> : <EmbeddingDetail />;
    case "position": return <PositionDetail />;
    case "norm": return <NormDetail />;
    case "streams": return <StreamsDetail />;
    case "cache": return <CacheDetail />;
    case "engram": return <EngramDetail />;
    case "vision": return <VisionDetail />;
    case "projection": return <ProjectionDetail />;
    case "softmax": return <SoftmaxDetail />;
    case "draft": return <DraftDetail />;
    case "candidate": return <CandidateDetail />;
    case "representation": return <RepresentationDetail node={node} />;
  }
}

/** Procedural computation diagrams; the scene owns the slab-to-inspection-bay transition. */
export function ModuleInternals({ node, spec, phase, playing, reducedMotion, speed, replayKey, contextSize }: ModuleInternalsProps) {
  const time = useRef(0);
  const resources = useMemo(() => ({
    cube: new THREE.BoxGeometry(1, 1, 1),
    dot: new THREE.SphereGeometry(0.055, 7, 5),
    material: new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.17 }),
  }), []);
  useEffect(() => () => Object.values(resources).forEach((resource) => resource.dispose()), [resources]);
  useLayoutEffect(() => { time.current = 0; }, [node.id, phase, replayKey]);
  useFrame((_, delta) => {
    if (playing && !reducedMotion) time.current += Math.min(delta, 0.1) * speed;
  });
  const state = useMemo<VisualState>(() => ({ ...resources, time, phase, contextSize,
    color: node.model === "original" ? "#e8b86f" : "#79d7c5" }), [resources, phase, contextSize, node.model]);
  return <VisualContext.Provider value={state}>
    <group>
      <Diagram node={node} spec={spec} />
      <Label at={[0, -3.45, 0.32]} color={state.color} small>{phase + 1} / 3 · {spec.phases[phase]?.title}</Label>
    </group>
  </VisualContext.Provider>;
}
