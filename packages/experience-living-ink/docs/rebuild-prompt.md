# Rebuild Living Ink from zero

Copy the complete prompt below into a coding agent working in an empty directory. It describes a standalone application; the final section explains how to integrate the same experience into `threejs-x-space` instead. No source assets, reference screenshots, or access to the existing implementation are required.

This is a construction brief for reproducing the experience and its behavior. Browser rendering, available system fonts, and the agent's implementation choices can produce visual differences. The acceptance list is work to perform, not a claim that an independent regeneration has already passed it.

````text
Build a complete interactive browser artwork called Living Ink, beginning in an empty directory. Implement it, run it, inspect the actual rendered result on desktop and mobile, and refine it until the artwork and controls meet the requirements below. Deliver the working source and documentation, not a static mockup or a plan.

1. Premise and visual result

Living Ink is a small digital pigment studio: drag across a warm sheet of paper and release fine, curling pigment currents. A short tap produces a small bloom. The opening image is a composed arrangement of larger ink ribbons; user-driven filaments continue to settle after each gesture, retaining pigment so the visitor can build and save a composition.

The first frame must already contain a beautiful, deliberately composed artwork. Create an original seeded arrangement of three flowing pigment families, with broad transparent washes, finer filament bundles, curved folds, and loose tapered ends. The large silhouette should read from across the room; individual threads and subtle paper grain should reward looking closer. Give the colors distinct territories and overlap them in selected places rather than mixing every region into mud. Keep useful negative space around the composition and room for new gestures. This is an expressive ink drawing on paper, not a particle screensaver or a demonstration of a fluid solver.

Use a warm, light editorial art direction. The artboard should be the dominant element. Frame it with an airy serif title, precise small labels, fine rules, and a compact tool shelf. Use dark brown-black text with restrained muted secondary text. Make the primary export action obvious without competing with the artwork. Use system serif, sans-serif, and monospace stacks; do not download fonts. All visible copy, comments, and documentation must be English.

Keep the palette rich but controlled: deep blue, warm amber, and muted coral in the default artwork; green and terracotta in a botanical alternative; violet, blue, and rose in an evening alternative. Paper should remain warm and subtly textured, with no animated noise shimmer. Avoid neon glow, bloom postprocessing, thick opaque capsule strokes, starfields, external imagery, and decorative dashboards.

Use Three.js for real GPU computation and multi-pass rendering. Do not replace the artwork with CSS gradients, a video, a prerendered image, or a Canvas 2D painting implementation. Canvas 2D is allowed only for packaging rendered pixels into the PNG export. Use a controllable flow-field particle model; a full Navier–Stokes pressure solver is outside the scope.

2. Standalone scaffold and dependencies

Create a Vite application using React, TypeScript, React Three Fiber, and Three.js. A coherent version baseline is React and React DOM 19.1, @react-three/fiber 9.1, Three.js 0.177, @types/three 0.177, @types/react and @types/react-dom 19.1, Vite 6.3, @vitejs/plugin-react 4.5, TypeScript 5.8, and ESLint 9.29. Use compatible versions within these release lines and generate a package-manager lockfile. Do not silently upgrade the graphics stack to a different major generation.

Use pnpm, ES modules, a strict TypeScript configuration, the React Vite plugin, and a minimal ESLint flat configuration that understands TypeScript and React hooks. For this baseline use @eslint/js 9.29, typescript-eslint 8.34, eslint-plugin-react-hooks 5.2, eslint-plugin-react-refresh 0.4, and globals 16.2. Set up actual dev, build, preview, lint, and typecheck scripts; build must type-check before running vite build. Include index.html, a React entry point, Vite configuration, TypeScript configuration, and package.json. Document the runtime requirements and exact install/run commands. Use Node.js 20 or later and a package-manager/runtime combination supported by the versions installed.

Keep the experience self-contained, for example:

src/
  main.tsx                 React root, standalone error boundary
  index.tsx                LivingInkExperience, HTML controls and pointer input
  living-ink-scene.tsx      GPU state, render passes, lifecycle, PNG capture
  ink-composition.ts        Deterministic seed ribbons and fine filaments
  styles.css               Scoped studio composition and responsive styles
docs/
  rebuild-prompt.md         This complete prompt, synchronized with final work
README.md                  Setup, concept, controls, rendering, limitations

