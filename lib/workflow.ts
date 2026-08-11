import type {
  ReviewDecision,
  ReviewerRole,
  ThesisStatus,
  UserRole,
} from "@/lib/supabase/types";
import { STATUS_LABELS } from "@/lib/constants";

/**
 * The review pipeline, as a transition matrix.
 *
 *   student submits -> adviser reviews -> librarian approves -> public registry
 *
 * Every status change in the system routes through `assertTransition`. Nothing
 * writes `theses.status` directly.
 *
 *   draft              Draft submission. Skips review entirely; visible only to
 *                      its owner and the librarian.
 *   pending_adviser    Final submitted, sitting in the assigned adviser's queue.
 *   returned           Sent back to the student with comments. Revisable.
 *   pending_librarian  Adviser endorsed it; sitting in the librarian's queue.
 *   accepted           Librarian approved. Published to the public registry.
 *   rejected           Terminal.
 *   flagged            Published, then disputed. Post-publication only.
 */
const TRANSITIONS: Record<UserRole, Partial<Record<ThesisStatus, ThesisStatus[]>>> = {
  // A student can only push a returned submission back into review.
  student: {
    returned: ["pending_adviser"],
  },

  // An adviser sees a submission exactly once per revision: endorse or return.
  adviser: {
    pending_adviser: ["pending_librarian", "returned"],
  },

  // The librarian is the final gate, and retains post-publication control.
  librarian: {
    pending_librarian: ["accepted", "rejected", "returned"],
    accepted: ["flagged", "rejected"],
    flagged: ["accepted", "rejected"],
    draft: ["rejected"],
  },
};

export type TransitionResult = { ok: true } | { ok: false; error: string };

export function canTransition(
  role: UserRole,
  from: ThesisStatus,
  to: ThesisStatus,
): boolean {
  return TRANSITIONS[role][from]?.includes(to) ?? false;
}

/** Every status this role may move a thesis to from its current state. */
export function allowedTransitions(
  role: UserRole,
  from: ThesisStatus,
): ThesisStatus[] {
  return TRANSITIONS[role][from] ?? [];
}

/**
 * Validates a transition and returns a message suitable for showing the user.
 * Distinguishes "you can never do this" from "not from this state", because
 * the second usually means someone else already acted on the thesis.
 */
export function assertTransition(
  role: UserRole,
  from: ThesisStatus,
  to: ThesisStatus,
): TransitionResult {
  if (canTransition(role, from, to)) return { ok: true };

  const reachable = allowedTransitions(role, from);
  if (reachable.length === 0) {
    return {
      ok: false,
      error: `This submission is ${STATUS_LABELS[from].toLowerCase()} and is not awaiting action from you.`,
    };
  }

  return {
    ok: false,
    error: `Cannot move a submission from ${STATUS_LABELS[from].toLowerCase()} to ${STATUS_LABELS[to].toLowerCase()}.`,
  };
}

// ---------------------------------------------------------------------------
// Decisions
// ---------------------------------------------------------------------------

/** The status a given review decision lands the thesis in. */
export const DECISION_TARGET: Record<ReviewDecision, ThesisStatus> = {
  endorsed: "pending_librarian",
  returned: "returned",
  approved: "accepted",
  rejected: "rejected",
};

/** Decisions that require written comments (mirrored by a DB CHECK). */
export const DECISION_REQUIRES_COMMENTS: Record<ReviewDecision, boolean> = {
  endorsed: false,
  returned: true,
  approved: false,
  rejected: true,
};

export function reviewerRoleFor(role: UserRole): ReviewerRole | null {
  if (role === "adviser") return "adviser";
  if (role === "librarian") return "librarian";
  return null;
}

// ---------------------------------------------------------------------------
// Derived state for the UI
// ---------------------------------------------------------------------------

export function isPublic(status: ThesisStatus): boolean {
  return status === "accepted" || status === "flagged";
}

/** In a queue waiting on someone, as opposed to resting with the student. */
export function isAwaitingReview(status: ThesisStatus): boolean {
  return status === "pending_adviser" || status === "pending_librarian";
}

/** The student can act on it: upload a revision and resubmit. */
export function isActionableByStudent(status: ThesisStatus): boolean {
  return status === "returned";
}

export function isTerminal(status: ThesisStatus): boolean {
  return status === "rejected";
}

/**
 * The four-step tracker shown to students. `flagged` is deliberately treated as
 * published — a dispute does not un-publish the record.
 */
export type TrackerStep = "submitted" | "adviser" | "librarian" | "published";

export const TRACKER_STEPS: readonly TrackerStep[] = [
  "submitted",
  "adviser",
  "librarian",
  "published",
];

export const TRACKER_LABELS: Record<TrackerStep, string> = {
  submitted: "Submitted",
  adviser: "Adviser Review",
  librarian: "Librarian Review",
  published: "Published",
};

export type TrackerState = {
  /** Index into TRACKER_STEPS; every earlier step is complete. */
  current: number;
  /** The pipeline stopped here rather than advancing. */
  halted: boolean;
};

export function trackerState(status: ThesisStatus): TrackerState {
  switch (status) {
    case "draft":
      return { current: 0, halted: false };
    case "pending_adviser":
      return { current: 1, halted: false };
    case "returned":
      return { current: 1, halted: true };
    case "pending_librarian":
      return { current: 2, halted: false };
    case "accepted":
    case "flagged":
      return { current: 3, halted: false };
    case "rejected":
      return { current: 2, halted: true };
  }
}
