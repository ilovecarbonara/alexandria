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
      <span className="font-mono text-xs text-white/40">{label}</span>
      {names.length > 0 ? (
        <p className="font-mono text-sm text-white/90 wrap-break-word">
          {names.join(", ")}
        </p>
      ) : (
        <span className="font-mono text-sm text-white/90">Unknown author</span>
      )}
    </div>
  );
}