import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { access, appendFile, copyFile, mkdir, mkdtemp, readFile, readdir, rm, stat, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, sep } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { downloadPaper, validatePdf } from "./download-papers.mjs";

const runFile = promisify(execFile);
const scriptPath = fileURLToPath(new URL("./download-papers.mjs", import.meta.url));
const oldTimestamp = new Date("2001-01-01T00:00:00.000Z");

function fixture(id = "transformer") {
  const data = Buffer.from(`%PDF-1.7\nAttention Atlas ${id} download test fixture.\n%%EOF\n`);
  return {
    data,
    paper: {
      id,
      title: `${id} test paper`,
      filename: `${id}.pdf`,
      downloadUrl: `https://papers.example.invalid/${id}.pdf`,
      sha256: createHash("sha256").update(data).digest("hex"),
      bytes: data.length,
    },
  };
}

async function workspace(t) {
  const directory = await mkdtemp(join(tmpdir(), "attention-atlas-papers-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return { directory, outputDir: join(directory, "papers") };
}

async function cliWorkspace(t) {
  const { directory } = await workspace(t);
  const packageDir = join(directory, "fixture-package");
  const cwd = join(directory, "unrelated-working-directory");
  const cliPath = join(packageDir, "scripts", "download-papers.mjs");
  const docsDir = join(packageDir, "docs");
  const fixtures = [fixture("transformer"), fixture("deepseek")];
  await Promise.all([mkdir(dirname(cliPath), { recursive: true }), mkdir(docsDir, { recursive: true }), mkdir(cwd)]);
  await copyFile(scriptPath, cliPath);
  await writeFile(join(docsDir, "papers.json"), JSON.stringify({ schemaVersion: 1, papers: fixtures.map(({ paper }) => paper) }));
  return { cwd, cliPath, fixtures, outputDir: join(packageDir, "papers") };
}

async function cachedFile(outputDir, paper, data) {
  await mkdir(outputDir, { recursive: true });
  const path = join(outputDir, paper.filename);
  await writeFile(path, data);
  await utimes(path, oldTimestamp, oldTimestamp);
  return { path, mtimeMs: (await stat(path)).mtimeMs };
}

async function absent(path) {
  await assert.rejects(access(path), { code: "ENOENT" });
}

async function temporaryDestination(outputDir, paper, destination) {
  assert.notEqual(destination, join(outputDir, paper.filename));
  const path = relative(outputDir, destination);
  assert.ok(path && path !== ".." && !path.startsWith(`..${sep}`) && !isAbsolute(path),
    "temporary content must stay within the output directory");
  assert.equal((await stat(dirname(destination))).dev, (await stat(outputDir)).dev,
    "temporary content must share the destination filesystem for an atomic rename");
}

function tamperedPdf(data) {
  const altered = Buffer.from(data);
  altered[12] = altered[12] ^ 1;
  return altered;
}

test("validatePdf accepts the expected PDF and distinguishes header, size, and hash failures", async (t) => {
  const { directory } = await workspace(t);
  const { paper, data } = fixture();
  const path = join(directory, paper.filename);

  await writeFile(path, data);
  await assert.doesNotReject(validatePdf(path, paper));

  const html = Buffer.alloc(data.length, " ");
  html.write("<html>upstream error</html>");
  await writeFile(path, html);
  await assert.rejects(validatePdf(path, paper), /header|invalid[^\n]*pdf|not[^\n]*pdf/i);

  await writeFile(path, data);
  await assert.rejects(validatePdf(path, { ...paper, bytes: data.length + 1 }), /size|bytes|length/i);

  await writeFile(path, tamperedPdf(data));
  await assert.rejects(validatePdf(path, paper), /sha-?256|checksum|hash/i);
});

test("a valid cache skips transfer and preserves its modification time", async (t) => {
  const { outputDir } = await workspace(t);
  const { paper, data } = fixture();
  const before = await cachedFile(outputDir, paper, data);
  let transfers = 0;

  const result = await downloadPaper(paper, {
    outputDir,
    transfer: async () => { transfers++; throw new Error("unexpected transfer"); },
  });

  assert.equal(result.status, "cached");
  assert.equal(result.path, before.path);
  assert.equal(transfers, 0);
  assert.equal((await stat(before.path)).mtimeMs, before.mtimeMs);
  assert.deepEqual(await readFile(before.path), data);
  assert.deepEqual(await readdir(outputDir), [paper.filename]);
});

test("checkOnly verifies a cached PDF without transfer or mutation", async (t) => {
  const { outputDir } = await workspace(t);
  const { paper, data } = fixture();
  const before = await cachedFile(outputDir, paper, data);
  let transfers = 0;

  const result = await downloadPaper(paper, {
    outputDir,
    checkOnly: true,
    transfer: async () => { transfers++; throw new Error("check must stay offline"); },
  });

  assert.equal(result.status, "verified");
  assert.equal(result.path, before.path);
  assert.equal(transfers, 0);
  assert.equal((await stat(before.path)).mtimeMs, before.mtimeMs);
  assert.deepEqual(await readdir(outputDir), [paper.filename]);
});

test("checkOnly fails for a missing PDF without creating its directory or transferring", async (t) => {
  const { directory, outputDir } = await workspace(t);
  const { paper } = fixture();
  let transfers = 0;

  await assert.rejects(downloadPaper(paper, {
    outputDir,
    checkOnly: true,
    transfer: async () => { transfers++; throw new Error("check must stay offline"); },
  }), /missing|not found|no such|ENOENT/i);

  assert.equal(transfers, 0);
  await absent(outputDir);
  assert.deepEqual(await readdir(directory), []);
});

test("checkOnly rejects a corrupt cache without repairing or changing it", async (t) => {
  const { outputDir } = await workspace(t);
  const { paper, data } = fixture();
  const corrupted = tamperedPdf(data);
  const before = await cachedFile(outputDir, paper, corrupted);
  let transfers = 0;

  await assert.rejects(downloadPaper(paper, {
    outputDir,
    checkOnly: true,
    transfer: async () => { transfers++; throw new Error("check must not repair"); },
  }), /sha-?256|checksum|hash/i);

  assert.equal(transfers, 0);
  assert.deepEqual(await readFile(before.path), corrupted);
  assert.equal((await stat(before.path)).mtimeMs, before.mtimeMs);
  assert.deepEqual(await readdir(outputDir), [paper.filename]);
});

test("the default mode replaces an invalid cache with a validated download", async (t) => {
  const { outputDir } = await workspace(t);
  const { paper, data } = fixture();
  const before = await cachedFile(outputDir, paper, Buffer.from("not a PDF"));
  let transfers = 0;

  const result = await downloadPaper(paper, {
    outputDir,
    transfer: async (url, destination) => {
      transfers++;
      assert.equal(url, paper.downloadUrl);
      await temporaryDestination(outputDir, paper, destination);
      await writeFile(destination, data);
    },
  });

  assert.equal(transfers, 1);
  assert.equal(result.status, "downloaded");
  assert.equal(result.path, before.path);
  assert.deepEqual(await readFile(before.path), data);
  await assert.doesNotReject(validatePdf(before.path, paper));
  assert.deepEqual(await readdir(outputDir), [paper.filename]);
});

test("an HTML response is rejected without installing a PDF or leaving temporary files", async (t) => {
  const { outputDir } = await workspace(t);
  const { paper, data } = fixture();
  const html = Buffer.alloc(data.length, " ");
  html.write("<html>service unavailable</html>");

  await assert.rejects(downloadPaper(paper, {
    outputDir,
    transfer: async (_url, destination) => { await writeFile(destination, html); },
  }), /header|invalid[^\n]*pdf|not[^\n]*pdf/i);

  await absent(join(outputDir, paper.filename));
  assert.deepEqual(await readdir(outputDir), []);
});

test("a PDF with the right header and size but wrong hash is rejected and cleaned up", async (t) => {
  const { outputDir } = await workspace(t);
  const { paper, data } = fixture();

  await assert.rejects(downloadPaper(paper, {
    outputDir,
    transfer: async (_url, destination) => { await writeFile(destination, tamperedPdf(data)); },
  }), /sha-?256|checksum|hash/i);

  await absent(join(outputDir, paper.filename));
  assert.deepEqual(await readdir(outputDir), []);
});

test("a failed forced transfer preserves the existing validated PDF", async (t) => {
  const { outputDir } = await workspace(t);
  const { paper, data } = fixture();
  const before = await cachedFile(outputDir, paper, data);

  await assert.rejects(downloadPaper(paper, {
    outputDir,
    force: true,
    transfer: async (_url, destination) => {
      assert.notEqual(destination, before.path);
      await writeFile(destination, data.subarray(0, 12));
      assert.deepEqual(await readFile(before.path), data);
      throw new Error("fixture transfer interrupted");
    },
  }), /fixture transfer interrupted/);

  assert.deepEqual(await readFile(before.path), data);
  assert.equal((await stat(before.path)).mtimeMs, before.mtimeMs);
  assert.deepEqual(await readdir(outputDir), [paper.filename]);
});

test("force never bypasses validation or replaces valid cache with a mismatched PDF", async (t) => {
  const { outputDir } = await workspace(t);
  const { paper, data } = fixture();
  const before = await cachedFile(outputDir, paper, data);
  let transfers = 0;

  await assert.rejects(downloadPaper(paper, {
    outputDir,
    force: true,
    transfer: async (_url, destination) => {
      transfers++;
      await writeFile(destination, tamperedPdf(data));
    },
  }), /sha-?256|checksum|hash/i);

  assert.equal(transfers, 1);
  assert.deepEqual(await readFile(before.path), data);
  assert.equal((await stat(before.path)).mtimeMs, before.mtimeMs);
  assert.deepEqual(await readdir(outputDir), [paper.filename]);
});

test("a successful forced refresh keeps the old PDF visible until the new PDF is complete", async (t) => {
  const { outputDir } = await workspace(t);
  const { paper, data } = fixture();
  const before = await cachedFile(outputDir, paper, data);
  let transfers = 0;

  const result = await downloadPaper(paper, {
    outputDir,
    force: true,
    transfer: async (_url, destination) => {
      transfers++;
      await temporaryDestination(outputDir, paper, destination);
      const split = Math.floor(data.length / 2);
      await writeFile(destination, data.subarray(0, split));
      assert.deepEqual(await readFile(before.path), data);
      assert.equal((await stat(before.path)).mtimeMs, before.mtimeMs);
      await appendFile(destination, data.subarray(split));
    },
  });

  assert.equal(transfers, 1);
  assert.equal(result.status, "downloaded");
  assert.equal(result.path, before.path);
  assert.deepEqual(await readFile(before.path), data);
  assert.notEqual((await stat(before.path)).mtimeMs, before.mtimeMs);
  assert.deepEqual(await readdir(outputDir), [paper.filename]);
});

test("parallel paper downloads use separate temporary files and leave only validated PDFs", async (t) => {
  const { outputDir } = await workspace(t);
  const fixtures = [fixture("transformer"), fixture("deepseek")];
  const destinations = new Set();
  let release;
  const bothStarted = new Promise((resolve) => { release = resolve; });
  let started = 0;
  const transfer = async (url, destination) => {
    const item = fixtures.find(({ paper }) => paper.downloadUrl === url);
    assert.ok(item, "transfer URL must belong to the requested fixtures");
    await temporaryDestination(outputDir, item.paper, destination);
    destinations.add(destination);
    await writeFile(destination, item.data);
    started++;
    if (started === fixtures.length) release();
    await bothStarted;
  };

  const results = await Promise.all(fixtures.map(({ paper }) => downloadPaper(paper, { outputDir, transfer })));

  assert.equal(destinations.size, fixtures.length);
  assert.ok(results.every((result) => result.status === "downloaded"));
  assert.deepEqual((await readdir(outputDir)).sort(), fixtures.map(({ paper }) => paper.filename).sort());
  for (const { paper, data } of fixtures) {
    assert.deepEqual(await readFile(join(outputDir, paper.filename)), data);
    await assert.doesNotReject(validatePdf(join(outputDir, paper.filename), paper));
  }
});

test("CLI help works from an unrelated cwd and creates no files there", async (t) => {
  const { cwd, cliPath, outputDir } = await cliWorkspace(t);
  const result = await runFile(process.execPath, [cliPath, "--help"], { cwd, timeout: 5000 });

  assert.match(result.stdout, /usage|download.*papers/i);
  assert.match(result.stdout, /--check/);
  assert.match(result.stdout, /--force/);
  assert.match(result.stdout, /transformer/);
  assert.match(result.stdout, /deepseek/);
  assert.ok(result.stdout.includes(outputDir), "help resolves the package-local output from the script location");
  await absent(outputDir);
  assert.deepEqual(await readdir(cwd), []);
});

test("CLI rejects conflicting check/force flags before doing work", async (t) => {
  const { cwd, cliPath, outputDir } = await cliWorkspace(t);

  await assert.rejects(runFile(process.execPath, [cliPath, "--check", "--force"], { cwd, timeout: 5000 }), (error) => {
    assert.equal(typeof error.code, "number");
    assert.notEqual(error.code, 0);
    assert.match(`${error.stdout}\n${error.stderr}`, /--check/);
    assert.match(`${error.stdout}\n${error.stderr}`, /--force/);
    return true;
  });

  await absent(outputDir);
  assert.deepEqual(await readdir(cwd), []);
});

test("CLI rejects unknown and missing paper selections before doing work", async (t) => {
  const { cwd, cliPath, outputDir } = await cliWorkspace(t);
  for (const args of [["--paper", "not-a-paper", "--check"], ["--paper"]]) {
    await assert.rejects(runFile(process.execPath, [cliPath, ...args], { cwd, timeout: 5000 }), (error) => {
      assert.equal(typeof error.code, "number");
      assert.notEqual(error.code, 0);
      assert.match(`${error.stdout}\n${error.stderr}`, /paper|transformer|deepseek/i);
      return true;
    });
  }

  await absent(outputDir);
  assert.deepEqual(await readdir(cwd), []);
});

test("CLI checks each recognized selection independently using package-local paths", async (t) => {
  const { cwd, cliPath, outputDir, fixtures } = await cliWorkspace(t);

  for (const selected of fixtures) {
    const other = fixtures.find(({ paper }) => paper.id !== selected.paper.id);
    assert.ok(other);
    const before = await cachedFile(outputDir, selected.paper, selected.data);
    const corrupted = tamperedPdf(other.data);
    await cachedFile(outputDir, other.paper, corrupted);

    const result = await runFile(process.execPath, [cliPath, "--paper", selected.paper.id, "--check"], { cwd, timeout: 5000 });

    assert.match(result.stdout, /verified/);
    assert.ok(result.stdout.includes(selected.paper.title));
    assert.ok(result.stdout.includes(before.path));
    assert.ok(!result.stdout.includes(other.paper.title), "the unselected corrupt paper is not checked");
    assert.equal((await stat(before.path)).mtimeMs, before.mtimeMs);
    assert.deepEqual(await readFile(join(outputDir, other.paper.filename)), corrupted);
  }

  assert.deepEqual((await readdir(outputDir)).sort(), fixtures.map(({ paper }) => paper.filename).sort());
  assert.deepEqual(await readdir(cwd), []);
});
