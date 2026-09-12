import { ContactShadows, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState, type ComponentRef } from "react";
import { MathUtils, PMREMGenerator, Vector3 } from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { useSimulationConfig, type EngineStage } from "../state/simulation";
import { Airflow } from "./three/airflow";
import { EngineLabels } from "./three/engine-labels";
import { TurbofanEngine } from "./three/turbofan-engine";

const STAGES = [
  { id: "fan", name: "Fan", title: "A breath of cold air.", description: "Swept fan blades draw air inward. Most travels around the core through the bypass duct, producing a large share of the thrust." },
  { id: "compressor", name: "Compressor", title: "Pressure, stage by stage.", description: "Successive rows of rotating blades and stationary vanes compress the core airflow before it reaches the combustor." },
  { id: "combustor", name: "Combustor", title: "Where air becomes energy.", description: "Fuel mixes with compressed air in an annular chamber. Continuous combustion feeds hot gas into the turbines." },
  { id: "turbine", name: "Turbine", title: "Power comes full circle.", description: "The hot gas turns the turbine stages. Two concentric shafts carry that power back to the compressor and fan." },
  { id: "nozzle", name: "Nozzle", title: "Energy, directed aft.", description: "The exhaust nozzle accelerates the remaining core flow. It joins the cooler bypass stream to propel the aircraft forward." },
] as const satisfies readonly { id: EngineStage; name: string; title: string; description: string }[];

type View = "Perspective" | "Profile" | "Intake";
const CAMERA_DIRECTIONS: Record<View, [number, number, number]> = {
  Perspective: [-0.52, 0.28, 0.81],
  Profile: [-0.08, 0.12, 0.99],
  Intake: [-0.99, 0.08, 0.12],
};

// Retain the last frame for browser captures, including paused engine views.
const RENDERER_OPTIONS = { antialias: true, preserveDrawingBuffer: true };

function EnvironmentSetup() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const target = pmrem.fromScene(room, 0.035);
    scene.environment = target.texture;
    scene.environmentIntensity = 0.9;
    room.dispose();
    return () => {
      scene.environment = null;
      target.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}

function CameraRig({ view, revision }: { view: View; revision: number }) {
  const { camera, size } = useThree();
  const { reducedMotion } = useSimulationConfig();
  const destination = useRef(new Vector3());
  const moving = useRef(false);
  const initialized = useRef(false);
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const aspect = Math.max(size.width, 1) / Math.max(size.height, 1);
  const fitDistance = view === "Intake" ? Math.max(10, 10 / aspect) : Math.max(8.4, 13.8 / aspect);

  useEffect(() => {
    destination.current.set(...CAMERA_DIRECTIONS[view]).normalize().multiplyScalar(fitDistance).add(new Vector3(2.2, 0, 0));
    camera.far = Math.max(70, fitDistance + 30);
    camera.updateProjectionMatrix();
    if (!initialized.current || reducedMotion) {
      camera.position.copy(destination.current);
      camera.lookAt(2.2, 0, 0);
      initialized.current = true;
      moving.current = false;
      controls.current?.update();
    } else {
      moving.current = true;
    }
  }, [camera, fitDistance, view, revision, reducedMotion]);

  useFrame((_, delta) => {
    if (!moving.current) return;
    camera.position.lerp(destination.current, 1 - Math.exp(-7 * Math.min(delta, 0.05)));
    controls.current?.target.set(2.2, 0, 0);
    controls.current?.update();
    if (camera.position.distanceToSquared(destination.current) < 0.0001) moving.current = false;
  });

  return (
    <OrbitControls
      ref={controls}
      target={[2.2, 0, 0]}
      enableDamping={!reducedMotion}
      dampingFactor={0.09}
      enablePan={false}
      enableZoom={size.width > 600}
      minDistance={5}
      maxDistance={Math.max(16, fitDistance)}
      minPolarAngle={MathUtils.degToRad(24)}
      maxPolarAngle={MathUtils.degToRad(100)}
      onStart={() => { moving.current = false; }}
    />
  );
}

