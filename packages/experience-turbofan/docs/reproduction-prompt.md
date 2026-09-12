# Reproduce the Turbofan experience

This guide records the visual brief, a complete implementation prompt, and the parameters that make the result reproducible. Use the current source as the exact reference when continuing this package; use the master prompt and recipe when recreating the experience elsewhere.

The target is a graphite aerospace exhibit with a substantial silver intake fan and a clearly layered cutaway. The engine should hold attention before its controls do. Warmth belongs to combustion and the primary action; cool blue belongs to inlet and bypass flow. Geometry, lighting, material variation, and negative space provide the detail.

## Master prompt

Paste the following into a coding agent with access to a React, TypeScript, and Three.js project. In this repository, read `AGENTS.md`, `.x/README.md`, `.x/design.md`, and the existing Turbofan package before editing. Preserve unrelated working-tree changes.

```text
Build or refine an interactive Three.js turbofan cutaway called "Inside the turbofan."
Make it feel like a carefully lit aerospace museum section model: graphite surroundings,
cool silver machinery, bronze hot-section parts, subtle warm energy, and a calm editorial
interface. The engine is the dominant visual object. The result must be usable at
1280 x 720 desktop and 390 x 844 mobile.

Project and deliverables
- Use React, TypeScript, Three.js, React Three Fiber, and Drei. In threejs-x-space,
  keep the implementation in packages/experience-turbofan and preserve its portal route.
- Generate the runtime geometry, environment, airflow, and chart in code. Do not require
  a GLB, external HDRI, downloaded texture, remote font, or Blender installation to run.
- If Blender MCP is available, use it to inspect a deterministic procedural blade study.
  Preserve the script and explain exactly what was inspected. Port or mirror the same
  geometry recipe in Three.js; do not imply that Blender exported the runtime model.
- Include a package README and a docs/reproduction-prompt.md containing the complete
  brief, parameters, file map, refinement prompts, and verification procedure.
- All public code comments, interface copy, and documentation must be English. Preserve
  the /threejs-x-space/ production base path and the lightweight portal preview boundary.

Composition and material direction
- Put the engine on a deep blue graphite background near #0b1015. Use an open studio
  presentation with a soft contact shadow and controlled cool reflections.
- Frame the engine from the intake side in a diagonal perspective so the circular fan,
  length of the core, and aft nozzle can all be read. Keep empty space around the silhouette.
- Use silver/titanium around #b9c8d0, cooler steel around #627985, dark metal around
  #263a44, a graphite blue nacelle around #334d5c, and restrained bronze around #b48b60.
  Give cut edges a warm machined finish.
- Use metallic surfaces with roughness variation, a procedural RoomEnvironment through
  PMREM, cool key and rim lights, and a weak warm fill. Keep combustion emissive strength
  modest. Do not bury shape in bloom, saturated neon, or a cloud of particles.
- The intake lip should be smooth and rounded; blades should have real thickness and
  curved camber. Add repeated collars, fine fasteners, stator vanes, a few service pipes,
  annular burner details, and separate nozzle petals only after the main forms read well.

Engine construction
- Set the engine axis along world X. Air enters from negative X and exits toward positive X;
  Y is up and Z supplies the depth seen in the default view. Use arbitrary scene units.
- Build the base geometry approximately 4.9 units long and 3.4 units across at its widest
  point. Aim the camera near [2.2, 0, 0]. The spinner begins near X=0 and the aft cone ends
  near 4.87. For display, scale the engine, flow, and annotation groups together by
  [1.42, 1, 1] about [2.2, 0, 0]. This opens up the axial stages for inspection; it is an
  illustrative composition choice, not a statement of actual engine dimensions.
- Construct the nacelle and core shells by revolving closed axial/radial profiles around X.
  Keep an angular sector of the shells and add solid cut faces. The default shell sector
  starts at 2.32 radians and spans 3.68 radians; the removed sector exposes the upper/front
  machinery. Keep the intake lip complete so the circular opening remains recognizable.
- Make airfoil sections from a closed NACA-style thickness polynomial plus sinusoidal
  camber. Loft them along the radius with taper, axial/tangential sweep, and pitch changing
  along the span. Compensate radial Y for tangential Z with y=sqrt(max(0, radius²-z²)),
  so swept fan tips stay on their intended radius inside the shroud. Compute normals,
  triangulate the concave X/Z root and tip contours, and use separate cap vertices to
  preserve a sharp cap/skin boundary. Do not close them with a triangle fan. Instance the
  blade around X.
  These are illustrative forms, not a validated airfoil or a manufactured engine replica.
- Place a 24-blade fan near X=1.15, with hub radius 0.42, span 1.055, chord 0.54,
  sweep 0.26, twist 0.65, and 16 span subdivisions. Add a smooth spinner in front.
- Place five progressively smaller compressor rotor rows from X=1.62 to 2.43, with
  alternating stationary vanes. Keep their metallic layers visually separate.
- Place an annular bronze combustor around X=2.53 to 3.07, then four turbine rotor rows
  around X=3.22 to 3.97. Add a dark shaft, partial casing collars, and narrow service pipes.
- Form the exhaust from 18 separate petals starting near X=4.05 and a center cone.
- Keep two rotating groups: fan plus the aft three turbine rows follow N1; compressor
  plus the first turbine row follow N2. Stators, casing, and pipes stay still. Reset rotor
  angles with the simulation. Reuse geometry and instance repeated blades/bolts.

Camera and explanation
- Provide Perspective, Profile, and Intake buttons that restore readable views.
  Start from normalized directions [-0.52, 0.28, 0.81], [-0.08, 0.12, 0.99], and
  [-0.99, 0.08, 0.12] relative to the target. Use a 32-degree perspective field of view.
  Adapt distance to canvas aspect ratio rather than cropping the engine on narrow screens.
- Support drag-to-orbit, restrained limits, and desktop zoom. Mobile canvas gestures must
  allow normal vertical page scrolling. Preset buttons must remain usable with a keyboard.
- Add five selectable stages: Fan, Compressor, Combustor, Turbine, Nozzle. Show one
  selected annotation with a fine leader line and one short explanatory paragraph.
  Explain how each stage affects the airflow; do not crowd the engine with five labels.
  In Intake view, hide non-fan annotations because the core stages are behind the fan;
  retain the selected stage's text explanation.

Airflow
- Draw a small number of continuous low-opacity guides and short moving trails.
  Use 18 streams: nine cool bypass paths and nine core paths.
- Direct the paths from X=-1.2 to X=5.8. Interpolate their radial envelope smoothly through
  the inlet, fan, core, and exhaust. Use cool blue #89c7de for cold flow, pale gold #f0cd88
  for compressed core flow, and orange #ee9254 for hot core flow.
- Give bypass flow a larger radius around the core. Let the core flow contract behind the
  fan and warm through the combustor. This is a diagrammatic path design, not CFD.
- Keep idle guides visible. When running, animate short trails with modest speed tied to
  spool progress. Freeze trails on pause, hide moving trails at reset, and expose an
  Airflow toggle. Avoid a wrapped trail drawing a line across the whole engine.

Simulation and interface
- Start stationary with visible casing and flow guides, the fan selected, zero thrust,
  pressure ratio 1:1, and an empty thrust history. Do not start automatically.
- Provide Start engine, Pause engine, Resume engine, and Reset controls. The main action
  changes its label with the phase. Pause freezes the simulation clock, readings, chart,
  rotor motion, and trails. Resume continues from the held state. Reset clears the clock,
  progress, readings, and history. Casing and Airflow are independent layer toggles.
- Use deterministic illustrative telemetry updated at 4 Hz with a 12-second spool-up.
  Ease the readings with an ease-out cubic curve. Targets are N1 8450 rpm, N2 11200 rpm,
  thrust 34500 lbf, turbine inlet temperature 1320 degrees C, pressure ratio 28.5:1,
  and fuel flow 140.2 kg/min. Add only small deterministic sinusoidal fluctuations.
- Keep animation values in a mutable runtime ref so the 3D scene does not need React
  state updates every frame. Clamp frame delta and visibly slow rotor rotation to make
  blade structure readable; make clear that visual speed is not displayed RPM.
- Present a concise headline and status, a prominent start control, a large simulated
  thrust value, compact N1/N2 and auxiliary metrics, and a 30-second thrust trace.
  Label all readings as simulated. Use simple semantic HTML and an inline SVG plot.
- On desktop, put the engine beside a narrow instrument column. On mobile, place the
  engine first, keep camera/stage controls readable, and move telemetry below in a normal
  vertical flow. Avoid horizontal overflow, tiny instrument text, and clipped buttons.

Accessibility, performance, and verification
- Respect prefers-reduced-motion: keep rotors and trails static, retain static flow
  guides, and make camera preset changes immediate. Keep controls and telemetry usable.
- Use semantic buttons, aria-pressed for choices/toggles, visible keyboard focus, and a
  concise canvas description. Check WebGL 2 availability before mounting the renderer;
  provide a readable HTML fallback outside the canvas if it is unavailable.
- Use DPR [1, 1.75], reuse buffers and temporary objects in animation, dispose owned
  geometry/environment resources, and do not add expensive full-screen postprocessing.
  Enable antialias and preserveDrawingBuffer so paused frames remain available to canvas
  captures; retain the DPR bound to limit the size of the preserved drawing buffer.
- Run build, lint, and typecheck. Open the actual portal and Turbofan route at 1280 x 720
  and 390 x 844. Test initial, spool-up, steady, paused, resumed, reset, and reduced-motion
  states; every stage, camera preset, and layer toggle; keyboard access and mobile scroll.
  Inspect the console and verify the production base path. Report actual results and
  remaining limitations; do not claim a visual review based only on successful compilation.
```