Export a named LivingInkExperience component. Use a local React error boundary or an equivalent visible error surface so a GPU initialization error does not leave an unexplained blank paper region. In the standalone app, render the experience directly at the root URL. Keep asset and navigation paths compatible with a non-root Vite base; do not assume every deployment begins at /.

3. Separate input, simulated motion, pigment memory, and presentation

Use React state for discrete UI state such as palette, pause, tuning values, status messages, and clear/export request IDs. Use refs for continuous pointer data, queues, elapsed simulation time, previous positions, and the simulation step. Do not send every particle, mouse sample, or animation frame through React state.

Use GPUComputationRenderer imported from three/addons/misc/GPUComputationRenderer.js. Maintain position and velocity variables with explicit mutual dependencies. Use FloatType for the computation render targets: full precision avoids quantizing the slow particle movement into visible jumps. Use HalfFloatType for the separate pigment image targets to reduce image-buffer memory. Check the required floating-point rendering support and show a readable failure surface when unavailable. Initialize each particle from a deterministic seed; ordinary refreshes should reproduce the same starting arrangement.

Use RGBA position state for x, y, life, and a stable random seed. Use RGBA velocity state for x velocity, y velocity, pigment family, and a reserved value. Positions live in normalized artboard coordinates [-1, 1]. Initialize particle life and velocity to zero: the opening artwork comes from the composed seed layer, and live particles begin only after input. A stable particle seed is fract(particleIndex * 0.61803398875). Store a stable pigment-family identifier rather than display RGB values. In the accumulation textures, RGB channels represent nonnegative amounts of the three pigments; alpha is not the authority for pigment density. Mark intermediate simulation and weight textures as data, with no sRGB decoding.

Keep these rendering responsibilities explicit:

pointer samples -> bounded current gesture -> position/velocity compute
seeded paper composition + new stroke segment + flowing particles -> pigment weight accumulation
pigment weights + selected palette + paper material -> final screen image
the same final composition -> isolated PNG export target

Build the initial large ribbons procedurally in an owning module with a createInkComposition(aspect) helper, using deterministic smooth paths, translucent strip meshes, and offset line fibers. Render this composition once into the persistent dry pigment target; the display should not depend on waiting for particles to draw an attractive picture. Its medium-width translucent bodies and fine thread edges need separate controls: increasing all interactive spawn radii to make the initial artwork dramatic will ruin drawing. Preserve the resulting seeded pigment while the small live filaments evolve. Clear must remove both the seeded artwork and every live/accumulated contribution. Never allow an automatic seed layer to reappear after clearing.

Use the following concrete construction recipe to reproduce the three-ribbon silhouette. Coordinates below have positive y pointing upward; each list is an open centripetal THREE.CatmullRomCurve3. The indigo current makes the large upper-right loop, coral folds through a lower-left bowl, and amber curls under the others toward the lower right. They share a loose central opening.

const currents = [
  {
    channel: 0, width: 0.11, fibers: 108, phase: 0.6, wash: 0.17,
    points: [
      [-0.94,-0.31],[-0.70,-0.33],[-0.43,-0.12],[-0.18,0.11],
      [0.11,0.17],[0.38,0.12],[0.62,0.25],[0.67,0.49],
      [0.48,0.61],[0.27,0.52],[0.19,0.29],[0.27,0.04],
      [0.50,-0.11],[0.78,-0.07],[0.91,0.09]
    ]
  },
  {
    channel: 2, width: 0.086, fibers: 86, phase: 2.8, wash: 0.145,
    points: [
      [-0.86,0.23],[-0.60,0.18],[-0.43,-0.03],[-0.44,-0.29],
      [-0.22,-0.47],[0.07,-0.41],[0.24,-0.19],[0.16,0.04],
      [-0.04,0.17],[-0.14,0.34],[-0.05,0.45],[0.17,0.37],
      [0.42,0.19],[0.71,0.20]
    ]
  },
  {
    channel: 1, width: 0.063, fibers: 68, phase: 4.1, wash: 0.16,
    points: [
      [-0.92,-0.02],[-0.67,0.03],[-0.50,0.26],[-0.26,0.38],
      [0.02,0.26],[0.11,0.03],[0.04,-0.24],[0.19,-0.51],
      [0.45,-0.59],[0.68,-0.48],[0.76,-0.29],[0.65,-0.15],
      [0.52,-0.23],[0.61,-0.36],[0.91,-0.43]
    ]
  }
];

