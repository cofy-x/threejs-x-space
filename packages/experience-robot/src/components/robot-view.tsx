import { ContactShadows, Html, MeshReflectorMaterial, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, N8AO } from "@react-three/postprocessing";
import { useEffect, useMemo, useRef, useState } from "react";
import { ACESFilmicToneMapping, BackSide, PMREMGenerator, Quaternion, SRGBColorSpace, Vector3 } from "three";
import type { Group } from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { useAssembly } from "../state/assembly";
import { backdropGradientTexture, cachedTexture, decalPlane, pedestalMarkTexture } from "./three/create-decals";
import { ASSEMBLY_ORDER, getPartInfos } from "./three/part-infos";
import { RobotModel } from "./three/robot-model";

interface OrbitControlsLike {
  target: Vector3;
  update: () => void;
}

interface ReviewConfig {
  view: string;
}

function readReviewConfig(): ReviewConfig | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const view = params.get("review");
  if (!view) return null;
  return { view };
}

const DEFAULT_CAMERA = { position: [3.2, 2.5, 7.4], target: [0, 1.95, 0] } as const;

const REVIEW_CAMERAS: Record<string, { position: [number, number, number]; target: [number, number, number] }> = {
  front: { position: [0, 1.85, 6.8], target: [0, 1.85, 0] },
  "three-quarter": { position: [4.5, 2.3, 5.2], target: [0, 1.8, 0] },
  side: { position: [6.8, 1.85, 0], target: [0, 1.85, 0] },
  top: { position: [0, 8.2, 0.9], target: [0, 1.6, 0] },
  rear: { position: [0, 1.85, -6.8], target: [0, 1.85, 0] },
  "rear-tq": { position: [-4.5, 2.3, -5.2], target: [0, 1.8, 0] },
};

const LABEL_OFFSETS: Record<string, [number, number, number]> = {
  head: [0, 0.42, 0],
  neck: [0.55, 0.1, 0],
  torso: [-0.95, 0.3, 0.2],
  pelvis: [0.55, -0.05, 0.2],
  "arm-L": [-0.5, 0.2, 0],
  "arm-R": [0.5, 0.2, 0],
  "leg-L": [-0.45, 0, 0],
  "leg-R": [0.45, 0, 0],
};

function Backdrop() {
  const texture = useMemo(() => cachedTexture("backdrop", backdropGradientTexture), []);
  return (
    <mesh position={[0, 6, 0]}>
      <cylinderGeometry args={[18, 18, 26, 48, 1, true]} />
      <meshBasicMaterial map={texture} side={BackSide} fog={false} />
    </mesh>
  );
}

function Pedestal() {
  const mark = useMemo(
    () =>
      decalPlane(
        "pedestal-mark",
        3,
        3,
        cachedTexture("pedestal-mark", pedestalMarkTexture),
        [0, -0.0425, 0],
        [-Math.PI / 2, 0, 0],
        true,
      ),
    [],
  );
  return (
    <group>
      <mesh position={[0, -0.08, 0]} receiveShadow>
        <cylinderGeometry args={[1.55, 1.65, 0.07, 64]} />
        <meshStandardMaterial color="#3a3936" roughness={0.45} metalness={0.35} />
      </mesh>
      <mesh position={[0, -0.043, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.58, 1.62, 96]} />
        <meshBasicMaterial color="#2f6fe0" transparent opacity={0.55} />
      </mesh>
      <primitive object={mark} />
      <mesh position={[0, -0.121, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[6, 64]} />
        <MeshReflectorMaterial
          blur={[240, 60]}
          resolution={1024}
          mixBlur={0.9}
          mixStrength={0.22}
          roughness={0.9}
          color="#77746e"
          mirror={0.35}
          depthScale={0}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
        />
      </mesh>
    </group>
  );
}

function TurntableControls({ review, target }: { review: boolean; target: readonly [number, number, number] }) {
  const { selectedPartId, hoveredPartId, playing, explodeAmount } = useAssembly();
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const idle =
    !review && !reduced && !selectedPartId && !hoveredPartId && !playing && explodeAmount < 0.02;
  return (
    <OrbitControls
      target={[target[0], target[1], target[2]]}
      enableDamping
      dampingFactor={0.08}
      minDistance={2.5}
      maxDistance={12}
      maxPolarAngle={Math.PI * 0.55}
      autoRotate={idle}
      autoRotateSpeed={0.55}
      makeDefault
    />
  );
}

function EnvironmentSetup() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new PMREMGenerator(gl);
    const environmentMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = environmentMap;
    scene.environmentIntensity = 0.5;
    return () => {
      scene.environment = null;
      environmentMap.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}

function CameraRig() {
  const { selectedPartId, runtimeRef } = useAssembly();
  const controls = useThree((state) => state.controls) as OrbitControlsLike | null;
  const desired = useMemo(() => new Vector3(), []);

  useFrame((_, delta) => {
    if (!controls) return;
    const part = selectedPartId ? runtimeRef.current?.parts[selectedPartId] : undefined;
    if (part) {
      part.getWorldPosition(desired);
    } else {
      desired.set(DEFAULT_CAMERA.target[0], DEFAULT_CAMERA.target[1], DEFAULT_CAMERA.target[2]);
    }
    controls.target.lerp(desired, Math.min(1, delta * 4));
    controls.update();
  });
  return null;
}

interface PartLabelProps {
  partId: string;
  title: string;
  visible: boolean;
}

function PartLabel({ partId, title, visible }: PartLabelProps) {
  const { runtimeRef } = useAssembly();
  const anchor = useRef<Group>(null);
  const offset = useMemo(() => new Vector3(...(LABEL_OFFSETS[partId] ?? [0, 0.4, 0])), [partId]);
  const stickQuaternion = useMemo(() => {
    const direction = offset.clone().normalize().negate();
    return new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction);
  }, [offset]);

  useFrame(() => {
    const part = runtimeRef.current?.parts[partId];
    if (!anchor.current || !part) return;
    anchor.current.position.copy(part.position).add(offset);
  });

  if (!visible) return null;

  return (
    <group ref={anchor}>
      <mesh
        position={offset.clone().multiplyScalar(-0.5).toArray()}
        quaternion={stickQuaternion}
      >
        <cylinderGeometry args={[0.004, 0.004, offset.length(), 6]} />
        <meshBasicMaterial color="#8a8478" />
      </mesh>
      <Html center distanceFactor={9} zIndexRange={[20, 0]}>
        <div className="robot-tag">{title}</div>
      </Html>
    </group>
  );
}

