# Rebuild Orbital Playground from zero

Copy the entire prompt below into a coding task with an empty working directory. It specifies a complete standalone experience; the final section explains optional integration into the public `threejs-x-space` workspace. No existing implementation, screenshot, generated asset, or earlier conversation is required. A generative rebuild can vary in small visual details; the interaction contract and deterministic flight checks are the reproducible baseline.

## Copyable prompt

````text
Build a complete interactive Three.js experience named "Orbital Playground" from an empty directory. Implement the files, acquire and optimize the assets, run the application, inspect it in a real browser, and fix issues before handing it over. Deliver working source and documentation, not a mockup or a plan.

1. Premise and scope

Create a cinematic miniature planetary system. A visitor pulls a solar-powered deep-space probe backward, sees a three-dimensional trajectory preview, then releases it to fly under the combined gravity of three stationary bodies. The mission is to pass safely within the assist range of all three distinct bodies. Provide a guided launch that completes the mission, an Overview camera, a Chase camera, pause/resume, and deterministic recovery.

The three fictional destinations are Pelagos, an Earth-like ocean world; Nyx, a Mars-like rocky world; and Helios, a Sun-like star. Their appearance uses real scientific imagery, but the scene's scales, masses, distances, and flyby scoring are deliberately playful. State "A playful gravity model · Not to scale" in the interface. Display velocity in "u/s" and flight time in simulation seconds. Do not imply that this is a calibrated solar-system simulator or a scientifically accurate gravity-assist maneuver around moving planets.

Do not use a flat solar-system diagram, a static hero image, randomly generated continents, neon target rings, a ground-launch rocket sequence, or regular tubular loops around the star. Depth must come from perspective, light, material, occlusion, parallax, the probe, and the flight path.

2. Standalone scaffold

Use TypeScript, React 19, Three.js 0.177, React Three Fiber 9, Drei 10, and React Three Postprocessing 3. Use Vite 6 and its React plugin for the standalone application. Use pnpm and save the generated lockfile. Write all source comments, interface text, and public documentation in English.

Start with a package.json containing type="module" and scripts for dev, build, preview, lint, and typecheck. Install compatible versions in these families:

pnpm add react@^19.1.0 react-dom@^19.1.0 three@0.177.0 @react-three/fiber@^9.1.0 @react-three/drei@^10.1.0 @react-three/postprocessing@^3.0.4
pnpm add -D typescript@^5.8.0 vite@^6.3.0 @vitejs/plugin-react@^4.5.0 @types/react@^19.1.0 @types/react-dom@^19.1.0 @types/three@^0.177.0 eslint@^9.29.0 @eslint/js@^9.29.0 typescript-eslint@^8.34.0 eslint-plugin-react-hooks@^5.2.0

Use strict TypeScript with DOM libraries, ESNext modules, moduleResolution="Bundler", jsx="react-jsx", noEmit, and vite/client types. Configure ESLint for TypeScript and React hooks. Use build="tsc --noEmit && vite build", typecheck="tsc --noEmit", lint="eslint src", dev="vite", and preview="vite preview". Create index.html with a root element, src/main.tsx mounting the application, and vite.config.ts using the React plugin. Set body margin to zero and make the standalone experience occupy at least the visible viewport. It must also support being embedded in a parent page without requiring a global fixed-position overlay.

Keep modules understandable:

src/main.tsx
src/index.tsx                  Experience shell and HTML controls; export OrbitalExperience
src/orbital-scene.tsx          Dragging, flight loop, trail, previews, cameras
src/spacecraft.tsx             Local GLB loading, cloned scene, engine plumes
src/space-config.ts           Pure simulation state and shared fixed-step functions
src/celestial-bodies.tsx       Three worlds and their material shaders
src/space-environment.tsx      Stars, galactic dust, asteroids, moon, postprocessing
src/styles.css
src/assets/                   Five optimized local textures and astra-probe.glb
README.md
ASSET_CREDITS.md
docs/rebuild-prompt.md         Save this complete prompt with any verified refinements
docs/spacecraft-prompt.md      Complete Blender MCP spacecraft authoring prompt
docs/blender/astra-probe.blend Canonical compressed editable spacecraft source
docs/blender/README.md         Construction, editing, and export guide
docs/blender/.gitignore        Ignore Blender backups and comparison outputs
scripts/verify-flight.ts       Repeatable simulation invariants
scripts/build-spacecraft.py    Deterministic Blender source and GLB export

Add a small repeatable physics verification script for the invariants described below. With Node.js 22.6 or later, use verify:flight="node --experimental-strip-types scripts/verify-flight.ts" and node:assert/strict, importing the pure simulation module with its explicit .ts extension. Keep the browser TypeScript project scoped to src so the script's Node types and import syntax do not become a browser build requirement. Document this Node version requirement for verification. Do not depend on a physics engine, backend, API key, downloaded 3D spacecraft model, paid font, or runtime image hotlink.

