import { useFrame } from "@react-three/fiber";
import { easeOutCubic } from "@threejs-x-space/three-utils";
import { useRef } from "react";
import type { Group, MeshStandardMaterial } from "three";
import { useSimulationConfig, useSimulationRuntime } from "../../state/simulation";

const METAL_LIGHT = "#d1cec6";
const METAL_DARK = "#777871";
const METAL_TITANIUM = "#aaa79f";
const CASING_COLOR = "#bbb8b0";

const VISUAL_RPM_SCALE = 0.02;

interface BladeRowProps {
  x: number;
  count: number;
  hubRadius: number;
  bladeLength: number;
  chord: number;
  stagger: number;
  sweep?: number;
  color: string;
}

function BladeRow({ x, count, hubRadius, bladeLength, chord, stagger, sweep = 0.35, color }: BladeRowProps) {
  return (
    <group position={[x, 0, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[hubRadius, hubRadius, 0.14, 24]} />
        <meshStandardMaterial color={METAL_DARK} metalness={0.9} roughness={0.35} />
      </mesh>
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2;
        return (
          <group key={i} rotation={[angle, 0, 0]}>
            <mesh
              position={[0, hubRadius + bladeLength / 2, 0]}
              rotation={[0.1, stagger, sweep]}
            >
              <boxGeometry args={[chord, bladeLength, 0.03]} />
              <meshStandardMaterial color={color} metalness={0.95} roughness={0.22} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

interface CasingSegmentProps {
  x: number;
  length: number;
  radius: number;
  thetaStart: number;
  thetaLength: number;
  color?: string;
}

function CasingSegment({ x, length, radius, thetaStart, thetaLength, color = CASING_COLOR }: CasingSegmentProps) {
  return (
    <mesh position={[x, 0, 0]} rotation={[thetaStart, 0, Math.PI / 2]}>
      <cylinderGeometry args={[radius, radius, length, 48, 1, true, 0, thetaLength]} />
      <meshStandardMaterial color={color} metalness={0.9} roughness={0.28} side={2} />
    </mesh>
  );
}

export function TurbofanEngine() {
  const fanRef = useRef<Group>(null);
  const coreRef = useRef<Group>(null);
  const combustorOuterRef = useRef<MeshStandardMaterial>(null);
  const combustorInnerRef = useRef<MeshStandardMaterial>(null);
  const frame = useSimulationRuntime();
  const { casingVisible } = useSimulationConfig();

  useFrame((_state, delta) => {
    const { phase, values, progress } = frame.current;
    const spin = phase === "running" ? 1 : 0;
    if (fanRef.current) {
      fanRef.current.rotation.x += values.n1 * (Math.PI / 30) * VISUAL_RPM_SCALE * spin * delta;
    }
    if (coreRef.current) {
      coreRef.current.rotation.x += values.n2 * (Math.PI / 30) * VISUAL_RPM_SCALE * spin * delta;
    }
    const eased = easeOutCubic(progress);
    if (combustorOuterRef.current) {
      combustorOuterRef.current.emissiveIntensity = eased * 1.1;
    }
    if (combustorInnerRef.current) {
      combustorInnerRef.current.emissiveIntensity = eased * 1.6;
    }
  });

  return (
    <group>
      <group>
        <mesh position={[0.55, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[0.42, 1.15, 32]} />
          <meshStandardMaterial color={METAL_LIGHT} metalness={0.95} roughness={0.2} />
        </mesh>
        <mesh position={[0.0, 0, 0]}>
          <sphereGeometry args={[0.16, 24, 16]} />
          <meshStandardMaterial color="#ece9e1" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>

      <group ref={fanRef}>
        <BladeRow x={1.15} count={22} hubRadius={0.42} bladeLength={1.05} chord={0.32} stagger={0.6} sweep={0.42} color={METAL_LIGHT} />
        <BladeRow x={1.55} count={20} hubRadius={0.4} bladeLength={0.5} chord={0.16} stagger={0.5} color={METAL_TITANIUM} />
        <BladeRow x={1.78} count={20} hubRadius={0.4} bladeLength={0.44} chord={0.15} stagger={0.5} color={METAL_TITANIUM} />
      </group>

      <group ref={coreRef}>
        <BladeRow x={2.0} count={18} hubRadius={0.38} bladeLength={0.28} chord={0.12} stagger={0.5} color={METAL_TITANIUM} />
        <BladeRow x={2.18} count={18} hubRadius={0.38} bladeLength={0.24} chord={0.11} stagger={0.5} color={METAL_TITANIUM} />
        <BladeRow x={2.36} count={18} hubRadius={0.38} bladeLength={0.2} chord={0.1} stagger={0.5} color={METAL_TITANIUM} />
        <BladeRow x={3.28} count={24} hubRadius={0.34} bladeLength={0.2} chord={0.09} stagger={0.4} color={METAL_DARK} />
        <BladeRow x={3.5} count={26} hubRadius={0.32} bladeLength={0.26} chord={0.1} stagger={0.4} color={METAL_DARK} />
        <BladeRow x={3.72} count={28} hubRadius={0.3} bladeLength={0.32} chord={0.11} stagger={0.4} color={METAL_DARK} />
        <BladeRow x={3.94} count={30} hubRadius={0.28} bladeLength={0.38} chord={0.12} stagger={0.4} color={METAL_DARK} />
      </group>

      <mesh position={[2.55, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.12, 0.12, 3.1, 16]} />
        <meshStandardMaterial color={METAL_DARK} metalness={0.9} roughness={0.35} />
      </mesh>

      <mesh position={[2.72, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.66, 0.6, 0.5, 32, 1, true]} />
        <meshStandardMaterial
          ref={combustorOuterRef}
          color={METAL_DARK}
          metalness={0.7}
          roughness={0.5}
          emissive="#f07a4f"
          emissiveIntensity={0}
          side={2}
        />
      </mesh>
      <mesh position={[2.72, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.42, 0.4, 0.52, 32, 1, true]} />
        <meshStandardMaterial
          ref={combustorInnerRef}
          color="#4d4e4a"
          metalness={0.8}
          roughness={0.45}
          emissive="#f58a61"
          emissiveIntensity={0}
          side={2}
        />
      </mesh>

      <mesh position={[4.35, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.3, 0.9, 24]} />
        <meshStandardMaterial color={METAL_TITANIUM} metalness={0.9} roughness={0.3} />
      </mesh>

      <mesh position={[1.15, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[1.52, 0.045, 10, 64]} />
        <meshStandardMaterial color={METAL_TITANIUM} metalness={0.9} roughness={0.3} />
      </mesh>

      {casingVisible ? (
        <group>
          <CasingSegment x={1.55} length={1.75} radius={1.68} thetaStart={Math.PI * 0.55} thetaLength={Math.PI * 1.3} />
          <mesh position={[0.72, 0, 0]} rotation={[Math.PI * 0.55, Math.PI / 2, 0]}>
            <torusGeometry args={[1.68, 0.08, 12, 48, Math.PI * 1.3]} />
            <meshStandardMaterial color={METAL_LIGHT} metalness={0.9} roughness={0.25} side={2} />
          </mesh>
          <CasingSegment x={2.75} length={2.2} radius={0.85} thetaStart={Math.PI * 0.5} thetaLength={Math.PI * 1.15} />
          <mesh position={[4.15, 0, 0]} rotation={[Math.PI * 0.45, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.78, 0.52, 0.7, 32, 1, true, 0, Math.PI * 1.25]} />
            <meshStandardMaterial color={CASING_COLOR} metalness={0.9} roughness={0.3} side={2} />
          </mesh>
        </group>
      ) : null}
    </group>
  );
}
