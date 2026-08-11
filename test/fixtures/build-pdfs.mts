/**
 * Builds the PDF corpus used by test/pdf-extraction.test.mts.
 *
 * Generated rather than committed so the fixtures stay readable and diffable
 * as source. Run `npm run test:fixtures` after changing a case.
 */
import { jsPDF } from "jspdf";
import { encode as encodePng } from "fast-png";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "pdfs");

const ABSTRACT_BODY =
  "This study examines the relationship between adaptive learning platforms and " +
  "sustained academic performance among undergraduate students at a private " +
  "university. Using a mixed-methods design, the researchers surveyed two hundred " +
  "participants across four colleges and conducted follow-up interviews with a " +
  "purposive subsample of twenty. Quantitative results indicate a statistically " +
  "significant positive correlation between platform engagement and end-of-term " +
  "grades, while the interview data suggest that perceived autonomy mediates that " +
  "relationship. The findings support wider institutional adoption, provided that " +
  "instructor training accompanies deployment.";

type Line = { text: string; size?: number; gap?: number };

function build(lines: Line[]): Uint8Array {
  const doc = new jsPDF();
  let y = 20;

  for (const line of lines) {
    doc.setFontSize(line.size ?? 10);
    const wrapped = doc.splitTextToSize(line.text, 170) as string[];
    doc.text(wrapped, 20, y);
    y += wrapped.length * (line.size ?? 10) * 0.5 + (line.gap ?? 6);
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  }

  return new Uint8Array(doc.output("arraybuffer") as ArrayBuffer);
}

const FIXTURES: Record<string, Uint8Array> = {
  // The well-formed case: standalone ABSTRACT heading, KEYWORDS terminator.
  "standard.pdf": build([
    { text: "UNIVERSITY OF SOUTHERN PHILIPPINES FOUNDATION", size: 12 },
    { text: "Adaptive Learning and Academic Performance", size: 14, gap: 12 },
    { text: "ABSTRACT", size: 12, gap: 8 },
    { text: ABSTRACT_BODY, gap: 10 },
    { text: "KEYWORDS: adaptive learning, academic performance, mixed methods", gap: 12 },
    { text: "CHAPTER 1", size: 12 },
    { text: "INTRODUCTION", size: 12, gap: 8 },
    { text: "The background of the study begins here and continues at length." },
  ]),

  // Inline heading form: "Abstract:" with the text running on.
  "inline-heading.pdf": build([
    { text: "A Study of Something Interesting", size: 14, gap: 12 },
    { text: `Abstract: ${ABSTRACT_BODY}`, gap: 10 },
    { text: "1. Introduction", size: 12, gap: 8 },
    { text: "The background of the study begins here." },
  ]),

  // No KEYWORDS line — must stop at CHAPTER 1 instead.
  "no-keywords.pdf": build([
    { text: "A Study Without Keywords", size: 14, gap: 12 },
    { text: "ABSTRACT", size: 12, gap: 8 },
    { text: ABSTRACT_BODY, gap: 10 },
    { text: "CHAPTER 1", size: 12 },
    { text: "INTRODUCTION", size: 12, gap: 8 },
    { text: "This text must not be captured as part of the abstract." },
  ]),

  // Abstract sits on page 3, behind a title page and approval sheet.
  "front-matter.pdf": (() => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Adaptive Learning and Academic Performance", 20, 40);
    doc.setFontSize(10);
    doc.text("A Thesis Presented to the Faculty", 20, 60);
    doc.addPage();
    doc.setFontSize(12);
    doc.text("APPROVAL SHEET", 20, 20);
    doc.setFontSize(10);
    doc.text("This thesis has been examined and recommended for approval.", 20, 35);
    doc.addPage();
    doc.setFontSize(12);
    doc.text("ABSTRACT", 20, 20);
    doc.setFontSize(10);
    doc.text(doc.splitTextToSize(ABSTRACT_BODY, 170) as string[], 20, 32);
    doc.text("KEYWORDS: adaptive learning, autonomy", 20, 90);
    return new Uint8Array(doc.output("arraybuffer") as ArrayBuffer);
  })(),

  // Heading rendered letterspaced ("A B S T R A C T"), so the pattern misses
  // it. The prose fallback should still find the body, at low confidence.
  "letterspaced-heading.pdf": build([
    { text: "A Study With An Unusual Heading", size: 14, gap: 12 },
    { text: "A B S T R A C T", size: 12, gap: 8 },
    { text: ABSTRACT_BODY, gap: 10 },
    { text: "CHAPTER 1", size: 12 },
  ]),

  // No abstract heading, and no prose block long enough for the fallback to
  // latch onto. The document still carries plenty of text, so this must fail as
  // `no-abstract-found` rather than tripping the scanned-PDF guard.
  "no-abstract.pdf": build([
    { text: "A Thesis With No Abstract", size: 14, gap: 12 },
    { text: "TABLE OF CONTENTS", size: 12, gap: 8 },
    { text: "Chapter 1: Introduction .......... 1" },
    { text: "Chapter 2: Review of Related Literature .......... 24" },
    { text: "Chapter 3: Methodology .......... 51" },
    { text: "Chapter 4: Results and Discussion .......... 78" },
    { text: "Chapter 5: Conclusions and Recommendations .......... 106" },
    { text: "References .......... 121" },
    { text: "Appendix A: Survey Instrument .......... 130" },
    { text: "Appendix B: Interview Protocol .......... 134" },
    { text: "LIST OF TABLES", size: 12, gap: 8 },
    { text: "Table 1: Demographic profile of respondents .......... 55" },
    { text: "Table 2: Reliability coefficients per construct .......... 58" },
    { text: "Table 3: Correlation matrix .......... 80" },
    { text: "LIST OF FIGURES", size: 12, gap: 8 },
    { text: "Figure 1: Conceptual framework .......... 20" },
    { text: "Figure 2: Respondent distribution by college .......... 56" },
  ]),

  // Heading present, but only a stub beneath it. Must fail as `too-short`, not
  // silently register a one-line abstract.
  "truncated.pdf": build([
    { text: "A Thesis With A Stub Abstract", size: 14, gap: 12 },
    { text: "ABSTRACT", size: 12, gap: 8 },
    { text: "This study is about learning.", gap: 10 },
    { text: "CHAPTER 1", size: 12 },
    { text: "INTRODUCTION", size: 12, gap: 8 },
    {
      text:
        "The background of the study is presented in this chapter, together with " +
        "the statement of the problem, the objectives that guided the inquiry, " +
        "and the scope and delimitation of the work undertaken. The researchers " +
        "situate the study within the wider literature on educational technology " +
        "and describe the institutional context in which the data were gathered. " +
        "None of this text belongs to the abstract and none of it should ever be " +
        "captured as part of one.",
    },
  ]),

  // An image-only page: no text layer at all, as a page scan would produce.
  "scanned.pdf": (() => {
    const doc = new jsPDF();
    const png = encodePng({
      width: 8,
      height: 8,
      channels: 1,
      depth: 8,
      data: new Uint8Array(64).fill(0xd0),
    });
    doc.addImage(
      `data:image/png;base64,${Buffer.from(png).toString("base64")}`,
      "PNG",
      10,
      10,
      190,
      270,
    );
    return new Uint8Array(doc.output("arraybuffer") as ArrayBuffer);
  })(),
};

mkdirSync(OUT, { recursive: true });
for (const [name, bytes] of Object.entries(FIXTURES)) {
  writeFileSync(join(OUT, name), bytes);
  console.log(`wrote ${name} (${bytes.length} bytes)`);
}
