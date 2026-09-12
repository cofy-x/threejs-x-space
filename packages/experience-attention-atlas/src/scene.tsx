import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import {
  Component,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
} from "react";
import * as THREE from "three";
import type { AtlasNode, AtlasView } from "./architecture";
import { getMechanism } from "./mechanisms";
import { ModuleInternals } from "./module-internals";

export interface AtlasEdge {
  from: string;
  to: string;
  label?: string;
}

interface AtlasSceneProps {
  nodes: AtlasNode[];
  edges?: AtlasEdge[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  view: AtlasView;
  exploded: boolean;
  playing: boolean;
  reducedMotion: boolean;
  resetKey: number;
  contextSize: number;
  phase: "prefill" | "decode";
  interactionEnabled?: boolean;
  zoomDelta?: number;
  detailPhase?: number;
  animationSpeed?: number;
  replayKey?: number;
  compareInternals?: boolean;
}

const COLORS: Record<AtlasNode["kind"], string> = {
  embedding: "#cd8da8",
  attention: "#e8b86f",
  norm: "#d1d7b1",
  compute: "#7eb5db",
  memory: "#ac9de1",
  output: "#79d7c5",
};
const AFFILIATION = { original: "#e8b86f", deepseek: "#79d7c5" };
const UP = new THREE.Vector3(0, 1, 0);
const CAMERA_OFFSET = new THREE.Vector3(4, 5, 40);
const INSPECTION_CAMERA_OFFSET = new THREE.Vector3(3, 3, 40);
const PARTICLE_BUDGET = [0, 1, 2, 3, 4];
const NO_RAYCAST = () => undefined;
const AUXILIARY_ROW_OFFSETS: Record<string, number> = {
  "d-vision": 0.68,
  "d-mhc": 0.95,
  "d-dspark": -0.57,
  "d-pool": -0.18,
};
const LEADER_ROW_OFFSETS: Record<string, number> = {
  "d-full": -0.2,
  "d-moe2": 0.15,
  "d-dec-moe1": -0.12,
  "d-dec-reuse1": 0.15,
  "d-dec-moe3": -0.12,
  "d-dec-reuse2": 0.15,
};

type ControlsHandle = ComponentRef<typeof OrbitControls>;

function positionOf(node: AtlasNode, exploded: boolean, spread = 0): THREE.Vector3 {
  const [x, y, z] = node.position;
  const rowOffset = spread > 0 ? AUXILIARY_ROW_OFFSETS[node.id] ?? 0 : 0;
  return new THREE.Vector3(x + (node.model === "original" ? -spread : spread), 0.6 + (y + rowOffset - 0.6) * (exploded ? 1.28 : 1), z);
}

function blockHeight(node: AtlasNode): number {
  if (node.kind === "norm") return 0.2;
  if (node.kind === "attention") return 0.7;
  if (node.kind === "compute" || node.kind === "memory") return 0.58;
  return 0.5;
}

function labelSide(node: AtlasNode): -1 | 1 {
  if (node.model === "original") return node.position[0] < -7 ? -1 : 1;
  return node.position[0] < 7 ? -1 : 1;
}

function isPrefillReplay(node: AtlasNode, phase: AtlasSceneProps["phase"]): boolean {
  return phase === "prefill" && node.model === "deepseek" && node.position[0] >= 7 && node.id !== "d-kv";
}

function GraphicsFallback({ onRetry }: { onRetry?: () => void }) {
  return (
    <div
      role="alert"
      style={{
        display: "grid",
        alignContent: "center",
        justifyItems: "center",
        gap: 12,
        height: "100%",
        minHeight: 260,
        padding: 28,
        textAlign: "center",
        color: "#d9e6ed",
        background: "#0b141c",
        fontSize: 14,
      }}
    >
      <strong>The 3D view could not start.</strong>
      <span>The component explorer and paper notes are still available.</span>
      <span style={{ color: "#8da5b4", maxWidth: 380 }}>
        Enable browser hardware acceleration to explore the architecture in 3D.
      </span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{ padding: "10px 18px", cursor: "pointer" }}
        >
          Restore 3D view
        </button>
      )}
    </div>
  );
}

class GraphicsBoundary extends Component<
  { children: ReactNode; onRetry: () => void },
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override render() {
    if (this.state.failed) {
      return <GraphicsFallback onRetry={this.props.onRetry} />;
    }
    return this.props.children;
  }
}

function ContextMonitor({ onLost }: { onLost: () => void }) {
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    const handleLost = (event: Event) => {
      event.preventDefault();
      onLost();
    };
    gl.domElement.addEventListener("webglcontextlost", handleLost);
    return () => gl.domElement.removeEventListener("webglcontextlost", handleLost);
  }, [gl, onLost]);
  return null;
}

interface SceneGeometry {
  cube: THREE.BoxGeometry;
  frame: THREE.EdgesGeometry;
  sphere: THREE.SphereGeometry;
  arrow: THREE.ConeGeometry;
}

function useSceneGeometry(): SceneGeometry {
  const geometry = useMemo(() => {
    const cube = new THREE.BoxGeometry(1, 1, 1);
    return {
      cube,
      frame: new THREE.EdgesGeometry(cube),
      sphere: new THREE.SphereGeometry(0.047, 8, 6),
      arrow: new THREE.ConeGeometry(0.075, 0.19, 5),
    };
  }, []);
  useEffect(() => () => Object.values(geometry).forEach((item) => item.dispose()), [geometry]);
  return geometry;
}

