"use client";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | "ellipsis-start" | "ellipsis-end")[] = [];

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push("ellipsis-start");
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push("ellipsis-end");
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-center gap-1 border-t border-border px-6 py-4">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="rounded-md px-3 py-1.5 text-xs text-ink-muted transition-colors hover:bg-raised disabled:cursor-not-allowed disabled:opacity-30"
      >
        Prev
      </button>

      {pages.map((page) =>
        typeof page === "string" ? (
          <span
            key={page}
            className="px-2 text-xs text-ink-subtle"
          >
            …
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`min-w-8 rounded-md px-2 py-1.5 text-xs transition-colors ${
              page === currentPage
                ? "bg-primary text-ink"
                : "text-ink-muted hover:bg-raised"
            }`}
          >
            {page}
          </button>
        ),
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="rounded-md px-3 py-1.5 text-xs text-ink-muted transition-colors hover:bg-raised disabled:cursor-not-allowed disabled:opacity-30"
      >
        Next
      </button>
    </div>
  );
}
