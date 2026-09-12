import { Billboard, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { BODIES } from "./space-config";

const EARTH_DAY_URL = new URL("./assets/earth-blue-marble.png", import.meta.url).href;
const EARTH_CLOUD_URL = new URL("./assets/earth-clouds.jpg", import.meta.url).href;
const EARTH_NIGHT_URL = new URL("./assets/earth-night-lights.jpg", import.meta.url).href;
const SUN_SURFACE_URL = new URL("./assets/sun-sdo-surface.jpg", import.meta.url).href;
const MARS_SURFACE_URL = new URL("./assets/mars-viking.jpg", import.meta.url).href;

const SURFACE_VERTEX_SHADER = `
  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  void main() {
    vUv = uv;
    vPosition = position;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const SUN_FRAGMENT_SHADER = `
  uniform float uTime;
  uniform sampler2D uSurfaceMap;
  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
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
    vec3 normal = normalize(vWorldNormal);
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    float facing = max(dot(normal, viewDirection), 0.0);
    vec3 observation = texture2D(uSurfaceMap, vUv + vec2(uTime * 0.0008, 0.0)).rgb;
    float photosphere = dot(observation, vec3(0.2126, 0.7152, 0.0722));
    float sunspot = 1.0 - smoothstep(0.055, 0.3, photosphere);
    vec3 drift = vec3(uTime * 0.018, -uTime * 0.012, 0.0);
    float broadCells = noise3(vPosition * 4.2 + drift);
    float convection = noise3(vPosition * 13.0 - drift * 0.7);
    float granules = noise3(vPosition * 52.0 + drift * 1.6);
    float heat = smoothstep(0.25, 0.76, broadCells * 0.24 + convection * 0.56 + granules * 0.2);
    // Convection has several scales; fine grains must not flatten the golden disk.
    vec3 color = mix(vec3(0.64, 0.1, 0.012), vec3(1.42, 0.63, 0.13), heat);
    color *= 0.43 + 0.57 * pow(facing, 0.42);
    color *= (0.9 + photosphere * 0.2) * (1.0 - sunspot * 0.9);
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;

const EARTH_FRAGMENT_SHADER = `
  uniform sampler2D uDayMap;
  uniform sampler2D uNightMap;
  uniform vec3 uSunPosition;
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  void main() {
    vec3 normal = normalize(vWorldNormal);
    vec3 lightDirection = normalize(uSunPosition - vWorldPosition);
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    float illumination = dot(normal, lightDirection);
    float daylight = smoothstep(-0.12, 0.22, illumination);
    vec3 source = texture2D(uDayMap, vUv).rgb;
    // The source's nearly black open ocean needs a water response, not albedo relief.
    float ocean = smoothstep(0.006, 0.025, source.b - max(source.r, source.g));
    ocean *= 1.0 - smoothstep(0.045, 0.16, max(source.r, source.g));
    vec3 surface = mix(source, vec3(0.013, 0.055, 0.15), ocean * 0.88);
    vec3 color = surface * (0.022 + daylight * (0.22 + max(illumination, 0.0) * 1.45));
    vec3 halfDirection = normalize(lightDirection + viewDirection);
    float glint = pow(max(dot(normal, halfDirection), 0.0), 72.0);
    color += vec3(0.6, 0.76, 0.94) * glint * ocean * daylight * 0.35;
    vec3 cities = texture2D(uNightMap, vUv).rgb;
    float lights = pow(max(max(cities.r, cities.g) - 0.12, 0.0), 2.3);
    color += vec3(1.0, 0.5, 0.13) * lights * (1.0 - smoothstep(-0.2, 0.08, illumination)) * 0.72;
    float fresnel = pow(1.0 - max(dot(normal, viewDirection), 0.0), 3.5);
    color += vec3(0.07, 0.27, 0.56) * fresnel * daylight * 0.25;
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const CLOUD_FRAGMENT_SHADER = `
  uniform sampler2D uCloudMap;
  uniform vec3 uSunPosition;
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  void main() {
    float cloud = texture2D(uCloudMap, vUv).g;
    float density = smoothstep(0.2, 0.82, cloud);
    float illumination = dot(normalize(vWorldNormal), normalize(uSunPosition - vWorldPosition));
    float daylight = smoothstep(-0.1, 0.25, illumination);
    vec3 color = mix(vec3(0.016, 0.027, 0.045), vec3(0.87, 0.93, 1.0), daylight);
    color *= 0.33 + max(illumination, 0.0) * 1.1;
    gl_FragColor = vec4(color, density * 0.76);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const ATMOSPHERE_FRAGMENT_SHADER = `
  uniform vec3 uColor;
  uniform float uStrength;
  uniform vec3 uSunPosition;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  void main() {
    vec3 normal = normalize(vWorldNormal);
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    vec3 sunDirection = normalize(uSunPosition - vWorldPosition);
    // Back-side shells need abs: clamping a negative dot makes the whole shell glow.
    float fresnel = pow(1.0 - abs(dot(normal, viewDirection)), 3.2);
    float daylight = smoothstep(-0.2, 0.45, dot(normal, sunDirection));
    gl_FragColor = vec4(uColor, fresnel * uStrength * (0.08 + daylight * 0.92));
    #include <colorspace_fragment>
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
    <mesh scale={1.018}>
      <sphereGeometry args={[radius, 64, 48]} />
      <shaderMaterial
        vertexShader={SURFACE_VERTEX_SHADER}
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
  useFrame((_, delta) => {
    if (!reducedMotion) uniforms.uTime.value += Math.min(delta, 0.05);
  });

  return (
    <group position={BODIES[0].position}>
      <pointLight color="#fff4e5" intensity={42} distance={28} decay={1.75} castShadow shadow-mapSize={[512, 512]} />
      <Billboard>
        <mesh>
          <planeGeometry args={[BODIES[0].radius * 5, BODIES[0].radius * 5]} />
          <shaderMaterial transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false}
            vertexShader={`varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`}
            fragmentShader={`varying vec2 vUv; void main() {
              float radius = length(vUv - 0.5);
              float glow = exp(-radius * radius * 38.0) * 0.2;
              gl_FragColor = vec4(1.0, 0.42, 0.12, glow);
            }`}
          />
        </mesh>
      </Billboard>
      {/* The photosphere must not cast a shadow around its own central light. */}
      <mesh>
        <sphereGeometry args={[BODIES[0].radius, 96, 64]} />
        <shaderMaterial
          vertexShader={SURFACE_VERTEX_SHADER}
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
  const texture = useTexture(MARS_SURFACE_URL);
  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.anisotropy = 8;
    texture.needsUpdate = true;
  }, [texture]);
  useFrame((_, delta) => {
    if (planet.current && !reducedMotion) planet.current.rotation.y += delta * 0.045;
  });
  return (
    <group ref={planet} position={BODIES[1].position} rotation={[0.25, 1.45, -0.36]}>
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[BODIES[1].radius, 96, 64]} />
        <meshStandardMaterial
          map={texture}
          color="#edc6ad"
          roughness={0.94}
          metalness={0}
          bumpMap={texture}
          bumpScale={0.003}
        />
      </mesh>
      <Atmosphere radius={BODIES[1].radius} color="#d59874" strength={0.13} />
    </group>
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
  const surfaceUniforms = useMemo(
    () => ({
      uDayMap: { value: dayTexture },
      uNightMap: { value: nightTexture },
      uSunPosition: { value: BODIES[0].position },
    }),
    [dayTexture, nightTexture],
  );
  const cloudUniforms = useMemo(
    () => ({ uCloudMap: { value: cloudTexture }, uSunPosition: { value: BODIES[0].position } }),
    [cloudTexture],
  );
  useFrame((_, delta) => {
    if (!reducedMotion) {
      if (planet.current) planet.current.rotation.y += delta * 0.025;
      if (clouds.current) clouds.current.rotation.y += delta * 0.012;
    }
  });
  return (
    <group ref={planet} position={BODIES[2].position} rotation={[0.18, -0.25, 0.22]}>
      <mesh castShadow>
        <sphereGeometry args={[BODIES[2].radius, 96, 64]} />
        <shaderMaterial vertexShader={SURFACE_VERTEX_SHADER} fragmentShader={EARTH_FRAGMENT_SHADER} uniforms={surfaceUniforms} />
      </mesh>
      <mesh ref={clouds} scale={1.009}>
        <sphereGeometry args={[BODIES[2].radius, 64, 48]} />
        <shaderMaterial
          vertexShader={SURFACE_VERTEX_SHADER}
          fragmentShader={CLOUD_FRAGMENT_SHADER}
          uniforms={cloudUniforms}
          transparent
          depthWrite={false}
        />
      </mesh>
      <Atmosphere radius={BODIES[2].radius} color="#69b8ff" strength={0.45} />
    </group>
  );
}