The spacecraft is an original Blender-authored GLB. Use Blender through an available Blender MCP connection to author and inspect it, save its canonical compressed editable source at docs/blender/astra-probe.blend, and retain the same deterministic bpy construction as scripts/build-spacecraft.py. Preserve separate parts and useful modifiers in the source before the runtime merge. Blender is an asset-authoring dependency; the browser and ordinary pnpm builds load the bundled GLB and must not require a running Blender process. If Blender MCP is unavailable, identify that missing capability instead of claiming a Blender pass or silently replacing the model with runtime boxes.

3. Acquire the surface assets

Use the following exact source files. Download them during development, check that each response is an actual image, and store local assets with the target names below. Import them using new URL("./assets/<filename>", import.meta.url).href so Vite fingerprints them and handles deployment under a base path.

Earth day surface:
- Target: src/assets/earth-blue-marble.png, 2048 × 1024.
- Download: https://svs.gsfc.nasa.gov/vis/a000000/a002900/a002915/bluemarble-2048.png
- Source record: https://svs.gsfc.nasa.gov/2915/
- Credit: NASA/Goddard Space Flight Center Scientific Visualization Studio; Blue Marble Next Generation data courtesy of Reto Stöckli, NASA/GSFC, and NASA Earth Observatory.

Earth clouds:
- Target: src/assets/earth-clouds.jpg, 2048 × 1024.
- Download: https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57747/cloud_combined_2048.jpg
- Original source record: https://visibleearth.nasa.gov/images/57747/blue-marble-clouds
- Credit: NASA Goddard Space Flight Center; image by Reto Stöckli.
- The historical record may redirect to NASA Earth Observatory. The direct image URL is supplied so acquisition does not depend on that page's navigation.

Earth night lights:
- Target: src/assets/earth-night-lights.jpg, 1024 × 512.
- Download: https://svs.gsfc.nasa.gov/vis/a030000/a030000/a030003/earth_lights_print.jpg
- Source record: https://svs.gsfc.nasa.gov/30003/
- Credit: NASA/Goddard Space Flight Center.

Solar surface:
- Target: src/assets/sun-sdo-surface.jpg, 1024 × 1024 after preparation.
- Download: https://svs.gsfc.nasa.gov/vis/a010000/a011200/a011211/20130220_143000_4096_HMIIC.jpg
- Source record: https://svs.gsfc.nasa.gov/11211/
- Credit: NASA/SDO/HMI/Goddard Space Flight Center.
- This is a full-disk observation, not an equirectangular world map. Crop a square from inside the visible solar disk so black space is excluded, retain the sunspot region, resize to 1024 × 1024, and save an optimized JPEG. Record the exact crop and conversion used. Treat it as observed surface detail blended with procedural convection, not as a scientifically exact full-sphere solar map.

Mars surface:
- Target: src/assets/mars-viking.jpg, 1440 × 720.
- Download: https://space.jpl.nasa.gov/tmaps/pix/mar0kuu2.jpg
- Source record: https://space.jpl.nasa.gov/tmaps/mars.html
- Credit: NASA/JPL-Caltech/USGS; global texture from Viking mission imagery.

For each file, record the source URL, credit, target dimensions, and any crop, resize, or compression in ASSET_CREDITS.md. Keep the total runtime texture payload around 3 MB; do not ship the full-resolution solar source or huge TIFFs. If a source moves, locate its replacement through the linked official record and document the replacement instead of silently substituting an unrelated image.

Check NASA's media guidelines at https://www.nasa.gov/nasa-brand-center/images-and-media/ and JPL's image use policy at https://www.jpl.nasa.gov/jpl-image-use-policy/. Attribute the imagery, do not imply NASA/JPL/Caltech endorsement, and do not claim that the project's MIT code license relicenses the source imagery.

4. Exact simulation contract

Use Three.js Vector3 values or equivalent numeric triples. Keep the three body centers stationary. Their order in the body array is Helios, Nyx, Pelagos:

id       position                radius   mass   assistRange
helios   [-0.7, 0.1, -1.4]       1.30     38     2.35
nyx      [-4.35, -1.65, -3.2]    0.84      7     1.45
pelagos  [3.25, 2.05, 1.35]      0.96     11     1.72

LAUNCH_POINT = [3.8, -1.15, 1.75]
GUIDED_PULL = [0.176, -0.383, 0.303]
MAX_PULL = 2.65
LAUNCH_POWER = 2.65
SIMULATION_STEP = 1 / 120
PROBE_CLEARANCE = 0.16
ESCAPE_RADIUS = 17.5
GRAVITY = 0.82
PREDICTION_SECONDS = 16
PREDICTION_SAMPLE_STEPS = 6

