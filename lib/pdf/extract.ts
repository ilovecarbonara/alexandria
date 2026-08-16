import { extractText } from "unpdf";
import type { AbstractConfidence } from "@/lib/supabase/types";

/**
 * Reads the Abstract out of a thesis PDF.
 *
 * The submitter never types their own abstract — the system takes what the
 * manuscript already says. When that fails, submission is blocked rather than
 * falling back to manual entry; a reviewer can correct a badly-parsed abstract
 * later via `correctAbstract` in lib/actions/reviews.ts.
 */

// How far into the document to look. Abstracts sit in the front matter, after
// the title page and (sometimes) approval sheet and acknowledgements.
const SEARCH_PAGES = 8;

/** Below this, the PDF has no extractable text layer at all. */
const MIN_DOCUMENT_TEXT = 200;

// Thesis abstracts usually run 150-350 words. The floors are set to catch a
// truncated capture without rejecting a legitimately terse one.
const MIN_ABSTRACT_CHARS = 200;
const MAX_ABSTRACT_CHARS = 5000;
const MIN_ABSTRACT_WORDS = 40;

/** `ABSTRACT` alone on its line — the well-formed case. */
const HEADING_STANDALONE = /^\s*(?:abstract|executive\s+summary)\s*$/i;

/** `Abstract:` or `Abstract —` with the text running on from the same line. */
const HEADING_INLINE = /^\s*(?:abstract|executive\s+summary)\s*[:—–-]\s*(.+)$/i;

/** Headings that mark the end of the abstract. */
const TERMINATORS = [
  /^\s*key\s?words?\s*[:.—–-]?/i,
  /^\s*index\s+terms\s*[:.—–-]?/i,
  /^\s*table\s+of\s+contents\s*$/i,
  /^\s*acknowledge?ments?\s*$/i,
  /^\s*dedication\s*$/i,
  /^\s*list\s+of\s+(?:tables|figures|appendices|abbreviations)\s*$/i,
  /^\s*chapter\s+(?:1|i|one)\b/i,
  /^\s*(?:1\s*[.)]\s*)?introduction\s*$/i,
  /^\s*approval\s+sheet\s*$/i,
  /^\s*(?:table\s+of\s+)?contents\s*$/i,
  /^\s*references\s*$/i,
];

const KEYWORDS_LINE =
  /^\s*(?:key\s?words?|index\s+terms)\s*[:.—–-]?\s*(.+)$/i;

/** A bare page number, a roman numeral, or `Page 3 of 90`. */
const PAGE_ARTIFACT = /^\s*(?:page\s+)?(?:\d{1,4}|[ivxlcdm]{1,7})(?:\s+of\s+\d{1,4})?\s*$/i;

export type ExtractionFailure =
  | "no-text-layer"
  | "no-abstract-found"
  | "abstract-too-short"
  | "abstract-too-long"
  | "unreadable-pdf";

export interface AbstractResult {
  ok: true;
  abstract: string;
  keywords: string[];
  confidence: AbstractConfidence;
  pageCount: number;
}

export interface AbstractError {
  ok: false;
  reason: ExtractionFailure;
  /** Shown to the researcher, so it has to say what to do next. */
  message: string;
  pageCount: number;
}

export const FAILURE_MESSAGES: Record<ExtractionFailure, string> = {
  "no-text-layer":
    "This PDF appears to be a scanned image. Alexandria reads the abstract from the document's text, so please upload a text-based PDF exported from your word processor.",
  "no-abstract-found":
    "No Abstract section could be found in this PDF. Make sure the manuscript contains a heading reading “ABSTRACT” followed by the abstract text.",
  "abstract-too-short":
    "The Abstract section found in this PDF is too short to be a complete abstract. Check that the full abstract follows the heading.",
  "abstract-too-long":
    "The text following the Abstract heading is longer than an abstract should be. Check that a heading such as “KEYWORDS” or “CHAPTER 1” follows it.",
  "unreadable-pdf":
    "This PDF could not be read. It may be corrupted or password-protected.",
};

// ---------------------------------------------------------------------------
// Text cleanup
// ---------------------------------------------------------------------------

/**
 * Turns captured lines into a single paragraph: drops page furniture, rejoins
 * words split across a line break, and collapses the rest of the whitespace.
 */
export function cleanAbstractText(lines: string[]): string {
  const kept = lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (PAGE_ARTIFACT.test(trimmed)) return false;
    return true;
  });

  return kept
    .join("\n")
    // A word hyphenated across a line break rejoins with no hyphen.
    .replace(/(\w)-\s*\n\s*(\w)/g, "$1$2")
    .replace(/\s+/g, " ")
    .trim();
}

function parseKeywords(raw: string): string[] {
  return raw
    .split(/[,;]/)
    .map((k) => k.replace(/[.\s]+$/, "").trim())
    .filter((k) => k.length > 1 && k.length < 60)
    .slice(0, 15);
}

// ---------------------------------------------------------------------------
// Abstract location
// ---------------------------------------------------------------------------

interface FoundAbstract {
  lines: string[];
  keywords: string[];
  confidence: AbstractConfidence;
}

/**
 * Locates the abstract within the front matter.
 *
 * Pure function over already-extracted page text, so it can be unit-tested
 * against a fixture corpus without touching a real PDF.
 */
