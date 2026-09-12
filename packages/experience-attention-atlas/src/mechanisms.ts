import type { AtlasNode } from "./architecture";

export type MechanismKind =
  | "embedding" | "position" | "attention" | "dense" | "moe" | "norm"
  | "cache" | "engram" | "vision" | "streams" | "projection" | "softmax"
  | "draft" | "candidate" | "representation";

export interface MechanismSpec {
  kind: MechanismKind;
  title: string;
  summary: string;
  phases: readonly { title: string; detail: string }[];
  stats: readonly { label: string; value: string }[];
  counterpart?: string;
  attention?: {
    mask: "dense" | "causal" | "window" | "sparse";
    heads: number;
    indexHeads?: number;
    mode?: "full" | "reindex" | "reuse";
    compression?: number;
    querySource: string;
    kvSource: string;
  };
}
const stages = (a: string, ad: string, b: string, bd: string, c: string, cd: string) => [
  { title: a, detail: ad }, { title: b, detail: bd }, { title: c, detail: cd },
];
const originalInput: MechanismSpec = {
  kind: "embedding", title: "From token to vector", counterpart: "d-input",
  summary: "Look up a learned row for each token and scale the embedding before adding position.",
  stats: [{ label: "Model width", value: "512" }, { label: "Embedding scale", value: "√512" }],
  phases: stages("Token IDs", "Each token addresses a row in the vocabulary's learned embedding table.", "Lookup", "Retrieve the token's 512-dimensional vector; the miniature table shows sample features.", "Scale", "Multiply by √512. Positional encoding is added by the next component."),
};
const position: MechanismSpec = {
  kind: "position", title: "Position becomes a signal",
  summary: "Different sine and cosine frequencies encode each token's position.",
  stats: [{ label: "Signals", value: "sin / cos" }, { label: "Operation", value: "add" }],
  phases: stages("Locate", "Assign a position index to each token.", "Encode", "Evaluate sine and cosine waves at different feature frequencies.", "Add", "Add the positional features to the token embedding, preserving model width."),
};
const self: MechanismSpec = {
  kind: "attention", title: "Eight ways to read a sequence", counterpart: "d-full",
  summary: "Each source token can attend to every source token. The matrix shows illustrative attention weights.",
  attention: { mask: "dense", heads: 8, querySource: "Source states", kvSource: "Source states" },
  stats: [{ label: "Heads", value: "8 × 64" }, { label: "Visibility", value: "all source positions" }],
  phases: stages("Project Q · K · V", "Separate learned projections create queries, keys, and values for eight heads.", "Score & normalize", "Compute QKᵀ / √64 and apply a row-wise softmax over all source positions.", "Mix values", "Use the weights to combine values, concatenate the eight heads, then project the result."),
};
const masked: MechanismSpec = {
  ...self, title: "Only the past is visible", counterpart: "d-swa",
  summary: "The causal mask removes future positions before softmax. The diagonal remains visible.",
  attention: { mask: "causal", heads: 8, querySource: "Target states", kvSource: "Target states" },
  stats: [{ label: "Heads", value: "8 × 64" }, { label: "Mask", value: "causal" }],
  phases: stages("Project Q · K · V", "Project the shifted target representations into eight sets of queries, keys, and values.", "Mask the future", "Mask subsequent target positions before row-wise softmax; each row sees its own position and earlier ones.", "Mix values", "Aggregate only the visible values, concatenate the heads, and apply the output projection."),
};
const cross: MechanismSpec = {
  ...self, title: "Queries meet another sequence", counterpart: "d-dec-full",
  summary: "Target queries retrieve source values through a target-by-source attention matrix.",
  attention: { mask: "dense", heads: 8, querySource: "Decoder states", kvSource: "Final encoder states" },
  stats: [{ label: "Q", value: "decoder" }, { label: "K / V", value: "encoder" }],
  phases: stages("Two sources", "Queries come from the decoder; keys and values come from the final source encoder states.", "Cross-reference", "Score each target query against the source keys. Source access is not a triangular target mask.", "Retrieve", "Take a weighted mixture of source values for every target query."),
};
const dense: MechanismSpec = {
  kind: "dense", title: "Every token uses the full network", counterpart: "d-moe1",
  summary: "A position-wise dense network expands features, applies ReLU, then projects back.",
  stats: [{ label: "Feature path", value: "512 → 2,048 → 512" }, { label: "Activation", value: "ReLU" }],
  phases: stages("Expand", "The first dense transformation maps 512 features into a 2,048-wide hidden representation.", "Activate", "ReLU suppresses negative pre-activations. The bars are a small illustrative sample.", "Project back", "All active hidden features contribute to the 512-dimensional output."),
};
const norm: MechanismSpec = {
  kind: "norm", title: "A bypass, an addition, a normalization", counterpart: "d-mhc",
  summary: "The original Transformer uses post-norm residual sublayers. DeepSeek's four-stream routing is a different residual design.",
  stats: [{ label: "Order", value: "add → LayerNorm" }, { label: "Normalized axis", value: "features per token" }],
  phases: stages("Keep the input", "Carry the original input around the sublayer through a residual bypass.", "Add", "Add the sublayer output and its input feature by feature.", "Normalize", "Normalize each token's features, then apply learned gain and bias."),
};
const encoded: MechanismSpec = {
  kind: "representation", title: "The sequence after six layers", counterpart: "d-encoded",
  summary: "Final source states supply keys and values to all six decoder cross-attention layers.",
  stats: [{ label: "Encoder", value: "6 layers" }, { label: "Consumers", value: "6 cross-attention layers" }],
  phases: stages("Collect states", "Keep one contextual representation for each source position.", "Project K / V", "Each decoder cross-attention sublayer has its own learned K/V projections.", "Read from decoder", "Decoder queries use the final source representation in their cross-attention sublayers."),
};
const projection: MechanismSpec = {
  kind: "projection", title: "Features become vocabulary scores", counterpart: "d-head",
  summary: "A learned projection produces logits for the output vocabulary.",
  stats: [{ label: "Input", value: "hidden state" }, { label: "Output", value: "vocabulary logits" }],
  phases: stages("Read hidden state", "Take the last decoder layer's representation for this position.", "Project", "Apply the learned output weights to obtain a score for each vocabulary token.", "Expose logits", "Pass the vocabulary scores to the probability normalization step."),
};
const softmax: MechanismSpec = {
  kind: "softmax", title: "Scores become probabilities", counterpart: "d-head",
  summary: "Vocabulary softmax normalizes logits. A probability distribution does not prescribe a sampling policy.",
  stats: [{ label: "Axis", value: "vocabulary" }, { label: "Probability sum", value: "1" }],
  phases: stages("Read logits", "Receive a vocabulary-sized vector of unnormalized scores.", "Normalize", "Exponentiate stably and divide by the sum across vocabulary entries.", "Distribution", "The bars show a toy probability distribution; choosing a token happens during decoding."),
};
const multimodal: MechanismSpec = {
  kind: "embedding", title: "Text and image tokens share a stream", counterpart: "t-input",
  summary: "Projected visual tokens and text embeddings enter the causal language backbone together.",
  stats: [{ label: "Backbone width", value: "5,120" }, { label: "Inputs", value: "text + images" }],
  phases: stages("Text tokens", "Look up the language model's learned text embeddings.", "Visual tokens", "Receive visual embeddings from the image encoder and its projector.", "Interleave", "Insert both kinds of embedding into one causal sequence."),
};
const local: MechanismSpec = {
  kind: "attention", title: "A moving window over the past", counterpart: "t-masked",
  summary: "The first two encoder layers use only local SWA. Later CSA2 layers retain this local branch too.",
  attention: { mask: "window", heads: 64, querySource: "Layer states", kvSource: "Local layer states" },
  stats: [{ label: "Main Q heads", value: "64" }, { label: "Local window", value: "128 tokens" }],
  phases: stages("Make local Q / K / V", "Create fresh queries and local keys and values from this layer's representations.", "Slide the window", "Each query sees at most 128 local causal positions. Earlier positions fall outside the window.", "Mix local values", "Aggregate visible local values; these two encoder layers have no global attention branch."),
};
const moe: MechanismSpec = {
  kind: "moe", title: "A few experts, chosen for this token", counterpart: "t-ff",
  summary: "Six routed experts and one shared expert contribute. The expert grid depicts a sample of the full population.",
  stats: [{ label: "Routed pool", value: "384" }, { label: "Active", value: "6 routed + 1 shared" }],
  phases: stages("Route", "The router scores experts for the current token and selects six routed experts.", "Compute", "Run the selected SwiGLU experts plus the always-active shared expert.", "Combine", "Merge the weighted routed outputs and the shared expert result. Routing shown here is illustrative."),
};
function csa(mode: "full" | "reindex" | "reuse", decoder: boolean): MechanismSpec {
  const action = mode === "full" ? "Build the cache and search" : mode === "reindex" ? "Search again, keep the cache" : "Reuse the search, recompute attention";
  return {
    kind: "attention", title: action, counterpart: decoder ? "t-cross" : "t-self",
    summary: "Global retrieval and local attention meet in one layer; the global cache is shared, not replicated for every query head.",
    attention: { mask: "sparse", heads: 64, ...(mode === "reuse" ? {} : { indexHeads: 32 }), mode, compression: decoder ? 1 : 2, querySource: "Layer states", kvSource: decoder ? "Final encoder states" : "Causal encoder states" },
    stats: [{ label: "Query heads", value: mode === "reuse" ? "64 main / indices reused" : "64 main / 32 index" }, { label: "Access", value: "up to 512 global + 128 local" }],
    phases: stages(
      mode === "full" ? "Build global KV" : "Load shared KV",
      mode === "full" ? decoder ? "Project shared decoder global KV from the final encoder states; the sequence ratio is 1:1." : "Compress causal encoder positions at a 2:1 ratio into the global KV representation." : "Use the most recent Full layer's global KV and indexer keys; local SWA KV remains layer-specific.",
      mode === "reuse" ? "Reuse sparse indices" : "Select global entries",
      mode === "reuse" ? "Reuse the latest sparse index set without a new indexer pass; compute fresh main queries and local SWA." : mode === "reindex" ? "New indexer queries choose up to 512 entries within the candidate pool." : "Indexer queries rank the eligible causal entries and select up to 512; Full still means sparse attention.",
      "Mix global + local", "Combine selected global values with the layer's local SWA values through fresh main attention queries.",
    ),
  };
}
const cache: MechanismSpec = {
  kind: "cache", title: "One global memory for twenty layers", counterpart: "t-encoded",
  summary: "The decoder shares projected global KV. Its layers still have individual queries and local SWA caches.",
  stats: [{ label: "Main global KV", value: "FP4" }, { label: "Local SWA KV", value: "FP8 · per layer" }],
  phases: stages("Encoder states", "Read the final causal encoder representations, the source of decoder global KV.", "Project & store", "Project a global latent KV representation, storing the main KV in FP4.", "Share", "Multiple decoder layers read the same global KV while maintaining their own local SWA state."),
};
const deepEncoded: MechanismSpec = {
  kind: "representation", title: "One representation, two decoder paths", counterpart: "t-encoded",
  summary: "Final encoder states become decoder input and separately produce its global KV.",
  stats: [{ label: "Causal encoder", value: "20 layers" }, { label: "Outgoing paths", value: "states + global KV" }],
  phases: stages("Finish the encoder", "Each position has passed through the 20-layer causal encoder.", "Split the roles", "Use the final states as decoder hidden-state input and as input to the global KV projection.", "Decode", "New generated tokens traverse both halves; prefill still retains bounded SWA replay."),
};
const vision: MechanismSpec = {
  kind: "vision", title: "Pixels become language-model inputs",
  summary: "Image patches pass through ViT, spatial rearrangement, and a learned projector.",
  stats: [{ label: "ViT", value: "32 layers / 16 heads" }, { label: "Unshuffle", value: "3 × 3 → 1 position" }],
  phases: stages("Patch & encode", "Split the image into 14-pixel patches and process them with DeepSeek-ViT.", "Pixel-unshuffle", "Rearrange each 3 × 3 neighborhood into feature channels: nine times fewer positions, without averaging them.", "Project", "A two-layer MLP maps the rearranged features to 5,120-wide language embeddings."),
};
const engram: MechanismSpec = {
  kind: "engram", title: "Retrieve a memory, then gate it",
  summary: "Token N-grams address learned memory; the current context decides how much of it to use.",
  stats: [{ label: "N-gram orders", value: "2 / 3 / 4" }, { label: "Locations", value: "encoder L2 + L15" }],
  phases: stages("Hash N-grams", "Canonicalized token IDs form suffix N-grams, with eight hash heads per order.", "Lookup", "Read and concatenate learned table rows, then project retrieved keys and values.", "Gate & integrate", "A context-aware sigmoid gate controls the retrieved contribution to the residual streams. No short convolution is used here."),
};
const streams: MechanismSpec = {
  kind: "streams", title: "Four streams, one block input", counterpart: "t-norm1",
  summary: "Single-Pass mHC routes residual streams; it is not the same operation as the original model's LayerNorm.",
  stats: [{ label: "Residual streams", value: "4" }, { label: "Maps", value: "A · B · C" }],
  phases: stages("Mix inputs", "Use the preceding block's A coefficients to mix four residual streams into one block input.", "Transform", "Apply the block function while B mixes the residual bypass streams.", "Distribute", "C distributes the block result into the updated streams. Predict A for the next block."),
};
const candidate: MechanismSpec = {
  kind: "candidate", title: "A smaller search space for later layers",
  summary: "A query-specific candidate pool narrows later indexer searches; it is not the final attention selection.",
  stats: [{ label: "Pool ceiling", value: "2,048 blocks × 8" }, { label: "Attention choice", value: "up to 512 entries" }],
  phases: stages("Score the range", "The first decoder Full layer scores the causally available global range.", "Build the pool", "Collect up to 2,048 candidate blocks of eight positions each.", "Reindex within it", "Later Reindex layers use new queries to select their attention entries inside this pool."),
};
const draft: MechanismSpec = {
  kind: "draft", title: "Propose, then verify a prefix",
  summary: "DSpark's drafts are auxiliary proposals. Verification determines which prefix can be accepted.",
  stats: [{ label: "Drafter blocks", value: "3" }, { label: "Draft positions", value: "5" }],
  phases: stages("Draft", "Three auxiliary blocks produce base logits for five draft positions in parallel.", "Coordinate", "A Markov head models dependencies and confidence schedules a prefix for verification.", "Verify prefix", "The backbone verifies proposals. The displayed acceptance is an example, never a guarantee of five accepted tokens."),
};
const deepHead: MechanismSpec = {
  ...softmax, title: "The next text-token distribution", counterpart: "t-softmax",
  summary: "The final decoder representation yields output vocabulary scores and next-token probabilities.",
  phases: stages("Decoder state", "Read the result of the 20 decoder layers for the current token.", "Vocabulary scores", "Project the final representation into output logits, then normalize across the vocabulary.", "Predict", "Expose the next-token distribution. Token selection and speculative acceptance are decoding decisions."),
};
const byId: Record<string, MechanismSpec> = {
  "t-input": originalInput, "t-target": originalInput,
  "t-position": position, "t-target-position": position,
  "t-self": self, "t-masked": masked, "t-cross": cross,
  "t-ff": dense, "t-dff": { ...dense, counterpart: "d-dec-moe1" },
  "t-norm1": norm, "t-norm2": norm, "t-dnorm1": norm, "t-dnorm2": norm, "t-dnorm3": norm,
  "t-encoded": encoded, "t-linear": projection, "t-softmax": softmax,
  "d-input": multimodal, "d-vision": vision, "d-swa": local,
  "d-full": csa("full", false), "d-reuse": csa("reuse", false),
  "d-moe1": moe, "d-moe2": moe, "d-moe3": moe,
  "d-encoded": deepEncoded, "d-engram": engram, "d-kv": cache,
  "d-dec-full": csa("full", true), "d-reindex": csa("reindex", true),
  "d-dec-reuse1": csa("reuse", true), "d-dec-reuse2": csa("reuse", true),
  "d-dec-moe1": { ...moe, counterpart: "t-dff" }, "d-dec-moe2": { ...moe, counterpart: "t-dff" },
  "d-dec-moe3": { ...moe, counterpart: "t-dff" }, "d-dec-moe4": { ...moe, counterpart: "t-dff" },
  "d-mhc": streams, "d-pool": candidate, "d-dspark": draft, "d-head": deepHead,
};
export function getMechanism(node: AtlasNode): MechanismSpec {
  return byId[node.id] ?? encoded;
}