Represent a flight with phase, position, velocity, visitedBodies (a Set of body IDs), score, combo, and flightTime. Valid phases are ready, aiming, flying, paused, crashed, escaped, and complete. A new mission begins at LAUNCH_POINT with zero velocity, score, combo, and time, and an empty visitedBodies set.

Implement one mutating stepFlight(flight) function used by both prediction and live flight. It is a no-op unless phase is flying. Use this exact event order:

a. Before movement, detect collision when distance to any body center is strictly less than body.radius + PROBE_CLEARANCE. Detect escape when distance to the origin is strictly greater than ESCAPE_RADIUS. Collision takes priority over escape.
b. If no boundary was reached, for each body let d = body.position - flight.position, r2 = max(dot(d,d), 0.48), and accumulate acceleration += d * (GRAVITY * body.mass / pow(r2, 1.5)). Use semi-implicit Euler: velocity += acceleration * SIMULATION_STEP, then position += velocity * SIMULATION_STEP. Increment flightTime by SIMULATION_STEP.
c. Check the same boundaries again after movement. On crash or escape, set that phase, set velocity to zero, clear combo, and stop this step without awarding an assist.
d. For each unvisited body whose center distance is strictly less than assistRange, add its ID to visitedBodies, increase combo by one, and add 900 * combo to score. A body can count only once per mission. There is no invisible steering force or automatic velocity boost on scoring.
e. When all three distinct IDs have been visited, set phase=complete and add 3000 points exactly once. Stop simulation stepping. Preserve the final position and velocity for the completion view.

For rendering, maintain an accumulator in a ref. While flying, accumulate min(frameDelta, 0.05); repeatedly execute the exact fixed step while the accumulator permits it. Clamp elapsed render time to prevent a hidden tab from causing an enormous catch-up jump. Report accumulated simulation time, not wall-clock time. Pausing must not add to the accumulator or advance flightTime. Publish HTML telemetry approximately every 0.14 seconds, and immediately on phase changes and newly awarded assists; do not use React state for every simulation step.

predictOrbit(position, velocity, visitedBodies) copies its inputs into an independent flight, sets phase=flying, and executes the same stepFlight up to 16 simulation seconds or a terminal phase. Keep the initial point, every sixth step, and the exact terminal point for drawing. Evaluate gravity, boundaries, and assists at every 1/120-second step even though the rendered line has fewer samples. Do not mutate live position or the live visited set. Track the closest surface clearance for a small marker. Classify the prediction as danger if it crashes, assist if it reaches a previously unvisited assist range without crashing, and safe otherwise; danger wins over an earlier assist. Escape is a separate terminal outcome, not a collision.

The guided launch must start at LAUNCH_POINT + GUIDED_PULL with velocity = -GUIDED_PULL * LAUNCH_POWER. It should visit Pelagos at approximately 1.267 seconds, Nyx at 5.125 seconds, then Helios and complete at 9.625 simulation seconds, with score 8400 and three unique body IDs. Preserve these constants unless verification proves an implementation mismatch. Do not replace the guided launch with a tween or a hand-authored flight path.

5. Direct manipulation and recovery

In ready state, show a faint, static preview of the guided route so the space already suggests a journey. Make the probe easy to hit with an invisible raycast sphere larger than its central body, without hiding the visible mechanical model.

On pointer-down on the probe, capture that pointer and enter aiming. Build a Three.js Plane through LAUNCH_POINT with its normal equal to the current camera's world viewing direction. Raycast pointer motion onto this plane. Set pull = clampLength(hitPoint - LAUNCH_POINT, 0, MAX_PULL), position = LAUNCH_POINT + pull, and predicted velocity = -pull * LAUNCH_POWER. This is a world-space launch that changes with the viewing direction, not a two-dimensional screen animation. Disable OrbitControls while the probe is hovered or being dragged so orbiting cannot steal the gesture.

During aiming, show a thin gold tether from the launch point to the pulled probe, with a low-opacity outer line and sparse moving pulses. Show the predicted path as a fine dashed three-dimensional line, with sparse directional particles, a small closest-approach marker, and a low-opacity ghost probe at the endpoint. Use pale cyan for a clear path, mint for a flyby opportunity, and coral for collision risk. Synchronize a readable HTML status sentence with this classification. Color alone is insufficient feedback.

On pointer-up, use the authoritative position ref from the most recent pointer event, not a possibly stale React state closure. If pull length is below 0.22, return to ready without launching. Otherwise apply the same launch position and velocity used by prediction, clear the old trail and accumulator, and enter flying. Release pointer capture. Handle pointercancel separately: cancel the gesture and return to ready, never launch. In R3F 9, mesh onPointerCancel may only clear hover internally; attach pointercancel and lostpointercapture listeners to the actual connected DOM event target, clean them up on unmount, and release any active capture on reset. Verify cancellation in the browser instead of relying only on JSX handlers. Ignore unrelated pointer IDs.

