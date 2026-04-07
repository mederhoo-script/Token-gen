# 🪙 Token Generator

A production-grade multi-tenant SaaS platform that lets users deploy custom **ERC20 tokens on the Sepolia testnet** without writing any code.

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.2 (App Router) |
| UI | React 19.2.4 + Tailwind CSS 4.2.2 + shadcn/ui |
| Auth & DB | Supabase (Auth + PostgreSQL + RLS) |
| Blockchain | Ethers.js 6.16.0 + Solidity 0.8.19 (OpenZeppelin ERC20) |
| Validation | Zod 4.3.6 + react-hook-form 7.72.1 |
| Data fetching | TanStack Query 5.96.2 |
| Language | TypeScript 6.0.2 (strict) |
| Linting | ESLint 10 (flat config) |
| Deployment | Vercel + Sepolia Testnet |

## Features

- **Email/password auth** — signup, email verification, login, logout via Supabase Auth
- **Protected dashboard** — lists all deployed tokens with stats and Etherscan links
- **Token creation form** — name, symbol, supply, decimals; Zod-validated client-side and server-side
- **On-chain deployment** — server deploys ERC20 via ethers.js using a server-held private key
- **Rate limiting** — max 5 token deployments per user per hour
- **Row-level security** — users can only read their own tokens (Postgres RLS)
- **OAuth callback** — handles Supabase email confirmation and magic-link redirects

## Project Structure

```
app/
  (auth)/           login, signup, verify-email pages
  (protected)/      dashboard, create-token (auth-gated via layout)
  api/
    auth/callback/  Supabase OAuth / email verification handler
    tokens/         POST (deploy), GET (list), GET [id]
    health/         readiness probe
components/
  auth/             LoginForm, SignupForm
  shared/           Header, Footer, ErrorBoundary
  tokens/           TokenForm, TokenCard, TokenList, DeploymentStatus
  loaders/          Skeleton, CardSkeleton, DashboardSkeleton
  ui/               shadcn/ui primitives
lib/
  blockchain/       deployer.ts, abi.ts, constants.ts
  hooks/            useAuth, useUser, useTokens
  supabase/         client.ts, server.ts, middleware.ts
  utils/            format, errors, api-client
  validation/       schemas.ts (Zod)
contracts/
  Token.sol         ERC20 with custom decimals (OpenZeppelin)
supabase/
  migrations/       SQL schema + RLS policies
```

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/mederhoo-script/Token-gen.git
cd Token-gen
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server only) |
| `DEPLOYER_PRIVATE_KEY` | Hex private key of the wallet that pays gas |
| `SEPOLIA_RPC_URL` | Sepolia JSON-RPC endpoint (Infura, Alchemy, etc.) |
| `ETHERSCAN_API_KEY` | For contract verification (optional) |
| `TOKEN_BYTECODE` | Compiled bytecode of `contracts/Token.sol` (see below) |
| `NEXT_PUBLIC_APP_URL` | Your app URL (e.g. `http://localhost:3000`) |

### 3. Compile the smart contract

You need to compile `contracts/Token.sol` to get the bytecode for deployment.

**Using Hardhat (recommended):**
```bash
npm install --save-dev hardhat @openzeppelin/contracts
npx hardhat compile
# Copy the bytecode from artifacts/contracts/Token.sol/Token.json → .bytecode
```

Paste the bytecode value into `TOKEN_BYTECODE` in `.env.local`.

### 4. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run the migration in **SQL Editor**:
   ```sql
   -- paste contents of supabase/migrations/001_initial.sql
   ```
3. Set **Email confirmation** to required in Authentication settings
4. Add `http://localhost:3000/api/auth/callback` to the allowed redirect URLs

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment (Vercel)

1. Push to GitHub
2. Import the repo in Vercel
3. Add all environment variables (from `.env.example`) in the Vercel dashboard
4. Deploy — Vercel auto-detects Next.js

> **Security:** `DEPLOYER_PRIVATE_KEY` and `SUPABASE_SERVICE_ROLE_KEY` must **never** be committed to the repo or exposed to the browser.

## Smart Contract

`contracts/Token.sol` is a standard OpenZeppelin ERC20 with:

- Configurable `name`, `symbol`, `initialSupply`, and `decimals`
- All supply minted to the deployer on construction
- Immutable supply (no mint/burn functions) — prevents inflation abuse
- Custom `TokenDeployed` event for indexing

## API Reference

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/health` | GET | No | Readiness probe |
| `/api/tokens` | GET | JWT | List authenticated user's tokens |
| `/api/tokens` | POST | JWT | Deploy a new ERC20 token |
| `/api/tokens/[id]` | GET | JWT | Get a single token by ID |
| `/api/auth/callback` | GET | — | Supabase OAuth / email verification handler |

All authenticated endpoints return:
```json
{ "success": true, "data": { ... } }
// or
{ "success": false, "error": "Human-readable message" }
```

## Rate Limiting

Maximum **5 token deployments per user per hour**, enforced server-side by querying the `tokens` table. Returns HTTP 429 when exceeded.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint (flat config, v10) |
