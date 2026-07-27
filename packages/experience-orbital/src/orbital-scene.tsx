import { Line, OrbitControls } from "@react-three/drei";
import { type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Helios, Nyx, Pelagos } from "./celestial-bodies";
import { BODIES, LAUNCH_POINT } from "./space-config";
import { SpaceEnvironment, SpacePostprocessing } from "./space-environment";

export type FlightPhase = "ready" | "aiming" | "flying" | "crashed" | "complete";
export type CameraMode = "overview" | "chase";

export interface MissionSnapshot {
  phase: FlightPhase;
  assists: number;
  score: number;
  combo: number;
  speed: number;
}

export interface SceneCommand {
  id: number;
  type: "launch" | "retry" | "reset";
}

interface OrbitalSceneProps {
  command: SceneCommand;
  cameraMode: CameraMode;
  reducedMotion: boolean;
  onSnapshot: (snapshot: MissionSnapshot) => void;
  onTrajectoryState: (state: TrajectoryState | null) => void;
}

const MAX_PULL = 2.65;
const LAUNCH_POWER = 2.65;
const GRAVITY = 0.82;
const SIMULATION_STEP = 1 / 120;
const ASSIST_RANGES = [2.35, 1.45, 1.72] as const;
const PROBE_FORWARD = new THREE.Vector3(0, 0, 1);
const TMP_ACCELERATION = new THREE.Vector3();
const TMP_DELTA = new THREE.Vector3();

function applyGravity(position: THREE.Vector3, velocity: THREE.Vector3, step: number) {
  TMP_ACCELERATION.set(0, 0, 0);
  for (const body of BODIES) {
    TMP_DELTA.copy(body.position).sub(position);
    const distanceSquared = Math.max(TMP_DELTA.lengthSq(), 0.48);
    const force = (GRAVITY * body.mass) / Math.pow(distanceSquared, 1.5);
    TMP_ACCELERATION.addScaledVector(TMP_DELTA, force);
  }
  velocity.addScaledVector(TMP_ACCELERATION, step);
  position.addScaledVector(velocity, step);
}

function predictOrbit(position: THREE.Vector3, velocity: THREE.Vector3) {
  const nextPosition = position.clone();
  const nextVelocity = velocity.clone();
  const points: [number, number, number][] = [];
  for (let index = 0; index < 190; index += 1) {
    applyGravity(nextPosition, nextVelocity, 0.025);
    if (index % 2 === 0) points.push([nextPosition.x, nextPosition.y, nextPosition.z]);
    if (BODIES.some((body) => nextPosition.distanceTo(body.position) < body.radius)) break;
    if (nextPosition.length() > 17) break;
  }
  return points;
}

export type TrajectoryState = "safe" | "assist" | "danger";

function assessTrajectory(points: [number, number, number][]) {
  let state: TrajectoryState = "safe";
  const marker = new THREE.Vector3();
  let hasMarker = false;
  let closestClearance = Number.POSITIVE_INFINITY;
  const point = new THREE.Vector3();
  for (const coordinates of points) {
    point.set(...coordinates);
    BODIES.forEach((body, index) => {
      const distance = point.distanceTo(body.position);
      const clearance = distance - body.radius;
      if (clearance < closestClearance) {
        closestClearance = clearance;
        marker.copy(point);
        hasMarker = true;
      }
      if (distance < body.radius + 0.16) {
        state = "danger";
      } else if (state !== "danger" && distance < (ASSIST_RANGES[index] ?? ASSIST_RANGES[0])) {
        state = "assist";
      }
    });
  }
  return { state, marker: hasMarker ? marker : null };
}

const TRAJECTORY_COLORS: Record<TrajectoryState, string> = {
  safe: "#9adfff",
  assist: "#70efb5",
  danger: "#ff714d",
};