interface Chip {
  position: [number, number, number];
  scale: [number, number, number];
  active: boolean;
}

function makeChips(node: AtlasNode): Chip[] {
  const width = node.width ?? 2.25;
  const chips: Chip[] = [];
  if (node.kind === "embedding") {
    for (let column = 0; column < 12; column++) {
      for (let row = 0; row < 3; row++) {
        const height = 0.08 + ((column * 7 + row * 3) % 7) * 0.037;
        chips.push({
          position: [(column / 11 - 0.5) * width * 0.8, height / 2 - 0.14, (row - 1) * 0.29],
          scale: [0.07, height, 0.11],
          active: true,
        });
      }
    }
  } else if (node.kind === "attention") {
    for (let head = 0; head < 8; head++) {
      for (let cell = 0; cell < 6; cell++) {
        chips.push({
          position: [
            ((head % 4) - 1.5) * width * 0.215 + ((cell % 2) - 0.5) * 0.115,
            (Math.floor(head / 4) - 0.5) * 0.31 + (Math.floor(cell / 2) - 1) * 0.075,
            0.31,
          ],
          scale: [0.076, 0.049, 0.23],
          active: true,
        });
      }
    }
  } else if (node.kind === "compute") {
    for (let column = 0; column < 8; column++) {
      for (let row = 0; row < 4; row++) {
        chips.push({
          position: [(column - 3.5) * width * 0.108, (row - 1.5) * 0.12, 0.29],
          scale: [width * 0.075, 0.074, 0.25],
          active: node.model === "original" || (column + row * 3) % 4 === 0,
        });
      }
    }
  } else if (node.kind === "memory") {
    for (let column = 0; column < 6; column++) {
      for (let row = 0; row < 3; row++) {
        chips.push({
          position: [(column - 2.5) * width * 0.145, (row - 1) * 0.14, 0.24],
          scale: [width * 0.105, 0.078, 0.37],
          active: row === 2,
        });
      }
    }
  } else if (node.kind === "output") {
    for (let column = 0; column < 14; column++) {
      const height = 0.06 + Math.exp(-Math.pow((column - 8) / 2.5, 2)) * 0.27;
      chips.push({
        position: [(column - 6.5) * width * 0.062, height / 2 - 0.14, 0],
        scale: [width * 0.04, height, 0.45],
        active: column > 5 && column < 10,
      });
    }
  } else {
    for (let column = 0; column < 10; column++) {
      chips.push({
        position: [(column - 4.5) * width * 0.085, 0, 0],
        scale: [0.065, 0.07, 0.55],
        active: true,
      });
    }
  }
  return chips;
}

