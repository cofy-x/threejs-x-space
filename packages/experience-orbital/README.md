# Orbital Playground

A cinematic miniature planetary system: pull the Blender-authored Astra-02 probe into a new trajectory, watch gravity bend its course, and complete three distinct flybys. Real NASA and JPL surface imagery gives the worlds recognizable features; the distances, masses, and time scale belong to a playful simulation.

## Experience brief

- **Feeling:** a quiet sense of discovery, with a small mechanical probe moving through a large, readable volume of space.
- **Primary action:** drag the probe to preview a launch, then release it; **Launch probe** offers a reproducible guided flight.
- **Visual focus:** a detailed Earth-like ocean world, a warm solar surface, a rocky Mars-like world, and their spatial relationship to the probe.
- **States:** ready, aiming, flying, paused, crashed, escaped, and complete. The mission itinerary, status, and telemetry follow the same simulation state.
- **Composition:** a dark navy scene with ivory editorial typography and a restrained gold primary action. Desktop instruments frame the scene; mobile condenses the itinerary and reflows the controls.
- **Constraints:** bounded pixel ratio, batched stars and trails, reduced decorative motion, local texture assets, and visible loading or failure feedback.

## Run locally

From the repository root:

```sh
pnpm install
pnpm --filter @threejs-x-space/portal dev --host 127.0.0.1
```

Open `/experiences/orbital` on the local development server. The production route includes the `/threejs-x-space/` base path. See the [repository setup instructions](../../README.md#getting-started) for the shared toolchain.

## Controls and mission

| Control | Behavior |
| :--- | :--- |
| Launch probe | Follow the guided Pelagos → Nyx → Helios trajectory. |
| Drag the probe | Pull back in the current camera plane; release to launch in the opposite direction. The preview indicates a clear path, a flyby opportunity, or collision risk. |
| Drag empty space / scroll | Orbit or zoom the Overview camera. |
| Overview / Chase probe | Inspect the whole system or follow an active flight. |
| Pause flight / Resume flight | Freeze and continue the current flight. |
| Try again | Return to the launch point after a crash or escape, keeping completed flybys and score. |
| Reset / Fly again | Clear mission progress and restore the initial Overview. |

A cancelled pointer gesture never launches. A very short pull returns the probe to its starting point. Each of the three gravity bodies can award one flyby per mission; the decorative moon and asteroid belt do not count. The guided flight completes in approximately 9.6 simulation seconds and earns 8,400 points from a fresh mission. Velocity is shown in simulation units per second (`u/s`), not astronomical units or kilometers per second.

## Implementation

| File | Responsibility |
| :--- | :--- |
| [Experience entry](src/index.tsx) | Canvas, mission interface, commands, state copy, telemetry, and loading presentation. |
| [Scene and interaction](src/orbital-scene.tsx) | Drag gesture, trajectory feedback, trail, fixed-step flight loop, and camera behavior. |
| [Spacecraft component](src/spacecraft.tsx) | Local GLB loading, per-instance materials and generated reflection environment, and three animated ion plumes. |
| [Blender spacecraft source](scripts/build-spacecraft.py) | Original Astra-02 geometry and materials, GLB export, and optional authoring previews. |
| [Blender authoring guide](docs/blender/README.md) | Canonical editable source, construction stages, editing, and export workflow. |
| [Simulation model](src/space-config.ts) | Body parameters, launch constants, shared integrator, boundaries, scoring, and prediction. |
| [Celestial materials](src/celestial-bodies.tsx) | Solar surface, illuminated Earth surface and clouds, night lights, atmosphere, and rocky material. |
| [Space environment](src/space-environment.tsx) | Seeded star field, faint galactic dust, asteroid belt, decorative moon, and restrained postprocessing. |
| [Experience styles](src/styles.css) | Typography, visual hierarchy, controls, and responsive composition. |
| [Flight verification](scripts/verify-flight.ts) | Repeatable guided-flight, frame-rate, preview, pause, and boundary assertions. |

Prediction and live flight call the same `1 / 120` second integrator. The prediction evaluates all simulation steps over a maximum of 16 seconds while storing every sixth step for drawing. The model uses fixed gravity sources and softened acceleration; its flyby scoring is a game rule, not a physically calibrated model of momentum transfer between moving planets.

## Rebuild the spacecraft

Astra-02 has a beveled ceramic shell, graphite spine, optical nose, braced dish, segmented photovoltaic wings, radiator details, and three ion nozzles. It is original geometry and material work authored through Blender MCP, exported as a local [GLB asset](src/assets/astra-probe.glb), and loaded with `useGLTF`. The bundled model contains one mesh, eight material primitives, 33,516 triangles, and no image textures; its file size is 901,172 bytes. Its authored width, height, and length are approximately `3.694 × 1.2324 × 2.374` units, with `+Z` forward and `+Y` up. The browser uses a `0.68` model scale.

The probe and Chase camera share an upright frame derived from velocity so the dish and solar wings remain readable through heading changes. A generated `RoomEnvironment` PMREM supplies reflections only to the probe's cloned materials, with intensity `0.7`; it does not replace the planetary lighting or download an HDR image.

The [canonical editable Blender file](docs/blender/astra-probe.blend) retains separate parts and useful modifiers. The [saved generator](scripts/build-spacecraft.py) supports Blender 4.2 or later and records the complete recipe, with no manual model divergence. From the repository root, regenerate the editable source and runtime asset together with:

```sh
blender --background --python packages/experience-orbital/scripts/build-spacecraft.py -- --output packages/experience-orbital/src/assets/astra-probe.glb --blend packages/experience-orbital/docs/blender/astra-probe.blend
```

`--blend` saves a compressed editable scene before modifiers are converted and parts joined for export; optional `--preview <image.png>` renders the finalized model afterward. The script owns a named `Orbital - Astra 02` scene and preserves unrelated scene objects. Export is restricted to selected objects in that active scene. The [authoring guide](docs/blender/README.md) explains reopening, comparison exports, and continuing edits. Blender is needed for authoring only; ordinary `pnpm` builds use the bundled GLB.

The saved source has been run in a fresh background Blender process. Its regenerated GLB matches the bundled asset's triangle count, bounds, material set, and image-free structure. Exported naming metadata can change file size slightly, so byte-for-byte identity is not the regeneration criterion.

## Rebuild and verify

The [complete from-zero rebuild prompt](docs/rebuild-prompt.md) can be copied into a new coding task with an empty directory. It includes the standalone scaffold, exact physics constants, texture download sources, Blender spacecraft authoring, visual recipe, interaction semantics, and acceptance criteria. It does not require this repository or prior conversation context. The [focused Blender MCP spacecraft prompt](docs/spacecraft-prompt.md) reconstructs Astra-02 independently of the planetary application.

Run `pnpm build`, `pnpm lint`, and `pnpm typecheck` from the repository root. The focused model check, `pnpm --filter @threejs-x-space/experience-orbital verify:flight`, requires Node.js 22.6 or later because it runs TypeScript using Node's type stripping. Review the portal and experience at a representative desktop viewport and at `390 × 844`, including aiming, flight, pause/resume, Chase, completion, failure recovery, and reduced motion.

See [asset sources and usage conditions](ASSET_CREDITS.md) before reusing the textures. Astra-02's original model and source use the repository's MIT license; NASA/JPL imagery retains its separate usage conditions.
