# Clockwork Courier recreation prompt

Copy the prompt below into a coding assistant working in a checkout of `threejs-x-space`. It is an implementation brief, not a guarantee of identical AI-generated geometry. Read the [recreation guide](recreating-the-game.md) for the reference workflow and the distinction between regenerating the scripted asset and making a new model.

If the game already exists, the prompt asks the assistant to inspect and reuse it. For a separate variant, replace the package name, route, and title before starting. Blender MCP is useful for interactive authoring; the checked-in Blender script also works through the CLI without MCP.

```text
Build a playable Clockwork Courier experience in this Three.js workspace.

First read AGENTS.md and its task routing, the repository README, and the
experience design guidance. Inspect the worktree before editing. If
packages/experience-courier already exists, read its README, recreation guide,
game rules, Blender script, and tests. Reuse the implementation and identify
missing requirements instead of replacing working code or creating a duplicate.
Keep unrelated work intact. Do not commit, push, or deploy.

Premise and art direction
- Guide Pip, an original little postal robot, across floating mechanical islands
  using a single reusable energy core. Deliver it to a sleeping lighthouse.
- Aim for a readable handmade toy: cream, muted teal, postal orange, brass,
  low-poly rock bases, restrained foliage, and soft clouds.
- Make Pip and the nearby mechanism the active visual focus. No combat or
  countdown. Three optional stamps reward exploration.
- Use English for interface copy, documentation, and source comments.

Phase 1: establish the rules
- Keep deterministic game logic separate from rendering and input.
- Use an integer grid with height-aware adjacent movement and BFS pathfinding.
  Reject gaps, height changes without a lift, fractional positions, and no-op
  moves. Keep decorative obstacles consistent with the navigation grid.
- Track one core location, player position, bridge locks, lift height, turnbridge
  orientation, stamps, phase, time, steps, and checkpoint recoveries.
- Implement the drawbridge: power it, cross, latch the far lever, then return
  for the core. It disconnects without power until locked.
- Implement the lift: power it, board it, ride it, retrieve the core. It holds
  its height without power and supports a powered return trip.
- Implement the turnbridge: power and rotate it into alignment, cross, lock,
  and retrieve. Match the visual pivot and orientation to legal connectivity.
- Finish by carrying the core to the lighthouse. Prevent remote interactions.
- Recover to reachable checkpoints with the core and matching machine states;
  preserve stamps. Prove every checkpoint can lead to completion.

Phase 2: author the asset
- Asset paths in this phase are relative to packages/experience-courier. Resolve
  them to absolute paths before passing them to Blender or its MCP connection.
- Use Blender MCP if connected: inspect the scene, then execute procedural
  Python in a separate temporary scene without deleting unrelated objects.
- For the reference model, reuse tools/build_courier.py. For a fresh model,
  retain its output contract and save a reproducible source script.
- Build Pip with simple beveled forms, cream enamel, orange postal details,
  brass joints, dark feet, and a readable face. Make the design original.
- Preserve named parts Body, Head, ArmL, ArmR, LegL, and LegR, with origins at
  the appropriate joints. Animate object transforms; a skeleton is unnecessary.
- Export a compact GLB to src/assets/courier.glb with correct axes, scale,
  materials, and floor contact. Inspect it after importing into Three.js.
- If MCP is unavailable, state that and use the Blender CLI script when
  available. If Blender is also unavailable, reuse the checked-in GLB and
  report that regeneration was not verified. If neither Blender nor an existing
  GLB is available, report the asset blocker instead of claiming a complete
  recreation. Never claim unused tools ran.
- Keep the script and optimized asset; avoid large intermediate source files.

Phase 3: build the scene
- Generate islands, architecture, mechanisms, signs, plants, and clouds in
  Three.js. Block out a solvable route before adding detail.
- Batch static geometry by material and keep moving mechanisms in separate
  groups. Reuse render-loop objects and avoid per-frame React state updates.
- Use a full orthographic overview for introduction and completion. Start
  active play in a follow camera on desktop and mobile; provide a map toggle.
- Use intentional lighting and material contrast. Do not use blur to conceal
  weak detail. Support device pixel ratio up to 2 and hardware-bounded
  anisotropy for oblique signs; inspect clarity at actual display resolution.
- Give each pointer gesture one intended action. Stop handled intersections
  from reaching objects behind them and disable picking on decorative overlays.
- Dispose owned resources on unmount without disposing loader-cached GLTF
  geometry or materials shared by model instances.

Phase 4: implement usable controls
- Support WASD/arrows, E, click-to-walk, and a visible touch direction pad.
  Describe the isometric movement directions accurately.
- Put the objective, cargo state, primary action, and any secondary action in
  accessible HTML with visible focus and usable touch targets.
- Show immediate feedback for unavailable actions and mechanism changes.
- Support pause/resume, checkpoint recovery, replay, and a completion receipt.
  Pause gameplay time; clear held input and queued paths at appropriate lifecycle
  boundaries; prevent input from racing lift travel.
- Respect reduced motion, including camera and mechanism transitions, while
  still rendering state changes. Preserve normal mobile vertical scrolling.
- Keep audio opt-in. Optional local best-run storage must fail gracefully.
- Include meaningful loading, asset-error, and unsupported-WebGL behavior.

Phase 5: integrate and validate
- Keep experience-specific code in its owning package. Register the portal
  dependency and lazy route; add a lightweight SVG preview and catalog entry.
- Serve the GLB through Vite asset imports and support /threejs-x-space/ in
  production. Do not eagerly load the game or model on the catalog page.
- Use original or appropriately licensed assets and record required attribution.
- Run the package rule tests, pnpm build, pnpm lint, and pnpm typecheck from
  the repository root. Add meaningful tests for discovered rule regressions.
- Test the running portal and game at desktop >=1280x720 and mobile 390x844.
  Exercise ready, active, each mechanism, pause, recovery, win, replay, reduced
  motion, asset failure, and route re-entry. Complete a three-stamp delivery
  using real controls, not only injected state or unit tests.
- Check native-resolution sharpness, small labels, camera framing, console
  errors, horizontal overflow, touch scrolling, click-through, and base-path
  asset loading. Fix concrete problems and rerun affected checks.
- Report the files changed, the asset workflow actually used, validation
  evidence, and remaining limitations. Provide desktop and mobile captures
  when browser tools are available; clearly identify anything not verified.
```
