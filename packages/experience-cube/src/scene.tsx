import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  type MutableRefObject,
} from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import * as T from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { applyMove, solvedCubies, type Move } from "./cube-state";
import { createTentacles } from "./tentacles";
import { Water } from "./water";

const OCTO_URL = new URL("./assets/octo.glb", import.meta.url).href;
export const MOVE_SECONDS = 1.8;
export type View = "studio" | "closeup" | "reset";
export interface Playback {
  time: number;
  playing: boolean;
  speed: number;
}
interface Props {
  playback: MutableRefObject<Playback>;
  scramble: Move[];
  solution: Move[];
  view: View;
  quality: boolean;
  reduced: boolean;
  onReady: () => void;
  capture: MutableRefObject<(() => void) | null>;
}
const AXES = {
  x: new T.Vector3(1, 0, 0),
  y: new T.Vector3(0, 1, 0),
  z: new T.Vector3(0, 0, 1),
};
const INDEX = { x: 0, y: 1, z: 2 } as const;
const CUBE_POSITION = new T.Vector3(0, 1, 1.3);
const CUBE_ROTATION = new T.Quaternion().setFromEuler(
  new T.Euler(-0.12, 0.1, 0.08),
);
const smooth = (t: number) => {
  const v = T.MathUtils.clamp(t, 0, 1);
  return v * v * (3 - 2 * v);
};

