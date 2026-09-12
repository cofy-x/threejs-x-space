# Turbofan — Inside the engine

An interactive cutaway of a turbofan, presented as a graphite aerospace exhibit. Inspect the swept intake fan, follow the cold bypass and warm core flow, and start an illustrative engine spool-up.

[Open the experience](https://cofy-x.github.io/threejs-x-space/experiences/turbofan) · [Reproduction prompt and build recipe](docs/reproduction-prompt.md)

## Experience brief

- **Premise:** follow air through a layered machine and connect its five stages to the motion and readings on screen.
- **Feeling:** the quiet precision of a museum section model, with cool silver metal, bronze hot-section parts, restrained airflow, and readable instruments.
- **Primary action:** start the engine, observe its 12-second spool-up, then pause, resume, or reset the simulation.
- **Focal point:** the large, swept fan and the diagonal cutaway silhouette; collars, fasteners, vanes, pipes, and nozzle petals reward closer inspection.
- **Initial state:** a stationary engine, visible casing and airflow guides, the fan selected, zero thrust, and an empty history trace.
- **Active state:** independently animated fan and core groups, moving flow trails, a warmer combustor, and synchronized simulated telemetry.
- **Composition:** the engine occupies the main desktop area beside a compact control and telemetry column. Mobile places the scene first and reflows supporting controls and readings into a vertically scrollable layout.

## Explore

Use **Perspective**, **Profile**, and **Intake** to restore a useful camera composition, or drag the engine to orbit. The five stage buttons select an annotation and a short explanation. Intake view hides annotations for stages behind the fan while retaining their explanations. **Casing** reveals or hides the outer nacelle; **Airflow** controls both flow guides and trails. **Start engine** becomes **Pause engine**, then **Resume engine** while paused. Reset returns the simulation clock, readings, and history to their initial values.

Reduced-motion preferences keep the rotor and flow animation static and make camera preset changes immediate. The stage descriptions and HTML controls remain usable independently of motion. If WebGL 2 is unavailable, a message replaces the scene while the controls and explanations remain available.

This is an illustrative visualization, not a CFD tool, engineering model, or representation of a particular manufactured engine. Dimensions are arbitrary scene units; the display stretches the engine, flow, and annotations along the shaft to make successive stages easier to inspect. Readings follow deterministic curves with small sinusoidal variation. Displayed RPM is deliberately slowed for visible rotor animation.

## Run locally

From the repository root, with Node.js 20 or newer and the repository's pnpm version:

```sh
pnpm install
pnpm --filter @threejs-x-space/portal dev --host 127.0.0.1
```

Open `http://127.0.0.1:5173/experiences/turbofan`. Production uses the `/threejs-x-space/` base path.

To inspect the production build locally, supply its base explicitly to the preview server:

```sh
pnpm build
pnpm --filter @threejs-x-space/portal preview --host 127.0.0.1 --base /threejs-x-space/
```

Open the preview server URL reported by Vite with `/threejs-x-space/experiences/turbofan` as the path. The explicit preview base matches the path selected by the build configuration.

## Implementation

The runtime is procedural Three.js with React Three Fiber and Drei. Airfoil meshes use spanwise sweep and twist; axial profiles form solid cutaway surfaces. Repeated blades and fasteners use instancing. The scene creates its reflection environment in code and requires no downloaded models, textures, HDRIs, or font assets.

Blender MCP was used during authoring to inspect the deterministic fan-blade construction. Blender is optional for development and is not a runtime dependency. The [reproduction guide](docs/reproduction-prompt.md#optional-blender-inspection) describes that role and how to repeat the inspection.

| File | Responsibility |
| :--- | :--- |
| [Engine geometry](src/components/three/turbofan-engine.tsx) | Revolved sections, airfoils, instances, mechanical details, rotor animation |
| [Airfoil construction](src/components/three/airfoil-geometry.ts) | Swept sections, radial tip compensation, triangulated concave root/tip caps |
| [Scene and camera](src/components/engine-view.tsx) | Studio lighting, procedural environment, camera presets, stage explanations |
| [Airflow](src/components/three/airflow.tsx) | Cold bypass and warmer core paths, static guides, moving trails |
| [Stage annotation](src/components/three/engine-labels.tsx) | One selected stage label and leader line |
| [Simulation state](src/state/simulation.tsx) | Phases, spool-up, telemetry, history, layer and accessibility state |
| [Controls and telemetry](src/components/right-panel.tsx) | Start/pause/resume/reset, layers, readings, thrust trace |
| [Experience styles](src/styles.css) | Palette, typography, desktop and mobile composition |
| [Blender blade study](scripts/build-blade-study.py) | Optional deterministic authoring inspection; not loaded by the browser |
| [Blender regression checks](scripts/check-blade-study.py) | Standalone checks for geometry, ownership, rerun safety, and isolated export |

## Validation

Run the repository checks from its root:

```sh
pnpm build
pnpm lint
pnpm typecheck
```

For focused iteration, run `pnpm --filter @threejs-x-space/experience-turbofan lint` and `pnpm --filter @threejs-x-space/experience-turbofan typecheck`.

With Node.js 24, run `pnpm --filter @threejs-x-space/experience-turbofan check:geometry` to check concave cap coverage, winding, radial bounds, normals, and closed topology. The optional Blender safety checks are described in the [reproduction guide](docs/reproduction-prompt.md#optional-blender-inspection).

Review the portal and Turbofan route at **1280 × 720** and **390 × 844**, including initial, running, paused, resumed, reset, and reduced-motion states. Check all camera presets, stage selections, and scene layers. The [acceptance procedure](docs/reproduction-prompt.md#acceptance-procedure) lists the expected behavior without assuming that a future revision has passed it.
