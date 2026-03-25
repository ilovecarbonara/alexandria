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
| `TITLE_ALERT_THRESHOLD` | Similarity threshold, default `0.75` |

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
2. Paste and run the contents of `docs/MIGRATION.sql`
3. Verify all tables are created: `users`, `theses`, `disputes`, `title_alerts`

### Seed the Admin Account

After running the migration, manually insert the admin user. First, create an account via Supabase Auth (email + password), then run:

```sql
INSERT INTO public.users (id, email, full_name, is_approved, is_admin)
VALUES (
  '<supabase-auth-user-uuid>',
  'admin@uspf.edu.ph',
  'Admin Name',
  true,
  true
);
```

Replace `<supabase-auth-user-uuid>` with the UUID from Supabase Auth → Users.

## 7. Configure Supabase SMTP (for title alert emails)

1. Supabase Dashboard → Project Settings → Auth → SMTP Settings
2. Enable custom SMTP and fill in your provider details
3. This is used for title-similarity alert emails dispatched from API routes

## 8. Run the Dev Server

```bash
npm run dev
```

Open http://localhost:3000.
