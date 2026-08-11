import type {
  ReviewDecision,
  ThesisStatus,
  UserRole,
} from "@/lib/supabase/types";

export const THESIS_CATEGORIES = [
  "Medical",
  "Technology",
  "Education",
  "Law",
  "Engineering",
  "Blockchain",
  "Business",
  "Science",
  "Arts",
  "Social Sciences",
] as const;

export type ThesisCategory = (typeof THESIS_CATEGORIES)[number];

export const THESIS_LEVELS = [
  { value: "undergraduate", label: "Undergraduate" },
  { value: "masteral", label: "Masteral" },
  { value: "doctoral", label: "Doctoral" },
] as const;

export const SUBMISSION_TYPES = [
  { value: "draft", label: "Draft" },
  { value: "final", label: "Final" },
] as const;

export const PAGE_SIZE = 15;

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

export const USER_ROLES = [
  { value: "student", label: "Student" },
  { value: "adviser", label: "Research Adviser" },
  { value: "librarian", label: "University Librarian" },
] as const;

/** Roles a person may request for themselves at sign-up. */
export const REQUESTABLE_ROLES = [
  { value: "student", label: "Student" },
  { value: "adviser", label: "Research Adviser" },
] as const;

export const ROLE_LABELS: Record<UserRole, string> = {
  student: "Student",
  adviser: "Research Adviser",
  librarian: "University Librarian",
};

/** Where each role lands after sign-in, and the area it is confined to. */
export const ROLE_HOME: Record<UserRole, string> = {
  student: "/dashboard",
  adviser: "/adviser",
  librarian: "/admin",
};

// ---------------------------------------------------------------------------
// Review pipeline
// ---------------------------------------------------------------------------

export const THESIS_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "pending_adviser", label: "Awaiting Adviser" },
  { value: "returned", label: "Returned for Revision" },
  { value: "pending_librarian", label: "Awaiting Librarian" },
  { value: "accepted", label: "Published" },
  { value: "rejected", label: "Rejected" },
  { value: "flagged", label: "Flagged" },
] as const;

export const STATUS_LABELS: Record<ThesisStatus, string> = {
  draft: "Draft",
  pending_adviser: "Awaiting Adviser",
  returned: "Returned for Revision",
  pending_librarian: "Awaiting Librarian",
  accepted: "Published",
  rejected: "Rejected",
  flagged: "Flagged",
};

/**
 * Statuses visible to the public registry. Everything else is limited to the
 * thesis's stakeholders (submitter, matched co-authors, adviser, librarian).
 */
export const PUBLIC_STATUSES: readonly ThesisStatus[] = ["accepted", "flagged"];

export const REVIEW_DECISION_LABELS: Record<ReviewDecision, string> = {
  endorsed: "Endorsed to librarian",
  returned: "Returned for revision",
  approved: "Approved and published",
  rejected: "Rejected",
};

export const DEFAULT_TITLE_ALERT_THRESHOLD = 0.5;
export const DEFAULT_AUTO_FLAG_THRESHOLD = 0.75;

export const MAX_RESOLUTION_NOTES_LENGTH = 2000;
export const MAX_REVIEW_COMMENTS_LENGTH = 2000;

// ---------------------------------------------------------------------------
// Manuscript archive
// ---------------------------------------------------------------------------

export const MAX_PDF_FILE_SIZE_MB = 25;
export const MAX_PDF_FILE_SIZE_BYTES = MAX_PDF_FILE_SIZE_MB * 1024 * 1024;

/** Private Supabase Storage bucket holding archived manuscripts. */
export const THESIS_BUCKET = "theses";

/** Staged uploads are discarded if registration never completes. */
export const STAGED_UPLOAD_TTL_HOURS = 24;
