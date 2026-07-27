import { approach, easeOutCubic } from "@threejs-x-space/three-utils";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";

export type SimulationPhase = "stopped" | "running" | "paused";

export interface EngineValues {
  n1: number;
  n2: number;
  thrust: number;
  tit: number;
  pressureRatio: number;
  fuelFlow: number;
}

export interface HistorySample {
  t: number;
  thrust: number;
  n1: number;
  tit: number;
}

export interface SimulationFrame {
  phase: SimulationPhase;
  progress: number;
  elapsedSeconds: number;
  values: EngineValues;
}

export type SimulationRuntime = MutableRefObject<SimulationFrame>;

interface SimulationConfig {
  casingVisible: boolean;
  airflowVisible: boolean;
}

interface SimulationContextValue extends SimulationConfig {
  phase: SimulationPhase;
  elapsedSeconds: number;
  progress: number;
  values: EngineValues;
  history: HistorySample[];
  start: () => void;
  pause: () => void;
  toggleRunning: () => void;
  toggleCasing: () => void;
  toggleAirflow: () => void;
}

const TARGETS: EngineValues = {
  n1: 8450,
  n2: 11200,
  thrust: 34500,
  tit: 1320,
  pressureRatio: 28.5,
  fuelFlow: 140.2,
};

const TICK_SECONDS = 0.25;
const SPOOL_UP_SECONDS = 12;
const SPOOL_DOWN_SECONDS = 8;
const MAX_HISTORY_SAMPLES = 600;

const SimulationRuntimeContext = createContext<SimulationRuntime | null>(null);
const SimulationConfigContext = createContext<SimulationConfig | null>(null);
const SimulationStateContext = createContext<SimulationContextValue | null>(null);

function buildValues(progress: number, elapsedSeconds: number): EngineValues {
  const eased = easeOutCubic(progress);
  const noise = (frequency: number, amplitude: number) =>
    1 + Math.sin(elapsedSeconds * frequency) * amplitude;
  return {
    n1: TARGETS.n1 * eased * noise(1.7, 0.004),
    n2: TARGETS.n2 * eased * noise(2.3, 0.003),
    thrust: TARGETS.thrust * eased * noise(1.1, 0.006),
    tit: TARGETS.tit * eased * noise(1.9, 0.008),
    pressureRatio: 1 + (TARGETS.pressureRatio - 1) * eased,
    fuelFlow: TARGETS.fuelFlow * eased * noise(2.7, 0.01),
  };
}

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<SimulationPhase>("stopped");
  const [casingVisible, setCasingVisible] = useState(true);
  const [airflowVisible, setAirflowVisible] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [progress, setProgress] = useState(0);
  const [values, setValues] = useState<EngineValues>(() => buildValues(0, 0));
  const [history, setHistory] = useState<HistorySample[]>([]);

  const frameRef = useRef<SimulationFrame>({
    phase: "stopped",
    progress: 0,
    elapsedSeconds: 0,
    values: buildValues(0, 0),
  });

  useEffect(() => {
    const interval = window.setInterval(() => {
      const frame = frameRef.current;
      if (frame.phase === "running") {
        frame.elapsedSeconds += TICK_SECONDS;
        frame.progress = approach(frame.progress, 1, 1 / SPOOL_UP_SECONDS, TICK_SECONDS);
      } else if (frame.phase === "stopped") {
        frame.progress = approach(frame.progress, 0, 1 / SPOOL_DOWN_SECONDS, TICK_SECONDS);
      }
      frame.values = buildValues(frame.progress, frame.elapsedSeconds);
      setElapsedSeconds(frame.elapsedSeconds);
      setProgress(frame.progress);
      setValues(frame.values);
      if (frame.phase === "running" && frame.progress > 0.02) {
        const sample: HistorySample = {
          t: frame.elapsedSeconds,
          thrust: frame.values.thrust,
          n1: frame.values.n1,
          tit: frame.values.tit,
        };
        setHistory((previous) => {
          const next = [...previous, sample];
          return next.length > MAX_HISTORY_SAMPLES ? next.slice(next.length - MAX_HISTORY_SAMPLES) : next;
        });
      }
    }, TICK_SECONDS * 1000);
    return () => window.clearInterval(interval);
  }, []);

  const configValue = useMemo<SimulationConfig>(
    () => ({ casingVisible, airflowVisible }),
    [casingVisible, airflowVisible],
  );

  const stateValue = useMemo<SimulationContextValue>(
    () => ({
      phase,
      casingVisible,
      airflowVisible,
      elapsedSeconds,
      progress,
      values,
      history,
      start: () => {
        frameRef.current.phase = "running";
        setPhase("running");
      },
      pause: () => {
        const next = frameRef.current.phase === "running" ? "paused" : "running";
        frameRef.current.phase = next;
        setPhase(next);
      },
      toggleRunning: () => {
        const next = frameRef.current.phase === "running" ? "stopped" : "running";
        frameRef.current.phase = next;
        setPhase(next);
      },
      toggleCasing: () => setCasingVisible((current) => !current),
      toggleAirflow: () => setAirflowVisible((current) => !current),
    }),
    [phase, casingVisible, airflowVisible, elapsedSeconds, progress, values, history],
  );

  return (
    <SimulationRuntimeContext.Provider value={frameRef}>
      <SimulationConfigContext.Provider value={configValue}>
        <SimulationStateContext.Provider value={stateValue}>
          {children}
        </SimulationStateContext.Provider>
      </SimulationConfigContext.Provider>
    </SimulationRuntimeContext.Provider>
  );
}

export function useSimulationRuntime(): SimulationRuntime {
  const context = useContext(SimulationRuntimeContext);
  if (!context) {
    throw new Error("useSimulationRuntime must be used within a SimulationProvider.");
  }
  return context;
}

export function useSimulationConfig(): SimulationConfig {
  const context = useContext(SimulationConfigContext);
  if (!context) {
    throw new Error("useSimulationConfig must be used within a SimulationProvider.");
  }
  return context;
}

export function useSimulation(): SimulationContextValue {
  const context = useContext(SimulationStateContext);
  if (!context) {
    throw new Error("useSimulation must be used within a SimulationProvider.");
  }
  return context;
}