Maintain a reusable pool of 240 trail points. Add a point every 0.025 simulation seconds during flight and render a fading cyan trail with InstancedMesh. The trail must follow actual simulated positions.

Provide these HTML actions:
- ready: "Launch probe" for the guided route.
- aiming: disable the launch button; continue to allow Reset.
- flying: "Pause flight".
- paused: "Resume flight".
- crashed or escaped: "Try again".
- complete: "Fly again".
- every state: a secondary "Reset" action.

Try again returns to LAUNCH_POINT and ready state, clears combo, flight time, trail, drag state, and accumulator, and restores Overview, but preserves visitedBodies and score. Reset and Fly again also clear visitedBodies and score. Use a monotonically increasing command ID so identical repeated commands are handled once each and resize or callback changes cannot replay old commands.

6. Camera and probe

Use a perspective camera, FOV 48, near plane 0.08, and far plane 180. Start desktop Overview at [-6, 5, 12], looking at [0, -0.55, -0.6]. Start narrow-screen Overview near [-9, 8.2, 27] and tune framing in the browser so all three bodies and the probe remain readable. Use OrbitControls with no panning, damping around 0.055, distance limits 6 to 28, and polar limits 0.35 to 2.55. Call controls.update() after setting the home position and target; its distance limit clamps the narrow home offset to 28 units. Orbiting must be manual, without automatic camera rotation.

For the probe's attitude and Chase camera, build an upright velocity frame: forward=normalize(velocity), right=normalize(WORLD_UP cross forward), and up=normalize(forward cross right), with WORLD_UP=[0,1,0]. If the first cross product is nearly zero, use [1,0,0] as right. Form the probe quaternion from this right/up/forward basis and smooth toward it, keeping the dorsal instruments above the flight plane through heading changes.

Set the Chase position to probePosition - forward*distance + right*lateral + up*height. Use distance/lateral/height of 3.95/1.3/1.45 on desktop and 6.6/0.65/2.2 on mobile. Aim 1.15 units ahead along forward and use frame-rate-independent exponential smoothing. Disable OrbitControls during Chase. Allow Chase for flying, paused, and complete states; the paused view stays still. When a visitor switches from Overview to Chase while already paused, immediately compute this same composition once without advancing the flight. Reset and Try again restore the same known Overview framing even if the view was already Overview.

Author an original spacecraft named "Astra-02" in Blender through Blender MCP. Its silhouette is an elongated faceted ceramic-white vehicle with an armored graphite spine, restrained copper structure, an optical sensor nose, a parabolic communication dish, two segmented photovoltaic wings, and three recessed ion nozzles. The craft should feel like assembled exploration hardware. Use actual beveled geometry, layered panels, hinges, ribs, radiator vents, and supporting struts; do not recreate the old box-and-two-flat-panels model with additional decorations.

Target an authored envelope of approximately 3.694 units wide, 2.374 units long, and 1.2324 units high, then integrate at 0.68 runtime scale. The exported GLB contract is +Z forward, +Y up, centered around the vehicle body. Author all dimensions in runtime coordinates and map a runtime point [x,y,z] to Blender [x,-z,y]; use export_yup=True to recover the intended runtime axes. Verify the exported nose, wing plane, dish, and engine direction rather than assuming Blender and Three.js share world axes.

Construct the primary forms first: a tapered octagonal body with an ivory shell, a darker inset top spine and lower chassis, a silver nose collar with dark optical glass, a shallow concave dish on a braced mast, and a tapered rear propulsion housing. Define the main hull's stations as [z, halfWidth, halfHeight, centerY]: [-0.77,0.28,0.21,0.02], [-0.52,0.38,0.27,0.02], [0.38,0.32,0.23,0.04], [0.84,0.21,0.16,0.04], [1.12,0.12,0.12,0.04]. At each station, form an eight-vertex cross-section by chamfering the rectangle's corners, join consecutive loops, cap both ends, and add a small bevel.

Add two articulated wing assemblies, each with two leaves centered near absolute X=0.945 and 1.555, each leaf around 0.576 wide by 0.68 long with a six-column by five-row cell grid. Step outer leaves slightly down and aft; separate leaves with visible hinges, thin graphite frames, and metal spars. Put the main rear nozzle at [0,0,-1.18] with exit radius 0.225, and smaller vector nozzles at [-0.47,-0.02,-0.91] and [0.47,-0.02,-0.91] with exit radius 0.117. Include dark inner throats, small cyan emissive cores, and restrained copper induction rings. Add radiator louvers and a few purposeful sensor/antenna details that remain readable from the Chase camera. Keep copper and cyan accents sparse. Do not introduce external logos or uncredited model parts.

