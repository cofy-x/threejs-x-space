# Retro Box Bot Assembly

Orbit, pull apart, and inspect a procedural retro desktop-computer robot to learn how its assemblies connect. Open `/experiences/robot` after starting the portal with the [repository setup instructions](../../README.md#getting-started).

## Experience brief

- **Premise:** explore a robot as an assembly exhibit on a display pedestal.
- **Feeling:** a museum-like studio presentation, with a white robot against a gray stage and light page chrome.
- **Main action:** replay the assembly animation, use guided assembly steps or the explode slider, and select parts to inspect their descriptions.
- **Focal point:** the robot and its mechanical connections, framed by a graphite pedestal.
- **Meaningful states:** assembled, assembling, exploded, and a selected part with camera focus and supporting information.
- **Responsive strategy:** canvas beside the parts panel on desktop; canvas above the parts panel on mobile, with labels limited to selected or hovered parts.
- **Constraints:** procedural geometry and textures without external model or image assets; reduced-motion support for the intro and idle animation; keyboard-accessible part controls.

## Model and rendering

The model uses retro computer details, articulated limbs, cables, pistons, and emissive indicators. Printed markings and instrument graphics are generated on canvas. Contact ambient occlusion, selective emissive bloom, and a subtle floor reflection establish depth without obscuring the assemblies.

Front and three-quarter AI-generated references informed the original model; the back-panel design extends the same concept with cooling, power, and connector details. The implementation is self-contained and does not require the reference images or generation tools.

## Implementation map

- [Model factory](src/components/three/create-robot-model.ts): `createRobotModel()` returns a Three.js group. `getSculptRuntime(root)` exposes its `parts`, `partInfos`, and `explode` interface through `root.userData.sculptRuntime`.
- [Part metadata](src/components/three/part-infos.ts): assembly order and educational descriptions.
- [Procedural decals](src/components/three/create-decals.ts): runtime textures and markings.
- [Model animation](src/components/three/robot-model.tsx): assembly transitions and idle behavior.
- [Assembly state](src/state/assembly.tsx): guided steps, selection, playback, and explode amount.
- [Scene and camera](src/components/robot-view.tsx): lighting, stage, labels, camera controls, and review views.

## Visual review

The experience route accepts these query parameters:

- `review=front|three-quarter|side|top|rear|rear-tq` selects a review camera and hides surrounding interface chrome and labels.
- `explode=0..1` sets the initial separation amount, clamped to that range.
- Either parameter suppresses the automatic assembly intro.

For example, `/experiences/robot?review=three-quarter&explode=1` opens an exploded review view. Use the normal route to verify controls, labels, guided assembly, and responsive composition under the [shared design review checklist](../../.x/design.md#review-checklist).
