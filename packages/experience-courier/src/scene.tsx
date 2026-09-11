import { Suspense, useEffect, useMemo, useRef } from "react";
import {
  Canvas,
  useFrame,
  useLoader,
  useThree,
  type ThreeEvent,
} from "@react-three/fiber";
import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { Game, Point } from "./game";
import { STAMPS, STATIONS, heightAt } from "./game";
import {
  X,
  Z,
  batch,
  box,
  coreModel,
  createBridge,
  createLift,
  createLever,
  createWorld,
  cylinder,
  disposeTree,
  gear,
  mesh,
  palette,
} from "./world";
import courierUrl from "./assets/courier.glb?url";

type View = "map" | "follow";
interface SceneProps {
  game: Game;
  view: View;
  reduced: boolean;
  target: Point | null;
  onWalk: (point: Point) => void;
  onReady: () => void;
}
function World({ game, view, reduced, target, onWalk, onReady }: SceneProps) {
  const { scene, gl, size, camera } = useThree();
  const gltf = useLoader(GLTFLoader, courierUrl);
  const p = useMemo(palette, []);
  const scenery = useMemo(() => createWorld(p), [p]);
  const dynamic = useMemo(() => {
    const root = new T.Group();
    const bridge = createBridge(p);
    root.add(bridge);
    bridge.position.set(X(5), 0, Z(8));
    const turn = createBridge(p, true);
    root.add(turn);
    turn.position.set(X(10.5), 2, Z(2));
    const lift = createLift(p);
    root.add(lift);
    lift.position.set(X(8), 0, Z(5));
    const levers = [createLever(p), createLever(p)];
    levers.forEach((lever, i) => {
      const pos = i ? STATIONS.lockTurn : STATIONS.lockBridge;
      lever.root.position.set(X(pos[0]), i ? 2 : 0, Z(pos[1]));
      root.add(lever.root);
    });
    const core = coreModel(p);
    root.add(core);
    const actor = new T.Group();
    root.add(actor);
    actor.position.set(
      X(game.player[0]),
      heightAt(game.player, game) ?? 0,
      Z(game.player[1]),
    );
    const robot = gltf.scene.clone(true);
    actor.add(robot);
    robot.scale.setScalar(0.87);
    robot.traverse((o) => {
      if (o instanceof T.Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    const marker = mesh(
      new T.RingGeometry(0.31, 0.37, 32),
      new T.MeshBasicMaterial({
        color: "#355f58",
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
        side: T.DoubleSide,
      }),
      actor,
      0,
      0.035,
      0,
    );
    marker.rotation.x = -Math.PI / 2;
    const head = robot.getObjectByName("Head"),
      armL = robot.getObjectByName("ArmL"),
      armR = robot.getObjectByName("ArmR"),
      legL = robot.getObjectByName("LegL"),
      legR = robot.getObjectByName("LegR");
    const stamps = STAMPS.map(([x, z], i) => {
      const s = new T.Group();
      s.position.set(X(x), i === 2 ? 2.65 : 0.65, Z(z));
      root.add(s);
      box(s, p.brass, 0, 0, 0, 0.33, 0.42, 0.055, 0.035);
      box(s, p.cream, 0, 0, 0.035, 0.25, 0.33, 0.025, 0.015);
      const seal = mesh(
        new T.CircleGeometry(0.08, 5),
        p.orange,
        s,
        0,
        0,
        0.053,
      );
      seal.rotation.z = 0.3;
      for (let j = 0; j < 4; j++)
        for (const side of [-1, 1])
          cylinder(
            s,
            p.cream,
            side * 0.165,
            (j - 1.5) * 0.105,
            0,
            0.022,
            0.064,
          ).rotation.x = Math.PI / 2;
      batch(s);
      return s;
    });
    const gears = [
      gear(root, p, 0.38),
      gear(root, p, 0.28),
      gear(root, p, 0.34),
    ];
    gears[0]?.position.set(X(4.55), -0.34, Z(8));
    gears[1]?.position.set(X(10.6), 1.7, Z(2));
    gears[2]?.position.set(X(8), 1, Z(4.72));
    if (gears[2]) gears[2].rotation.x = Math.PI / 2;
    const windmill = new T.Group();
    windmill.position.set(X(10.75), 1.36, Z(8.89));
    root.add(windmill);
    for (let i = 0; i < 4; i++) {
      const blade = new T.Group();
      blade.rotation.z = (i * Math.PI) / 2;
      windmill.add(blade);
      box(blade, p.brass, 0, 0.39, 0, 0.045, 0.78, 0.04);
      box(blade, p.cream, 0.09, 0.49, 0, 0.21, 0.43, 0.06, 0.018);
    }
    const center = cylinder(windmill, p.brass, 0, 0, 0.08, 0.1, 0.18);
    center.rotation.x = Math.PI / 2;
    batch(windmill);
    const clouds = new T.Group();
    root.add(clouds);
    const cloudMaterial = new T.MeshBasicMaterial({
      color: "#f8f3e5",
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    });
    const puffs = new T.InstancedMesh(
      new T.SphereGeometry(1, 20, 12),
      cloudMaterial,
      30,
    );
    const dummy = new T.Object3D();
    for (let i = 0; i < 10; i++)
      for (let j = 0; j < 3; j++) {
        const x = Math.sin(i * 5.37) * 18,
          z = Math.cos(i * 7.21) * 14,
          y = -4.7 - (i % 3) * 0.9;
        dummy.position.set(
          x + (j - 1) * 1.15,
          y + (j === 1 ? 0.2 : 0),
          z + (j % 2) * 0.25,
        );
        dummy.scale.set(1.45 + (i % 3) * 0.2, 0.45 + (j === 1 ? 0.15 : 0), 1.1);
        dummy.updateMatrix();
        puffs.setMatrixAt(i * 3 + j, dummy.matrix);
      }
    puffs.instanceMatrix.needsUpdate = true;
    clouds.add(puffs);
    const goalRing = mesh(
      new T.RingGeometry(0.43, 0.47, 48),
      new T.MeshBasicMaterial({
        color: "#c96b35",
        transparent: true,
        opacity: 0.65,
        side: T.DoubleSide,
        depthWrite: false,
      }),
      root,
    );
    goalRing.rotation.x = -Math.PI / 2;
    const destination = mesh(
      new T.RingGeometry(0.18, 0.23, 32),
      new T.MeshBasicMaterial({
        color: "#326b64",
        transparent: true,
        opacity: 0.8,
        side: T.DoubleSide,
        depthWrite: false,
      }),
      root,
    );
    destination.rotation.x = -Math.PI / 2;
    const beaconLight = new T.PointLight("#ffbd66", 0, 13, 2);
    beaconLight.position.set(X(14.5), 5.3, Z(0.8));
    root.add(beaconLight);
    const halo = mesh(
      new T.SphereGeometry(0.57, 24, 16),
      new T.MeshBasicMaterial({
        color: "#ffdf97",
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
      root,
      X(14.5),
      5.3,
      Z(0.8),
    );
    const beams = new T.Group();
    beams.position.copy(beaconLight.position);
    root.add(beams);
    const beamMat = new T.ShaderMaterial({
      uniforms: { strength: { value: 0 } },
      transparent: true,
      side: T.DoubleSide,
      depthWrite: false,
      vertexShader: `varying vec2 vUv; varying vec3 vWorld; varying vec3 vNormal;
        void main(){vUv=uv;vWorld=(modelMatrix*vec4(position,1.)).xyz;vNormal=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}`,
      fragmentShader: `uniform float strength; varying vec2 vUv; varying vec3 vWorld; varying vec3 vNormal;
        void main(){float edge=pow(abs(dot(normalize(vNormal),normalize(cameraPosition-vWorld))),1.4);
        float fade=pow(vUv.y,1.8);gl_FragColor=vec4(1.,.79,.38,strength*edge*fade);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        }`,
    });
    for (const side of [-1, 1]) {
      const beam = mesh(
        new T.ConeGeometry(1.2, 8, 32, 1, true),
        beamMat,
        beams,
        side * 4,
        0,
        0,
      );
      beam.rotation.z = (side * Math.PI) / 2;
    }
    const particles = new T.Group();
    root.add(particles);
    for (let i = 0; i < 28; i++) {
      const item = mesh(
        new T.PlaneGeometry(0.07, 0.11),
        i % 2 ? p.brass : p.orange,
        particles,
      );
      item.position.set(
        Math.sin(i * 14) * 5,
        3 + (i % 7) * 0.4,
        Math.cos(i * 8) * 4,
      );
      item.rotation.set(i, 0, i);
    }
    particles.visible = false;
    // Decorative overlays must not intercept walkway picking or cast solid shadows.
    for (const decoration of [
      clouds,
      marker,
      goalRing,
      destination,
      halo,
      beams,
      particles,
    ]) {
      decoration.traverse((object) => {
        object.raycast = () => undefined;
        object.castShadow = false;
      });
    }
    return {
      root,
      bridge,
      turn,
      lift,
      levers,
      core,
      actor,
      robot,
      head,
      armL,
      armR,
      legL,
      legR,
      stamps,
      gears,
      windmill,
      clouds,
      goalRing,
      destination,
      beaconLight,
      halo,
      beams,
      beamMat,
      particles,
    };
    // Initial positions are animated from here; game changes must not rebuild assets.
  }, [p, gltf]);
  const focus = useRef(new T.Vector3(0, 1, 0));
  const scratch = useMemo(
    () => ({ focus: new T.Vector3(), offset: new T.Vector3(16, 22, 26) }),
    [],
  );
  const heading = useRef(Math.PI / 4);
  const elapsed = useRef(0);
  const previous = useRef<Point>(game.player);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const hover = useRef<T.Mesh>(null);
  useEffect(() => {
    const generator = new T.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const env = generator.fromScene(room, 0.04);
    scene.environment = env.texture;
    scene.environmentIntensity = 0.35;
    room.dispose();
    generator.dispose();
    const anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    scenery.traverse((object) => {
      if (!(object instanceof T.Mesh)) return;
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      for (const material of materials) {
        if ("map" in material && material.map instanceof T.Texture) {
          material.map.anisotropy = anisotropy;
          material.map.needsUpdate = true;
        }
      }
    });
    onReady();
    return () => {
      scene.environment = null;
      env.dispose();
    };
  }, [gl, scene, scenery, onReady]);
  useEffect(
    () => () => {
      disposeTree(scenery);
      // The loader owns cached GLTF geometry and materials across route visits.
      dynamic.actor.remove(dynamic.robot);
      disposeTree(dynamic.root);
      dynamic.actor.add(dynamic.robot);
    },
    [scenery, dynamic],
  );
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05),
      active = game.phase !== "paused";
    if (!active) return;
    elapsed.current += dt;
    const t = elapsed.current;
    const a = reduced ? 1 : 1 - Math.exp(-dt * 14);
    const y = heightAt(game.player, game) ?? 0;
    const tx = X(game.player[0]),
      tz = Z(game.player[1]);
    const dist = Math.hypot(
      tx - dynamic.actor.position.x,
      tz - dynamic.actor.position.z,
    );
    if (
      previous.current[0] !== game.player[0] ||
      previous.current[1] !== game.player[1]
    ) {
      heading.current = Math.atan2(
        game.player[0] - previous.current[0],
        game.player[1] - previous.current[1],
      );
      previous.current = game.player;
    }
    if (active) {
      dynamic.actor.position.x = T.MathUtils.lerp(
        dynamic.actor.position.x,
        tx,
        a,
      );
      dynamic.actor.position.z = T.MathUtils.lerp(
        dynamic.actor.position.z,
        tz,
        a,
      );
      dynamic.actor.position.y = T.MathUtils.lerp(
        dynamic.actor.position.y,
        y,
        reduced ? 1 : a * 0.65,
      );
      const delta =
        T.MathUtils.euclideanModulo(
          heading.current - dynamic.robot.rotation.y + Math.PI,
          Math.PI * 2,
        ) - Math.PI;
      dynamic.robot.rotation.y += delta * a;
      const walk = Math.min(1, dist * 4),
        swing = reduced ? 0 : Math.sin(t * 19) * walk;
      dynamic.robot.position.y = reduced
        ? 0
        : Math.abs(Math.sin(t * 19)) * 0.025 * walk;
      if (dynamic.legL) dynamic.legL.rotation.x = swing * 0.42;
      if (dynamic.legR) dynamic.legR.rotation.x = -swing * 0.42;
      if (dynamic.armL) dynamic.armL.rotation.x = -swing * 0.3;
      if (dynamic.armR) dynamic.armR.rotation.x = swing * 0.3;
      if (dynamic.head)
        dynamic.head.rotation.z = reduced
          ? 0
          : Math.sin(t * 1.8) * 0.025 * (1 - walk);
    }
    dynamic.levers.forEach((lever, i) => {
      const locked = i ? game.turnLocked : game.bridgeLocked;
      lever.arm.rotation.x = T.MathUtils.lerp(
        lever.arm.rotation.x,
        locked ? -1 : 0.35,
        reduced ? 1 : a * 0.4,
      );
      lever.lamp.material = locked ? p.teal : p.orange;
    });
    const open = game.bridgeLocked || game.core === "bridge";
    dynamic.bridge.rotation.z = T.MathUtils.lerp(
      dynamic.bridge.rotation.z,
      open ? 0 : Math.PI * 0.46,
      reduced ? 1 : a * 0.45,
    );
    dynamic.bridge.position.y = T.MathUtils.lerp(
      dynamic.bridge.position.y,
      open ? 0 : 0.48,
      reduced ? 1 : a * 0.45,
    );
    const angle = game.turnLocked
      ? 0
      : game.core === "turntable"
        ? ((game.turn - 2) * Math.PI) / 2
        : -Math.PI;
    dynamic.turn.rotation.y = T.MathUtils.lerp(
      dynamic.turn.rotation.y,
      angle,
      reduced ? 1 : a * 0.5,
    );
    dynamic.lift.position.y = T.MathUtils.lerp(
      dynamic.lift.position.y,
      game.liftHigh ? 2 : 0,
      reduced ? 1 : a * 0.65,
    );
    let cx = tx,
      cz = tz,
      cy = y + 0.99;
    if (game.core === "carried") {
      const yaw = dynamic.robot.rotation.y;
      cx = dynamic.actor.position.x - Math.sin(yaw) * 0.29;
      cz = dynamic.actor.position.z - Math.cos(yaw) * 0.29;
      cy = dynamic.actor.position.y + 0.85;
    } else {
      const station =
        game.core === "ground"
          ? STATIONS.parcel
          : game.core === "bridge"
            ? STATIONS.bridge
            : game.core === "lift"
              ? STATIONS.lift
              : game.core === "turntable"
                ? STATIONS.turntable
                : STATIONS.beacon;
      cx = X(station[0]);
      cz = Z(station[1]);
      cy =
        (game.core === "lift"
          ? dynamic.lift.position.y
          : station[1] < 5
            ? 2
            : 0) + 0.51;
    }
    dynamic.core.position.set(cx, cy, cz);
    dynamic.core.rotation.y =
      game.core === "carried"
        ? dynamic.robot.rotation.y
        : reduced
          ? 0
          : t * 0.4;
    for (const [i, stamp] of dynamic.stamps.entries()) {
      stamp.visible = !game.stamps.includes(i);
      stamp.rotation.y = reduced ? 0 : Math.sin(t * 0.8) * 0.35;
      stamp.position.y =
        (i === 2 ? 2 : 0) + 0.65 + (reduced ? 0 : Math.sin(t * 2 + i) * 0.06);
    }
    if (!reduced && active) {
      dynamic.windmill.rotation.z = t * 0.38;
      dynamic.gears.forEach((g, i) => {
        g.rotation.y = t * (i % 2 ? -1 : 1) * 0.2;
      });
      dynamic.clouds.position.x = Math.sin(t * 0.025) * 0.55;
    }
    let goal: Point = STATIONS.parcel;
    if (game.core === "ground") goal = STATIONS.parcel;
    else if (!game.bridgeLocked)
      goal = game.core === "bridge" ? STATIONS.lockBridge : STATIONS.bridge;
    else if (game.core === "bridge") goal = STATIONS.bridge;
    else if (!game.liftHigh || game.core === "lift") goal = STATIONS.lift;
    else if (!game.turnLocked)
      goal =
        game.core === "turntable" && game.turn === 2
          ? STATIONS.lockTurn
          : STATIONS.turntable;
    else
      goal = game.core === "turntable" ? STATIONS.turntable : STATIONS.beacon;
    dynamic.goalRing.position.set(
      X(goal[0]),
      (heightAt(goal, game) ?? 0) + 0.11,
      Z(goal[1]),
    );
    dynamic.goalRing.scale.setScalar(
      reduced ? 1 : 1 + Math.sin(t * 2.4) * 0.08,
    );
    dynamic.goalRing.visible = game.phase === "playing";
    dynamic.destination.visible = Boolean(target) && game.phase === "playing";
    if (target)
      dynamic.destination.position.set(
        X(target[0]),
        (heightAt(target, game) ?? 0) + 0.1,
        Z(target[1]),
      );
    const won = game.phase === "won";
    dynamic.beaconLight.intensity = T.MathUtils.lerp(
      dynamic.beaconLight.intensity,
      won ? 15 : 0,
      reduced ? 1 : a * 0.3,
    );
    (dynamic.halo.material as T.MeshBasicMaterial).opacity = won ? 0.65 : 0;
    const strength = dynamic.beamMat.uniforms.strength;
    if (strength)
      strength.value = T.MathUtils.lerp(
        strength.value as number,
        won ? 0.23 : 0,
        reduced ? 1 : a * 0.3,
      );
    if (!reduced) dynamic.beams.rotation.y = t * 0.35;
    dynamic.particles.visible = won && !reduced;
    if (won && !reduced)
      dynamic.particles.children.forEach((o, i) => {
        o.position.y = 2 + ((t * 0.4 + i * 0.21) % 4);
        o.rotation.z = t + i;
      });
    const overview = view === "map" || game.phase === "ready" || won;
    const targetFocus = overview
      ? scratch.focus.set(0, 0.8, 0)
      : scratch.focus.set(
          dynamic.actor.position.x,
          dynamic.actor.position.y + 0.7,
          dynamic.actor.position.z - 0.25,
        );
    focus.current.lerp(targetFocus, reduced ? 1 : 1 - Math.exp(-dt * 3));
    camera.position.copy(focus.current).add(scratch.offset);
    camera.lookAt(focus.current);
    if (camera instanceof T.OrthographicCamera) {
      const zoom = overview
        ? Math.min(size.width / 19.7, size.height / 13.8)
        : Math.min(size.width / 8, size.height / 7.8);
      camera.left = -size.width / 2;
      camera.right = size.width / 2;
      camera.top = size.height / 2;
      camera.bottom = -size.height / 2;
      camera.zoom = T.MathUtils.lerp(
        camera.zoom,
        zoom,
        reduced ? 1 : 1 - Math.exp(-dt * 4),
      );
      camera.updateProjectionMatrix();
    }
  });
  const tileAt = (e: ThreeEvent<PointerEvent>): Point => [
    Math.round(e.point.x + 7.5),
    Math.round(e.point.z + 5.5),
  ];
  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (!hover.current) return;
    const pt = tileAt(e),
      y = heightAt(pt, game);
    hover.current.visible = y !== null && game.phase === "playing";
    if (y !== null) hover.current.position.set(X(pt[0]), y + 0.085, Z(pt[1]));
  };
  return (
    <>
      <hemisphereLight args={["#e1e7f1", "#b8a58e", 1.4]} />
      <directionalLight
        position={[-10, 18, 9]}
        color="#ffe2b9"
        intensity={2.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
        shadow-camera-near={1}
        shadow-camera-far={60}
        shadow-normalBias={0.045}
        shadow-bias={-0.0002}
      />
      <directionalLight
        position={[10, 9, -12]}
        color="#bcd9e0"
        intensity={1.0}
      />
      <group
        onPointerDown={(e) => {
          e.stopPropagation();
          pointer.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={(e) => {
          e.stopPropagation();
          if (
            pointer.current &&
            Math.hypot(
              e.clientX - pointer.current.x,
              e.clientY - pointer.current.y,
            ) < 9
          )
            onWalk(tileAt(e));
          pointer.current = null;
        }}
        onPointerMove={onPointerMove}
        onPointerLeave={() => {
          if (hover.current) hover.current.visible = false;
          pointer.current = null;
        }}
      >
        <primitive object={scenery} />
        <primitive object={dynamic.root} />
      </group>
      <mesh
        ref={hover}
        raycast={() => undefined}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={false}
      >
        <planeGeometry args={[0.88, 0.88]} />
        <meshBasicMaterial
          color="#d8a35f"
          transparent
          opacity={0.24}
          depthWrite={false}
          side={T.DoubleSide}
        />
      </mesh>
    </>
  );
}
export function CourierScene(props: SceneProps) {
  return (
    <Canvas
      orthographic
      frameloop={
        props.reduced || props.game.phase === "paused" ? "demand" : "always"
      }
      camera={{ position: [16, 22, 26], zoom: 35, near: 0.1, far: 120 }}
      dpr={[1, 2]}
      shadows
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = T.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1;
      }}
      fallback={
        <div className="courier-canvas-fallback">
          This little world needs WebGL. Please open it in a browser with
          hardware acceleration enabled.
        </div>
      }
    >
      <Suspense fallback={null}>
        <World {...props} />
      </Suspense>
    </Canvas>
  );
}