function InternalComponents({
  node,
  geometry,
  selected,
  dimmed,
  muted,
}: {
  node: AtlasNode;
  geometry: SceneGeometry;
  selected: boolean;
  dimmed: boolean;
  muted: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const chips = useMemo(() => makeChips(node), [node]);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const transform = new THREE.Object3D();
    const color = new THREE.Color(COLORS[node.kind]);
    chips.forEach((chip, index) => {
      transform.position.set(...chip.position);
      transform.scale.set(...chip.scale);
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);
      mesh.setColorAt(index, color.clone().multiplyScalar(chip.active ? 1.2 : 0.4));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [chips, node.kind]);
  return (
    <instancedMesh
      ref={ref}
      args={[geometry.cube, undefined, chips.length]}
      position={[0, selected ? 0.11 : 0, 0]}
    >
      <meshStandardMaterial
        color="white"
        metalness={0.23}
        roughness={0.42}
        emissive={COLORS[node.kind]}
        emissiveIntensity={muted ? 0.01 : dimmed ? 0.045 : 0.12}
        transparent
        opacity={muted ? 0.095 : dimmed ? 0.55 : 1}
        depthWrite={!muted}
      />
    </instancedMesh>
  );
}

function ArchitectureBlock({
  node,
  geometry,
  selected,
  exploded,
  onSelect,
  dimmed,
  view,
  spread,
  externalLabels,
  muted,
  hideLabels,
}: {
  node: AtlasNode;
  geometry: SceneGeometry;
  selected: boolean;
  exploded: boolean;
  onSelect: (id: string) => void;
  dimmed: boolean;
  view: AtlasView;
  spread: number;
  externalLabels: boolean;
  muted: boolean;
  hideLabels: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const label = useRef<HTMLButtonElement>(null);
  const labelObserver = useRef<ResizeObserver | null>(null);
  const labelWidth = useRef(0);
  const projectedLabel = useMemo(() => new THREE.Vector3(), []);
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);
  const compact = useThree((state) => state.size.width < 640);
  const width = node.width ?? 2.25;
  const height = blockHeight(node);
  const color = COLORS[node.kind];
  const position = useMemo(() => positionOf(node, exploded, spread), [node, exploded, spread]);
  const emphasized = !muted && (selected || hovered);
  const muteFactor = muted ? 0.12 : 1;
  const side = labelSide(node);
  const labelYOffset = externalLabels ? LEADER_ROW_OFFSETS[node.id] ?? 0 : 0;
  const labelFontSize = externalLabels ? 12 : selected ? 12 : compact && view === "compare" ? 9 : 11;
  const showLabel = !hideLabels && (externalLabels || selected || node.kind !== "norm" || node.model === "deepseek" || view !== "compare");
  const leaderGeometry = useMemo(() => {
    const a = new THREE.Vector3(side * (width / 2 + 0.045), 0, 0.65);
    const b = new THREE.Vector3(side * (width / 2 + 0.3), 0, 0.65);
    const c = new THREE.Vector3(side * (width / 2 + 0.7), labelYOffset, 0.65);
    return new THREE.BufferGeometry().setFromPoints([a, b, b, c]);
  }, [side, width, labelYOffset]);
  useEffect(() => () => leaderGeometry.dispose(), [leaderGeometry]);
  const measureLabel = useCallback((element: HTMLButtonElement | null) => {
    labelObserver.current?.disconnect();
    label.current = element;
    if (!element) return;
    labelObserver.current = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const width = entry.borderBoxSize[0]?.inlineSize ?? entry.contentRect.width + 14;
      if (width > 0 && Math.abs(width - labelWidth.current) > 0.5) {
        labelWidth.current = width;
        invalidate();
      }
    });
    labelObserver.current.observe(element);
  }, [invalidate]);
  useEffect(() => () => labelObserver.current?.disconnect(), []);
  const calculateLabelPosition = useCallback((object: THREE.Object3D, camera: THREE.Camera, size: { width: number; height: number }): [number, number] => {
    projectedLabel.setFromMatrixPosition(object.matrixWorld).project(camera);
    const x = (projectedLabel.x * 0.5 + 0.5) * size.width;
    const y = (-projectedLabel.y * 0.5 + 0.5) * size.height;
    // Keep visible annotations inside the canvas without pinning off-screen nodes to its edges.
    if (x < 0 || x > size.width || y < 0 || y > size.height) return [x, y];
    const width = labelWidth.current || node.shortTitle.length * labelFontSize * 0.64 + 14;
    const inset = Math.min(size.width / 2, width / 2 + 7);
    if (externalLabels) {
      return [side < 0
        ? THREE.MathUtils.clamp(x, Math.min(width + 7, size.width / 2), size.width - 7)
        : THREE.MathUtils.clamp(x, 7, Math.max(size.width - width - 7, size.width / 2)), y];
    }
    return [THREE.MathUtils.clamp(x, inset, size.width - inset), y];
  }, [projectedLabel, node.shortTitle, labelFontSize, externalLabels, side]);
  useFrame(({ camera }) => {
    if (label.current) {
      const display = !hideLabels && (showLabel || camera.zoom > 52) ? "block" : "none";
      if (label.current.style.display !== display) label.current.style.display = display;
    }
  });

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (event.delta <= 5) onSelect(node.id);
  };

  if (muted) {
    return (
      <group position={position}>
        <lineSegments geometry={geometry.frame} scale={[width, height, 1.18]} raycast={NO_RAYCAST}>
          <lineBasicMaterial color="#6d8c99" transparent opacity={0.065} depthWrite={false} />
        </lineSegments>
      </group>
    );
  }

  return (
    <group position={position}>
      <group
        onClick={muted ? undefined : handleClick}
        onPointerOver={(event) => {
          if (muted) return;
          event.stopPropagation();
          setHovered(true);
          gl.domElement.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          gl.domElement.style.cursor = "grab";
        }}
      >
        <mesh geometry={geometry.cube} scale={[width, height, 1.18]}>
          <meshStandardMaterial
            color={color}
            transparent
            opacity={(emphasized ? 0.17 : dimmed ? 0.09 : 0.16) * muteFactor}
            roughness={0.52}
            metalness={0.12}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
        <lineSegments geometry={geometry.frame} scale={[width, height, 1.18]}>
          <lineBasicMaterial
            color={emphasized ? "#edf9ff" : color}
            transparent
            opacity={(dimmed ? 0.35 : emphasized ? 0.95 : 0.66) * muteFactor}
          />
        </lineSegments>
        <mesh
          geometry={geometry.cube}
          position={[0, -height / 2, 0]}
          scale={[width, 0.046, 1.18]}
            >
          <meshStandardMaterial color={color} transparent opacity={(dimmed ? 0.22 : 0.5) * muteFactor} metalness={0.23} roughness={0.55} depthWrite={!muted} />
        </mesh>
        <mesh
          geometry={geometry.cube}
          position={[-width / 2, 0, 0]}
          scale={[0.05, height, 1.18]}
            >
          <meshBasicMaterial color={color} transparent opacity={(dimmed ? 0.22 : 0.58) * muteFactor} depthWrite={!muted} />
        </mesh>
        <InternalComponents node={node} geometry={geometry} selected={false} dimmed={dimmed} muted={muted} />
        {emphasized && (
          <lineSegments
            geometry={geometry.frame}
            scale={[width + 0.16, height + 0.16, 1.34]}
                >
            <lineBasicMaterial color={AFFILIATION[node.model]} transparent opacity={0.7} />
          </lineSegments>
        )}
      </group>
      {externalLabels && !hideLabels && (
        <lineSegments geometry={leaderGeometry}>
          <lineBasicMaterial color={emphasized ? "#dfedf1" : color} transparent opacity={dimmed ? 0.22 : 0.5} />
        </lineSegments>
      )}
      {!hideLabels && (
        <Html
          center={!externalLabels}
          calculatePosition={calculateLabelPosition}
          position={externalLabels ? [side * (width / 2 + 0.82), labelYOffset, 0.65] : [0, height / 2 + (selected ? 0.45 : 0.29), 0.76]}
          zIndexRange={selected ? [35, 30] : [20, 10]}
          style={{ pointerEvents: "none", ...(externalLabels ? { transform: side < 0 ? "translate(-100%, -50%)" : "translate(0, -50%)" } : {}) }}
        >
          <button
            ref={measureLabel}
            type="button"
            aria-label={`Inspect ${node.title}`}
            aria-pressed={selected}
            onClick={() => onSelect(node.id)}
            onPointerEnter={() => setHovered(true)}
            onPointerLeave={() => setHovered(false)}
            style={{
              display: showLabel ? "block" : "none",
              pointerEvents: "auto",
              cursor: "pointer",
              padding: externalLabels ? "4px 0" : "3px 6px",
              margin: 0,
              background: externalLabels ? "none" : selected ? "#1a3039" : "#0b141cdd",
              color: emphasized ? "#f3fbff" : dimmed ? "#a3b2bc" : "#c4d5de",
              border: externalLabels ? "none" : selected ? `1px solid ${AFFILIATION[node.model]}` : "1px solid transparent",
              borderRadius: 4,
              fontFamily: "inherit",
              fontSize: labelFontSize,
              fontWeight: selected ? 600 : externalLabels ? 450 : 400,
              lineHeight: 1.2,
              whiteSpace: "nowrap",
              letterSpacing: "0.005em",
              boxShadow: selected ? "0 3px 15px #0005" : "none",
              textShadow: externalLabels ? "0 2px 8px #071018" : "none",
            }}
          >
            {compact && node.id === "d-vision" ? "Vision" : node.shortTitle}
          </button>
        </Html>
      )}
    </group>
  );
}