## Geometry and scene recipe

### Coordinate and stage map

The local engine frame has its shaft on X. Flow moves toward positive X. The following positions describe the unscaled local geometry; they are layout references, not measurements of a real engine. For display, the engine, airflow, and labels share an X scale of `1.42` centered on `[2.2, 0, 0]`, so `displayX = 2.2 + (localX − 2.2) × 1.42`. Y and Z are unchanged. This stretch separates the axial stages visually and preserves their alignment with flow and annotations; it does not describe the proportions of a manufactured engine.

| Part | Axial position or range | Main shape |
| :--- | :--- | :--- |
| Spinner | `0.04–1.28` | Smooth closed axial profile |
| Intake lip and fan | Lip `0.455–0.87`; fan `1.15` | Full rounded lip, 24 swept blades |
| Compressor | `1.62, 1.86, 2.075, 2.26, 2.43` | Shrinking rotor rows with interleaved stators |
| Combustor | `2.53–3.07` | Annular liner, burners, collars, warm metal |
| Turbine | `3.22, 3.46, 3.71, 3.97` | Four rotor rows with interleaved stators |
| Nozzle and cone | Petals `4.05–4.7`; cone to `4.87` | 18 petals surrounding an aft cone |

For each airfoil span fraction `t`, the construction uses `width = chord × (0.72 + 0.43 × sin(t × π × 0.65))` and `pitch = 0.38 + twist × t`. A cosine-spaced closed contour samples chord fraction `u`; the thickness polynomial uses coefficients `0.2969, -0.126, -0.3516, 0.2843, -0.1036`. Thickness reduces along the span from `0.1` to `0.048`, and camber is `width × 0.075 × sin(π × u)`. Sweep offsets both X and Z. Radial compensation sets `Y = sqrt(max(0, radius² − Z²))`, keeping the swept section on its intended circular radius; fan tip vertices therefore remain at radius `1.475` rather than projecting through the shroud. The [airfoil helper](../src/components/three/airfoil-geometry.ts) contains the exact transform and topology; the [engine assembly](../src/components/three/turbofan-engine.tsx) contains shell profiles and row parameters.

