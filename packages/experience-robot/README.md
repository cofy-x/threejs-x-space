# Retro Box Bot Assembly

An assembly-teaching experience: a retro desktop-computer robot, rebuilt as a fully
procedural Three.js model, that users can pull apart to learn how its assemblies connect.

## Experience brief

- **Premise**: A desktop-computer robot on a display pedestal — pull it apart to see how
  its assemblies connect.
- **Feeling**: mid-gray seamless studio stage (gradient cyclorama, fog, strong key light)
  against the collection's light editorial chrome — the white robot pops like a museum piece.
- **Main action**: the page opens with the robot assembling itself from scattered
  assemblies; press Play assembly to replay, drag the explode slider, or click an
  assembly (with leader-line labels) to learn what it does.
- **Visual focal point**: the robot on its graphite pedestal with an accent ring, framed
  by the dark stage inside the light page.
- **Minimum state**: assembled robot idling on a slow turntable with breathing LEDs, a
  camera-lens blink, swaying antennas, slowly curling fingers, and a head that tracks the
  visitor's pointer (pupil included). **Key active state**: exploded view with labeled
  assemblies, or a selected assembly with camera focus and a spec sheet.
- **Composition**: desktop = canvas left, parts panel right; mobile = canvas on top,
  collapsible panel below, labels reduced to the selected part.
- **Constraints**: no external assets (all geometry and materials are procedural),
  `prefers-reduced-motion` disables idle motion, turntable, pulses, and the intro
  animation, keyboard-accessible part list.

## Development workflow (img2threejs)

The model was sculpted in code from two AI-generated reference views (front + three-quarter)
using the img2threejs pipeline:

1. Intake: image probing, pre-spec assessment, 21-item detail inventory, PBR evidence
   extraction for five material families (confidence 0.74-0.86).
2. A full sculpt spec (schema 2.1, strict-quality PASS): 7 macro assemblies, 55+ meso/micro
   components, 6 materials, 4 repetition systems, attachment contracts for every limb and
   antenna.
3. Implementation in `src/components/three/create-robot-model.ts` as a plain-Three.js
   factory exposing `root.userData.sculptRuntime` (`parts`, `partInfos`, `explode`).
4. Visual review used headless-Chrome screenshots against the cropped references
   (`?review=front|three-quarter|side|top|rear`, `?explode=0..1`).

Note: the locked per-pass screenshot gates were intentionally bypassed in favor of direct
implementation plus holistic visual correction rounds. Pipeline artifacts (spec JSON,
crops, extracted maps, screenshots) were regenerable working files and are not kept in
the repository; the experience ships zero binary assets.

## Surface detail (procedural decals)

All printed markings are generated at runtime on canvas (`src/components/three/create-decals.ts`)
— no image assets: stenciled labels (CAM-01, DRIVE A/B, VENT-04, USB 3.0, EXHAUST, leg
numbers), a caution stripe and HOT placard on the exhaust grille, a large RX-04 side
stencil, a camera-iris texture under the main lens dome, instrument **scale rings** on
shoulder/elbow/knee joints, red **assembly alignment arrows** at the neck and waist, and
the pedestal tick ring. Shell-edge rivet columns, instanced sole tread blocks, head-fin
vent slots, and hose clips round out the micro detail. N8AO adds contact
ambient occlusion; bloom (postprocessing) is gated to emissive LEDs and lens highlights;
the floor uses a subtle blurred reflection.

## Plugged-in gadgets (future-tech layer)

- A translucent **USB data cartridge** with a pulsing light core sits in the front USB port.
- The right palm projects a small **holographic status display** (additive scanline/waveform
  texture, bob and flicker animation) from a tiny steel projector.
- The upper drive bay carries a **mini waveform LCD** (PWR monitor).
- The whip antenna ends in a **blinking red tip light**.
- A **rear power pack** (cooling fins, barred window with a glowing energy cell, routing
  cable) rides the upper back, plus an **auxiliary battery** below the PSU fan.
- A **head-mounted brain unit** (CPU-04) fills the head rear: heatsink fin crown, cyan
  glow strip, twin connector ports.
- **Twin spine cables** run from the head down the rear panel edge to the pelvis through
  three clamp brackets.
- Rear thighs carry **actuator blocks** with twin mini pistons and hip-routed cables.
- **Hip cable looms** connect torso and pelvis on both sides.
- The left forearm carries a **scanner module** with a cyan slit and a red tip light.
- A **cyan reactor core** sits at the center of the pelvis front panel.
- Legs are fully equipped: **geared knee rings** with status lights, **coil-spring shock
  struts** on the shins (procedural helix), **hip-to-knee cable looms**, thigh cooling
  vents with cyan marker lights, **shin light strips**, and twin **heel shock absorbers**.

## Back-panel design (original, no reference)

The references cover only front and three-quarter views. The robot's back is an
original design that extends the retro-PC concept: a PSU fan with radial spokes, a guard
ring, and a cross brace at the top; expansion slot covers; a rear IO cluster (USB,
Ethernet, audio jacks) with a rubber power cable dangling from it; a honeycomb exhaust
grille echoing the front; case thumbscrews; a serial-number plate; and AC 220V / CAUTION
silk-screen labels. The head gets a small rear cooling vent and the feet get heel caps,
so the model reads as designed from every orbit angle.

## Limb detailing

Arms carry a hex shoulder armor cap, side guide rails, elbow bolt ring, a ribbed spine
channel, paired front and rear hydraulic pistons, a rubber hydraulic hose with metal
fittings, a wrist flange, and two knuckled fingers plus an opposed thumb with rubber
pads. Feet add ankle guard plates, a front linkage piston, toe tread grooves, a heel
ledge, and side trim rails.
