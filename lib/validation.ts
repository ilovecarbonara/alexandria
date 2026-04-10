export const MAX_TITLE_LENGTH = 500;
export const MAX_AUTHOR_NAME_LENGTH = 200;
export const MAX_REASON_LENGTH = 2000;
export const MAX_FULL_NAME_LENGTH = 50;
export const MIN_FULL_NAME_LETTERS = 4;
export const MIN_NAME_PART_LENGTH = 2;
export const MAX_EMAIL_LENGTH = 254;
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 72;

/** Matches a single letter including common accented characters. */
const LETTER = /[A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF]/;

/** Letters (including accented), spaces, hyphens, apostrophes, and periods. */
export const FULL_NAME_PATTERN = /^[A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF\s'.\-]+$/;

/** HTML5 pattern attribute equivalent (no delimiters/flags). */
export const FULL_NAME_HTML_PATTERN = "[A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF\\s'.\\-]+";

export function validateFullName(name: string): string | null {
  if (!name || !name.trim()) return "Full name is required.";

  const trimmed = name.trim();

  if (trimmed.length > MAX_FULL_NAME_LENGTH)
    return `Name must be ${MAX_FULL_NAME_LENGTH} characters or less.`;

  if (!FULL_NAME_PATTERN.test(trimmed))
    return "Name must contain only letters, hyphens, apostrophes, periods, and spaces.";

  // Must start and end with a letter
  if (!LETTER.test(trimmed[0]) || !LETTER.test(trimmed[trimmed.length - 1]))
    return "Please enter a valid full name.";

  // At least 4 letter characters total
  const letterCount = (trimmed.match(new RegExp(LETTER.source, "g")) || []).length;
  if (letterCount < MIN_FULL_NAME_LETTERS)
    return "Please enter a valid full name.";

  // No consecutive special characters (e.g. --, .., '-)
  if (/['.\-]{2,}/.test(trimmed))
    return "Please enter a valid full name.";

  // At least 2 words (first and last name)
  const words = trimmed.split(/\s+/);
  if (words.length < 2)
    return "Please enter your full name (first and last name).";

  // Each word must be at least 2 characters
  if (words.some((w) => w.length < MIN_NAME_PART_LENGTH))
    return "Please enter a valid full name.";

  return null;
}

/**
 * Strips SQL ILIKE wildcards (%, _) and PostgREST operator separators (.),
 * removes common injection characters, trims, and collapses whitespace.
 */
export function sanitizeSearchTerm(term: string): string {
  return term
    .replace(/[%_.,()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