The cambered root and tip outlines are concave. Triangulate their X/Z contours instead of using a triangle fan, which would overlap the outline. Duplicate the 32 root and 32 tip vertices so computed cap normals do not smooth across the skin boundary. The fan's source mesh has 544 skin vertices plus 64 cap vertices, for **608 vertices and 1,084 triangles**. Root cap triangles face radially inward; tip cap triangles face radially outward.

The use of a familiar airfoil thickness polynomial describes a modeling technique. It does not establish aerodynamic accuracy, structural integrity, or suitability for fabrication.

### Lighting and camera baseline

| Setting | Value |
| :--- | :--- |
| Canvas background | `#0b1015` |
| Fog | None; distant narrow-canvas framing keeps the same contrast |
| Camera | Perspective FOV `32`; near `0.1`; far `max(70, fitDistance + 30)` |
| Target | `[2.2, 0, 0]` |
| Display transform | Engine, airflow, and labels scaled `[1.42, 1, 1]` about the target |
| Preset distance | Intake `max(10, 10 / aspect)`; other views `max(8.4, 13.8 / aspect)` |
| Orbit distance limits | Minimum `5`; maximum `max(16, fitDistance)` |
| Environment | `RoomEnvironment`, PMREM blur `0.035`, intensity `0.9` |
| Ambient | Intensity `0.45` |
| Key | `[-3, 7, 5]`, intensity `2.2`, `#e7f3ff` |
| Rim | `[4, 2, -5]`, intensity `3.2`, `#a2c5e0` |
| Warm fill | `[1, -1, 5]`, intensity `0.7`, `#f1c195` |
| Contact shadow | `[2.2, -1.82, 0]`, opacity `0.45`, scale `13`, blur `2.8`, resolution `512`, one frame |
| Pixel ratio | `[1, 1.75]` |
| Renderer | `antialias: true`, `preserveDrawingBuffer: true` |

