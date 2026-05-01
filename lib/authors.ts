export interface ThesisAuthor {
  name: string;
  position: number;
}

export function sortThesisAuthors(
  authors: readonly ThesisAuthor[] | null | undefined,
): ThesisAuthor[] {
  return [...(authors ?? [])].sort((a, b) => a.position - b.position);
}

export function getAuthorNames(
  authors: readonly ThesisAuthor[] | null | undefined,
): string[] {
  return sortThesisAuthors(authors).map((author) => author.name);
}

export function formatAuthorNames(
  authors: readonly ThesisAuthor[] | null | undefined,
): string {
  const names = getAuthorNames(authors);
  return names.length > 0 ? names.join(", ") : "Unknown author";
}

export function formatAuthorNamesForExport(
  authors: readonly ThesisAuthor[] | null | undefined,
): string {
  const names = getAuthorNames(authors);
  return names.length > 0 ? names.join("; ") : "Unknown author";
}
