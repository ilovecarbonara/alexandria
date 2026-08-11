# Design System — Academic Archive

Alexandria should read as a university library catalogue: warm, printed, unhurried. Light only — there is deliberately no dark mode. The previous dark, mono-everything system read as a crypto product; this one reads as an institution.

Tokens live in `app/globals.css` under `:root` and `@theme inline`. Tailwind v4 is CSS-first; there is no `tailwind.config.*` and none should be added.

## Colors

### Surfaces
```
--color-page          #FBFAF7   ivory / parchment — the page ground
--color-surface       #FFFFFF   cards, panels
--color-raised        #F4F1EA   table headers, wells, hover fills
--color-sidebar       #F7F5F0
```

### Rules
```
--color-border        #E5E0D8   default 1px rules
--color-border-strong #CFC8BB   hover and emphasis
```

### Ink
```
--color-ink           #1A1A18   body text
--color-ink-muted     #5C5A54   secondary text, labels
--color-ink-subtle    #86837B   captions, metadata, placeholders
```

### Action
```
--color-primary       #1B3A6B   deep academic navy — buttons, links, active nav
--color-primary-hover #16305A
--color-primary-soft  #EAF0F9   soft fills, active nav background
```

### Accent
```
--color-accent        #A67C2E   muted gold — rules, eyebrow labels, step markers
--color-accent-soft   #FBF3E2
```
Gold is for marks and rules. **Never a large fill**, never a button.

### State
```
--color-success  #2F6B4F   --color-success-soft  #E8F2EC
--color-warning  #8A6D1F   --color-warning-soft  #FBF2DC
--color-danger   #9B2C2C   --color-danger-soft   #FAECEC
```

### Status mapping
| Status | Style |
| --- | --- |
| `draft` | `bg-raised text-ink-muted` |
| `pending_adviser` | `bg-warning-soft text-warning` |
| `returned` | `bg-accent-soft text-accent` |
| `pending_librarian` | `bg-primary-soft text-primary` |
| `accepted` | `bg-success-soft text-success` |
| `rejected` / `flagged` | `bg-danger-soft text-danger` |

## Typography

| Family | Used for | Token |
| --- | --- | --- |
| **Source Serif 4** | Headings, thesis titles | `font-heading` |
| **Inter** | Body, labels, tables, forms, navigation — everything meant to be read | default (`font-sans`) |
| **JetBrains Mono** | Hashes and transaction ids **only** | `font-mono` |

Loaded via `next/font/google` in `app/layout.tsx`. `h1`–`h3` pick up the serif automatically from `globals.css`.

Mono as the body font was the single largest source of the old "technical" feel. It survives in exactly two places: `HashDisplay` and the certificate's fingerprint fields.

## Geometry & elevation

```
--radius-sm  4px    inputs, chips, small controls
--radius     8px    buttons, cards, panels
--radius-lg  12px   large cards, modals
```

```
--shadow-card  subtle, for cards and buttons at rest
--shadow-pop   for dropdowns, popovers, modals
```

## Rules

- **No gradients.** No glows, no neon, no glassmorphism.
- **Colour communicates state**, never decoration.
- Two elevation levels only — `shadow-card` and `shadow-pop`.
- Generous whitespace. Sections breathe; density is for tables only.
- Every interactive element gets the global focus ring (`globals.css` sets it once for `a, button, input, select, textarea, summary, [tabindex]`). The palette is low-contrast, so this matters.
- Radios inherit `accent-color: var(--color-primary)` globally; checkboxes use the `.cb` class.

## Component patterns

- **Card** — `rounded-lg border border-border bg-surface p-6 shadow-card`
- **Button** — `rounded-md px-4 py-2 text-sm font-medium`
  - `primary`: `bg-primary text-white shadow-card hover:bg-primary-hover`
  - `secondary`: `bg-surface text-ink border border-border shadow-card hover:bg-raised`
  - `danger`: `bg-danger text-white`
  - `danger-outline`: transparent, `border-danger/40` — used for sign-out
  - `ghost`: transparent, `hover:bg-raised`
- **StatusChip** — soft-filled pill: `rounded-full px-2.5 py-1 text-xs font-medium`, labelled from `STATUS_LABELS`
- **HashDisplay** — `font-mono text-ink-muted`, truncated `8…8`, click to copy
- **Field** — uppercase tracked label in `text-ink-subtle` over the value in `text-ink`
- **Sidebar** — light `bg-sidebar`, active item `bg-primary-soft font-medium text-primary`
- **Section rule** — a 12–16px `h-px bg-accent` bar under a heading, the one recurring gold mark

### Layouts
- **Archive browse** is a record list, not a table: eyebrow line (level · category · year), serif title linking to `/thesis/[id]`, authors, then an abstract snippet. Titles and abstracts are what people search by; hashes are not.
- **Thesis detail** (`/thesis/[id]`) is a real page. Abstract in full, manuscript reader for stakeholders, and the ledger record inside a collapsed `<details>` labelled "Record integrity". The blockchain lives here and nowhere else in the reading experience.
- **Tables** remain for review queues and admin management — paginated (15/page dashboard and admin, 25/page public), single-line truncation.
- Modals are for quick actions and confirmations. Reading happens on a page.

## Dispute threads

- Flagger ↔ owner threads anonymize the flagger to the owner (`Anonymous flagger`) to discourage retaliation.
- The flagger sees the owner's real name; the librarian sees both.
- Author role is communicated by a coloured left border plus a role label, never by background fill.

## Review UI

- The **student tracker** (`ReviewTimeline`) shows Submitted → Adviser Review → Librarian Review → Published. A halted state (`returned`, `rejected`) marks the step it stopped at in `danger`, rather than showing the run as complete.
- **Reviewer comments** are shown to the student in full (`ThesisReviewHistory`), bordered by outcome: success for endorsed/approved, warning for returned, danger for rejected. A returned submission is useless without them.
- Review queues surface two advisory flags: `similarity_flagged` and a low-confidence extracted abstract.
