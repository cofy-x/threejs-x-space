import type { ComponentType } from "react";
import { OrbitalPreview } from "./components/orbital-preview";
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
    id: "fluid",
    number: "03",
    title: "Fluid Field Visualizer",
    shortTitle: "Fluid Fields",
    description:
      "Release particles into a GPU-driven flow field and reveal the hidden structure of motion.",
    path: "/experiences/fluid",
    tags: ["GLSL", "GPU Particles"],
    accent: "#2f7c62",
    runtime: "WebGL / GLSL",
    interaction: "Release / Trace",
    status: "coming-soon",
  },
];