These are the implementation baseline, not universal lighting rules. Reassess contrast and framing in the actual canvas if the geometry or surrounding layout changes. Exact current values live in the [scene component](../src/components/engine-view.tsx).

The Intake distance leaves room for the rounded lip and fan annotation. `fitDistance` is the selected preset distance, calculated from the canvas aspect ratio; orbit limits and the far plane grow with it so a tall, narrow canvas is not forced back into a cropped view. The nozzle label is positioned at local `[4.0, 1.65, 0.4]`, with its leader anchored at `[4.3, 0.51, 0.47]`, so its text stays within the narrow composition. The renderer preserves the drawing buffer to keep paused frames available to canvas captures; the bounded pixel ratio limits that buffer's dimensions.

### Airflow and telemetry

The [airflow implementation](../src/components/three/airflow.tsx) uses 18 paths, 90 guide segments per path, and nine segments per moving trail. Radial paths are interpolated over X stations `[-1.2, 0.75, 1.3, 2.4, 3, 4.2, 5.8]`:

| Stream | Radius at each station |
| :--- | :--- |
| Bypass | `1.15, 1.38, 1.41, 1.12, 0.91, 0.85, 0.83` |
| Core | `0.72, 1.1, 0.73, 0.5, 0.53, 0.46, 0.62` |

The [simulation provider](../src/state/simulation.tsx) advances at `0.25 s` intervals. Progress reaches one in `12 s`; the displayed values use `1 − (1 − progress)³`. Small deterministic sine variations make steady readings less rigid. History is capped at 600 samples, and the UI displays the most recent 120 samples in a 30-second window. Rotor rotation uses displayed RPM multiplied by a visual scale of `0.012`; it is intentionally slower than a literal RPM conversion. The fan and aft three turbine rows follow N1, while the compressor and first turbine row follow N2. Reset also restores the rotor angles.

The simulation state, runtime animation ref, and scene configuration are separate contexts. This keeps telemetry updates at 4 Hz while allowing animation to read current values without rebuilding the engine every frame.

## Optional Blender inspection

Blender MCP was used as an authoring inspection tool for the procedural fan-blade geometry with Blender 5.2.1 LTS. The [deterministic blade study](../scripts/build-blade-study.py) reproduces the runtime fan parameters as 24 linked blade objects, using a source mesh with 608 vertices and 1,084 triangles. Its concave caps use Blender's contour tessellation with the same boundary and winding as the Three.js construction. Ownership, rerun, cap geometry, and export checks run in a separate disposable Blender process. These checks verify the authoring recipe and its handling of scene data; they are not engineering validation.

