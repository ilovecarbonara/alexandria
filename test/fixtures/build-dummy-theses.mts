/**
 * Builds invented thesis and capstone PDFs for user-testing Alexandria.
 * Run with `npm run test:dummy`; output lands in test/dummy-theses/ (git-ignored).
 *
 * Every file is named after its title, carries a "fictitious test document"
 * notice on every page, and describes a study that does not exist.
 *
 * After writing, the script verifies its own output:
 *   1. the app's real abstract extractor reads each PDF at high confidence
 *   2. title similarity (a pg_trgm emulation) matches the intent — near-
 *      duplicates land in their expected band and every other pair stays under
 *      the alert threshold
 */
import { jsPDF } from "jspdf";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
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

const OUT = resolve(
  join(dirname(fileURLToPath(import.meta.url)), "..", "dummy-theses"),
);

const FOLDERS: Record<DummyThesis["group"], string> = {
  core: "01-core-20",
  "near-duplicate": "02-near-duplicates",
  extra: "03-registry-extras",
};

const ALERT_THRESHOLD = 0.5;
const AUTO_FLAG_THRESHOLD = 0.75;
const MAX_PATH = 250; // Windows MAX_PATH is 260; leave headroom.

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

function build(t: DummyThesis, index: number): Uint8Array {
  const doc = new jsPDF();
  const kind = documentKind(t);
  const footer = (page: number) => {
    doc.setPage(page);
    doc.setFontSize(7);
    doc.text(NOTICE_SHORT, 105, 287, { align: "center" });
  };

  // Page 1 - cover
  doc.setFontSize(12);
  doc.text("UNIVERSITY OF SOUTHERN PHILIPPINES FOUNDATION", 105, 30, { align: "center" });
  doc.setFontSize(9);
  doc.text("Sample cover page - test data only", 105, 37, { align: "center" });
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
  const body = doc.splitTextToSize(t.abstract, 170) as string[];
  doc.text(body, 20, 35);
  const afterBody = 35 + body.length * 5 + 6;
  doc.text(`KEYWORDS: ${t.keywords.join(", ")}`, 20, afterBody);

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

  for (let p = 1; p <= doc.getNumberOfPages(); p++) footer(p);

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
// Build
// ---------------------------------------------------------------------------

const ALL: DummyThesis[] = [...CORE, ...NEAR_DUPLICATES, ...EXTRAS];
const problems: string[] = [];

rmSync(OUT, { recursive: true, force: true });
for (const folder of Object.values(FOLDERS)) mkdirSync(join(OUT, folder), { recursive: true });

const csv: string[][] = [
  [
    "Folder",
    "File name",
    "Title",
    "Document type",
    "Level",
    "Category",
    "Submission type to pick",
    "Meant for",
    "Title-similarity expectation",
    "Notes",
  ],
];

for (const [i, t] of ALL.entries()) {
  const titleError = validateTitle(t.title);
  if (titleError) problems.push(`"${t.title}" fails validateTitle: ${titleError}`);
  if (/[:?"/\\*<>|]/.test(t.title)) problems.push(`"${t.title}" has a character Windows rejects`);

  const fileName = `${t.title}.pdf`;
  const path = join(OUT, FOLDERS[t.group], fileName);
  if (path.length > MAX_PATH) problems.push(`path too long (${path.length}): ${fileName}`);

  const bytes = build(t, i);
  writeFileSync(path, bytes);

  const result = await extractAbstract(bytes);
  if (!result.ok) {
    problems.push(`${fileName}: extractor rejected it (${result.reason})`);
  } else {
    if (result.confidence !== "high") problems.push(`${fileName}: abstract confidence is ${result.confidence}`);
    if (result.keywords.length === 0) problems.push(`${fileName}: no keywords parsed`);
    if (result.abstract.includes("FICTITIOUS")) problems.push(`${fileName}: footer leaked into abstract`);
    if (result.abstract.length > 1500) problems.push(`${fileName}: abstract unusually long (${result.abstract.length})`);
  }

  csv.push([
    FOLDERS[t.group],
    fileName,
    t.title,
    documentKind(t),
    LEVEL_LABEL[t.level],
    t.category,
    t.type,
    t.audience,
    t.expect === "auto-flag"
      ? "Auto-flag dispute (>= 0.75)"
      : t.expect === "alert-only"
        ? "Title alert only (0.50-0.75)"
        : "None expected",
    [t.imitates ? `Imitates "${t.imitates}". Submit from a different account.` : "", t.note ?? ""]
      .filter(Boolean)
      .join(" "),
  ]);
}

// Similarity relationships
const norm = (t: DummyThesis) => normalizeTitle(t.title);
const expectedPairs = new Map<string, DummyThesis>();
for (const d of NEAR_DUPLICATES) {
  const original = ALL.find((t) => t.title === d.imitates);
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
for (let a = 0; a < ALL.length; a++) {
  for (let b = a + 1; b < ALL.length; b++) {
    const intended =
      expectedPairs.get(ALL[a].title) === ALL[b] || expectedPairs.get(ALL[b].title) === ALL[a];
    if (intended) continue;
    const score = similarity(norm(ALL[a]), norm(ALL[b]));
    worst = Math.max(worst, score);
    // Keep a margin below the alert threshold so stray alerts don't muddy a test.
    if (score >= ALERT_THRESHOLD - 0.1) {
      problems.push(`unintended similarity ${score.toFixed(2)}: "${ALL[a].title}" vs "${ALL[b].title}"`);
    }
  }
}
console.log(`highest unintended similarity: ${worst.toFixed(2)} (alert threshold ${ALERT_THRESHOLD})`);

const quote = (s: string) => `"${s.replace(/"/g, '""')}"`;
writeFileSync(
  join(OUT, "MANIFEST.csv"),
  "﻿" + csv.map((row) => row.map(quote).join(",")).join("\r\n") + "\r\n",
);

const counts = (key: (t: DummyThesis) => string) =>
  Object.entries(
    ALL.reduce<Record<string, number>>((acc, t) => ((acc[key(t)] = (acc[key(t)] ?? 0) + 1), acc), {}),
  )
    .map(([k, v]) => `${k}=${v}`)
    .join(", ");

console.log(`\nWrote ${ALL.length} PDFs + MANIFEST.csv to ${OUT}`);
console.log(`core levels:  ${counts((t) => (t.group === "core" ? t.level : "-")).replace(/-=\d+,? ?/, "")}`);
console.log(`core types:   ${CORE.filter((t) => t.type === "Final").length} Final, ${CORE.filter((t) => t.type === "Draft").length} Draft`);
console.log(`categories:   ${counts((t) => t.category)}`);

if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exitCode = 1;
} else {
  console.log("\nAll checks passed.");
}