Before constructing each curve, transform desktop coordinates to [x * 0.83 + 0.065, y * 0.83 - 0.055]. For an artboard aspect below 0.8, use [x * 0.89 + 0.015, y * 0.71 - 0.085]. This moves the ribbons into the open region between the title and the tools. Use widthScale 0.84 on desktop and 0.43 in the narrow composition. Sample each curve at t = i / 228 for i from 0 through 228. Obtain the curve tangent, multiply its x component by safeAspect = max(0.3, aspect), normalize it in this visual space, and derive the perpendicular. Divide the x component of both tangent and normal by safeAspect when returning to normalized artboard coordinates. This gives consistent screen-space ribbon width.

For each sample, use width = current.width * widthScale * pow(sin(PI * t), 0.56) * breathing, with breathing = 0.76 + 0.19 * sin(t * TAU * 2.2 + phase) + 0.10 * sin(t * TAU * 5.6 - phase). Build the wash as a two-sided indexed strip, offset ±1.35 * width along the normal. Pass across-coordinate -1/+1 and along-coordinate t through uv. Store the current.wash value in the selected pigment channel and zero in the others. The wash fragment shader feathers the across edge, fades the first 7.5% and last 11% of the curve, and modulates strength with procedural value noise at normalized-paper frequencies around 23, 71, and 360. Use soft mottling and granulation, not a flat filled strip.

Build 108, 86, and 68 fine fibers for the three respective currents. Use this deterministic generator once per composition, seeded with 821073, so all per-fiber variation can be reproduced:

