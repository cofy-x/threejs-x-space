import {
  ContactShadows,
  Environment,
  Lightformer,
  OrbitControls,
} from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { Bloom, EffectComposer, N8AO } from "@react-three/postprocessing";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ComponentRef, Dispatch } from "react";
import type { Mesh } from "three";
import {
  ACESFilmicToneMapping,
  Color,
  Group,
  MathUtils,
  Spherical,
  Vector3,
} from "three";
import { createAster } from "./model/aster";
import type { AsterRig } from "./model/aster";
import { disposeModel, label } from "./model/geometry";
import type { LabAction, LabState, SystemId } from "../state/lab";
import { procedureProgress } from "../state/lab";

interface SceneProps {
  state: LabState;
  dispatch: Dispatch<LabAction>;
  compact: boolean;
  reducedMotion: boolean;
}

function Aster({ state, dispatch, reducedMotion }: SceneProps) {
  const container = useRef<Group>(null);
  const rig = useRef<AsterRig | null>(null);
  const elapsed = useRef(0);
  const separation = useRef(0);
  const { gl } = useThree();

  useLayoutEffect(() => {
    const parent = container.current;
    if (!parent) return;
    const model = createAster();
    parent.add(model.root);
    rig.current = model;
    return () => {
      parent.remove(model.root);
      disposeModel(model.root);
      rig.current = null;
      gl.domElement.style.cursor = "";
    };
  }, [gl, createAster]);

  useFrame(({ pointer }, delta) => {
    const model = rig.current;
    if (!model) return;
    const dt = Math.min(delta, 0.05);
    if (!state.paused && !reducedMotion) elapsed.current += dt;
    const time = elapsed.current;
    const progress = procedureProgress(state.procedure);
    const online = state.power === "online";
    const level = online ? 1 : state.procedure?.kind === "boot" ? progress : 0;
    const target = state.mode === "exploded" ? state.separation : 0;
    separation.current = reducedMotion
      ? target
      : MathUtils.damp(separation.current, target, 4, dt);
    for (const assembly of model.assemblies) {
      const amount =
        assembly.stage === "shell"
          ? Math.min(1, separation.current * 2.2)
          : Math.max(0, (separation.current - 0.2) / 0.8);
      assembly.group.position
        .copy(assembly.home)
        .addScaledVector(assembly.offset, amount);
    }
    const calibration = state.procedure?.kind;
    const moving = !reducedMotion && !state.paused;
    const exercise =
      calibration === "motion" ? Math.sin(progress * Math.PI) : 0;
    if (moving || reducedMotion) {
      model.head.rotation.y = reducedMotion
        ? 0
        : calibration === "vision"
          ? Math.sin(progress * Math.PI * 4) * 0.55
          : online
            ? Math.sin(time * 0.32) * 0.07 + pointer.x * 0.13
            : 0.08;
      model.head.rotation.x = reducedMotion
        ? 0
        : online
          ? -0.035 + Math.sin(time * 0.6) * 0.018
          : (1 - level) * 0.14;
      for (const arm of model.arms) {
        arm.shoulder.rotation.z = reducedMotion
          ? arm.side * 0.075
          : arm.side * (0.075 + exercise * 0.48);
        arm.shoulder.rotation.x = reducedMotion ? 0 : -exercise * 0.25;
        arm.elbow.rotation.x = reducedMotion ? -0.12 : -0.12 - exercise * 1.15;
        arm.fingers.forEach((finger, i) => {
          finger.rotation.x = reducedMotion
            ? 0.16
            : 0.16 +
              exercise *
                (0.4 + Math.sin(progress * Math.PI * 6 + i * 0.3) * 0.35);
        });
      }
    }
    model.emitters.vision.color.setRGB(
      0.02 + level * 0.25,
      0.045 + level * 0.6,
      0.06 + level * 0.68,
    );
    model.emitters.vision.emissiveIntensity = MathUtils.damp(
      model.emitters.vision.emissiveIntensity,
      0.12 + level * 2.3,
      5,
      dt,
    );
    model.emitters.power.emissiveIntensity = MathUtils.damp(
      model.emitters.power.emissiveIntensity,
      0.12 +
        level *
          (calibration === "power" && !reducedMotion
            ? 2.2 + Math.sin(progress * Math.PI * 10) * 0.8
            : 1.6),
      5,
      dt,
    );
    model.circuits.forEach((material, i) => {
      material.color.setRGB(
        0.025 + level * 0.2,
        0.04 + level * 0.5,
        0.045 + level * 0.56,
      );
      const circuitLevel =
        calibration === "power"
          ? progress >= i / 3
            ? 2.6
            : 0.12
          : level * 1.7;
      material.emissiveIntensity = MathUtils.damp(
        material.emissiveIntensity,
        0.08 + circuitLevel,
        5,
        dt,
      );
    });
    model.emitters.motion.emissiveIntensity = MathUtils.damp(
      model.emitters.motion.emissiveIntensity,
      0.08 + level * (calibration === "motion" ? 2 : 0.8),
      5,
      dt,
    );
  });

  function select(event: ThreeEvent<MouseEvent>) {
    if (event.delta > 4) return;
    let object = event.object;
    while (!object.userData.system && object.parent) object = object.parent;
    if (object.userData.system) {
      event.stopPropagation();
      dispatch({ type: "select", system: object.userData.system as SystemId });
    }
  }

  return (
    <group
      ref={container}
      onClick={select}
      onPointerOver={(event) => {
        event.stopPropagation();
        gl.domElement.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        gl.domElement.style.cursor = "grab";
      }}
    />
  );
}