function DirectedLink({
  edge,
  from,
  to,
  geometry,
  exploded,
  playing,
  reducedMotion,
  selectedId,
  contextSize,
  phase,
  spread,
  muted,
  animationSpeed = 1,
}: {
  edge: AtlasEdge;
  from: AtlasNode;
  to: AtlasNode;
  geometry: SceneGeometry;
  exploded: boolean;
  playing: boolean;
  reducedMotion: boolean;
  selectedId: string | null;
  contextSize: number;
  phase: "prefill" | "decode";
  spread: number;
  muted: boolean;
  animationSpeed?: number;
}) {
  const tokens = useRef<THREE.Group>(null);
  const elapsed = useRef(0);
  const point = useMemo(() => new THREE.Vector3(), []);
  const highlighted = !muted && (selectedId === from.id || selectedId === to.id);
  const dimmed = isPrefillReplay(from, phase);
  const particleCount = THREE.MathUtils.clamp(2 + Math.floor(Math.log2(Math.max(1024, contextSize) / 1024) / 3), 2, 5);
  const color = AFFILIATION[from.model];
  const { curve, lineGeometry, arrowPosition, arrowQuaternion } = useMemo(() => {
    const start = positionOf(from, exploded, spread);
    const end = positionOf(to, exploded, spread);
    start.y += blockHeight(from) / 2;
    end.y -= blockHeight(to) / 2;
    const lateral = Math.abs(end.x - start.x) > 0.5;
    const dx = end.x - start.x;
    const controlA = start.clone().add(new THREE.Vector3(lateral ? dx * 0.28 : 0, lateral ? 0.7 : (end.y - start.y) / 3, lateral ? -0.8 : 0));
    const controlB = end.clone().add(new THREE.Vector3(lateral ? -dx * 0.28 : 0, lateral ? -0.7 : -(end.y - start.y) / 3, lateral ? -0.8 : 0));
    const curve = new THREE.CubicBezierCurve3(start, controlA, controlB, end);
    return {
      curve,
      lineGeometry: new THREE.BufferGeometry().setFromPoints(curve.getPoints(lateral ? 32 : 4)),
      arrowPosition: curve.getPoint(0.85),
      arrowQuaternion: new THREE.Quaternion().setFromUnitVectors(UP, curve.getTangent(0.85).normalize()),
    };
  }, [from, to, exploded, spread]);
  useEffect(() => () => lineGeometry.dispose(), [lineGeometry]);
  const line = useMemo(() => {
    const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: muted ? 0.055 : highlighted ? 0.76 : dimmed ? 0.16 : 0.36, depthWrite: false });
    const object = new THREE.Line(lineGeometry, material);
    if (muted) object.raycast = NO_RAYCAST;
    return object;
  }, [lineGeometry, color, highlighted, dimmed, muted]);
  useEffect(() => () => line.material.dispose(), [line]);

  useFrame((_, delta) => {
    if (!tokens.current) return;
    if (playing && !reducedMotion && !muted) elapsed.current += Math.min(delta, 0.1) * 0.24 * animationSpeed;
    tokens.current.children.forEach((child, index) => {
      child.visible = index < particleCount;
      curve.getPoint((elapsed.current + index / particleCount) % 1, point);
      child.position.copy(point);
    });
  });

  if (muted) return <primitive object={line} raycast={NO_RAYCAST} />;

  return (
    <group>
      <primitive object={line} />
      <mesh
        geometry={geometry.arrow}
        position={arrowPosition}
        quaternion={arrowQuaternion}
        >
        <meshBasicMaterial color={color} transparent opacity={muted ? 0.06 : dimmed ? 0.3 : 0.64} depthWrite={!muted} />
      </mesh>
      <group ref={tokens} visible={!muted}>
        {PARTICLE_BUDGET.map((index) => (
          <mesh key={index} geometry={geometry.sphere}>
            <meshBasicMaterial color={color} transparent opacity={dimmed ? 0.38 : 0.9} />
          </mesh>
        ))}
      </group>
      {edge.label && highlighted && (
        <Html center position={curve.getPoint(0.5)} zIndexRange={[28, 22]} style={{ pointerEvents: "none" }}>
          <span style={{ display: "block", color, fontSize: 10, whiteSpace: "nowrap", background: "#0b141cee", padding: "3px 6px", borderRadius: 3 }}>
            {edge.label}
          </span>
        </Html>
      )}
    </group>
  );
}

