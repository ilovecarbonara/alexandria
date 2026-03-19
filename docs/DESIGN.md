# Design System — Institutional Minimalism

## Colors (use as Tailwind custom tokens or CSS variables)
--color-bg: #0D0F12          /* page background */
--color-surface: #13161C     /* card surfaces */
--color-sidebar: #0A0C0F     /* sidebar */
--color-border: #222733      /* all borders: 1px solid */
--color-accent: #4A90D9      /* primary blue, CTAs */
--color-success: #2ECC8F     /* confirmed/verified state */
--color-pending: #E2A84B     /* pending/draft state */
--color-dispute: #C0392B     /* flagged/error state */
--color-hash: #5CC8FF        /* hash and blockchain data display */

## Typography
- Headings: Playfair Display (serif)
- All UI text, labels, data: DM Mono (monospace)
- Import both from Google Fonts

## Rules — STRICT
- No gradients
- No box-shadows
- No border-radius above 2px
- No pill badges (use square chips only)
- Color is used ONLY to communicate state, not decoration
- 1px solid borders using --color-border only

## Component Patterns
- Cards: bg-[#13161C], border border-[#222733], rounded-[2px]
- Buttons (primary): bg-[#4A90D9] text-white, no border-radius above 2px
- Status chips: square, colored bg matching state color, DM Mono text
- Hash display: text-[#5CC8FF] font-mono, truncated with full value on hover