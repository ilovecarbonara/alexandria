/**
 * Citation formatting for public thesis records — APA 7, MLA 9, and Chicago.
 *
 * Pure and side-effect free on purpose. `test/citation.test.mts` imports this
 * module directly under `node --experimental-strip-types`, which cannot resolve
 * the `@/` path alias, so the only import here is a type — erased at runtime.
 * Keep it that way: a runtime import breaks the tests, not the build.
 */
import type { ThesisLevel } from "@/lib/supabase/types";

export const INSTITUTION = "University of Southern Philippines Foundation";
export const ARCHIVE_NAME = "Alexandria";

export type CitationStyle = "apa" | "mla" | "chicago";

export const CITATION_STYLES: { id: CitationStyle; label: string }[] = [
  { id: "apa", label: "APA 7th" },
  { id: "mla", label: "MLA 9th" },
  { id: "chicago", label: "Chicago" },
];

export interface CitationSource {
  title: string;
  /** Author names in credited order, as stored. */
  authors: string[];
  year: number;
  level: ThesisLevel;
  /** Absolute permalink to the public record. */
  url: string;
}

export interface Citation {
  style: CitationStyle;
  label: string;
  /** Plain text, for the clipboard and for `<textarea>`-style display. */
  text: string;
  /** Same citation with italics preserved, for a rich-text paste. */
  html: string;
}

// ---------------------------------------------------------------------------
// Name parsing
// ---------------------------------------------------------------------------

/**
 * Particles that belong to the surname rather than the given names. Without
 * these, "Juan Dela Cruz" inverts to "Cruz, J. D." instead of "Dela Cruz, J."
 * — the common case in a Philippine registry, not an exotic one.
 */
const SURNAME_PARTICLES = new Set([
  "de", "del", "dela", "delas", "delos", "des", "di", "du",
  "da", "das", "do", "dos", "la", "las", "le", "les", "lo", "los",
  "san", "santa", "santo", "st", "van", "von", "der", "den", "ter",
  "bin", "binti", "ibn", "al", "el", "mac", "mc", "ng",
]);

/** Generational suffixes, which must not be mistaken for the surname. */
const SUFFIXES = new Set(["jr", "sr", "ii", "iii", "iv", "v", "vi"]);

/** Lowercased and stripped of trailing dots, for set lookups only. */
function normalize(token: string): string {
  return token.toLowerCase().replace(/\.+$/, "");
}

export interface ParsedName {
  given: string[];
  surname: string;
  suffix: string | null;
}

/**
 * Splits a stored display name into parts. Names arrive as one free-text field,
 * so this is a heuristic: it handles particles, generational suffixes, and the
 * already-inverted "Surname, Given" form, and degrades to a surname-only name
 * rather than guessing when there is nothing to split.
 */
export function parseName(full: string): ParsedName {
  const trimmed = (full ?? "").trim();
  if (!trimmed) return { given: [], surname: "", suffix: null };

  // Already inverted — "Dela Cruz, Juan P." or "Dela Cruz, Juan, Jr."
  if (trimmed.includes(",")) {
    const [surnamePart, ...rest] = trimmed.split(",");
    const tail = rest.map((part) => part.trim()).filter(Boolean);
    let suffix: string | null = null;
    if (tail.length > 1 && SUFFIXES.has(normalize(tail[tail.length - 1]))) {
      suffix = tail.pop() ?? null;
    }
    return {
      given: tail.join(" ").split(/\s+/).filter(Boolean),
      surname: surnamePart.trim(),
      suffix,
    };
  }

  const tokens = trimmed.split(/\s+/).filter(Boolean);

  let suffix: string | null = null;
  if (tokens.length > 1 && SUFFIXES.has(normalize(tokens[tokens.length - 1]))) {
    suffix = tokens.pop() ?? null;
  }

  // Walk backwards from the final token, absorbing particles into the surname.
  // Consuming every token is allowed: "Dela Cruz" alone is a surname, and
  // rendering it whole beats inventing a given name from "Dela".
  const surnameParts = [tokens.pop() as string];
  while (tokens.length > 0 && SURNAME_PARTICLES.has(normalize(tokens[tokens.length - 1]))) {
    surnameParts.unshift(tokens.pop() as string);
  }

  return { given: tokens, surname: surnameParts.join(" "), suffix };
}

/** "Juan Protacio" → "J. P."; "Ana-Maria" → "A.-M." */
function toInitials(given: string[]): string {
  return given
    .map((name) =>
      name
        .split("-")
        .filter(Boolean)
        .map((part) => `${part.charAt(0).toUpperCase()}.`)
        .join("-"),
    )
    .filter(Boolean)
    .join(" ");
}

function withSuffix(base: string, suffix: string | null): string {
  return suffix ? `${base}, ${suffix}` : base;
}

/** "Dela Cruz, J. P., Jr." — APA's author form. */
function invertedInitials(name: ParsedName): string {
  const initials = toInitials(name.given);
  if (!name.surname) return withSuffix(initials, name.suffix);
  if (!initials) return withSuffix(name.surname, name.suffix);
  return withSuffix(`${name.surname}, ${initials}`, name.suffix);
}

/** "Dela Cruz, Juan Protacio, Jr." — MLA and Chicago's first author. */
function invertedFull(name: ParsedName): string {
  const given = name.given.join(" ");
  if (!name.surname) return withSuffix(given, name.suffix);
  if (!given) return withSuffix(name.surname, name.suffix);
  return withSuffix(`${name.surname}, ${given}`, name.suffix);
}

