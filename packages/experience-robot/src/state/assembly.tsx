import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject, ReactNode } from "react";
import type { SculptRuntime } from "../components/three/create-robot-model";
import { ASSEMBLY_ORDER } from "../components/three/part-infos";

interface AssemblyState {
  explodeAmount: number;
  setExplodeAmount: (value: number) => void;
  selectedPartId: string | null;
  setSelectedPartId: (id: string | null) => void;
  hoveredPartId: string | null;
  setHoveredPartId: (id: string | null) => void;
  playing: boolean;
  setPlaying: (value: boolean) => void;
  guided: boolean;
  step: number;
  setStep: (value: number) => void;
  attachNext: () => void;
  detachLast: () => void;
  playAssembly: () => void;
  runtimeRef: MutableRefObject<SculptRuntime | null>;
}

const AssemblyContext = createContext<AssemblyState | null>(null);

function readInitialExplode(): number {
  if (typeof window === "undefined") return 0;
  const value = new URLSearchParams(window.location.search).get("explode");
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(1, Math.max(0, parsed)) : 0;
}

function shouldAutoPlayIntro(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  if (params.has("review") || params.has("explode")) return false;
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function AssemblyProvider({ children }: { children: ReactNode }) {
  const autoIntro = useMemo(shouldAutoPlayIntro, []);
  const [explodeAmount, setExplodeAmountRaw] = useState(() => {
    const param = readInitialExplode();
    if (param > 0) return param;
    return 0;
  });
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [hoveredPartId, setHoveredPartId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [guided, setGuided] = useState(autoIntro);
  const [step, setStep] = useState(autoIntro ? 0 : ASSEMBLY_ORDER.length);
  const runtimeRef = useRef<SculptRuntime | null>(null);
  const introFired = useRef(false);

  const setExplodeAmount = (value: number) => {
    setGuided(false);
    setPlaying(false);
    setExplodeAmountRaw(value);
  };

  const playAssembly = () => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setGuided(false);
      setExplodeAmountRaw(0);
      return;
    }
    setGuided(true);
    setStep(0);
    setPlaying(true);
  };

  const attachNext = () => {
    setPlaying(false);
    setGuided(true);
    setStep(Math.min(ASSEMBLY_ORDER.length, step + 1));
  };

  const detachLast = () => {
    setPlaying(false);
    setGuided(true);
    setStep(Math.max(0, step - 1));
  };

  useEffect(() => {
    if (introFired.current || !autoIntro) return;
    introFired.current = true;
    const timer = window.setTimeout(() => setPlaying(true), 900);
    return () => window.clearTimeout(timer);
  }, [autoIntro]);

  const value = useMemo(
    () => ({
      explodeAmount,
      setExplodeAmount,
      selectedPartId,
      setSelectedPartId,
      hoveredPartId,
      setHoveredPartId,
      playing,
      setPlaying,
      guided,
      step,
      setStep,
      attachNext,
      detachLast,
      playAssembly,
      runtimeRef,
    }),
    [explodeAmount, selectedPartId, hoveredPartId, playing, guided, step],
  );

  return <AssemblyContext.Provider value={value}>{children}</AssemblyContext.Provider>;
}

export function useAssembly(): AssemblyState {
  const context = useContext(AssemblyContext);
  if (!context) {
    throw new Error("useAssembly must be used within AssemblyProvider");
  }
  return context;
}
