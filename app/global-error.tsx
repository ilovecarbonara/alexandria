"use client";

import Link from "next/link";

/**
 * Replaces the root layout entirely, so next/font and globals.css are both
 * unavailable here — the palette is inlined to match app/globals.css.
 */
const INK = "#1A1A18";
const INK_MUTED = "#5C5A54";
const INK_SUBTLE = "#86837B";
const PAGE = "#FBFAF7";
const BORDER = "#E5E0D8";
const PRIMARY = "#1B3A6B";

const SANS = "Inter, system-ui, -apple-system, sans-serif";
const SERIF = "'Source Serif 4', Georgia, serif";

const buttonBase: React.CSSProperties = {
  borderRadius: "8px",
  padding: "0.625rem 1.25rem",
  fontSize: "0.875rem",
  fontWeight: 500,
  fontFamily: SANS,
  textDecoration: "none",
  cursor: "pointer",
};

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en">
      <head>
        <title>Alexandria — Error</title>
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=Source+Serif+4:wght@400;600&display=swap"
          rel="stylesheet"
        />
        <style>{`
          body {
            margin: 0;
            background: ${PAGE};
            color: ${INK};
            font-family: ${SANS};
            -webkit-font-smoothing: antialiased;
          }
        `}</style>
      </head>
      <body>
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 1.5rem",
          }}
        >
          <div style={{ width: "100%", maxWidth: "30rem", textAlign: "center" }}>
            <p
              style={{
                fontFamily: SERIF,
                fontSize: "1.75rem",
                color: INK,
                margin: 0,
              }}
            >
              Alexandria
            </p>
            <div
              style={{
                width: "3rem",
                height: "1px",
                background: BORDER,
                margin: "1.5rem auto",
              }}
            />
            <h1
              style={{
                fontFamily: SERIF,
                fontSize: "1.5rem",
                fontWeight: 600,
                color: INK,
                margin: "0 0 0.75rem",
              }}
            >
              Something went wrong
            </h1>
            <p
              style={{
                fontSize: "0.9375rem",
                lineHeight: 1.6,
                color: INK_MUTED,
                margin: "0 0 0.5rem",
              }}
            >
              The page could not be loaded. You can try again, or return to the
              archive.
            </p>
            {error.digest && (
              <p
                style={{
                  fontSize: "0.75rem",
                  color: INK_SUBTLE,
                  margin: "0 0 1.5rem",
                  fontFamily: "ui-monospace, monospace",
                }}
              >
                Reference: {error.digest}
              </p>
            )}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.75rem",
                marginTop: "1.5rem",
              }}
            >
              <button
                onClick={unstable_retry}
                style={{
                  ...buttonBase,
                  background: PRIMARY,
                  color: "#fff",
                  border: "none",
                }}
              >
                Try again
              </button>
              <Link
                href="/"
                style={{
                  ...buttonBase,
                  background: "#fff",
                  border: `1px solid ${BORDER}`,
                  color: INK,
                }}
              >
                Return to the archive
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