function randomSource(seed) {
  let state = seed;
  return () => {
    state += 0x6d2b79f5;
    let n = state;
    n = Math.imul(n ^ (n >>> 15), n | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}

Distribute each fiber across [-1,1] of its ribbon with a tiny random offset. Give it a random phase, a slow wandering frequency between 1.3 and 3.4, and a wandering amplitude between 0.035 and 0.105 of the ribbon width. Add a weaker second sine term at 2.3 times that frequency. Fold interior fibers using sin(t * TAU * 1.7 + current.phase) * (1 - across²) * 0.2, and add a very small along-tangent meander. Make every thirteenth fiber stray to about 1.25–1.59 times the normal spread, reduce its strength, and vary its start/end sample so the outline is loose. Taper all fiber endpoints and modulate deposition gently along each line, leaving broken dry-brush rhythms inside a continuous overall current.

Batch fiber segments into one THREE.LineSegments geometry with per-vertex pigment weights, and use one strip mesh per wash. Render weights with additive custom blending (AddEquation, OneFactor, OneFactor), no depth test/write, and no tone mapping; set frustumCulled=false for these clip-space objects. Fine line thickness comes from the render-target pixels and overlapping strands, not a browser-dependent wide lineWidth. Return the composition scene and a dispose function, then dispose its temporary geometry and materials after the seed has been rasterized into dry pigment. The seeded image remains still; only actual drawing creates live particles. Do not automatically retrace the seed or continuously add random paint while idle.

Use an orthographic full-screen rendering setup. Create and reuse separate scenes or full-screen passes for copying prior pigment, drawing new contributions, and compositing onto paper. A shader's internal particle state or RGB weights must never accidentally receive display tone mapping or output color conversion.

4. A stable flowing stroke

Create a smooth, slowly changing flow field from sine-based warping or compact procedural noise. Combine a general field direction with local pointer influence and a controlled tangential curl around the pointer. Apply drag velocity to newly influenced particles so the result follows the gesture before curling away. Bound speed, apply exponential velocity damping, reduce life using elapsed simulation time, and stop rendering particles whose life has reached zero.

Create a real bloom at the start of a valid gesture even if the pointer never moves. For a drag, distribute a small subset of particles along the segment between the last consumed point and the newest current point, with a tightly bounded radial spread. This segment must be consumed once. Do not replay a backlog of old interpolated segments every frame. A new pointer-down must initialize both previous and current positions to that pointer; it must not draw a connecting line from a previous gesture.

Treat the narrow radial offset and pointer-speed influence in a consistent visual space. Correct horizontal radial offsets for the artboard aspect ratio so taps do not become wide ellipses. Apply aspect correction deliberately to pointer distances and speed where needed; do not independently multiply every field coordinate by aspect and accidentally alter the designed composition.

Maintain an explicit, monotonically incremented spawnStep for each actual simulation update. Use it with stable particle seeds to choose the particles that respawn. The position and velocity compute shaders must use the same spawn decision in the same update. A bounded version of the counter may be passed into the shader's random hash if needed for float precision, but adjacent updates must always have distinct identities. Never use floor(elapsedTime * 60) as frame identity: two updates on a 120 Hz display would select and overwrite the same particles, creating alternating gaps.

Clamp unusually large raw frame deltas to 1/30 second before simulation to prevent a tab restore from jumping the artwork. Separate real frameDelta from the reduced-motion displacement multiplier. Normalize spawn probability or spawn count and additive deposition energy to frameDelta. For a 60 Hz reference rate, use frameDelta * 60 for per-frame energy. Normalize spawning for the compute grid as well: spawnScale = frameDelta * 60 * (192 * 192) / particleCount, with spawn probability 1 - pow(1 - 0.014 * pointerActive, spawnScale). Use exponential time scaling for damping and decay, such as exp(-rate * frameDelta) or pow(referenceRetention, frameDelta * 60). A 120 Hz display must not deposit twice as much pigment per second as a 60 Hz display. Do not claim bit-for-bit deterministic trajectories across refresh rates unless a fixed-step implementation has actually proved that guarantee.

Tune the stroke in this order: segment coverage and frame timing, radial width, particle spawn density, deposition energy, flow/drag response, pigment retention, then palette and paper shading. Keep the path visible on a fast drag without filling the entire band into a solid tube. Fine edge fibers, tiny holes, tapered tails, and overlapping translucent color should remain legible.

Give every fresh pointer segment an immediate, very fine underpainting in the persistent dry target, in addition to the live fibers. Use an additive fullscreen segment shader: aspect-correct the pixel and segment endpoints, project the pixel onto the clamped segment, and feather its distance with 1 - smoothstep(0.15, 1.4, distance / radius). Use radius 0.0035 in normalized artboard-height coordinates for a moving segment, or 0.014 for one tap. Multiply the selected pigment-family vector by the feather, static grain in [0.65,1], and density 0.18. For moving segments normalize coverage by min(1, segmentLength / (2 * radius)) so overlapping short segments do not build thicker paint at high sample rates. Emit this pass only when the pointer moved or an accepted gesture just began; never replay a stationary or previously consumed segment. This thin base keeps fast and reduced-motion drawing continuous without enlarging the particle spawn radius. It uses the same clear, palette, pause, export, and resize memory as the other pigment layers.

5. Pigment persistence, material, and color

Use three half-float image targets for pigment-family weights: two wet trail targets that ping-pong, plus a persistent dry pigment target. Each update copies the current wet target into the alternate target with time-normalized retention, then adds this update's flowing particles. A useful starting retention is pow(0.975, frameDelta * 60). Swap only after the pass is complete; never sample the texture currently attached for writing. Deposit a smaller contribution from the same particles into the dry target, initially about 0.24 times the frame-normalized deposition energy. Seed the dry target with the initial ribbon meshes and lines once at initialization. Disable unwanted depth testing and depth writing for the full-screen and pigment passes. Restore renderer target, clear state, and other temporarily changed state after custom passes.

Pigment should persist as a painting while movement settles. The wet pair gives temporary motion and fresh-ink detail; the dry target keeps the seeded composition and deposited traces without temporal fading. This should remain a useful art-making tool after the first stroke. Apply a bounded visual density response, avoid excessive deposition energy, and keep very faint dust from gradually filling the entire paper.

Composite all pigment families in a final shader. Combine the dry field, a restrained four-neighbor softening of it, and the wet field; initial weights around 0.78 dry, 0.22 softened dry, and 0.3 wet give a useful starting point. Combine broad translucent wash with darker filament detail and a restrained impression of pigment settling at edges. Use a Beer–Lambert-style optical absorption model: derive an absorption coefficient from each pigment's linear color, weight the coefficients by pigment amount, and attenuate the paper by exp(-opticalDepth). This makes translucent overprinted colors richer than a simple average while keeping blank paper unchanged. Use deterministic multi-scale grain, faint directional fibers, and a gentle paper shading variation. Texture must support the pigment at actual display size, not become a noisy overlay.

Interpret CSS palette hex values through Three.js Color's linear working space. Do all material mixing in linear color, then apply the linear-to-sRGB display transform exactly once. Use the same explicit sRGBTransferOETF conversion in the final composite shader for screen and PNG output. Keep intermediate targets and the export target in NoColorSpace so an additional automatic conversion is not applied. Keep screen and export materials consistent, disable accidental tone mapping, and verify colors visually. Do not export linear values as ordinary image bytes or double-convert the visible image.

Palette changes must immediately reinterpret existing pigment weights, including the seeded artwork and every prior stroke. Do not clear, regenerate, or simulate a different drawing merely to change colors. Provide these three named palettes as a reproducible starting point:

- Mineral: warm ivory paper #f3ebdd; indigo #263b70, amber #d59a38, coral #b65349.
- Botanical: paper #f1eee3; forest #315c4a, sage #82a16b, terracotta #c8754f.
- Dusk: paper #f0e7e2; violet #533b6b, blue #336b87, rose #c25e78.

Adjust final palette values if browser review requires it, then update this prompt to match the delivered implementation.

6. Input and command semantics

Attach Pointer Events to the actual artboard HTML element. Track the active pointerId, capture that pointer on a valid pointer-down, and ignore unrelated touches or secondary pointers while drawing. Compute normalized positions from the artboard's current bounding rectangle. Coalesced events may improve sampling, but keep the queue bounded and prioritize recent movement; input must not visibly lag behind the finger.

Handle pointerup, pointercancel, and lostpointercapture explicitly. Release capture when appropriate, stop emission, zero stale drag velocity, and discard invalid queued input. Cancellation is not a new tap and must not trigger a delayed bloom. Reset an active gesture on pause, clear, and unmount. A pointer ending after a rejected paused gesture must not create ink on resume.

The main HTML controls are Pause / Resume, Clear, three palette swatch choices, a compact Tune disclosure, and Save PNG. Disable Save while a capture is in progress. Use accessible labels and button names, visible focus styles, aria-pressed for toggles and palette selection, and a polite text status region for discrete events. Do not announce simulation data every frame. Keep normal buttons outside the drawing hit region. Ignore secondary mouse buttons, and cancel unfinished drawing on window blur as well as pointer cancellation.

Pause freezes simulation, pigment deposition, fading, seed evolution, and any nonessential visual time. It does not merely change the button label. Palette selection, Clear, and Save PNG remain usable while paused. Trying to start drawing while paused should show a concise message such as "Resume the artwork to keep painting." Resume continues from the frozen state without a wall-clock jump or queued stale stroke.

Clear produces genuinely blank textured paper. Copy inactive initial position and velocity data into both the current and alternate GPU computation targets for both variables. Clear both wet trail targets and the dry pigment target, leave the procedural seed disabled, clear active/captured input and queues, and synchronize command bookkeeping. Test after multiple frames; clearing only the current target allows old paint to reappear on the next ping-pong swap.

Keep Clear and Save requests as monotonically increasing IDs so repeated clicks remain distinct and are handled exactly once. A resize or callback identity change must not replay an old command. Fix the computation tier for the lifetime of the mounted canvas. On artboard resize, keep the simulation targets, create appropriately sized image targets, copy the existing wet/dry pigment images into their replacements, and dispose of the old image targets. Preserve the selected palette and settings and do not reseed. Use the current artboard bounds for later pointer samples. The normalized composition may stretch to the new artboard aspect, but it must not disappear or resurrect cleared ink.

Tune exposes two labeled sliders, Flow strength and Turbulence, both 0 to 1 in 0.01 steps. Use calm midrange defaults of strength 0.62 and turbulence 0.48. Flow should change how strongly the current follows the gesture; turbulence should change wandering/curl without making the simulation unstable. Use explicit label associations and aria-valuetext for their percentage values. Also provide an Add ink button inside Tune so keyboard users can make a bloom without a pointer gesture; cycle its placement through [-0.24,0.08], [0.18,-0.12], and [0.02,0.22]. Keep Tune closed by default, close it on Escape or a press outside, and ensure it can be opened and closed on a narrow screen.

7. Save only the artwork

Save PNG captures the complete paper and pigment composition without HTML, toolbars, collection navigation, cursor, or interaction hints. Render the final composition to a temporary unsigned-byte target with the current artboard aspect ratio and a maximum long edge of 2048 pixels, further limited by renderer capabilities when necessary. This is a clean output of the existing pigment field, not a claim to regenerate higher-resolution simulation detail.

Read back pixels, vertically flip the rows once, place them into ImageData, and use canvas.toBlob with image/png. Initiate a downloadable Blob URL with a descriptive filename. Revoke the URL after the download has started and dispose of the temporary render target. Restore the previous render target and shader uniform state in a finally block, even if reading or encoding fails. Saving must not permanently resize the visible canvas, alter simulation resolution, move the artwork, or advance paused time.

Report preparation, success, and failure through the status region. Check for a missing Canvas 2D context, failed pixel readback, and a null Blob. A failed export should leave the studio usable. Allow export of the initial image, a paused image, a changed palette, and completely clear paper.

8. Responsive studio and accessible motion

At desktop sizes around 1440 × 900, use a spacious gallery composition: a large flowing artwork centered on the sheet, title and one short instruction near the upper left, small supporting notation near the edges, and a compact lower tool shelf. Use the kicker "A study in pigment & motion", the large serif title "Living Ink." with Ink italicized, and the short line "Make a mark. Let it become." At upper right place "03 / An open canvas" with the instruction "Tap to bloom. Drag to guide the current." Keep text on quiet paper rather than over the dense focal region. Center the controls in a warm frosted-paper shelf near the lower edge. The artwork must occupy most of the usable space.

At 390 × 844, recompose rather than uniformly shrink the desktop layout. Around an 800-pixel breakpoint, use a smaller title, move the instruction below the header, preserve a substantial central painting region, and reflow the lower shelf into a palette row and an action row. Keep every essential action reachable without horizontal scrolling. Use comfortable touch targets, readable slider labels, and spacing that distinguishes Clear from the primary export action. Hide purely decorative metadata before sacrificing drawing area or control clarity.

Restrict touch-action:none to the drawing surface when both-axis touch painting is needed. The surrounding studio, text, and HTML controls must retain normal scrolling and interaction. A full-page invisible drawing layer must not intercept buttons or trap navigation. Account for the height of an embedding portal header, safe areas, and a short viewport; allow the outer layout to scroll if that is required to keep tools reachable.

Read prefers-reduced-motion from matchMedia on initialization and subscribe to changes. The initial composition is static in either mode. When reduced motion is requested, scale live-particle displacement and flow strength to about 12% and set turbulence to zero, while keeping real-time life and spawning independent of that displacement. Also scale wet and dry deposition energy to about 18% in this mode: slower particles linger over the same pixels and otherwise build dark dots at pointer sample positions. Retain frameDelta normalization in both modes. Remove nonessential UI transitions. Preserve immediate user-driven painting, palette changes, Clear, pause/resume, and export. Keep simulation time separate from wall-clock time so toggling the preference or resuming cannot cause a jump. Do not add sound.

Use a real heading, labels, buttons, and a concise text description outside the decorative canvas. Expose discrete status changes in aria-live="polite". Provide an intentional unsupported-WebGL or computation-failure surface with a clear retry or return action. A standalone app owns its error boundary; an existing portal may provide the surrounding route boundary.

9. Performance and lifecycle

Cap display DPR at 1 to 1.25. At initial mount choose a compute grid of 128² particles for an artboard width below 640, 192² below 1100, and 256² otherwise. Do not scale computation texture dimensions directly with Retina DPR. Use pigment image targets at the artboard dimensions multiplied by a device-pixel-ratio scale clamped to [1,1.5], independently of export dimensions. Disable unused depth/stencil buffers and reuse geometry, materials, vector temporaries, and uniform objects.

Create GPU resources inside an effect with symmetric cleanup so StrictMode's mount/cleanup cycle cannot abandon render-time allocations. Keep the computation resources stable for a mounted canvas; resize the image targets independently while copying their pigment contents. Memoize deterministic data and avoid per-frame JavaScript allocations and React state updates. Handle unavailable floating-point computation or half-float image targets cleanly. Limit work for mobile instead of assuming that a WebGL2 context proves every relevant extension works.

Dispose of GPUComputationRenderer and its textures/targets, manually created initial/blank textures where ownership requires it, pigment targets, seeded geometry, particle geometry, every material (including both computation variable materials, which GPUComputationRenderer r177 does not dispose itself) and full-screen plane geometry, and temporary export targets. Remove media-query and input listeners. Release pointer capture and revoke outstanding Blob URLs when appropriate. Do not leave duplicate animation loops or resources after React StrictMode remounts or route changes.

10. Build order and actual acceptance

Implement the complete lifecycle with a simple visible pigment pass first: initialize -> tap/drag -> pause/resume -> clear -> palette -> export. Then compose the large seeded ribbons, tune live filaments and pigment persistence, refine the paper material, and build the responsive editorial shell. Inspect real screenshots while adjusting art direction. Do not judge quality only from shader source or a successful build.

Run the project's build, lint, and typecheck commands. Inspect the application at a representative desktop size (at least 1280 × 720, preferably also 1440 × 900) and exactly 390 × 844 mobile. Verify:

- The initial seeded composition is immediately visible, layered, curved, and balanced, with fine threads, translucent color, and useful blank paper. It remains still while idle and retains its structure after live brush movements settle.
- A short tap emits a bloom. Slow and fast horizontal, vertical, and curved drags produce continuous marks without giant opaque heads or repeated segments. New gestures do not connect to old pointer positions.
- At 60 Hz and a higher refresh rate where available, drawing density and speed stay reasonably consistent. If high-refresh hardware is unavailable, state that limit and inspect the spawnStep/frameDelta code paths; do not pretend source inspection is a hardware test.
- Pause truly freezes the picture. Paused drawing is rejected clearly. Resume does not emit stale queued input. Clear during active and paused states removes all layers and stays blank across subsequent ping-pong swaps.
- Palette changes recolor the existing composition immediately. Tune opens and closes without covering essential actions; slider changes have visible, stable effects.
- Export succeeds before drawing, after drawing, after a palette change, while paused, and after Clear. Open a resulting PNG and compare orientation, aspect ratio, paper and pigment colors, and absence of UI with the actual canvas.
- Pointer capture remains correct when dragging outside the artboard. Pointer cancellation and a second touch do not leave emission stuck on or trigger delayed pigment. Keyboard focus and every HTML action remain usable.
- Desktop and mobile have no unintended horizontal overflow, clipped primary controls, unreadable copy, or overlays intercepting painting. Normal movement outside the drawing surface remains possible.
- Reduced motion works on initial load and when the setting changes. Unsupported rendering and an initialization failure show a readable recovery state.
- Route remounts and resizing do not leak resources, replay exports, or resurrect cleared pigment unexpectedly. Document any intentional resize limitation.
- The console has no unexplained errors or warnings. A production build using /threejs-x-space/ as the Vite base loads without broken paths.

Save representative initial and actively painted screenshots on desktop and mobile, and inspect at least one exported PNG. Report exactly which checks ran and which could not be performed. Do not claim independent clean-room regeneration, high-refresh device coverage, export comparison, or browser acceptance that did not happen.

Write README.md with setup, controls, the rendering architecture, resize/capability limitations, the absence of external visual assets, and a link to docs/rebuild-prompt.md. Preserve this full prompt in that file and synchronize it with final palette, layout, architecture, and behavior decisions. Do not commit, push, deploy, or publish unless separately requested.

11. Optional integration into threejs-x-space

Use this section only if the working directory is already the public cofy-x/threejs-x-space repository. Read its AGENTS.md, maintainer context index, design guidance, and the owning package README first. Do not create another standalone Vite app beside the existing portal.

Put the implementation in packages/experience-living-ink, name the package @threejs-x-space/experience-living-ink, and export LivingInkExperience from src/index.tsx. Keep experience-specific shaders, UI, and styles in that package. Use the workspace's existing React/Three.js versions, TypeScript and ESLint configuration packages, and package-manager conventions. Put this prompt in packages/experience-living-ink/docs/rebuild-prompt.md and link it from the package README.

Retain or register the lazy experience route /experiences/living-ink through apps/portal/src/experiences.ts, and the workspace:* dependency in apps/portal/package.json. Use the portal's existing navigation, loading, and error boundaries where appropriate. Preserve the production /threejs-x-space/ base path and verify direct opening of the built experience route. A collection preview must stay lightweight and must not eagerly import the complete GPU simulation. Update the root experience catalog only if its description or route has changed.

Start browser review with pnpm --filter @threejs-x-space/portal dev --host 127.0.0.1. Run pnpm build, pnpm lint, and pnpm typecheck from the repository directory for final validation. Check both portal home and the Living Ink route at desktop and 390 × 844 mobile sizes. Preserve unrelated worktree changes and other experiences. Keep all public content English and free of credentials, local absolute paths, private infrastructure references, generated build output, and large unoptimized assets.
````
