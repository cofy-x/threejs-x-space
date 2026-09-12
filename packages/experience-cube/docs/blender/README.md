# Editable Blender source

Open [the Octo source file](octo.blend) in Blender to continue editing the character. This compressed authoring snapshot was captured from the existing Octo scene with Blender **5.2.1 LTS**. It preserves the current geometry, vertex colors, UVs, materials, packed normal texture, and named animation pivots.

## Source ownership

| File | Purpose |
| --- | --- |
| [Octo source scene](octo.blend) | Editable mantle, skirt, eyelids, and eyes |
| [Character generator](../../scripts/build_octo.py) | Rebuild the model from its procedural parameters |
| [Runtime model](../../src/assets/octo.glb) | Optimized model loaded by the browser |
| [Tentacle implementation](../../src/tentacles.ts) | Eight animated arms and their suction cups |
| [Scene implementation](../../src/scene.tsx) | Cube geometry, studio, lighting, and choreography |
| [Water implementation](../../src/water.tsx) | Water lighting patterns and suspended particles |

The Blender file contains the character asset: one scene, 13 objects, nine meshes, five materials, and one packed 512 × 512 normal texture. Its meshes contain 60,998 triangles. The complete interactive scene is assembled by Three.js, including all eight tentacles and the cube. Open the browser experience to review their attachment and motion together.

The saved mesh includes the generator's applied remeshing and decimation. Use the Python generator for parameter-level changes and the Blender file for direct mesh and material edits. Manual edits to the Blender file do not automatically update the generator.

## Construction steps

The [generator](../../scripts/build_octo.py) is the executable record of these steps. Keep it with the source file when adjusting the procedural design.

1. **Define the silhouette.** Build a continuous pear-shaped mantle from a vertical radius profile, with a backward-curving crown, broad orbital mounds, and an eight-lobed skirt. The final pass samples 160 angular segments and 120 vertical rows.
2. **Create the hierarchy.** Place the body under `OctoMantle`, then create independent `EyeLeft` and `EyeRight` pivots. The `bvec` conversion maps the authored Y-up coordinates into Blender coordinates.
3. **Build the eyes.** Add the eye globes, flesh around almond-shaped openings, radially striated amber irises, horizontal pupils, and small corneal highlights. Keep the upper eyelid partially over the iris for the focused expression.
4. **Color the skin.** Generate restrained coral mottling and a violet lower skirt in the `Pigment` vertex-color attribute. Add small geometric surface irregularities before the final skin merge.
5. **Generate fine relief.** Build a seamless 512 × 512 normal texture from layered noise using seed `2411`, pack it, and connect it through a Normal Map node at strength `0.28`. This supplies finer pores independently of the color variation.
6. **Unify the skin.** Join the mantle and eyelids, voxel-remesh at `0.0125`, smooth with factor `0.55` for four iterations, then apply decimation at ratio `0.38`. Eye components retain their separate pivots.
7. **Restore surface data.** Recreate the skin's vertex colors and `SkinUV` UV map after remeshing, including the cylindrical UV seam correction. Check smooth shading and outward normals.
8. **Export and inspect.** Export the selected hierarchy to GLB with materials, normals, and axis conversion. Compare Blender front and side views with the browser's close-up view, then review the tentacle attachment during playback.

Use `OCTO_STAGE=blockout` for an early shape review without skin microdetail. The source archive preserves the current result; the script preserves the construction recipe and numeric parameters. When making a significant manual change, update the relevant step here and the generator when the change can be expressed procedurally.

## Continue editing

1. Open `octo.blend` in Blender 5.2.1 LTS or a compatible newer version. The saved viewport uses material preview and frames the character.
2. Keep the `Octo` root and the `OctoMantle`, `EyeLeft`, and `EyeRight` pivots intact. The [asset contract](../../ASSETS.md#runtime-contract) documents the coordinates expected by the browser.
3. Preserve the `Pigment` vertex-color attribute and `SkinUV` UV map when editing the skin. The normal texture is packed into the file, so opening it does not require a separate texture directory.
4. After adding or replacing textures, use **File → External Data → Pack Resources**. Keep asset paths relative to the source file.
5. Save the updated source with file compression enabled. Blender backup files such as `octo.blend1` remain local and are ignored in this directory.

Blender uses Z-up coordinates; the GLB exporter converts them to the experience's Y-up coordinates with **+Y Up** enabled. The source model faces Blender's negative Y direction, which becomes positive Z in Three.js. Do not add a second axis conversion to the root.

## Export an updated runtime model

1. In Object Mode, select the character's complete hierarchy. This source file contains only the Octo character.
2. Choose **File → Export → glTF 2.0** and write `../../src/assets/octo.glb` relative to this directory.
3. Use **glTF Binary (.glb)**, **Selected Objects**, **Active Scene**, **+Y Up**, **Apply Modifiers**, **Normals**, and exported materials. Disable animation, camera, and light export. Preserve vertex colors and UVs.
4. Open `/experiences/cube` in the development portal. Inspect the studio and close-up views, then play a solve to check the eye pivots and the skirt-to-tentacle attachment. Check desktop and mobile layouts when the silhouette or size changes.
5. Save the `.blend` and review it alongside the updated GLB. The web build consumes the GLB; the authoring file stays outside the browser bundle.

## Rebuild from parameters

Run a procedural rebuild in a separate Blender process. To compare a rebuild with manual edits without replacing the runtime model, run this from the repository root:

```sh
OCTO_OUTPUT=packages/experience-cube/docs/blender/octo-rebuilt.glb \
  blender --background --factory-startup \
  --python packages/experience-cube/scripts/build_octo.py
```

The comparison GLB is ignored locally. Import it into a separate Blender file or scene, review the changes, and deliberately update the saved source and runtime GLB when ready. Running the generator without `OCTO_OUTPUT` writes directly to the runtime model, as described in the [asset rebuild instructions](../../ASSETS.md#rebuild).

## Archive verification

The initial archive was isolated from the live Blender session, saved with compression, and reopened in a separate Blender process. Geometry and transforms were checked against the captured scene. Only the required character data and its packed texture are retained; linked libraries, script text blocks, and unrelated scenes are excluded.
