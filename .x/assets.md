# Asset authoring guidance

## Scope and ownership

For each new or materially updated Blender-authored asset, maintain its editable source, construction notes, and optimized runtime export in the owning experience. Preserve any generation scripts used to produce it. Choose the authoring method that suits the subject; geometry created entirely in Three.js can remain in code.

Use these locations within `packages/experience-*`:

| Location | Purpose |
| --- | --- |
| `docs/blender/<asset>.blend` | Canonical editable Blender source |
| `docs/blender/README.md` | Construction steps, editing guidance, and export instructions |
| `scripts/` | Procedural generators and reusable asset preparation tools, when used |
| `src/assets/` | Optimized GLB models and other assets consumed by the browser |

Link to the authoring guide from the package README. Keep provenance, licenses, attribution, and the runtime asset contract in the package's existing asset documentation, such as `ASSETS.md`, and link to it from the guide. Third-party assets remain subject to their redistribution terms; document unavailable authoring sources rather than presenting an imported runtime mesh as the original source.

Explain which parts are authored in Blender and which are generated or animated by Three.js. A character source may contain a body and eyes while the browser creates its limbs, props, environment, or motion. The source file does not need to contain the complete interactive scene.

## Preserve an editable source

- Save the current source with file compression enabled. Retain useful modifiers, rigs, shape keys, materials, UVs, vertex attributes, and other data needed for later editing.
- Pack required textures and make other required dependencies portable with relative paths and documented setup. Verify the file without access to the original asset directories.
- Keep the archive focused on the asset and its necessary dependencies. Exclude unrelated scenes, unused data, temporary outputs, and machine-specific paths. When capturing an open session, preserve unrelated work and unsaved edits.
- Keep one canonical source per asset. Ignore Blender backup files such as `*.blend[0-9]*`, temporary comparison exports, and reproducible caches in the relevant directory.
- Review source size separately from runtime size. Compression and cleanup should preserve editing capability; do not add large unoptimized source archives or duplicate intermediate versions.

A saved `.blend` preserves the current authoring state, not a guaranteed record of every earlier operation. If remeshing, decimation, or other operations have been applied, document that fact and retain the procedural recipe when available.

## Record how to continue the work

Keep the authoring guide concise and specific to the asset. Include:

- The Blender version and any required add-ons or dependencies.
- The main construction stages and meaningful parameters, including random seeds when used.
- Which file or script is authoritative for each part of the asset, and which changes were made manually.
- How to reopen, edit, rebuild, and export, with repository-relative commands and paths.
- The export settings and runtime expectations: scale, units, axes, facing direction, origins, named nodes, pivots, material or attribute names, and animation clips where relevant.
- The validation performed and any remaining limitations.

Treat a generator as an executable construction recipe. Manual Blender edits do not automatically update it. Update the script when a change can be represented procedurally; otherwise, document the divergence and how to preserve the manual work. Generation scripts should support an explicit output destination so a comparison build can be reviewed before replacing the canonical asset. Run rebuilds in an isolated process or scene that does not overwrite unrelated work.

The [Octo authoring guide](../packages/experience-cube/docs/blender/README.md) is an example of this structure. Its artistic choices, geometry counts, and export settings are specific to that experience.

## Export for the browser

Export an optimized GLB to `src/assets/` unless the experience documents a different runtime format. Keep authoring files out of the browser bundle and avoid importing them through application code or placing them in public static directories.

Export the intended hierarchy and required animation data. Preserve the runtime contract and review axis conversion, transforms, normals, UVs, vertex colors, materials, textures, and clips as applicable. Bake or replace authoring features that the chosen export and runtime do not preserve. Export cameras or lights only when the experience uses them.

Review triangle counts, texture dimensions, file size, and loading cost for the target experience. Document any required decoder or external resource. Runtime optimization must leave the editable source available for future changes.

## Validate an update

1. Reopen the saved source in a separate Blender process or clean session. Verify the required geometry, materials, dependencies, and editing controls without relying on the original session.
2. Export to a temporary destination and inspect the result against the runtime contract. Check geometry and appearance as well as named nodes, pivots, and animation data used by the code.
3. Update the canonical source, runtime export, and relevant instructions together after reviewing the result. Clearly record intentional differences between the source, generator, and exported model.
4. When the runtime asset or visible behavior changes, perform the [browser design review](design.md#review-checklist) on desktop and at `390 × 844` on mobile. Inspect the asset in context, exercise its primary interactions, and check loading and production-base-path behavior.
5. Follow the [repository validation requirements](../AGENTS.md#validation) and verify documentation links. Source archival or documentation changes without runtime or visible changes do not require browser review.
