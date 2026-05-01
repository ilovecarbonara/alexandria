"use client";

import { useState, useRef, useEffect } from "react";
import { Button, Input, Select, Card } from "@/components/ui";
import { HashDisplay } from "@/components/ui";
import {
  THESIS_CATEGORIES,
  THESIS_LEVELS,
  SUBMISSION_TYPES,
  MAX_PDF_FILE_SIZE_MB,
} from "@/lib/constants";
import { getUserThesesForLinking, getCurrentUserFullName } from "@/lib/actions/theses";
import {
  MAX_AUTHORS,
  MAX_TITLE_LENGTH,
  MAX_AUTHOR_NAME_LENGTH,
  normalizeNameForComparison,
  validateAuthorList,
  validateTitle,
  validateAuthorName,
} from "@/lib/validation";

type FormState = {
  error?: string;
  success?: boolean;
  txHash?: string;
  sha256Hash?: string;
};

async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function RegisterThesisPage() {
  const [state, setState] = useState<FormState>({});
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [previousThesisId, setPreviousThesisId] = useState("");
  const [linkableTheses, setLinkableTheses] = useState<
    { id: string; title: string; submission_type: string; registered_at: string }[]
  >([]);
  const [ownerName, setOwnerName] = useState("");
  const [authorNames, setAuthorNames] = useState<string[]>([""]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    getUserThesesForLinking().then((result) => {
      if (result.data) setLinkableTheses(result.data);
    });
    getCurrentUserFullName().then((result) => {
      if (result.fullName) {
        setOwnerName(result.fullName);
        setAuthorNames([result.fullName]);
      }
    });
  }, []);

  function validateField(name: string, value: string): string | null {
    switch (name) {
      case "title":
        return validateTitle(value);
      default:
        return null;
    }
  }

  function handleFieldBlur(e: React.FocusEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setFieldErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  }

  function handleFieldChange(name: string, value: string) {
    if (touched[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
    }
  }

  function handleAuthorChange(index: number, value: string) {
    setAuthorNames((prev) => prev.map((name, i) => (i === index ? value : name)));
    const key = `author-${index}`;
    if (touched[key]) {
      setFieldErrors((prev) => ({ ...prev, [key]: validateAuthorName(value) }));
    }
  }

  function handleAuthorBlur(index: number, value: string) {
    const key = `author-${index}`;
    setTouched((prev) => ({ ...prev, [key]: true }));
    setFieldErrors((prev) => ({ ...prev, [key]: validateAuthorName(value) }));
  }

  function addAuthor() {
    if (authorNames.length >= MAX_AUTHORS) return;
    setAuthorNames((prev) => [...prev, ""]);
  }

  function removeAuthor(index: number) {
    if (index === 0) return;
    setAuthorNames((prev) => prev.filter((_, i) => i !== index));
    setFieldErrors((prev) => {
      const next: Record<string, string | null> = {};
      for (const [key, value] of Object.entries(prev)) {
        const match = /^author-(\d+)$/.exec(key);
        if (!match) {
          next[key] = value;
          continue;
        }

        const authorIndex = Number(match[1]);
        if (authorIndex < index) next[key] = value;
        if (authorIndex > index) next[`author-${authorIndex - 1}`] = value;
      }
      return next;
    });
    setTouched((prev) => {
      const next: Record<string, boolean> = {};
      for (const [key, value] of Object.entries(prev)) {
        const match = /^author-(\d+)$/.exec(key);
        if (!match) {
          next[key] = value;
          continue;
        }

        const authorIndex = Number(match[1]);
        if (authorIndex < index) next[key] = value;
        if (authorIndex > index) next[`author-${authorIndex - 1}`] = value;
      }
      return next;
    });
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setFileName(null);
      setHash(null);
      return;
    }
    if (file.type !== "application/pdf") {
      setState({ error: "Only PDF files are accepted." });
      setFileName(null);
      setHash(null);
      return;
    }
    if (file.size > MAX_PDF_FILE_SIZE_MB * 1024 * 1024) {
      setState({ error: `File size exceeds the ${MAX_PDF_FILE_SIZE_MB} MB limit.` });
      setFileName(null);
      setHash(null);
      return;
    }
    setFileName(file.name);
    setState({});
    const sha256 = await hashFile(file);
    setHash(sha256);
    // Clear the file input — PDF is not needed after hashing
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState({});
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const title = (formData.get("title") as string)?.trim();
    const trimmedAuthors = authorNames.map((name) => name.trim());
    const thesisLevel = formData.get("thesisLevel") as string;
    const thesisCategory = formData.get("thesisCategory") as string;
    const submissionType = formData.get("submissionType") as string;

    if (!title || trimmedAuthors.some((name) => !name) || !thesisLevel || !thesisCategory || !submissionType) {
      setState({ error: "All fields are required." });
      setLoading(false);
      return;
    }

    const authorError = validateAuthorList(trimmedAuthors);
    if (authorError) {
      setState({ error: authorError });
      setLoading(false);
      return;
    }

    if (
      ownerName &&
      !trimmedAuthors.some(
        (name) => normalizeNameForComparison(name) === normalizeNameForComparison(ownerName),
      )
    ) {
      setState({ error: "You must be listed as an author of your own thesis." });
      setLoading(false);
      return;
    }

    if (!hash) {
      setState({ error: "Please upload a PDF file first." });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/theses/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          authorNames: trimmedAuthors,
          thesisLevel,
          thesisCategory,
          submissionType,
          sha256Hash: hash,
          previousThesisId: previousThesisId || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setState({ error: data.error || "Registration failed." });
      } else {
        setState({ success: true, txHash: data.txHash, sha256Hash: hash });
      }
    } catch {
      setState({ error: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  if (state.success) {
    return (
      <div className="mx-auto max-w-xl py-12 px-4">
        <Card>
          <h1 className="font-heading text-2xl text-white mb-6">
            Registration Successful
          </h1>
          <div className="space-y-4 font-mono text-sm">
            <div>
              <span className="text-white/60">SHA-256 Hash:</span>
              <div className="mt-1">
                <HashDisplay hash={state.sha256Hash!} />
              </div>
            </div>
            <div>
              <span className="text-white/60">Transaction Hash:</span>
              <div className="mt-1">
                <a
                  href={`https://sepolia.etherscan.io/tx/${state.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-hash hover:underline"
                >
                  <HashDisplay hash={state.txHash!} />
                </a>
              </div>
            </div>
            <p className="text-white/60 text-xs">
              Your thesis has been registered on the Sepolia blockchain. The
              status is currently pending and will be reviewed by an
              administrator.
            </p>
            <p className="text-white/40 text-xs border-l-2 border-accent/40 pl-3">
              Your thesis will undergo an automated similarity review. Check
              your dashboard for status updates.
            </p>
            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => {
                  setState({});
                  setHash(null);
                  setFileName(null);
                  setPreviousThesisId("");
                  setAuthorNames(ownerName ? [ownerName] : [""]);
                }}
              >
                Register Another
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  window.open(
                    `https://sepolia.etherscan.io/tx/${state.txHash}`,
                    "_blank",
                  );
                }}
              >
                View on Etherscan
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl py-12 px-4">
      <Card>
        <h1 className="font-heading text-2xl text-white mb-6">
          Register Thesis
        </h1>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* PDF Upload */}
          <div className="flex flex-col gap-1">
            <label className="text-sm text-white/60 font-mono">
              Upload PDF
            </label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => fileRef.current?.click()}
              >
                Choose File
              </Button>
              <span className="text-sm text-white/60 font-mono truncate">
                {fileName || "No file selected"}
              </span>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
            {hash && (
              <div className="mt-2 text-xs text-white/40 font-mono">
                SHA-256: <HashDisplay hash={hash} />
              </div>
            )}
          </div>

          <Input
            id="title"
            name="title"
            label="Thesis Title"
            placeholder="Enter thesis title"
            maxLength={MAX_TITLE_LENGTH}
            onBlur={handleFieldBlur}
            onChange={(e) => handleFieldChange("title", e.target.value)}
            error={fieldErrors.title ?? undefined}
            required
          />

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-white/60 font-mono">Authors</span>
              <Button
                type="button"
                variant="secondary"
                className="px-2 py-1 text-xs"
                onClick={addAuthor}
                disabled={authorNames.length >= MAX_AUTHORS}
              >
                Add Author
              </Button>
            </div>
            {authorNames.map((name, index) => (
              <div key={index} className="flex items-start gap-2">
                <Input
                  id={`author-${index}`}
                  name={`author-${index}`}
                  label={index === 0 ? "First Author" : `Author ${index + 1}`}
                  placeholder="Enter author name"
                  maxLength={MAX_AUTHOR_NAME_LENGTH}
                  value={name}
                  disabled={index === 0}
                  onChange={(e) => handleAuthorChange(index, e.target.value)}
                  onBlur={(e) => handleAuthorBlur(index, e.target.value)}
                  error={fieldErrors[`author-${index}`] ?? undefined}
                  required
                  className={index === 0 ? "opacity-70" : ""}
                />
                {index > 0 && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="mt-6 px-2 py-2 text-xs"
                    onClick={() => removeAuthor(index)}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Select
            id="thesisLevel"
            name="thesisLevel"
            label="Thesis Level"
            options={THESIS_LEVELS.map((l) => ({
              value: l.value,
              label: l.label,
            }))}
            required
          />

          <Select
            id="thesisCategory"
            name="thesisCategory"
            label="Category"
            options={THESIS_CATEGORIES.map((c) => ({ value: c, label: c }))}
            required
          />

          <div className="flex flex-col gap-1">
            <span className="text-sm text-white/60 font-mono">
              Submission Type
            </span>
            <div className="flex gap-6">
              {SUBMISSION_TYPES.map((t) => (
                <label
                  key={t.value}
                  className="flex items-center gap-2 font-mono text-sm text-white/90 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="submissionType"
                    value={t.value}
                    required
                    className="accent-accent"
                  />
                  {t.label}
                </label>
              ))}
            </div>
          </div>

          {linkableTheses.length > 0 && (
            <Select
              id="previousThesisId"
              label="This is a revision of"
              placeholder="None — new registration"
              value={previousThesisId}
              onChange={(e) => setPreviousThesisId(e.target.value)}
              options={linkableTheses.map((t) => ({
                value: t.id,
                label: `${t.title.length > 50 ? t.title.slice(0, 50) + "…" : t.title}  [${t.submission_type === "final" ? "Final" : "Draft"}]  ${new Date(t.registered_at).toLocaleDateString()}`,
              }))}
            />
          )}

          {state.error && (
            <p className="text-sm text-dispute font-mono">{state.error}</p>
          )}

          <Button type="submit" disabled={loading || !hash} className="w-full">
            {loading ? "Registering on blockchain…" : "Register Thesis"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
