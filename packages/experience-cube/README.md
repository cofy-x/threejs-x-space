# Octo's Cube

Eight arms. One obsession. Meet Octo, a curious coral octopus working a colorful cube beneath the surface of a quiet underwater studio.

## Experience brief

- **Premise:** watch an original octopus perform a deterministic cube solution with coordinated tentacles and individually visible layer turns.
- **Feeling:** the strange elegance of a living ocean creature, absorbed in a surprisingly familiar puzzle.
- **Primary action:** play the solve, pause on a turn, scrub through the sequence, or request a fresh scramble; the cube, tentacles, and move display share one timeline.
- **Visual focus:** a coral-orange mantle, gold eyes, and graceful curling arms surround a bright cube. Violet undersides and rows of suction cups reward close inspection. A deep navy studio, warm cream typography, and muted aqua accents keep the subject clear.
- **Initial state:** a scrambled cube, a complete portrait, and an obvious playback action. During a solve, four tentacles support Octo while four handle and turn the cube. Completion leaves the solved cube available for inspection and replay.
- **Desktop:** the creature occupies the main stage, supported by concise move information and a playback strip. A close-up camera brings the tentacles and cube forward; a studio camera restores the entire silhouette.
- **Mobile:** the portrait appears first, followed by large playback controls and supporting information. The composition preserves normal vertical scrolling.
- **Constraints:** local optimized assets, an intentional pixel-ratio cap, no autoplay audio, keyboard-accessible HTML controls, and reduced nonessential motion for reduced-motion preferences.

## Model and motion direction

Octo's form is organic throughout: a continuous mantle, soft folds around expressive eyes, gently tapered tentacles, and finely detailed skin. The material combines coral-orange skin with a violet underside; gold irises and dark pupils create a readable gaze. Fine surface variation adds detail without obscuring the larger silhouette.

The eight-arm composition has two clear jobs. Four supporting arms curl around the studio platform and establish weight. Four working arms cradle, steady, and turn the cube, passing the contact role between them as the move changes. Curved surfaces preserve a soft, continuous tentacle shape throughout the choreography, and repeated suction cups make the underside readable from close views.

High-resolution viewing should reveal surface detail, rounded cube edges, and individual suction cups. Scene lighting and material contrast provide depth while keeping the puzzle legible. The image capture control exports a 4K studio image.

## Explore

Open `/experiences/cube` in the development portal. The route and model assets support the production `/threejs-x-space/` base path.

| Control | Action |
| --- | --- |
| Play / Pause | Start, pause, or resume the current solve |
| Timeline | Inspect an earlier or later point in the solution |
| Previous / Next move | Move between individual turns |
| Speed | Change playback speed |
| Close-up / Studio | Change the camera composition |
| New scramble | Generate another deterministic scramble and its solution |
| Replay | Return to the current scramble and watch again |
| Save 4K image | Export the current studio view as a high-resolution PNG |

The choreography is a deterministic inverse-scramble replay: each scramble is a sequence of legal layer turns, and its solution applies their inverses in reverse order. It preserves real cube state through the animation. It is not an arbitrary-state solving algorithm, reinforcement-learning policy, or contact-physics simulation.

## Implementation

- `src/cube-state.ts` owns the cube's discrete state, legal moves, seeded scramble generation, and inverse solution independently of rendering.
- `src/scene.tsx` loads the Blender octopus, renders the underwater studio, and coordinates animated curved tentacles with the cube's layer turns.
- `src/index.tsx` owns playback, timeline controls, camera selection, image capture, loading, and accessible interface state.
- The portal uses an original lightweight SVG octopus portrait. It does not load Three.js or the character model before the experience route is opened.

## Original assets

Octo is an original Blender model exported to `src/assets/octo.glb`, with separate parts for character animation. The working tentacles use curved surfaces animated in Three.js. The cube, studio geometry, skin treatment, suction cups, and portal illustration are original procedural work covered by the repository's MIT license.

The [editable Blender source and authoring guide](docs/blender/README.md) preserve the character for later mesh and material adjustments. The compressed source packs its normal texture, and the generation script remains available for parameter-based rebuilds. No remote model, texture, HDRI, font, or audio asset is required.

## Validation

```sh
pnpm --filter @threejs-x-space/experience-cube test
pnpm build
pnpm lint
pnpm typecheck
```

Review the portal and experience in a representative desktop viewport and at `390 × 844` on mobile. Cover the initial scramble, playback, pause and resume, timeline scrubbing, move stepping, speed changes, camera changes, a new scramble, completion and replay, image capture, reduced motion, and loading or failure states. Inspect the eight-arm silhouette and suction cups in both camera views. Check console output, keyboard focus, overflow, and production-base-path asset loading.
