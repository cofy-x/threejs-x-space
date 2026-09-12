import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, realpath, rename, rm, stat } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const packageRoot = fileURLToPath(new URL("../", import.meta.url));
const defaultOutputDir = join(packageRoot, "papers");
const manifestPath = join(packageRoot, "docs", "papers.json");
const maxPdfBytes = 25 * 1024 * 1024;

function assertPaper(paper) {
  if (!paper || !/^[a-z][a-z0-9-]*$/.test(paper.id ?? "")) {
    throw new Error("Each paper needs a safe, nonempty id.");
  }
  if (typeof paper.filename !== "string" || basename(paper.filename) !== paper.filename || !/^[\w.-]+\.pdf$/.test(paper.filename)) {
    throw new Error(`${paper.id}: filename must be a plain PDF filename.`);
  }
  if (!/^[a-f0-9]{64}$/.test(paper.sha256 ?? "")) {
    throw new Error(`${paper.id}: expected SHA-256 is missing or invalid.`);
  }
  if (!Number.isSafeInteger(paper.bytes) || paper.bytes <= 0 || paper.bytes > maxPdfBytes) {
    throw new Error(`${paper.id}: expected byte size must be between 1 and ${maxPdfBytes}.`);
  }
  if (new URL(paper.downloadUrl).protocol !== "https:") {
    throw new Error(`${paper.id}: download URL must use HTTPS.`);
  }
}

export async function validatePdf(filePath, paper) {
  assertPaper(paper);
  const info = await stat(filePath);
  if (!info.isFile() || info.size === 0 || info.size > maxPdfBytes) {
    throw new Error(`${paper.id}: empty, oversized, or non-file PDF at ${filePath}.`);
  }
  const content = await readFile(filePath);
  if (content.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new Error(`${paper.id}: invalid PDF header; the response may be an HTML error page.`);
  }
  const actualHash = createHash("sha256").update(content).digest("hex");
  if (actualHash !== paper.sha256) {
    throw new Error(`${paper.id}: SHA-256 mismatch. Expected ${paper.sha256}; got ${actualHash}. The baseline was not changed.`);
  }
  if (content.byteLength !== paper.bytes) {
    throw new Error(`${paper.id}: byte size mismatch. Expected ${paper.bytes}; got ${content.byteLength}.`);
  }
}

function downloadWithCurl(url, destination, { signal } = {}) {
  return new Promise((accept, reject) => {
    const child = spawn("curl", [
      "--fail", "--location", "--silent", "--show-error",
      "--proto", "=https", "--proto-redir", "=https",
      "--retry", "2", "--connect-timeout", "15", "--max-time", "120",
      "--max-filesize", String(maxPdfBytes),
      "--output", destination, url,
    ], { stdio: ["ignore", "ignore", "pipe"], signal });
    let diagnostic = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => { diagnostic = (diagnostic + chunk).slice(-4000); });
    child.once("error", (error) => {
      reject(error.code === "ENOENT" ? new Error("curl is required to download papers. Install curl and retry.") : error);
    });
    child.once("close", (code, terminationSignal) => {
      if (code === 0) accept();
      else reject(new Error(`Download failed (${terminationSignal ?? `curl exit ${code}`}): ${diagnostic.trim()}`));
    });
  });
}

export async function downloadPaper(paper, {
  outputDir = defaultOutputDir,
  checkOnly = false,
  force = false,
  transfer = downloadWithCurl,
  signal,
} = {}) {
  assertPaper(paper);
  if (checkOnly && force) throw new Error("--check and --force cannot be combined.");
  const destination = join(outputDir, paper.filename);
  if (!force) {
    try {
      await validatePdf(destination, paper);
      return { status: checkOnly ? "verified" : "cached", path: destination };
    } catch (error) {
      if (checkOnly) throw error;
      // Missing or invalid cached content is replaced only after verification.
    }
  }
  signal?.throwIfAborted();
  await mkdir(outputDir, { recursive: true });
  const temporaryDir = await mkdtemp(join(outputDir, `.download-${paper.id}-`));
  const temporaryFile = join(temporaryDir, paper.filename);
  try {
    await transfer(paper.downloadUrl, temporaryFile, { signal });
    signal?.throwIfAborted();
    await validatePdf(temporaryFile, paper);
    signal?.throwIfAborted();
    await rename(temporaryFile, destination);
    return { status: "downloaded", path: destination };
  } finally {
    await rm(temporaryDir, { recursive: true, force: true });
  }
}

async function main() {
  const { values } = parseArgs({
    options: {
      help: { type: "boolean", short: "h" },
      check: { type: "boolean" },
      force: { type: "boolean" },
      paper: { type: "string" },
    },
    allowPositionals: false,
    strict: true,
  });
  if (values.help) {
    console.log(`Download the pinned Attention Atlas research PDFs.

Usage: node scripts/download-papers.mjs [--paper transformer|deepseek] [--check | --force]

  --paper ID  Select one paper; default: both.
  --check     Verify local PDFs without downloading or writing files.
  --force     Fetch again; PDF and SHA-256 verification still apply.
  --help      Show this help.

Output: ${defaultOutputDir}
Requirements: Node.js 20+ and curl. The papers/ directory is ignored by Git.
Downloads follow curl's standard environment-based proxy configuration.`);
    return;
  }
  if (values.check && values.force) throw new Error("--check and --force cannot be combined.");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.papers) || manifest.papers.length === 0) {
    throw new Error("Unsupported or empty paper manifest.");
  }
  manifest.papers.forEach(assertPaper);
  if (new Set(manifest.papers.map((paper) => paper.id)).size !== manifest.papers.length ||
      new Set(manifest.papers.map((paper) => paper.filename)).size !== manifest.papers.length) {
    throw new Error("Paper ids and filenames must be unique.");
  }
  const selected = values.paper === undefined ? manifest.papers : manifest.papers.filter((paper) => paper.id === values.paper);
  if (selected.length === 0) {
    throw new Error(`Unknown paper '${values.paper}'. Choose: ${manifest.papers.map((paper) => paper.id).join(", ")}.`);
  }
  const controller = new AbortController();
  const interrupt = () => controller.abort();
  process.once("SIGINT", interrupt);
  process.once("SIGTERM", interrupt);
  try {
    for (const paper of selected) {
      try {
        const result = await downloadPaper(paper, { checkOnly: values.check, force: values.force, signal: controller.signal });
        console.log(`${result.status}: ${paper.title}\n  ${result.path}`);
      } catch (error) {
        console.error(`${paper.id}: ${error.message}`);
        process.exitCode = controller.signal.aborted ? 130 : 1;
        if (controller.signal.aborted) break;
      }
    }
  } finally {
    process.removeListener("SIGINT", interrupt);
    process.removeListener("SIGTERM", interrupt);
  }
}

const invokedPath = process.argv[1] ? await realpath(resolve(process.argv[1])).catch(() => null) : null;
if (invokedPath === await realpath(fileURLToPath(import.meta.url))) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
