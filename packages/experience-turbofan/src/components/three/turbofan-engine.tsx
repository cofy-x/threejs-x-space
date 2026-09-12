import { useFrame } from "@react-three/fiber";
import { easeOutCubic } from "@threejs-x-space/three-utils";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  BufferGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Matrix4,
  ShapeUtils,
  TubeGeometry,
  Vector2,
  Vector3,
  type Group,
  type InstancedMesh,
  type MeshStandardMaterial,
} from "three";
import { useSimulationConfig, useSimulationRuntime } from "../../state/simulation";
import { airfoilGeometry, type AirfoilOptions } from "./airfoil-geometry";

const TAU = Math.PI * 2;
const CUT_START = 2.32;
const CUT_ARC = 3.68;
const TITANIUM = "#b9c8d0";
const STEEL = "#627985";
const DARK_METAL = "#263a44";
const BRONZE = "#b48b60";
const VISUAL_RPM_SCALE = 0.012;
type Profile = readonly (readonly [number, number])[];

/** Revolve an axial/radial section around X, including solid cut faces. */
function latheSection(profile: Profile, start = 0, arc = TAU, segments = 96): BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  for (const [x, radius] of profile) {
    for (let j = 0; j <= segments; j++) {
      const angle = start + (j / segments) * arc;
      positions.push(x, radius * Math.cos(angle), radius * Math.sin(angle));
    }
  }
  for (let i = 0; i < profile.length - 1; i++) {
    for (let j = 0; j < segments; j++) {
      const a = i * (segments + 1) + j;
      const b = a + segments + 1;
      indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const surfaceCount = indices.length;
  if (arc < TAU - 0.001) {
    const contour = profile.slice(0, -1).map(([x, radius]) => new Vector2(x, radius));
    const triangles = ShapeUtils.triangulateShape(contour, []);
    for (const [side, angle] of [start, start + arc].entries()) {
      const offset = positions.length / 3;
      for (const point of contour) {
        positions.push(point.x, point.y * Math.cos(angle), point.y * Math.sin(angle));
      }
      for (const [a, b, c] of triangles) {
        if (a === undefined || b === undefined || c === undefined) continue;
        indices.push(offset + a, offset + (side ? b : c), offset + (side ? c : b));
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.addGroup(0, surfaceCount, 0);
  geometry.addGroup(surfaceCount, indices.length - surfaceCount, 1);
  geometry.computeVertexNormals();
  return geometry;
}

function useOwnedGeometry(factory: () => BufferGeometry, dependencies: readonly unknown[]) {
  // The geometry belongs to its component; imperative instance buffers are reused between frames.
  const geometry = useMemo(factory, dependencies);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}

function Revolved({ profile, color = TITANIUM, cut = false, roughness = 0.3 }: {
  profile: Profile;
  color?: string;
  cut?: boolean;
  roughness?: number;
}) {
  const geometry = useOwnedGeometry(() => latheSection(profile, cut ? CUT_START : 0, cut ? CUT_ARC : TAU), [profile, cut]);
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial attach="material-0" color={color} metalness={0.83} roughness={roughness} side={DoubleSide} />
      <meshStandardMaterial attach="material-1" color="#d7b78c" metalness={0.75} roughness={0.28} side={DoubleSide} />
    </mesh>
  );
}

function Collar({ x, radius, width = 0.055, depth = 0.025, color = STEEL, cut = false }: {
  x: number;
  radius: number;
  width?: number;
  depth?: number;
  color?: string;
  cut?: boolean;
}) {
  const profile = useMemo<Profile>(() => [
    [x - width / 2, radius], [x + width / 2, radius],
    [x + width / 2, radius - depth], [x - width / 2, radius - depth], [x - width / 2, radius],
  ], [x, radius, width, depth]);
  return <Revolved profile={profile} color={color} cut={cut} />;
}

function RadialInstances({ geometry, count, x = 0, radius = 0, start = 0, arc = TAU, color = TITANIUM, roughness = 0.3 }: {
  geometry: BufferGeometry;
  count: number;
  x?: number;
  radius?: number;
  start?: number;
  arc?: number;
  color?: string;
  roughness?: number;
}) {
  const instances = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!instances.current) return;
    const matrix = new Matrix4();
    for (let i = 0; i < count; i++) {
      const angle = start + (i / count) * arc;
      matrix.makeRotationX(angle);
      matrix.setPosition(x, Math.cos(angle) * radius, Math.sin(angle) * radius);
      instances.current.setMatrixAt(i, matrix);
    }
    instances.current.instanceMatrix.needsUpdate = true;
    instances.current.computeBoundingSphere();
  }, [geometry, count, x, radius, start, arc]);
  return (
    <instancedMesh ref={instances} args={[geometry, undefined, count]}>
      <meshStandardMaterial color={color} metalness={0.87} roughness={roughness} side={DoubleSide} />
    </instancedMesh>
  );
}

