# threejs-x-space

Playful Three.js experiments, strange machines, visual systems, and interactive ideas built for the browser.

`threejs-x-space` is a public collection for exploring what real-time 3D can feel like on the web. Each experience starts with a focused visual or interaction idea, develops its own art direction, and remains part of a shared portal that makes the collection easy to explore.

The project uses Three.js, React Three Fiber, React, TypeScript, and Vite in a pnpm and Turborepo workspace.

[Explore the live collection](https://cofy-x.github.io/threejs-x-space/) · [Play Orbital Playground](https://cofy-x.github.io/threejs-x-space/experiences/orbital)

## Current experiences

### 02 — Orbital Playground

Launch a deep-space probe into a miniature planetary system and use gravity to complete three close flybys.

- Drag the probe to set its launch direction and velocity.
- Orbit and zoom through a fully three-dimensional gravity system.
- Read the projected 3D path before releasing the probe.
- Explore a NASA Blue Marble Earth with moving clouds and night lights, an SDO-observed Sun with turbulent plasma, a Viking-mapped cratered Mars, and a layered Milky Way backdrop.
- Preserve completed gravity assists across retries and build a score combo.
- Switch between overview and chase cameras.
- Play with pointer or touch input in responsive layouts.

After starting the development server, open [`/experiences/orbital`](http://localhost:5173/experiences/orbital).

### 01 — Turbofan Airflow Simulator

Open a cutaway jet engine, follow its airflow stages, and watch thrust emerge through animated geometry, particles, gauges, and live telemetry.

- Orbit and inspect the engine in real time.
- Start, pause, and resume the simulation.
- Toggle the casing and airflow visualization.
- Follow RPM, thrust, temperature, pressure ratio, and fuel flow.
- Use the experience on desktop and mobile layouts.

After starting the development server, open [`/experiences/turbofan`](http://localhost:5173/experiences/turbofan).

## Project principles

- Give every experience a clear premise, focal point, and primary interaction.
- Let each experience choose the visual theme that best supports its subject; light, dark, colorful, cinematic, playful, and utilitarian directions are all valid.
- Keep the portal recognizable without forcing one experience's style onto the rest of the collection.
- Use color, motion, sound, and effects purposefully.
- Treat responsive behavior, accessibility, input feedback, and frame stability as part of the design.
- Promote code into shared packages only when it is genuinely reusable.

The maintained framework is documented in the [experience design guidance](.x/design.md).

## Getting started

Requirements:

- Node.js 20 or newer
- pnpm 11.5.1

Install dependencies and start the portal:

```sh
pnpm install
pnpm dev
```

The local portal is available at `http://localhost:5173/` by default.

## Validation

Run the repository checks before submitting a change:

```sh
pnpm build
pnpm lint
pnpm typecheck
```

## Repository structure

```text
apps/
  portal/                 Collection, navigation, and route loading
packages/
  experience-*/           Self-contained Three.js experiences
  three-utils/            Reusable Three.js and math utilities
  ui/                     Themeable shared interface primitives
  config-*/               Shared TypeScript and ESLint configuration
.x/                       Maintainer guidance and design principles
```

Experiences remain separate packages so their scene logic, interface, dependencies, and visual direction can evolve independently. The portal owns discovery and navigation, while shared packages stay themeable and free from assumptions tied to a single experience.

## Adding an experience

1. Create a package named `packages/experience-<name>`.
2. Keep its scene, state, interface, and styles inside that package until a pattern is proven reusable.
3. Add its metadata and lazy loader to `apps/portal/src/experiences.ts`.
4. Provide a lightweight portal preview that does not eagerly load the full Three.js scene.
5. Support the `/threejs-x-space/` GitHub Pages base path.
6. Review the initial and active states on representative desktop and mobile viewports.

Read [AGENTS.md](AGENTS.md) and the [.x maintainer index](.x/README.md) before making repository changes.

## GitHub Pages

The portal is published at:

[`https://cofy-x.github.io/threejs-x-space/`](https://cofy-x.github.io/threejs-x-space/)

The [GitHub Pages workflow](.github/workflows/deploy-pages.yml) builds and deploys every push to `main`. It can also be started manually from GitHub Actions.

## Project status

This is an evolving experiment collection. Experience concepts, shared primitives, and internal APIs may change as new work reveals better abstractions.

## License

Original source code in this repository is available under the [MIT License](LICENSE).

Third-party dependencies and any future external models, textures, fonts, audio, or other assets remain subject to their own licenses. Assets that require attribution or additional notices must document those requirements alongside the owning experience or in a repository-level notice file.
