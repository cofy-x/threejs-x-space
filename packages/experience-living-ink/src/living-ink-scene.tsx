import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { createInkComposition } from "./ink-composition";
import { GPUComputationRenderer } from "three/addons/misc/GPUComputationRenderer.js";

export interface InkInteraction {
  active: boolean;
  burst: number;
  gesture: number;
  pigment: number;
  queue: { x: number; y: number }[];
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
}

export interface InkPalette {
  paper: string;
  pigments: [string, string, string];
}

interface LivingInkSceneProps {
  captureRequest: number;
  clearRequest: number;
  interaction: RefObject<InkInteraction>;
  palette: InkPalette;
  paused: boolean;
  reducedMotion: boolean;
  strength: number;
  turbulence: number;
  onCapture: (result: { ok: boolean; message: string }) => void;
}

const POSITION_SHADER = /* glsl */ `
  uniform float deltaTime;
  uniform vec2 pointer;
  uniform vec2 pointerPrevious;
  uniform float pointerActive;
  uniform float aspectRatio;
  uniform float motionScale;
  uniform float spawnFrame;
  uniform float spawnScale;

  float hash(vec2 value) {
    return fract(sin(dot(value, vec2(127.1, 311.7))) * 43758.5453123);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec4 positionData = texture2D(texturePosition, uv);
    vec4 velocityData = texture2D(textureVelocity, uv);
    vec2 position = positionData.xy;
    float life = max(0.0, positionData.z - deltaTime * 0.32);
    float seed = positionData.w;

    float spawnRoll = hash(vec2(seed * 19.31, spawnFrame));
    if (pointerActive > 0.02 && spawnRoll < 1.0 - pow(1.0 - 0.014 * pointerActive, spawnScale)) {
      float angle = hash(vec2(seed, spawnFrame * 0.17)) * 6.28318530718;
      vec2 pointerDelta = vec2(
        (pointer.x - pointerPrevious.x) * aspectRatio,
        pointer.y - pointerPrevious.y
      );
      float strokeSpeed = min(length(pointerDelta), 0.12);
      float radius = sqrt(hash(vec2(spawnFrame * 0.31, seed * 7.13))) * (
        0.004 + pointerActive * 0.01 + strokeSpeed * 0.022
      );
      float alongStroke = fract(seed * 91.7 + spawnFrame * 0.37);
      vec2 radialOffset = vec2(cos(angle) / aspectRatio, sin(angle)) * radius;
      position = mix(pointerPrevious, pointer, alongStroke) + radialOffset;
      life = 0.42 + hash(vec2(seed * 2.71, spawnFrame * 0.23)) * 0.38;
    } else if (life > 0.0) {
      position += velocityData.xy * deltaTime * motionScale;
      if (max(abs(position.x), abs(position.y)) > 1.04) life = 0.0;
    }

    gl_FragColor = vec4(position, life, seed);
  }
`;

const VELOCITY_SHADER = /* glsl */ `
  uniform float deltaTime;
  uniform float elapsedTime;
  uniform vec2 pointer;
  uniform vec2 pointerVelocity;
  uniform float pointerActive;
  uniform float flowStrength;
  uniform float turbulence;
  uniform float pigmentIndex;
  uniform float spawnFrame;
  uniform float spawnScale;

  float hash(vec2 value) {
    return fract(sin(dot(value, vec2(127.1, 311.7))) * 43758.5453123);
  }

  vec2 flowField(vec2 position, float time) {
    vec2 warped = position * 2.35;
    warped += vec2(
      sin(position.y * 3.7 - time * 0.21),
      cos(position.x * 3.2 + time * 0.17)
    ) * 0.42;
    return normalize(vec2(
      sin(warped.y * 2.4 + time * 0.31) + cos((warped.x + warped.y) * 1.35),
      cos(warped.x * 2.1 - time * 0.27) - sin((warped.x - warped.y) * 1.55)
    ) + vec2(0.0001));
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec4 positionData = texture2D(texturePosition, uv);
    vec4 velocityData = texture2D(textureVelocity, uv);
    vec2 position = positionData.xy;
    vec2 velocity = velocityData.xy;
    float seed = positionData.w;

    vec2 field = flowField(position, elapsedTime + seed * 0.18);
    velocity += field * deltaTime * (0.035 + turbulence * 0.085);

    vec2 offset = position - pointer;
    float distanceToPointer = length(offset);
    float influence = exp(-distanceToPointer * distanceToPointer * 34.0) * pointerActive;
    vec2 tangent = vec2(-offset.y, offset.x) / max(distanceToPointer, 0.025);
    velocity += pointerVelocity * influence * deltaTime * (0.75 + flowStrength * 1.9);
    velocity += tangent * influence * deltaTime * (0.12 + flowStrength * 0.2);

    velocity *= exp(-deltaTime * (1.55 - turbulence * 0.42));
    float speed = length(velocity);
    if (speed > 0.3) velocity *= 0.3 / speed;

    float pigment = velocityData.z;
    float spawnRoll = hash(vec2(seed * 19.31, spawnFrame));
    if (pointerActive > 0.02 && spawnRoll < 1.0 - pow(1.0 - 0.014 * pointerActive, spawnScale)) {
      float variation = hash(vec2(seed * 2.83, spawnFrame * 0.29));
      float channel = mod(pigmentIndex + (variation > 0.88 ? 1.0 : 0.0), 3.0);
      pigment = (channel + 0.12) / 3.0;
      velocity = pointerVelocity * 0.035 + field * 0.022;
    }
    gl_FragColor = vec4(velocity, pigment, 1.0);
  }
`;

