# Setup Guide

## Prerequisites
- Node.js 18+
- A Supabase project (free tier works)
- An Alchemy account (free tier works)
- A Sepolia testnet wallet with test ETH

---

## 1. Install Dependencies

```bash
npm install
```

## 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

| Variable | Where to get it |
|----------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role key (keep secret) |
| `ALCHEMY_API_KEY` | Alchemy dashboard → Create App (Sepolia) → API Key |
| `DEPLOYER_PRIVATE_KEY` | Your Sepolia wallet private key (see below) |
| `CONTRACT_ADDRESS` | Filled after deploying the contract (step 5) |
| `TITLE_ALERT_THRESHOLD` | Similarity alert threshold, default `0.50` |
| `AUTO_FLAG_THRESHOLD` | Auto-flag threshold, default `0.75`. Theses matching at or above this score are auto-flagged with a dispute |
| `NEXT_PUBLIC_APP_URL` | Your deployed URL (e.g. `https://your-app.vercel.app`). Defaults to `http://localhost:3000` in dev |

## 3. Create a Sepolia Wallet

1. Install MetaMask or use any Ethereum wallet
2. Create a new account (or use an existing one for testnet only)
3. Switch network to **Sepolia testnet**
4. Export the private key: MetaMask → Account Details → Show Private Key
5. Paste it into `DEPLOYER_PRIVATE_KEY` in `.env.local` (without `0x` prefix if Hardhat complains)

### Get Test ETH

Use any Sepolia faucet:
- https://sepoliafaucet.com (requires Alchemy account)
- https://www.infura.io/faucet/sepolia
- Google "Sepolia faucet" for current options

You need a small amount (~0.01 ETH) for contract deployment + registration transactions.

## 4. Create an Alchemy Account

1. Go to https://www.alchemy.com and sign up
2. Create a new app: chain = Ethereum, network = Sepolia
3. Copy the API key into `ALCHEMY_API_KEY` in `.env.local`

## 5. Compile & Deploy the Smart Contract

```bash
# Compile
npx hardhat compile

# Run tests (local Hardhat network)
npx hardhat test

# Deploy to Sepolia
npx hardhat run scripts/deploy.ts --network sepolia
```

After deployment, copy the logged contract address into `CONTRACT_ADDRESS` in `.env.local`.

## 6. Set Up Supabase Database

1. Open the Supabase SQL Editor for your project
2. Paste and run the contents of `docs/DATABASE_MIGRATION.sql`
3. Verify all ten tables are created: `users`, `theses`, `thesis_authors`, `thesis_reviews`, `staged_uploads`, `disputes`, `dispute_messages`, `dispute_reads`, `activity_logs`, `title_alerts` — plus the internal `rate_limits` table

### Verify the manuscript storage bucket

The migration creates a **private** bucket named `theses` (25 MB limit, `application/pdf` only). Confirm under Supabase → Storage that it exists and that **Public** is off.

The bucket deliberately has **no RLS policies**. Every read is streamed through `GET /api/theses/[id]/pdf`, which re-authorizes per request using the service role; uploads arrive only via short-lived signed URLs minted server-side. Adding policies here would widen access without being used.

### Seed the Librarian Account

The librarian role is never self-assignable, so the first one is inserted by hand. Create the account via Supabase Auth (email + password), then run:

```sql
INSERT INTO public.users (id, email, full_name, approval_status, role, requested_role)
VALUES (
  '<supabase-auth-user-uuid>',
  'librarian@uspf.edu.ph',
  'Librarian Name',
  'approved',
  'librarian',
  'researcher'
);
```

Replace `<supabase-auth-user-uuid>` with the UUID from Supabase Auth → Users.

Research advisers do **not** need seeding: they choose "Research Adviser" at sign-up, and the librarian grants the role by approving the account.

## 7. Run the Dev Server

```bash
npm run dev
```

Open http://localhost:3000.

## 8. Run the Tests

```bash
npm test              # fixtures + abstract extraction + contract tests
npm run test:pdf      # abstract extraction only
npm run test:contract # Hardhat contract tests only
```

`npm run test:fixtures` regenerates the PDF corpus under `test/fixtures/pdfs/` (git-ignored) from `test/fixtures/build-pdfs.mts`.

## Current Sepolia Contract

Live contract: `0x84D9A1f30439c715D268ec1eF5b8B09DCb9A38Fc`

Deprecated contract: `0x6a7dEaea1605a3333FdFEf2B8b1a5e3CFa92fdBC`

The app uses the address in `CONTRACT_ADDRESS`. The deployer wallet must be the contract `owner()` because `registerThesis` is owner-only.