Use named Principled BSDF materials that export cleanly to glTF metallic-roughness PBR: off-white ceramic shell, rough graphite structure, warm brushed copper, navy photovoltaic cells, silver engine hardware, dark optical glass, and low-strength cyan status elements. Give hard surfaces real bevels and appropriate smooth normals. Use meshes for silhouette and medium details; do not depend on Blender-only procedural shaders, compositor effects, or baked lighting to make the GLB attractive. Reuse and join repeated cell geometry or group compatible parts to keep draw calls and file size reasonable. Keep the model self-contained with no external image textures.

Save the Blender construction and export logic in scripts/build-spacecraft.py, compatible with Blender 4.2 or later. It must create a deterministic model from scratch, own a named "Orbital - Astra 02" scene in an existing Blender session, remove only its previously owned objects, and handle reruns without accumulating duplicate craft. Export only the craft with use_selection=True AND use_active_scene=True to src/assets/astra-probe.glb; selection alone can include selected objects from other scenes. Exclude authoring cameras, lights, studio floor, and test objects. Apply supported modifiers deliberately, join static meshes into one object with about eight material primitives, avoid negative scales, and inspect a fresh import of the GLB. The reference model is about 0.9 MB with 33,516 triangles and no image textures; use those as a practical loading budget rather than adding a compression decoder.

Support this package-directory command: blender --background --python scripts/build-spacecraft.py -- --output src/assets/astra-probe.glb --blend docs/blender/astra-probe.blend. With no --output, resolve the default asset path relative to the script's parent package, not an arbitrary current directory. Save --blend before converting modifiers and joining parts, retaining the current separate objects, bevel/normal modifiers, dish thickness modifier, materials, and authoring camera/lights in a compressed scene-only archive. Preserve unrelated open scenes. Optional --preview <image.png> renders the finalized model afterward. Keep authoring files out of the browser bundle.

Write docs/blender/README.md with the Blender version, main construction stages, source/generator authority, manual divergence if any, comparison rebuild command, saved-source reopen/export command, runtime axes and scale, and actual validation. The current design is entirely generated, so record that no manual model changes exist outside the recipe. Future manual edits must be represented in the generator or documented before a rebuild replaces them. Ignore *.blend[0-9]* and a .review/ comparison directory in docs/blender/.gitignore. Save the focused full modeling instructions as docs/spacecraft-prompt.md so a later task can rebuild the asset without this whole application prompt.

In src/spacecraft.tsx, export Spacecraft with boolean props active, paused, and reducedMotion. Load new URL("./assets/astra-probe.glb", import.meta.url).href using Drei useGLTF. Memoize a clone of the loaded scene and clone each unique material once per mounted instance. Set castShadow/receiveShadow on mesh clones. Preserve loader-cached geometry and textures; mount the primitive with dispose=null and dispose only the owned material clones on unmount. Mount it under the existing flight-position and velocity-quaternion group, using the verified runtime scale and orientation. Keep the invisible picking mesh and all physics logic outside the authored model.

Generate a local reflection environment from Three.js RoomEnvironment using PMREMGenerator.fromScene(room, 0.04). Apply the resulting texture only to the cloned MeshStandardMaterial instances, with envMapIntensity=0.7. Do not set the entire scene.environment or relight the planets. Dispose of the temporary RoomEnvironment and generator after creating the map; on unmount, clear references from owned materials and dispose of the PMREM render target. This needs no external HDR asset and must not modify loader-cached source materials.

Attach runtime Three.js blue ion plumes to the three model-local exit positions above, inside the same scaled group. Use additive blending, depthWrite=false, a bright narrow core and a softer outer cone; fade opacity down the plume and toward its edges. Initial outer plume radius/length are 0.1/0.82 at the main nozzle and 0.055/0.46 at the side nozzles. Show them during flight and hold their accumulated pulse time while paused or reduced motion is enabled. A small local fill light may help the silhouette, but it must not flatten the material contrast. Engine glow is a visual cue and must not add a hidden acceleration force.

Orient the exported +Z nose using the upright velocity-basis quaternion above. Keep the full solar-panel silhouette visible in both Chase layouts. Loading the GLB must participate in the existing Suspense and error-boundary flow. Do not replace the final spacecraft with a glowing dot, a point sprite, or a primitive-only substitute.

7. Celestial art direction

Render a recognizable Earth-like Pelagos from three layers. Use the actual Blue Marble day map, a separate cloud map on a shell around radius*1.009, and an atmosphere shell around radius*1.018. Rotate the planet slowly, about 0.025 radians per second, with an additional cloud rotation around 0.012 radians per second. Start the planet near rotation [0.18, -0.25, 0.22].

