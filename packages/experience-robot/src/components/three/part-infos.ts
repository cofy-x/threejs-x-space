import type { RobotPartInfo } from "./create-robot-model";

export const ASSEMBLY_ORDER = ["leg-L", "leg-R", "pelvis", "torso", "arm-L", "arm-R", "neck", "head"];

const PART_INFOS: Record<string, RobotPartInfo> = {
  head: {
    id: "head",
    title: "Sensor head",
    summary:
      "A chamfered enclosure carrying the main camera lens, a secondary ranging lens, a blanked-off port, and a honeycomb cooling vent. Two antennas spring from the roof.",
    specs: [
      { label: "Envelope", value: "0.96 × 0.40 × 0.55 u" },
      { label: "Shell", value: "Painted polymer, clearcoat" },
      { label: "Optics", value: "Olive glass, clearcoat 1.0" },
      { label: "Joint", value: "Neck yaw pivot" },
    ],
  },
  neck: {
    id: "neck",
    title: "Neck bellows",
    summary:
      "An accordion rubber gaiter that seals the head yaw joint while letting the head rotate freely.",
    specs: [
      { label: "Profile", value: "4-ridge lathe bellows" },
      { label: "Material", value: "Matte rubber, rough 0.85" },
      { label: "Joint", value: "Yaw seal" },
    ],
  },
  torso: {
    id: "torso",
    title: "Computer chassis torso",
    summary:
      "A retro desktop tower: drive bays up top, a honeycomb intake grille with expansion slots in the middle, front IO below, and a full-width exhaust grille at the base. The rear panel carries the PSU fan, slot covers, and rear IO.",
    specs: [
      { label: "Envelope", value: "1.06 × 1.50 × 0.60 u" },
      { label: "Grilles", value: "Instanced hex cells ×3" },
      { label: "Rear", value: "PSU fan, 5 slots, IO cluster" },
      { label: "Joint", value: "Waist yaw pivot" },
    ],
  },
  pelvis: {
    id: "pelvis",
    title: "Pelvis bridge",
    summary:
      "The structural bridge between chassis and legs. Rubber bellows seal both hip axles.",
    specs: [
      { label: "Envelope", value: "0.65 × 0.42 × 0.48 u" },
      { label: "Seals", value: "2× hip bellows" },
      { label: "Joint", value: "Load-bearing bridge" },
    ],
  },
  "arm-L": {
    id: "arm-L",
    title: "Left manipulator arm",
    summary:
      "Ball-jointed shoulder, armored upper arm, and an exposed twin-piston forearm driving a three-finger claw.",
    specs: [
      { label: "Reach", value: "≈ 2.0 u from shoulder" },
      { label: "Actuators", value: "2× hydraulic pistons" },
      { label: "Joints", value: "Ball shoulder, hinge elbow, wrist" },
    ],
  },
  "arm-R": {
    id: "arm-R",
    title: "Right manipulator arm",
    summary:
      "Ball-jointed shoulder, armored upper arm, and an exposed twin-piston forearm driving a three-finger claw.",
    specs: [
      { label: "Reach", value: "≈ 2.0 u from shoulder" },
      { label: "Actuators", value: "2× hydraulic pistons" },
      { label: "Joints", value: "Ball shoulder, hinge elbow, wrist" },
    ],
  },
  "leg-L": {
    id: "leg-L",
    title: "Left leg",
    summary:
      "Heavy armored thigh and shin with a rear hydraulic piston across the knee, ending in a rubber-soled block foot.",
    specs: [
      { label: "Envelope", value: "0.34 × 1.65 × 0.48 u" },
      { label: "Actuator", value: "Rear knee piston" },
      { label: "Joints", value: "Hip, knee hinge, ankle ball" },
    ],
  },
  "leg-R": {
    id: "leg-R",
    title: "Right leg",
    summary:
      "Heavy armored thigh and shin with a rear hydraulic piston across the knee, ending in a rubber-soled block foot.",
    specs: [
      { label: "Envelope", value: "0.34 × 1.65 × 0.48 u" },
      { label: "Actuator", value: "Rear knee piston" },
      { label: "Joints", value: "Hip, knee hinge, ankle ball" },
    ],
  },
};

export function getPartInfos(): Record<string, RobotPartInfo> {
  return PART_INFOS;
}
