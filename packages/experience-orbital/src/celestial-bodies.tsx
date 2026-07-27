import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { BODIES } from "./space-config";

const EARTH_DAY_URL = new URL("./assets/earth-blue-marble.png", import.meta.url).href;
const EARTH_CLOUD_URL = new URL("./assets/earth-clouds.jpg", import.meta.url).href;
const EARTH_NIGHT_URL = new URL("./assets/earth-night-lights.jpg", import.meta.url).href;
const SUN_SURFACE_URL = new URL("./assets/sun-sdo-surface.jpg", import.meta.url).href;
const MARS_SURFACE_URL = new URL("./assets/mars-viking.jpg", import.meta.url).href;

const SUN_VERTEX_SHADER = `
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec2 vUv;
  void main() {
    vPosition = position;
    vNormal = normalize(normalMatrix * normal);
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SUN_FRAGMENT_SHADER = `
  uniform float uTime;
  uniform sampler2D uSurfaceMap;
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec2 vUv;
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
    vec3 observation = texture2D(uSurfaceMap, fract(vUv + vec2(uTime * 0.0015, 0.0))).rgb;
    float photosphere = dot(observation, vec3(0.2126, 0.7152, 0.0722));
    float cells = sin(vPosition.x * 8.0 + uTime * 0.8)
      * sin(vPosition.y * 10.0 - uTime * 0.55)
      * sin(vPosition.z * 9.0 + uTime * 0.35);
    float filaments = sin((vPosition.x + vPosition.y) * 17.0 - uTime * 1.4) * 0.5 + 0.5;
    float rim = pow(1.0 - abs(vNormal.z), 2.0);
    float sourceContrast = smoothstep(0.08, 0.62, photosphere);
    float sunspot = 1.0 - smoothstep(0.055, 0.24, photosphere);
    float regionA = exp(-dot(vUv - vec2(0.58, 0.43), vUv - vec2(0.58, 0.43)) * 180.0);
    float regionB = exp(-dot(vUv - vec2(0.31, 0.62), vUv - vec2(0.31, 0.62)) * 260.0);
    float activeRegions = (regionA * 0.52 + regionB * 0.38) * (0.6 + filaments * 0.4);
    float plasma = noise3(vPosition * 3.8 + vec3(uTime * 0.08, -uTime * 0.045, uTime * 0.025));
    float granulation = noise3(vPosition * 12.0 - vec3(uTime * 0.12));
    float convection = cells * 0.12 + (filaments - 0.5) * 0.07;
    float heat = clamp(plasma * 0.68 + granulation * 0.32 + convection, 0.0, 1.0);
    vec3 color = mix(vec3(0.72, 0.045, 0.002), vec3(1.42, 0.47, 0.025), heat);
    color = mix(color, vec3(1.62, 0.9, 0.26), smoothstep(0.7, 0.94, heat) * 0.58);
    color *= 0.72 + sourceContrast * 0.38;
    color *= 1.0 - max(sunspot * 0.84, activeRegions);
    color += rim * vec3(0.56, 0.08, 0.004);
    gl_FragColor = vec4(color, 1.0);
  }
`;

const ATMOSPHERE_VERTEX_SHADER = `
  varying vec3 vNormal;
  varying vec3 vWorldNormal;
  varying vec3 vViewPosition;
  varying vec3 vWorldPosition;
  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = viewPosition.xyz;
    vNormal = normalize(normalMatrix * normal);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const ATMOSPHERE_FRAGMENT_SHADER = `
  uniform vec3 uColor;
  uniform float uStrength;
  uniform vec3 uSunPosition;
  varying vec3 vNormal;
  varying vec3 vWorldNormal;
  varying vec3 vViewPosition;
  varying vec3 vWorldPosition;
  void main() {
    vec3 viewDirection = normalize(-vViewPosition);
    vec3 sunDirection = normalize(uSunPosition - vWorldPosition);
    float fresnel = pow(1.0 - max(0.0, dot(vNormal, viewDirection)), 2.6);
    float daylight = smoothstep(-0.3, 0.45, dot(vWorldNormal, sunDirection));
    gl_FragColor = vec4(uColor * (0.45 + daylight * 0.75), fresnel * uStrength * (0.35 + daylight * 0.65));
  }
`;

