# Build Astra-02 with Blender MCP

This focused prompt reconstructs the original spacecraft asset for Orbital Playground. Copy the full block into a coding task with Blender and a Blender MCP connection available. It is independent of the existing model and does not require a reference image. The [complete experience prompt](rebuild-prompt.md) supplies the planetary scene and flight simulation. For continued editing, use the [canonical Blender source and guide](blender/README.md); to regenerate the geometry, run the [saved generator](../scripts/build-spacecraft.py). A new implementation of the prose may vary in small details.

## Copyable prompt

````text
Create an original deep-space exploration spacecraft called Astra-02 using Blender through Blender MCP, save a deterministic bpy source script, export a self-contained GLB, and integrate the exported model into a React Three Fiber scene. Do the modeling and visual inspection in Blender; do not substitute a runtime primitive model or download somebody else's spacecraft.

Goal

The craft belongs to a quiet cinematic planetary experience: navy space, an ivory editorial interface, gold sunlight, realistic Earth/Mars textures, and a small but clearly engineered probe. Its hero view is a three-quarter rear Chase camera, with occasional close inspection from other angles. It must also have a clean, recognizable silhouette when small in an Overview composition.

Design a long faceted ceramic-white body with a graphite structural spine, copper mechanical accents, an optical nose, a dish antenna, two broad articulated solar arrays, and three ion engine nozzles. It should read as exploration hardware assembled from different functional parts. Emphasize silhouette, bevels, spacing, and material contrast before tiny detailing. Avoid a flying cube, toy rocket, fighter-jet silhouette, uniformly gold body, large neon trims, random greebles, or decorative rings. It is an original design and must not copy a recognizable commercial spacecraft or use an external logo.

Deliverables

- scripts/build-spacecraft.py: complete deterministic source that builds every mesh and material and exports the result.
- docs/blender/astra-probe.blend: canonical compressed editable source, saved before parts are merged and modifiers converted for runtime export.
- docs/blender/README.md and .gitignore: concise construction/editing/export guide and rules excluding *.blend[0-9]* backups and .review/ comparison outputs.
- src/assets/astra-probe.glb: the self-contained runtime asset.
- src/spacecraft.tsx: a small useGLTF loader component and runtime ion plume layer when working inside a React Three Fiber project.
- ASSET_CREDITS.md: identify the spacecraft as original repository-authored geometry and materials, record the source script and license, and retain separate credits for any unrelated existing assets.
- Documentation of the exact Blender command, model axes, runtime scale, and actual verification performed.

When working in the public threejs-x-space workspace, put these files under packages/experience-orbital and follow its existing conventions. In an empty directory, use these relative paths directly. Ordinary browser builds must load the bundled GLB without needing Blender installed or running.

Proportion and axes

Start with an overall authored envelope around 3.694 units across the wing span, 2.374 from nose to engines, and 1.2324 high including the dish. The body should occupy roughly the middle third of the span, leaving the arrays clearly distinct on either side. Treat these as a coordinated starting proportion, then inspect the actual result before final export.

The exported GLB must use +Z as the nose/flight direction, +Y up, and X across the wings. Center its origin on the vehicle body. Integrate it at 0.68 runtime scale, then verify that the full silhouette fits the existing Overview and Chase compositions. Author each position in runtime coordinates and map [x,y,z] to Blender [x,-z,y]; export_yup=True then restores the intended runtime axes. Do not fix a backward or sideways export with unexplained scattered rotations in React. Check the exported axes after a fresh GLB import or a Three.js inspection.

Primary construction