function LaunchVector({ from, to, reducedMotion }: { from: THREE.Vector3; to: THREE.Vector3; reducedMotion: boolean }) {
  const pulses = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const pulseCount = 7;
  useFrame(({ clock }) => {
    if (!pulses.current) return;
    for (let index = 0; index < pulseCount; index += 1) {
      const travel = reducedMotion ? index / pulseCount : (index / pulseCount + clock.elapsedTime * 0.7) % 1;
      dummy.position.lerpVectors(to, from, travel);
      dummy.scale.setScalar(0.025 + Math.sin(travel * Math.PI) * 0.035);
      dummy.updateMatrix();
      pulses.current.setMatrixAt(index, dummy.matrix);
    }
    pulses.current.instanceMatrix.needsUpdate = true;
  });
  const points = useMemo<[number, number, number][]>(() => [from.toArray(), to.toArray()], [from, to]);

  return (
    <>
      <Line points={points} color="#ffbd55" lineWidth={5.5} transparent opacity={0.12} />
      <Line
        points={points}
        color="#ffe0a0"
        lineWidth={1.8}
        dashed
        dashSize={0.11}
        gapSize={0.07}
        transparent
        opacity={0.86}
      />
      <instancedMesh ref={pulses} args={[undefined, undefined, pulseCount]} frustumCulled={false}>
        <sphereGeometry args={[1, 10, 10]} />
        <meshBasicMaterial
          color="#fff0bd"
          transparent
          opacity={0.72}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>
    </>
  );
}

function TrajectoryMarker({ position, state, reducedMotion }: { position: THREE.Vector3; state: TrajectoryState; reducedMotion: boolean }) {
  const marker = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!marker.current) return;
    const pulse = reducedMotion ? 1 : 1 + Math.sin(clock.elapsedTime * 5.5) * 0.22;
    marker.current.scale.setScalar(pulse);
    marker.current.rotation.y = reducedMotion ? 0.4 : clock.elapsedTime * 0.8;
  });
  return (
    <group ref={marker} position={position}>
      <mesh rotation={[Math.PI / 4, 0, Math.PI / 4]}>
        <octahedronGeometry args={[0.13, 0]} />
        <meshBasicMaterial
          color={TRAJECTORY_COLORS[state]}
          transparent
          opacity={0.42}
          wireframe
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <pointLight color={TRAJECTORY_COLORS[state]} intensity={0.8} distance={0.75} />
    </group>
  );
}

function GhostProbe({ points, color }: { points: [number, number, number][]; color: string }) {
  const { position, quaternion } = useMemo(() => {
    const end = new THREE.Vector3(...(points.at(-1) ?? [0, 0, 0]));
    const previous = new THREE.Vector3(...(points.at(-2) ?? points.at(-1) ?? [0, 0, 0]));
    const direction = end.clone().sub(previous).normalize();
    return {
      position: end,
      quaternion: new THREE.Quaternion().setFromUnitVectors(PROBE_FORWARD, direction),
    };
  }, [points]);
  return (
    <group position={position} quaternion={quaternion} scale={0.72}>
      <mesh>
        <boxGeometry args={[0.22, 0.16, 0.34]} />
        <meshBasicMaterial color={color} transparent opacity={0.2} wireframe depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[-0.3, 0, 0]}>
        <boxGeometry args={[0.42, 0.015, 0.18]} />
        <meshBasicMaterial color={color} transparent opacity={0.18} wireframe depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0.3, 0, 0]}>
        <boxGeometry args={[0.42, 0.015, 0.18]} />
        <meshBasicMaterial color={color} transparent opacity={0.18} wireframe depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

