/**
 * Escapes a CSV cell value — wraps in quotes if it contains commas,
 * quotes, or newlines, and doubles any internal quotes.
 */
function escapeCSVCell(value: string): string {
  if (
    value.includes(",") ||
    value.includes('"') ||
    value.includes("\n") ||
    value.includes("\r")
  ) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Generates a CSV string from headers and row data.
 */
export function generateCSV(headers: string[], rows: string[][]): string {
  const headerLine = headers.map(escapeCSVCell).join(",");
  const dataLines = rows.map((row) =>
    row.map((cell) => escapeCSVCell(cell ?? "")).join(","),
  );
  return [headerLine, ...dataLines].join("\r\n");
}

/**
 * Triggers a browser download of a CSV string as a file.
 */
export function downloadCSV(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