1. Form an elongated tapered chassis from a custom octagonal cross-section. Use stations [z, halfWidth, halfHeight, centerY] of [-0.77,0.28,0.21,0.02], [-0.52,0.38,0.27,0.02], [0.38,0.32,0.23,0.04], [0.84,0.21,0.16,0.04], and [1.12,0.12,0.12,0.04]. For half-width w and half-height h, use cross-section vertices (0.67w,h), (-0.67w,h), (-w,0.6h), (-w,-0.6h), (-0.67w,-h), (0.67w,-h), (w,-0.6h), (w,0.6h), adding centerY to each vertical coordinate. Join loops, cap ends, fix outward normals, and bevel around 0.018 units. Give it a solid ceramic-white upper shell, a darker lower chassis, and a visible graphite top spine. Add a small number of inset or layered service panels with real edge depth.
2. At the nose, add a dark optical assembly recessed within a metallic silver collar. Use a deep glass-like central lens with a smaller inner optical surface and a protective surrounding frame. A few small navigation sensors can flank it. The nose should establish forward direction without becoming a weapon.
3. Raise a shallow concave parabolic dish on an angled support. Build the dish as a radial mesh with a measured curved profile, a thin contrasting rim, and a back surface or structural thickness. Add a compact central feed and a few supporting struts. It must face a plausible communication direction and remain distinct from the spine; do not use an opaque flat disc.
4. Build mirrored photovoltaic wing assemblies. Each wing has two framed leaves, centered at absolute X=0.945 and 1.555. Each leaf is approximately 0.576 wide, 0.045 thick, and 0.68 long, with six columns and five rows of cells. Set inner center near Y=0.014,Z=-0.13 and outer center near Y=-0.034,Z=-0.28 so the assembly steps down and aft. Add small copper/silver hinges, support spars, dark navy cells, fine busbars, and contrasting narrow frame edges. Cell faces, gaps, frame edges, and hinge centers should be legible in close view without adding hundreds of separate draw calls. Design the wings so they cannot be mistaken for weapons or solid decorative fins.
5. Build a tapered rear engine housing with three individually readable ion nozzles. The main exit is [0,0,-1.18] with radius 0.225; side exits are [-0.47,-0.02,-0.91] and [0.47,-0.02,-0.91], each with radius 0.117. Each nozzle has an outer metal collar, a tapered bell, a darker interior, a recessed small cyan core, and mounting structure. The exhaust direction is -Z in the exported model. Leave unobstructed space behind each bell for a runtime plume; no flame geometry should be baked into the GLB.
6. Add functional medium details: radiator vent louvers, braced struts, panel fasteners, a short antenna or sensor mast, and selected maintenance seams. Keep most detail near real joints, heat-management surfaces, sensors, or housings. Reduce any detail that turns into visual noise in the actual Chase view.

Material system

Use named Principled BSDF materials with glTF-friendly metallic-roughness parameters and simple node setups. Starting linear RGB, metallic, and roughness values are:
- Astra_Hull: [0.75,0.81,0.83], 0.18, 0.29.
- Astra_Graphite: [0.022,0.035,0.050], 0.55, 0.34.
- Astra_Trim: [0.34,0.45,0.50], 0.78, 0.24.
- Astra_Copper: [0.54,0.25,0.075], 0.72, 0.30.
- Astra_Solar: [0.014,0.041,0.082], 0.50, 0.27.
- Astra_SolarAlternate: [0.025,0.069,0.116], 0.50, 0.29; use sparingly in the cell grid.
- Astra_Glass: [0.005,0.033,0.049], 0.64, 0.16.
- Astra_Ion: [0.055,0.58,0.82], 0.25, 0.24, with emission strength around 2.2 on tiny elements only.

Use geometry and portable PBR materials to establish the quality. Do not rely on Blender's viewport matcap, compositor bloom, a studio environment that is absent in Three.js, unbaked procedural shading, or texture files outside the GLB. The spacecraft should need no external image textures. Use visible bevel widths appropriate to each part, sensible normals, and enough curve segments for the dish and bells at their actual rendered size. Keep repeated bolts and cell subdivisions economical.

Reproducible source and export

Use the available Blender MCP code-execution tool to run a coherent bpy construction script. Save that same script as scripts/build-spacecraft.py; do not leave the source only in an MCP call or a temporary text block. Make geometry creation, material creation, collection ownership, modifier application, and export readable. Use deterministic parameters and explicit object names; if randomness is used, seed it.

The script must work from a fresh Blender file and support Blender 4.2 or later. When running in an existing session, own a scene called "Orbital - Astra 02" and remove or replace only its earlier generated objects, marked with an ownership property. Preserve unrelated objects and scenes. Rerunning must not duplicate the spacecraft. Do not overwrite unrelated assets or rely on a particular local absolute path.

Provide a headless usage command of the form:

blender --background --python scripts/build-spacecraft.py -- --output src/assets/astra-probe.glb --blend docs/blender/astra-probe.blend

Implement --output, defaulting to the owning package's src/assets/astra-probe.glb path resolved from the source script location. Resolve supplied output paths predictably and create the output directory if needed. Save --blend before the runtime conversion and merge, with separate named parts, bevel and normal modifiers, dish Solidify, materials, and a compact inspection studio intact. Compress the archive and include only the authored scene and its dependencies. Also support --preview <image.png>, rendering the finalized model after export. Keep native Blender files, downloaded tooling, preview renders, and authoring-only caches out of the runtime assets directory.

Document which file is the canonical editable source and which script is its executable recipe. The initial craft is entirely generated, without manual divergence. Future manual edits do not update the generator automatically: represent them in code or document how they are preserved before rebuilding. Include a comparison build into docs/blender/.review/ and a clean saved-source reopen/export command that calls the export stage without recreating geometry. A merged GLB is the runtime hierarchy, not the editable authoring source.