interface LayerMotif {
  from: string;
  to: string;
  count: number;
  description: string;
  side: -1 | 1;
  badge?: string;
  subgroup?: boolean;
}

const LAYER_MOTIFS: LayerMotif[] = [
  { from: "t-self", to: "t-norm2", count: 6, description: "Encoder: self-attention, residual normalization, and feed-forward network, repeated 6 times", side: -1 },
  { from: "t-masked", to: "t-dnorm3", count: 6, description: "Decoder: masked attention, cross-attention, feed-forward network, and residual normalization, repeated 6 times", side: 1 },
  { from: "d-swa", to: "d-moe1", count: 2, description: "Encoder: local SWA attention and MoE, repeated 2 times", side: 1 },
  { from: "d-full", to: "d-moe3", count: 3, description: "Encoder: Full attention and MoE, followed by 5 Reuse attention and MoE layers; the six-layer motif repeats 3 times", side: 1 },
  { from: "d-reuse", to: "d-moe3", count: 5, description: "Each encoder Reuse attention and MoE pair repeats 5 times after a Full layer", side: -1, subgroup: true },
  { from: "d-dec-full", to: "d-dec-moe2", count: 1, badge: "4L", description: "Decoder opening: one Full attention and MoE layer, followed by 3 Reuse attention and MoE layers, 4 layers in total", side: 1 },
  { from: "d-dec-reuse1", to: "d-dec-moe2", count: 3, description: "Decoder opening: Reuse attention and MoE pair repeated 3 times after the first Full layer", side: -1, subgroup: true },
  { from: "d-reindex", to: "d-dec-moe4", count: 4, description: "Decoder: Reindex attention and MoE, followed by 3 Reuse attention and MoE layers; this four-layer motif repeats 4 times", side: 1 },
  { from: "d-dec-reuse2", to: "d-dec-moe4", count: 3, description: "Each decoder Reuse attention and MoE pair repeats 3 times after a Reindex layer", side: -1, subgroup: true },
];

function RepeatedLayers({ motif, from, to, geometry, exploded, spread, muted }: {
  motif: LayerMotif;
  from: AtlasNode;
  to: AtlasNode;
  geometry: SceneGeometry;
  exploded: boolean;
  spread: number;
  muted: boolean;
}) {
  const lower = positionOf(from, exploded, spread);
  const upper = positionOf(to, exploded, spread);
  const height = upper.y - lower.y + 0.77;
  const width = (from.width ?? 2.25) + 0.23;
  const bracketX = motif.side * (width / 2 + (motif.subgroup ? 0.1 : 0.23));
  const centerY = (upper.y + lower.y) / 2;
  const bracketGeometry = useMemo(() => {
    const capX = bracketX - motif.side * 0.18;
    const half = height / 2;
    return new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(capX, -half, 0), new THREE.Vector3(bracketX, -half, 0),
      new THREE.Vector3(bracketX, -half, 0), new THREE.Vector3(bracketX, half, 0),
      new THREE.Vector3(bracketX, half, 0), new THREE.Vector3(capX, half, 0),
    ]);
  }, [bracketX, height, motif.side]);
  useEffect(() => () => bracketGeometry.dispose(), [bracketGeometry]);
  return (
    <group position={[lower.x, centerY, -0.72]}>
      {!motif.subgroup && Array.from({ length: motif.count }, (_, index) => (
        <lineSegments
          key={index}
          geometry={geometry.frame}
          position={[0, 0, -index * 0.23]}
          scale={[width, height, 0.025]}
          raycast={muted ? NO_RAYCAST : undefined}
        >
          <lineBasicMaterial color={AFFILIATION[from.model]} transparent opacity={(0.105 + index * 0.016) * (muted ? 0.18 : 1)} depthWrite={false} />
        </lineSegments>
      ))}
      <lineSegments geometry={bracketGeometry} raycast={muted ? NO_RAYCAST : undefined}>
        <lineBasicMaterial color={AFFILIATION[from.model]} transparent opacity={(motif.subgroup ? 0.22 : 0.38) * (muted ? 0.18 : 1)} depthWrite={false} />
      </lineSegments>
      {!muted && <Html center position={[bracketX + motif.side * 0.07, 0, 0.1]} zIndexRange={[8, 3]} style={{ pointerEvents: "none" }}>
        <span
          role="img"
          aria-label={motif.description}
          title={motif.description}
          style={{
            display: "block", padding: "3px 4px", borderRadius: 3,
            background: "#0b141ced", color: from.model === "original" ? "#b6a184" : "#8eafa6",
            border: "1px solid #2c424b", whiteSpace: "nowrap",
            fontFamily: "inherit", fontSize: 10, lineHeight: 1.1, letterSpacing: "0.01em",
            pointerEvents: "auto",
          }}
        >
          {motif.badge ?? `×${motif.count}`}
        </span>
      </Html>}
    </group>
  );
}