function createProps() {
  const root = new T.Group();
  const resources: (T.BufferGeometry | T.Material)[] = [];
  const own = <R extends T.BufferGeometry | T.Material>(resource: R): R => {
    resources.push(resource);
    return resource;
  };
  const material = (color: string, metalness = 0.1, roughness = 0.35) =>
    own(new T.MeshStandardMaterial({ color, metalness, roughness }));
  const carbon = material("#102a37", 0.4, 0.3);
  const plinth = material("#102b3d", 0.55, 0.28),
    rim = material("#587b83", 0.6, 0.3);
  const glow = own(
    new T.MeshStandardMaterial({
      color: "#8edacd",
      emissive: "#49abaf",
      emissiveIntensity: 1.4,
      metalness: 0.5,
      roughness: 0.3,
    }),
  );
  const sphere = own(new T.SphereGeometry(1, 28, 18));
  const cylinder = own(new T.CylinderGeometry(1, 1, 1, 96));
  const tickGeometry = own(new T.BoxGeometry(1, 1, 1));
  function mesh(
    parent: T.Object3D,
    geometry: T.BufferGeometry,
    mat: T.Material,
    position: [number, number, number],
    scale: [number, number, number],
  ) {
    const m = new T.Mesh(geometry, mat);
    m.position.set(...position);
    m.scale.set(...scale);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  mesh(root, cylinder, plinth, [0, -0.02, 0], [2.36, 0.22, 2.36]);
  mesh(root, cylinder, rim, [0, 0.081, 0], [2.37, 0.017, 2.37]);
  mesh(root, cylinder, carbon, [0, 0.095, 0], [2.33, 0.015, 2.33]);
  mesh(root, cylinder, plinth, [0, -0.16, 0], [2.2, 0.13, 2.2]);
  const ring = mesh(
    root,
    own(new T.TorusGeometry(2.34, 0.008, 8, 160)),
    glow,
    [0, -0.087, 0],
    [1, 1, 1],
  );
  ring.rotation.x = Math.PI / 2;
  const ticks = new T.InstancedMesh(tickGeometry, rim, 80),
    helper = new T.Object3D();
  for (let i = 0; i < 80; i++) {
    const a = (i / 80) * Math.PI * 2;
    helper.position.set(Math.sin(a) * 2.26, 0.108, Math.cos(a) * 2.26);
    helper.rotation.y = a;
    helper.scale.set(0.009, 0.003, i % 5 === 0 ? 0.065 : 0.028);
    helper.updateMatrix();
    ticks.setMatrixAt(i, helper.matrix);
  }
  root.add(ticks);
  const cube = new T.Group();
  cube.position.copy(CUBE_POSITION);
  cube.quaternion.copy(CUBE_ROTATION);
  root.add(cube);
  const plastic = material("#101516", 0.15, 0.3);
  const colors = [
    "#df4836",
    "#f28822",
    "#f6cf44",
    "#f0eee1",
    "#269e7e",
    "#2e70c6",
  ].map((color) =>
    own(
      new T.MeshPhysicalMaterial({
        color,
        roughness: 0.22,
        metalness: 0.05,
        clearcoat: 0.65,
        clearcoatRoughness: 0.2,
      }),
    ),
  );
  const cubieGeometry = own(
    new RoundedBoxGeometry(0.248, 0.248, 0.248, 3, 0.018),
  );
  const tile = own(new RoundedBoxGeometry(0.205, 0.205, 0.009, 3, 0.018));
  const cubies = solvedCubies().map((state) => {
    const group = new T.Group();
    cube.add(group);
    mesh(group, cubieGeometry, plastic, [0, 0, 0], [1, 1, 1]);
    state.home.forEach((side, axis) => {
      if (!side) return;
      const color = colors[axis * 2 + (side < 0 ? 1 : 0)];
      if (!color) return;
      const sticker = mesh(group, tile, color, [0, 0, 0], [1, 1, 1]);
      sticker.position.setComponent(axis, side * 0.126);
      if (axis === 0) sticker.rotation.y = (side * Math.PI) / 2;
      if (axis === 1) sticker.rotation.x = (-side * Math.PI) / 2;
      if (axis === 2 && side < 0) sticker.rotation.y = Math.PI;
      if (state.home.filter(Boolean).length === 1) {
        const mark = mesh(
          sticker,
          sphere,
          plastic,
          [0, 0, 0.008],
          [0.012, 0.012, 0.003],
        );
        mark.material = carbon;
      }
    });
    return group;
  });
  const tentacles = createTentacles(CUBE_POSITION, CUBE_ROTATION);
  root.add(tentacles.root);
  return {
    root,
    cube,
    cubies,
    tentacles,
    dispose: () => {
      tentacles.dispose();
      resources.forEach((resource) => resource.dispose());
    },
  };
}

function World({
  playback,
  scramble,
  solution,
  view,
  quality,
  reduced,
  onReady,
  capture,
}: Props) {
  const gltf = useLoader(GLTFLoader, OCTO_URL);
  const { gl, scene, camera, size } = useThree();
  const model = useMemo(() => {
    const clone = gltf.scene.clone(true);
    clone.traverse((object) => {
      if (object instanceof T.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
    return clone;
  }, [gltf]);
  const props = useMemo(createProps, []);
  const snapshots = useMemo(() => {
    let state = solvedCubies();
    for (const move of scramble) state = applyMove(state, move);
    const states = [state];
    for (const move of solution) {
      state = applyMove(state, move);
      states.push(state);
    }
    return states;
  }, [scramble, solution]);
  const controls = useRef<OrbitControls | null>(null);
  const movingCamera = useRef(true),
    viewTarget = useRef(new T.Vector3()),
    viewPosition = useRef(new T.Vector3());
  const head = useMemo(() => model.getObjectByName("OctoMantle"), [model]);
  const headRest = useMemo(
    () => head?.quaternion.clone() ?? new T.Quaternion(),
    [head],
  );
  const temp = useMemo(
    () => ({
      q: new T.Quaternion(),
      idle: new T.Quaternion(),
      euler: new T.Euler(),
    }),
    [],
  );
  useEffect(() => {
    const orbit = new OrbitControls(camera, gl.domElement);
    controls.current = orbit;
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.07;
    orbit.enablePan = false;
    orbit.minDistance = 2.7;
    orbit.maxDistance = 10;
    orbit.minPolarAngle = 0.35;
    orbit.maxPolarAngle = Math.PI * 0.49;
    orbit.enableZoom = false;
    orbit.touches.ONE = T.TOUCH.ROTATE;
    orbit.touches.TWO = T.TOUCH.DOLLY_ROTATE;
    const stop = () => {
      movingCamera.current = false;
    };
    orbit.addEventListener("start", stop);
    const pmrem = new T.PMREMGenerator(gl),
      room = new RoomEnvironment();
    const environment = pmrem.fromScene(room, 0.04);
    scene.environment = environment.texture;
    scene.environmentIntensity = 0.4;
    pmrem.dispose();
    room.dispose();
    onReady();
    capture.current = () => {
      const old = new T.Vector2();
      gl.getSize(old);
      const dpr = gl.getPixelRatio();
      try {
        const maxSize = gl.capabilities.maxTextureSize;
        const width = Math.min(
            3840,
            maxSize,
            Math.floor((maxSize * old.x) / old.y),
          ),
          height = Math.round((width * old.y) / old.x);
        gl.setPixelRatio(1);
        gl.setSize(width, height, false);
        gl.render(scene, camera);
        const a = document.createElement("a");
        a.download = "octos-cube-4k.png";
        a.href = gl.domElement.toDataURL("image/png");
        a.click();
      } finally {
        gl.setPixelRatio(dpr);
        gl.setSize(old.x, old.y, false);
      }
    };
    return () => {
      capture.current = null;
      orbit.dispose();
      controls.current = null;
      scene.environment = null;
      environment.dispose();
    };
  }, [camera, gl, scene, onReady, capture]);
  useEffect(() => () => props.dispose(), [props]);
  useEffect(() => {
    const narrow = size.width < 650;
    if (view === "closeup") {
      viewTarget.current.set(0, 1.15, 0.5);
      viewPosition.current.set(narrow ? 2.2 : 2.65, 2.75, narrow ? 5.7 : 5.2);
    } else {
      viewTarget.current.set(narrow ? 0 : -0.34, 1.05, 0.2);
      viewPosition.current.set(
        narrow ? 3.4 : 3,
        narrow ? 3 : 2.75,
        narrow ? 9.6 : 7.2,
      );
    }
    movingCamera.current = true;
  }, [view, size.width, size.height]);
  useEffect(() => {
    gl.setPixelRatio(
      Math.min(
        window.devicePixelRatio,
        quality ? (size.width < 650 ? 1.75 : 2) : 1,
      ),
    );
  }, [gl, quality, size.width]);
  useFrame((state, delta) => {
    const p = playback.current;
    if (p.playing) {
      p.time = Math.min(
        solution.length * MOVE_SECONDS,
        p.time + Math.min(delta, 0.06) * p.speed,
      );
      if (p.time === solution.length * MOVE_SECONDS) p.playing = false;
    }
    const index = Math.min(solution.length, Math.floor(p.time / MOVE_SECONDS));
    const fraction = (p.time / MOVE_SECONDS) % 1,
      move = solution[index],
      snapshot = snapshots[index];
    const turn = smooth((fraction - 0.18) / 0.64);
    temp.q.identity();
    if (move)
      temp.q.setFromAxisAngle(
        AXES[move.axis],
        ((move.turns * Math.PI) / 2) * turn,
      );
    if (snapshot)
      snapshot.forEach((cubie, i) => {
        const object = props.cubies[i];
        if (!object) return;
        object.position.set(...cubie.position).multiplyScalar(0.258);
        object.quaternion.set(...cubie.orientation);
        if (move && cubie.position[INDEX[move.axis]] === move.layer) {
          object.position.applyQuaternion(temp.q);
          object.quaternion.premultiply(temp.q);
        }
      });
    props.tentacles.update(
      move,
      fraction,
      turn,
      index,
      reduced ? 0 : Math.sin(state.clock.elapsedTime * 0.65),
    );
    if (head) {
      temp.idle.setFromEuler(
        temp.euler.set(
          reduced ? 0 : Math.sin(state.clock.elapsedTime * 0.65) * 0.012,
          reduced ? 0 : Math.sin(p.time * 0.8) * 0.025,
          reduced ? 0 : Math.sin(state.clock.elapsedTime * 0.45) * 0.012,
        ),
      );
      head.quaternion.copy(headRest).multiply(temp.idle);
    }

    if (controls.current) {
      if (movingCamera.current) {
        const blend = reduced ? 1 : 1 - Math.exp(-delta * 5);
        camera.position.lerp(viewPosition.current, blend);
        controls.current.target.lerp(viewTarget.current, blend);
        if (camera.position.distanceTo(viewPosition.current) < 0.005)
          movingCamera.current = false;
      }
      controls.current.update();
    }
  });
  return (
    <>
      <color attach="background" args={["#081b29"]} />
      <fog attach="fog" args={["#081b29", 10, 27]} />
      <ambientLight intensity={0.23} />
      <hemisphereLight args={["#add3e5", "#335469", 1.1]} />
      <directionalLight
        position={[-3, 6, 5]}
        intensity={2.65}
        color="#ffddbd"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={5}
        shadow-camera-bottom={-3}
        shadow-normalBias={0.03}
        shadow-bias={-0.0002}
      />
      <directionalLight position={[4, 3, -2]} intensity={3.8} color="#64cddd" />
      <directionalLight
        position={[-4, 2, -1]}
        intensity={2.2}
        color="#b5a3de"
      />
      <spotLight
        position={[1, 6, 1]}
        intensity={35}
        angle={0.6}
        penumbra={1}
        color="#b3ddeb"
      />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.24, 0]}
        receiveShadow
      >
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial
          color="#0b293b"
          roughness={0.52}
          metalness={0.3}
        />
      </mesh>
      <Water reduced={reduced} />
      <primitive object={props.root} />
      <primitive object={model} />
    </>
  );
}
export function CubeScene(props: Props) {
  return (
    <Canvas
      shadows
      camera={{ position: [3.8, 3, 8.5], fov: 35, near: 0.1, far: 100 }}
      dpr={[1, 2]}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      }}
      fallback={
        <span>
          A coral octopus holding a colorful cube. Use the playback controls to
          follow its solution.
        </span>
      }
      onCreated={({ gl }) => {
        gl.toneMapping = T.ACESFilmicToneMapping;
        gl.toneMappingExposure = 0.98;
        gl.shadowMap.type = T.PCFSoftShadowMap;
      }}
    >
      <Suspense fallback={null}>
        <World {...props} />
      </Suspense>
    </Canvas>
  );
}