Export GLB with glTF-compatible materials and only the model's objects. Set both use_selection=True and use_active_scene=True: selection alone can include selected objects from other open scenes. Exclude the inspection camera, lights, background, studio floor, and any temporary test geometry. Apply transforms and supported modifiers deliberately; avoid negative scales and unexpected parent transforms. Join static parts into one mesh with eight material primitives. The reference asset contains 33,516 triangles, zero images, and 901,172 bytes; keep a comparable loading budget. Inspect geometry/triangle counts, material counts, and the actual GLB size, and reject exports containing unrelated node or material names. Do not add Draco or another decoder requirement unless the file-size benefit justifies the extra loading complexity.

Blender and GLB acceptance

- Inspect the real model in Blender from three-quarter front, three-quarter rear, top, side, nose, and rear views. The dish, tapered nose, wings, and three engine bells should all be identifiable.
- Check bevel highlights, panel thickness, material contrast, attachment points, and whether supports appear mechanically connected. Fix intersections, floating parts, flipped normals, and abrupt shading artifacts.
- Export, then freshly import or inspect the GLB. Verify the same forms and materials survive export, its center and bounds are sensible, +Z points through the nose, +Y points upward, and all three engine mouths face -Z.
- Run the saved source from a fresh background Blender process. Verify that it successfully regenerates a usable GLB without depending on the already-open scene or unrecorded actions. Compare triangle count, bounds, material set, and absence of unrelated content; naming metadata may make the byte size differ slightly. Report this check only if it was actually run.
- Reopen docs/blender/astra-probe.blend in a distinct background process. Verify separate editable geometry, preserved modifiers, materials, and portable dependencies. Export a temporary GLB from that saved source without running construction again, then compare it against the runtime contract. Report only observed source-reopen/export results.

Three.js integration

Load the local asset through useGLTF(new URL("./assets/astra-probe.glb", import.meta.url).href). Memoize a cloned scene for this component instance and clone each unique source material once, reusing that instance clone for meshes that share it. Set castShadow and receiveShadow on cloned meshes. Mount with dispose=null and dispose only owned material clones on unmount; shared source geometry and textures belong to the loader cache. Keep the loading component inside the experience's existing Suspense and error boundary.

Generate probe-only reflections from Three.js RoomEnvironment with PMREMGenerator.fromScene(room, 0.04). Assign the map to the cloned MeshStandardMaterial instances at envMapIntensity=0.7. Preserve the planetary scene's environment and light direction. Dispose of the temporary room and generator after map creation; clear material references and dispose of the PMREM render target on unmount. No external HDR file or texture download is needed.

Export a Spacecraft component with boolean active, paused, and reducedMotion props. Mount it under the existing position/quaternion group. Keep the physics position, velocity, collision clearance, invisible drag hit area, pointer capture, and launch logic independent of the asset. Swapping the model must not change the guided route or scoring.

Build an upright heading frame with forward=normalized velocity, right=normalize([0,1,0] cross forward), and up=normalize(forward cross right). Use [1,0,0] as the right vector when the first cross product is nearly zero. Derive the probe quaternion from that basis, preserving the readable dorsal side through heading changes. For Chase, use position-forward*distance+right*lateral+up*height: desktop values are 3.95/1.3/1.45, mobile values are 6.6/0.65/2.2. Look 1.15 units ahead along forward. Use the same basis when switching to Chase while paused, without advancing the simulation.

Place a narrow bright blue core and wider translucent outer plume behind each verified nozzle. Use inexpensive runtime meshes, additive blending, depthWrite=false, and restrained opacity that fades down the plume and toward its edges. The exhaust travels toward -Z in the craft's local coordinates. Use the exit positions above inside the same scaled model group, with starting outer radius/length 0.1/0.82 for the main plume and 0.055/0.46 for side plumes; verify they meet the actual mouths in the browser. Add motion only to plume length/intensity, not to the spacecraft origin. Show engines during flight, hold decorative time while paused or reduced motion is enabled, and retain useful static lighting on the craft. Plumes do not apply additional physics acceleration.

Browser acceptance

Inspect the model under the application's real solar lighting in Overview and Chase at 1440 × 900 and 390 × 844. It must remain recognizable, complete wing tips must fit the Chase frame, the nose must follow velocity, and the plumes must align with all three engines. Verify launch, custom dragging, pause/resume, paused camera switching, completion, and reset. A good Blender render alone does not satisfy this check.

Run the existing application's build, lint, typecheck, and focused flight verification if present. Check the built GLB URL under /threejs-x-space/ when integrating into that public workspace. Keep NASA/JPL texture attribution separate from this original model's license. Report the source path, exported asset path, actual dimensions/size, Blender export and regeneration evidence, browser views checked, and any remaining limitation. Never claim a modeling tool, export, render, or browser check ran unless its output was observed. Do not commit, push, or publish unless separately requested.
````
