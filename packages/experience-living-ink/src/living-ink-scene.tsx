import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
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
    float life = max(0.0, positionData.z - deltaTime * 0.075);
    float seed = positionData.w;

    float spawnRoll = hash(vec2(seed * 19.31, spawnFrame));
    if (pointerActive > 0.02 && spawnRoll < 0.028 * pointerActive * spawnScale) {
      float angle = hash(vec2(seed, spawnFrame * 0.17)) * 6.28318530718;
      vec2 pointerDelta = vec2(
        (pointer.x - pointerPrevious.x) * aspectRatio,
        pointer.y - pointerPrevious.y
      );
      float strokeSpeed = min(length(pointerDelta), 0.12);
      float radius = sqrt(hash(vec2(spawnFrame * 0.31, seed * 7.13))) * (
        0.005 + pointerActive * 0.018 + strokeSpeed * 0.05
      );
      float alongStroke = fract(seed * 91.7 + spawnFrame * 0.37);
      vec2 radialOffset = vec2(cos(angle) / aspectRatio, sin(angle)) * radius;
      position = mix(pointerPrevious, pointer, alongStroke) + radialOffset;
      life = 0.72 + hash(vec2(seed * 2.71, spawnFrame * 0.23)) * 0.28;
    } else if (life > 0.0) {
      position += velocityData.xy * deltaTime;
      position = mod(position + 1.0, 2.0) - 1.0;
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

    vec2 field = flowField(position, elapsedTime + seed * 3.0);
    velocity += field * deltaTime * (0.075 + turbulence * 0.14);

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
    if (pointerActive > 0.02 && spawnRoll < 0.028 * pointerActive * spawnScale) {
      float variation = hash(vec2(seed * 2.83, spawnFrame * 0.29));
      float channel = mod(pigmentIndex + (variation > 0.88 ? 1.0 : 0.0), 3.0);
      pigment = (channel + 0.12) / 3.0;
    }
    gl_FragColor = vec4(velocity, pigment, 1.0);
  }
