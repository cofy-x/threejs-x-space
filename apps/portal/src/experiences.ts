import type { ComponentType } from "react";
import { AttentionAtlasPreview } from "./components/attention-atlas-preview";
import { CourierPreview } from "./components/courier-preview";
import { LivingInkPreview } from "./components/living-ink-preview";
import { OrbitalPreview } from "./components/orbital-preview";
import { RobotPreview } from "./components/robot-preview";
import { TurbofanPreview } from "./components/turbofan-preview";

interface ExperienceMetaBase {
  id: string;
  number: string;
  title: string;
  shortTitle: string;
  description: string;
  path: string;
  tags: string[];
  accent: string;
  chromeTheme: "dark" | "light";
  runtime: string;
  interaction: string;
  preview?: ComponentType;
}

export type ExperienceMeta = ExperienceMetaBase &
  (
    | {
        status: "live";
        load: () => Promise<{ default: ComponentType }>;
      }
    | {
        status: "coming-soon";
        load?: never;
      }
  );

export const EXPERIENCES: ExperienceMeta[] = [
  {
    id: "turbofan",
    number: "01",
    title: "Turbofan Airflow Simulator",
    shortTitle: "Turbofan Airflow",
    description:
      "Open a cutaway jet engine, follow five airflow stages, and watch thrust emerge from a living system of particles, gauges, and telemetry.",
    path: "/experiences/turbofan",
    tags: ["React Three Fiber", "Particles", "Simulation"],
    accent: "#3157d5",
    chromeTheme: "dark",
    runtime: "WebGL / R3F",
    interaction: "Orbit / Simulate",
    status: "live",
    preview: TurbofanPreview,
    load: () =>
      import("@threejs-x-space/experience-turbofan").then((module) => ({
        default: module.TurbofanExperience,
      })),
  },
  {
    id: "orbital",
    number: "02",
    title: "Orbital Playground",
    shortTitle: "Orbital Playground",
    description:
      "Launch a deep-space probe, bend its path around planetary bodies, and chain gravity assists in three dimensions.",
    path: "/experiences/orbital",
    tags: ["WebGL Shaders", "3D Physics", "Postprocessing"],
    accent: "#d88a35",
    chromeTheme: "dark",
    runtime: "WebGL 2 / R3F",
    interaction: "Orbit / Launch",
    status: "live",
    preview: OrbitalPreview,
    load: () =>
      import("@threejs-x-space/experience-orbital").then((module) => ({
        default: module.OrbitalExperience,
      })),
  },
  {
    id: "living-ink",
    number: "03",
    title: "Living Ink",
    shortTitle: "Living Ink",
    description:
      "Touch a quiet sheet of paper and guide living currents into an evolving pigment composition.",
    path: "/experiences/living-ink",
    tags: ["GPGPU", "GLSL", "Generative Art"],
    accent: "#b65349",
    chromeTheme: "light",
    runtime: "WebGL 2 / GLSL",
    interaction: "Touch / Paint",
    status: "live",
    preview: LivingInkPreview,
    load: () =>
      import("@threejs-x-space/experience-living-ink").then((module) => ({
        default: module.LivingInkExperience,
      })),
  },
  {
    id: "robot",
    number: "04",
    title: "Aster Robotics Lab",
    shortTitle: "Aster Robotics Lab",
    description:
      "Bring a field robot to life. Explore its mechanical anatomy, calibrate its systems, and prepare it for the unknown.",
    path: "/experiences/robot",
    tags: ["Procedural Modeling", "Robotics", "Interactive World"],
    accent: "#a94f28",
    chromeTheme: "dark",
    runtime: "WebGL / R3F",
    interaction: "Initialize / Diagnose / Explore",
    status: "live",
    preview: RobotPreview,
    load: () =>
      import("@threejs-x-space/experience-robot").then((module) => ({
        default: module.RobotExperience,
      })),
  },
  {
    id: "courier",
    number: "05",
    title: "Clockwork Courier",
    shortTitle: "Clockwork Courier",
    description:
      "One little robot. One precious core. Cross clockwork islands, wake sleeping machines, and deliver a little daylight.",
    path: "/experiences/courier",
    tags: ["Blender", "Puzzle Adventure", "Three.js"],
    accent: "#be562f",
    chromeTheme: "light",
    runtime: "WebGL / R3F",
    interaction: "Explore / Solve / Deliver",
    status: "live",
    preview: CourierPreview,
    load: () =>
      import("@threejs-x-space/experience-courier").then((module) => ({
        default: module.CourierExperience,
      })),
  },
  {
    id: "attention-atlas",
    number: "06",
    title: "Attention Atlas",
    shortTitle: "Attention Atlas",
    description:
      "Step inside the Original Transformer and DeepSeek-V4.1-Flash. Unfold each module, follow its animated computation, and compare related mechanisms side by side.",
    path: "/experiences/attention-atlas",
    tags: ["AI Architecture", "Interactive 3D", "Visual Learning"],
    accent: "#387c70",
    chromeTheme: "dark",
    runtime: "WebGL / R3F",
    interaction: "Compare / Inspect / Explore",
    status: "live",
    preview: AttentionAtlasPreview,
    load: () =>
      import("@threejs-x-space/experience-attention-atlas").then((module) => ({
        default: module.AttentionAtlasExperience,
      })),
  },
];
