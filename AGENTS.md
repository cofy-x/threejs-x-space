# AGENTS.md

## Project scope

`threejs-x-space` is a public collection of Three.js experiments for building, showcasing, and sharing playful interactive 3D experiences.

## Before making changes

1. Read the [maintainer context index](.x/README.md), then follow its task-specific routing. Do not load every document by default.
2. Keep repository content, source comments, interface copy, and public documentation in English.
3. Treat the portal and each experience as different design layers: the portal provides a recognizable collection identity, while an experience may establish its own art direction.

## Development conventions

- Put each new experience in its own `packages/experience-*` package and expose it through `apps/portal`.
- Put reusable Three.js logic in `packages/three-utils` and reusable interface components in `packages/ui`.
- Prefer themeable shared primitives over experience-specific assumptions in shared packages.
- Give every experience a deliberate concept, visual hierarchy, interaction model, and responsive composition. Do not make dark mode, neon color, technical instrumentation, or any current experience style a repository-wide default.
- Use color, motion, sound, and effects semantically. Decorative choices must support the experience rather than compete with it.
- Validate visual work in representative desktop and mobile viewports and in the important interactive states described by the design guidance.
- Keep every experience compatible with the `/threejs-x-space/` GitHub Pages base path.
- Add only code and assets that can be distributed from this MIT-licensed public repository. Record third-party licenses and required attribution alongside the owning experience or in a repository-level notice file.
- Do not commit build output, dependency directories, credentials, or large unoptimized source assets.

## Validation

Run the checks relevant to the change:

```sh
pnpm build
pnpm lint
pnpm typecheck
```