export function findAbstract(pages: string[]): FoundAbstract | null {
  // Flatten the searchable front matter into one line stream; abstracts
  // routinely spill across a page boundary.
  const lines = pages
    .slice(0, SEARCH_PAGES)
    .flatMap((page) => page.split("\n"));

  let start = -1;
  let firstLine: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    if (HEADING_STANDALONE.test(lines[i])) {
      start = i + 1;
      break;
    }
    const inline = lines[i].match(HEADING_INLINE);
    if (inline) {
      start = i + 1;
      firstLine = inline[1];
      break;
    }
  }

  if (start === -1) return fallbackAbstract(lines);

  const captured: string[] = firstLine ? [firstLine] : [];
  const keywords: string[] = [];

  for (let i = start; i < lines.length; i++) {
    const line = lines[i];

    const terminator = TERMINATORS.find((re) => re.test(line));
    if (terminator) {
      // A KEYWORDS line ends the abstract but is itself worth keeping.
      const kw = line.match(KEYWORDS_LINE);
      if (kw) keywords.push(...parseKeywords(kw[1]));
      break;
    }

    captured.push(line);
  }

  if (captured.length === 0) return null;

  return { lines: captured, keywords, confidence: "high" };
}

/** Dot leaders (`Chapter 1 ....... 24`) — a table of contents, not prose. */
const DOT_LEADER = /\.{4,}|…/;

/**
 * Whether a single line reads like running prose.
 *
 * PDF text extraction does not preserve blank lines, so the fallback cannot
 * split on paragraph breaks — it has to judge lines individually and group the
 * consecutive ones. Without this, a page of contents entries or a list of
 * tables looks exactly like a long paragraph.
 */
export function looksLikeProse(line: string): boolean {
  const trimmed = line.trim();

  if (trimmed.length < 25) return false;
  if (DOT_LEADER.test(trimmed)) return false;

  // A heading in full caps is a heading, not a sentence.
  const letters = trimmed.replace(/[^A-Za-z]/g, "");
  if (letters.length > 3 && letters === letters.toUpperCase()) return false;

  // Contents entries and figure lists are dense with digits.
  const digits = (trimmed.match(/\d/g) ?? []).length;
  if (digits / trimmed.length > 0.12) return false;

  // Prose lines are mostly words separated by single spaces.
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length < 5) return false;

  return true;
}

/**
 * No `ABSTRACT` heading anywhere — the heading may be letterspaced, an image,
 * or absent. Fall back to the first substantial run of prose in the front
 * matter and mark it low-confidence, so the researcher sees a warning before
 * submitting and the reviewer sees a banner during review.
 */
function fallbackAbstract(lines: string[]): FoundAbstract | null {
  const blocks: string[][] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (looksLikeProse(line)) {
      current.push(line);
    } else if (current.length) {
      blocks.push(current);
      current = [];
    }
  }
  if (current.length) blocks.push(current);

  for (const block of blocks) {
    const text = cleanAbstractText(block);
    if (
      text.length >= MIN_ABSTRACT_CHARS &&
      text.length <= MAX_ABSTRACT_CHARS &&
      countWords(text) >= MIN_ABSTRACT_WORDS &&
      // Real prose ends sentences. A run of long labels does not.
      (text.match(/[.!?](?:\s|$)/g) ?? []).length >= 2
    ) {
      return { lines: block, keywords: [], confidence: "low" };
    }
  }

  return null;
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export async function extractAbstract(
  data: Uint8Array,
): Promise<AbstractResult | AbstractError> {
  let pages: string[];
  let pageCount: number;

  try {
    const result = await extractText(data, { mergePages: false });
    pages = result.text;
    pageCount = result.totalPages;
  } catch {
    return {
      ok: false,
      reason: "unreadable-pdf",
      message: FAILURE_MESSAGES["unreadable-pdf"],
      pageCount: 0,
    };
  }

  const totalText = pages.join("").replace(/\s/g, "");
  if (totalText.length < MIN_DOCUMENT_TEXT) {
    return {
      ok: false,
      reason: "no-text-layer",
      message: FAILURE_MESSAGES["no-text-layer"],
      pageCount,
    };
  }

  const found = findAbstract(pages);
  if (!found) {
    return {
      ok: false,
      reason: "no-abstract-found",
      message: FAILURE_MESSAGES["no-abstract-found"],
      pageCount,
    };
  }

  const abstract = cleanAbstractText(found.lines);

  if (abstract.length < MIN_ABSTRACT_CHARS || countWords(abstract) < MIN_ABSTRACT_WORDS) {
    return {
      ok: false,
      reason: "abstract-too-short",
      message: FAILURE_MESSAGES["abstract-too-short"],
      pageCount,
    };
  }

  if (abstract.length > MAX_ABSTRACT_CHARS) {
    return {
      ok: false,
      reason: "abstract-too-long",
      message: FAILURE_MESSAGES["abstract-too-long"],
      pageCount,
    };
  }

  return {
    ok: true,
    abstract,
    keywords: found.keywords,
    confidence: found.confidence,
    pageCount,
  };
}

/** `%PDF-` magic bytes. Cheaper and harder to spoof than a MIME type. */
export function looksLikePdf(data: Uint8Array): boolean {
  return (
    data.length > 5 &&
    data[0] === 0x25 && // %
    data[1] === 0x50 && // P
    data[2] === 0x44 && // D
    data[3] === 0x46 && // F
    data[4] === 0x2d //  -
  );
}