function BoltRing({ x, radius, count = 36, cut = false }: { x: number; radius: number; count?: number; cut?: boolean }) {
  const geometry = useOwnedGeometry(() => new CylinderGeometry(0.022, 0.025, 0.024, 6).rotateZ(Math.PI / 2), []);
  return <RadialInstances geometry={geometry} count={count} x={x} radius={radius} start={cut ? CUT_START + 0.035 : 0} arc={cut ? CUT_ARC - 0.07 : TAU} color="#d6dde0" />;
}

function BladeRow({ x, count, color = TITANIUM, stationary = false, ...airfoil }: AirfoilOptions & {
  x: number;
  count: number;
  color?: string;
  stationary?: boolean;
}) {
  const { hubRadius, span, chord, sweep, twist, spanSteps } = airfoil;
  const geometry = useOwnedGeometry(() => airfoilGeometry({ hubRadius, span, chord, sweep, twist, spanSteps }), [hubRadius, span, chord, sweep, twist, spanSteps]);
  return (
    <group position={[x, 0, 0]}>
      <RadialInstances geometry={geometry} count={count} start={stationary ? 0.12 : 0} color={color} roughness={stationary ? 0.4 : 0.26} />
      <Collar x={0} radius={hubRadius + 0.012} width={chord * 0.82} depth={hubRadius * 0.7} color={stationary ? DARK_METAL : STEEL} />
      <Collar x={-chord * 0.37} radius={hubRadius + 0.014} width={0.018} depth={0.016} color={TITANIUM} />
    </group>
  );
}

function Pipe({ points, radius = 0.017, color = BRONZE }: { points: number[][]; radius?: number; color?: string }) {
  const geometry = useOwnedGeometry(() => new TubeGeometry(new CatmullRomCurve3(points.map(([x, y, z]) => new Vector3(x, y, z))), 36, radius, 6, false), [points, radius]);
  return <mesh geometry={geometry}><meshStandardMaterial color={color} metalness={0.83} roughness={0.29} /></mesh>;
}

const SPINNER: Profile = [[0.04, 0.018], [0.09, 0.087], [0.2, 0.16], [0.38, 0.25], [0.64, 0.335], [0.9, 0.39], [1.12, 0.415], [1.28, 0.42], [1.28, 0], [0.04, 0], [0.04, 0.018]];
const INTAKE_LIP: Profile = [[0.52, 1.5], [0.47, 1.525], [0.455, 1.565], [0.48, 1.615], [0.55, 1.66], [0.68, 1.682], [0.85, 1.679], [0.87, 1.624], [0.7, 1.62], [0.59, 1.591], [0.555, 1.545], [0.56, 1.5], [0.52, 1.5]];
const NACELLE: Profile = [[0.83, 1.681], [1.25, 1.678], [1.7, 1.608], [2.15, 1.47], [2.65, 1.25], [3.14, 1.06], [3.2, 1.025], [3.2, 0.982], [3.12, 1.017], [2.64, 1.207], [2.13, 1.427], [1.69, 1.565], [1.25, 1.635], [0.83, 1.638], [0.83, 1.681]];
const CORE_CASE: Profile = [[1.53, 0.96], [1.77, 0.885], [2.05, 0.745], [2.4, 0.674], [2.52, 0.68], [2.52, 0.646], [2.39, 0.64], [2.04, 0.711], [1.75, 0.851], [1.53, 0.926], [1.53, 0.96]];
const HOT_CASE: Profile = [[2.53, 0.706], [2.67, 0.728], [2.94, 0.728], [3.1, 0.684], [3.17, 0.646], [3.17, 0.61], [3.07, 0.65], [2.93, 0.694], [2.68, 0.694], [2.53, 0.672], [2.53, 0.706]];
const EXHAUST_CONE: Profile = [[3.98, 0.29], [4.15, 0.292], [4.42, 0.243], [4.66, 0.147], [4.85, 0.025], [4.87, 0], [3.98, 0], [3.98, 0.29]];
const NOZZLE_PETAL: Profile = [[4.05, 0.737], [4.25, 0.713], [4.49, 0.629], [4.7, 0.53], [4.7, 0.502], [4.49, 0.602], [4.25, 0.687], [4.05, 0.711], [4.05, 0.737]];
const FUEL_PIPE = [[2.27, -0.31, 0.69], [2.44, -0.43, 0.68], [2.6, -0.45, 0.71], [2.89, -0.44, 0.72], [3.03, -0.29, 0.71]];
const OIL_PIPE = [[1.56, -0.5, 0.89], [1.82, -0.55, 0.75], [2.24, -0.46, 0.61], [2.41, -0.51, 0.59], [2.46, -0.65, 0.57]];
const RETURN_PIPE = [[3.05, -0.61, 0.43], [3.18, -0.64, 0.4], [3.67, -0.68, 0.43], [3.97, -0.56, 0.52]];

