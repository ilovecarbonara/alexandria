/**
 * Builds invented thesis and capstone PDFs for user-testing Alexandria.
 * Run with `npm run test:dummy`; output lands in test/dummy-theses/ (git-ignored).
 *
 * Layout (see dummy-theses.plan.mts for who gets what):
 *   1-SEED/       uploaded by you with demo accounts, to populate the system
 *   2-TESTERS/    one folder per tester, T01-T10
 *   3-RESERVE/    Cycle 2 spares, plus one file that is never uploaded
 *   4-USED/       empty: move a file here once it has been uploaded
 *
 * Every file is named after its title, carries a "fictitious test document"
 * notice on every page, and describes a study that does not exist.
 *
 * Regenerating produces new file hashes, so it refuses to run once anything has
 * been moved into 4-USED. Pass --force to wipe everything anyway.
 *
 * After writing, the script verifies its own output:
 *   1. the app's real abstract extractor reads each PDF at high confidence
 *   2. the form's filename-to-title autofill reproduces each title exactly
 *   3. title similarity (a pg_trgm emulation) matches the intent: near-
 *      duplicates land in their expected band, every other pair stays well
 *      under the alert threshold
 *   4. every paper has exactly one placement
 */
import { jsPDF } from "jspdf";
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { extractAbstract } from "../../lib/pdf/extract.ts";
import { normalizeTitle, validateTitle } from "../../lib/validation.ts";
import {
  CORE,
  EXTRAS,
  NEAR_DUPLICATES,
  type DummyThesis,
} from "./dummy-theses.data.mts";
import { REVISIONS, SPARES, VERIFY_NO_MATCH } from "./dummy-theses.reserve.mts";
import { PLACEMENTS, REVISION_SUBFOLDER, type Placement } from "./dummy-theses.plan.mts";

const OUT = resolve(
  join(dirname(fileURLToPath(import.meta.url)), "..", "dummy-theses"),
);
const USED = "4-USED";
const OWNED_FOLDERS = ["1-SEED", "2-TESTERS", "3-RESERVE"];
// Layouts from earlier runs of this script.
const LEGACY_FOLDERS = ["01-core-20", "02-near-duplicates", "03-registry-extras"];

const ALERT_THRESHOLD = 0.5;
const AUTO_FLAG_THRESHOLD = 0.75;
const MAX_PATH = 250; // Windows MAX_PATH is 260; leave headroom.
const MAX_TITLE_LENGTH = 150;

const NOTICE_SHORT =
  "FICTITIOUS TEST DOCUMENT - NOT A REAL STUDY - ALEXANDRIA USER-TESTING DATA";
const NOTICE_LONG =
  "This document was generated to test the Alexandria thesis registry. The title, " +
  "authors, methods, findings, and abstract are invented and do not describe any " +
  "real study or real people. Do not cite, circulate, or submit it as genuine work.";

const LEVEL_LABEL = {
  undergraduate: "Undergraduate",
  masteral: "Masteral",
  doctoral: "Doctoral",
} as const;

function documentKind(t: DummyThesis): string {
  if (t.level === "doctoral") return "Dissertation";
  const capstoneFields = ["Technology", "Engineering", "Blockchain"];
  if (t.level === "undergraduate" && capstoneFields.includes(t.category)) {
    return "Capstone Project";
  }
  return "Thesis";
}

function authorsFor(index: number): string[] {
  const names = ["One", "Two", "Three"];
  return [`Test Author ${names[index % 3]}`, `Test Author ${names[(index + 1) % 3]}`];
}

/** Mirror of titleFromPdfFileName in app/dashboard/submit/page.tsx. */
function titleFromFileName(fileName: string): string {
  return fileName
    .replace(/\.pdf$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TITLE_LENGTH);
}

interface BuildInput {
  paper: DummyThesis;
  index: number;
  /** Replaces the paper's abstract/keywords; marks the cover as a revision. */
  revision?: { abstract: string; keywords: string[] };
}

