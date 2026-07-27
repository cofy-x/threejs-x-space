import type { ComponentType } from "react";
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
    title: "Orbital Mechanics Lab",
    shortTitle: "Orbital Mechanics",
    description:
      "Shape an orbit, bend a trajectory, and experiment with transfer windows in a tactile gravity sandbox.",
    path: "/experiences/orbital",
    tags: ["Physics", "Simulation"],
    accent: "#6f63b8",
    runtime: "WebGL / R3F",
    interaction: "Shape / Observe",
    status: "coming-soon",
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
