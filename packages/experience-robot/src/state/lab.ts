export const SYSTEMS = [
  {
    id: "vision",
    number: "01",
    name: "Optical array",
    shortName: "Vision",
    subtitle: "See the unfamiliar.",
    description:
      "A stereo optical array maps the terrain. Watch the gimbal sweep its field of view as the sensors find their alignment.",
    specification: "Stereo optics / 120° field of view",
    test: "Align optical array",
    stages: [
      "Waking optical sensors",
      "Sweeping field of view",
      "Locking stereo alignment",
    ],
  },
  {
    id: "power",
    number: "02",
    name: "Energy module",
    shortName: "Power",
    subtitle: "A little inner light.",
    description:
      "A protected energy module distributes power through the torso. The load test brings its three independent circuits online in sequence.",
    specification: "Triple circuit / ceramic thermal shield",
    test: "Test energy circuits",
    stages: [
      "Isolating energy circuits",
      "Applying simulated load",
      "Balancing distribution",
    ],
  },
  {
    id: "motion",
    number: "03",
    name: "Actuator system",
    shortName: "Motion",
    subtitle: "Precision in every move.",
    description:
      "Articulated shoulders, exposed servo joints, and adaptive grippers turn intent into movement. Run a coordinated range-of-motion check.",
    specification: "Servo actuation / three-finger grippers",
    test: "Calibrate actuators",
    stages: [
      "Checking joint encoders",
      "Exercising manipulators",
      "Returning to neutral",
    ],
  },
] as const;

export type SystemId = (typeof SYSTEMS)[number]["id"];
export type LabMode = "overview" | "systems" | "exploded";
export interface Procedure {
  kind: "boot" | SystemId;
  elapsed: number;
}

export interface LabState {
  power: "standby" | "online";
  mode: LabMode;
  selection: SystemId | null;
  procedure: Procedure | null;
  calibrated: SystemId[];
  paused: boolean;
  separation: number;
  cameraRevision: number;
}

export function initialLabState(): LabState {
  return {
    power: "standby",
    mode: "overview",
    selection: null,
    procedure: null,
    calibrated: [],
    paused: false,
    separation: 0.75,
    cameraRevision: 0,
  };
}

export type LabAction =
  | { type: "boot" }
  | { type: "calibrate"; system: SystemId }
  | { type: "tick"; seconds: number }
  | { type: "mode"; mode: LabMode }
  | { type: "select"; system: SystemId }
  | { type: "separate"; amount: number }
  | { type: "pause" }
  | { type: "cancel" }
  | { type: "camera" }
  | { type: "reset" };

export const BOOT_DURATION = 4.2;
export const CALIBRATION_DURATION = 5.4;

export function procedureProgress(procedure: Procedure | null): number {
  if (!procedure) return 0;
  return Math.min(
    1,
    procedure.elapsed /
      (procedure.kind === "boot" ? BOOT_DURATION : CALIBRATION_DURATION),
  );
}

export function labReducer(state: LabState, action: LabAction): LabState {
  switch (action.type) {
    case "boot":
      if (state.procedure || state.power === "online") return state;
      return {
        ...state,
        mode: "overview",
        selection: null,
        paused: false,
        procedure: { kind: "boot", elapsed: 0 },
      };
    case "calibrate":
      if (state.procedure || state.power !== "online") return state;
      return {
        ...state,
        mode: "systems",
        selection: action.system,
        paused: false,
        procedure: { kind: action.system, elapsed: 0 },
      };
    case "tick": {
      if (
        !state.procedure ||
        state.paused ||
        !Number.isFinite(action.seconds) ||
        action.seconds <= 0
      )
        return state;
      const procedure = {
        ...state.procedure,
        elapsed: state.procedure.elapsed + Math.min(action.seconds, 0.25),
      };
      if (procedureProgress(procedure) < 1) return { ...state, procedure };
      if (procedure.kind === "boot")
        return { ...state, procedure: null, power: "online" };
      return {
        ...state,
        procedure: null,
        calibrated: state.calibrated.includes(procedure.kind)
          ? state.calibrated
          : [...state.calibrated, procedure.kind],
      };
    }
    case "mode":
      if (state.procedure) return state;
      return {
        ...state,
        mode: action.mode,
        selection:
          action.mode === "systems"
            ? (state.selection ??
              SYSTEMS.find((s) => !state.calibrated.includes(s.id))?.id ??
              "vision")
            : null,
      };
    case "select":
      if (state.procedure) return state;
      return { ...state, mode: "systems", selection: action.system };
    case "separate":
      return Number.isFinite(action.amount)
        ? { ...state, separation: Math.min(1, Math.max(0, action.amount)) }
        : state;
    case "pause":
      return { ...state, paused: !state.paused };
    case "cancel":
      return { ...state, procedure: null, paused: false };
    case "camera":
      return { ...state, cameraRevision: state.cameraRevision + 1 };
    case "reset":
      return { ...initialLabState(), cameraRevision: state.cameraRevision + 1 };
  }
}

export function statusMessage(state: LabState): string {
  if (state.procedure) {
    if (state.paused) return "Sequence paused";
    const progress = procedureProgress(state.procedure);
    const stages =
      state.procedure.kind === "boot"
        ? ["Establishing power", "Waking Aster", "Checking onboard systems"]
        : (
            SYSTEMS.find((system) => system.id === state.procedure?.kind) ??
            SYSTEMS[0]
          ).stages;
    return stages[Math.min(2, Math.floor(progress * 3))] ?? stages[2];
  }
  if (state.power === "standby") return "Awaiting initialization";
  if (state.calibrated.length === SYSTEMS.length)
    return "All systems calibrated. Aster is field-ready.";
  return `${state.calibrated.length} of ${SYSTEMS.length} systems calibrated`;
}