function build({ paper: t, index, revision }: BuildInput): Uint8Array {
  const doc = new jsPDF();
  const kind = documentKind(t);
  const abstract = revision?.abstract ?? t.abstract;
  const keywords = revision?.keywords ?? t.keywords;

  // Page 1 - cover
  doc.setFontSize(12);
  doc.text("UNIVERSITY OF SOUTHERN PHILIPPINES FOUNDATION", 105, 30, { align: "center" });
  doc.setFontSize(9);
  doc.text("Sample cover page - test data only", 105, 37, { align: "center" });
  if (revision) {
    doc.text("Revision 2 - fictitious revised manuscript", 105, 44, { align: "center" });
  }
  doc.setFontSize(16);
  doc.text(doc.splitTextToSize(t.title, 150) as string[], 105, 80, { align: "center" });
  doc.setFontSize(10);
  doc.text(`A ${LEVEL_LABEL[t.level]} ${kind}`, 105, 120, { align: "center" });
  doc.text(`Field: ${t.category}`, 105, 128, { align: "center" });
  doc.text("Submitted by", 105, 150, { align: "center" });
  authorsFor(index).forEach((name, i) =>
    doc.text(name, 105, 158 + i * 7, { align: "center" }),
  );
  doc.setDrawColor(150);
  doc.rect(25, 205, 160, 32);
  doc.setFontSize(9);
  doc.text(doc.splitTextToSize(NOTICE_LONG, 148) as string[], 31, 214);

  // Page 2 - abstract
  doc.addPage();
  doc.setFontSize(12);
  doc.text("ABSTRACT", 20, 25);
  doc.setFontSize(10);
  const body = doc.splitTextToSize(abstract, 170) as string[];
  doc.text(body, 20, 35);
  const afterBody = 35 + body.length * 5 + 6;
  doc.text(`KEYWORDS: ${keywords.join(", ")}`, 20, afterBody);

  // Page 3 - introduction stub
  doc.addPage();
  doc.setFontSize(12);
  doc.text("CHAPTER 1", 20, 25);
  doc.text("INTRODUCTION", 20, 33);
  doc.setFontSize(10);
  const intro =
    "This chapter is a placeholder. A real manuscript would present the background " +
    "of the study, the statement of the problem, the objectives, and the scope here. " +
    "Because this document is fictitious test data, no such content exists.";
  doc.text(doc.splitTextToSize(intro, 170) as string[], 20, 45);

  for (let p = 1; p <= doc.getNumberOfPages(); p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.text(NOTICE_SHORT, 105, 287, { align: "center" });
  }

  doc.setProperties({
    title: t.title,
    subject: "Fictitious test document - not a real study",
    author: "Alexandria test data",
    keywords: "fictitious, test data",
  });

  return new Uint8Array(doc.output("arraybuffer") as ArrayBuffer);
}

// ---------------------------------------------------------------------------
// pg_trgm emulation: lowercase, split into alphanumeric words, pad each with
// two leading and one trailing space, take 3-grams, Jaccard over the sets.
// ---------------------------------------------------------------------------

function trigrams(text: string): Set<string> {
  const set = new Set<string>();
  for (const word of text.toLowerCase().split(/[^a-z0-9_]+/).filter(Boolean)) {
    const padded = `  ${word} `;
    for (let i = 0; i + 3 <= padded.length; i++) set.add(padded.slice(i, i + 3));
  }
  return set;
}

function similarity(a: string, b: string): number {
  const ta = trigrams(a);
  const tb = trigrams(b);
  let shared = 0;
  for (const g of ta) if (tb.has(g)) shared++;
  return shared / (ta.size + tb.size - shared);
}

// ---------------------------------------------------------------------------
// Guard, then build
// ---------------------------------------------------------------------------

const force = process.argv.includes("--force");
const usedDir = join(OUT, USED);
if (!force && existsSync(usedDir) && readdirSync(usedDir, { recursive: true }).length > 0) {
  console.error(
    `Refusing to regenerate: ${USED} already holds uploaded files, and new PDFs would have new hashes.\n` +
      "Run with --force to wipe everything and start over.",
  );
  process.exit(1);
}

