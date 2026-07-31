import { useFrame } from "@react-three/fiber";
import { clamp, easeOutCubic } from "@threejs-x-space/three-utils";
import { useEffect, useMemo, useRef } from "react";
import type { Group } from "three";
import { useAssembly } from "../../state/assembly";
import { createRobotModel, getSculptRuntime } from "./create-robot-model";
import { ASSEMBLY_ORDER } from "./part-infos";

const PLAY_STAGGER = 0.08;
const PLAY_PART_SPAN = 0.42;
const PLAY_DURATION = 4.2;

function findPartRoot(object: Group | null, partNames: Set<string>): string | null {
  let current: Group | null = object;
  while (current) {
    if (partNames.has(current.name)) return current.name;
    current = current.parent as Group | null;
  }
  return null;
}

export function RobotModel() {
  const model = useMemo(() => createRobotModel(), []);
  const runtime = useMemo(() => getSculptRuntime(model), [model]);
  const {
    explodeAmount,
    selectedPartId,
    hoveredPartId,
    playing,
    setPlaying,
    guided,
    step,
    setStep,
    setSelectedPartId,
    setHoveredPartId,
    runtimeRef,
  } = useAssembly();
  const targetExplode = useRef(explodeAmount);
  const currentExplode = useRef(0);
  const playT = useRef(0);
  const partAmounts = useRef<Record<string, number>>({});
  const headYaw = useRef(0);
  const headPitch = useRef(0);

  targetExplode.current = explodeAmount;

  useEffect(() => {
    runtimeRef.current = runtime;
    runtime.explode(explodeAmount);
    currentExplode.current = explodeAmount;
    for (const name of Object.keys(runtime.parts)) {
      partAmounts.current[name] = explodeAmount;
    }
    return () => {
      runtimeRef.current = null;
    };
  }, [runtime, runtimeRef, explodeAmount]);

  useEffect(() => {
    document.body.style.cursor = hoveredPartId ? "pointer" : "";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hoveredPartId]);

  useFrame((state, delta) => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (playing) {
      playT.current += delta / PLAY_DURATION;
      const amounts: Partial<Record<string, number>> = {};
      let finished = true;
      ASSEMBLY_ORDER.forEach((name, index) => {
        const local = clamp((playT.current - index * PLAY_STAGGER) / PLAY_PART_SPAN, 0, 1);
        if (local < 1) finished = false;
        const amount = 1 - easeOutCubic(local);
        amounts[name] = amount;
        partAmounts.current[name] = amount;
      });
      runtime.explode(0, amounts);
      currentExplode.current = 0;
      if (finished) {
        runtime.explode(0);
        for (const name of Object.keys(runtime.parts)) {
          partAmounts.current[name] = 0;
        }
        setStep(ASSEMBLY_ORDER.length);
        setPlaying(false);
      }
    } else if (guided) {
      const rate = reduced ? 1000 : 2.6;
      let dirty = false;
      ASSEMBLY_ORDER.forEach((name, index) => {
        const target = index < step ? 0 : 1;
        const current = partAmounts.current[name] ?? target;
        const diff = target - current;
        if (Math.abs(diff) > 0.0005) {
          partAmounts.current[name] = current + diff * Math.min(1, delta * rate);
          dirty = true;
        } else if (current !== target) {
          partAmounts.current[name] = target;
          dirty = true;
        }
      });
      if (dirty) {
        runtime.explode(0, partAmounts.current);
      }
    } else {
      const stepDelta = Math.min(1, delta * 5);
      const next = currentExplode.current + (targetExplode.current - currentExplode.current) * stepDelta;
      if (Math.abs(next - currentExplode.current) > 0.0005) {
        currentExplode.current = next;
        runtime.explode(next);
        for (const name of Object.keys(runtime.parts)) {
          partAmounts.current[name] = next;
        }
      }
    }

    for (const [name, part] of Object.entries(runtime.parts)) {
      const targetScale = name === selectedPartId ? 1.035 : name === hoveredPartId ? 1.02 : 1;
      const current = part.scale.x;
      const nextScale = current + (targetScale - current) * Math.min(1, delta * 8);
      if (Math.abs(nextScale - current) > 0.0001) {
        part.scale.setScalar(nextScale);
      }
    }

    const t = state.clock.elapsedTime;
    const head = runtime.parts["head"];

    if (!reduced && head && !playing) {
      const pointer = state.pointer;
      const targetYaw = pointer.x * 0.45 + Math.sin(t * 0.6) * 0.08;
      const targetPitch = -pointer.y * 0.12;
      const follow = Math.min(1, delta * 3.5);
      headYaw.current += (targetYaw - headYaw.current) * follow;
      headPitch.current += (targetPitch - headPitch.current) * follow;
      head.rotation.y = headYaw.current;
      head.rotation.x = headPitch.current;

      const pupil = head.getObjectByName("main-lens-inner");
      if (pupil) {
        pupil.position.x = pointer.x * 0.028;
        pupil.position.y = pointer.y * 0.022;
      }

      for (const armId of ["arm-L", "arm-R"] as const) {
        const armPart = runtime.parts[armId];
        const hand = armPart?.getObjectByName(`hand-${armId.slice(-1)}`);
        if (!hand) continue;
        const phase = armId === "arm-L" ? 0 : 1.3;
        const curl = (Math.sin(t * 0.7 + phase) + 1) * 0.5 * 0.16;
        for (const fingerName of ["finger-0", "finger-1"]) {
          const finger = hand.getObjectByName(fingerName);
          if (finger) finger.rotation.x = curl;
        }
        const thumb = hand.getObjectByName("finger-thumb");
        if (thumb) thumb.rotation.x = curl * 0.6;
      }
    }

    if (!reduced) {
      const led = runtime.materials["led"];
      if (led) {
        led.emissiveIntensity = 1.1 + Math.sin(t * 2.2) * 0.7;
      }
      const usb = runtime.materials["usb"];
      if (usb) {
        usb.emissiveIntensity = 0.35 + Math.sin(t * 1.3 + 1) * 0.2;
      }
      const lens = runtime.materials["lens"];
      if (lens) {
        const blink = Math.pow(Math.max(0, Math.sin(t * 1.1)), 24);
        lens.emissive.setRGB(0.08 * blink, 0.09 * blink, 0.05 * blink);
      }
      const whip = head?.getObjectByName("antenna-whip");
      if (whip) {
        whip.rotation.x = Math.sin(t * 1.7) * 0.05;
        whip.rotation.z = Math.sin(t * 1.3 + 0.7) * 0.04;
      }
      const stub = head?.getObjectByName("antenna-stub");
      if (stub) {
        stub.rotation.x = Math.sin(t * 2.1 + 1.4) * 0.03;
      }

      const tipLight = runtime.materials["tipLight"];
      if (tipLight) {
        tipLight.emissiveIntensity = 1.2 + Math.sin(t * 2.6) * 0.9;
      }
      const dongle = runtime.materials["dongle"];
      if (dongle) {
        dongle.emissiveIntensity = 1.0 + Math.sin(t * 1.8 + 0.5) * 0.5;
      }
      const armR = runtime.parts["arm-R"];
      const holo = armR?.getObjectByName("holo-display");
      if (holo) {
        holo.position.y = -0.06 + Math.sin(t * 1.5) * 0.008;
        const holoMat = (holo as { material?: { opacity: number } }).material;
        if (holoMat) {
          holoMat.opacity = 0.68 + Math.sin(t * 7.3) * 0.05 + Math.sin(t * 0.9) * 0.06;
        }
      }
    }
  });

  const partNames = useMemo(() => new Set(Object.keys(runtime.parts)), [runtime]);

  return (
    <primitive
      object={model}
      onClick={(event: { stopPropagation: () => void; object: Group }) => {
        event.stopPropagation();
        const partId = findPartRoot(event.object, partNames);
        setSelectedPartId(partId);
      }}
      onPointerOver={(event: { stopPropagation: () => void; object: Group }) => {
        event.stopPropagation();
        setHoveredPartId(findPartRoot(event.object, partNames));
      }}
      onPointerOut={() => setHoveredPartId(null)}
      onPointerMissed={() => setSelectedPartId(null)}
    />
  );
}
