# Living Ink

Living Ink is a tactile, generative painting studio built from curling pigment ribbons, fine GPU-driven filaments, and a procedural paper surface.

## Experience brief

- **Premise:** touch a quiet sheet of paper and let living currents turn each gesture into an evolving ink composition.
- **Primary feeling:** calm curiosity with immediate, expressive feedback.
- **Main action:** tap to bloom pigment or drag to guide the current.
- **Focal point:** the artwork created by the user's gestures.
- **Meaningful states:** a layered seeded composition on entry, an actively flowing painting with lasting pigment, and a paused or cleared canvas.
- **Responsive strategy:** keep the artwork full-frame, move controls into a compact lower shelf, and reduce particle density on narrow screens.
- **Constraints:** preserve stable input and frame pacing, respect reduced motion, and provide a readable fallback when GPU computation is unavailable.

## Rendering approach

The experience uses Three.js `GPUComputationRenderer` with full-float ping-pong textures for particle position and velocity. Two half-float render targets hold transient wet trails, while a separate dry pigment target preserves the procedural opening composition and deposited marks. A final shader combines these pigment weights with palette colors, optical absorption, and procedural paper grain. Changing the palette reinterprets the existing painting.

The warm editorial interface provides direct tap/drag painting, palette swatches, pause/resume, clear, tuning controls, a keyboard-accessible bloom action, and a clean PNG export with a maximum 2048-pixel long edge. Resizing preserves the painting by copying the pigment targets; its normalized composition follows the new artboard proportions.

All visual material is generated in code. The experience does not include third-party textures, models, fonts, or audio.

## Build it from zero

The [complete reproduction prompt](docs/rebuild-prompt.md) describes how to build Living Ink in an empty Vite, React, and TypeScript project, including its art direction, Three.js rendering passes, input behavior, PNG export, and desktop/mobile acceptance criteria. It also includes an optional route for integrating the result into this workspace.
