# threejs-x-space

Playful Three.js experiments, strange machines, visual systems, and interactive ideas built for the browser.

`threejs-x-space` is a public collection for exploring what real-time 3D can feel like on the web. Each experience starts with a focused visual or interaction idea, develops its own art direction, and remains part of a shared portal that makes the collection easy to explore.

The project uses Three.js, React Three Fiber, React, TypeScript, and Vite in a pnpm and Turborepo workspace.

[Explore the live collection](https://cofy-x.github.io/threejs-x-space/)

## Current experiences

| Experience | Main interaction | Details |
| :--- | :--- | :--- |
| [04 — Aster Robotics Lab](https://cofy-x.github.io/threejs-x-space/experiences/robot) | Initialize a field robot, calibrate its systems, and explore its mechanical anatomy in an interactive lab. | [Experience notes](packages/experience-robot/README.md) |
| [03 — Living Ink](https://cofy-x.github.io/threejs-x-space/experiences/living-ink) | Tap and drag to paint flowing pigment, tune the current, and save the artwork as a PNG. | [Experience notes](packages/experience-living-ink/README.md) |
| [02 — Orbital Playground](https://cofy-x.github.io/threejs-x-space/experiences/orbital) | Launch a probe, preview its trajectory, and chain gravity assists in a miniature planetary system. | [Asset credits](packages/experience-orbital/ASSET_CREDITS.md) |
| [01 — Turbofan Airflow Simulator](https://cofy-x.github.io/threejs-x-space/experiences/turbofan) | Inspect a cutaway engine, control its simulation, and follow airflow and live telemetry. | — |

Each experience owns its art direction and primary interaction. The portal provides a consistent collection identity, while responsive behavior, accessibility, and frame stability remain shared expectations. See the [experience design guidance](.x/design.md) for the design and review criteria.

## Getting started

Requirements:

- Node.js 20 or newer
- pnpm 11.5.1

Install dependencies and start the portal:

```sh
pnpm install
pnpm dev
```

The local portal is available at `http://localhost:5173/` by default. Open an experience from the portal, or use `/experiences/<id>` with `robot`, `living-ink`, `orbital`, or `turbofan` as the ID. The `/threejs-x-space/` prefix applies to production builds, not the development server.

## Validation

Run the repository checks before final review:

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

1. Create `packages/experience-<name>` with a package manifest, an exported experience component, and the configuration and check scripts used by existing experience packages.
2. Keep its scene, state, interface, and styles inside that package until a pattern is proven reusable.
3. Add the package to `apps/portal/package.json` dependencies using `workspace:*`, run `pnpm install` to update the lockfile, and register its metadata and lazy loader in `apps/portal/src/experiences.ts`.
4. Provide a lightweight portal preview that does not eagerly load the full Three.js scene.
5. Support the `/threejs-x-space/` GitHub Pages base path.
6. Update the catalog above and add a short package README describing the experience.
7. Follow the [design review checklist](.x/design.md#review-checklist) and [validation requirements](AGENTS.md#validation).

Read [AGENTS.md](AGENTS.md) and the [.x maintainer index](.x/README.md) before making repository changes.

## GitHub Pages

The portal is published at:

[`https://cofy-x.github.io/threejs-x-space/`](https://cofy-x.github.io/threejs-x-space/)

The [GitHub Pages workflow](.github/workflows/deploy-pages.yml) builds and deploys every push to `main`. It can also be started manually from GitHub Actions.

## Project status

This is an evolving experiment collection. Experience concepts, shared primitives, and internal APIs may change as new work reveals better abstractions.

## License

Original source code in this repository is available under the [MIT License](LICENSE).

Third-party dependencies, models, textures, fonts, audio, and other assets remain subject to their own licenses and usage terms. Record required attribution and notices alongside the owning experience or in a repository-level notice file. See the [Orbital Playground asset credits](packages/experience-orbital/ASSET_CREDITS.md) for the imagery currently used in that experience.
