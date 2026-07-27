# Maintainer context

This directory contains detailed, evolving guidance for maintaining `threejs-x-space`. `AGENTS.md` remains the concise source of repository-wide requirements; documents here explain how to apply those requirements without turning one experiment's design into a global template.

## Task routing

- For visual design, interaction design, a new experience, portal presentation, shared UI work, or visual review, read the [experience design guidance](design.md).
- For a focused implementation change with no visual or architectural impact, follow `AGENTS.md` and the conventions already present in the target package.
- For GitHub Pages deployment, use the workflow and base-path requirements documented in the repository README and `AGENTS.md`.

## Maintenance rule

Add guidance here only when it is reusable across future experiences. Keep one-off decisions close to the experience that owns them. When implementation and guidance diverge, update both in the same change or state why the exception is intentional.
