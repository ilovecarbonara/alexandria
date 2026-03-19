# Project Alexandria

Blockchain-based academic thesis ownership registry for USPF.
Core purpose: register a SHA-256 hash of a thesis PDF on Sepolia testnet 
to establish tamper-proof proof of existence and authorship.

## Stack
- Next.js 14 (App Router), TypeScript, Tailwind CSS
- Supabase (PostgreSQL + Auth)
- Solidity smart contract on Sepolia via Hardhat + Alchemy
- ethers.js for blockchain interaction
- jsPDF + qrcode.js for certificate generation
- Chart.js for admin analytics
- Deployed on Vercel

## Key Rules
- PDF is NEVER stored. Hash only.
- Duplicate detection happens BEFORE blockchain submission.
- Draft registrations are allowed and create separate blockchain entries.
- Admin account is seeded manually — not via public registration.
- Public verification requires NO login.
- Blockchain records are NEVER altered, even on dispute.

## Roles
- Public: search + verify only
- Authenticated User: register theses, view dashboard, flag disputes
- Admin: manage disputes, view analytics dashboard

## Docs
See /docs for full specs on data model, features, API routes, and design system.