const PARTICLE_VERTEX_SHADER = /* glsl */ `
  uniform sampler2D texturePositionState;
  uniform sampler2D textureVelocityState;
  uniform float pixelRatio;
  uniform float opacityScale;
  varying float vLife;
  varying float vPigment;

  void main() {
    vec4 positionData = texture2D(texturePositionState, position.xy);
    vec4 velocityData = texture2D(textureVelocityState, position.xy);
    vLife = positionData.z;
    vPigment = velocityData.z;
    gl_Position = vec4(positionData.xy, 0.0, 1.0);
    float speed = length(velocityData.xy);
    gl_PointSize = vLife > 0.0 ? (0.85 + min(speed * 6.0, 1.65)) * pixelRatio : 0.0;
  }
`;

const PARTICLE_FRAGMENT_SHADER = /* glsl */ `
  uniform float opacityScale;
  varying float vLife;
  varying float vPigment;

  void main() {
    vec2 point = gl_PointCoord - 0.5;
    float softness = 1.0 - smoothstep(0.08, 0.5, length(point));
    float alpha = softness * smoothstep(0.0, 0.4, vLife) * 0.055 * opacityScale;
    vec3 pigment = vPigment < 0.333
      ? vec3(1.0, 0.0, 0.0)
      : (vPigment < 0.666 ? vec3(0.0, 1.0, 0.0) : vec3(0.0, 0.0, 1.0));
    gl_FragColor = vec4(pigment, alpha);
  }
`;

const COPY_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D previousTrail;
  uniform float decay;
  varying vec2 vUv;

  void main() {
    vec4 trail = texture2D(previousTrail, vUv);
    gl_FragColor = vec4(trail.rgb * decay, trail.a * decay);
  }
`;

const STROKE_FRAGMENT_SHADER = /* glsl */ `
  uniform vec2 pointer;
  uniform vec2 pointerPrevious;
  uniform float aspectRatio;
  uniform float radius;
  uniform vec3 pigment;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  void main() {
    vec2 scale = vec2(aspectRatio, 1.0);
    vec2 p = (vUv * 2.0 - 1.0) * scale;
    vec2 start = pointerPrevious * scale;
    vec2 segment = (pointer - pointerPrevious) * scale;
    float t = clamp(dot(p - start, segment) / max(dot(segment, segment), 0.0000001), 0.0, 1.0);
    float distanceToStroke = length(p - start - segment * t) / radius;
    if (distanceToStroke > 1.4) discard;
    float feather = 1.0 - smoothstep(0.15, 1.4, distanceToStroke);
    float grain = 0.65 + hash(gl_FragCoord.xy) * 0.35;
    float coverage = radius < 0.01 ? min(1.0, length(segment) / (radius * 2.0)) : 1.0;
    gl_FragColor = vec4(pigment * feather * grain * coverage * 0.18, 1.0);
  }