function TrajectoryPreview({ points, reducedMotion }: { points: [number, number, number][]; reducedMotion: boolean }) {
  const particles = useRef<THREE.InstancedMesh>(null);
  const { camera } = useThree();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const curve = useMemo(
    () => new THREE.CatmullRomCurve3(points.map((coordinates) => new THREE.Vector3(...coordinates))),
    [points],
  );
  const assessment = useMemo(() => assessTrajectory(points), [points]);
  const color = TRAJECTORY_COLORS[assessment.state];
  const particleCount = Math.min(52, Math.max(20, points.length));
  useFrame(({ clock }) => {
    if (!particles.current) return;
    for (let index = 0; index < particleCount; index += 1) {
      const progress = reducedMotion ? index / particleCount : (index / particleCount + clock.elapsedTime * 0.16) % 1;
      curve.getPointAt(progress, dummy.position);
      const depthScale = THREE.MathUtils.clamp(camera.position.distanceTo(dummy.position) * 0.0045, 0.026, 0.075);
      const wave = 0.58 + Math.sin(progress * Math.PI) * 0.42;
      dummy.scale.setScalar(depthScale * wave);
      dummy.updateMatrix();
      particles.current.setMatrixAt(index, dummy.matrix);
    }
    particles.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <Line points={points} color={color} lineWidth={4.5} transparent opacity={0.1} />
      <Line
        points={points}
        color={color}
        lineWidth={1.35}
        dashed
        dashSize={0.1}
        gapSize={0.075}
        transparent
        opacity={0.58}
      />
      <instancedMesh ref={particles} args={[undefined, undefined, particleCount]} frustumCulled={false}>
        <sphereGeometry args={[1, 10, 10]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.68}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>
      {assessment.marker ? <TrajectoryMarker position={assessment.marker} state={assessment.state} reducedMotion={reducedMotion} /> : null}
      <GhostProbe points={points} color={color} />
    </>
  );
}

function IonDrive({ reducedMotion }: { reducedMotion: boolean }) {
  const outerPlume = useRef<THREE.Mesh>(null);
  const innerPlume = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const pulse = reducedMotion ? 1 : 1 + Math.sin(clock.elapsedTime * 17) * 0.09;
    if (outerPlume.current) outerPlume.current.scale.set(1, pulse, 1);
    if (innerPlume.current) innerPlume.current.scale.set(1, 1 / pulse, 1);
  });

  return (
    <group position={[0, 0, -0.51]} rotation={[-Math.PI / 2, 0, 0]}>
      <pointLight color="#70cfff" intensity={2.2} distance={2.4} />
      <mesh ref={outerPlume}>
        <coneGeometry args={[0.12, 0.72, 20, 1, true]} />
        <meshBasicMaterial
          color="#3caeff"
          transparent
          opacity={0.24}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={innerPlume}>
        <coneGeometry args={[0.055, 0.55, 16, 1, true]} />
        <meshBasicMaterial
          color="#dff8ff"
          transparent
          opacity={0.72}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function AttitudeThrusters({ active, reducedMotion }: { active: boolean; reducedMotion: boolean }) {
  const jets = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!jets.current) return;
    const pulse = active && !reducedMotion ? Math.max(0.18, Math.sin(clock.elapsedTime * 4.7) * 1.2) : 0.18;
    jets.current.scale.setScalar(pulse);
  });
  return (
    <group ref={jets} visible={active}>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.25, 0.12, -0.14]} rotation={[0, 0, side * -Math.PI / 2]}>
          <mesh>
            <coneGeometry args={[0.026, 0.16, 10, 1, true]} />
            <meshBasicMaterial
              color="#a8e9ff"
              transparent
              opacity={0.55}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              side={THREE.DoubleSide}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function DeepSpaceProbe({ active, reducedMotion }: { active: boolean; reducedMotion: boolean }) {
  const antenna = useRef<THREE.Group>(null);
  const dishProfile = useMemo(
    () => [new THREE.Vector2(0.025, 0), new THREE.Vector2(0.14, 0.012), new THREE.Vector2(0.29, 0.105)],
    [],
  );
  useFrame(({ clock }) => {
    if (antenna.current && active && !reducedMotion) antenna.current.rotation.z = Math.sin(clock.elapsedTime * 0.38) * 0.08;
  });

  return (
    <group scale={1.55}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.35, 0.28, 0.42]} />
        <meshStandardMaterial color="#bb792b" metalness={0.72} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0, 0.225]} castShadow>
        <boxGeometry args={[0.29, 0.23, 0.04]} />
        <meshPhysicalMaterial color="#e2ad55" metalness={0.85} roughness={0.34} clearcoat={0.26} />
      </mesh>
      <mesh position={[0, 0, -0.27]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.11, 0.15, 0.16, 20]} />
        <meshStandardMaterial color="#252b34" metalness={0.92} roughness={0.24} />
      </mesh>

      {[-0.51, 0.51].map((x) => (
        <group key={x} position={[x, 0, -0.02]}>
          <mesh position={[-Math.sign(x) * 0.24, 0, 0]}>
            <boxGeometry args={[0.17, 0.035, 0.055]} />
            <meshStandardMaterial color="#a9adb4" metalness={0.82} roughness={0.3} />
          </mesh>
          <mesh castShadow>
            <boxGeometry args={[0.78, 0.026, 0.31]} />
            <meshPhysicalMaterial color="#0a3264" metalness={0.48} roughness={0.28} clearcoat={0.8} />
          </mesh>
          {[-0.22, 0, 0.22].map((offset) => (
            <mesh key={offset} position={[offset, 0.017, 0]}>
              <boxGeometry args={[0.009, 0.004, 0.3]} />
              <meshBasicMaterial color="#76baf0" toneMapped={false} />
            </mesh>
          ))}
          {[-0.095, 0.095].map((offset) => (
            <mesh key={offset} position={[0, 0.018, offset]}>
              <boxGeometry args={[0.77, 0.004, 0.008]} />
              <meshBasicMaterial color="#4b86b8" toneMapped={false} />
            </mesh>
          ))}
        </group>
      ))}

      <group ref={antenna} position={[0, 0.16, 0.16]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} castShadow>
          <latheGeometry args={[dishProfile, 48]} />
          <meshPhysicalMaterial
            color="#e9e5d9"
            metalness={0.86}
            roughness={0.24}
            clearcoat={0.45}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh position={[0, 0, -0.19]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.26, 10]} />
          <meshStandardMaterial color="#696f77" metalness={0.9} roughness={0.24} />
        </mesh>
        <mesh position={[0, 0, -0.34]}>
          <sphereGeometry args={[0.035, 12, 12]} />
          <meshStandardMaterial color="#d4ab5c" metalness={0.85} roughness={0.28} />
        </mesh>
      </group>

      <group position={[0, -0.2, -0.03]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.018, 0.018, 0.44, 10]} />
          <meshStandardMaterial color="#9499a2" metalness={0.86} roughness={0.3} />
        </mesh>
        <mesh position={[0.27, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.055, 0.075, 0.16, 16]} />
          <meshStandardMaterial color="#353b46" metalness={0.88} roughness={0.3} />
        </mesh>
      </group>

      <mesh position={[0.13, 0.16, -0.04]}>
        <sphereGeometry args={[0.055, 14, 14]} />
        <meshPhysicalMaterial color="#75b9df" metalness={0.3} roughness={0.18} transmission={0.18} />
      </mesh>
      <AttitudeThrusters active={active} reducedMotion={reducedMotion} />
      {active ? <IonDrive reducedMotion={reducedMotion} /> : (
        <group>
          <pointLight color="#b8ddff" intensity={0.75} distance={1.2} />
          <mesh position={[0, 0, -0.37]}>
            <circleGeometry args={[0.075, 18]} />
            <meshBasicMaterial color="#7fcfff" transparent opacity={0.42} toneMapped={false} />
          </mesh>
        </group>
      )}
    </group>
  );
}

