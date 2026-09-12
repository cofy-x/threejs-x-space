# Orbital Playground asset credits

The spacecraft geometry and materials are original work created for this repository. The planetary imagery comes from NASA and NASA/JPL visualization products and is used with source credit, without implying endorsement by NASA, JPL, or Caltech.

## Astra-02 spacecraft

- File: `src/assets/astra-probe.glb`
- Editable source: [Canonical Blender archive](docs/blender/astra-probe.blend), with separate parts and useful modifiers preserved before the runtime merge.
- Recipe and editing: [Deterministic Blender construction and export script](scripts/build-spacecraft.py) and [authoring guide](docs/blender/README.md). The current model has no manual divergence from the recipe.
- Creation: original mesh geometry and PBR materials authored for Orbital Playground using Blender through Blender MCP; no third-party spacecraft model or image texture is included.
- Credit: `threejs-x-space` contributors.
- License: the repository's [MIT license](../../LICENSE) applies to this original model, editable source, and construction script.
- Preparation: bevel and normal modifiers are converted for export; static parts are joined into one mesh with eight material primitives. The GLB contains 33,516 triangles, no image textures, and 901,172 bytes.
- Orientation: `+Z` forward, `+Y` up; runtime scale `0.68`. The ion plumes are generated at runtime in [the spacecraft component](src/spacecraft.tsx).
- Runtime reflections: generated with Three.js `RoomEnvironment` and PMREM, applied only to the model materials; no external HDR image is used.
- Reproduction: [Full Blender MCP modeling prompt](docs/spacecraft-prompt.md).

## Blue Marble surface

- File: `src/assets/earth-blue-marble.png`
- Source: [Blue Marble — A Seamless Image Mosaic of the Earth](https://svs.gsfc.nasa.gov/2915/)
- Credit: NASA/Goddard Space Flight Center Scientific Visualization Studio; Blue Marble Next Generation data courtesy of Reto Stöckli, NASA/GSFC, and NASA Earth Observatory.

## Blue Marble clouds

- File: `src/assets/earth-clouds.jpg`
- Source: [Blue Marble: Clouds](https://visibleearth.nasa.gov/images/57747/blue-marble-clouds)
- Credit: NASA Goddard Space Flight Center; image by Reto Stöckli.

## Earth at night

- File: `src/assets/earth-night-lights.jpg`
- Source: [Earth's City Lights](https://svs.gsfc.nasa.gov/30003/)
- Credit: NASA/Goddard Space Flight Center.

## Solar surface

- File: `src/assets/sun-sdo-surface.jpg`
- Source: [Sunspot Group AR 1678](https://svs.gsfc.nasa.gov/11211/)
- Credit: NASA/SDO/HMI/Goddard Space Flight Center. The source full-disk observation was cropped and resized for real-time rendering.

## Mars surface

- File: `src/assets/mars-viking.jpg`
- Source: [JPL Solar System Simulator Mars texture map](https://space.jpl.nasa.gov/tmaps/mars.html)
- Credit: NASA/JPL-Caltech/USGS. The global texture was created from Viking mission imagery.

## Usage

NASA-sourced imagery is used under the [NASA Images and Media Usage Guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/). The Mars map is additionally subject to the [JPL Image Use Policy](https://www.jpl.nasa.gov/jpl-image-use-policy/). The repository's MIT license applies to the project code and the original Astra-02 model; it does not replace these image usage conditions, and no ownership of the source imagery is claimed.