The browser model is built directly by Three.js; no Blender export, `.blend` file, or GLB is needed by the experience. A Blender study can be useful for viewing the root, tip, silhouette, normals, and repeated fan arrangement separately from the browser lighting and interface.

From the repository root, generate the study with an installed Blender executable:

```sh
blender --python packages/experience-turbofan/scripts/build-blade-study.py
```

Alternatively, ask a Blender MCP coding tool to read and execute the script, or run it with `runpy.run_path(script_path, run_name="__main__")` in Blender's Python console, where `script_path` points to that file in the checkout. The script prints the generated scene name. Select that scene in Blender's scene selector, then use its camera view or frame the blades for inspection. It retains the active scene, mode, selection, and workspace viewpoints rather than switching them automatically.

Generated data carries ownership markers and explicit object references. The default names are **Turbofan Airfoil Study** and **Turbofan Procedural Study**; Blender adds suffixes when unrelated data already uses those names. Reruns replace only the owned, unshared, unselected generation. User-added objects and copies remain in their collection; selected or actively edited generated objects are also retained. Externally linked objects, shared meshes/materials/worlds, and whole collections used elsewhere are preserved. Older unmarked studies are retained rather than adopted by name. Only the fresh generation is exported, so preserved user content does not enter the preview GLB.

The study includes a camera, three area lights, an AgX view transform, and a 960 × 960 Cycles setup at 32 samples. A clean rerun does not accumulate generated objects or datablocks; retained user edits and external references intentionally remain available.

Inspect the result from both the intake and an oblique angle. Compare its shape parameters with `airfoilGeometry` and the fan's `BladeRow` call in the runtime source. Geometry that looks convincing in Blender must still be reviewed under the actual Three.js camera and materials.

For a quick construction check, add `--background` to the command. That prints the generated counts and exits without saving a scene. The script optionally accepts `-- --output <preview-path>.glb` after the Blender command to save an authoring preview; the website does not load it. Keep temporary exports and rendered study files outside the committed source tree.

Run the [Blender regression checks](../scripts/check-blade-study.py) in a separate factory-startup process:

```sh
blender --background --factory-startup --python-exit-code 1 --python packages/experience-turbofan/scripts/check-blade-study.py
```

The checks cover name collisions, repeat-run data counts, blade topology and cap winding/area, shared data and external links, user additions and duplicated objects, preservation of an active edit, and GLB contents. They refuse to run in an interactive Blender session. Temporary exports are automatically removed after inspection.

Do not substitute an opaque generated asset for the deterministic recipe. If a future version deliberately ships an exported asset, document its generator, export settings, size, license, and runtime loading path separately.

## Staged refinement prompts

Use these after the master prompt when one area needs another pass. Keep unrelated behavior intact and verify every visible change in the browser.

### 1. Silhouette and mechanical depth

```text
Review only the Turbofan geometry and its framing. First judge the stationary engine with
airflow hidden at desktop and mobile sizes. Strengthen the large intake fan, rounded lip,
tapered core, and aft nozzle silhouette before adding detail. Replace flat blade shapes
with closed, cambered, swept, spanwise-twisted airfoil geometry. Give cut shells visible
thickness and clean cut faces. Keep rotors and stators spatially distinct. Use a small
number of precise collars, fasteners, service pipes, and nozzle petals. Preserve the
world-X axis, stage positions, simulation behavior, and source-generated runtime assets.
If Blender MCP is available, inspect the same deterministic airfoil parameters there and
record the reusable script. Finish by checking Perspective, Profile, and Intake views.
```

### 2. Materials and flow hierarchy

```text
Refine the existing Turbofan lighting and airflow into a quiet graphite aerospace exhibit.
Keep metal readable through broad cool reflections, different roughness values, and a
subtle warm hot section. Reduce effects that hide blade thickness or cutaway structure.
Airflow should read as 18 restrained continuous paths with short moving highlights:
blue bypass, warming core, warm exhaust. Keep static guides informative before starting.
Confirm that pause freezes trails, reset clears moving flow, the layer toggle affects all
flow geometry, and reduced motion retains static explanatory paths. Compare casing on/off
and idle/running screenshots using the same camera before accepting the revision.
```