function LabLettering() {
  const container = useRef<Group>(null);
  useLayoutEffect(() => {
    const parent = container.current;
    if (!parent) return;
    const root = new Group();
    label(root, "B A Y   /   0 4", [2.6, 0.65], [0, 4.85, -4.3], "#788f93");
    label(root, "FIELD ROBOTICS", [1.8, 0.45], [-3.7, 2.95, -4.43], "#667e83");
    const floor = label(
      root,
      "ASTER  /  04",
      [0.92, 0.23],
      [0, 0.252, 1.08],
      "#93a5aa",
    );
    floor.rotation.x = -Math.PI / 2;
    parent.add(root);
    return () => {
      parent.remove(root);
      disposeModel(root);
    };
  }, []);
  return <group ref={container} />;
}

function LabArchitecture({ online }: { online: boolean }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial
          color="#17252d"
          metalness={0.45}
          roughness={0.43}
        />
      </mesh>
      {/* Floor seams and inset service rails establish scale without a decorative grid. */}
      {[-6, -3, 0, 3, 6].map((x) => (
        <mesh
          key={`seam-${x}`}
          position={[x, 0.006, -1]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.016, 16]} />
          <meshBasicMaterial color="#0d171c" />
        </mesh>
      ))}
      {[-5, -2, 1, 4].map((z) => (
        <mesh
          key={`cross-${z}`}
          position={[0, 0.008, z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[15, 0.014]} />
          <meshBasicMaterial color="#0d171c" />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh
            position={[side * 2.45, 0.016, 0.5]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[0.035, 7]} />
            <meshStandardMaterial
              color="#dd8349"
              emissive="#ad5528"
              emissiveIntensity={0.2}
            />
          </mesh>
          <mesh position={[side * 3.6, 2.85, -3.8]} castShadow>
            <boxGeometry args={[0.28, 5.7, 0.4]} />
            <meshStandardMaterial
              color="#26353b"
              metalness={0.6}
              roughness={0.35}
            />
          </mesh>
          <mesh position={[side * 3.59, 3.1, -3.56]}>
            <boxGeometry args={[0.07, 4.4, 0.025]} />
            <meshStandardMaterial
              color="#dae9e9"
              emissive="#c1d9de"
              emissiveIntensity={3}
              toneMapped={false}
            />
          </mesh>
          <mesh position={[side * 2.8, 0.55, -2.6]} castShadow>
            <boxGeometry args={[0.48, 1.1, 0.63]} />
            <meshStandardMaterial
              color="#223039"
              metalness={0.5}
              roughness={0.3}
            />
          </mesh>
          <mesh position={[side * 2.8, 0.85, -2.27]}>
            <planeGeometry args={[0.29, 0.19]} />
            <meshStandardMaterial
              color="#44616a"
              emissive="#45747b"
              emissiveIntensity={0.6}
            />
          </mesh>
          <mesh position={[side * 2.8, 0.3, -2.266]}>
            <planeGeometry args={[0.3, 0.035]} />
            <meshBasicMaterial color="#ca7646" />
          </mesh>
          {Array.from({ length: 4 }, (_, i) => (
            <mesh
              key={i}
              position={[side * 4.3, 0.3 + i * 0.39, -3.7]}
              castShadow
            >
              <boxGeometry args={[0.92, 0.32, 0.9]} />
              <meshStandardMaterial
                color={i % 2 ? "#26383f" : "#31414a"}
                metalness={0.5}
                roughness={0.55}
              />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[0, 3.15, -4.6]} receiveShadow>
        <boxGeometry args={[16, 7, 0.3]} />
        <meshStandardMaterial color="#162830" roughness={0.7} metalness={0.2} />
      </mesh>
      <mesh position={[0, 2.8, -4.42]}>
        <boxGeometry args={[4.7, 4.7, 0.08]} />
        <meshStandardMaterial color="#233943" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 2.8, -4.365]}>
        <boxGeometry args={[0.035, 4.7, 0.035]} />
        <meshStandardMaterial color="#08161e" />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 2.35, 2.8, -4.31]}>
          <boxGeometry args={[0.035, 4.7, 0.025]} />
          <meshStandardMaterial
            color="#84aeb7"
            emissive="#52757d"
            emissiveIntensity={0.6}
          />
        </mesh>
      ))}
      <mesh position={[0, 5.5, -3.8]} castShadow>
        <boxGeometry args={[7.4, 0.3, 0.4]} />
        <meshStandardMaterial
          color="#26353b"
          metalness={0.6}
          roughness={0.35}
        />
      </mesh>
      <mesh position={[0, 5.32, -3.63]}>
        <boxGeometry args={[5.5, 0.04, 0.12]} />
        <meshStandardMaterial
          color="#e2dbcc"
          emissive="#d5c7a9"
          emissiveIntensity={3}
        />
      </mesh>
      <mesh position={[0, 0.055, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[1.85, 1.95, 0.11, 96]} />
        <meshStandardMaterial color="#0c1820" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.15, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[1.72, 1.82, 0.18, 96]} />
        <meshStandardMaterial
          color="#2f434d"
          metalness={0.65}
          roughness={0.31}
        />
      </mesh>
      <mesh
        position={[0, 0.247, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <circleGeometry args={[1.64, 96]} />
        <meshStandardMaterial
          color="#1c2a32"
          metalness={0.38}
          roughness={0.57}
        />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <group key={i} rotation={[0, (i * Math.PI) / 2 + 0.25, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.25, 0]}>
            <torusGeometry args={[1.73, 0.016, 6, 36, 0.93]} />
            <meshStandardMaterial
              color={online ? "#9cd4d0" : "#dc864a"}
              emissive={online ? "#6dbcb7" : "#b36a2f"}
              emissiveIntensity={online ? 1.3 : 0.5}
            />
          </mesh>
          <mesh position={[0, 0.256, 1.5]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.07, 0.2]} />
            <meshBasicMaterial color="#acbfc1" />
          </mesh>
        </group>
      ))}
      <LabLettering />
    </group>
  );
}