function GroundGrid({ muted }: { muted: boolean }) {
  const grid = useMemo(() => {
    const helper = new THREE.GridHelper(100, 100, "#1d303b", "#172936");
    helper.material.transparent = true;
    helper.material.opacity = 0.22;
    helper.material.depthWrite = false;
    return helper;
  }, []);
  useEffect(() => { grid.material.opacity = muted ? 0.1 : 0.22; }, [grid, muted]);
  useEffect(() => () => { grid.geometry.dispose(); grid.material.dispose(); }, [grid]);
  return <primitive object={grid} position={[0, -0.32, 0]} />;
}

function OverviewBackdrop({ muted, reducedMotion, children }: { muted: boolean; reducedMotion: boolean; children: ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const invalidate = useThree((state) => state.invalidate);
  useLayoutEffect(() => {
    if (reducedMotion && group.current) group.current.position.z = muted ? -5 : 0;
    invalidate();
  }, [muted, reducedMotion, invalidate]);
  useFrame((_, delta) => {
    if (!group.current) return;
    const target = muted ? -5 : 0;
    if (Math.abs(group.current.position.z - target) < 0.001) return;
    group.current.position.z = THREE.MathUtils.lerp(group.current.position.z, target, 1 - Math.exp(-Math.min(delta, 0.1) * 7));
    invalidate();
  });
  return <group ref={group}>{children}</group>;
}

function InspectionBay({ node, bayX, geometry, exploded, spread, phase, playing, reducedMotion, speed, replayKey, contextSize }: {
  node: AtlasNode;
  bayX: number;
  geometry: SceneGeometry;
  exploded: boolean;
  spread: number;
  phase: number;
  playing: boolean;
  reducedMotion: boolean;
  speed: number;
  replayKey: number;
  contextSize: number;
}) {
  const group = useRef<THREE.Group>(null);
  const progress = useRef(0);
  const invalidate = useThree((state) => state.invalidate);
  const origin = useMemo(() => positionOf(node, exploded, spread), [node, exploded, spread]);
  const destination = useMemo(() => new THREE.Vector3(bayX, 5, 3), [bayX]);
  const spec = useMemo(() => getMechanism(node), [node]);
  useLayoutEffect(() => {
    const object = group.current;
    if (!object) return;
    progress.current = reducedMotion ? 1 : 0;
    object.position.copy(reducedMotion ? destination : origin);
    object.scale.setScalar(reducedMotion ? 1 : 0.16);
    object.rotation.set(0, 0, 0);
    invalidate();
  }, [origin, destination, reducedMotion, invalidate]);
  useFrame((_, delta) => {
    if (!group.current || progress.current >= 1) return;
    progress.current = Math.min(1, progress.current + Math.min(delta, 0.08) / 0.8);
    const eased = 1 - Math.pow(1 - progress.current, 3);
    group.current.position.lerpVectors(origin, destination, eased);
    group.current.scale.setScalar(0.16 + eased * 0.84);
    group.current.rotation.y = (1 - eased) * -0.12;
    invalidate();
  });
  return (
    <group ref={group}>
      <mesh geometry={geometry.cube} position={[0, -3.56, 0.5]} scale={[7.9, 0.035, 1.8]}>
        <meshBasicMaterial color={AFFILIATION[node.model]} transparent opacity={0.1} depthWrite={false} />
      </mesh>
      <lineSegments geometry={geometry.frame} position={[0, -3.56, 0.5]} scale={[7.9, 0.035, 1.8]}>
        <lineBasicMaterial color={AFFILIATION[node.model]} transparent opacity={0.3} depthWrite={false} />
      </lineSegments>
      <ModuleInternals
        node={node}
        spec={spec}
        phase={phase}
        playing={playing}
        reducedMotion={reducedMotion}
        speed={speed}
        replayKey={replayKey}
        contextSize={contextSize}
      />
      <Html center position={[0, 3.88, 0.5]} zIndexRange={[42, 38]} style={{ pointerEvents: "none" }}>
        <div style={{ textAlign: "center", whiteSpace: "nowrap", color: "#dbe8ed", fontFamily: "inherit" }}>
          <span style={{ display: "block", marginBottom: 5, color: AFFILIATION[node.model], fontSize: 9, letterSpacing: "0.13em", textTransform: "uppercase" }}>
            {node.model === "original" ? "Original Transformer" : "DeepSeek V4.1 Flash"}
          </span>
          <strong style={{ fontSize: 14, fontWeight: 500 }}>{node.shortTitle}</strong>
        </div>
      </Html>
    </group>
  );
}

type CameraRigProps = Pick<AtlasSceneProps, "nodes" | "selectedId" | "view" | "exploded" | "resetKey" | "reducedMotion" | "interactionEnabled" | "zoomDelta"> & {
  inspectionNodes: AtlasNode[];
  spread: number;
  externalLabels: boolean;
};

function CameraRig({ nodes, selectedId, view, exploded, resetKey, reducedMotion, interactionEnabled = true, zoomDelta = 0, inspectionNodes, spread, externalLabels }: CameraRigProps) {
  const controls = useRef<ControlsHandle>(null);
  const { camera, size, gl, invalidate } = useThree();
  const desiredPosition = useRef(new THREE.Vector3());
  const desiredTarget = useRef(new THREE.Vector3());
  const desiredZoom = useRef(35);
  const transitioning = useRef(true);
  const initialized = useRef(false);
  const previousZoomDelta = useRef(zoomDelta);

  useEffect(() => {
    gl.domElement.style.touchAction = interactionEnabled ? "none" : "pan-y";
  }, [gl, interactionEnabled]);

  useEffect(() => {
    const change = zoomDelta - previousZoomDelta.current;
    previousZoomDelta.current = zoomDelta;
    if (!change) return;
    desiredZoom.current = THREE.MathUtils.clamp(camera.zoom * Math.pow(1.25, change), 8, 220);
    desiredPosition.current.copy(camera.position);
    if (controls.current) desiredTarget.current.copy(controls.current.target);
    if (reducedMotion) {
      camera.zoom = desiredZoom.current;
      camera.updateProjectionMatrix();
      invalidate();
    } else {
      transitioning.current = true;
      invalidate();
    }
  }, [zoomDelta, camera, reducedMotion, invalidate]);

  useEffect(() => {
    const visible = nodes.filter((node) => view === "compare" || node.model === view);
    if (!visible.length) return;
    const inspecting = inspectionNodes.length > 0;
    const bounds = new THREE.Box3();
    if (inspecting) {
      const halfWidth = inspectionNodes.length > 1 ? 9.8 : 4.45;
      bounds.set(new THREE.Vector3(-halfWidth, 1.02, 2.85), new THREE.Vector3(halfWidth, 9.55, 5.25));
    } else {
      visible.forEach((node) => {
        const center = positionOf(node, exploded, spread);
        const half = new THREE.Vector3((node.width ?? 2.25) / 2 + (externalLabels ? 2.75 : 0.32), 0.69, 0.8);
        bounds.expandByPoint(center.clone().sub(half));
        bounds.expandByPoint(center.clone().add(half));
      });
    }
    const center = bounds.getCenter(new THREE.Vector3());
    desiredTarget.current.copy(center);
    desiredPosition.current.copy(center).add(inspecting ? INSPECTION_CAMERA_OFFSET : CAMERA_OFFSET);

    const orientation = new THREE.Matrix4().lookAt(desiredPosition.current, center, UP);
    const right = new THREE.Vector3().setFromMatrixColumn(orientation, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(orientation, 1);
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const x of [bounds.min.x, bounds.max.x]) {
      for (const y of [bounds.min.y, bounds.max.y]) {
        for (const z of [bounds.min.z, bounds.max.z]) {
          const corner = new THREE.Vector3(x, y, z).sub(center);
          const projectedX = corner.dot(right);
          const projectedY = corner.dot(up);
          minX = Math.min(minX, projectedX);
          maxX = Math.max(maxX, projectedX);
          minY = Math.min(minY, projectedY);
          maxY = Math.max(maxY, projectedY);
        }
      }
    }
    const fitZoom = Math.min((size.width - (size.width < 640 ? 24 : inspecting ? 70 : 40)) / (maxX - minX), (size.height - (inspecting ? 55 : 56)) / (maxY - minY));
    desiredZoom.current = Math.max(8, fitZoom);
    transitioning.current = true;
    invalidate();
    if (!initialized.current || reducedMotion) {
      camera.position.copy(desiredPosition.current);
      camera.zoom = desiredZoom.current;
      camera.lookAt(center);
      camera.updateProjectionMatrix();
      controls.current?.target.copy(center);
      controls.current?.update();
      transitioning.current = false;
      initialized.current = true;
    }
  }, [nodes, selectedId, view, exploded, resetKey, reducedMotion, camera, size.width, size.height, invalidate, inspectionNodes, spread, externalLabels]);

  useFrame((_, delta) => {
    if (!transitioning.current || !controls.current) return;
    const blend = 1 - Math.exp(-delta * 6);
    camera.position.lerp(desiredPosition.current, blend);
    controls.current.target.lerp(desiredTarget.current, blend);
    camera.zoom = THREE.MathUtils.lerp(camera.zoom, desiredZoom.current, blend);
    camera.updateProjectionMatrix();
    controls.current.update();
    invalidate();
    if (camera.position.distanceToSquared(desiredPosition.current) < 0.001 && Math.abs(camera.zoom - desiredZoom.current) < 0.03) {
      transitioning.current = false;
    }
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enabled={interactionEnabled}
      enableDamping={!reducedMotion}
      dampingFactor={0.09}
      minZoom={8}
      maxZoom={220}
      minPolarAngle={0.2}
      maxPolarAngle={Math.PI * 0.56}
      screenSpacePanning
      rotateSpeed={0.58}
      zoomSpeed={0.9}
      panSpeed={0.7}
      touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
      onStart={() => { transitioning.current = false; }}
    />
  );
}

function ArchitectureWorld(props: AtlasSceneProps) {
  const geometry = useSceneGeometry();
  const externalLabels = useThree((state) => state.size.width >= 900);
  const spread = externalLabels ? 2 : 0;
  const visibleNodes = useMemo(() => props.nodes.filter((node) => props.view === "compare" || node.model === props.view), [props.nodes, props.view]);
  const nodeMap = useMemo(() => new Map(visibleNodes.map((node) => [node.id, node])), [visibleNodes]);
  const inspectionNodes = useMemo(() => {
    const selected = props.nodes.find((node) => node.id === props.selectedId);
    if (!selected) return [];
    const counterpartId = getMechanism(selected).counterpart;
    const counterpart = props.view === "compare" && props.compareInternals !== false && counterpartId
      ? props.nodes.find((node) => node.id === counterpartId)
      : undefined;
    return counterpart && counterpart.id !== selected.id
      ? [selected, counterpart].sort((a, b) => a.model === b.model ? 0 : a.model === "original" ? -1 : 1)
      : [selected];
  }, [props.nodes, props.selectedId, props.view, props.compareInternals]);
  const inspecting = inspectionNodes.length > 0;
  return (
    <>
      <color attach="background" args={["#0b141c"]} />
      <fog attach="fog" args={["#0b141c", 51, 85]} />
      <ambientLight intensity={1.1} color="#bed1df" />
      <directionalLight position={[-12, 20, 14]} intensity={2.4} color="#dfebf1" />
      <directionalLight position={[12, 10, -7]} intensity={1.8} color="#8ebcda" />
      <GroundGrid muted={inspecting} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.34, 0]}>
        <planeGeometry args={[180, 180]} />
        <meshBasicMaterial color="#0b141c" />
      </mesh>
      <OverviewBackdrop muted={inspecting} reducedMotion={props.reducedMotion}>
        {visibleNodes.map((node) => (
          <ArchitectureBlock
            key={node.id}
            node={node}
            geometry={geometry}
            selected={props.selectedId === node.id}
            exploded={props.exploded}
            onSelect={props.onSelect}
            dimmed={isPrefillReplay(node, props.phase)}
            view={props.view}
            spread={spread}
            externalLabels={externalLabels}
            muted={inspecting}
            hideLabels={inspecting}
          />
        ))}
        {LAYER_MOTIFS.map((motif) => {
          const from = nodeMap.get(motif.from);
          const to = nodeMap.get(motif.to);
          return from && to ? (
            <RepeatedLayers key={`${motif.from}-${motif.to}`} motif={motif} from={from} to={to} geometry={geometry} exploded={props.exploded} spread={spread} muted={inspecting} />
          ) : null;
        })}
        {(props.edges ?? []).map((edge, index) => {
          const from = nodeMap.get(edge.from);
          const to = nodeMap.get(edge.to);
          return from && to ? (
            <DirectedLink key={`${edge.from}-${edge.to}-${index}`} {...props} edge={edge} from={from} to={to} geometry={geometry} spread={spread} muted={inspecting} />
          ) : null;
        })}
      </OverviewBackdrop>
      {inspectionNodes.map((node, index) => (
        <InspectionBay
          key={node.id}
          node={node}
          bayX={inspectionNodes.length > 1 ? (index === 0 ? -5.3 : 5.3) : 0}
          geometry={geometry}
          exploded={props.exploded}
          spread={spread}
          phase={props.detailPhase ?? 0}
          playing={props.playing}
          reducedMotion={props.reducedMotion}
          speed={props.animationSpeed ?? 1}
          replayKey={props.replayKey ?? 0}
          contextSize={props.contextSize}
        />
      ))}
      <CameraRig {...props} inspectionNodes={inspectionNodes} spread={spread} externalLabels={externalLabels} />
    </>
  );
}

export function AtlasScene(props: AtlasSceneProps) {
  const [lost, setLost] = useState(false);
  const [generation, setGeneration] = useState(0);
  const onLost = useCallback(() => setLost(true), []);
  const retry = useCallback(() => {
    setLost(false);
    setGeneration((value) => value + 1);
  }, []);
  if (lost) return <GraphicsFallback onRetry={retry} />;
  return (
    <GraphicsBoundary key={generation} onRetry={retry}>
      <Canvas
        orthographic
        frameloop={props.playing && !props.reducedMotion ? "always" : "demand"}
        camera={{ position: [4, 10, 40], zoom: 34, near: 0.1, far: 180 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        style={{ touchAction: props.interactionEnabled === false ? "pan-y" : "none", cursor: "grab" }}
        fallback={<GraphicsFallback />}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.15;
        }}
      >
        <ArchitectureWorld {...props} />
        <ContextMonitor onLost={onLost} />
      </Canvas>
    </GraphicsBoundary>
  );
}