### 3. Interface and responsive composition

```text
Refine the Turbofan interface around the engine rather than increasing instrument density.
Make the heading, main action, state, selected stage, and simulated thrust easy to find.
Use a graphite/silver palette with restrained amber emphasis, clear type roles, compact
metrics, and a 30-second SVG thrust plot. Keep one selected 3D stage annotation, suppressing
hidden non-fan annotations in Intake view while retaining the stage description. At
1280 x 720, give the model the main area beside a compact instrument column. At 390 x 844,
reflow the scene, stage explanation, controls, and telemetry into a readable vertical
composition. Check keyboard focus, button hit areas, all three camera views, all five
stages, page scroll over the canvas, and the absence of horizontal overflow or clipped
controls. Keep interface copy English and explicit that the readings are simulated.
```

### 4. Behavior and final review

```text
Validate the Turbofan in the actual running portal at desktop 1280 x 720 and mobile
390 x 844. Start from a fresh route, start the 12-second spool-up, reach steady state,
pause, wait, resume, and reset. Verify that clock, telemetry, history, rotors, and trails
agree with the current phase. Test camera presets, orbit, selected stages, casing, airflow,
keyboard access, reduced motion, and the WebGL 2 fallback where feasible. Review the portal
entry and production /threejs-x-space/ base path. Run repository build, lint, and typecheck.
Report actual results with any limitations, then update the package reproduction guide
where verified implementation details have changed. Do not commit or publish unless asked.
```

## Acceptance procedure

Run the [development and check commands](../README.md#run-locally) from the repository root. Inspect the actual page at **1280 × 720** and **390 × 844**. This is a repeatable review procedure, not a record that an arbitrary future revision has passed.

| Check | Expected result |
| :--- | :--- |
| Initial scene | Complete engine silhouette; still rotors; fan selected; quiet flow guides; usable start control |
| Start and steady state | Visible spool-up over 12 seconds; readings and thrust trace advance; rotor and trail motion remain legible |
| Pause and resume | Clock, values, trace, rotor motion, and trail positions hold while paused, then continue |
| Reset | Clock, progress, values, and history return to initial state; moving trails disappear; no delayed stale readings |
| Stage selection | All five buttons select the matching explanation; one annotation appears in Perspective/Profile, while Intake hides non-fan annotations to avoid labeling the foreground fan as a hidden core stage |
| Camera presets | Perspective, Profile, and Intake produce distinct useful views; choosing a preset restores its framing after orbiting |
| Casing and airflow | Each layer toggles predictably in idle, running, and paused states |
| Mobile | No horizontal page overflow, clipped essential controls, unreadable measurements, or canvas scroll trap |
| Keyboard | Controls have visible focus, accessible names, and usable pressed/disabled states |
| Reduced motion | Rotor and trail animation is static; guide paths, controls, descriptions, and telemetry remain useful; presets change immediately |
| Resilience | If WebGL 2 is unavailable, a readable HTML fallback appears while descriptions and controls remain usable; no unexplained browser errors; portal navigation and direct route loading work |
| Production path | Build works with `/threejs-x-space/`; the Turbofan entry and return navigation resolve correctly |

For a comparable visual record, capture the default perspective in its initial state, the same view at steady state, a profile with the casing hidden, and the mobile layout including its controls. Record the viewport and motion preference with each image. Review the result for hierarchy and legibility as well as functional correctness.

## Background references

- [NASA's turbofan introduction](https://www.grc.nasa.gov/www/k-12/BGP/Animation/turbtyp/etff.html) provides context for the fan, core, and bypass explanation.
- [Three.js InstancedMesh documentation](https://threejs.org/docs/pages/InstancedMesh.html) describes the repeated-geometry API used for blades and fasteners.
- [Three.js PMREMGenerator documentation](https://threejs.org/docs/pages/PMREMGenerator.html) describes the environment preparation used for the procedural studio reflections.

These references explain the subject and rendering tools. They are not sources of engineering dimensions or telemetry for this illustrative engine.