const COMPRESSOR_STAGES = [
  { x: 1.62, hubRadius: 0.4, span: 0.5, chord: 0.17, count: 30 },
  { x: 1.86, hubRadius: 0.395, span: 0.415, chord: 0.155, count: 32 },
  { x: 2.075, hubRadius: 0.39, span: 0.315, chord: 0.14, count: 34 },
  { x: 2.26, hubRadius: 0.39, span: 0.255, chord: 0.13, count: 36 },
  { x: 2.43, hubRadius: 0.39, span: 0.22, chord: 0.115, count: 38 },
];
const TURBINE_STAGES = [
  { x: 3.22, hubRadius: 0.34, span: 0.25, chord: 0.15, count: 34 },
  { x: 3.46, hubRadius: 0.33, span: 0.285, chord: 0.16, count: 32 },
  { x: 3.71, hubRadius: 0.31, span: 0.345, chord: 0.17, count: 30 },
  { x: 3.97, hubRadius: 0.29, span: 0.4, chord: 0.18, count: 28 },
];

function Nacelle() {
  return (
    <group>
      <Revolved profile={INTAKE_LIP} color="#bccbd2" roughness={0.2} />
      <Revolved profile={NACELLE} color="#334d5c" roughness={0.34} cut />
      <Collar x={0.86} radius={1.687} width={0.037} depth={0.047} cut color={DARK_METAL} />
      <Collar x={1.4} radius={1.663} width={0.035} depth={0.026} cut color={DARK_METAL} />
      <Collar x={2.07} radius={1.51} width={0.03} depth={0.038} cut color={DARK_METAL} />
      <Collar x={3.16} radius={1.06} width={0.065} depth={0.045} cut color={TITANIUM} />
      <BoltRing x={0.84} radius={1.662} count={34} cut />
      <BoltRing x={1.42} radius={1.644} count={32} cut />
      <BoltRing x={3.17} radius={1.035} count={24} cut />
    </group>
  );
}

function Combustor() {
  const heatRef = useRef<MeshStandardMaterial>(null);
  const frame = useSimulationRuntime();
  const burner = useOwnedGeometry(() => new CylinderGeometry(0.049, 0.06, 0.32, 12).rotateZ(Math.PI / 2), []);
  const liner = useOwnedGeometry(() => latheSection([[2.53, 0.59], [3.04, 0.59], [3.04, 0.54], [2.53, 0.54], [2.53, 0.59]], CUT_START, CUT_ARC, 64), []);
  useFrame(() => {
    if (heatRef.current) heatRef.current.emissiveIntensity = easeOutCubic(frame.current.progress) * 0.85;
  });
  return (
    <group>
      <mesh geometry={liner}>
        <meshStandardMaterial ref={heatRef} color="#8d593b" emissive="#ef671f" emissiveIntensity={0} metalness={0.72} roughness={0.4} side={DoubleSide} />
      </mesh>
      <RadialInstances geometry={burner} count={18} x={2.65} radius={0.465} color="#ba9773" roughness={0.4} />
      <Collar x={2.54} radius={0.61} width={0.065} depth={0.245} color={BRONZE} />
      <Collar x={3.035} radius={0.61} width={0.06} depth={0.265} color={BRONZE} />
      {[2.64, 2.76, 2.88].map((x) => <Collar key={x} x={x} radius={0.6} width={0.023} depth={0.017} color="#d4b184" cut />)}
      <BoltRing x={2.51} radius={0.578} count={24} />
      <BoltRing x={3.07} radius={0.579} count={24} />
    </group>
  );
}

