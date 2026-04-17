"use client";

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
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Playfair+Display:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <style>{`
          body {
            margin: 0;
            background: #0D0F12;
            color: rgba(255, 255, 255, 0.9);
            font-family: 'DM Mono', monospace;
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
          <div
            style={{
              width: "100%",
              maxWidth: "28rem",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "3rem",
                color: "rgba(255, 255, 255, 0.2)",
                marginBottom: "1.5rem",
              }}
            >
              !
            </div>
            <h1
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "1.5rem",
                color: "#fff",
                marginBottom: "1rem",
              }}
            >
              Something went wrong
            </h1>
            <p
              style={{
                fontSize: "0.875rem",
                color: "rgba(255, 255, 255, 0.5)",
                marginBottom: "0.5rem",
              }}
            >
              A critical error occurred. You can try again or return to the home
              page.
            </p>
            {error.digest && (
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "rgba(255, 255, 255, 0.3)",
                  marginBottom: "1.5rem",
                  fontFamily: "'DM Mono', monospace",
                }}
              >
                Digest: {error.digest}
              </p>
            )}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.75rem",
              }}
            >
              <button
                onClick={unstable_retry}
                style={{
                  background: "#4A90D9",
                  color: "#fff",
                  border: "none",
                  borderRadius: "2px",
                  padding: "0.625rem 1.25rem",
                  fontSize: "0.875rem",
                  cursor: "pointer",
                  fontFamily: "'DM Mono', monospace",
                }}
              >
                Try again
              </button>
              <a
                href="/"
                style={{
                  border: "1px solid #222733",
                  borderRadius: "2px",
                  padding: "0.625rem 1.25rem",
                  fontSize: "0.875rem",
                  color: "rgba(255, 255, 255, 0.7)",
                  textDecoration: "none",
                  fontFamily: "'DM Mono', monospace",
                }}
              >
                Return Home
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