/** "Juan Protacio Dela Cruz, Jr." — MLA and Chicago's later authors. */
function naturalFull(name: ParsedName): string {
  const base = [name.given.join(" "), name.surname].filter(Boolean).join(" ");
  return withSuffix(base, name.suffix);
}

// ---------------------------------------------------------------------------
// Author lists — one joining rule per style, and they genuinely differ
// ---------------------------------------------------------------------------

/** APA 7: every name inverted to initials, `&` before the last, `...` past 20. */
function apaAuthors(names: ParsedName[]): string {
  const parts = names.map(invertedInitials);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]}, & ${parts[1]}`;
  if (parts.length <= 20) {
    return `${parts.slice(0, -1).join(", ")}, & ${parts[parts.length - 1]}`;
  }
  return `${parts.slice(0, 19).join(", ")}, ... ${parts[parts.length - 1]}`;
}

/** MLA 9: first author inverted; three or more collapse to "et al." */
function mlaAuthors(names: ParsedName[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return invertedFull(names[0]);
  if (names.length === 2) {
    return `${invertedFull(names[0])}, and ${naturalFull(names[1])}`;
  }
  return `${invertedFull(names[0])}, et al.`;
}

/** Chicago: first author inverted, spelled-out "and", "et al." past three. */
function chicagoAuthors(names: ParsedName[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return invertedFull(names[0]);
  if (names.length <= 3) {
    const rest = names.slice(1).map(naturalFull);
    const last = rest.pop() as string;
    const lead = [invertedFull(names[0]), ...rest].join(", ");
    return `${lead}, and ${last}`;
  }
  return `${invertedFull(names[0])}, et al.`;
}

// ---------------------------------------------------------------------------
// Level designations
// ---------------------------------------------------------------------------

const DESIGNATION: Record<ThesisLevel, string> = {
  undergraduate: "Undergraduate thesis",
  masteral: "Master's thesis",
  doctoral: "Doctoral dissertation",
};

/** Chicago abbreviates the doctoral case and nothing else. */
const CHICAGO_DESIGNATION: Record<ThesisLevel, string> = {
  ...DESIGNATION,
  doctoral: "PhD diss.",
};

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

/** A run of citation text; `italic` marks the parts a word processor italicises. */
type Segment = string | { italic: string };

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function toPlain(segments: Segment[]): string {
  return segments
    .map((segment) => (typeof segment === "string" ? segment : segment.italic))
    .join("");
}

function toHtml(segments: Segment[]): string {
  return segments
    .map((segment) =>
      typeof segment === "string"
        ? escapeHtml(segment)
        : `<em>${escapeHtml(segment.italic)}</em>`,
    )
    .join("");
}

/** Adds a full stop unless the text already ends in terminal punctuation. */
function terminate(value: string): string {
  return /[.!?]$/.test(value.trim()) ? value.trim() : `${value.trim()}.`;
}

/**
 * A title as it appears inside a citation. Trailing full stops are dropped
 * because each style supplies its own closing punctuation, but `?` and `!`
 * belong to the title and are kept.
 */
function titleText(title: string): string {
  return title.trim().replace(/\.+$/, "");
}

/** The full stop a style adds after a title — omitted if `?` or `!` closes it. */
function titleStop(title: string): string {
  return /[!?]$/.test(titleText(title)) ? "" : ".";
}

function parseAll(authors: string[]): ParsedName[] {
  return authors
    .map((name) => (name ?? "").trim())
    .filter(Boolean)
    .map(parseName);
}

function apa(source: CitationSource): Segment[] {
  const names = parseAll(source.authors);
  const bracket = ` [${DESIGNATION[source.level]}, ${INSTITUTION}]`;
  const tail = `. ${ARCHIVE_NAME}. ${source.url}`;

  // With no author, APA moves the title into the author position.
  if (names.length === 0) {
    return [
      { italic: titleText(source.title) },
      `${bracket}. (${source.year})${tail}`,
    ];
  }

  return [
    `${apaAuthors(names)} (${source.year}). `,
    { italic: titleText(source.title) },
    `${bracket}${tail}`,
  ];
}

function mla(source: CitationSource): Segment[] {
  const names = parseAll(source.authors);
  const lead = names.length > 0 ? `${terminate(mlaAuthors(names))} ` : "";

  return [
    lead,
    { italic: titleText(source.title) },
    `${titleStop(source.title)} ${source.year}. ${INSTITUTION}, ${DESIGNATION[source.level].toLowerCase()}. `,
    `${ARCHIVE_NAME}, ${source.url}.`,
  ];
}

function chicago(source: CitationSource): Segment[] {
  const names = parseAll(source.authors);
  const lead = names.length > 0 ? `${terminate(chicagoAuthors(names))} ` : "";

  // Unpublished work takes quotation marks, not italics.
  return [
    `${lead}"${terminate(titleText(source.title))}" `,
    `${CHICAGO_DESIGNATION[source.level]}, ${INSTITUTION}, ${source.year}. `,
    `${source.url}.`,
  ];
}

const FORMATTERS: Record<CitationStyle, (source: CitationSource) => Segment[]> = {
  apa,
  mla,
  chicago,
};

export function formatCitation(
  source: CitationSource,
  style: CitationStyle,
): Citation {
  const segments = FORMATTERS[style](source);
  const label = CITATION_STYLES.find((s) => s.id === style)?.label ?? style;

  return {
    style,
    label,
    text: toPlain(segments),
    html: toHtml(segments),
  };
}

export function formatAllCitations(source: CitationSource): Citation[] {
  return CITATION_STYLES.map(({ id }) => formatCitation(source, id));
}