export function TurbofanEngine() {
  const fanRef = useRef<Group>(null);
  const coreRef = useRef<Group>(null);
  const frame = useSimulationRuntime();
  const { casingVisible, reducedMotion } = useSimulationConfig();
  const nozzle = useOwnedGeometry(() => latheSection(NOZZLE_PETAL, 0, TAU / 18 - 0.016, 8), []);
  const support = useOwnedGeometry(() => airfoilGeometry({ hubRadius: 0.93, span: 0.64, chord: 0.28, sweep: 0.03, twist: 0.06, spanSteps: 5 }), []);

  useFrame((_state, delta) => {
    const { phase, values, elapsedSeconds } = frame.current;
    if (elapsedSeconds === 0) {
      if (fanRef.current) fanRef.current.rotation.x = 0;
      if (coreRef.current) coreRef.current.rotation.x = 0;
    }
    if (phase !== "running" || reducedMotion) return;
    const step = Math.min(delta, 0.05) * (Math.PI / 30) * VISUAL_RPM_SCALE;
    if (fanRef.current) fanRef.current.rotation.x = (fanRef.current.rotation.x + values.n1 * step) % TAU;
    if (coreRef.current) coreRef.current.rotation.x = (coreRef.current.rotation.x + values.n2 * step) % TAU;
  });

  return (
    <group>
      <group ref={fanRef}>
        <Revolved profile={SPINNER} color="#93a9b7" roughness={0.23} />
        <Collar x={1.08} radius={0.417} width={0.025} depth={0.014} color={DARK_METAL} />
        <BladeRow x={1.15} count={24} hubRadius={0.42} span={1.055} chord={0.54} sweep={0.26} twist={0.65} spanSteps={16} color="#c7d4da" />
        <BoltRing x={0.96} radius={0.388} count={18} />
        {TURBINE_STAGES.slice(1).map((stage) => <BladeRow key={stage.x} {...stage} sweep={0.035} twist={0.38} spanSteps={8} color="#8a9498" />)}
        <Revolved profile={EXHAUST_CONE} color="#7b7c79" roughness={0.36} />
      </group>

      <Collar x={1.28} radius={1.515} width={0.095} depth={0.035} color={DARK_METAL} cut />
      <Collar x={1.29} radius={1.52} width={0.023} depth={0.018} color={TITANIUM} cut />
      <RadialInstances geometry={support} count={8} x={1.46} color="#8c9da5" />

      <group ref={coreRef}>
        {COMPRESSOR_STAGES.map((stage) => <BladeRow key={stage.x} {...stage} sweep={0.06} twist={0.43} spanSteps={8} />)}
        {TURBINE_STAGES.slice(0, 1).map((stage) => <BladeRow key={stage.x} {...stage} sweep={0.035} twist={0.38} spanSteps={8} color="#a99179" />)}
      </group>

      {COMPRESSOR_STAGES.slice(0, -1).map((stage, i) => <BladeRow key={stage.x} x={stage.x + 0.115} hubRadius={stage.hubRadius} span={stage.span - 0.036} chord={0.072} count={22 + i * 2} sweep={-0.04} twist={-0.82} spanSteps={5} color="#647982" stationary />)}
      {TURBINE_STAGES.slice(0, -1).map((stage) => <BladeRow key={stage.x} x={stage.x + 0.13} hubRadius={stage.hubRadius} span={stage.span + 0.007} chord={0.07} count={24} sweep={-0.025} twist={-0.72} spanSteps={5} color="#6d655d" stationary />)}

      <mesh position={[2.6, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.14, 0.14, 3.05, 32]} />
        <meshStandardMaterial color={STEEL} metalness={0.9} roughness={0.27} />
      </mesh>
      <Combustor />
      <Revolved profile={CORE_CASE} color="#526974" cut />
      <Revolved profile={HOT_CASE} color="#806b56" cut roughness={0.39} />
      <Collar x={1.55} radius={0.975} width={0.067} depth={0.048} cut color={TITANIUM} />
      <BoltRing x={1.516} radius={0.95} count={26} cut />
      <Collar x={2.48} radius={0.718} width={0.078} depth={0.055} cut color={TITANIUM} />
      <BoltRing x={2.438} radius={0.689} count={24} cut />
      <Collar x={3.13} radius={0.713} width={0.08} depth={0.065} cut color={BRONZE} />
      <BoltRing x={3.17} radius={0.682} count={24} cut />
      {[3.32, 3.58, 3.84].map((x, i) => <Collar key={x} x={x} radius={0.651 + i * 0.035} width={0.08} depth={0.027} cut color={i === 0 ? BRONZE : STEEL} />)}
      <Collar x={4.045} radius={0.752} width={0.12} depth={0.052} color={STEEL} cut />
      <BoltRing x={4.108} radius={0.725} count={32} cut />
      <RadialInstances geometry={nozzle} count={18} color="#8d999f" roughness={0.35} />
      <Collar x={4.24} radius={0.722} width={0.025} depth={0.029} color={DARK_METAL} />
      <Pipe points={FUEL_PIPE} />
      <Pipe points={OIL_PIPE} color="#a4b2ba" />
      <Pipe points={RETURN_PIPE} color="#a4b2ba" />
      {casingVisible ? <Nacelle /> : null}
    </group>
  );
}