Write a surface ShaderMaterial that computes world-space normals and world-space positions. The direction to Helios determines the terminator; do not light the night face from the camera. Blend a restrained ambient contribution into the lit map. Identify the nearly black blue ocean from the source color and add a deep blue water response with a narrow view-dependent specular glint. Display city lights only on the night side using a smooth mask from the normal–sun dot product. Keep geographic texture readable instead of converting bright land pixels into exaggerated geometric relief.

The cloud shader uses the cloud texture as density, lit using the same solar direction, with transparent gaps and depthWrite=false. Treat cloud density as data, not an sRGB color map. Day, night, Mars, and solar color imagery use SRGBColorSpace. Use repeat wrapping horizontally and reasonable anisotropy (up to 8, bounded by device capability).

For the thin atmosphere, use a back-side sphere, additive blending, depthWrite=false, and a Fresnel factor pow(1-abs(dot(normal, viewDirection)), 3.2), multiplied by a sun-facing mask. The absolute value matters: clamping a negative dot product on a back-side shell makes the entire shell glow. Use a soft blue atmosphere for Pelagos with strength around 0.45 and a much weaker dusty warm edge for Nyx around 0.13. Avoid an opaque glow disc or a thick neon rim.

Render Helios with a detailed photosphere shader over a high-quality sphere. Combine luminance from the cropped HMI texture with procedural noise at body-space frequencies 4.2, 13, and 52, weighted 0.24, 0.56, and 0.2. Use slow drift, dark observed sunspots, and limb darkening near 0.43 + 0.57 * pow(facing, 0.42). Mid-scale convection must remain readable; fine grain should not flatten the surface to beige. Keep surface contrast visible at the actual Overview size. Use restrained orange-to-warm-gold linear radiance, initially mixing [0.64, 0.1, 0.012] and [1.42, 0.63, 0.13]; do not clip the whole surface to featureless white. Let emissive highlights exceed display white slightly for selective bloom. Add a separate warm-white PointLight at the star center, approximately color #fff4e5, intensity 42, distance 28, decay 1.75. Enable shadows for the scene and relevant solid meshes, with a modest 512 × 512 light shadow map. The star's surface must not cast a shadow that blocks its own central light. Add a restrained warm solar corona on a camera-facing plane sized radius*5 on each side; use radial alpha exp(-r*r*38)*0.2 with r=length(uv-0.5), additive blending, and depthWrite=false. It is a smooth falloff, not a bright ring. Do not add decorative tube prominences.

Nyx uses the real Viking map on a smooth, sufficiently subdivided sphere, pale warm material tint, roughness around 0.94, metalness 0, and very shallow bump around 0.003. Preserve a believable silhouette and readable warm terrain; do not displace it into a noisy rock ball. Give it a slow 0.045 rad/s rotation and an initial tilt near [0.25, 1.45, -0.36].

Use sphere segments around 96 × 64 for the main surfaces and 64 × 48 for clouds and atmosphere. Prefer controlled material detail over unnecessary mesh subdivision.

8. Space and postprocessing

Make the background near-black navy with substantial negative space. Build a faint inclined galactic dust band on the inside of a sphere of radius 110. A band normal near normalized [0.58, -0.81, 0.08], broad and fine noise, a darker central dust lane, cool blue-gray dust, and a restrained warm core give depth without a bright purple nebula. Its movement is barely perceptible.

Add approximately 2800 soft round stars in one Points draw. Seed positions deterministically (for example an LCG seeded with 73819) between radii 38 and 93; use mostly dim neutral white with occasional muted cool and warm stars. Use a point shader with a soft circular falloff and bounded perspective-dependent size, not large square pixels. Keep stars fixed in world space so camera movement produces parallax.

Add an understated belt of about 240 tiny irregular asteroids using InstancedMesh around Helios, plus a small gray decorative moon near Pelagos. These are visual depth cues and do not participate in gravity or scoring. Avoid a bright solid ring. Add low-intensity cool hemisphere and ambient fill without flattening the planetary night sides.

Use ACES filmic tone mapping and dpr=[1,1.5]. Begin postprocessing with EffectComposer multisampling=0, Bloom luminanceThreshold=1.1, luminanceSmoothing=0.35, intensity=0.38, mipmapBlur=true, and a subtle Vignette with offset=0.16 and darkness=0.38. Bloom should support the solar energy, plume, and a few path highlights; it must not blur all the stars or wash out the planet textures. Ensure shader output conversion is applied consistently and not twice.

9. HTML composition and responsive behavior

