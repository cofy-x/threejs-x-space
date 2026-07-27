import { Html, Line } from "@react-three/drei";
import { useSimulation } from "../../state/simulation";

interface EngineLabelProps {
  anchor: [number, number, number];
  label: [number, number, number];
  text: string;
}

function EngineLabel({ anchor, label, text }: EngineLabelProps) {
  return (
    <group>
      <Line
        points={[anchor, label]}
        color="#5cc6e8"
        transparent
        opacity={0.55}
        lineWidth={1}
      />
      <mesh position={anchor}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshBasicMaterial color="#5cc6e8" />
      </mesh>
      <Html position={label} center zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
        <div className="engine-label">{text}</div>
      </Html>
    </group>
  );
}

export function EngineLabels() {
  const { values } = useSimulation();
  const fanRpm = Math.round(values.n1).toLocaleString("en-US");
  const compressorTemp = Math.round(15 + (320 - 15) * (values.tit / 1320));
  const combustorTemp = Math.round(values.tit);

  return (
    <group>
      <EngineLabel anchor={[1.15, 1.5, 0]} label={[0.6, 2.3, 0]} text={`FAN (${fanRpm} RPM)`} />
      <EngineLabel anchor={[2.2, 0.62, 0]} label={[2.1, 1.55, 0]} text={`COMPRESSOR (${compressorTemp}°C)`} />
      <EngineLabel anchor={[2.72, -0.64, 0]} label={[2.45, -1.4, 0]} text={`COMBUSTOR (${combustorTemp}°C)`} />
      <EngineLabel anchor={[3.7, -0.66, 0]} label={[3.75, -1.35, 0]} text="TURBINE (HP/LP)" />
      <EngineLabel anchor={[4.2, 0.66, 0]} label={[4.55, 1.35, 0]} text="NOZZLE" />
    </group>
  );
}