function ScanVolume({
  state,
  reducedMotion,
}: Pick<SceneProps, "state" | "reducedMotion">) {
  const ring = useRef<Mesh>(null);
  useFrame(() => {
    if (!ring.current) return;
    ring.current.visible = Boolean(state.procedure) && !reducedMotion;
    ring.current.position.y = 0.3 + procedureProgress(state.procedure) * 4.3;
  });
  return (
    <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <ringGeometry args={[1.29, 1.31, 80]} />
      <meshBasicMaterial
        color="#83c9d1"
        transparent
        opacity={0.28}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

function CameraRig({ state, compact, reducedMotion }: SceneProps) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const { camera, gl } = useThree();
  const desiredPosition = useRef(new Vector3(5.8, 3.4, 8.6));
  const desiredTarget = useRef(new Vector3(0, 2.25, 0));
  const initialized = useRef(false);
  const transitioning = useRef(true);

  useLayoutEffect(() => {
    let position = new Vector3(5.8, 3.4, 8.6);
    let target = new Vector3(0, 2.25, 0);
    if (state.mode === "exploded") {
      position = new Vector3(6.7, 3.9, 10.2);
      target = new Vector3(0, 2.6, 0);
    }
    if (state.mode === "systems") {
      if (state.selection === "vision") {
        position = new Vector3(2.6, 4.2, 4.8);
        target = new Vector3(0, 3.68, 0);
      }
      if (state.selection === "power") {
        position = new Vector3(3.1, 3.4, 5.6);
        target = new Vector3(0, 2.97, 0);
      }
      if (state.selection === "motion") {
        position = new Vector3(4.5, 3.1, 7.8);
        target = new Vector3(0, 2.4, 0);
      }
    }
    if (compact && state.mode === "exploded")
      position.sub(target).multiplyScalar(1.05).add(target);
    desiredPosition.current.copy(position);
    desiredTarget.current.copy(target);
    transitioning.current = true;
    if (reducedMotion || !initialized.current) {
      camera.position.copy(position);
      controls.current?.target.copy(target);
      controls.current?.update();
      transitioning.current = false;
    }
    initialized.current = true;
  }, [
    state.mode,
    state.selection,
    state.cameraRevision,
    compact,
    reducedMotion,
    camera,
  ]);

  useEffect(() => {
    const canvas = gl.domElement;
    canvas.tabIndex = 0;
    canvas.setAttribute("role", "img");
    canvas.setAttribute(
      "aria-label",
      "Interactive Aster robot. Use arrow keys to orbit, plus and minus to zoom, and Home to reset the view. System controls are available below.",
    );
    canvas.style.touchAction = compact ? "pan-y" : "none";
    canvas.style.cursor = "grab";
    function keydown(event: KeyboardEvent) {
      const orbit = controls.current;
      if (
        !orbit ||
        ![
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
          "+",
          "=",
          "-",
          "Home",
        ].includes(event.key)
      )
        return;
      event.preventDefault();
      transitioning.current = false;
      const offset = camera.position.clone().sub(orbit.target);
      const spherical = new Spherical().setFromVector3(offset);
      if (event.key === "ArrowLeft") spherical.theta -= 0.12;
      if (event.key === "ArrowRight") spherical.theta += 0.12;
      if (event.key === "ArrowUp") spherical.phi -= 0.08;
      if (event.key === "ArrowDown") spherical.phi += 0.08;
      if (event.key === "+" || event.key === "=") spherical.radius *= 0.9;
      if (event.key === "-") spherical.radius *= 1.1;
      spherical.phi = MathUtils.clamp(spherical.phi, 0.25, 1.65);
      spherical.radius = MathUtils.clamp(spherical.radius, 3, 16);
      camera.position
        .copy(orbit.target)
        .add(offset.setFromSpherical(spherical));
      if (event.key === "Home") {
        if (reducedMotion) {
          camera.position.copy(desiredPosition.current);
          orbit.target.copy(desiredTarget.current);
        } else transitioning.current = true;
      }
      orbit.update();
    }
    canvas.addEventListener("keydown", keydown);
    return () => canvas.removeEventListener("keydown", keydown);
  }, [camera, gl, compact, reducedMotion]);

  useFrame((_, delta) => {
    const orbit = controls.current;
    if (!orbit || !transitioning.current) return;
    const blend = 1 - Math.exp(-Math.min(delta, 0.05) * 5);
    camera.position.lerp(desiredPosition.current, blend);
    orbit.target.lerp(desiredTarget.current, blend);
    orbit.update();
    if (camera.position.distanceToSquared(desiredPosition.current) < 0.00001)
      transitioning.current = false;
  });
  return (
    <OrbitControls
      ref={controls}
      target={[0, 2.25, 0]}
      makeDefault
      enablePan={false}
      enableZoom={!compact}
      minDistance={3}
      maxDistance={16}
      minPolarAngle={0.25}
      maxPolarAngle={1.65}
      enableDamping={!reducedMotion}
      dampingFactor={0.08}
      onStart={() => {
        transitioning.current = false;
      }}
    />
  );
}

function ContextMonitor({ onLost }: { onLost: () => void }) {
  const { gl } = useThree();
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (event: Event) => {
      event.preventDefault();
      onLost();
    };
    canvas.addEventListener("webglcontextlost", lost);
    return () => canvas.removeEventListener("webglcontextlost", lost);
  }, [gl, onLost]);
  return null;
}

