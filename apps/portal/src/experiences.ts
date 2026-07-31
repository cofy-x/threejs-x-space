import type { ComponentType } from "react";
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
    title: "Retro Box Bot Assembly",
    shortTitle: "Box Bot Assembly",
    description:
      "Pull a retro desktop-computer robot apart piece by piece and learn how its sensors, chassis, pistons, and joints fit together.",
    path: "/experiences/robot",
    tags: ["Procedural Modeling", "R3F", "Education"],
    accent: "#2f6fe0",
    chromeTheme: "light",
    runtime: "WebGL / R3F",
    interaction: "Orbit / Explode / Inspect",
    status: "live",
    preview: RobotPreview,
    load: () =>
      import("@threejs-x-space/experience-robot").then((module) => ({
        default: module.RobotExperience,
      })),
  },
];