const PAPERS: DummyThesis[] = [...CORE, ...NEAR_DUPLICATES, ...EXTRAS, ...SPARES, VERIFY_NO_MATCH];
const problems: string[] = [];

// Every paper has exactly one placement, and every placement has a paper.
const placementOf = new Map<string, Placement>();
for (const p of PLACEMENTS) {
  if (placementOf.has(p.title)) problems.push(`duplicate placement: ${p.title}`);
  placementOf.set(p.title, p);
}
const paperTitles = new Set(PAPERS.map((p) => p.title));
for (const p of PAPERS) if (!placementOf.has(p.title)) problems.push(`no placement for: ${p.title}`);
for (const title of placementOf.keys()) if (!paperTitles.has(title)) problems.push(`placement has no paper: ${title}`);
if (paperTitles.size !== PAPERS.length) problems.push("two papers share a title");

for (const name of [...OWNED_FOLDERS, ...LEGACY_FOLDERS]) {
  rmSync(join(OUT, name), { recursive: true, force: true });
}
rmSync(join(OUT, "MANIFEST.csv"), { force: true });
rmSync(join(OUT, "START-HERE.md"), { force: true });
if (force) rmSync(usedDir, { recursive: true, force: true });
mkdirSync(usedDir, { recursive: true });

interface Row {
  folder: string;
  fileName: string;
  title: string;
  kind: string;
  level: string;
  category: string;
  owner: string;
  submitAs: string;
  step: number;
  plan: string;
  similarity: string;
}
const rows: Row[] = [];

function checkTitleAndPath(title: string, fileName: string, fullPath: string) {
  const titleError = validateTitle(title);
  if (titleError) problems.push(`"${title}" fails validateTitle: ${titleError}`);
  if (/[:?"/\\*<>|]/.test(title)) problems.push(`"${title}" has a character Windows rejects`);
  if (titleFromFileName(fileName) !== title) {
    problems.push(`form autofill would turn "${fileName}" into "${titleFromFileName(fileName)}"`);
  }
  if (fullPath.length > MAX_PATH) problems.push(`path too long (${fullPath.length}): ${fileName}`);
}

async function checkExtraction(fileName: string, bytes: Uint8Array) {
  const result = await extractAbstract(bytes);
  if (!result.ok) {
    problems.push(`${fileName}: extractor rejected it (${result.reason})`);
    return;
  }
  if (result.confidence !== "high") problems.push(`${fileName}: abstract confidence is ${result.confidence}`);
  if (result.keywords.length === 0) problems.push(`${fileName}: no keywords parsed`);
  if (result.abstract.includes("FICTITIOUS")) problems.push(`${fileName}: footer leaked into abstract`);
  if (result.abstract.length > 1500) problems.push(`${fileName}: abstract unusually long (${result.abstract.length})`);
}

for (const [i, paper] of PAPERS.entries()) {
  const placement = placementOf.get(paper.title);
  if (!placement) continue;

  const fileName = `${paper.title}.pdf`;
  const dir = join(OUT, placement.folder);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, fileName);
  checkTitleAndPath(paper.title, fileName, path);

  const bytes = build({ paper, index: i });
  writeFileSync(path, bytes);
  await checkExtraction(fileName, bytes);

  rows.push({
    folder: placement.folder,
    fileName,
    title: paper.title,
    kind: documentKind(paper),
    level: LEVEL_LABEL[paper.level],
    category: paper.category,
    owner: placement.owner,
    submitAs: placement.submitAs,
    step: placement.step,
    plan: placement.plan,
    similarity:
      paper.expect === "auto-flag"
        ? "Title alert + auto-flag dispute"
        : paper.expect === "alert-only"
          ? "Title alert only"
          : "",
  });
}

for (const [i, rev] of REVISIONS.entries()) {
  const paper = PAPERS.find((p) => p.title === rev.of);
  const base = placementOf.get(rev.of);
  if (!paper || !base) {
    problems.push(`revision targets a missing paper: ${rev.of}`);
    continue;
  }
  const fileName = `${paper.title}.pdf`;
  const folder = `${base.folder}/${REVISION_SUBFOLDER}`;
  const dir = join(OUT, folder);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, fileName);
  checkTitleAndPath(paper.title, fileName, path);

  const bytes = build({ paper, index: i + 100, revision: rev });
  writeFileSync(path, bytes);
  await checkExtraction(fileName, bytes);
  if (rev.abstract === paper.abstract) problems.push(`${fileName}: revision abstract is unchanged`);

  rows.push({
    folder,
    fileName,
    title: paper.title,
    kind: documentKind(paper),
    level: LEVEL_LABEL[paper.level],
    category: paper.category,
    owner: base.owner,
    submitAs: "Resubmit",
    step: 3,
    plan: "Use ONLY after the adviser returns the Final in this tester's folder: Resubmit with this different manuscript (UAT-18).",
    similarity: "",
  });
}

