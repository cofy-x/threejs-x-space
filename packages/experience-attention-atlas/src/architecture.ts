export type AtlasView = "compare" | "original" | "deepseek";
export type AtlasKind = "embedding" | "attention" | "norm" | "compute" | "memory" | "output";
export interface AtlasNode {
  id: string;
  model: "original" | "deepseek";
  title: string;
  shortTitle: string;
  kind: AtlasKind;
  position: [number, number, number];
  width?: number;
  detail: string;
  fact: string;
  source: string;
  section: string;
}
export interface AtlasEdge { from: string; to: string; label?: string }
export const PAPERS = {
  original: "https://arxiv.org/pdf/1706.03762v7",
  deepseek: "https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash/resolve/main/DeepSeek_V41_Tech_Report.pdf",
};
export const ROLE_COLORS: Record<AtlasKind, string> = {
  embedding: "#cd8da8", attention: "#e8b86f", norm: "#d1d7b1",
  compute: "#7eb5db", memory: "#ac9de1", output: "#79d7c5",
};
export const ROLE_NAMES: Record<AtlasKind, string> = {
  embedding: "Representation", attention: "Attention", norm: "Residual / norm",
  compute: "Feed-forward", memory: "Memory / routing", output: "Output",
};
function block(model: AtlasNode["model"], id: string, title: string, shortTitle: string,
  kind: AtlasKind, x: number, y: number, detail: string, fact: string, section: string, page: number, width?: number): AtlasNode {
  return { model, id, title, shortTitle, kind, position: [x, y, 0], detail, fact, section,
    source: `${PAPERS[model]}#page=${page}`, ...(width ? { width } : {}) };
}
const t = (id: string, title: string, short: string, kind: AtlasKind, x: number, y: number,
  detail: string, fact: string, section = "Section 3.1 · p. 3", page = 3) =>
  block("original", id, title, short, kind, x, y, detail, fact, section, page);
const d = (id: string, title: string, short: string, kind: AtlasKind, x: number, y: number,
  detail: string, fact: string, section = "Section 2.3 · pp. 10–11", page = 10, width?: number) =>
  block("deepseek", id, title, short, kind, x, y, detail, fact, section, page, width);
