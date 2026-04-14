# Project Alexandria

Blockchain-based academic thesis registry for USPF.
Core purpose: register a SHA-256 hash of a thesis PDF on Sepolia testnet
to establish a tamper-proof, publicly verifiable proof of existence and registration.

## Stack
- Next.js 16 (App Router), TypeScript, Tailwind CSS
- Supabase (PostgreSQL + Auth)
- Solidity smart contract on Sepolia via Hardhat + Alchemy
- ethers.js for blockchain interaction
- jsPDF + qrcode for certificate generation
- Chart.js for admin analytics
- pg_trgm (Postgres trigram extension) for title similarity matching
- Deployed on Vercel

## Key Rules
- PDF is NEVER stored. Hash only.
- Duplicate detection happens BEFORE blockchain submission.
- Draft registrations are allowed and create separate blockchain entries.
- Theses can be linked in version chains (Draft → Final) via previous_thesis_id.
- Admin account is seeded manually — not via public registration.
- Public verification requires NO login.
- Blockchain records are NEVER altered, even on dispute.
- On every new registration, a title-similarity check runs against all
  existing entries. If a match exceeds the configured threshold, an
  in-system alert is created for the author of the matching prior registration.
  If the similarity score meets the auto-flag threshold (default 75%),
  a dispute is automatically created and the incoming thesis is flagged.
- The system records REGISTRATION, not authorship. It does not verify
  that the registrant wrote the thesis.
  - The system trusts the client-submitted hash. No server-side 
  verification of hash-to-PDF correspondence is performed.

## Roles
- Public: search + verify only
- Authenticated User: register theses, view dashboard, flag disputes,
  receive title-alert notifications, view title alerts, link thesis revisions
- Admin: manage disputes, manage thesis statuses (accept/flag/reject),
  manage users (approve/deactivate/reactivate), monitor title alerts,
  view analytics dashboard, view activity logs

## Docs
See /docs for full specs on data model, features, API routes, and design system.