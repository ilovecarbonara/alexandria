"use client";

import { useState, useRef } from "react";
import { Button, Input, Select, Card } from "@/components/ui";
import { HashDisplay } from "@/components/ui";
import {
  THESIS_CATEGORIES,
  THESIS_LEVELS,
  SUBMISSION_TYPES,
} from "@/lib/constants";

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
    const authorName = (formData.get("authorName") as string)?.trim();
    const thesisLevel = formData.get("thesisLevel") as string;
    const thesisCategory = formData.get("thesisCategory") as string;
    const submissionType = formData.get("submissionType") as string;

    if (!title || !authorName || !thesisLevel || !thesisCategory || !submissionType) {
      setState({ error: "All fields are required." });
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
          authorName,
          thesisLevel,
          thesisCategory,
          submissionType,
          sha256Hash: hash,
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
            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => {
                  setState({});
                  setHash(null);
                  setFileName(null);
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
            required
          />

          <Input
            id="authorName"
            name="authorName"
            label="Author Name"
            placeholder="Enter author name"
            required
          />

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
