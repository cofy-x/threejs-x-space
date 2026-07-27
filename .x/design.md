# Experience design guidance

## Purpose

`threejs-x-space` should feel like a curated collection of memorable interactive 3D work, not a set of unrelated demos and not a single theme repeated across different subjects. This document defines shared decision-making principles and quality gates. It does not prescribe one palette, layout, genre, or interface style.

## Design layers

### Collection layer

The portal owns the collection identity. It should make experiments easy to discover, establish a recognizable editorial voice, and give each project enough space to communicate its premise. Portal navigation and catalog behavior should remain consistent even as individual experiences become visually diverse.

### Experience layer

Each experience owns its art direction. Begin with its subject, intended feeling, main interaction, and technical constraints. A scientific instrument, an abstract toy, a narrative scene, a generative artwork, and a physics simulation should not be forced into the same visual language.

An experience may be light, dark, colorful, monochrome, spatial, cinematic, playful, or utilitarian when that choice supports the concept. The turbofan's graphite instrument theme is one valid solution for an aerospace simulation, not a default template.

### Shared system layer

Shared packages should encode reusable behavior and themeable primitives. They must not silently impose the visual assumptions of the first experience that uses them. Prefer semantic tokens and explicit component APIs over copied values or global selectors.

Promote a pattern into `packages/ui` or `packages/three-utils` when it is broadly useful or when a second real use case proves the abstraction. Keep speculative or strongly themed patterns inside their owning experience.

## Experience brief

Before implementing a new experience, define these points in its package documentation or implementation notes:

- The one-sentence premise.
- The primary feeling or behavior the experience should create.
- The main user action and the feedback it produces.
- The visual focal point.
- The minimum meaningful state and the most important active state.
- The desktop and mobile composition strategy.
- Performance or accessibility constraints that materially affect the design.

The brief should be short. Its purpose is to prevent visual choices from becoming a collection of disconnected effects.

## Visual principles

### Establish hierarchy before decoration

Make the subject, primary action, state, and supporting information distinguishable through composition, scale, spacing, contrast, and typography before adding glow, particles, gradients, or ornamental graphics.

The 3D subject should normally be the focal point. Interface elements may frame, explain, or control it, but should not reduce the canvas to background decoration unless the concept intentionally centers the interface.

### Use color semantically

Create a small semantic palette for each experience. Separate roles such as surface, text, primary action, live data, selection, success, warning, danger, heat, or motion when those concepts exist. Do not reuse a color for unrelated meanings merely because it is visually attractive.

Brand continuity can come from a restrained recurring accent or navigation treatment, but an experience may choose a different dominant palette. Avoid defaulting to cyan-on-navy, neon glow, or dark mode simply because the project uses Three.js.

### Give typography explicit jobs

Use type choices to clarify roles. A display face may establish mood, a sans-serif face may support interface reading, and a monospace face may present measurements or machine state. Not every experience needs all three. Limit the number of roles and keep labels readable at their actual rendered size.

### Let detail follow distance

Large forms and primary motion should read first. Secondary geometry, labels, particles, and surface detail should become useful as the user looks closer. Avoid uniform visual intensity across the entire viewport.

### Prefer material contrast over excessive effects

Lighting, scale, negative space, surface response, line weight, and controlled motion usually create stronger depth than persistent bloom, glow, blur, or animated backgrounds. Use effects when they communicate energy, atmosphere, focus, or state.

## Interaction principles

- Make the primary interaction discoverable without a tutorial when possible.
- Provide immediate visual feedback for input, loading, disabled, active, paused, completed, and error states when those states exist.
- Keep controls close to the content they affect and give destructive or disruptive actions an appropriate visual distinction.
- Preserve useful direct manipulation such as orbit, drag, pointer, keyboard, or touch behavior without allowing it to interfere with page navigation.
- Use progressive disclosure for advanced controls. The first view should communicate the premise rather than expose every parameter.
- Prefer deterministic recovery: users should be able to pause, reset, replay, or return to a known state when the experience benefits from it.

## Motion and sound

Motion should explain cause and effect, establish atmosphere, guide attention, or express the simulated system. Avoid perpetual interface animation that competes with the Three.js scene.

Respect `prefers-reduced-motion` for nonessential motion and provide a usable experience when it is enabled. Do not auto-play sound. If sound is part of the concept, make activation and mute state explicit and preserve a meaningful silent experience.

## Responsive composition

Responsive work is a composition change, not only a scale change.

- Define which region appears first on a narrow screen.
- Preserve the primary action and essential state without horizontal scrolling.
- Reflow, collapse, or defer secondary instruments and explanatory content.
- Keep touch targets usable and prevent canvas gestures from trapping normal page movement.
- Test labels and overlays at scene edges; 3D annotations must remain understandable when some detail is intentionally hidden.

Do not require feature parity when it would make mobile unusable. Preserve the core idea and interaction instead.

## Accessibility and resilience

- Use semantic HTML for navigation, headings, controls, and status where HTML is present.
- Maintain readable contrast and never rely on color alone for critical state.
- Provide keyboard access for interface controls and visible focus treatment.
- Give meaningful canvas experiences a concise text premise and usable controls outside the canvas when appropriate.
- Make loading and failure states intentional. A missing asset or unsupported capability should not leave an unexplained blank region.
- Keep interface copy concise, specific, and in English.

## Performance principles

Visual ambition must remain compatible with a public web experience.

- Set an intentional pixel-ratio range and adapt expensive effects where necessary.
- Reuse geometry, materials, textures, and temporary objects in render loops.
- Avoid unnecessary React updates on every animation frame.
- Load an experience only when its route is requested and load large assets deliberately.
- Keep portal previews lightweight and independent from the full experience bundle. A catalog preview should not eagerly load its Three.js scene.
- Optimize textures and models before adding them to the repository.
- Treat frame stability and input responsiveness as design quality, not only engineering metrics.

## Review checklist

Review each new experience and substantial visual change in at least one representative desktop viewport and one narrow mobile viewport. Exercise the initial state, primary active state, and any important paused, completed, or failure state.

Confirm that:

- The premise and focal point are understandable in the first view.
- The primary action is obvious and its feedback is clear.
- The palette has semantic roles and adequate contrast.
- The interface supports rather than overwhelms the 3D subject.
- Navigation remains consistent with the portal.
- No unintended horizontal overflow or clipped essential control exists.
- Reduced motion, keyboard use, loading, and failure behavior are reasonable for the experience.
- The GitHub Pages base path works.
- `pnpm build`, `pnpm lint`, and `pnpm typecheck` pass.

Document intentional exceptions near the owning experience. An exception is acceptable when it strengthens the concept and does not break core accessibility, navigation, or deployment requirements.
