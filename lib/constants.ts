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

export const THESIS_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "flagged", label: "Flagged" },
  { value: "rejected", label: "Rejected" },
] as const;

export const DEFAULT_TITLE_ALERT_THRESHOLD = 0.75;
