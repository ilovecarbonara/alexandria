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
- Supabase SMTP for alert email dispatch
- Deployed on Vercel

## Key Rules
- PDF is NEVER stored. Hash only.
- Duplicate detection happens BEFORE blockchain submission.
- Draft registrations are allowed and create separate blockchain entries.
- Admin account is seeded manually — not via public registration.
- Public verification requires NO login.
- Blockchain records are NEVER altered, even on dispute.
- On every new registration, a title-similarity check runs against all
  existing entries. If a match exceeds the configured threshold, an alert
  email is sent to the author of the matching prior registration.
- The system records REGISTRATION, not authorship. It does not verify
  that the registrant wrote the thesis.
  - The system trusts the client-submitted hash. No server-side 
  verification of hash-to-PDF correspondence is performed.

## Roles
- Public: search + verify only
- Authenticated User: register theses, view dashboard, flag disputes,
  receive title-alert notifications
- Admin: manage disputes, monitor title alerts, view analytics dashboard

## Docs
See /docs for full specs on data model, features, API routes, and design system.