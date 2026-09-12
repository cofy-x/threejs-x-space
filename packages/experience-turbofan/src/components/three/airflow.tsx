import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Color, MathUtils, type LineBasicMaterial, type LineSegments } from "three";
import { useSimulationConfig, useSimulationRuntime } from "../../state/simulation";

const STREAMS = 18;
const PATH_STEPS = 90;
const TRAIL_STEPS = 9;
const STATIONS = [-1.2, 0.75, 1.3, 2.4, 3, 4.2, 5.8] as const;
const BYPASS_RADII = [1.15, 1.38, 1.41, 1.12, 0.91, 0.85, 0.83] as const;
const CORE_RADII = [0.72, 1.1, 0.73, 0.5, 0.53, 0.46, 0.62] as const;
const COLD = new Color("#89c7de");
const HOT = new Color("#ee9254");
const COMPRESSED = new Color("#f0cd88");

function writePoint(array: Float32Array, offset: number, stream: number, t: number) {
  const bypass = stream < STREAMS / 2;
  const x = MathUtils.lerp(STATIONS[0], STATIONS[6], t);
  let section = 0;
  while (section < STATIONS.length - 2 && x > (STATIONS[section + 1] ?? STATIONS[6])) section++;
  const blend = MathUtils.smoothstep(x, STATIONS[section] ?? STATIONS[0], STATIONS[section + 1] ?? STATIONS[6]);
  const radii = bypass ? BYPASS_RADII : CORE_RADII;
  const radius = MathUtils.lerp(radii[section] ?? radii[0], radii[section + 1] ?? radii[6], blend);
  const angle = (stream % 9) / 9 * Math.PI * 2 + 0.23 + Math.sin(t * Math.PI) * (bypass ? 0.14 : 0.4);
  array[offset] = x;
  array[offset + 1] = Math.cos(angle) * radius;
  array[offset + 2] = Math.sin(angle) * radius;
}

function writeColor(array: Float32Array, offset: number, stream: number, t: number, strength = 1) {
  const color = stream < STREAMS / 2 || t < 0.38 ? COLD : t < 0.56 ? COMPRESSED : HOT;
  array[offset] = color.r * strength;
  array[offset + 1] = color.g * strength;
  array[offset + 2] = color.b * strength;
}

export function Airflow() {
  const { airflowVisible, reducedMotion } = useSimulationConfig();
  const frame = useSimulationRuntime();
  const trails = useRef<LineSegments>(null);
  const guideMaterial = useRef<LineBasicMaterial>(null);
  const travel = useRef(0);
  const buffers = useMemo(() => {
    const guides = new Float32Array(STREAMS * PATH_STEPS * 6);
    const guideColors = new Float32Array(guides.length);
    const moving = new Float32Array(STREAMS * TRAIL_STEPS * 6);
    const movingColors = new Float32Array(moving.length);
    for (let stream = 0; stream < STREAMS; stream++) {
      for (let step = 0; step < PATH_STEPS; step++) {
        const offset = (stream * PATH_STEPS + step) * 6;
        for (let end = 0; end < 2; end++) {
          const t = (step + end) / PATH_STEPS;
          writePoint(guides, offset + end * 3, stream, t);
          writeColor(guideColors, offset + end * 3, stream, t);
        }
      }
    }
    return { guides, guideColors, moving, movingColors };
  }, []);

  useFrame((_, delta) => {
    const { phase, progress } = frame.current;
    if (guideMaterial.current) guideMaterial.current.opacity = reducedMotion ? 0.3 : 0.09 + progress * 0.08;
    if (!trails.current) return;
    trails.current.visible = airflowVisible && !reducedMotion && progress > 0;
    if (progress === 0) travel.current = 0;
    if (!airflowVisible || reducedMotion || phase !== "running") return;
    travel.current = (travel.current + Math.min(delta, 0.05) * (0.06 + progress * 0.3)) % 1;
    for (let stream = 0; stream < STREAMS; stream++) {
      const head = (travel.current + stream * 0.61803398875) % 1;
      for (let step = 0; step < TRAIL_STEPS; step++) {
        const offset = (stream * TRAIL_STEPS + step) * 6;
        for (let end = 0; end < 2; end++) {
          // Clamp at the inlet so a wrapped trail never draws across the engine.
          const t = Math.max(0, head - (TRAIL_STEPS - step - end) * 0.005);
          writePoint(buffers.moving, offset + end * 3, stream, t);
          writeColor(buffers.movingColors, offset + end * 3, stream, t, 0.15 + (step + end) / TRAIL_STEPS * 0.85);
        }
      }
    }
    trails.current.geometry.getAttribute("position").needsUpdate = true;
    trails.current.geometry.getAttribute("color").needsUpdate = true;
  });

  return (
    <group visible={airflowVisible}>
      <lineSegments frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[buffers.guides, 3]} />
          <bufferAttribute attach="attributes-color" args={[buffers.guideColors, 3]} />
        </bufferGeometry>
        <lineBasicMaterial ref={guideMaterial} vertexColors transparent opacity={0.09} depthWrite={false} />
      </lineSegments>
      <lineSegments ref={trails} frustumCulled={false} visible={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[buffers.moving, 3]} />
          <bufferAttribute attach="attributes-color" args={[buffers.movingColors, 3]} />
        </bufferGeometry>
        <lineBasicMaterial vertexColors transparent opacity={0.9} depthWrite={false} toneMapped={false} />
      </lineSegments>
    </group>
  );
}
