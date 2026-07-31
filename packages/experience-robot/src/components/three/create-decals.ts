import {
  CanvasTexture,
  CircleGeometry,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
} from "three";

function makeCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  return [canvas, ctx];
}

function toTexture(canvas: HTMLCanvasElement): CanvasTexture {
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  return texture;
}

export function textTexture(
  text: string,
  options: { fontSize?: number; color?: string; alpha?: number; letterSpacing?: number; mirror?: boolean } = {},
): CanvasTexture {
  const { fontSize = 40, color = "#3a3a38", alpha = 0.72, letterSpacing = 4, mirror = false } = options;
  const pad = fontSize * 0.6;
  const [measureCanvas, measureCtx] = makeCanvas(8, 8);
  measureCtx.font = `700 ${fontSize}px ui-monospace, Menlo, monospace`;
  const textWidth = measureCtx.measureText(text).width + letterSpacing * text.length;
  const width = Math.ceil(textWidth + pad * 2);
  const height = Math.ceil(fontSize * 1.5 + pad * 0.8);
  void measureCanvas;

  const [canvas, ctx] = makeCanvas(width, height);
  ctx.font = `700 ${fontSize}px ui-monospace, Menlo, monospace`;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  if (mirror) {
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
  }
  let x = pad;
  for (const char of text) {
    ctx.fillText(char, x, height / 2);
    x += ctx.measureText(char).width + letterSpacing;
  }
  return toTexture(canvas);
}

export function cautionStripeTexture(): CanvasTexture {
  const [canvas, ctx] = makeCanvas(256, 64);
  ctx.fillStyle = "#d8b93a";
  ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = "#2c2b29";
  for (let x = -64; x < 256; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 64);
    ctx.lineTo(x + 32, 0);
    ctx.lineTo(x + 64, 0);
    ctx.lineTo(x + 32, 64);
    ctx.closePath();
    ctx.fill();
  }
  return toTexture(canvas);
}

