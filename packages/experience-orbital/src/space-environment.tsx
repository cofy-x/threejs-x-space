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
    float fineDust = noise3(direction * 23.0 - vec3(uTime * 0.0015)) * 0.65 + noise3(direction * 71.0) * 0.35;
    float structure = smoothstep(0.22, 0.94, broadDust * 0.68 + fineDust * 0.32);
    float core = pow(max(0.0, dot(direction, normalize(vec3(-0.52, 0.08, 0.85)))), 5.0);
    float darkLane = exp(-pow(latitude * 14.0, 2.0)) * smoothstep(0.42, 0.78, fineDust);
    vec3 midnight = vec3(0.0015, 0.003, 0.006);
    vec3 coolDust = vec3(0.018, 0.027, 0.039);
    vec3 warmCore = vec3(0.065, 0.043, 0.025);
    vec3 color = midnight;
    color += mix(coolDust, warmCore, core) * band * (0.46 + structure * 1.08);
    color *= 1.0 - darkLane * 0.62;
    color += warmCore * core * band * 0.3;
    gl_FragColor = vec4(color, 1.0);
  }
`;

function Nebula({ reducedMotion }: { reducedMotion: boolean }) {
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  useFrame((_, delta) => {
    if (!reducedMotion) uniforms.uTime.value += Math.min(delta, 0.05);
  });
  return (
    <mesh scale={110}>
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

function ParallaxStars() {
  const geometry = useMemo(() => {
    const count = 2800;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const color = new THREE.Color();
    let seed = 73819;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let index = 0; index < count; index += 1) {
      const theta = random() * Math.PI * 2;
      const vertical = random() * 2 - 1;
      const radial = Math.sqrt(1 - vertical * vertical);
      const radius = 38 + random() * 55;
      positions.set([Math.cos(theta) * radial * radius, vertical * radius, Math.sin(theta) * radial * radius], index * 3);
      color.set(index % 13 === 0 ? "#d7b78d" : index % 7 === 0 ? "#b3c5dd" : "#a7b3bd");
      color.multiplyScalar(0.35 + random() * 0.6);
      colors.set([color.r, color.g, color.b], index * 3);
    }
    const result = new THREE.BufferGeometry();
    result.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    result.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return result;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <points geometry={geometry}>
      <shaderMaterial vertexColors transparent depthWrite={false} toneMapped={false}
        vertexShader={`
          varying vec3 vColor;
          void main() {
            vColor = color;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = clamp(100.0 / -mv.z, 0.7, 2.5);
          }
        `}
        fragmentShader={`
          varying vec3 vColor;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            float a = 1.0 - smoothstep(0.12, 0.5, d);
            gl_FragColor = vec4(vColor, a * 0.82);
          }
        `}
      />
    </points>
  );
}

function AsteroidBelt({ reducedMotion }: { reducedMotion: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const group = useRef<THREE.Group>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const asteroids = useMemo(
    () =>
      Array.from({ length: 240 }, (_, index) => {
        const seed = Math.sin(index * 127.13) * 43758.5453;
        const random = seed - Math.floor(seed);
        const angle = (index / 240) * Math.PI * 2 + random * 0.06;
        const radiusOffset = (random - 0.5) * 3.4;
        return {
          position: new THREE.Vector3(
            Math.cos(angle) * (6.4 + radiusOffset),
            (Math.sin(index * 9.7) + random - 0.5) * 0.28,
            Math.sin(angle) * (4.2 + radiusOffset * 0.8),
          ),
          rotation: new THREE.Euler(index * 0.71, index * 1.13, index * 0.37),
          scale: 0.012 + random * 0.033,
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
    if (group.current && !reducedMotion) group.current.rotation.y += delta * 0.003;
  });

  return (
    <group ref={group} position={BODIES[0].position} rotation={[0.32, 0.18, -0.24]}>
      <instancedMesh ref={mesh} args={[undefined, undefined, asteroids.length]} castShadow>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#7e756b" roughness={0.95} metalness={0.05} />
      </instancedMesh>
    </group>
  );
}

function PelagosMoon({ reducedMotion }: { reducedMotion: boolean }) {
  const orbit = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (orbit.current && !reducedMotion) orbit.current.rotation.y += Math.min(delta, 0.05) * 0.08;
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

      <Nebula reducedMotion={reducedMotion} />
      <ParallaxStars />
      <hemisphereLight args={["#a6c0d1", "#14161a", 0.28]} />
      <ambientLight intensity={0.12} color="#bcc6cf" />
      <AsteroidBelt reducedMotion={reducedMotion} />
      <PelagosMoon reducedMotion={reducedMotion} />
    </>
  );
}

export function SpacePostprocessing() {
  return (
    <EffectComposer multisampling={0}>
      <Bloom luminanceThreshold={1.1} luminanceSmoothing={0.35} intensity={0.38} mipmapBlur />
      <Vignette eskil={false} offset={0.16} darkness={0.38} />
    </EffectComposer>
  );
}
