import { Html, Line, OrbitControls } from "@react-three/drei";
import { type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { type ComponentRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Helios, Nyx, Pelagos } from "./celestial-bodies";
import { Spacecraft } from "./spacecraft";
import {
  BODIES,
  createFlight,
  GUIDED_PULL,
  LAUNCH_POINT,
  LAUNCH_POWER,
  MAX_PULL,
  predictOrbit,
  SIMULATION_STEP,
  stepFlight,
  type FlightPhase,
  type OrbitPrediction,
  type TrajectoryState,
} from "./space-config";
import { SpaceEnvironment, SpacePostprocessing } from "./space-environment";

export type { FlightPhase, TrajectoryState } from "./space-config";
export type CameraMode = "overview" | "chase";

export interface MissionSnapshot {
  phase: FlightPhase;
  assists: number;
  score: number;
  combo: number;
  speed: number;
  visitedBodies: string[];
  flightTime: number;
}

export interface SceneCommand {
  id: number;
  type: "launch" | "retry" | "reset" | "pause" | "resume";
}

interface OrbitalSceneProps {
  command: SceneCommand;
  cameraMode: CameraMode;
  reducedMotion: boolean;
  onSnapshot: (snapshot: MissionSnapshot) => void;
  onTrajectoryState: (state: TrajectoryState | null) => void;
}

const PROBE_FORWARD = new THREE.Vector3(0, 0, 1);
const WORLD_UP = new THREE.Vector3(0, 1, 0);

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

function TrajectoryPreview({ prediction, reducedMotion, subtle = false }: { prediction: OrbitPrediction; reducedMotion: boolean; subtle?: boolean }) {
  const { points } = prediction;
  const particles = useRef<THREE.InstancedMesh>(null);
  const { camera } = useThree();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const curve = useMemo(
    () => new THREE.CatmullRomCurve3(points.map((coordinates) => new THREE.Vector3(...coordinates))),
    [points],
  );
  const color = subtle ? "#829ca9" : TRAJECTORY_COLORS[prediction.state];
  const particleCount = Math.min(52, Math.max(20, points.length));
  useFrame(({ clock }) => {
    if (!particles.current || subtle) return;
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
      {!subtle ? <Line points={points} color={color} lineWidth={4.5} transparent opacity={0.1} /> : null}
      <Line
        points={points}
        color={color}
        lineWidth={subtle ? 0.8 : 1.35}
        dashed
        dashSize={0.1}
        gapSize={0.075}
        transparent
        opacity={subtle ? 0.28 : 0.58}
      />
      <instancedMesh ref={particles} visible={!subtle} args={[undefined, undefined, particleCount]} frustumCulled={false}>
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
      {!subtle && prediction.marker ? <TrajectoryMarker position={prediction.marker} state={prediction.state} reducedMotion={reducedMotion} /> : null}
      {!subtle ? <GhostProbe points={points} color={color} /> : null}
    </>
  );
}

export function OrbitalScene({ command, cameraMode, reducedMotion, onSnapshot, onTrajectoryState }: OrbitalSceneProps) {
  const probe = useRef<THREE.Group>(null);
  const trail = useRef<THREE.InstancedMesh>(null);
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const { camera, size, gl, events } = useThree();
  const flight = useRef(createFlight());
  const accumulator = useRef(0);
  const lastTelemetry = useRef(0);
  const lastCommandId = useRef(0);
  const trailPoints = useRef<THREE.Vector3[]>(Array.from({ length: 240 }, () => LAUNCH_POINT.clone()));
  const trailTimer = useRef(0);
  const dragPointerId = useRef<number | null>(null);
  const pointerCapture = useRef<{ hasPointerCapture: (id: number) => boolean; releasePointerCapture: (id: number) => void } | null>(null);
  const dragPlane = useRef(new THREE.Plane());
  const [renderPhase, setRenderPhase] = useState<FlightPhase>("ready");
  const [homeRevision, setHomeRevision] = useState(0);
  const [probeHovered, setProbeHovered] = useState(false);
  const [dragPoint, setDragPoint] = useState(LAUNCH_POINT.clone());
  const [prediction, setPrediction] = useState<OrbitPrediction | null>(null);
  const guidedPrediction = useMemo(() => predictOrbit(
    LAUNCH_POINT.clone().add(GUIDED_PULL),
    GUIDED_PULL.clone().multiplyScalar(-LAUNCH_POWER),
  ), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const cameraDirection = useMemo(() => new THREE.Vector3(), []);
  const probeDirection = useMemo(() => new THREE.Vector3(), []);
  const probeQuaternion = useMemo(() => new THREE.Quaternion(), []);
  const attitudeRight = useMemo(() => new THREE.Vector3(), []);
  const attitudeUp = useMemo(() => new THREE.Vector3(), []);
  const attitudeBasis = useMemo(() => new THREE.Matrix4(), []);
  const chaseDirection = useMemo(() => new THREE.Vector3(), []);
  const chasePosition = useMemo(() => new THREE.Vector3(), []);
  const chaseOffset = useMemo(() => new THREE.Vector3(), []);
  const chaseUp = useMemo(() => new THREE.Vector3(), []);
  const chaseTarget = useMemo(() => new THREE.Vector3(), []);

  const publish = useCallback(() => {
    const current = flight.current;
    onSnapshot({
      phase: current.phase,
      assists: current.visitedBodies.size,
      score: current.score,
      combo: current.combo,
      speed: current.velocity.length(),
      visitedBodies: [...current.visitedBodies],
      flightTime: current.flightTime,
    });
  }, [onSnapshot]);

  const setPhase = useCallback((nextPhase: FlightPhase) => {
    flight.current.phase = nextPhase;
    setRenderPhase(nextPhase);
  }, []);

  const returnToLaunch = useCallback((clearProgress: boolean) => {
    const current = flight.current;
    setPhase("ready");
    current.position.copy(LAUNCH_POINT);
    current.velocity.set(0, 0, 0);
    current.flightTime = 0;
    current.combo = 0;
    accumulator.current = 0;
    trailTimer.current = 0;
    const pointerId = dragPointerId.current;
    if (pointerId !== null && pointerCapture.current?.hasPointerCapture(pointerId)) pointerCapture.current.releasePointerCapture(pointerId);
    pointerCapture.current = null;
    dragPointerId.current = null;
    setProbeHovered(false);
    setDragPoint(LAUNCH_POINT.clone());
    setPrediction(null);
    setHomeRevision((revision) => revision + 1);
    onTrajectoryState(null);
    trailPoints.current.forEach((point) => point.copy(LAUNCH_POINT));
    if (clearProgress) {
      current.visitedBodies.clear();
      current.score = 0;
    }
    publish();
  }, [onTrajectoryState, publish, setPhase]);

  useEffect(() => {
    // R3F clears hover on pointercancel but does not dispatch it to mesh handlers.
    const target = events.connected instanceof HTMLElement ? events.connected : gl.domElement;
    const cancel = (event: PointerEvent) => {
      if (flight.current.phase === "aiming" && dragPointerId.current === event.pointerId) returnToLaunch(false);
    };
    target.addEventListener("pointercancel", cancel);
    target.addEventListener("lostpointercapture", cancel);
    return () => {
      target.removeEventListener("pointercancel", cancel);
      target.removeEventListener("lostpointercapture", cancel);
    };
  }, [events.connected, gl, returnToLaunch]);

  useEffect(() => {
    if (cameraMode !== "overview") return;
    const target = new THREE.Vector3(0, -0.55, -0.6);
    if (size.width < 760) camera.position.set(-9, 8.2, 27);
    else camera.position.set(-6, 5, 12);
    camera.lookAt(target);
    controls.current?.target.copy(target);
    controls.current?.update();
  }, [camera, cameraMode, size.width, homeRevision]);

  useEffect(() => {
    if (cameraMode !== "chase" || flight.current.phase !== "paused") return;
    const current = flight.current;
    chaseDirection.copy(current.velocity).normalize();
    chasePosition.copy(current.position).addScaledVector(chaseDirection, size.width < 760 ? -6.6 : -3.95);
    chaseOffset.crossVectors(WORLD_UP, chaseDirection);
    if (chaseOffset.lengthSq() < 0.0001) chaseOffset.set(1, 0, 0);
    chaseOffset.normalize();
    chaseUp.crossVectors(chaseDirection, chaseOffset).normalize();
    chasePosition.addScaledVector(chaseOffset, size.width < 760 ? 0.65 : 1.3);
    chasePosition.addScaledVector(chaseUp, size.width < 760 ? 2.2 : 1.45);
    camera.position.copy(chasePosition);
    camera.lookAt(chaseTarget.copy(current.position).addScaledVector(chaseDirection, 1.15));
  }, [camera, cameraMode, chaseDirection, chaseOffset, chasePosition, chaseTarget, chaseUp, size.width]);

  useEffect(() => {
    // Callback or viewport changes must never replay an already consumed command.
    if (command.id === 0 || command.id === lastCommandId.current) return;
    lastCommandId.current = command.id;
    if (command.type === "pause" || command.type === "resume") {
      if (command.type === "pause" && flight.current.phase === "flying") setPhase("paused");
      if (command.type === "resume" && flight.current.phase === "paused") setPhase("flying");
      publish();
      return;
    }
    if (command.type === "launch") {
      if (flight.current.phase !== "ready") return;
      flight.current.position.copy(LAUNCH_POINT).add(GUIDED_PULL);
      flight.current.velocity.copy(GUIDED_PULL).multiplyScalar(-LAUNCH_POWER);
      accumulator.current = 0;
      trailTimer.current = 0;
      trailPoints.current.forEach((point) => point.copy(flight.current.position));
      setPhase("flying");
      setProbeHovered(false);
      setDragPoint(flight.current.position.clone());
      setPrediction(null);
      onTrajectoryState(null);
      publish();
      return;
    }
    returnToLaunch(command.type === "reset");
  }, [command, onTrajectoryState, publish, returnToLaunch, setPhase]);

  const pointOnDragPlane = (event: ThreeEvent<PointerEvent>) => {
    const result = new THREE.Vector3();
    return event.ray.intersectPlane(dragPlane.current, result) ?? LAUNCH_POINT.clone();
  };

  const beginAim = (event: ThreeEvent<PointerEvent>) => {
    if (flight.current.phase !== "ready") return;
    event.stopPropagation();
    dragPointerId.current = event.pointerId;
    camera.getWorldDirection(cameraDirection);
    dragPlane.current.setFromNormalAndCoplanarPoint(cameraDirection, LAUNCH_POINT);
    const target = event.target as EventTarget & {
      setPointerCapture: (id: number) => void;
      hasPointerCapture: (id: number) => boolean;
      releasePointerCapture: (id: number) => void;
    };
    target.setPointerCapture(event.pointerId);
    pointerCapture.current = target;
    setPhase("aiming");
    onTrajectoryState("safe");
    publish();
  };

  const updateAim = (event: ThreeEvent<PointerEvent>) => {
    if (flight.current.phase !== "aiming" || dragPointerId.current !== event.pointerId) return;
    event.stopPropagation();
    const pull = pointOnDragPlane(event).sub(LAUNCH_POINT).clampLength(0, MAX_PULL);
    const pulledPosition = LAUNCH_POINT.clone().add(pull);
    const launchVelocity = pull.clone().multiplyScalar(-LAUNCH_POWER);
    const nextPrediction = predictOrbit(pulledPosition, launchVelocity, flight.current.visitedBodies);
    flight.current.position.copy(pulledPosition);
    setDragPoint(pulledPosition);
    setPrediction(nextPrediction);
    onTrajectoryState(nextPrediction.state);
  };

  const releaseAim = (event: ThreeEvent<PointerEvent>) => {
    if (flight.current.phase !== "aiming" || dragPointerId.current !== event.pointerId) return;
    event.stopPropagation();
    (event.target as EventTarget & { releasePointerCapture: (pointerId: number) => void }).releasePointerCapture(event.pointerId);
    dragPointerId.current = null;
    // Position is authoritative even when React has not rendered the last pointer move yet.
    const pull = flight.current.position.clone().sub(LAUNCH_POINT);
    if (pull.length() < 0.22) {
      returnToLaunch(false);
      return;
    }
    flight.current.velocity.copy(pull).multiplyScalar(-LAUNCH_POWER);
    accumulator.current = 0;
    trailTimer.current = 0;
    trailPoints.current.forEach((point) => point.copy(flight.current.position));
    setPhase("flying");
    setProbeHovered(false);
    setPrediction(null);
    onTrajectoryState(null);
    publish();
  };

  useFrame(({ clock }, delta) => {
    const current = flight.current;
    if (current.phase === "flying") {
      const previousAssists = current.visitedBodies.size;
      accumulator.current += Math.min(delta, 0.05);
      while (accumulator.current >= SIMULATION_STEP && current.phase === "flying") {
        stepFlight(current);
        accumulator.current -= SIMULATION_STEP;
        trailTimer.current += SIMULATION_STEP;
        if (trailTimer.current >= 0.025) {
          trailTimer.current -= 0.025;
          const oldestPoint = trailPoints.current.pop();
          if (oldestPoint) {
            oldestPoint.copy(current.position);
            trailPoints.current.unshift(oldestPoint);
          }
        }
      }
      if (current.phase !== "flying") {
        setRenderPhase(current.phase);
        accumulator.current = 0;
        publish();
      } else if (current.visitedBodies.size !== previousAssists) publish();
    }

    if (probe.current) {
      probe.current.position.copy(current.position);
      if (current.phase !== "paused") {
        if (current.velocity.lengthSq() > 0.002) probeDirection.copy(current.velocity).normalize();
        else probeDirection.copy(BODIES[0].position).sub(current.position).normalize();
        // Keep the dorsal instruments above the flight plane through heading reversals.
        attitudeRight.crossVectors(WORLD_UP, probeDirection);
        if (attitudeRight.lengthSq() < 0.0001) attitudeRight.set(1, 0, 0);
        else attitudeRight.normalize();
        attitudeUp.crossVectors(probeDirection, attitudeRight).normalize();
        attitudeBasis.makeBasis(attitudeRight, attitudeUp, probeDirection);
        probeQuaternion.setFromRotationMatrix(attitudeBasis);
        probe.current.quaternion.slerp(probeQuaternion, 1 - Math.pow(0.001, delta));
      }
    }

    if (trail.current) {
      trailPoints.current.forEach((point, index) => {
        const fade = 1 - index / trailPoints.current.length;
        dummy.position.copy(point);
        dummy.scale.setScalar(Math.max(0.003, fade * 0.032));
        dummy.updateMatrix();
        trail.current?.setMatrixAt(index, dummy.matrix);
      });
      trail.current.instanceMatrix.needsUpdate = true;
    }

    if (cameraMode === "chase" && (current.phase === "flying" || current.phase === "complete")) {
      if (current.velocity.lengthSq() > 0.001) chaseDirection.copy(current.velocity).normalize();
      else chaseDirection.set(0, 0, -1);
      const distance = size.width < 760 ? 6.6 : 3.95;
      chasePosition.copy(current.position).addScaledVector(chaseDirection, -distance);
      chaseOffset.crossVectors(WORLD_UP, chaseDirection);
      if (chaseOffset.lengthSq() < 0.0001) chaseOffset.set(1, 0, 0);
      chaseOffset.normalize();
      chaseUp.crossVectors(chaseDirection, chaseOffset).normalize();
      chasePosition.addScaledVector(chaseOffset, size.width < 760 ? 0.65 : 1.3);
      chasePosition.addScaledVector(chaseUp, size.width < 760 ? 2.2 : 1.45);
      camera.position.lerp(chasePosition, 1 - Math.pow(0.003, delta));
      chaseTarget.copy(current.position).addScaledVector(chaseDirection, 1.15);
      camera.lookAt(chaseTarget);
    }

    if (clock.elapsedTime - lastTelemetry.current > 0.14) {
      lastTelemetry.current = clock.elapsedTime;
      if (current.phase === "flying") publish();
    }
  });

  const motionIsStill = reducedMotion || renderPhase === "paused";
  return (
    <>
      <SpaceEnvironment reducedMotion={motionIsStill} />
      <Helios reducedMotion={motionIsStill} />
      <Nyx reducedMotion={motionIsStill} />
      <Pelagos reducedMotion={motionIsStill} />
      {cameraMode === "overview" && size.width > 760 ? BODIES.map((body, index) => (
        <Html key={body.id} position={[body.position.x, body.position.y - body.radius - 0.26, body.position.z]} center zIndexRange={[1, 0]} style={{ pointerEvents: "none" }}>
          <div className="orbital-body-label"><strong>{body.id}</strong><span>{["The heart of the system", "A world of rust & rock", "A familiar shade of blue"][index]}</span></div>
        </Html>
      )) : null}

      {renderPhase === "ready" ? <TrajectoryPreview prediction={guidedPrediction} reducedMotion subtle /> : null}
      {renderPhase === "aiming" ? (
        <>
          <LaunchVector from={LAUNCH_POINT} to={dragPoint} reducedMotion={reducedMotion} />
          {prediction && prediction.points.length > 2 ? <TrajectoryPreview prediction={prediction} reducedMotion={reducedMotion} /> : null}
        </>
      ) : null}

      <instancedMesh ref={trail} args={[undefined, undefined, trailPoints.current.length]} frustumCulled={false}>
        <sphereGeometry args={[1, 10, 10]} />
        <meshBasicMaterial color="#91d1e3" transparent opacity={0.4} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </instancedMesh>

      <group
        ref={probe}
        position={LAUNCH_POINT}
        onPointerOver={(event) => {
          if (flight.current.phase !== "ready" && flight.current.phase !== "aiming") return;
          event.stopPropagation();
          setProbeHovered(true);
        }}
        onPointerOut={() => { if (flight.current.phase !== "aiming") setProbeHovered(false); }}
        onPointerDown={beginAim}
        onPointerMove={updateAim}
        onPointerUp={releaseAim}
      >
        <mesh>
          <sphereGeometry args={[1.25, 16, 16]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
        </mesh>
        <Spacecraft active={renderPhase === "flying" || renderPhase === "paused"} paused={renderPhase === "paused"} reducedMotion={reducedMotion} />
      </group>

      <OrbitControls
        key={homeRevision}
        ref={controls}
        makeDefault
        enabled={cameraMode === "overview" && renderPhase !== "aiming" && !probeHovered}
        target={[0, -0.55, -0.6]}
        enablePan={false}
        enableDamping
        dampingFactor={0.055}
        minDistance={6}
        maxDistance={28}
        minPolarAngle={0.35}
        maxPolarAngle={2.55}
      />
      <SpacePostprocessing />
    </>
  );
}
