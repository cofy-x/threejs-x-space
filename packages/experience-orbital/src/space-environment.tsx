import { Sparkles, Stars } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { BODIES } from "./space-config";

const NEBULA_VERTEX_SHADER = `
  varying vec3 vDirection;
  void main() {
    vDirection = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const NEBULA_FRAGMENT_SHADER = `
  uniform float uTime;
  varying vec3 vDirection;

  float hash(vec3 point) {
    return fract(sin(dot(point, vec3(127.1, 311.7, 74.7))) * 43758.5453);
  }

  float noise3(vec3 point) {
    vec3 cell = floor(point);
    vec3 local = fract(point);
    local = local * local * (3.0 - 2.0 * local);
    return mix(
      mix(mix(hash(cell), hash(cell + vec3(1.0, 0.0, 0.0)), local.x),
          mix(hash(cell + vec3(0.0, 1.0, 0.0)), hash(cell + vec3(1.0, 1.0, 0.0)), local.x), local.y),
      mix(mix(hash(cell + vec3(0.0, 0.0, 1.0)), hash(cell + vec3(1.0, 0.0, 1.0)), local.x),
          mix(hash(cell + vec3(0.0, 1.0, 1.0)), hash(cell + vec3(1.0, 1.0, 1.0)), local.x), local.y),
      local.z
    );
  }

  void main() {
    vec3 direction = normalize(vDirection);
    vec3 galacticNormal = normalize(vec3(0.58, -0.81, 0.08));
    float latitude = abs(dot(direction, galacticNormal));
    float band = exp(-pow(latitude * 5.8, 1.5));
    float broadDust = noise3(direction * 7.0 + vec3(uTime * 0.003));
    float fineDust = noise3(direction * 23.0 - vec3(uTime * 0.0015));
    float structure = smoothstep(0.22, 0.94, broadDust * 0.68 + fineDust * 0.32);
    float core = pow(max(0.0, dot(direction, normalize(vec3(-0.52, 0.08, 0.85)))), 5.0);
    float darkLane = exp(-pow(latitude * 14.0, 2.0)) * smoothstep(0.42, 0.78, fineDust);
    vec3 midnight = vec3(0.003, 0.006, 0.018);
    vec3 coolDust = vec3(0.075, 0.105, 0.22);
    vec3 warmCore = vec3(0.32, 0.15, 0.075);
    vec3 color = midnight;
    color += mix(coolDust, warmCore, core) * band * (0.46 + structure * 1.08);
    color *= 1.0 - darkLane * 0.62;
    color += warmCore * core * band * 0.3;
    gl_FragColor = vec4(color, 1.0);
  }