const norm = "Add the sublayer result to its input, then apply LayerNorm. This residual route carries information around each attention or feed-forward operation.";
const ff = "Each position passes through the same two dense linear transformations with a ReLU in between. Every token uses the whole feed-forward network.";
const moe = "A router selects six of 384 routed experts for each token, alongside one shared expert. Every one of the 40 backbone layers has this MoE feed-forward sublayer. The miniature grid is representative.";
export const NODES: AtlasNode[] = [
  t("t-input", "Source token embedding", "Input embedding", "embedding", -9, .6, "Turn source tokens into learned vectors. The base Transformer uses a 512-dimensional representation throughout both stacks.", "Model width · 512", "Section 3.4 · p. 5", 5),
  t("t-position", "Sinusoidal position encoding", "+ Position", "embedding", -9, 1.55, "Add sine and cosine signals at different frequencies so an attention-only network can distinguish token positions. The decoder uses the same positional construction.", "Added to the embedding, not concatenated", "Section 3.5 · p. 6", 6),
  t("t-self", "Bidirectional self-attention", "Self-attention", "attention", -9, 3.05, "Each source position can look at every source position. Eight attention heads form different learned relationships through queries, keys, and values.", "8 heads · 64 dimensions per head", "Sections 3.2.2–3.2.3 · p. 5", 5),
  t("t-norm1", "Encoder attention: Add & Norm", "Add & Norm", "norm", -9, 4.15, norm, "LayerNorm(x + Attention(x))"),
  t("t-ff", "Dense feed-forward network", "Feed-forward", "compute", -9, 5.35, ff, "512 → 2,048 → 512", "Section 3.3 · p. 5", 5),
  t("t-norm2", "Encoder feed-forward: Add & Norm", "Add & Norm", "norm", -9, 6.45, norm, "Attention + FFN layer repeated 6 times"),
  t("t-encoded", "Final encoder representation", "Encoder output", "output", -9, 7.85, "After all six encoder layers, the source representation supplies keys and values to cross-attention in every decoder layer. Source encoding is bidirectional.", "K, V → all 6 decoder cross-attention layers", "Section 3.2.3 · p. 5", 5),
  t("t-target", "Shifted output embedding", "Output embedding", "embedding", -5, .6, "Embed the previous target tokens. Shifting the outputs right prevents the current position from being handed the token it is supposed to predict.", "Autoregressive target sequence"),
  t("t-target-position", "Target position encoding", "+ Position", "embedding", -5, 1.55, "Add the sinusoidal position representation to the target token embeddings before the first masked attention layer.", "Same sine / cosine construction", "Section 3.5 · p. 6", 6),
  t("t-masked", "Masked self-attention", "Masked attention", "attention", -5, 2.65, "The decoder attends only to positions at or before the current target position. A causal mask prevents it from reading future output tokens.", "Future positions are masked", "Section 3.2.3 · p. 5", 5),
  t("t-dnorm1", "Masked attention: Add & Norm", "Add & Norm", "norm", -5, 3.6, norm, "Post-norm residual connection"),
  t("t-cross", "Encoder–decoder cross-attention", "Cross-attention", "attention", -5, 4.65, "Queries come from the decoder. Keys and values come from the final encoder output, allowing the target sequence to retrieve information from the source sequence.", "Q: decoder · K, V: encoder", "Section 3.2.3 · p. 5", 5),
  t("t-dnorm2", "Cross-attention: Add & Norm", "Add & Norm", "norm", -5, 5.6, norm, "One residual connection per sublayer"),
  t("t-dff", "Decoder feed-forward network", "Feed-forward", "compute", -5, 6.7, ff, "Dense, position-wise computation", "Section 3.3 · p. 5", 5),
  t("t-dnorm3", "Decoder feed-forward: Add & Norm", "Add & Norm", "norm", -5, 7.7, norm, "Three-sublayer decoder repeated 6 times"),
  t("t-linear", "Vocabulary projection", "Linear", "output", -5, 9.15, "Project the last decoder representation into one score, or logit, for every token in the output vocabulary.", "Hidden vector → vocabulary logits", "Section 3.4 · p. 5", 5),
  t("t-softmax", "Next-token distribution", "Softmax", "output", -5, 10.25, "Normalize the vocabulary logits into a probability distribution. This is the output of the original paper's architecture; choosing a token is a decoding decision.", "Vocabulary probabilities sum to 1", "Section 3.4 · p. 5", 5),
  d("d-input", "Interleaved text and vision", "Input streams", "embedding", 4, .6, "Text embeddings and projected visual embeddings form one input sequence. Unlike the 2017 source encoder, DeepSeek's language backbone preserves causality through both halves.", "Text + image input · text output", "Section 2.1 · pp. 7–8", 7),
  d("d-vision", "Vision encoder and projector", "Vision → projector", "embedding", 1, .6, "DeepSeek-ViT encodes image patches. A 3 × 3 pixel-unshuffle and a two-layer MLP projector turn its output into visual tokens in the language model's input stream.", "32-layer ViT · patch size 14", "Sections 2.1.1 / 4.2.1 · pp. 8, 22", 8, 1.7),
  d("d-swa", "Local sliding-window attention", "SWA", "attention", 4, 2.05, "Encoder layers 1 and 2 use local sliding-window attention without a global branch. Every later CSA2 layer also retains its own local sliding-window attention.", "Local causal window · 128 tokens", "Sections 2.1 / 4.2.1 · pp. 7, 22", 7),
  d("d-moe1", "Experts in the local layers", "MoE", "compute", 4, 3.05, moe, "1 shared + 6 active routed experts", "Section 4.2.1 · p. 22", 22),
  d("d-full", "CSA2 Full: build and select", "CSA2 · Full", "attention", 4, 4.3, "Encoder layers 3, 9, and 15 build compressed global KV and compute new sparse indices. Full names the complete CSA2 path; the attention itself remains sparse and includes local SWA.", "2:1 global compression · Top-512 selection"),
  d("d-moe2", "Experts after Full attention", "MoE", "compute", 4, 5.3, moe, "SwiGLU expert width · 2,304", "Section 4.2.1 · p. 22", 22),
  d("d-reuse", "CSA2 Reuse: share the search", "CSA2 · Reuse", "attention", 4, 6.55, "Five layers after each encoder Full layer share its global KV and sparse indices. Each layer still computes fresh queries, local SWA KV, and attention outputs.", "[Full + Reuse ×5] ×3, after 2 SWA layers"),
  d("d-moe3", "Experts after Reuse attention", "MoE", "compute", 4, 7.55, moe, "MoE runs in every repeated layer", "Section 4.2.1 · p. 22", 22),
  d("d-encoded", "Final causal encoder states", "Encoder output", "output", 4, 9.25, "The last encoder states become the decoder's hidden-state input. Separately, they supply the decoder's shared global KV projection. Both connections are part of the causal encoder–decoder design.", "20 causal encoder layers · 8B active in prefill", "Section 2.2 · pp. 8–9", 8),
  d("d-engram", "Engram conditional memory", "Engram ×2", "memory", 1, 4.65, "Two conditional-memory modules attach at encoder layers 2 and 15. Hashed token N-grams retrieve learned memory with context-aware gating. Engram is separate from routed experts.", "98B parameters ×2 · encoder L2 and L15", "Section 2.4.2 · p. 13", 13, 1.7),
  d("d-kv", "Shared decoder global KV", "Global KV", "memory", 8, .6, "Project global keys and values from final encoder states, then share that cache across all 20 decoder layers. Local SWA KV is still separate in every layer.", "1:1 global ratio · main KV stored in FP4", "Sections 2.2 / 2.4.4 · pp. 9, 14", 9),
  d("d-dec-full", "Decoder Full attention", "CSA2 · Full", "attention", 8, 2.05, "Decoder layer 1 projects the shared global KV from encoder states and scores the visible causal range. Its Top-512 selection supports its attention; a larger candidate pool supports later Reindex layers.", "Decoder L1 · global + local SWA"),
  d("d-dec-moe1", "Decoder mixture of experts", "MoE", "compute", 8, 3.05, moe, "16B backbone parameters active during decode", "Section 4.2.1 · pp. 21–22", 22),
  d("d-dec-reuse1", "Reuse the first sparse selection", "CSA2 · Reuse", "attention", 8, 4.2, "Decoder layers 2–4 share the global KV and indices selected by layer 1. Reusing the retrieval work reduces overhead while each layer computes its own attention result.", "Decoder L2–4 · no new indexer pass"),
  d("d-dec-moe2", "Experts after reused selection", "MoE", "compute", 8, 5.2, moe, "One MoE sublayer per attention layer", "Section 4.2.1 · p. 22", 22),
  d("d-reindex", "CSA2 Reindex: refine retrieval", "CSA2 · Reindex", "attention", 8, 6.35, "Decoder layers 5, 9, 13, and 17 use new indexer queries to choose fresh Top-512 entries from the candidate pool. They keep the shared global KV cache.", "New selection · same global KV", "Section 2.3.2 · pp. 11–12", 11),
  d("d-dec-moe3", "Experts after reindexing", "MoE", "compute", 8, 7.35, moe, "[Reindex + Reuse ×3] ×4", "Section 4.2.1 · p. 22", 22),
  d("d-dec-reuse2", "Reuse the refined selection", "CSA2 · Reuse", "attention", 8, 8.5, "Three Reuse layers follow each Reindex layer, each paired with an MoE sublayer. This four-layer unit repeats four times. Each layer computes new queries and local SWA outputs.", "L6–8, 10–12, 14–16, 18–20"),
  d("d-dec-moe4", "Experts after refined reuse", "MoE", "compute", 8, 9.35, moe, "MoE also follows the last Reuse layer", "Section 4.2.1 · p. 22", 22),
  d("d-head", "Autoregressive text output", "Output head", "output", 8, 10.25, "After all 20 decoder layers, the output head predicts text tokens. Every newly generated token traverses both the causal encoder and decoder.", "20 encoder + 20 decoder backbone layers", "Sections 2.1–2.2 · pp. 7–9", 7),
  d("d-pool", "Hierarchical candidate pool", "Candidate pool", "memory", 11, 3.8, "The first decoder indexer builds a query-specific pool of at most 2,048 blocks, each containing eight positions. Later Reindex layers select their Top-512 inside that pool.", "Up to 16,384 candidates → Top-512", "Section 2.3.2 · pp. 11–12", 11, 1.7),
  d("d-mhc", "Single-Pass mHC", "mHC streams", "norm", 1, 7.4, "Four residual streams carry information through the backbone. Input mixing uses coefficients predicted by the preceding block, so it need not wait for coefficients computed from the current residual streams.", "4 residual streams · shown once for clarity", "Section 2.4.1 · pp. 12–13", 12, 1.7),
  d("d-dspark", "DSpark speculative decoding", "DSpark", "output", 11, 8.5, "Three auxiliary drafter blocks propose five draft positions in parallel. A Markov head and confidence schedule coordinate verification; the five proposals are not five guaranteed accepted tokens.", "3 drafter blocks · separate from the backbone", "Section 2.4.3 · pp. 13–14", 13, 1.7),
];
const chain = (...ids: string[]): AtlasEdge[] => ids.slice(1).map((to, i) => ({ from: ids[i] ?? to, to }));
export const EDGES: AtlasEdge[] = [
  ...chain("t-input", "t-position", "t-self", "t-norm1", "t-ff", "t-norm2", "t-encoded"),
  ...chain("t-target", "t-target-position", "t-masked", "t-dnorm1", "t-cross", "t-dnorm2", "t-dff", "t-dnorm3", "t-linear", "t-softmax"),
  { from: "t-encoded", to: "t-cross", label: "K, V" },
  ...chain("d-input", "d-swa", "d-moe1", "d-full", "d-moe2", "d-reuse", "d-moe3", "d-encoded"),
  ...chain("d-dec-full", "d-dec-moe1", "d-dec-reuse1", "d-dec-moe2", "d-reindex", "d-dec-moe3", "d-dec-reuse2", "d-dec-moe4", "d-head"),
  { from: "d-vision", to: "d-input" },
  { from: "d-engram", to: "d-swa", label: "Encoder L2" },
  { from: "d-engram", to: "d-full", label: "Encoder L15" },
  { from: "d-encoded", to: "d-dec-full", label: "Hidden states" },
  { from: "d-encoded", to: "d-kv", label: "Project global KV" },
  { from: "d-kv", to: "d-dec-full" },
  { from: "d-kv", to: "d-reindex", label: "Shared global KV" },
  { from: "d-dec-full", to: "d-pool" },
  { from: "d-pool", to: "d-reindex" },
  { from: "d-head", to: "d-dspark", label: "Draft + verify" },
];
export const TOUR = [
  { node: "t-input", title: "Start with a sequence", text: "In 2017, the Transformer replaced recurrence with attention. A source sequence enters the encoder; a shifted target sequence enters the decoder." },
  { node: "t-self", title: "Let every word look around", text: "Eight heads let each source token gather information from the whole input. This encoder is bidirectional; the decoder's self-attention is causal." },
  { node: "t-cross", title: "Connect the two sequences", text: "Cross-attention bridges the original stacks. Decoder queries retrieve keys and values from the final source representation." },
  { node: "d-encoded", title: "Change where memory comes from", text: "DeepSeek makes both halves causal. Final encoder states feed the decoder and produce its shared global KV, separating much of input processing from output generation." },
  { node: "d-reindex", title: "Search, then reuse", text: "Full layers build KV and select entries. Reindex refreshes the sparse selection; Reuse shares it. Local sliding-window attention remains in every layer." },
  { node: "d-dec-moe1", title: "Activate a few experts", text: "Each token uses one shared expert and six of 384 routed experts. Conditional computation keeps activated parameters much smaller than the whole backbone." },
  { node: "d-dspark", title: "Look a few tokens ahead", text: "DSpark adds a separate drafting path for speculative decoding. You have reached the output. Return to the overview, or keep exploring any component." },
];
export function layerNode(stack: "encoder" | "decoder", layer: number): string {
  if (stack === "encoder") return layer <= 2 ? "d-swa" : (layer - 3) % 6 === 0 ? "d-full" : "d-reuse";
  return layer === 1 ? "d-dec-full" : (layer - 1) % 4 === 0 ? "d-reindex" : layer <= 4 ? "d-dec-reuse1" : "d-dec-reuse2";
}
export function layerMode(stack: "encoder" | "decoder", layer: number): string {
  const id = layerNode(stack, layer);
  return id === "d-swa" ? "SWA" : id.includes("full") ? "Full" : id === "d-reindex" ? "Reindex" : "Reuse";
}