export function OrbitalScene({ command, cameraMode, reducedMotion, onSnapshot, onTrajectoryState }: OrbitalSceneProps) {
  const probe = useRef<THREE.Group>(null);
  const trail = useRef<THREE.InstancedMesh>(null);
  const { camera, size } = useThree();
  const phase = useRef<FlightPhase>("ready");
  const position = useRef(LAUNCH_POINT.clone());
  const velocity = useRef(new THREE.Vector3());
  const accumulator = useRef(0);
  const collected = useRef(new Set<number>());
  const score = useRef(0);
  const combo = useRef(0);
  const lastTelemetry = useRef(0);
  const trailPoints = useRef<THREE.Vector3[]>(Array.from({ length: 92 }, () => LAUNCH_POINT.clone()));
  const trailTimer = useRef(0);
  const dragPointerId = useRef<number | null>(null);
  const dragPlane = useRef(new THREE.Plane());
  const [renderPhase, setRenderPhase] = useState<FlightPhase>("ready");
  const [probeHovered, setProbeHovered] = useState(false);
  const [dragPoint, setDragPoint] = useState(LAUNCH_POINT.clone());
  const [prediction, setPrediction] = useState<[number, number, number][]>([]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const cameraDirection = useMemo(() => new THREE.Vector3(), []);
  const probeDirection = useMemo(() => new THREE.Vector3(), []);
  const probeQuaternion = useMemo(() => new THREE.Quaternion(), []);
  const chaseDirection = useMemo(() => new THREE.Vector3(), []);
  const chasePosition = useMemo(() => new THREE.Vector3(), []);
  const chaseOffset = useMemo(() => new THREE.Vector3(), []);
  const chaseTarget = useMemo(() => new THREE.Vector3(), []);

  const publish = useCallback(
    (nextPhase = phase.current) => {
      onSnapshot({
        phase: nextPhase,
        assists: collected.current.size,
        score: score.current,
        combo: combo.current,
        speed: velocity.current.length(),
      });
    },
    [onSnapshot],
  );

  const setPhase = useCallback((nextPhase: FlightPhase) => {
    phase.current = nextPhase;
    setRenderPhase(nextPhase);
  }, []);

  const returnToLaunch = useCallback(
    (clearProgress: boolean) => {
      setPhase("ready");
      position.current.copy(LAUNCH_POINT);
      velocity.current.set(0, 0, 0);
      setDragPoint(LAUNCH_POINT.clone());
      setPrediction([]);
      onTrajectoryState(null);
      trailPoints.current.forEach((point) => point.copy(LAUNCH_POINT));
      if (clearProgress) {
        collected.current.clear();
        score.current = 0;
        combo.current = 0;
      }
      publish("ready");
    },
    [onTrajectoryState, publish, setPhase],
  );

  useEffect(() => {
    if (cameraMode !== "overview") return;
    const target = size.width < 760 ? new THREE.Vector3(0.9, -0.15, -0.35) : new THREE.Vector3(0, 0, -0.6);
    const cameraPosition =
      size.width < 760 ? new THREE.Vector3(13, 9.2, 21) : new THREE.Vector3(6.4, 4.5, 10);
    camera.position.copy(cameraPosition);
    camera.lookAt(target);
  }, [camera, cameraMode, size.width]);

  useEffect(() => {
    if (command.id === 0) return;
    if (command.type === "launch") {
      const guidedPull = new THREE.Vector3(0.26, 0.59, 0.78);
      position.current.copy(LAUNCH_POINT).add(guidedPull);
      velocity.current.copy(guidedPull).multiplyScalar(-LAUNCH_POWER);
      setPhase("flying");
      setDragPoint(position.current.clone());
      setPrediction([]);
      onTrajectoryState(null);
      publish("flying");
      return;
    }
    returnToLaunch(command.type === "reset");
  }, [command, onTrajectoryState, publish, returnToLaunch, setPhase]);

  const pointOnDragPlane = (event: ThreeEvent<PointerEvent>) => {
    const result = new THREE.Vector3();
    return event.ray.intersectPlane(dragPlane.current, result) ?? LAUNCH_POINT.clone();
  };

  const beginAim = (event: ThreeEvent<PointerEvent>) => {
    if (phase.current !== "ready") return;
    event.stopPropagation();
    dragPointerId.current = event.pointerId;
    camera.getWorldDirection(cameraDirection);
    dragPlane.current.setFromNormalAndCoplanarPoint(cameraDirection, LAUNCH_POINT);
    (event.target as EventTarget & { setPointerCapture: (pointerId: number) => void }).setPointerCapture(event.pointerId);
    setPhase("aiming");
    onTrajectoryState("safe");
    publish("aiming");
  };

  const updateAim = (event: ThreeEvent<PointerEvent>) => {
    if (phase.current !== "aiming" || dragPointerId.current !== event.pointerId) return;
    event.stopPropagation();
    const nextPoint = pointOnDragPlane(event);
    const pull = nextPoint.sub(LAUNCH_POINT).clampLength(0, MAX_PULL);
    const pulledPosition = LAUNCH_POINT.clone().add(pull);
    const launchVelocity = pull.clone().multiplyScalar(-LAUNCH_POWER);
    const nextPrediction = predictOrbit(pulledPosition, launchVelocity);
    position.current.copy(pulledPosition);
    setDragPoint(pulledPosition);
    setPrediction(nextPrediction);
    onTrajectoryState(nextPrediction.length > 2 ? assessTrajectory(nextPrediction).state : "safe");
  };

  const releaseAim = (event: ThreeEvent<PointerEvent>) => {
    if (phase.current !== "aiming" || dragPointerId.current !== event.pointerId) return;
    event.stopPropagation();
    (event.target as EventTarget & { releasePointerCapture: (pointerId: number) => void }).releasePointerCapture(
      event.pointerId,
    );
    dragPointerId.current = null;
    const pull = dragPoint.clone().sub(LAUNCH_POINT);
    if (pull.length() < 0.22) {
      returnToLaunch(false);
      return;
    }
    position.current.copy(dragPoint);
    velocity.current.copy(pull).multiplyScalar(-LAUNCH_POWER);
    setPhase("flying");
    setPrediction([]);
    onTrajectoryState(null);
    publish("flying");
  };

  const cancelAim = (event: ThreeEvent<PointerEvent>) => {
    if (phase.current !== "aiming" || dragPointerId.current !== event.pointerId) return;
    event.stopPropagation();
    (event.target as EventTarget & { releasePointerCapture: (pointerId: number) => void }).releasePointerCapture(
      event.pointerId,
    );
    dragPointerId.current = null;
    returnToLaunch(false);
  };

  useFrame(({ clock }, delta) => {
    if (phase.current === "flying") {
      accumulator.current += Math.min(delta, 0.05);
      while (accumulator.current >= SIMULATION_STEP) {
        applyGravity(position.current, velocity.current, SIMULATION_STEP);
        accumulator.current -= SIMULATION_STEP;
      }

      const hasCrashed = BODIES.some(
        (body) => position.current.distanceTo(body.position) < body.radius + 0.16,
      );
      if (hasCrashed || position.current.length() > 17.5) {
        setPhase("crashed");
        velocity.current.set(0, 0, 0);
        combo.current = 0;
        publish("crashed");
      } else {
        BODIES.forEach((body, index) => {
          const assistRange = ASSIST_RANGES[index] ?? ASSIST_RANGES[0];
          if (!collected.current.has(index) && position.current.distanceTo(body.position) < assistRange) {
            collected.current.add(index);
            combo.current += 1;
            score.current += 900 * combo.current;
            if (collected.current.size === BODIES.length) {
              setPhase("complete");
              score.current += 3000;
              velocity.current.multiplyScalar(0.35);
              publish("complete");
            } else {
              publish();
            }
          }
        });
      }

      trailTimer.current += delta;
      if (trailTimer.current > 0.022) {
        trailTimer.current = 0;
        const oldestPoint = trailPoints.current.pop();
        if (oldestPoint) {
          oldestPoint.copy(position.current);
          trailPoints.current.unshift(oldestPoint);
        }
      }
    }

    if (phase.current === "complete") {
      position.current.addScaledVector(velocity.current, delta);
      velocity.current.multiplyScalar(Math.pow(0.96, delta * 60));
    }

    if (probe.current) {
      probe.current.position.copy(position.current);
      if (velocity.current.lengthSq() > 0.002) {
        probeDirection.copy(velocity.current).normalize();
      } else {
        probeDirection.copy(BODIES[0].position).sub(position.current).normalize();
      }
      probeQuaternion.setFromUnitVectors(PROBE_FORWARD, probeDirection);
      probe.current.quaternion.slerp(probeQuaternion, 1 - Math.pow(0.001, delta));
    }

    if (trail.current) {
      trailPoints.current.forEach((point, index) => {
        const fade = 1 - index / trailPoints.current.length;
        dummy.position.copy(point);
        dummy.scale.setScalar(Math.max(0.004, fade * 0.043));
        dummy.updateMatrix();
        trail.current?.setMatrixAt(index, dummy.matrix);
      });
      trail.current.instanceMatrix.needsUpdate = true;
    }

    if (cameraMode === "chase" && (phase.current === "flying" || phase.current === "complete")) {
      if (velocity.current.lengthSq() > 0.001) {
        chaseDirection.copy(velocity.current).normalize();
      } else {
        chaseDirection.set(0, 0, -1);
      }
      const distance = size.width < 760 ? 6.6 : 3.95;
      chasePosition.copy(position.current).addScaledVector(chaseDirection, -distance);
      chaseOffset.set(size.width < 760 ? 0.45 : 0.72, size.width < 760 ? 1.8 : 1.12, 0);
      chasePosition.add(chaseOffset);
      camera.position.lerp(chasePosition, 1 - Math.pow(0.003, delta));
      chaseTarget.copy(position.current).addScaledVector(chaseDirection, 1.15);
      camera.lookAt(chaseTarget);
    }

    if (clock.elapsedTime - lastTelemetry.current > 0.14) {
      lastTelemetry.current = clock.elapsedTime;
      if (phase.current === "flying") publish();
    }
  });

  return (
    <>
      <SpaceEnvironment reducedMotion={reducedMotion} />
      <Helios reducedMotion={reducedMotion} />
      <Nyx reducedMotion={reducedMotion} />
      <Pelagos reducedMotion={reducedMotion} />

      {renderPhase === "aiming" ? (
        <>
          <LaunchVector from={LAUNCH_POINT} to={dragPoint} reducedMotion={reducedMotion} />
          {prediction.length > 2 ? <TrajectoryPreview points={prediction} reducedMotion={reducedMotion} /> : null}
        </>
      ) : null}

      <instancedMesh ref={trail} args={[undefined, undefined, trailPoints.current.length]} frustumCulled={false}>
        <sphereGeometry args={[1, 10, 10]} />
        <meshBasicMaterial
          color="#77c8ff"
          transparent
          opacity={0.32}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </instancedMesh>

      <group
        ref={probe}
        position={LAUNCH_POINT}
        onPointerOver={(event) => {
          event.stopPropagation();
          setProbeHovered(true);
        }}
        onPointerOut={() => {
          if (phase.current !== "aiming") setProbeHovered(false);
        }}
        onPointerDown={beginAim}
        onPointerMove={updateAim}
        onPointerUp={releaseAim}
        onPointerCancel={cancelAim}
      >
        <mesh>
          <sphereGeometry args={[1.25, 16, 16]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
        </mesh>
        <DeepSpaceProbe active={renderPhase === "flying" || renderPhase === "complete"} reducedMotion={reducedMotion} />
      </group>

      <OrbitControls
        makeDefault
        enabled={cameraMode === "overview" && renderPhase !== "aiming" && !probeHovered}
        target={size.width < 760 ? [0.9, -0.15, -0.35] : [0, 0, -0.6]}
        enablePan={false}
        enableDamping
        dampingFactor={0.055}
        minDistance={6}
        maxDistance={28}
        minPolarAngle={0.35}
        maxPolarAngle={2.55}
        autoRotate={!reducedMotion && renderPhase === "ready"}
        autoRotateSpeed={0.32}
      />
      <SpacePostprocessing />
    </>
  );
}
