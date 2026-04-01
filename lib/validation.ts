export const MAX_TITLE_LENGTH = 500;
export const MAX_AUTHOR_NAME_LENGTH = 200;
export const MAX_REASON_LENGTH = 2000;
export const MAX_FULL_NAME_LENGTH = 200;

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