// Similarity relationships
const norm = (t: DummyThesis) => normalizeTitle(t.title);
const expectedPairs = new Map<string, DummyThesis>();
for (const d of NEAR_DUPLICATES) {
  const original = PAPERS.find((t) => t.title === d.imitates);
  if (!original) {
    problems.push(`"${d.title}" imitates a title that does not exist`);
    continue;
  }
  expectedPairs.set(d.title, original);
  const score = similarity(norm(d), norm(original));
  const ok =
    d.expect === "auto-flag"
      ? score >= AUTO_FLAG_THRESHOLD + 0.03
      : score >= ALERT_THRESHOLD + 0.03 && score < AUTO_FLAG_THRESHOLD - 0.03;
  console.log(`${ok ? "ok  " : "FAIL"} ${score.toFixed(2)}  ${d.expect}  ${d.title}`);
  if (!ok) problems.push(`near-duplicate score ${score.toFixed(2)} outside the ${d.expect} band: ${d.title}`);
}

let worst = 0;
for (let a = 0; a < PAPERS.length; a++) {
  for (let b = a + 1; b < PAPERS.length; b++) {
    const intended =
      expectedPairs.get(PAPERS[a].title) === PAPERS[b] || expectedPairs.get(PAPERS[b].title) === PAPERS[a];
    if (intended) continue;
    const score = similarity(norm(PAPERS[a]), norm(PAPERS[b]));
    worst = Math.max(worst, score);
    // Keep a margin below the alert threshold so stray alerts don't muddy a test.
    if (score >= ALERT_THRESHOLD - 0.1) {
      problems.push(`unintended similarity ${score.toFixed(2)}: "${PAPERS[a].title}" vs "${PAPERS[b].title}"`);
    }
  }
}
console.log(`highest unintended similarity: ${worst.toFixed(2)} (alert threshold ${ALERT_THRESHOLD})`);

// ---------------------------------------------------------------------------
// Manifest + START-HERE
// ---------------------------------------------------------------------------

const order = (r: Row) => OWNED_FOLDERS.findIndex((f) => r.folder.startsWith(f));
rows.sort((a, b) => order(a) - order(b) || a.folder.localeCompare(b.folder) || a.step - b.step);

const quote = (s: string | number) => `"${String(s).replace(/"/g, '""')}"`;
const header = ["Folder", "File name", "Submit as", "Owner", "Order", "Planned outcome", "Similarity", "Type", "Level", "Category"];
writeFileSync(
  join(OUT, "MANIFEST.csv"),
  "﻿" +
    [header, ...rows.map((r) => [r.folder, r.fileName, r.submitAs, r.owner, r.step, r.plan, r.similarity, r.kind, r.level, r.category])]
      .map((row) => row.map(quote).join(","))
      .join("\r\n") +
    "\r\n",
);

const seed = rows.filter((r) => r.folder.startsWith("1-SEED"));
const testers = rows.filter((r) => r.folder.startsWith("2-TESTERS"));
const reserve = rows.filter((r) => r.folder.startsWith("3-RESERVE"));
const seedByOrder = [...seed].sort((a, b) => a.step - b.step);
const cell = (s: string) => s.replace(/\|/g, "\\|");