`;

function Nebula({ reducedMotion }: { reducedMotion: boolean }) {
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  useFrame(({ clock }) => {
    uniforms.uTime.value = reducedMotion ? 0 : clock.elapsedTime;
  });
  return (
    <mesh scale={46}>
      <sphereGeometry args={[1, 48, 48]} />
      <shaderMaterial
        vertexShader={NEBULA_VERTEX_SHADER}
        fragmentShader={NEBULA_FRAGMENT_SHADER}
        uniforms={uniforms}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  );
}

function ParallaxStars({ reducedMotion }: { reducedMotion: boolean }) {
  const nearLayer = useRef<THREE.Group>(null);
  const farLayer = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (reducedMotion) return;
    if (nearLayer.current) nearLayer.current.rotation.y += delta * 0.0028;
    if (farLayer.current) farLayer.current.rotation.y -= delta * 0.0009;
  });
  return (
    <>
      <group ref={farLayer} rotation={[0.18, 0, -0.12]}>
        <Stars radius={43} depth={18} count={2800} factor={2.2} saturation={0.26} fade speed={0} />
      </group>
      <group ref={nearLayer} rotation={[-0.12, 0.35, 0.24]}>
        <Stars radius={22} depth={8} count={620} factor={3.1} saturation={0.5} fade speed={0} />
      </group>
    </>
  );
}

function GalacticDust({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <group rotation={[0.42, 0.1, -0.72]}>
      <Sparkles
        count={reducedMotion ? 70 : 170}
        scale={[32, 1.7, 24]}
        size={0.9}
        speed={reducedMotion ? 0 : 0.025}
        color="#d9b39a"
        noise={reducedMotion ? 0 : 0.18}
      />
    </group>
  );
}

function AsteroidBelt({ reducedMotion }: { reducedMotion: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const group = useRef<THREE.Group>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const asteroids = useMemo(
    () =>
      Array.from({ length: 124 }, (_, index) => {
        const seed = Math.sin(index * 127.13) * 43758.5453;
        const random = seed - Math.floor(seed);
        const angle = (index / 124) * Math.PI * 2 + random * 0.06;
        const radiusOffset = (random - 0.5) * 0.68;
        return {
          position: new THREE.Vector3(
            Math.cos(angle) * (5.5 + radiusOffset),
            (Math.sin(index * 9.7) + random - 0.5) * 0.16,
            Math.sin(angle) * (3.65 + radiusOffset * 0.55),
          ),
          rotation: new THREE.Euler(index * 0.71, index * 1.13, index * 0.37),
          scale: 0.028 + random * 0.065,
        };
      }),
    [],
  );

  useEffect(() => {
    if (!mesh.current) return;
    asteroids.forEach((asteroid, index) => {
      dummy.position.copy(asteroid.position);
      dummy.rotation.copy(asteroid.rotation);
      dummy.scale.set(asteroid.scale * 1.7, asteroid.scale, asteroid.scale * 1.15);
      dummy.updateMatrix();
      mesh.current?.setMatrixAt(index, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  }, [asteroids, dummy]);

  useFrame((_, delta) => {
    if (group.current && !reducedMotion) group.current.rotation.y += delta * 0.012;
  });

  return (
    <group ref={group} position={BODIES[0].position} rotation={[0.32, 0.18, -0.24]}>
      <instancedMesh ref={mesh} args={[undefined, undefined, asteroids.length]} castShadow>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#80798d" roughness={0.95} metalness={0.05} />
      </instancedMesh>
    </group>
  );
}

function PelagosMoon({ reducedMotion }: { reducedMotion: boolean }) {
  const orbit = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (orbit.current) orbit.current.rotation.y = reducedMotion ? 0.5 : clock.elapsedTime * 0.22;
  });
  return (
    <group ref={orbit} position={BODIES[2].position} rotation={[0.65, 0, 0.2]}>
      <mesh position={[1.55, 0, 0]} castShadow>
        <icosahedronGeometry args={[0.16, 2]} />
        <meshStandardMaterial color="#b5a9a0" roughness={0.9} />
      </mesh>
    </group>
  );
}

export function SpaceEnvironment({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <>
      <color attach="background" args={["#030207"]} />
      <fog attach="fog" args={["#05030b", 23, 48]} />
      <Nebula reducedMotion={reducedMotion} />
      <ParallaxStars reducedMotion={reducedMotion} />
      <GalacticDust reducedMotion={reducedMotion} />
      <Sparkles
        count={reducedMotion ? 28 : 72}
        scale={[24, 16, 24]}
        size={1.15}
        speed={reducedMotion ? 0 : 0.045}
        color="#c6d6ff"
        noise={reducedMotion ? 0 : 0.2}
      />
      <hemisphereLight args={["#8ca6cb", "#100b15", 0.32]} />
      <ambientLight intensity={0.12} color="#77769d" />
      <directionalLight position={[7, 9, 11]} intensity={0.65} color="#b4c9ff" />
      <AsteroidBelt reducedMotion={reducedMotion} />
      <PelagosMoon reducedMotion={reducedMotion} />
    </>
  );
}

export function SpacePostprocessing() {
  return (
    <EffectComposer multisampling={0}>
      <Bloom luminanceThreshold={0.78} luminanceSmoothing={0.28} intensity={0.65} mipmapBlur />
      <Vignette eskil={false} offset={0.16} darkness={0.58} />
    </EffectComposer>
  );
}