export function EngineView() {
  const { focusedStage, setFocusedStage, reducedMotion } = useSimulationConfig();
  const [view, setView] = useState<View>("Perspective");
  const [revision, setRevision] = useState(0);
  const [webGLAvailable, setWebGLAvailable] = useState<boolean | null>(null);
  const stageIndex = STAGES.findIndex((stage) => stage.id === focusedStage);
  const stage = STAGES[stageIndex] ?? STAGES[0];

  useEffect(() => {
    // Canvas fallback is only HTML canvas fallback content. Check WebGL2 before
    // R3F asynchronously configures its renderer so disabled WebGL stays usable.
    try {
      const context = document.createElement("canvas").getContext("webgl2");
      setWebGLAvailable(context !== null);
      context?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      setWebGLAvailable(false);
    }
  }, []);

  return (
    <section className="panel engine-view" aria-label="Interactive engine cutaway">
      <div className="engine-view__toolbar">
        <span className="panel__title">TF–01 <span aria-hidden="true">/</span> Section study</span>
        <div className="engine-view__views" role="group" aria-label="Camera view">
          {(["Perspective", "Profile", "Intake"] as const).map((preset) => (
            <button key={preset} type="button" aria-pressed={view === preset} onClick={() => { setView(preset); setRevision((current) => current + 1); }}>
              {preset}
            </button>
          ))}
        </div>
      </div>
      <div className="engine-view__canvas" role={webGLAvailable ? "img" : undefined} aria-label={webGLAvailable ? "Three-dimensional cutaway of a turbofan, from the intake fan on the left to the exhaust nozzle on the right. Use the camera and stage buttons to explore." : undefined}>
        {webGLAvailable === false ? <div className="engine-view__fallback" role="status">This engine view needs WebGL 2. You can still explore the stage descriptions and simulation controls below.</div> : null}
        {webGLAvailable ? <Canvas camera={{ position: [-2.2, 2.35, 6.8], fov: 32, near: 0.1, far: 70 }} dpr={[1, 1.75]} gl={RENDERER_OPTIONS}>
          <color attach="background" args={["#0b1015"]} />
          <EnvironmentSetup />
          <ambientLight intensity={0.45} />
          <directionalLight position={[-3, 7, 5]} intensity={2.2} color="#e7f3ff" />
          <directionalLight position={[4, 2, -5]} intensity={3.2} color="#a2c5e0" />
          <directionalLight position={[1, -1, 5]} intensity={0.7} color="#f1c195" />
          <Suspense fallback={null}>
            <group position={[2.2, 0, 0]} scale={[1.42, 1, 1]}>
              <group position={[-2.2, 0, 0]}>
                <TurbofanEngine />
                <Airflow />
                {view !== "Intake" || focusedStage === "fan" ? <EngineLabels /> : null}
              </group>
            </group>
            <ContactShadows position={[2.2, -1.82, 0]} opacity={0.45} scale={13} blur={2.8} far={4} resolution={512} frames={1} color="#000000" />
          </Suspense>
          <CameraRig view={view} revision={revision} />
        </Canvas> : null}
        {webGLAvailable ? <div className="engine-view__hint">{reducedMotion ? "Reduced motion · static flow" : "Drag to orbit"}<span>Illustrative geometry · not to scale</span></div> : null}
      </div>
      <div className="engine-view__stages" role="group" aria-label="Explore engine stages">
        {STAGES.map((item, index) => (
          <button className={`engine-view__stage${item.id === focusedStage ? " is-active" : ""}`} key={item.id} type="button" aria-pressed={item.id === focusedStage} onClick={() => setFocusedStage(item.id)}>
            <span>{String(index + 1).padStart(2, "0")}</span>{item.name}
          </button>
        ))}
      </div>
      <div className="engine-view__detail" aria-live="polite">
        <span className="engine-view__detail-index">{String(stageIndex + 1).padStart(2, "0")}</span>
        <div className="engine-view__detail-copy"><h2>{stage.title}</h2><p>{stage.description}</p></div>
      </div>
    </section>
  );
}
