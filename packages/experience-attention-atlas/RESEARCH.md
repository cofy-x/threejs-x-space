# Attention Atlas research notes

The scene compares the original Transformer **base** architecture with the released DeepSeek-V4.1-Flash architecture. It is an educational schematic: geometry, particle density, animation speed, and spacing do not represent measured tensor sizes, attention weights, or inference performance.

## Primary sources

Research checked on September 12, 2026. Page numbers below are the printed PDF page numbers.

- **T**: Ashish Vaswani et al., *Attention Is All You Need*, 2017. [Paper record](https://arxiv.org/abs/1706.03762), [PDF, revision 7](https://arxiv.org/pdf/1706.03762v7). Architecture: Figure 1 and Section 3, pages 3-6. This later PDF revision retains the original architecture.
- **D**: DeepSeek-AI, *DeepSeek-V4.1-Flash: Pushing the Limits of KV Cache Compression*, 2026. [Official technical report](https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash/resolve/main/DeepSeek_V41_Tech_Report.pdf), [official model card](https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash). Architecture: Figures 3-5, Sections 2 and 4.2.1, pages 7-14 and 21-22.

Both PDFs were downloaded and their architecture pages inspected during development. The [paper-download guide](docs/README.md) and [pinned manifest](docs/papers.json) reproduce those local copies in the Git-ignored `papers/` directory. They are research references, not bundled assets. Scene geometry and explanations are authored for this experience; no paper figure or reference-site asset is redistributed.

## Original Transformer

| Element | Verified configuration | Source |
| --- | --- | --- |
| Input embedding | Learned token vectors; model width 512 | T, Sections 3.1 and 3.4, pages 3 and 5 |
| Position | Sine/cosine positional encoding added to embeddings at the bottom of both stacks | T, Section 3.5, page 6 |
| Encoder | Six layers; each has self-attention followed by a dense feed-forward sublayer | T, Figure 1 and Section 3.1, page 3 |
| Encoder self-attention | Every input position may attend to every input position; not causal | T, Section 3.2.3, page 5 |
| Decoder input | Previous output tokens, shifted right | T, Figure 1 and Section 3.1, page 3 |
| Decoder | Six layers; masked self-attention, encoder-decoder attention, then feed-forward | T, Figure 1 and Section 3.1, page 3 |
| Masked attention | Blocks attention to subsequent output positions | T, Sections 3.1 and 3.2.3, pages 3 and 5 |
| Cross-attention | Decoder supplies queries; final encoder output supplies keys and values | T, Section 3.2.3, page 5 |
| Attention heads | Eight heads, each with 64-dimensional keys and values | T, Section 3.2.2, page 5 |
| Feed-forward | Two linear transformations with ReLU; width 512 to 2048 to 512 | T, Section 3.3, page 5 |
| Add & Norm | Residual addition followed by LayerNorm after each sublayer | T, Section 3.1, page 3 |
| Output | Linear projection and softmax produce next-token probabilities | T, Section 3.4, page 5 |

The six encoder layers and six decoder layers are separate repeated stacks. The diagram must preserve the encoder-output connection to decoder cross-attention. A feed-forward block is position-wise, not an attention operation. The paper describes base and larger variants; the eight-head/512-width configuration here is explicitly the base model.

## DeepSeek-V4.1-Flash

### Causal encoder-decoder

The backbone contains 40 **causal** layers, divided into 20 encoder layers and 20 decoder layers. It processes interleaved image and text embeddings and emits text autoregressively. Reported parameter counts are 552B backbone parameters plus 196B Engram parameters; activated backbone parameters per token are 8B in prefill and 16B in decode. These categories should remain explicit. [D, Section 2.1, pages 7-8; Section 4.2.1, pages 21-22.](https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash/resolve/main/DeepSeek_V41_Tech_Report.pdf#page=7)

CED obtains decoder **global** KV by projection from the final encoder hidden states. Decoder queries and sliding-window KV still depend on their own layer states. During prefill, most prompt tokens need only the encoder computation plus the decoder-global-KV projection. The decoder still processes the prompt's final 128 tokens to reconstruct its local SWA state. Every new generated token traverses both halves. Bounded replay is an approximation, not mathematically identical to a complete prompt pass. [D, Section 2.2, page 9; Section 3.2.2, page 20.](https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash/resolve/main/DeepSeek_V41_Tech_Report.pdf#page=9)

### Exact attention schedule

Layer numbers in this document are **one-based within each 20-layer stack**. Every listed layer also has a DeepSeekMoE feed-forward sublayer. All CSA2 layers include their own sliding-window attention with a 128-token window. Only the first two encoder layers lack the global branch. [D, Figure 3, page 7; Section 4.2.1, pages 21-22.](https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash/resolve/main/DeepSeek_V41_Tech_Report.pdf#page=22)

| Stack | Layers | Attention | Global compression |
| --- | --- | --- | --- |
| Encoder | 1-2 | SWA only | No global KV |
| Encoder | 3, 9, 15 | CSA2 Full | 2 source positions per main KV entry |
| Encoder | 4-8, 10-14, 16-20 | CSA2 Reuse | Shares preceding Full layer's compressed KV |
| Decoder | 1 | CSA2 Full | Ratio 1: no sequence compression |
| Decoder | 5, 9, 13, 17 | CSA2 Reindex | Shares decoder layer 1 global KV |
| Decoder | 2-4, 6-8, 10-12, 14-16, 18-20 | CSA2 Reuse | Shares decoder layer 1 global KV and latest indices |

Equivalent grouped notation:

```text
Encoder: SWA x2 + [Full + Reuse x5] x3 = 20 layers
Decoder: [Full + Reuse x3] + [Reindex + Reuse x3] x4 = 20 layers
```

The compression ratio is fixed by the architecture. A context-length control must not change a layer from Full to Reindex or Reuse, nor change its compression ratio.

### CSA2 modes and hierarchical indexing

| Mode | Global main KV / indexer K | Sparse selection | Layer-local work |
| --- | --- | --- | --- |
| Full | Creates main KV and projects indexer K | Computes indexer Q and fresh Top-512 indices | Main Q, SWA KV, attention output |
| Reindex | Reuses the latest Full layer's KV and indexer K | Computes a new indexer Q and fresh Top-512 indices | Main Q, SWA KV, attention output |
| Reuse | Reuses the latest Full layer's KV and indexer K | Reuses the latest Full/Reindex layer's indices; no new indexing | Main Q, SWA KV, attention output |

Full means the complete **CSA2 computation path**, not dense all-to-all attention. Main queries attend to selected global entries together with the local SWA entries. In the decoder, Full mode's new global KV comes from final encoder states. Reuse preserves computation of new attention outputs; it does not copy a preceding layer's output. [D, Figure 4 and Section 2.3.1, pages 10-11.](https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash/resolve/main/DeepSeek_V41_Tech_Report.pdf#page=10)

The decoder's first Full layer scores the causally visible range. It selects Top-512 entries for its own attention and also constructs a larger candidate pool. The pool contains at most 2,048 blocks of 8 positions, or 16,384 positions. Subsequent Reindex layers choose their own Top-512 entries **within that pool**. The pool is a search domain, not the final attention selection; it is also query-specific. The first full-range indexer pass remains necessary. [D, Figure 5 and Section 2.3.2, pages 11-12; Section 4.2.1, page 22.](https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash/resolve/main/DeepSeek_V41_Tech_Report.pdf#page=11)

### Other inspectable components

| Component | Configuration and role | Source |
| --- | --- | --- |
| MoE | One shared expert plus 384 routed experts; six routed experts selected per token; SwiGLU; expert intermediate width 2304 | D, Section 4.2.1, page 22 |
| Engram | Two conditional-memory modules, 98B parameters each, at encoder layers **2 and 15**; the paper calls these zero-indexed layers 1 and 14 | D, Section 2.4.2, page 13 |
| Engram lookup | Token N-grams of orders 2, 3, 4; eight hash heads per order; context-aware gating; short causal convolution omitted | D, Section 2.4.2, page 13 |
| Vision path | DeepSeek-ViT, 3 x 3 pixel-unshuffle, two-layer MLP projector, visual embeddings inserted into the language input sequence | D, Section 2.1.1, page 8; Section 4.2.1, page 22 |
| Vision encoder | 32 layers, width 1024, 16 heads, patch size 14; 2D-RoPE | D, Sections 2.1.1 and 4.2.1, pages 8 and 22 |
| Single-Pass mHC | Four residual streams; a block consumes input-mixing coefficients generated by its predecessor | D, Section 2.4.1, pages 12-13; Section 4.2.1, page 22 |
| DSpark | Three drafter Transformer blocks, SWA window 128; five parallel draft positions, Markov head and confidence-scheduled verification | D, Section 2.4.3, pages 13-14 |
| Main KV cache | FP4 main KV; indexer Q/K use MXFP4; SWA KV remains FP8 | D, Section 2.4.4, page 14 |
| Context | Up to one million tokens | D, abstract and Section 2.1, pages 1 and 7 |

DSpark is an auxiliary speculative-decoding component trained after backbone pre-training. It must not be counted among the 40 backbone layers or shown as five guaranteed accepted output tokens. Engram is conditional memory, not another MoE group. The two modules attach to specific encoder layers; a grouped overview may summarize them as `Engram x2` only if its inspector identifies both locations.

## Visual and numerical interpretation

- Distinguish the original bidirectional source encoder from DeepSeek's causal encoder. Their similar column layout does not imply identical encoder semantics.
- Label DeepSeek connections as shared **global KV**. Every layer keeps separate local SWA KV and computes its own queries.
- Preserve the decoder input connection from final encoder hidden states as well as the global-KV projection. A lone cache-sharing arrow cannot represent the complete CED data flow.
- Show MoE beside every attention layer/group. A representative grid can depict one shared plus six selected experts while labeling the full 384 routed-expert population.
- Use grouped repetition counts explicitly. Decorative repeated outlines and representative neurons are not a literal parameter or layer census.
- A context-length slider controls an illustrative workload. The original paper does not establish a 4K maximum context limit, and this experience does not demonstrate one-million-token inference.
- The report's 890 bytes/token is **global KV cache footprint**, excluding local SWA cache, model weights, and other runtime allocations. An estimate of `context tokens x 890 bytes` must retain that scope.
- The reported fourfold global-cache reduction and eightfold persistent-cache reduction compare with **DeepSeek-V4-Flash**, not the 2017 Transformer. Do not present these as benchmark results of the two models in this scene.
- Animation depicts conceptual information flow. It does not execute either model or show real attention scores, learned weights, generated text, or latency measurements.

These constraints apply to the supplied visual reference as well as future design changes. Its layout is useful inspiration, while the papers remain the authority for topology and terminology.

## Component-level animation reference

### Exact attention dimensions

| Quantity | Original Transformer base | DeepSeek-V4.1-Flash |
| --- | --- | --- |
| Backbone hidden width | 512 | 5120 |
| Main attention query heads | 8 | 64 |
| Main attention head dimension | 64 | 512 |
| Compressed query dimension | Not part of this architecture | 1280 |
| Sparse indexer query heads | No sparse indexer | 32 |
| Sparse indexer head dimension | No sparse indexer | 128 |
| Main KV latent dimension | Separate projected K and V per head | 512 |
| Output projection groups | Concatenate 8 heads, then output projection | 8 groups, intermediate output dimension 1024 per group |
| Local attention window | No fixed sliding window in the base architecture | 128 positions |
| Global attention selection | All allowed key positions | Up to 512 eligible global KV entries |

Sources: T, Sections 3.1-3.2, pages 3-5; D, Section 4.2.1, pages 21-22. The 512-channel main KV latent is also explicit in D, Section 2.4.4, page 14. DeepSeek's 64 query heads must not be represented as 64 independent full-size global KV caches. Indexer heads are a separate mechanism from the main attention heads.

For a short prefix, an illustration cannot select more real entries than are causally available. Showing `min(512, eligible entries)` is a set-size interpretation of Top-K, not a newly reported model hyperparameter. Encoder compression can make the number of eligible global entries smaller than the number of source tokens. SWA includes the current position and at most 127 previous positions; fewer are available at the beginning of a sequence. The local window and sparse global selection are distinct inputs to core attention, not a single universal 512-token context window.

### Semantic animation steps

These steps specify computation order for explanatory animations. Example token values, scores, expert choices, gates, and accept/reject outcomes must be identified as illustrative, because the experience does not load model weights.

| Family | Visualizable sequence | Important distinction |
| --- | --- | --- |
| Original attention | Learned Q/K/V projections; eight parallel heads; score matrix `QK^T / sqrt(64)`; apply any causal mask; row-wise softmax; weighted sum of V; concatenate heads; output projection | Encoder self-attention uses all source positions. Decoder self-attention has a lower-triangular allowed region including the diagonal. Cross-attention has target-query rows and source-key columns and can be rectangular. |
| Original Add & Norm | Carry an input bypass; add the sublayer output; center and scale each token's feature vector; apply learned per-feature gain and bias | Normalization acts over features for one token, not over the sequence. Learned affine parameters mean the final output need not have zero mean or unit variance. |
| Original feed-forward | Linear expansion 512 to 2048; ReLU; linear projection to 512 | All tokens use the dense network. ReLU can zero individual activations; this does not make it an expert router. |
| CSA2 Full | Create main KV; project indexer K; compute indexer Q; score and choose sparse indices; gather selected global KV; concatenate with local SWA KV; compute attention with current main Q | The decoder creates global KV from final encoder states. Full denotes the full sparse-attention pipeline, not dense main attention. |
| CSA2 Reindex | Load shared main KV and indexer K; compute new indexer Q and selection; gather selected entries; combine with local SWA; compute new attention output | In the decoder, indexing searches the shared candidate pool. Query-dependent selection can change while KV storage is shared. |
| CSA2 Reuse | Load shared main KV and the latest indices; gather the already-selected entries; combine with current local SWA KV; use fresh main Q to compute a new attention output | Do not animate a new indexer Q, new indexing, or copied attention weights. Only KV and indices are reused. |
| Local SWA | Move a causal 128-position window; produce local KV; score with current queries; combine values | Every CSA2 layer retains this local path. Local KV is FP8, not FP4. |
| Candidate pool | First decoder Full indexer scores visible positions; emit its own Top-512 set; score blocks by their highest position score; retain up to 2048 blocks of 8; later Reindex queries choose their own Top-512 within the pool | The shared pool is query-specific. It is a search domain, not the set of values every layer must attend to. |
| MoE | Score routed experts; select six of 384; run selected expert computations and the shared expert; combine their outputs | The shared expert is additional to the six routed experts and remains active. Each expert uses SwiGLU with intermediate width 2304; the report specifies clamping threshold 10 but does not detail its placement. |
| Engram | Canonicalize token IDs; form suffix N-grams of orders 2, 3, 4; hash through eight heads per order; fetch indexed rows; concatenate embeddings; project keys and values; use current hidden states for context gates; merge gated values into residual streams | Lookup addresses depend on tokens, while gate strength depends on the hidden state. No sequential search or short causal convolution should be shown for V4.1. |
| Single-Pass mHC | Mix four streams with the preceding block's input coefficients; pass the mixed input through the block; distribute its output and combine residual streams; produce coefficients for the next block | Four streams are not four copies of the network. Coefficient prediction and residual mixing are not token-attention operations. |
| DSpark | Process three auxiliary drafter blocks; form base logits for five positions in parallel; model draft dependencies with a Markov head; estimate conditional acceptance and prefix survival; select a verification prefix length; verify drafts with the backbone | Five draft positions do not imply five accepted tokens. Confidence scheduling and actual verification are separate stages. |

Sources: T, Figure 2 and Sections 3.1-3.4, pages 3-5; D, Figures 4-5 and Sections 2.3-2.4, pages 10-14; D, Section 4.2.1, page 22.

The Single-Pass mHC update is `X_(l+1) = B_l X_l + C_l F_l(A_(l-1) X_l)`, with coefficients `(A_l, B_l, C_l)` predicted from `X_l`. With four streams, A has shape 1 x 4, B has shape 4 x 4, and C has shape 4 x 1. The shifted A is the mechanism that removes the need to wait for input-mixing coefficients computed from the current streams. [D, Section 2.4.1, Equation 6, page 13.](https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash/resolve/main/DeepSeek_V41_Tech_Report.pdf#page=13)

Engram uses approximately 16M entries per hash-head table, with distinct prime table sizes, and 2048 total embedding dimensions per N-gram order. The two V4.1 modules each have 98B parameters. Its main report states that tokenizer compression, hashing, contextual gating, and multi-branch integration follow the original Engram design. The original mechanism projects retrieved memory to K/V and computes a sigmoid gate from normalized hidden-state/key compatibility; multi-branch integration shares the retrieved memory and value projection while using branch-specific keys and gates. V4.1 explicitly removes the original short convolution. [D, Section 2.4.2, page 13.](https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash/resolve/main/DeepSeek_V41_Tech_Report.pdf#page=13) [Original Engram architecture, Sections 2.2-2.4.](https://arxiv.org/html/2601.07372v1#S2)

For the Add & Norm explanation, the original Transformer specifies the post-norm placement; the normalization mechanism itself is described by Ba, Kiros, and Hinton in [Layer Normalization, Section 3](https://arxiv.org/html/1607.06450v1#S3). DeepSeek's mHC animation should retain the reported input pre-normalization; mHC is a residual-stream design and should not be described as an identical replacement for the original LayerNorm operation.