function useNarrowViewport(): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 640px)");
    const update = () => setNarrow(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return narrow;
}

function PartLabels() {
  const { explodeAmount, guided, step, selectedPartId, hoveredPartId } = useAssembly();
  const narrow = useNarrowViewport();
  const infos = getPartInfos();
  const nextId = guided && step < ASSEMBLY_ORDER.length ? ASSEMBLY_ORDER[step] : undefined;

  return (
    <>
      {Object.values(infos).map((info) => (
        <PartLabel
          key={info.id}
          partId={info.id}
          title={info.title}
          visible={
            narrow
              ? info.id === selectedPartId || info.id === hoveredPartId
              : info.id === selectedPartId ||
                info.id === hoveredPartId ||
                info.id === nextId ||
                (!guided && explodeAmount > 0.35)
          }
        />
      ))}
    </>
  );
}

export function RobotView() {
  const review = readReviewConfig();
  const camera = (review ? REVIEW_CAMERAS[review.view] : undefined) ?? DEFAULT_CAMERA;

  useEffect(() => {
    if (!review) return;
    document.body.classList.add("robot-review");
    return () => document.body.classList.remove("robot-review");
  }, [review]);

  return (
    <div className={review ? "robot-view robot-view--review" : "robot-view"}>
      <Canvas
        camera={{ position: camera.position, fov: 35 }}
        dpr={[1, 1.75]}
        shadows
        gl={{ toneMapping: ACESFilmicToneMapping, outputColorSpace: SRGBColorSpace }}
        onCreated={({ gl }) => {
          gl.toneMappingExposure = 0.95;
        }}
      >
        <color attach="background" args={["#7a7770"]} />
        <fog attach="fog" args={["#6a675f", 12, 30]} />
        <EnvironmentSetup />
        <Backdrop />
        <ambientLight intensity={0.22} />
        <directionalLight
          position={[-4, 7, 5]}
          intensity={1.55}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-4}
          shadow-camera-right={4}
          shadow-camera-top={6}
          shadow-camera-bottom={-2}
        />
        <directionalLight position={[5, 3, 4]} intensity={0.3} />
        <directionalLight position={[0, 6, -7]} intensity={1.1} color="#dfe8ff" />
        <RobotModel />
        <Pedestal />
        {!review && <PartLabels />}
        {!review && <CameraRig />}
        <ContactShadows position={[0, 0.001, 0]} opacity={0.55} scale={8} blur={2.2} far={3} />
        <TurntableControls review={Boolean(review)} target={camera.target} />
        <EffectComposer enableNormalPass multisampling={4}>
          <N8AO aoRadius={0.4} intensity={2.2} distanceFalloff={0.6} quality="performance" halfRes />
          <Bloom intensity={0.45} luminanceThreshold={0.82} luminanceSmoothing={0.25} mipmapBlur />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