const md: string[] = [];
md.push("# Alexandria test PDFs - start here", "");
md.push(
  "All papers are invented. File names are exact titles on purpose: the submit form copies the title from the file name.",
  "",
  "**When you upload a file, move it into `4-USED/`.** Regenerating makes new files with new hashes, so the script refuses to run once `4-USED/` has content.",
  "",
  "People: **D1-D4** are demo researchers, **A1/A2** the two advisers, **T01-T05** student testers, **T06-T10** faculty testers.",
  "",
);
md.push(`## 1-SEED - you upload these (${seed.length})`, "", "Do them in this order. Finish each file's journey before the next.", "");
md.push("| # | Folder | File | As | Owner | What happens to it |", "|---|---|---|---|---|---|");
for (const r of seedByOrder) {
  md.push(`| ${r.step} | ${r.folder.replace("1-SEED/", "")} | ${cell(r.title)} | ${r.submitAs} | ${r.owner} | ${cell(r.plan)} |`);
}
md.push("", `## 2-TESTERS - hand these out (${testers.filter((r) => r.submitAs !== "Resubmit").length} + ${testers.filter((r) => r.submitAs === "Resubmit").length} revisions)`, "");
md.push("| Tester | Order | File | As | What happens to it |", "|---|---|---|---|---|");
for (const r of testers) {
  const who = r.folder.replace("2-TESTERS/", "").replace(`/${REVISION_SUBFOLDER}`, "");
  const tag = r.submitAs === "Resubmit" ? "RESUBMIT" : r.submitAs;
  md.push(`| ${who}${r.submitAs === "Resubmit" ? " (revision)" : ""} | ${r.step} | ${cell(r.title)} | ${tag} | ${cell(r.plan)} |`);
}
md.push("", `## 3-RESERVE - keep (${reserve.length})`, "");
md.push("| Folder | File | What it is for |", "|---|---|---|");
for (const r of reserve) md.push(`| ${r.folder.replace("3-RESERVE/", "")} | ${cell(r.title)} | ${cell(r.plan)} |`);
md.push("", "## At a glance", "");
const count = (pred: (r: Row) => boolean) => rows.filter(pred).length;
md.push(
  `- Published: ${count((r) => r.folder.endsWith("1-PUBLISH"))} seeded + 1 more that gets flagged (\`2-PUBLISH-then-FLAG\`)`,
  `- Left in queues: ${count((r) => r.folder.endsWith("3-STOP-at-librarian-queue"))} at the librarian, ${count((r) => r.folder.endsWith("4-STOP-at-adviser-queue"))} at the advisers`,
  `- Returned: 1 seeded (stays returned) + 4 tester Finals that get returned and resubmitted`,
  `- Rejected: ${count((r) => r.folder.endsWith("6-REJECT"))}, Draft: ${count((r) => r.folder.endsWith("7-DRAFT"))} seeded + 5 faculty Drafts`,
  `- Auto-flag disputes: 4 (T01-T04 near-duplicates); alert only: 1 (T05)`,
  `- Manual disputes to seed: 2 (one left open, one resolved), see the Eye Strain and Inventory rows`,
  "",
);
writeFileSync(join(OUT, "START-HERE.md"), md.join("\n"));

console.log(
  `\nWrote ${rows.length} PDFs (${seed.length} seed, ${testers.length} tester incl. ` +
    `${REVISIONS.length} revisions, ${reserve.length} reserve) to ${OUT}`,
);

if (seed.length !== 15) problems.push(`expected 15 seed files, got ${seed.length}`);
if (testers.filter((r) => r.submitAs !== "Resubmit").length !== 20) problems.push("expected 20 tester files");
if (reserve.length !== 6) problems.push(`expected 6 reserve files, got ${reserve.length}`);

if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exitCode = 1;
} else {
  console.log("All checks passed.");
}
