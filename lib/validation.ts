// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const MAX_TITLE_LENGTH = 150;
export const MIN_TITLE_LENGTH = 10;
export const MIN_TITLE_LETTERS = 10;
export const MAX_AUTHOR_NAME_LENGTH = 50;
export const MAX_REASON_LENGTH = 2000;
export const MAX_FULL_NAME_LENGTH = 50;
export const MIN_FULL_NAME_LETTERS = 4;
export const MIN_NAME_PART_LENGTH = 2;
export const MAX_EMAIL_LENGTH = 254;
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 72;
export const MAX_ACTIVITY_ACTION_LENGTH = 200;

// ---------------------------------------------------------------------------
// Shared patterns (pre-compiled for reuse)
// ---------------------------------------------------------------------------

/** Matches a single letter including common accented characters. */
const LETTER = /[A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF]/;

/** Letters (including accented), spaces, hyphens, apostrophes, and periods. */
export const FULL_NAME_PATTERN =
  /^[A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF\s'.\-]+$/;

/** HTML5 pattern attribute equivalent (no delimiters/flags). */
export const FULL_NAME_HTML_PATTERN =
  "[A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF\\s'.\\-]+";

/** Canonical UUID v4 format (any version accepted). */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Strict YYYY-MM-DD format. */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ---------------------------------------------------------------------------
// Name validation (shared core)
// ---------------------------------------------------------------------------

interface NameValidationOptions {
  /** The label shown in error messages (e.g. "Full name", "Author name"). */
  label: string;
  maxLength: number;
  minLetters: number;
  minPartLength: number;
  requireMultipleWords: boolean;
}

function validateName(name: string, opts: NameValidationOptions): string | null {
  if (!name || !name.trim()) return `${opts.label} is required.`;

  const trimmed = name.trim();

  if (trimmed.length > opts.maxLength)
    return `${opts.label} must be ${opts.maxLength} characters or less.`;

  if (!FULL_NAME_PATTERN.test(trimmed))
    return `${opts.label} must contain only letters, hyphens, apostrophes, periods, and spaces.`;

  if (!LETTER.test(trimmed[0]) || !LETTER.test(trimmed[trimmed.length - 1]))
    return `Please enter a valid ${opts.label.toLowerCase()}.`;

  const letterCount = (trimmed.match(new RegExp(LETTER.source, "g")) || [])
    .length;
  if (letterCount < opts.minLetters)
    return `Please enter a valid ${opts.label.toLowerCase()}.`;

  // No consecutive special characters (e.g. --, .., '-)
  if (/['.\-]{2,}/.test(trimmed))
    return `Please enter a valid ${opts.label.toLowerCase()}.`;

  const words = trimmed.split(/\s+/);

  if (opts.requireMultipleWords && words.length < 2)
    return `Please enter your full name (first and last name).`;

  if (words.some((w) => w.length < opts.minPartLength))
    return `Please enter a valid ${opts.label.toLowerCase()}.`;

  return null;
}

// ---------------------------------------------------------------------------
// Public validators
// ---------------------------------------------------------------------------

export function validateFullName(name: string): string | null {
  return validateName(name, {
    label: "Full name",
    maxLength: MAX_FULL_NAME_LENGTH,
    minLetters: MIN_FULL_NAME_LETTERS,
    minPartLength: MIN_NAME_PART_LENGTH,
    requireMultipleWords: true,
  });
}

export function validateAuthorName(name: string): string | null {
  return validateName(name, {
    label: "Author name",
    maxLength: MAX_AUTHOR_NAME_LENGTH,
    minLetters: MIN_FULL_NAME_LETTERS,
    minPartLength: MIN_NAME_PART_LENGTH,
    requireMultipleWords: true,
  });
}

// ---------------------------------------------------------------------------
// Password validation
// ---------------------------------------------------------------------------

export function validatePassword(password: string): string | null {
  if (!password) return "Password is required.";

  if (password.length < MIN_PASSWORD_LENGTH)
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;

  if (password.length > MAX_PASSWORD_LENGTH)
    return `Password must be ${MAX_PASSWORD_LENGTH} characters or less.`;

  if (!/[a-z]/.test(password))
    return "Password must contain at least one lowercase letter.";

  if (!/[A-Z]/.test(password))
    return "Password must contain at least one uppercase letter.";

  if (!/\d/.test(password))
    return "Password must contain at least one digit.";

  // Any non-alphanumeric character counts as a special character.
  if (!/[^A-Za-z0-9]/.test(password))
    return "Password must contain at least one special character.";

  return null;
}

// ---------------------------------------------------------------------------
// Title validation
// ---------------------------------------------------------------------------

/** Matches a single letter or digit (for title boundary checks). */
const ALNUM = /[A-Za-z0-9\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF]/;

export function validateTitle(title: string): string | null {
  if (!title || !title.trim()) return "Title is required.";

  const trimmed = title.trim();

  if (trimmed.length < MIN_TITLE_LENGTH)
    return `Title must be at least ${MIN_TITLE_LENGTH} characters.`;

  if (trimmed.length > MAX_TITLE_LENGTH)
    return `Title must be ${MAX_TITLE_LENGTH} characters or less.`;

  // Must start and end with a letter or digit
  if (!ALNUM.test(trimmed[0]) || !ALNUM.test(trimmed[trimmed.length - 1]))
    return "Title must start and end with a letter or digit.";

  // At least MIN_TITLE_LETTERS letter characters
  const letterCount = (
    trimmed.match(/[A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF]/g) || []
  ).length;
  if (letterCount < MIN_TITLE_LETTERS)
    return "Title must contain at least 10 letter characters.";

  // No runs of 2+ consecutive special (non-alphanumeric, non-space) characters
  if (/[^A-Za-z0-9\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF\s]{2,}/.test(trimmed))
    return "Title must not contain consecutive special characters.";

  return null;
}

// ---------------------------------------------------------------------------
// UUID validation
// ---------------------------------------------------------------------------

export function validateUUID(id: string): boolean {
  return UUID_RE.test(id);
}

// ---------------------------------------------------------------------------
// Date range validation
// ---------------------------------------------------------------------------

function isValidCalendarDate(dateStr: string): boolean {
  if (!DATE_RE.test(dateStr)) return false;
  // Parse parts and verify the date components round-trip correctly.
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return (
    date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
  );
}

export function validateDateRange(
  dateFrom?: string,
  dateTo?: string,
): string | null {
  if (!dateFrom && !dateTo) return null;

  if (dateFrom && !isValidCalendarDate(dateFrom))
    return "Start date must be a valid date in YYYY-MM-DD format.";

  if (dateTo && !isValidCalendarDate(dateTo))
    return "End date must be a valid date in YYYY-MM-DD format.";

  const now = new Date();
  // Compare date-only (strip time)
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  if (dateFrom && dateFrom > todayStr)
    return "Start date must not be in the future.";

  if (dateTo && dateTo > todayStr)
    return "End date must not be in the future.";

  if (dateFrom && dateTo && dateFrom > dateTo)
    return "Start date must not be after end date.";

  return null;
}

// ---------------------------------------------------------------------------
// Sanitization
// ---------------------------------------------------------------------------

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
