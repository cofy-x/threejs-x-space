# Recreating Attention Atlas

The experience keeps its reusable brief and download metadata here. Downloaded papers live separately in the package-local `papers/` directory, which is ignored by Git and is not bundled into the website.

## Documentation

- [Recreation prompt](recreation-prompt.md): a complete, copyable implementation brief for the final overview, module internals, animation controls, mobile behavior, and acceptance checks.
- [Architecture and animation research](../RESEARCH.md): verified dimensions, exact layer schedules, source sections, and scientific constraints.
- [Paper manifest](papers.json): official download URLs, pinned revisions, expected byte sizes, and SHA-256 checksums.
- [Experience guide](../README.md): controls, local development, and production-base-path preview.

## Download the papers

Requirements: Node.js 20 or newer and `curl`. No Python environment, API key, model weights, or additional npm dependency is needed. From the repository root:

```sh
pnpm --filter @threejs-x-space/experience-attention-atlas papers:download
```

The downloader saves these two files:

| Paper ID | Local path, relative to the experience package | Source |
| --- | --- | --- |
| `transformer` | `papers/Attention_Is_All_You_Need.pdf` | [Attention Is All You Need, revision 7](https://arxiv.org/pdf/1706.03762v7) |
| `deepseek` | `papers/DeepSeek_V41_Tech_Report.pdf` | [Official DeepSeek-V4.1-Flash repository](https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash) |

The manifest pins the arXiv revision and the Hugging Face repository revision used for the research baseline. September 12, 2026 is the verification date, not the publication date. The SHA-256 values identify the actual bytes used during research.

Download only one paper:

```sh
pnpm --filter @threejs-x-space/experience-attention-atlas papers:download --paper transformer
pnpm --filter @threejs-x-space/experience-attention-atlas papers:download --paper deepseek
```

Verify the local copies without network access or file writes:

```sh
pnpm --filter @threejs-x-space/experience-attention-atlas papers:check
```

Fetch a fresh copy even when the cached PDF is valid:

```sh
pnpm --filter @threejs-x-space/experience-attention-atlas papers:download --paper deepseek --force
```

To use the helper without installing workspace dependencies, run it directly from the repository root:

```sh
node packages/experience-attention-atlas/scripts/download-papers.mjs --help
node packages/experience-attention-atlas/scripts/download-papers.mjs
```

The script resolves the manifest and output directory from its own location. Invoking it using an absolute script path from another working directory still writes to this package's `papers/` directory.

## Download and cache behavior

- A normal rerun verifies existing files and skips network transfers for matching copies. A missing or invalid cached file is downloaded again.
- The downloader follows HTTPS redirects, handles HTTP failures, and uses bounded retries and timeouts. It honors `curl`'s standard environment-based proxy configuration without saving proxy settings.
- PDF headers, exact file sizes, and SHA-256 checksums must match. HTML error responses, truncated content, and changed PDFs are rejected. `--force` never bypasses validation.
- Downloads use unique temporary directories inside `papers/`. A verified file replaces its destination through a same-filesystem rename. A failed transfer or validation preserves any existing destination and cleans up that invocation's temporary files.
- `--check` reports missing or invalid files with a nonzero exit status and does not create the output directory. `--check` and `--force` cannot be combined. An unknown paper ID or malformed option fails before downloading.
- If a source changes, inspect the replacement and its architecture before intentionally updating `papers.json` and the research notes. The script never updates the baseline automatically.

The package's `.gitignore` ignores the entire `papers/` directory, including temporary downloads and any local extraction files placed there. The manifest, documentation, script, and tests remain tracked source. The PDFs remain local research copies; the site links to the original publishers instead of redistributing them.

Confirm the ignore rules from the repository root:

```sh
git check-ignore packages/experience-attention-atlas/papers/Attention_Is_All_You_Need.pdf
git check-ignore packages/experience-attention-atlas/papers/DeepSeek_V41_Tech_Report.pdf
```

## Verify the helper

```sh
pnpm --filter @threejs-x-space/experience-attention-atlas test:papers
pnpm --filter @threejs-x-space/experience-attention-atlas papers:check
```

The tests use temporary synthetic PDF fixtures and injected transfers, with no internet dependency. They exercise cache reuse, offline checks, invalid content, checksum failures, atomic replacement, and command-line validation. The second command checks the actual research downloads against the committed manifest.