`;

const COMPOSITE_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D trailTexture;
  uniform sampler2D pigmentTexture;
  uniform vec2 texelSize;
  uniform vec2 paperResolution;
  uniform vec3 paperColor;
  uniform vec3 pigmentA;
  uniform vec3 pigmentB;
  uniform vec3 pigmentC;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  void main() {
    vec3 dry = max(texture2D(pigmentTexture, vUv).rgb, vec3(0.0));
    vec3 wet = max(texture2D(trailTexture, vUv).rgb, vec3(0.0));
    vec3 softened = (
      texture2D(pigmentTexture, vUv + vec2(texelSize.x, 0.0)).rgb +
      texture2D(pigmentTexture, vUv - vec2(texelSize.x, 0.0)).rgb +
      texture2D(pigmentTexture, vUv + vec2(0.0, texelSize.y)).rgb +
      texture2D(pigmentTexture, vUv - vec2(0.0, texelSize.y)).rgb
    ) * 0.25;
    vec2 paperPoint = vUv * paperResolution;
    float grain = hash(floor(paperPoint)) - 0.5;
    float fibers = sin(paperPoint.y * 1.7 + sin(paperPoint.x * 0.04)) * 0.0015;
    float granulation = 0.91 + hash(floor(paperPoint * 0.65)) * 0.18;
    vec3 weights = (dry * 0.78 + softened * 0.22 + wet * 0.3) * granulation;
    // Optical absorption preserves luminous thin washes and dark overlapping fibers.
    vec3 absorption = -log(max(pigmentA, vec3(0.025))) * weights.r
      - log(max(pigmentB, vec3(0.025))) * weights.g
      - log(max(pigmentC, vec3(0.025))) * weights.b;
    float vignette = dot(vUv - 0.5, vUv - 0.5) * 0.022;
    vec3 paper = paperColor + grain * 0.013 + fibers - vignette;
    vec3 color = paper * exp(-absorption * 1.25);
    // This is the final display pass, including when read back for a PNG.
    // Encode exactly once; data render targets always stay in NoColorSpace.
    gl_FragColor = sRGBTransferOETF(vec4(max(color, vec3(0.0)), 1.0));
  }
`;

const FULLSCREEN_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

function fillInitialTextures(positionTexture: THREE.DataTexture, velocityTexture: THREE.DataTexture) {
  const positions = positionTexture.image.data as Float32Array;
  const velocities = velocityTexture.image.data as Float32Array;
  for (let index = 0; index < positions.length; index += 4) {
    positions[index + 3] = ((index / 4) * 0.61803398875) % 1;
    velocities[index + 2] = ((index / 4) % 3 + 0.12) / 3;
  }
  positionTexture.needsUpdate = true;
  velocityTexture.needsUpdate = true;
}

function makeFullscreenScene(material: THREE.ShaderMaterial) {
  const scene = new THREE.Scene();
  const geometry = new THREE.PlaneGeometry(2, 2);
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
  return { geometry, scene };
}

function downloadPixels(
  pixels: Uint8Array,
  width: number,
  height: number,
  filename: string,
  onComplete: (result: { ok: boolean; message: string }) => void,
) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    onComplete({ ok: false, message: "The artwork could not be prepared for export." });
    return;
  }

  const imageData = context.createImageData(width, height);
  for (let row = 0; row < height; row += 1) {
    const sourceStart = (height - row - 1) * width * 4;
    const targetStart = row * width * 4;
    imageData.data.set(pixels.subarray(sourceStart, sourceStart + width * 4), targetStart);
  }
  context.putImageData(imageData, 0, 0);
  canvas.toBlob((blob) => {
    if (!blob) {
      onComplete({ ok: false, message: "The artwork could not be encoded as a PNG." });
      return;
    }
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    onComplete({ ok: true, message: "Artwork saved as a PNG." });
  }, "image/png");
}