`;

const PARTICLE_VERTEX_SHADER = /* glsl */ `
  uniform sampler2D texturePositionState;
  uniform sampler2D textureVelocityState;
  uniform float pixelRatio;
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
  varying float vLife;
  varying float vPigment;

  void main() {
    vec2 point = gl_PointCoord - 0.5;
    float softness = smoothstep(0.5, 0.08, length(point));
    float alpha = softness * smoothstep(0.0, 0.22, vLife) * 0.09;
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

const COMPOSITE_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D trailTexture;
  uniform vec3 paperColor;
  uniform vec3 pigmentA;
  uniform vec3 pigmentB;
  uniform vec3 pigmentC;
  uniform float elapsedTime;
  varying vec2 vUv;

  float hash(vec2 value) {
    return fract(sin(dot(value, vec2(127.1, 311.7))) * 43758.5453123);
  }

  void main() {
    vec3 weights = max(texture2D(trailTexture, vUv).rgb, vec3(0.0));
    float total = weights.r + weights.g + weights.b;
    vec3 pigment = (
      pigmentA * weights.r + pigmentB * weights.g + pigmentC * weights.b
    ) / max(total, 0.0001);
    float density = 1.0 - exp(-total * 3.05);
    float grain = hash(floor(vUv * vec2(920.0, 620.0))) - 0.5;
    float broadFiber = sin(vUv.y * 840.0 + sin(vUv.x * 31.0)) * 0.0022;
    vec3 paper = paperColor + vec3(grain * 0.012 + broadFiber);
    vec3 color = mix(paper, pigment, smoothstep(0.0, 0.94, density));
    color -= vec3(density * density * 0.035);
    color += vec3(sin(elapsedTime * 0.03) * 0.00001);
    gl_FragColor = vec4(color, 1.0);
  }
`;

const FULLSCREEN_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

function fillInitialTextures(positionTexture: THREE.DataTexture, velocityTexture: THREE.DataTexture, active: boolean) {
  const positions = positionTexture.image.data as Float32Array;
  const velocities = velocityTexture.image.data as Float32Array;

  for (let index = 0; index < positions.length; index += 4) {
    const particle = index / 4;
    const seed = (particle * 0.61803398875) % 1;
    const channel = particle % 3;
    const t = seed * 2 - 1;
    const phase = channel * 1.82;
    const thread = ((particle * 0.173) % 1) - 0.5;
    const wave = t * 3.15 + phase;
    positions[index] = t * 0.7 + Math.cos(phase) * 0.08 + thread * 0.025;
    positions[index + 1] = Math.sin(wave) * 0.16 + (channel - 1) * 0.038 + thread * 0.052;
    positions[index + 2] = active && particle % 4 === 0 ? 0.3 + ((particle * 0.347) % 1) * 0.62 : 0;
    positions[index + 3] = seed;
    velocities[index] = 0.014 + seed * 0.018;
    velocities[index + 1] = Math.cos(wave) * (0.018 + seed * 0.02);
    velocities[index + 2] = (channel + 0.12) / 3;
    velocities[index + 3] = 1;
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
  const previousGesture = useRef(-1);
  const processedPointer = useRef(new THREE.Vector2());
  const elapsed = useRef(0);
  const simulationStep = useRef(0);
  const ping = useRef(0);

  const computationSize = size.width < 640 ? 128 : size.width < 1100 ? 192 : 256;
  const aspectRatio = Math.max(0.1, size.width / Math.max(size.height, 1));
  const trailScale = Math.min(1.25, Math.max(0.75, window.devicePixelRatio || 1));
  const trailWidth = Math.max(1, Math.round(size.width * trailScale));
  const trailHeight = Math.max(1, Math.round(size.height * trailScale));

  const resources = useMemo(() => {
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const compute = new GPUComputationRenderer(computationSize, computationSize, gl);
    compute.setDataType(THREE.HalfFloatType);
    const initialPosition = compute.createTexture();
    const initialVelocity = compute.createTexture();
    const blankPosition = compute.createTexture();
    const blankVelocity = compute.createTexture();
    fillInitialTextures(initialPosition, initialVelocity, true);
    fillInitialTextures(blankPosition, blankVelocity, false);

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
    if (error) throw new Error(error);

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

    const compositeUniforms = {
      trailTexture: { value: trailTargets[0].texture },
      paperColor: { value: new THREE.Color("#f3ebdd") },
      pigmentA: { value: new THREE.Color("#263b70") },
      pigmentB: { value: new THREE.Color("#d59a38") },
      pigmentC: { value: new THREE.Color("#b65349") },
      elapsedTime: { value: 0 },
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
    for (const target of trailTargets) {
      gl.setRenderTarget(target);
      gl.clear(true, false, false);
    }
    gl.setRenderTarget(previousTarget);
    gl.setClearColor(previousColor, previousAlpha);

    return {
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
  }, [aspectRatio, computationSize, gl, trailHeight, trailScale, trailWidth]);

  useEffect(() => {
    resources.compositeUniforms.paperColor.value.set(palette.paper);
    resources.compositeUniforms.pigmentA.value.set(palette.pigments[0]);
    resources.compositeUniforms.pigmentB.value.set(palette.pigments[1]);
    resources.compositeUniforms.pigmentC.value.set(palette.pigments[2]);
  }, [palette, resources]);

  useEffect(
    () => () => {
      resources.compute.dispose();
      resources.particleGeometry.dispose();
      resources.particleMaterial.dispose();
      resources.copy.geometry.dispose();
      resources.copyMaterial.dispose();
      resources.composite.geometry.dispose();
      resources.compositeMaterial.dispose();
      resources.trailTargets.forEach((target) => target.dispose());
      resources.blankPosition.dispose();
      resources.blankVelocity.dispose();
    },
    [resources],
  );

  useFrame((_, rawDelta) => {
    const frameDelta = Math.min(rawDelta, 1 / 30);
    const delta = frameDelta * (reducedMotion ? 0.32 : 1);
    const spawnScale = frameDelta * 60;
    const pointerState = interaction.current;
    if (!pointerState) return;
    const queuedPoints = pointerState.queue ?? (pointerState.queue = []);
    pointerState.gesture ??= 0;
    pointerState.pigment ??= 0;
    pointerState.burst *= Math.exp(-rawDelta * 8.0);
    let beganGesture = false;
    if (pointerState.gesture !== previousGesture.current) {
      previousGesture.current = pointerState.gesture;
      beganGesture = true;
      const firstPoint = queuedPoints.shift();
      processedPointer.current.set(firstPoint?.x ?? pointerState.x, firstPoint?.y ?? pointerState.y);
    }
    const nextPoint = queuedPoints.shift();
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
      resources.trailTargets.forEach((target) => {
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
      velocityUniforms.flowStrength.value = strength;
      velocityUniforms.turbulence.value = turbulence;
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
      resources.copyUniforms.decay.value = Math.pow(reducedMotion ? 0.986 : 0.993, frameDelta * 60);
      gl.setRenderTarget(destination);
      gl.setClearColor(0x000000, 0);
      gl.clear(true, false, false);
      gl.render(resources.copy.scene, resources.camera);
      gl.autoClear = false;
      gl.render(resources.particleScene, resources.camera);
      gl.autoClear = true;
      ping.current = 1 - ping.current;
    }

    const latestTrail = ping.current === 0 ? resources.trailTargets[0] : resources.trailTargets[1];
    resources.compositeUniforms.trailTexture.value = latestTrail.texture;
    resources.compositeUniforms.elapsedTime.value = elapsed.current;
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
      gl.setRenderTarget(exportTarget);
      gl.render(resources.composite.scene, resources.camera);
      const pixels = new Uint8Array(exportWidth * exportHeight * 4);
      gl.readRenderTargetPixels(exportTarget, 0, 0, exportWidth, exportHeight, pixels);
      gl.setRenderTarget(null);
      exportTarget.dispose();
      const stamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
      downloadPixels(pixels, exportWidth, exportHeight, `living-ink-${stamp}.png`, onCapture);
    }
  }, 1);

  return null;
}
