# Living Ink

Living Ink is a tactile, generative painting experience built from GPU particles, flowing pigment, and a procedural paper surface.

## Experience brief

- **Premise:** touch a quiet sheet of paper and let living currents turn each gesture into an evolving ink composition.
- **Primary feeling:** calm curiosity with immediate, expressive feedback.
- **Main action:** tap to bloom pigment or drag to guide the current.
- **Focal point:** the artwork created by the user's gestures.
- **Meaningful states:** a restrained seeded composition on entry, an actively flowing painting, and a paused or cleared canvas.
- **Responsive strategy:** keep the artwork full-frame, move controls into a compact lower shelf, and reduce particle density on narrow screens.
- **Constraints:** preserve stable input and frame pacing, respect reduced motion, and provide a readable fallback when GPU computation is unavailable.

## Rendering approach

The experience uses Three.js `GPUComputationRenderer` with half-float ping-pong textures for particle position and velocity. A separate pair of render targets accumulates pigment trails before a final shader maps them onto a procedural paper surface.

All visual material is generated in code. The experience does not include third-party textures, models, fonts, or audio.