Use a quiet editorial mission layout. Core palette: background #050a11, ivory text #f1eee5, muted blue-gray #99a5af, fine translucent blue-gray rules, and warm gold #eac58a for the primary action. Reserve mint for completed flybys and positive trajectory feedback, coral for collision/escape feedback, and cyan for trajectories. Use system fonts so the application is self-contained: a refined serif stack such as Iowan Old Style/Palatino/Georgia for the title, a clean system sans-serif for controls, and a monospace stack with tabular numerals for telemetry.

Desktop target: 1440 × 900. Keep the Three.js scene dominant. Position an airy title at upper left: small uppercase kicker "A little universe to get lost in", then "Orbital" and an italic "Playground" with large, light serif lettering. Below, use "A small push. A different path. Let gravity take you somewhere new." Make the title a real h1 and keep decorative header areas pointer-events:none.

Place a compact destination itinerary in the upper right, headed "The grand tour" with a zero-padded completed count such as 00 / 03. List Pelagos / Ocean world, Nyx / Rocky world, and Helios / Solar flyby. Each has a small CSS sphere, a number while pending, and a checkmark once visited. This is a progress itinerary: arbitrary user routes can visit bodies in a different order, and a checkmark must follow the real visitedBodies set. Do not fake progress based on elapsed time.

Near the lower scene edge, provide the Overview / Chase probe segmented control. Use aria-pressed and an explicit disabled state when Chase is unavailable. Anchor a fine-rule mission control area beneath it with a concise phase label, one helpful status sentence, the gold primary action, and a quieter Reset button. Below another fine rule, show flight time, velocity, mission score, and the interaction hint. Keep this interface compact enough that it frames the celestial scene rather than becoming a dashboard wall.

Use responsive layout rules around 760 pixels. At 390 × 844, use a smaller single-line or carefully wrapped title, move the itinerary into a compact horizontal strip, keep the planets and probe in a clear middle scene region, place camera controls beneath the scene, and stack the status/actions/telemetry without horizontal overflow. Secondary body labels may be hidden on mobile. Use at least comfortable 44-pixel primary touch controls and visible focus rings. Use a scrollable outer experience shell and a relative inner stage (minimum height about 640 pixels on desktop and 780 pixels on narrow screens) so controls remain reachable inside a portal that has a fixed viewport height. Set touch-action:pan-y on the narrow canvas event surface, allowing horizontal aiming while vertical movement can scroll the shell and cancel a drag. Permit normal vertical page movement outside direct canvas manipulation; do not make the whole document a touch-action:none surface. Check the actual narrow layout rather than shrinking the desktop composition uniformly.

Status copy must distinguish ready, aiming safe/assist/danger, flying, paused, crashed, escaped, and complete. Examples: "Take the guided flight, or pull the probe to chart your own course", "A flyby is within reach", "This path meets a planet", "Flight paused", "Beyond the system", and "Three worlds, one journey". Keep the phase and status in an aria-live="polite" region; do not announce telemetry updates every animation frame. Buttons and navigation must work with the keyboard, so a visitor can launch, pause, resume, change camera, and reset without dragging.

10. Loading, failures, and motion

Use Suspense for texture loading with a visible centered loading message such as "Preparing your little universe" and "Loading planetary surfaces". Handle texture/render errors with a React error boundary and a useful retry or return action. Provide a clear Canvas fallback for unavailable WebGL. The standalone build must own its error boundary; if embedded in a portal, a surrounding route error boundary may own it instead. Never leave an unexplained blank canvas.

Read prefers-reduced-motion on first render and subscribe to preference changes. Stop nonessential planetary rotation, dust movement, moon orbit, tether pulses, and plume pulses when requested. Keep the simulation and manual controls functional. Pause also freezes flight time, positions, trail updates, and decorative scene motion; resume continues from the saved simulation state. Accumulate decorative shader time and orbit angles only while motion is enabled, preserving their current values while paused; do not reset time to zero or jump to wall-clock time on resume. No automatic audio.

Memoize geometries, materials, uniform objects, and seeded arrays. Reuse Vector3, Quaternion, and Object3D temporaries in frame loops. Use refs for continuous simulation data and React state only for interface snapshots or structural changes. Dispose of manually created geometry and remove event listeners on unmount. Do not import the full experience into a lightweight collection preview.

11. Implementation order and verification

First implement the pure simulation and verify the guided launch. Then use simple spheres and a temporary probe to close the complete input → prediction → launch → pause/resume → terminal state → retry/reset loop. Author Astra-02 in Blender MCP, save its source script, inspect and export the GLB, and replace the temporary probe through useGLTF. Next build celestial materials and camera composition, then the restrained environment, then the responsive HTML layer. Add postprocessing last. Inspect rendered results while working.

