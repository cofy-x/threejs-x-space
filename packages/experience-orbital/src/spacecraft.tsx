import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const PROBE_URL = new URL("./assets/astra-probe.glb", import.meta.url).href;
const MODEL_SCALE = 0.68;

interface SpacecraftProps {
  active: boolean;
  paused: boolean;
  reducedMotion: boolean;
}

const PLUME_VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vView = -viewPosition.xyz;
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const PLUME_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float lengthFade = pow(1.0 - smoothstep(0.0, 1.0, vUv.y), 1.1);
    float edgeFade = pow(abs(dot(normalize(vNormal), normalize(vView))), 0.65);
    vec3 color = mix(uColor, vec3(1.0), pow(1.0 - vUv.y, 4.0) * 0.2);
    gl_FragColor = vec4(color, uOpacity * lengthFade * edgeFade);
    #include <colorspace_fragment>
  }
`;

function PlumeLayer({ radius, length, color, opacity }: { radius: number; length: number; color: string; opacity: number }) {
  const uniforms = useMemo(() => ({
    uColor: { value: new THREE.Color(color) },
    uOpacity: { value: opacity },
  }), [color, opacity]);
  return (
    <mesh position={[0, length / 2, 0]} scale={[radius, length, radius]}>
      <coneGeometry args={[1, 1, 24, 8, true]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={PLUME_VERTEX}
        fragmentShader={PLUME_FRAGMENT}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}

function IonPlume({ active, paused, reducedMotion, position, radius, length, phase = 0 }: SpacecraftProps & {
  position: [number, number, number];
  radius: number;
  length: number;
  phase?: number;
}) {
  const flow = useRef<THREE.Group>(null);
  const pulseTime = useRef(0);
  useFrame((_, delta) => {
    if (!active) {
      pulseTime.current = 0;
      return;
    }
    if (!paused && !reducedMotion) pulseTime.current += Math.min(delta, 0.05);
    if (flow.current) flow.current.scale.y = 1 + Math.sin(pulseTime.current * 14 + phase) * 0.045;
  });

  return (
    <group position={position} visible={active}>
      <group ref={flow} rotation={[-Math.PI / 2, 0, 0]}>
        <PlumeLayer radius={radius} length={length} color="#438ee8" opacity={0.28} />
        <PlumeLayer radius={radius * 0.45} length={length * 0.74} color="#c0efff" opacity={0.68} />
      </group>
    </group>
  );
}

export function Spacecraft({ active, paused, reducedMotion }: SpacecraftProps) {
  const { scene } = useGLTF(PROBE_URL);
  const { gl } = useThree();
  const { model, ownedMaterials } = useMemo(() => {
    const model = scene.clone(true);
    const ownedMaterials = new Map<THREE.Material, THREE.Material>();
    const cloneMaterial = (material: THREE.Material) => {
      let clone = ownedMaterials.get(material);
      if (!clone) {
        clone = material.clone();
        ownedMaterials.set(material, clone);
      }
      return clone;
    };
    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;
      object.material = Array.isArray(object.material)
        ? object.material.map(cloneMaterial)
        : cloneMaterial(object.material);
    });
    return { model, ownedMaterials };
  }, [scene]);

  useEffect(() => {
    // A local reflection environment reveals manufactured edges without relighting the planets.
    const room = new RoomEnvironment();
    const generator = new THREE.PMREMGenerator(gl);
    const target = generator.fromScene(room, 0.04);
    ownedMaterials.forEach((material) => {
      if (material instanceof THREE.MeshStandardMaterial) {
        material.envMap = target.texture;
        material.envMapIntensity = 0.7;
        material.needsUpdate = true;
      }
    });
    room.dispose();
    generator.dispose();
    return () => {
      ownedMaterials.forEach((material) => {
        if (material instanceof THREE.MeshStandardMaterial) material.envMap = null;
      });
      target.dispose();
    };
  }, [gl, ownedMaterials]);

  useEffect(() => () => {
    // Geometry and textures belong to the cached GLB; only the per-mount materials are ours.
    ownedMaterials.forEach((material) => material.dispose());
  }, [ownedMaterials]);

  return (
    <group scale={MODEL_SCALE}>
      <primitive object={model} dispose={null} />
      <pointLight position={[0, 1.5, 2.2]} color="#dce8f4" intensity={1.25} distance={4.6} decay={2} />
      <pointLight position={[0, 0, -1.2]} color="#73caff" intensity={active ? 0.06 : 0} distance={1.6} decay={2} />
      <IonPlume active={active} paused={paused} reducedMotion={reducedMotion}
        position={[0, 0, -1.18]} radius={0.1} length={0.82} />
      <IonPlume active={active} paused={paused} reducedMotion={reducedMotion}
        position={[-0.47, -0.02, -0.91]} radius={0.055} length={0.46} phase={0.8} />
      <IonPlume active={active} paused={paused} reducedMotion={reducedMotion}
        position={[0.47, -0.02, -0.91]} radius={0.055} length={0.46} phase={1.6} />
    </group>
  );
}