export function LabScene(props: SceneProps) {
  const [lost, setLost] = useState(false);
  const [generation, setGeneration] = useState(0);
  if (lost)
    return (
      <div className="aster-graphics-error" role="alert">
        <strong>The graphics session was interrupted.</strong>
        <p>Your calibration progress is still here.</p>
        <button
          type="button"
          onClick={() => {
            setLost(false);
            setGeneration((n) => n + 1);
          }}
        >
          Restore scene
        </button>
      </div>
    );
  return (
    <Canvas
      key={generation}
      style={{ touchAction: props.compact ? "pan-y" : "none" }}
      shadows
      camera={{ position: [5.8, 3.4, 8.6], fov: 34, near: 0.1, far: 80 }}
      dpr={props.compact ? [1, 1.4] : [1, 1.7]}
      gl={{
        antialias: false,
        toneMapping: ACESFilmicToneMapping,
        powerPreference: "high-performance",
      }}
      onCreated={({ gl }) => {
        gl.toneMappingExposure = 1.1;
        gl.setClearColor(new Color("#101c24"));
      }}
      fallback={
        <div className="aster-graphics-error" role="alert">
          Aster needs a browser with WebGL support. Try enabling hardware
          acceleration, or use another browser.
        </div>
      }
    >
      <color attach="background" args={["#111e27"]} />
      <fog attach="fog" args={["#111e27", 13, 35]} />
      <ambientLight intensity={0.28} color="#bed6e5" />
      <directionalLight
        position={[-3.5, 7, 5]}
        intensity={3.4}
        color="#fff1db"
        castShadow
        shadow-mapSize={props.compact ? [1024, 1024] : [2048, 2048]}
        shadow-normalBias={0.035}
        shadow-bias={-0.0001}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={6}
        shadow-camera-bottom={-2}
      />
      <directionalLight position={[5, 3, 1]} intensity={1.4} color="#b6d9ed" />
      <spotLight
        position={[-1, 6, -3]}
        intensity={35}
        angle={0.6}
        penumbra={1}
        color="#91d8ec"
      />
      <Environment resolution={256} frames={1}>
        <Lightformer
          intensity={3}
          position={[-3, 5, 3]}
          rotation={[0, Math.PI / 4, 0]}
          scale={[4, 6, 1]}
          color="#f3e4cd"
        />
        <Lightformer
          intensity={2.5}
          position={[4, 3, 1]}
          rotation={[0, -Math.PI / 2, 0]}
          scale={[2, 6, 1]}
          color="#bfdce8"
        />
        <Lightformer
          intensity={2}
          position={[0, 6, -2]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[5, 3, 1]}
        />
      </Environment>
      <LabArchitecture online={props.state.power === "online"} />
      <Aster {...props} />
      <ScanVolume state={props.state} reducedMotion={props.reducedMotion} />
      <ContactShadows
        position={[0, 0.25, 0]}
        opacity={0.45}
        scale={5}
        blur={2}
        far={4.8}
        resolution={props.compact ? 128 : 256}
      />
      <CameraRig {...props} />
      <ContextMonitor onLost={() => setLost(true)} />
      <EffectComposer enableNormalPass multisampling={props.compact ? 0 : 4}>
        <N8AO
          aoRadius={0.22}
          intensity={1.8}
          distanceFalloff={0.6}
          quality="performance"
          halfRes
        />
        <Bloom
          intensity={0.3}
          luminanceThreshold={1.2}
          luminanceSmoothing={0.3}
          mipmapBlur
        />
      </EffectComposer>
    </Canvas>
  );
}
