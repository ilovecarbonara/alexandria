import { getAuthorNames, type ThesisAuthor } from "@/lib/authors";

interface AuthorNamesStackProps {
  authors: readonly ThesisAuthor[] | null | undefined;
  label?: string;
}

export function AuthorNamesStack({
  authors,
  label = "Authors",
}: AuthorNamesStackProps) {
  const names = getAuthorNames(authors);

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-ink-subtle">{label}</span>
      {names.length > 0 ? (
        <p className="text-sm text-ink wrap-break-word">
          {names.join(", ")}
        </p>
      ) : (
        <span className="text-sm text-ink">Unknown author</span>
      )}
    </div>
  );
}