const NIGHT_LIGHTS_VERTEX_SHADER = `
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  void main() {
    vUv = uv;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const NIGHT_LIGHTS_FRAGMENT_SHADER = `
  uniform sampler2D uNightMap;
  uniform vec3 uSunPosition;
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  void main() {
    vec3 source = texture2D(uNightMap, vUv).rgb;
    vec3 cityLight = pow(max(source - vec3(0.08), vec3(0.0)) * 1.08, vec3(3.2));
    vec3 lightDirection = normalize(uSunPosition - vWorldPosition);
    float nightSide = 1.0 - smoothstep(-0.18, 0.24, dot(normalize(vWorldNormal), lightDirection));
    vec3 emission = cityLight * vec3(1.0, 0.62, 0.28) * nightSide * 2.15;
    float alpha = max(emission.r, max(emission.g, emission.b));
    gl_FragColor = vec4(emission, alpha);
  }
`;

function Atmosphere({ radius, color, strength = 0.35 }: { radius: number; color: string; strength?: number }) {
  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(color) },
      uStrength: { value: strength },
      uSunPosition: { value: BODIES[0].position },
    }),
    [color, strength],
  );
  return (
    <mesh scale={1.025}>
      <sphereGeometry args={[radius, 48, 48]} />
      <shaderMaterial
        vertexShader={ATMOSPHERE_VERTEX_SHADER}
        fragmentShader={ATMOSPHERE_FRAGMENT_SHADER}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.BackSide}
        toneMapped={false}
      />
    </mesh>
  );
}

function createRockGeometry() {
  const geometry = new THREE.IcosahedronGeometry(BODIES[1].radius, 5);
  const positions = geometry.attributes.position as THREE.BufferAttribute;
  const point = new THREE.Vector3();
  const craters = [
    { direction: new THREE.Vector3(0.82, 0.34, 0.46).normalize(), radius: 0.34, depth: 0.12 },
    { direction: new THREE.Vector3(-0.52, 0.58, 0.63).normalize(), radius: 0.22, depth: 0.075 },
    { direction: new THREE.Vector3(0.18, -0.76, 0.62).normalize(), radius: 0.18, depth: 0.06 },
    { direction: new THREE.Vector3(-0.72, -0.42, -0.55).normalize(), radius: 0.27, depth: 0.085 },
    { direction: new THREE.Vector3(0.48, 0.72, -0.5).normalize(), radius: 0.14, depth: 0.045 },
  ];
  for (let index = 0; index < positions.count; index += 1) {
    point.fromBufferAttribute(positions, index);
    const direction = point.clone().normalize();
    let displacement =
      1 +
      Math.sin(direction.x * 15 + direction.z * 7) * 0.035 +
      Math.sin(direction.y * 23 - direction.x * 5) * 0.025;
    for (const crater of craters) {
      const angle = Math.acos(THREE.MathUtils.clamp(direction.dot(crater.direction), -1, 1));
      const normalizedDistance = angle / crater.radius;
      if (normalizedDistance < 1.2) {
        const bowl = normalizedDistance < 1 ? (Math.cos(normalizedDistance * Math.PI) + 1) * 0.5 : 0;
        const rim = Math.exp(-Math.pow((normalizedDistance - 1.02) / 0.11, 2));
        displacement += rim * crater.depth * 0.26 - bowl * crater.depth;
      }
    }
    point.multiplyScalar(displacement);
    positions.setXYZ(index, point.x, point.y, point.z);
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

export function Helios({ reducedMotion }: { reducedMotion: boolean }) {
  const surfaceTexture = useTexture(SUN_SURFACE_URL);
  useEffect(() => {
    surfaceTexture.colorSpace = THREE.SRGBColorSpace;
    surfaceTexture.wrapS = THREE.RepeatWrapping;
    surfaceTexture.anisotropy = 8;
    surfaceTexture.needsUpdate = true;
  }, [surfaceTexture]);
  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uSurfaceMap: { value: surfaceTexture } }),
    [surfaceTexture],
  );
  useFrame(({ clock }) => {
    uniforms.uTime.value = reducedMotion ? 0 : clock.elapsedTime;
  });

  return (
    <group position={BODIES[0].position}>
      <pointLight color="#fff1d8" intensity={52} distance={28} decay={1.75} castShadow shadow-mapSize={[512, 512]} />
      <mesh castShadow>
        <sphereGeometry args={[BODIES[0].radius, 96, 96]} />
        <shaderMaterial
          vertexShader={SUN_VERTEX_SHADER}
          fragmentShader={SUN_FRAGMENT_SHADER}
          uniforms={uniforms}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

export function Nyx({ reducedMotion }: { reducedMotion: boolean }) {
  const planet = useRef<THREE.Group>(null);
  const geometry = useMemo(createRockGeometry, []);
  const texture = useTexture(MARS_SURFACE_URL);
  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.anisotropy = 8;
    texture.needsUpdate = true;
  }, [texture]);
  useFrame((_, delta) => {
    if (planet.current && !reducedMotion) planet.current.rotation.y += delta * 0.12;
  });
  return (
    <group ref={planet} position={BODIES[1].position} rotation={[0.25, 1.45, -0.36]}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial
          map={texture}
          roughness={0.88}
          metalness={0}
          bumpMap={texture}
          bumpScale={0.032}
          emissive="#ff8a52"
          emissiveMap={texture}
          emissiveIntensity={0.2}
        />
      </mesh>
      <Atmosphere radius={BODIES[1].radius} color="#d58b5d" strength={0.12} />
    </group>
  );
}

function EarthNightLights({ texture }: { texture: THREE.Texture }) {
  const uniforms = useMemo(
    () => ({
      uNightMap: { value: texture },
      uSunPosition: { value: BODIES[0].position },
    }),
    [texture],
  );

  return (
    <mesh scale={1.002}>
      <sphereGeometry args={[BODIES[2].radius, 96, 96]} />
      <shaderMaterial
        vertexShader={NIGHT_LIGHTS_VERTEX_SHADER}
        fragmentShader={NIGHT_LIGHTS_FRAGMENT_SHADER}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}

export function Pelagos({ reducedMotion }: { reducedMotion: boolean }) {
  const planet = useRef<THREE.Group>(null);
  const clouds = useRef<THREE.Mesh>(null);
  const { dayTexture, cloudTexture, nightTexture } = useTexture({
    dayTexture: EARTH_DAY_URL,
    cloudTexture: EARTH_CLOUD_URL,
    nightTexture: EARTH_NIGHT_URL,
  });
  useEffect(() => {
    dayTexture.colorSpace = THREE.SRGBColorSpace;
    nightTexture.colorSpace = THREE.SRGBColorSpace;
    for (const texture of [dayTexture, cloudTexture, nightTexture]) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.anisotropy = 8;
      texture.needsUpdate = true;
    }
  }, [cloudTexture, dayTexture, nightTexture]);
  useFrame((_, delta) => {
    if (!reducedMotion) {
      if (planet.current) planet.current.rotation.y += delta * 0.07;
      if (clouds.current) clouds.current.rotation.y -= delta * 0.11;
    }
  });
  return (
    <group ref={planet} position={BODIES[2].position} rotation={[0.18, -0.25, 0.22]}>
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[BODIES[2].radius, 96, 96]} />
        <meshPhysicalMaterial
          map={dayTexture}
          bumpMap={dayTexture}
          bumpScale={0.018}
          roughness={0.54}
          metalness={0}
          clearcoat={0.4}
          clearcoatRoughness={0.24}
        />
      </mesh>
      <EarthNightLights texture={nightTexture} />
      <mesh ref={clouds} scale={1.016}>
        <sphereGeometry args={[BODIES[2].radius, 64, 64]} />
        <meshStandardMaterial
          color="#f5f7f8"
          alphaMap={cloudTexture}
          transparent
          opacity={0.72}
          alphaTest={0.08}
          depthWrite={false}
          roughness={0.9}
        />
      </mesh>
      <Atmosphere radius={BODIES[2].radius} color="#4fa7e8" strength={0.22} />
    </group>
  );
}