export function lensIrisTexture(): CanvasTexture {
  const size = 512;
  const [canvas, ctx] = makeCanvas(size, size);
  const center = size / 2;

  ctx.clearRect(0, 0, size, size);
  const gradient = ctx.createRadialGradient(center, center, size * 0.08, center, center, size * 0.5);
  gradient.addColorStop(0, "rgba(20, 21, 16, 0.95)");
  gradient.addColorStop(0.55, "rgba(58, 60, 46, 0.9)");
  gradient.addColorStop(1, "rgba(30, 31, 24, 0.95)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(center, center, size * 0.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(150, 152, 128, 0.55)";
  ctx.lineWidth = size * 0.012;
  for (const r of [0.46, 0.36, 0.24]) {
    ctx.beginPath();
    ctx.arc(center, center, size * r, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(12, 12, 10, 0.85)";
  for (let i = 0; i < 6; i += 1) {
    const angle = (i / 6) * Math.PI * 2;
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(size * 0.22, -size * 0.05);
    ctx.lineTo(size * 0.26, size * 0.06);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  ctx.fillStyle = "rgba(8, 8, 6, 0.95)";
  ctx.beginPath();
  ctx.arc(center, center, size * 0.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(235, 240, 220, 0.85)";
  ctx.beginPath();
  ctx.arc(center - size * 0.16, center - size * 0.18, size * 0.045, 0, Math.PI * 2);
  ctx.fill();

  return toTexture(canvas);
}

export function scaleRingTexture(): CanvasTexture {
  const size = 256;
  const [canvas, ctx] = makeCanvas(size, size);
  const center = size / 2;
  ctx.strokeStyle = "rgba(40, 40, 38, 0.75)";
  for (let i = 0; i < 36; i += 1) {
    const angle = (i / 36) * Math.PI * 2;
    const major = i % 9 === 0;
    const r1 = size * (major ? 0.34 : 0.38);
    const r2 = size * 0.44;
    ctx.lineWidth = major ? 5 : 2;
    ctx.beginPath();
    ctx.moveTo(center + Math.cos(angle) * r1, center + Math.sin(angle) * r1);
    ctx.lineTo(center + Math.cos(angle) * r2, center + Math.sin(angle) * r2);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(40, 40, 38, 0.5)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(center, center, size * 0.45, 0, Math.PI * 2);
  ctx.stroke();
  return toTexture(canvas);
}

export function arrowMarkTexture(): CanvasTexture {
  const [canvas, ctx] = makeCanvas(96, 128);
  ctx.fillStyle = "rgba(200, 60, 45, 0.9)";
  ctx.beginPath();
  ctx.moveTo(48, 12);
  ctx.lineTo(80, 68);
  ctx.lineTo(16, 68);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(240, 240, 238, 0.9)";
  ctx.fillRect(44, 76, 8, 40);
  return toTexture(canvas);
}

export function hotLabelTexture(): CanvasTexture {
  const [canvas, ctx] = makeCanvas(192, 96);
  ctx.fillStyle = "#d8b93a";
  ctx.fillRect(0, 0, 192, 96);
  ctx.strokeStyle = "#2c2b29";
  ctx.lineWidth = 8;
  ctx.strokeRect(6, 6, 180, 84);
  ctx.fillStyle = "#2c2b29";
  ctx.font = "700 48px ui-monospace, Menlo, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("HOT", 96, 52);
  return toTexture(canvas);
}

export function holoDisplayTexture(): CanvasTexture {
  const [canvas, ctx] = makeCanvas(512, 320);
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, 512, 320);

  ctx.strokeStyle = "rgba(80, 200, 255, 0.25)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= 512; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 320);
    ctx.stroke();
  }
  for (let y = 0; y <= 320; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(120, 225, 255, 0.95)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let x = 0; x <= 512; x += 8) {
    const y = 180 + Math.sin(x * 0.045) * 42 * Math.sin(x * 0.008) + Math.sin(x * 0.12) * 8;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.fillStyle = "rgba(120, 225, 255, 0.9)";
  ctx.font = "700 34px ui-monospace, Menlo, monospace";
  ctx.fillText("SYS OK", 28, 52);
  ctx.font = "600 22px ui-monospace, Menlo, monospace";
  ctx.fillStyle = "rgba(120, 225, 255, 0.55)";
  ctx.fillText("RX-04 · CORE 98%", 28, 292);

  ctx.fillStyle = "rgba(120, 225, 255, 0.12)";
  for (let y = 0; y < 320; y += 6) {
    ctx.fillRect(0, y, 512, 2);
  }
  return toTexture(canvas);
}

export function waveformTexture(): CanvasTexture {
  const [canvas, ctx] = makeCanvas(256, 128);
  ctx.fillStyle = "#0a0f0c";
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = "rgba(70, 220, 140, 0.9)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = 0; x <= 256; x += 4) {
    const y = 64 + Math.sin(x * 0.09) * 26 + Math.sin(x * 0.31) * 8;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.fillStyle = "rgba(70, 220, 140, 0.5)";
  ctx.font = "600 18px ui-monospace, Menlo, monospace";
  ctx.fillText("PWR", 12, 24);
  return toTexture(canvas);
}

export function backdropGradientTexture(): CanvasTexture {
  const [canvas, ctx] = makeCanvas(64, 1024);
  const gradient = ctx.createLinearGradient(0, 0, 0, 1024);
  gradient.addColorStop(0, "#8f8c84");
  gradient.addColorStop(0.45, "#7a7770");
  gradient.addColorStop(1, "#54524d");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 1024);
  return toTexture(canvas);
}

export function pedestalMarkTexture(): CanvasTexture {
  const size = 1024;
  const [canvas, ctx] = makeCanvas(size, size);
  const center = size / 2;

  ctx.clearRect(0, 0, size, size);
  ctx.strokeStyle = "rgba(210, 207, 200, 0.9)";
  ctx.fillStyle = "rgba(210, 207, 200, 0.9)";
  for (let i = 0; i < 60; i += 1) {
    const angle = (i / 60) * Math.PI * 2;
    const long = i % 15 === 0;
    const r1 = size * (long ? 0.4 : 0.42);
    const r2 = size * 0.44;
    ctx.lineWidth = long ? 6 : 3;
    ctx.beginPath();
    ctx.moveTo(center + Math.cos(angle) * r1, center + Math.sin(angle) * r1);
    ctx.lineTo(center + Math.cos(angle) * r2, center + Math.sin(angle) * r2);
    ctx.stroke();
  }

  ctx.font = "700 44px ui-monospace, Menlo, monospace";
  ctx.globalAlpha = 0.55;
  ctx.textAlign = "center";
  ctx.fillText("ASSEMBLY LAB · RX-04", center, size * 0.9);

  return toTexture(canvas);
}

const textureCache = new Map<string, CanvasTexture>();

export function cachedTexture(key: string, make: () => CanvasTexture): CanvasTexture {
  const existing = textureCache.get(key);
  if (existing) return existing;
  const texture = make();
  textureCache.set(key, texture);
  return texture;
}

export function decalPlane(
  name: string,
  width: number,
  height: number,
  texture: CanvasTexture,
  position: [number, number, number],
  rotation: [number, number, number] = [0, 0, 0],
  circular = false,
): Mesh {
  const geometry = circular ? new CircleGeometry(width / 2, 40) : new PlaneGeometry(width, height);
  const material = new MeshStandardMaterial({
    map: texture,
    transparent: true,
    roughness: 0.6,
    metalness: 0.05,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    depthWrite: false,
  });
  const mesh = new Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  return mesh;
}