function createResources(gl: THREE.WebGLRenderer, width: number, height: number) {
  if (!gl.extensions.has("EXT_color_buffer_float")) {
    throw new Error("Living Ink needs floating-point render targets to mix pigment.");
  }
  const computationSize = width < 640 ? 128 : width < 1100 ? 192 : 256;
  const aspectRatio = Math.max(0.1, width / Math.max(height, 1));
  const trailScale = Math.min(1.5, Math.max(1, window.devicePixelRatio || 1));
  const trailWidth = Math.max(1, Math.round(width * trailScale));
  const trailHeight = Math.max(1, Math.round(height * trailScale));

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const compute = new GPUComputationRenderer(computationSize, computationSize, gl);
  compute.setDataType(THREE.FloatType);
  const initialPosition = compute.createTexture();
  const initialVelocity = compute.createTexture();
  const blankPosition = compute.createTexture();
  const blankVelocity = compute.createTexture();
  fillInitialTextures(initialPosition, initialVelocity);
  fillInitialTextures(blankPosition, blankVelocity);

  const velocityVariable = compute.addVariable("textureVelocity", VELOCITY_SHADER, initialVelocity);
  const positionVariable = compute.addVariable("texturePosition", POSITION_SHADER, initialPosition);
  compute.setVariableDependencies(velocityVariable, [velocityVariable, positionVariable]);
  compute.setVariableDependencies(positionVariable, [positionVariable, velocityVariable]);

  const pointer = new THREE.Vector2();
  const pointerPrevious = new THREE.Vector2();
  const pointerVelocity = new THREE.Vector2();
  const positionUniforms = {
    deltaTime: { value: 0 },
    pointer: { value: pointer },
    pointerPrevious: { value: pointerPrevious },
    pointerActive: { value: 0 },
    aspectRatio: { value: aspectRatio },
    motionScale: { value: 1 },
    spawnFrame: { value: 0 },
    spawnScale: { value: 1 },
  };
  const velocityUniforms = {
    deltaTime: { value: 0 },
    elapsedTime: { value: 0 },
    pointer: { value: pointer },
    pointerVelocity: { value: pointerVelocity },
    pointerActive: { value: 0 },
    flowStrength: { value: 0.62 },
    turbulence: { value: 0.48 },
    pigmentIndex: { value: 0 },
    spawnFrame: { value: 0 },
    spawnScale: { value: 1 },
  };
  Object.assign(positionVariable.material.uniforms, positionUniforms);
  Object.assign(velocityVariable.material.uniforms, velocityUniforms);

  const error = compute.init();
  if (error) {
    compute.dispose();
    positionVariable.material.dispose();
    velocityVariable.material.dispose();
    blankPosition.dispose();
    blankVelocity.dispose();
    throw new Error(error);
  }

  const references = new Float32Array(computationSize * computationSize * 3);
  for (let index = 0; index < computationSize * computationSize; index += 1) {
    references[index * 3] = (index % computationSize + 0.5) / computationSize;
    references[index * 3 + 1] = (Math.floor(index / computationSize) + 0.5) / computationSize;
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute("position", new THREE.BufferAttribute(references, 3));
  const particleUniforms = {
    texturePositionState: { value: null as THREE.Texture | null },
    textureVelocityState: { value: null as THREE.Texture | null },
    pixelRatio: { value: trailScale },
    opacityScale: { value: 1 },
  };
  const particleMaterial = new THREE.ShaderMaterial({
    vertexShader: PARTICLE_VERTEX_SHADER,
    fragmentShader: PARTICLE_FRAGMENT_SHADER,
    uniforms: particleUniforms,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false,
    transparent: true,
  });
  const particleScene = new THREE.Scene();
  particleScene.add(new THREE.Points(particleGeometry, particleMaterial));

  const makeTrailTarget = () =>
    new THREE.WebGLRenderTarget(trailWidth, trailHeight, {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
      stencilBuffer: false,
    });
  const trailTargets: [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget] = [makeTrailTarget(), makeTrailTarget()];
  const pigmentTarget = makeTrailTarget();
  const composition = createInkComposition(aspectRatio);
  const copyUniforms = {
    previousTrail: { value: null as THREE.Texture | null },
    decay: { value: 0.993 },
  };
  const copyMaterial = new THREE.ShaderMaterial({
    vertexShader: FULLSCREEN_VERTEX_SHADER,
    fragmentShader: COPY_FRAGMENT_SHADER,
    uniforms: copyUniforms,
    depthTest: false,
    depthWrite: false,
  });
  const copy = makeFullscreenScene(copyMaterial);

  const strokeUniforms = {
    pointer: positionUniforms.pointer,
    pointerPrevious: positionUniforms.pointerPrevious,
    aspectRatio: positionUniforms.aspectRatio,
    radius: { value: 0.0035 },
    pigment: { value: new THREE.Vector3() },
  };
  const strokeMaterial = new THREE.ShaderMaterial({
    vertexShader: FULLSCREEN_VERTEX_SHADER,
    fragmentShader: STROKE_FRAGMENT_SHADER,
    uniforms: strokeUniforms,
    transparent: true,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const stroke = makeFullscreenScene(strokeMaterial);

  const compositeUniforms = {
    trailTexture: { value: trailTargets[0].texture },
    pigmentTexture: { value: pigmentTarget.texture },
    texelSize: { value: new THREE.Vector2(1 / trailWidth, 1 / trailHeight) },
    paperResolution: { value: new THREE.Vector2(width, height) },
    paperColor: { value: new THREE.Color("#f3ebdd") },
    pigmentA: { value: new THREE.Color("#263b70") },
    pigmentB: { value: new THREE.Color("#d59a38") },
    pigmentC: { value: new THREE.Color("#b65349") },
  };
  const compositeMaterial = new THREE.ShaderMaterial({
    vertexShader: FULLSCREEN_VERTEX_SHADER,
    fragmentShader: COMPOSITE_FRAGMENT_SHADER,
    uniforms: compositeUniforms,
    depthTest: false,
    depthWrite: false,
  });
  const composite = makeFullscreenScene(compositeMaterial);

  const previousTarget = gl.getRenderTarget();
  const previousColor = gl.getClearColor(new THREE.Color()).clone();
  const previousAlpha = gl.getClearAlpha();
  gl.setClearColor(0x000000, 0);
  for (const target of [...trailTargets, pigmentTarget]) {
    gl.setRenderTarget(target);
    gl.clear(true, false, false);
  }
  gl.setRenderTarget(pigmentTarget);
  gl.render(composition.scene, camera);
  gl.setRenderTarget(previousTarget);
  gl.setClearColor(previousColor, previousAlpha);
  composition.dispose();

  return {
    stroke,
    strokeMaterial,
    strokeUniforms,
    pigmentTarget,
    width: trailWidth,
    height: trailHeight,
    blankPosition,
    blankVelocity,
    camera,
    composite,
    compositeMaterial,
    compositeUniforms,
    compute,
    copy,
    copyMaterial,
    copyUniforms,
    particleGeometry,
    particleMaterial,
    particleUniforms,
    particleScene,
    positionVariable,
    positionUniforms,
    trailTargets,
    velocityVariable,
    velocityUniforms,
  };

}

export function LivingInkScene({
  captureRequest,
  clearRequest,
  interaction,
  palette,
  paused,
  reducedMotion,
  strength,
  turbulence,
  onCapture,
}: LivingInkSceneProps) {
  const { gl, size } = useThree();
  const previousCapture = useRef(captureRequest);
  const previousClear = useRef(clearRequest);
  const previousGesture = useRef(0);
  const processedPointer = useRef(new THREE.Vector2());
  const elapsed = useRef(0);
  const simulationStep = useRef(0);
  const ping = useRef(0);

  const resourcesRef = useRef<ReturnType<typeof createResources> | null>(null);
  const initialSize = useRef(size);

  useEffect(() => {
    const resources = createResources(gl, initialSize.current.width, initialSize.current.height);
    resourcesRef.current = resources;
    return () => {
      resourcesRef.current = null;
      resources.compute.dispose();
      resources.positionVariable.material.dispose();
      resources.velocityVariable.material.dispose();
      resources.stroke.geometry.dispose();
      resources.strokeMaterial.dispose();
      resources.particleGeometry.dispose();
      resources.particleMaterial.dispose();
      resources.copy.geometry.dispose();
      resources.copyMaterial.dispose();
      resources.composite.geometry.dispose();
      resources.compositeMaterial.dispose();
      resources.trailTargets.forEach((target) => target.dispose());
      resources.pigmentTarget.dispose();
      resources.blankPosition.dispose();
      resources.blankVelocity.dispose();
    };
  }, [gl]);

  useEffect(() => {
    const resources = resourcesRef.current;
    if (!resources) return;
    const scale = Math.min(1.5, Math.max(1, window.devicePixelRatio || 1));
    const width = Math.max(1, Math.round(size.width * scale));
    const height = Math.max(1, Math.round(size.height * scale));
    if (width === resources.width && height === resources.height) return;
    const previousTarget = gl.getRenderTarget();
    resources.copyUniforms.decay.value = 1;
    const resize = (source: THREE.WebGLRenderTarget) => {
      const target = source.clone();
      target.setSize(width, height);
      resources.copyUniforms.previousTrail.value = source.texture;
      gl.setRenderTarget(target);
      gl.render(resources.copy.scene, resources.camera);
      source.dispose();
      return target;
    };
    resources.trailTargets = [resize(resources.trailTargets[0]), resize(resources.trailTargets[1])];
    resources.pigmentTarget = resize(resources.pigmentTarget);
    resources.compositeUniforms.pigmentTexture.value = resources.pigmentTarget.texture;
    resources.compositeUniforms.texelSize.value.set(1 / width, 1 / height);
    resources.particleUniforms.pixelRatio.value = scale;
    resources.width = width;
    resources.height = height;
    gl.setRenderTarget(previousTarget);
  }, [gl, size.height, size.width]);

  useFrame((_, rawDelta) => {
    const resources = resourcesRef.current;
    if (!resources) return;
    const frameDelta = Math.min(rawDelta, 1 / 30);
    const delta = frameDelta;
    const spawnScale = frameDelta * 60 * (192 * 192) / resources.particleGeometry.getAttribute("position").count;
    const pointerState = interaction.current;
    if (!pointerState) return;
    const queuedPoints = pointerState.queue ?? (pointerState.queue = []);
    pointerState.gesture ??= 0;
    pointerState.pigment ??= 0;
    pointerState.burst *= Math.exp(-rawDelta * 8.0);
    let beganGesture = false;
    if (pointerState.gesture !== previousGesture.current) {
      previousGesture.current = pointerState.gesture;
      beganGesture = queuedPoints.length > 0 || pointerState.active;
      const firstPoint = queuedPoints.shift();
      processedPointer.current.set(firstPoint?.x ?? pointerState.x, firstPoint?.y ?? pointerState.y);
    }
    const nextPoint = queuedPoints.pop();
    queuedPoints.length = 0;
    const pointerX = nextPoint?.x ?? pointerState.x;
    const pointerY = nextPoint?.y ?? pointerState.y;
    const hasQueuedStroke = Boolean(nextPoint) || queuedPoints.length > 0;
    const gestureActive = pointerState.active || hasQueuedStroke || beganGesture;
    const pointerActive = gestureActive ? Math.min(1, 0.64 + pointerState.burst * 0.22) : 0;

    if (clearRequest !== previousClear.current) {
      previousClear.current = clearRequest;
      resources.compute.renderTexture(
        resources.blankPosition,
        resources.compute.getCurrentRenderTarget(resources.positionVariable),
      );
      resources.compute.renderTexture(
        resources.blankPosition,
        resources.compute.getAlternateRenderTarget(resources.positionVariable),
      );
      resources.compute.renderTexture(
        resources.blankVelocity,
        resources.compute.getCurrentRenderTarget(resources.velocityVariable),
      );
      resources.compute.renderTexture(
        resources.blankVelocity,
        resources.compute.getAlternateRenderTarget(resources.velocityVariable),
      );
      const currentTarget = gl.getRenderTarget();
      const currentColor = gl.getClearColor(new THREE.Color()).clone();
      const currentAlpha = gl.getClearAlpha();
      gl.setClearColor(0x000000, 0);
      [...resources.trailTargets, resources.pigmentTarget].forEach((target) => {
        gl.setRenderTarget(target);
        gl.clear(true, false, false);
      });
      gl.setRenderTarget(currentTarget);
      gl.setClearColor(currentColor, currentAlpha);
    }

    if (!paused) {
      elapsed.current += delta;
      simulationStep.current = (simulationStep.current + 1) % 100_000;
      const positionUniforms = resources.positionUniforms;
      const velocityUniforms = resources.velocityUniforms;
      positionUniforms.deltaTime.value = delta;
      positionUniforms.motionScale.value = reducedMotion ? 0.12 : 1;
      positionUniforms.aspectRatio.value = Math.max(0.1, size.width / Math.max(size.height, 1));
      positionUniforms.pointerPrevious.value.copy(processedPointer.current);
      positionUniforms.pointer.value.set(pointerX, pointerY);
      positionUniforms.pointerActive.value = pointerActive;
      positionUniforms.spawnFrame.value = simulationStep.current;
      positionUniforms.spawnScale.value = spawnScale;
      velocityUniforms.deltaTime.value = delta;
      velocityUniforms.elapsedTime.value = elapsed.current;
      velocityUniforms.pointer.value.set(pointerX, pointerY);
      velocityUniforms.pointerVelocity.value.set(pointerState.velocityX, pointerState.velocityY);
      velocityUniforms.pointerActive.value = pointerActive;
      velocityUniforms.flowStrength.value = reducedMotion ? strength * 0.12 : strength;
      velocityUniforms.turbulence.value = reducedMotion ? 0 : turbulence;
      velocityUniforms.pigmentIndex.value = pointerState.pigment;
      velocityUniforms.spawnFrame.value = simulationStep.current;
      velocityUniforms.spawnScale.value = spawnScale;
      resources.compute.compute();
      processedPointer.current.set(pointerX, pointerY);

      resources.particleUniforms.texturePositionState.value = resources.compute.getCurrentRenderTarget(
        resources.positionVariable,
      ).texture;
      resources.particleUniforms.textureVelocityState.value = resources.compute.getCurrentRenderTarget(
        resources.velocityVariable,
      ).texture;

      const source = ping.current === 0 ? resources.trailTargets[0] : resources.trailTargets[1];
      const destination = ping.current === 0 ? resources.trailTargets[1] : resources.trailTargets[0];
      resources.copyUniforms.previousTrail.value = source.texture;
      resources.copyUniforms.decay.value = Math.pow(0.975, frameDelta * 60);
      const deposition = frameDelta * 60 * (reducedMotion ? 0.18 : 1);
      resources.particleUniforms.opacityScale.value = deposition;
      gl.setRenderTarget(destination);
      gl.setClearColor(0x000000, 0);
      gl.clear(true, false, false);
      gl.render(resources.copy.scene, resources.camera);
      gl.autoClear = false;
      gl.render(resources.particleScene, resources.camera);
      gl.setRenderTarget(resources.pigmentTarget);
      resources.particleUniforms.opacityScale.value = deposition * 0.24;
      gl.render(resources.particleScene, resources.camera);
      // Lay down each new segment once. This keeps fast and gentle-mode input
      // continuous without widening particle emission or replaying old samples.
      const moved = positionUniforms.pointer.value.distanceToSquared(positionUniforms.pointerPrevious.value) > 0.00000025;
      if (gestureActive && (moved || beganGesture)) {
        resources.strokeUniforms.radius.value = moved ? 0.0035 : 0.014;
        resources.strokeUniforms.pigment.value.set(
          pointerState.pigment === 0 ? 1 : 0,
          pointerState.pigment === 1 ? 1 : 0,
          pointerState.pigment === 2 ? 1 : 0,
        );
        gl.render(resources.stroke.scene, resources.camera);
      }
      gl.autoClear = true;
      ping.current = 1 - ping.current;
    }

    const latestTrail = ping.current === 0 ? resources.trailTargets[0] : resources.trailTargets[1];
    resources.compositeUniforms.trailTexture.value = latestTrail.texture;
    resources.compositeUniforms.paperResolution.value.set(size.width, size.height);
    resources.compositeUniforms.paperColor.value.set(palette.paper);
    resources.compositeUniforms.pigmentA.value.set(palette.pigments[0]);
    resources.compositeUniforms.pigmentB.value.set(palette.pigments[1]);
    resources.compositeUniforms.pigmentC.value.set(palette.pigments[2]);
    gl.setRenderTarget(null);
    gl.render(resources.composite.scene, resources.camera);

    if (captureRequest !== previousCapture.current) {
      previousCapture.current = captureRequest;
      const aspect = Math.max(0.1, size.width / Math.max(size.height, 1));
      const exportWidth = aspect >= 1 ? 2048 : Math.round(2048 * aspect);
      const exportHeight = aspect >= 1 ? Math.round(2048 / aspect) : 2048;
      const exportTarget = new THREE.WebGLRenderTarget(exportWidth, exportHeight, {
        type: THREE.UnsignedByteType,
        depthBuffer: false,
        stencilBuffer: false,
      });
      try {
        gl.setRenderTarget(exportTarget);
        gl.render(resources.composite.scene, resources.camera);
        const pixels = new Uint8Array(exportWidth * exportHeight * 4);
        gl.readRenderTargetPixels(exportTarget, 0, 0, exportWidth, exportHeight, pixels);
        const stamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
        downloadPixels(pixels, exportWidth, exportHeight, `living-ink-${stamp}.png`, onCapture);
      } catch {
        onCapture({ ok: false, message: "The artwork could not be exported. Please try again." });
      } finally {
        gl.setRenderTarget(null);
        exportTarget.dispose();
      }
    }
  }, 1);

  return null;
}
