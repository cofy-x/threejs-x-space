# Recreating Clockwork Courier

This guide explains how the game was assembled and how to reproduce its workflow. For the rules and controls, start with the [experience README](../README.md). For an agent-assisted rebuild, use the [recreation prompt](recreation-prompt.md).

## Choose what to reproduce

| Goal | Approach | Expected result |
| --- | --- | --- |
| Run the existing game | Use the checked-in source and GLB | The current experience, subject to browser and GPU differences |
| Regenerate Pip | Run the checked-in Blender Python script | The same procedural model design; exporter versions can change the binary |
| Rebuild with an AI assistant | Follow the prompt, using Blender MCP for asset creation | A comparable game and workflow, not guaranteed identical geometry or pixels |

Blender MCP was used during development to execute modeling code in Blender. It is an authoring connection, not a runtime dependency. Visitors only load the exported GLB and the web application. Most of the world—including islands, architecture, machinery, signs, and foliage—is generated directly in Three.js.

## Run the reference

Use Node.js 22.6 or newer for the package's type-stripped rule tests, and the pnpm version declared in the repository's `packageManager` field. Blender is optional unless you want to regenerate the asset. Run these commands from the repository root:

```sh
pnpm install --frozen-lockfile
pnpm --filter @threejs-x-space/portal dev --host 127.0.0.1
```

Open the URL printed by Vite with `/experiences/courier` appended. Dependencies require installation, but the game does not fetch remote models, textures, fonts, or audio at runtime.

## 1. Define the game before adding detail

The premise is one robot, one reusable energy core, three mechanical obstacles, and a lighthouse delivery. The visual direction is a handmade toy: cream surfaces, orange cargo accents, teal structures, brass machinery, and floating islands.

Separate the implementation into these responsibilities:

| Source | Responsibility |
| --- | --- |
| [Game rules](../src/game.ts) | Grid topology, legal commands, state transitions, pathfinding, objectives, checkpoints |
| [World builder](../src/world.ts) | Geometry, materials, signs, static batching, procedural architecture |
| [Scene](../src/scene.tsx) | GLB loading, camera, animation, lighting, picking, render resource ownership |
| [Experience interface](../src/index.tsx) | Keyboard and pointer input, controls, pause, optional sound, local best-run storage |
| [Styles](../src/styles.css) | Desktop and mobile composition, focus states, controls, overlays |
| [Rule tests](../tests/game.test.mjs) | Solvability and invalid-state regressions without WebGL |

Keep the pure rules authoritative. An animated bridge should display the current state; its mesh position should not become a second source of truth for whether a tile is reachable.

## 2. Make an animation-ready courier in Blender

The [Blender source](../tools/build_courier.py) builds Pip from beveled boxes, cylinders, and a small antenna sphere. It joins meshes by moving part while preserving material slots. There is no skeletal rig: Three.js animates named object transforms.

Preserve the node names `Body`, `Head`, `ArmL`, `ArmR`, `LegL`, and `LegR`. Put origins at the neck, shoulders, and hips before export so rotations behave like joints. The script exports with Y-up conversion; check the imported facing direction and floor contact in Three.js instead of assuming Blender and web axes match.

For a repeatable regeneration, run this from the repository root with `blender` on your PATH:

```sh
COURIER_OUTPUT="$PWD/packages/experience-courier/src/assets/courier.glb" \
  blender --background --python packages/experience-courier/tools/build_courier.py
```

This replaces the checked-in GLB. To inspect a candidate first, set `COURIER_OUTPUT` to another absolute filename. The script creates its output directory, builds in a temporary scene, exports only that scene's selected objects, and restores the previous scene in `finally`. It uses Blender node types to locate the Principled shader instead of relying on a localized node display name. If a different Blender version rejects a shader input or export option, compare it with the source before adapting the script.

For the MCP workflow:

1. Connect an MCP-capable assistant to a running Blender instance and verify that scene inspection and Python execution are available. Connection setup depends on the Blender MCP integration you use.
2. Inspect the existing scene before running modeling code. Keep unrelated objects intact.
3. Have the assistant execute the procedural model source with an explicit output destination, preserving the named parts and pivots. Set `os.environ["COURIER_OUTPUT"]` inside the Blender Python process before executing the script: changing an environment variable in a separate terminal does not update an already-running Blender instance. Resolve script and output paths on the machine running Blender; they may differ from the assistant's filesystem.
4. Inspect the model in Blender, then load the GLB in the browser and check silhouettes, materials, scale, facing direction, and limb motion.
5. Keep the script and optimized GLB in the package. The current asset is about 350 KiB; large intermediate `.blend` files are unnecessary for running the game.

If MCP is unavailable, the CLI command above still reproduces the asset. A fresh natural-language modeling request may produce a different robot even with the same art direction; preserve the source script when repeatability matters.

