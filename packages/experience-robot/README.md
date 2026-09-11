# Aster Robotics Lab

Bring a field robot to life in an interactive commissioning bay. Initialize Aster, calibrate its systems, and separate its assemblies to discover the machinery beneath the ceramic armor.

Open `/experiences/robot` after following the [repository setup instructions](../../README.md#getting-started).

## Experience brief

- **Premise:** prepare a curious field companion for its next expedition.
- **Feeling:** a quiet, purposeful robotics lab with a tangible machine at its center.
- **Main action:** initialize the unit, then complete the vision, power, and motion diagnostics.
- **Focal point:** Aster's silhouette, optical visor, protected energy module, and articulated limbs.
- **Meaningful states:** standby, initialization, online, a running or paused diagnostic, three systems calibrated, and disassembled.
- **Responsive strategy:** a full-scene desktop composition with compact controls; a vertically scrollable mobile layout with the model above its controls and expandable system descriptions.
- **Constraints:** procedural assets, bounded rendering cost, reduced-motion support, accessible HTML controls, and recoverable state.

## Explore the lab

- **Observe:** initialize Aster and follow its commissioning progress. Nothing starts automatically.
- **Diagnose:** select a system from the controls or directly on the model. Each simulated diagnostic has a visible response: an optical sweep, sequential energy circuits, or an articulated arm and gripper exercise. All three distinct checks are required for field-ready status.
- **Disassemble:** release the armor before separating the main assemblies. Adjust separation continuously and reassemble at any time outside a running sequence. This view is available even in standby.

Pause freezes the active sequence and idle motion. Cancel discards only the current unfinished sequence. Reset returns the unit to standby and clears calibration progress. Progress is local to the current visit.

Drag to orbit and scroll to zoom on desktop. On mobile, horizontal drags orbit while vertical swipes scroll the page. With the canvas focused, arrow keys orbit, `+` / `-` zoom, and `Home` restores the current view. The reset-camera button provides the same recovery without a keyboard.

## Implementation

- [Lab state machine](src/state/lab.ts): explicit power, diagnostic, pause, cancellation, and reset transitions. [The controller](src/state/use-lab.ts) advances sequences only while the page is visible.
- [Robot model](src/components/model/aster.ts): procedural armor, frame, mechanical joints, and independently powered energy sectors. Static surfaces are batched by material within each movable assembly.
- [Geometry utilities](src/components/model/geometry.ts): beveled panels, joints, cables, canvas labels, batching, and resource disposal.
- [Lab scene](src/components/lab-scene.tsx): lighting, environment, camera transitions, articulated motion, input, and WebGL context recovery.
- [Interface](src/index.tsx): operating modes, system descriptions, accessible progress, and scene controls.

All models, markings, and environment lighting are generated locally in code; there are no external models, image assets, fonts, or network-loaded environments. The portal uses a separate lightweight SVG illustration and does not preload the Three.js scene.

Reduced motion removes idle motion, scan sweeps, joint animation, and animated camera transitions while retaining diagnostic progress and results. The mobile renderer uses a lower pixel-ratio cap and smaller shadow buffers. A lost WebGL context can be restored without clearing completed checks.

## Validation

Follow the [repository checks](../../AGENTS.md#validation) and [design review checklist](../../.x/design.md#review-checklist). Run the state-machine regression tests with:

```sh
pnpm --filter @threejs-x-space/experience-robot test
```

Review standby, initialization, pause/resume, cancellation, all three diagnostics, completion, disassembly, reset, reduced motion, and graphics recovery on desktop and mobile. Verify direct navigation under the production base path as well as returning to the portal.