Automated or repeatable model acceptance:
- The guided launch from a fresh state reaches three unique assists in Pelagos → Nyx → Helios order, phase complete, score 8400, and approximately 9.6 simulation seconds.
- Repeating the guided launch yields the same terminal state, time, score, and positions.
- Replaying the accumulator with 24, 30, 60, 120, and 144 FPS frame deltas yields identical terminal physics results.
- Prediction samples equal the positions produced by the live integrator at corresponding fixed steps, including the terminal point; drawing interpolation is not used as simulation input.
- A position inside body.radius + 0.16 crashes before an assist can be awarded. A position outside radius 17.5 escapes. A body cannot count twice.
- Paused state does not advance time or position. Retry preserves visited IDs and score but clears combo/time; Reset clears all progress.

Browser acceptance:
- Inspect the actual application at 1440 × 900 and 390 × 844. Save representative ready, aiming, flying/Chase, paused, and completed screenshots.
- The first view clearly presents a recognizable Earth-like planet, a textured solar surface, rocky Nyx, and the mechanical probe. The light direction and parallax convey three-dimensional space.
- Inspect Astra-02 in Blender from three-quarter, top, side, nose, and rear views, then reimport its exported GLB. Verify the nose is +Z, the top is +Y, materials survive export, and the runtime plume origins meet all three nozzles. Review the actual GLB in both Overview and Chase; Blender's studio view is not sufficient evidence of browser quality.
- Run the saved spacecraft script in a fresh background Blender process and compare triangle count, bounds, material set, and absence of unrelated content with the bundled GLB. Exported name metadata can change byte size slightly; a hash match is not required. Record only regeneration checks actually performed.
- Reopen the canonical .blend in a distinct background Blender process, verify the separate editable parts and modifiers without external asset directories, and export it to a temporary GLB using only the export stage. Compare that source-derived export with the runtime contract. Do not archive a reimported merged GLB as the original editable source.
- Guided launch completes, camera switching works, pause freezes the flight, resume finishes it, and replay restores the initial view.
- Test a custom drag, a short pull, pointer cancellation, collision/escape recovery, and Reset during interaction. The preview and resulting flight agree.
- Verify no clipped essential controls, unintended horizontal scrolling, unreadable status copy, or overlays that intercept the probe.
- Check keyboard focus, reduced motion, normal mobile scrolling outside the canvas gesture, slow asset loading, a failed texture request, and unavailable WebGL.
- Check the browser console for unexplained errors and warnings. Run build, lint, and typecheck successfully. Inspect emitted asset URLs with a non-root Vite base such as /threejs-x-space/.

Write README.md explaining setup, controls, simulation units, limitations, module ownership, asset credits, and how to reproduce the result. Save this full prompt in docs/rebuild-prompt.md and synchronize it with any final verified implementation changes. Report the files changed, commands run, browser viewports and states checked, and any remaining limitation. Do not claim a clean-room regeneration or browser check that was not actually performed. Do not commit, push, deploy, or publish unless separately requested.

12. Optional integration into the public threejs-x-space repository

Only use this section when the working directory is already the public cofy-x/threejs-x-space workspace. Read that repository's AGENTS.md and task-specific documentation first. Do not create a second standalone app beside its portal.

Place the owning implementation under packages/experience-orbital with package name @threejs-x-space/experience-orbital, export OrbitalExperience from src/index.tsx, and use the workspace's existing TypeScript and ESLint configuration packages. Put this prompt at packages/experience-orbital/docs/rebuild-prompt.md and the case overview at packages/experience-orbital/README.md.

Register or retain the lazy route at /experiences/orbital through apps/portal/src/experiences.ts and the package dependency in apps/portal/package.json. Keep any collection preview lightweight and preserve unrelated portal behavior. Ensure production works under /threejs-x-space/. Link the case README from the root experience catalog. Use the repository's existing error boundary and navigation where appropriate.

Run pnpm --filter @threejs-x-space/portal dev --host 127.0.0.1 for browser review and pnpm build, pnpm lint, and pnpm typecheck for final checks. Run pnpm --filter @threejs-x-space/experience-orbital verify:flight for the focused simulation assertions. Inspect both the portal home and the Orbital route at desktop and 390 × 844 mobile sizes. Keep unrelated experiences and existing worktree changes intact.
````

## Sources used by the prompt

The asset recipe follows [NASA's Blue Marble surface record](https://svs.gsfc.nasa.gov/2915/), the [Blue Marble cloud record](https://visibleearth.nasa.gov/images/57747/blue-marble-clouds), [Earth's City Lights](https://svs.gsfc.nasa.gov/30003/), the [SDO sunspot observation](https://svs.gsfc.nasa.gov/11211/), and [JPL's Viking texture record](https://space.jpl.nasa.gov/tmaps/mars.html). Attribution and reuse remain subject to the [NASA media guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/) and [JPL image use policy](https://www.jpl.nasa.gov/jpl-image-use-policy/). See the case's [asset credits](../ASSET_CREDITS.md) for the bundled files.
