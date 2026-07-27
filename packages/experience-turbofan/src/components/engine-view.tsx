import { OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { easeOutCubic } from "@threejs-x-space/three-utils";
import { useEffect, useState } from "react";
import { PMREMGenerator } from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { useSimulation } from "../state/simulation";
import { Airflow } from "./three/airflow";
import { EngineLabels } from "./three/engine-labels";
import { TurbofanEngine } from "./three/turbofan-engine";

const LEGEND_ITEMS = [
  { color: "#5cc6e8", label: "Intake" },
  { color: "#e3b65a", label: "Compression" },
  { color: "#f07a4f", label: "Combustion" },
  { color: "#e66b5b", label: "Exhaust" },
  { color: "#4f6fe8", label: "Bypass Flow" },
] as const;

function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(query.matches);
    updatePreference();
    query.addEventListener("change", updatePreference);
    return () => query.removeEventListener("change", updatePreference);
  }, []);

  return reducedMotion;
}

function EnvironmentSetup() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new PMREMGenerator(gl);
    const environmentMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = environmentMap;
    return () => {
      scene.environment = null;
      environmentMap.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}

export function EngineViewStats() {
  const { progress } = useSimulation();
  const eased = easeOutCubic(progress);
  const inletAirflow = Math.round(480 * eased);
  const bypassRatio = (6.2 * eased).toFixed(1);
  return (
    <div className="engine-view__stats">
        <span>Airflow {inletAirflow} kg/s</span>
        <span className="engine-view__stats-divider" />
        <span>Bypass {bypassRatio}:1</span>
    </div>
  );
}

export function EngineView() {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <section className="panel engine-view">
      <div className="panel__header">
        <span className="panel__title">Live engine cutaway</span>
        <EngineViewStats />
      </div>
      <div className="engine-view__canvas">
        <Canvas camera={{ position: [-5.5, 1.9, 4.8], fov: 40 }} dpr={[1, 1.75]}>
          <color attach="background" args={["#090a0c"]} />
          <fog attach="fog" args={["#090a0c", 15, 29]} />
          <EnvironmentSetup />
          <ambientLight intensity={0.3} />
          <directionalLight position={[6, 8, 4]} intensity={1.35} />
          <directionalLight position={[-6, 2, 6]} intensity={0.65} color="#9baae9" />
          <pointLight position={[5.5, 0, 0]} intensity={2.2} color="#f07a4f" distance={7} />
          <TurbofanEngine />
          <Airflow />
          <EngineLabels />
          <gridHelper args={[30, 30, "#34373e", "#1b1d22"]} position={[1, -2.6, 0]} />
          <OrbitControls
            target={[0.8, 0, 0]}
            enableDamping
            dampingFactor={0.08}
            autoRotate={!reducedMotion}
            autoRotateSpeed={0.5}
            minDistance={3}
            maxDistance={18}
          />
        </Canvas>
        <div className="engine-view__legend">
          {LEGEND_ITEMS.map((item) => (
            <div key={item.label} className="engine-view__legend-item">
              <span style={{ backgroundColor: item.color }} />
              {item.label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
