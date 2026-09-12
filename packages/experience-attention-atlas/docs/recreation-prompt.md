# Attention Atlas recreation prompt

Copy the complete prompt below into a coding assistant working in a checkout of `threejs-x-space`. It captures the final experience, including the module-unfolding interaction and the full-width overview. It is an implementation brief, not a guarantee of identical generated code or pixel-for-pixel geometry. To run the exact implementation, use the checked-in source and lockfile with the commands in the [experience README](../README.md).

The architecture baseline is the original Transformer **base** model and **DeepSeek-V4.1-Flash**, researched on September 12, 2026. Use the [download guide](README.md) to obtain the pinned PDFs locally; the [research notes](../RESEARCH.md) contain the detailed source mapping. Keep these model identities fixed when recreating the demo; do not silently substitute a newer DeepSeek release. For a separate variant, change the package name, route, title, and experiment number before running the prompt.

```text
Build Attention Atlas, an interactive 3D comparison of the original Transformer
base architecture and DeepSeek-V4.1-Flash, in this threejs-x-space checkout.

Start by reading AGENTS.md, its task routing, the repository README, and the
experience design guidance. Inspect the worktree and preserve unrelated work.
If packages/experience-attention-atlas already exists, read its README,
RESEARCH.md, architecture data, mechanism specifications, and scene code.
Reuse the working implementation and fill gaps against this brief instead of
overwriting it or adding a duplicate experience. Use English in public source,
comments, interface text, and documentation. Do not commit, push, or deploy.

Purpose and primary interaction
- Create a calm, precise architectural field guide. The primary loop is:
  inspect the overall architecture, click a module, watch it unfold into its
  internal computation, step through the mechanism, and return to the overview.
- Implement a running experience, not just a proposal or a static diagram.
- Treat it as an educational schematic. Do not load model weights or imply
  that the demo runs inference, measures latency, or displays learned scores.

Research and fixed model baseline
- Read the original Transformer paper, Attention Is All You Need (2017):
  https://arxiv.org/abs/1706.03762
  PDF: https://arxiv.org/pdf/1706.03762v7
- Read DeepSeek-V4.1-Flash: Pushing the Limits of KV Cache Compression (2026):
  https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash/resolve/dba1be0a40aa45a94ad051997016db3960a90277/DeepSeek_V41_Tech_Report.pdf
  Model card: https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash
- Download PDFs for research and inspect architecture figures as well as text.
  When the checked-in helper is present, run:
  pnpm --filter @threejs-x-space/experience-attention-atlas papers:download
  It reads docs/papers.json and verifies files in the package's Git-ignored
  papers/ directory. Use papers:check for offline verification. Keep the
  manifest and downloader in source control, with downloaded PDFs ignored.
  Preserve the September 12, 2026 research baseline recorded in RESEARCH.md.
  If remote documents have changed or cannot be accessed, report that clearly;
  do not invent missing details or silently replace this model with another.
- Use this site as visual and interaction inspiration:
  https://transformer-architecture.petergostev.chatgpt.site/
  Its useful ideas are the frontal architecture, outside labels, and modules
  that open into animated internals. The papers determine scientific accuracy.
  Author original geometry, code, and explanations; do not copy site assets or
  redistribute paper figures/PDFs without the necessary rights.
- Record paper sections, dimensions, topology, and schematic caveats in
  RESEARCH.md. Link each module's explanation to the relevant paper page.

Preserve the architecture
- Original Transformer base: six encoder and six decoder layers, width 512,
  eight attention heads of dimension 64, and dense FFN 512 -> 2048 -> 512.
  Encoder self-attention is bidirectional. Decoder self-attention is causal.
  Cross-attention uses decoder queries and final encoder keys/values. Include
  shifted target embeddings, sinusoidal positions on both stacks, post-sublayer
  residual Add & Norm, vocabulary projection, and softmax.
- DeepSeek-V4.1-Flash: 20 causal encoder layers plus 20 causal decoder layers.
  Final encoder states supply both decoder input and projected shared decoder
  global KV. Keep both data paths visible. Local SWA KV remains layer-specific.
- Preserve the exact one-based attention schedule, with MoE in every layer:
  Encoder: SWA x2 + [Full + Reuse x5] x3.
  Decoder: [Full + Reuse x3] + [Reindex + Reuse x3] x4.
  Engram attaches at encoder layers 2 and 15.
- Distinguish Full, Reindex, and Reuse. Full builds global KV and performs
  sparse indexing; it does not mean dense attention. Reindex keeps KV but
  computes a new selection. Reuse keeps KV and the latest indices, while
  computing fresh main queries, local SWA, and a new attention output.
- DeepSeek has 64 main query heads and 32 indexer heads when indexing runs;
  do not show an active new indexer pass in Reuse. Main global KV is shared,
  not duplicated into 64 independent caches. Use the research notes for exact
  head dimensions and the 512-feature main global KV latent.
- Combine up to 512 eligible global entries with the local causal 128-position
  window in joint attention. Include the current local position. Never expose
  future keys or select more entries than exist. Account for encoder 2:1
  global sequence compression versus decoder 1:1 when visualizing access.
- Show the hierarchical candidate pool separately from the final Top-512 set.
  Decoder Reindex searches within the query-specific pool produced by Full.
- MoE selects six of 384 routed experts plus one always-active shared expert.
  Engram is token N-gram conditional memory, not another expert group.
  Single-Pass mHC mixes four residual streams; it is not simply LayerNorm.
  DSpark is auxiliary to the 40-layer backbone and proposes five draft
  positions through three drafter blocks; accepted prefix length varies.
- Prefill includes encoder processing, global-KV projection, and decoder replay
  of the final 128 prompt tokens to reconstruct local SWA state. Decode sends
  each new token through both causal stacks.
- A context control may show 256 to 1M tokens, defaulting to 4K. The estimate
  tokens * 890 bytes describes global KV only, excluding local SWA, weights,
  and other runtime memory. It is not an original-Transformer context limit
  or an inference benchmark. Context must not change the fixed layer schedule.

Visual composition
- Use a full-width dark navy stage, a subtle floor grid, restrained translucent
  component housings, fine edges, and directional signal paths. Use amber for
  the original model and mint for DeepSeek, with consistent component colors.
- Begin with a near-frontal orthographic comparison. Show the original
  encoder/decoder on the left and the DeepSeek causal pair on the right.
  Group repeated layers with explicit repetition marks and provide an exact
  40-layer DeepSeek map in the notes. Separate backbone and auxiliary modules.
- Make the architecture the main visual focus. Retain the portal navigation,
  a compact title, model tabs, a component selector, and camera controls.
  Place desktop labels outside the towers with short leader lines. Stagger
  auxiliary modules so their labels do not collide with backbone labels.
- Open explanations and sources on demand. Do not reserve a permanent wide
  sidebar that shrinks the 3D stage. Do not replace the scene with text cards.
- When a module opens, animate it out of its architectural position into a
  large inspection area. Recede the surrounding architecture into faint,
  noninteractive wireframe silhouettes. Hide overview labels during inspection
  so background chips, labels, and surfaces cannot obscure the mechanism.
- In desktop Compare view, open related mechanisms side by side by default,
  with a single-module toggle. Label each model and each mechanism's own
  current stage; related mechanisms need not perform identical computations.
  Allow orbit and zoom while keeping the initial inspection framing readable.

Build meaningful internals for every module
- Cover all 40 selectable overview components with 15 diagram families:
  embedding, position, attention, dense network, MoE, normalization, cache,
  Engram, vision, residual streams, projection, softmax, drafting, candidate
  selection, and contextual representation. Each family needs three named
  computation stages with its own animated data flow and short explanation.
- Attention: display head banks, separate Q/K/V banks, an enlarged matrix,
  a scanning query row, allowed/masked cells, and weighted output. Distinguish
  dense encoder access, causal decoder masking, rectangular cross-attention,
  local windows, and sparse global retrieval. Apply masks before softmax.
  Show eight original heads versus 64 DeepSeek query heads, and separate
  indexing from main attention. Connect local SWA into joint attention before
  weighting; do not depict a late sum of separately normalized outputs.
- Dense FFN: expand, activate with ReLU, and project back. MoE: score experts,
  illuminate six routed selections plus the shared expert, and merge their
  weighted results. Label representative expert grids as samples of the pool.
- Add & Norm: show the bypass, residual addition, and feature normalization.
  mHC: show all four streams feeding input mixing A, residual mixing B, the
  block computation, and C distributing its output into four residual sums.
  Preserve the preceding-block input-mixing coefficients in Single-Pass mHC.
- Memory: animate final encoder representations, global-KV projection/storage,
  and shared decoder reads. Show Engram N-grams of orders 2/3/4, eight hash
  heads per order, table lookup, context gating, and residual integration.
  Do not add the short convolution omitted from this Engram version.
- Vision: show patches, the vision encoder, 3x3 pixel-unshuffle, the two-layer
  projector, and visual embeddings joining the text sequence. Unshuffle
  rearranges features; it does not average image patches.
- DSpark: show three drafter blocks, five parallel draft positions, Markov
  dependence/confidence scheduling, a distinct backbone verification stage,
  and an illustrative accepted prefix. Confidence does not itself verify.
- Give embedding, positions, representation, vocabulary projection, softmax,
  and candidate selection their own readable transformations too. Derive toy
  softmax output from the same logits displayed as input, with labeled scales.
- Clearly distinguish published counts from illustrative tensor cells,
  scores, routing choices, token values, and acceptance outcomes. The demo
  should explain operations without pretending to contain actual model data.

Interaction, animation, and accessibility
- Clicking a physical block or its HTML label must open the internal view.
  Provide a keyboard-accessible component selector for every block, previous/
  next controls, Close module/Overview, zoom buttons, and overview spacing.
- Provide three manual computation steps, global pause/resume, Replay, and
  0.5x/1x/2x speed. Pause must preserve the current signal position, not reset
  it. A manual step pauses playback; Replay starts again at the first stage.
- Provide a roughly one-minute, seven-stop tour connecting input, original
  attention, cross-attention, causal encoder states, sparse retrieval, MoE,
  and drafting. Support manual navigation, pause, completion, and Escape.
- At mobile widths, default to one model and open one mechanism at a time.
  Provide a related-module switch and scrollable notes. Reset scroll to the
  mechanism when selecting a module and reveal the notes when requested.
- Preserve normal vertical scrolling across the canvas. Require an explicit
  Enable 3D gestures toggle for mobile orbit controls. Ensure the canvas
  wrapper and canvas both allow pan-y while gestures are disabled.
- Respect prefers-reduced-motion: start paused, avoid camera/unfolding motion,
  and keep manual stage and tour controls usable. Provide visible keyboard
  focus, meaningful labels, loading/error states, and WebGL context recovery.

Implementation and portal integration
- Use TypeScript, React, Three.js, and React Three Fiber in
  packages/experience-attention-atlas. Use procedural geometry; this reference
  implementation needs no Blender model, remote font, or external image asset.
  Blender is optional only for an intentional licensed asset variant; do not
  make it a prerequisite or claim it was used when it was not.
- Separate architecture/source data, mechanism specifications, internal
  diagrams, scene/camera behavior, and the HTML interface. Keep exact schedules
  data-driven so the overview, selector, notes, and layer map agree.
- Instance repeated cells and experts, share owned geometry/materials, cap
  device pixel ratio, and avoid React state updates inside render loops.
  Use a controllable animation clock, dispose owned resources, and disable
  picking on decorative or recessed context geometry.
- Register the package dependency and lazy portal route at
  /experiences/attention-atlas, with experiment number 06 and a lightweight
  original SVG preview. Update the root catalog and package README.
  The portal preview must not eagerly load the full Three.js experience.
- Support the production base path /threejs-x-space/ and direct route entry.

Acceptance and handoff
- Run pnpm build, pnpm lint, and pnpm typecheck from the repository root.
  Check local documentation links, public English text, and source attribution.
  Report unrelated worktree failures accurately without modifying others' work.
- Inspect the portal and experience at desktop >=1280x720 and mobile 390x844;
  also use a larger desktop viewport to assess the intended full-width scene.
- Exercise all 40 modules and all three stages. Compare dense, causal, cross,
  windowed, and sparse attention. Inspect MoE, cache, Engram, mHC, vision,
  candidate selection, output probabilities, and draft verification visually.
- Verify that paused frames stay stable, playback visibly advances, Replay
  resets the stage, speed changes progression, and each paired view labels
  its own stage. Check all tour stops, completion, Escape, model switching,
  field notes, paper links, and the exact 40-layer map.
- Check actual mobile touch scrolling over the canvas, gesture toggling,
  related-module navigation, small-label readability, horizontal overflow,
  clipping, and desktop leader-line collisions. Fix foreground/background
  interference instead of hiding it with blur or tiny text.
- Verify reduced motion, WebGL context-loss recovery, lazy loading, route
  re-entry, production base-path loading, and console errors. Close temporary
  test pages and servers afterward.
- Deliver the working code, research notes, this reusable prompt, and useful
  desktop/mobile captures. State checks actually performed and any remaining
  limitations. Never present unverified checks as passing.
```