## 3. Build the puzzle as a small state machine

Represent positions as integer grid coordinates with a height lookup. Legal movement requires one adjacent tile at the same height. Use that same lookup for breadth-first pathfinding and keep world construction consistent with it; exclude decorative structures from walkable space.

The core can occupy exactly one location: ground, carried, one of the three machines, or the beacon. Commands are available only near the relevant station and at its height.

1. **Drawbridge:** insert the core, cross, latch the far lever, return, retrieve the core. Removing power before latching disconnects the route.
2. **Lift:** insert the core and step aboard before riding. The platform retains its height after retrieval and can be powered again for a return trip.
3. **Turnbridge:** rotate the powered bridge until aligned, cross and latch it, then retrieve the core. Rotate around its anchored end so the visible connection agrees with the navigation grid.
4. **Delivery:** carry the core to the lighthouse. Optional stamps reward exploration before completion.

Checkpoint recovery restores a reachable player and core together with the required mechanism states. Preserve collected stamps. Test that every checkpoint can still lead to a completed delivery, rather than testing only its immediate coordinates.

## 4. Add the world and interface

Block out the islands and test a complete route before adding plants, rails, signs, gears, and clouds. Batch static geometry by material; retain separate transform groups for moving mechanisms. Use local procedural textures and an environment generated in Three.js to avoid an external asset dependency.

Use an orthographic overview to introduce the route and show completion. During play, follow Pip on both desktop and mobile, with an explicit map toggle. The full map explains geography, but its small character is a poor default for inspecting or controlling the courier.

Keep objectives and actions in HTML. Keyboard movement, a touch direction pad, and walkway picking should all feed the same rules. Release held input on blur or pointer cancellation, cancel queued movement on pause and recovery, and prevent interactions during lift travel. Pause gameplay time and respect reduced motion. Sound starts only after an explicit toggle; storage failure must not block play.

## 5. Review clarity and interaction, not only appearance

These issues surfaced during the implementation and review:

| Symptom | Cause to check | Applied approach |
| --- | --- | --- |
| Soft edges on a high-density display | Canvas drawing buffer below device resolution | Raise the DPR ceiling from 1.6 to 2; compare buffer size with CSS size and device pixel ratio |
| Pip and signs look indistinct | Too little screen space in the overview | Default to the follow camera during play; keep map mode available |
| Oblique signs lose detail | Texture minification at a shallow angle | Apply hardware-bounded anisotropic filtering |
| One click reaches multiple surfaces | Ray intersections propagate through scene objects | Stop propagation on handled pointer events |
| Clouds or visual markers intercept movement | Decorative geometry participates in picking | Disable its raycasting; exclude visual overlays from solid shadow casting |
| A stationary move increments the score | Adjacency check also accepts the same coordinate | Reject identical positions and test fractional destinations |
| Route cleanup affects a later model instance | GLTF clones share loader-owned geometry and materials | Exclude cached model resources from disposal of scene-owned objects |

The scene has no depth-of-field postprocessing. Increasing resolution cannot make an overview label readable if it occupies only a few screen pixels. Inspect both a native-resolution capture and the actual page at normal zoom; a scaled screenshot alone can hide the distinction. A DPR of 2 costs more pixels than 1.6, so retain a ceiling and reassess performance on target hardware.

## 6. Integrate and verify

The portal dependency, lazy experience registration, and lightweight SVG preview are separate from the game implementation. Follow the repository's [new-experience instructions](../../../README.md) when building a variant. Avoid loading the GLB from the catalog preview. Import the model through Vite's asset URL handling so it works under the production base path.

From the repository root:

```sh
pnpm --filter @threejs-x-space/experience-courier test
pnpm build
pnpm lint
pnpm typecheck
pnpm --filter @threejs-x-space/portal preview --host 127.0.0.1 --port 4173 --base /threejs-x-space/
```

With the preview server running, open `http://127.0.0.1:4173/threejs-x-space/experiences/courier`. The explicit preview base matches the production build. Confirm the GLB loads from the built assets and direct navigation works. Stop the preview server after testing.

Review at least a 1280 × 720 desktop viewport and 390 × 844 mobile viewport. Cover the introduction, movement, cargo pickup, all mechanisms, pause/resume, checkpoint recovery, completion, replay, reduced motion, asset failure, and leaving/reopening the route. Check console errors, horizontal overflow, touch scrolling, control readability, and the agreement between visible mechanisms and legal movement. Complete a three-stamp run through real controls as well as through the rule tests.

The deliverable is working source, a reproducible asset script, an optimized GLB, a lightweight portal entry, and recorded validation results. Use the [recreation prompt](recreation-prompt.md) to turn this workflow into an implementation request.
