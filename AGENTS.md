# AGENTS.md

## Project scope

`threejs-x-space` is a public collection of Three.js experiments for building, showcasing, and sharing playful interactive 3D experiences.

## Before making changes

1. Read the [maintainer context index](.x/README.md), then follow its task-specific routing. Do not load every document by default.
2. Keep repository content, source comments, interface copy, and public documentation in English.

## Development conventions

- Put each new experience in its own `packages/experience-*` package and expose it through `apps/portal`.
- Keep experience-specific code in its owning package. Promote proven reusable Three.js logic to `packages/three-utils` and themeable interface primitives to `packages/ui`.
- Follow the [design guidance](.x/design.md) for visual and interactive work, including browser review on desktop and mobile.
- Keep every experience compatible with the `/threejs-x-space/` GitHub Pages base path.
- Add only code and assets that can be distributed from this MIT-licensed public repository. Record third-party licenses and required attribution alongside the owning experience or in a repository-level notice file.
- Do not commit build output, dependency directories, credentials, or large unoptimized source assets.

## Validation

During development, run checks relevant to the change. Before final review, run all repository checks:

```sh
pnpm build
pnpm lint
pnpm typecheck
```

For documentation changes, also verify local links and consistency with the code. Use the browser for visual reviews and changes to visible or interactive behavior. Documentation-only changes do not require browser review.
