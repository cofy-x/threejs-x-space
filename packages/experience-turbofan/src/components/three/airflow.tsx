import { useFrame } from "@react-three/fiber";
import { easeOutCubic, lerp } from "@threejs-x-space/three-utils";
import { useMemo, useRef } from "react";
import { AdditiveBlending, type Points } from "three";
import { useSimulationConfig, useSimulationRuntime } from "../../state/simulation";

interface Particle {
  t: number;
  angle: number;
  jitter: number;
  spin: number;
  speedFactor: number;
}

interface AirflowStreamProps {
  color: string;
  count: number;
  xStart: number;
  xEnd: number;
  radiusStart: number;
  radiusEnd: number;
  speed: number;
  size?: number;
  swirl?: number;
  spread?: number;
  opacity?: number;
}

function AirflowStream({
  color,
  count,
  xStart,
  xEnd,
  radiusStart,
  radiusEnd,
  speed,
  size = 0.045,
  swirl = 0.5,
  spread = 0.2,
  opacity = 0.85,
}: AirflowStreamProps) {
  const pointsRef = useRef<Points>(null);
  const frame = useSimulationRuntime();

  const particles = useMemo<Particle[]>(
    () =>
      Array.from({ length: count }, () => ({
        t: Math.random(),
        angle: Math.random() * Math.PI * 2,
        jitter: (Math.random() - 0.5) * 0.1,
        spin: 0.3 + Math.random() * 0.7,
        speedFactor: 0.75 + Math.random() * 0.5,
      })),
    [count],
  );

  const positions = useMemo(() => {
    const array = new Float32Array(count * 3);
    particles.forEach((p, i) => {
      const x = lerp(xStart, xEnd, p.t);
      const radius = lerp(radiusStart, radiusEnd, p.t) * (1 + p.jitter);
      array[i * 3] = x;
      array[i * 3 + 1] = Math.cos(p.angle) * radius;
      array[i * 3 + 2] = Math.sin(p.angle) * radius;
    });
    return array;
  }, [particles, count, xStart, xEnd, radiusStart, radiusEnd]);

  useFrame((_state, delta) => {
    const { phase, progress } = frame.current;
    const flow = phase === "running" ? easeOutCubic(progress) : 0;
    if (flow <= 0) return;
    const pathLength = Math.abs(xEnd - xStart) || 1;
    particles.forEach((p, i) => {
      p.t += (speed * flow * p.speedFactor * delta) / pathLength;
      if (p.t > 1) {
        p.t -= 1;
        p.angle = Math.random() * Math.PI * 2;
      }
      p.angle += p.spin * swirl * delta * flow;
      const x = lerp(xStart, xEnd, p.t);
      const radius =
        lerp(radiusStart, radiusEnd, p.t) * (1 + p.jitter) * (1 + spread * p.t * p.t);
      positions[i * 3] = x;
      positions[i * 3 + 1] = Math.cos(p.angle) * radius;
      positions[i * 3 + 2] = Math.sin(p.angle) * radius;
    });
    const attribute = pointsRef.current?.geometry.getAttribute("position");
    if (attribute) {
      attribute.needsUpdate = true;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={size}
        sizeAttenuation
        transparent
        opacity={opacity}
        blending={AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

export function Airflow() {
  const { airflowVisible } = useSimulationConfig();
  if (!airflowVisible) return null;
  return (
    <group>
      <AirflowStream
        color="#5cc6e8"
        count={420}
        xStart={-5.2}
        xEnd={1.05}
        radiusStart={1.05}
        radiusEnd={1.45}
        speed={2.6}
        swirl={0.25}
        spread={0.08}
      />
      <AirflowStream
        color="#4f6fe8"
        count={280}
        xStart={1.1}
        xEnd={3.7}
        radiusStart={1.38}
        radiusEnd={1.5}
        speed={2.9}
        swirl={0.35}
        spread={0.1}
      />
      <AirflowStream
        color="#e3b65a"
        count={170}
        xStart={1.25}
        xEnd={2.5}
        radiusStart={0.8}
        radiusEnd={0.5}
        speed={1.5}
        swirl={0.9}
        spread={0.05}
      />
      <AirflowStream
        color="#f07a4f"
        count={140}
        xStart={2.5}
        xEnd={3.0}
        radiusStart={0.52}
        radiusEnd={0.52}
        speed={1.1}
        swirl={1.3}
        spread={0.15}
      />
      <AirflowStream
        color="#e66b5b"
        count={420}
        xStart={3.0}
        xEnd={8.2}
        radiusStart={0.42}
        radiusEnd={0.62}
        speed={5}
        size={0.05}
        swirl={1.5}
        spread={0.55}
      />
    </group>
  );
}
