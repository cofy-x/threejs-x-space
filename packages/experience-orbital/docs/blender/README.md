# Astra-02 authoring guide

[astra-probe.blend](astra-probe.blend) is the canonical editable spacecraft source. The [Blender generator](../../scripts/build-spacecraft.py) records its complete construction recipe, and [astra-probe.glb](../../src/assets/astra-probe.glb) is the optimized browser export. See the [modeling prompt](../spacecraft-prompt.md) for the full design specification and [asset credits](../../ASSET_CREDITS.md) for provenance, license, and runtime metrics.

## Source and construction

The generator targets Blender 4.2 or later and uses Blender's Python API and bundled glTF exporter. Blender MCP supports interactive authoring and inspection; the saved generator also runs in a background Blender process. There are no external model, texture, font-file, or add-on dependencies to acquire.

The source contains the isolated `Orbital - Astra 02` scene. Construction proceeds through `create_core()`, `add_wings()`, and `add_instruments()`: tapered octagonal hull and engines; four photovoltaic leaves and their hinges/cell grids; then the dish, sensors, radiators, and markings. Geometry is deterministic and uses no random seed. The script's parameters are the executable recipe; there are currently no manual model edits outside it.

The archive preserves separate named parts, bevel and weighted-normal modifiers, the dish's Solidify modifier, and eight PBR materials. Its inspection camera, three studio lights, and world belong to the authoring scene. It is saved with compression **before** `finalize()` converts modifiers, joins static parts, and exports the runtime mesh. It therefore preserves the editable construction state rather than the GLB's merged hierarchy. There is no rig or animation clip; the browser owns flight orientation, camera motion, ion plumes, and local reflections.

## Reopen, edit, and rebuild

Run these commands from `packages/experience-orbital`:

```sh
blender docs/blender/astra-probe.blend
```

Edit the relevant named parts or modifiers in the source. For changes expressible procedurally, update the generator and regenerate both the source and GLB. Manual edits do not update the recipe automatically; document any intentional divergence before running a rebuild that would replace them.

Use an ignored comparison directory while reviewing a rebuild:

```sh
blender --background --python scripts/build-spacecraft.py -- --output docs/blender/.review/astra-probe.glb --blend docs/blender/.review/astra-probe.blend --preview docs/blender/.review/astra-probe.png
```

After review, regenerate the canonical pair:

```sh
blender --background --python scripts/build-spacecraft.py -- --output src/assets/astra-probe.glb --blend docs/blender/astra-probe.blend
```

`--blend` saves only the authored scene and its dependencies before the runtime merge; `--preview` renders the finalized model afterward. Without `--output`, the GLB destination is resolved relative to the script's owning package. The script removes only its previously owned scene objects, preserving unrelated Blender work.

To verify or export the **saved source** without rebuilding its geometry, open it in a separate background process and invoke only `finalize()`:

```sh
blender --background docs/blender/astra-probe.blend --python-expr "import runpy; recipe = runpy.run_path('scripts/build-spacecraft.py'); recipe['finalize']('docs/blender/.review/astra-probe-from-source.glb')"
```

This merges the in-memory export copy and leaves the saved editable archive unchanged. Compare the temporary GLB before replacing a runtime asset. Do not save the finalized merged scene over the canonical source.

## Runtime contract and checks

Export GLB with `use_selection=True`, `use_active_scene=True`, and `export_yup=True`; export materials, omit cameras/lights/animations/extras, and include no unrelated scene objects. The runtime node is `AstraProbe`, with one mesh and eight material primitives. Model-local `+Z` points forward, `+Y` points upward, and the browser applies scale `0.68`. Authoring coordinates map runtime `[x, y, z]` to Blender `[x, -z, y]`.

Keep the three exhaust origins aligned with [the runtime plume component](../../src/spacecraft.tsx): `[0, 0, -1.18]` and `[±0.47, -0.02, -0.91]`, pointing along `-Z`. These positions and the model's origin are the integration contract; individual authoring-part names are not a runtime animation API.

After any change, reopen the source in a separate process, export a comparison GLB, and check materials, normals, bounds, triangle count, and absence of unrelated content. File names can alter export metadata, so byte-for-byte equality is not required. If the runtime model changes, also review Overview and Chase in the real application on desktop and at `390 × 844`, then run the repository's build, lint, typecheck, and flight verification. Source-only archival changes do not require another browser pass.
