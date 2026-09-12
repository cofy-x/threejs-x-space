import { Html, Line } from "@react-three/drei";
import { useSimulationConfig, type EngineStage } from "../../state/simulation";

const LABELS: Record<EngineStage, { anchor: [number, number, number]; label: [number, number, number]; text: string }> = {
  fan: { anchor: [1.15, 1.15, 0.85], label: [0.5, 2.05, 0.5], text: "01 / INTAKE FAN" },
  compressor: { anchor: [2, 0.6, 0.5], label: [2, 1.65, 0.8], text: "02 / COMPRESSOR" },
  combustor: { anchor: [2.72, 0.28, 0.43], label: [3.1, 1.6, 0.8], text: "03 / COMBUSTOR" },
  turbine: { anchor: [3.7, 0.38, 0.49], label: [4, 1.6, 0.7], text: "04 / TURBINE" },
  nozzle: { anchor: [4.3, 0.51, 0.47], label: [4, 1.65, 0.4], text: "05 / EXHAUST NOZZLE" },
};

export function EngineLabels() {
  const { focusedStage } = useSimulationConfig();
  const { anchor, label, text } = LABELS[focusedStage];
  return (
    <group>
      <Line points={[anchor, label]} color="#b2c0c9" transparent opacity={0.45} lineWidth={1} />
      <mesh position={anchor}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshBasicMaterial color="#efa968" />
      </mesh>
      <Html position={label} center zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
        <div className="engine-label">{text}</div>
      </Html>
    </group>
  );
}
