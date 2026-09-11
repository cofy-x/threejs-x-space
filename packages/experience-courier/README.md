# Clockwork Courier

A small puzzle adventure above the clouds. Guide Pip, a little postal robot, through the Cloudline Isles with one energy core and a very important delivery.

## Experience brief

- **Premise:** reuse a single core to cross three mechanical obstacles, then deliver it to a sleeping lighthouse.
- **Feeling:** the warmth of a handmade mechanical toy, with readable cause and effect and a satisfying final delivery.
- **Primary action:** walk to a socket or lever, power its mechanism, and recover the core after securing a route.
- **Visual focus:** the cream-and-orange courier and the miniature islands, framed by warm paper, brass, muted foliage, and soft clouds.
- **Initial state:** a complete island overview, a visible parcel, and one start button. The first meaningful active state is carrying the core to the drawbridge socket.
- **Desktop:** an isometric overview introduces the islands; play follows Pip beside the delivery route, with the full map one click away.
- **Mobile:** the scene precedes the compact objective. Play defaults to a follow camera, with a full map available and large directional controls below the scene.
- **Constraints:** no external asset requests, no autoplay audio, native pixel ratio up to 2, anisotropic sign textures, batched static geometry, keyboard access, and reduced nonessential motion.

## Play

Open `/experiences/courier` in the development portal. Production assets and routes support the `/threejs-x-space/` base path.

| Input | Action |
| --- | --- |
| Click or tap a reachable walkway | Automatically walk there |
| WASD or arrow keys | Move one tile; hold to keep walking |
| Touch direction pad | Move in the displayed isometric direction |
| E or the action button | Use the nearest available socket or lever |
| Secondary action below the main button | Recover a core or ride the lift back down |
| Escape or the pause button | Pause / resume |
| Island map / Follow Pip | Change camera composition |
| Return to checkpoint | Recover both Pip and the core at a safe milestone |

The controls always refer to the fixed island axes: north appears toward the upper right; east appears toward the lower right. Canvas taps preserve normal vertical touch scrolling. The scene can be played silently; the sound button enables original synthesized chimes.

There is no countdown, combat, or penalty for exploring. Walkway boundaries prevent falls, and inaccessible platforms cannot be reached by clicking through a gap. Three optional sky-mail stamps reward detours. The completion receipt records elapsed playing time, steps, stamps, and checkpoint returns. The best completed run is stored locally, prioritizing stamp count and then time. Storage is optional and never required to play.

## The three mechanisms

1. **Drawbridge:** leave the core in the dock socket, cross the powered bridge, lock the opposite lever, and return for the core.
2. **Garden lift:** power the platform, step aboard, and ride up. It holds its height after the core is removed. Reinsert the core to return to the garden if desired.
3. **Turnbridge:** power the terrace socket and rotate the bridge around its anchored end until it reaches the far landing. Cross, lock the lever, and bring the core back to the lighthouse.

Only one machine can hold the core. A powered bridge retracts or disconnects when the core is removed unless its lever has been locked. Checkpoints preserve collected stamps and restore a reachable core. Reloading starts a new adventure; only the best-run receipt persists.

## Implementation

- `src/game.ts` owns the deterministic rules, topology, pathfinding, objectives, and recovery states. It is independent of rendering.
- `src/world.ts` builds and batches original toy architecture and materials. Unwalkable scenery matches the navigation grid.
- `src/scene.tsx` loads the Blender courier and animates its limbs, cameras, mechanisms, collectible stamps, and lighthouse.
- `src/index.tsx` owns input, accessible interface state, optional audio, pause behavior, and best-run storage.
- The portal uses a lightweight SVG postcard; it does not load the game or its model until the route is opened.

## Original assets

The courier is an original Blender model exported to `src/assets/courier.glb` (approximately 350 KiB). Its head and limbs are named articulating parts. No remote model, texture, HDRI, font, or audio asset is needed. The islands, signs, material grain, preview illustration, and sounds are original code-generated work covered by the repository's MIT license.

`tools/build_courier.py` is the reproducible Blender source. It creates a separate temporary scene, exports only that scene, and restores the previous scene. From this package directory, with Blender on your PATH:

```sh
COURIER_OUTPUT="$PWD/src/assets/courier.glb" blender --background --python tools/build_courier.py
```

The source uses Blender node types rather than localized display names. Large `.blend` files and intermediate renders are not needed in the repository.

## Recreate the experience

- [Recreation guide](docs/recreating-the-game.md): the Blender MCP and CLI asset workflows, game architecture, implementation stages, review lessons, and validation steps.
- [Copyable recreation prompt](docs/recreation-prompt.md): a staged implementation brief for rebuilding the game with a coding assistant.

The checked-in Blender script reproduces the procedural model design. A fresh AI-assisted rebuild can follow the same workflow without producing identical geometry or pixels.

## Validation

```sh
pnpm --filter @threejs-x-space/experience-courier test
pnpm build
pnpm lint
pnpm typecheck
```

The rule tests run on Node.js 22.6 or newer with type stripping. They cover a full three-stamp delivery, invalid movement and interactions, power removal, turnbridge orientation, lift occupancy, every checkpoint, pause, and stamp deduplication.

Browser review must include a desktop viewport and `390 × 844` mobile: ready, walking, carrying, each mechanism, pause / resume, recovery, completion / replay, reduced motion, loading failure, and portal navigation. Inspect console output and check that the production base path serves the GLB correctly.
