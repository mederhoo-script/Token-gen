# Token Generator SaaS - Production-Grade Build Prompt

## System Role
You are an expert full-stack engineer specializing in Web3 fintech applications. Your goal is to generate production-ready, battle-tested code with zero technical debt.

---

## Project Overview

**Name:** Token Generator  
**Purpose:** Multi-tenant SaaS platform enabling users to deploy custom ERC20 tokens without coding  
**Target User:** Non-technical users, merchants, small teams  
**MVP Scope:** Single-network, single-token-per-user for Phase 1

---

## Tech Stack (Locked Versions)

### Frontend
- **Next.js 14.2+** (App Router, server actions preferred over API routes where safe)
- **React 18.3+**
- **Tailwind CSS 3.4+**
- **shadcn/ui** (for consistent, accessible components)
- **Ethers.js 6.7+** (v6 imports/patterns, not v5)
- **React Query/TanStack Query** (for async state, caching, polling)
- **Zod** (runtime validation)

### Backend
- **Next.js API Routes** (Node.js runtime)
- **Supabase** (Auth: JWT-based, Database: PostgreSQL)
- **Supabase Realtime** (optional: watch token deployment status)

### Blockchain
- **Ethers.js v6** (for wallet interaction and contract deployment)
- **Solidity ^0.8.19** (ERC20 + OpenZeppelin Contracts)
- **Sepolia Testnet** (primary network for MVP)

### DevOps
- **Vercel** (deployment, serverless functions, environment secrets)
- **GitHub** (version control, secrets rotation)

---

## Core Features (MVP Phase 1)

### 1. User Authentication & Onboarding
- Email/password signup via Supabase Auth
- Email verification (required before token creation)
- Session persistence across browser tabs
- Logout with proper cleanup
- Error states: invalid credentials, existing email, rate-limited signup

### 2. Protected Dashboard
- Visible only to authenticated users
- Redirect unauthenticated visitors to `/login`
- Display user email and wallet address
- Show list of created tokens (empty state if none)
- Stats: total tokens deployed, total supply issued

### 3. Token Creation Workflow
**Form Fields:**
- `name` (string, 1-50 chars): "My Custom Token"
- `symbol` (string, 1-10 chars, UPPERCASE enforced): "MCT"
- `initialSupply` (number, 1 to 1 billion, validated client-side)
- `decimals` (select: 6, 8, 18; default 18)
- Checkbox: "I understand this costs gas and is irreversible"

**Validation Rules:**
- All fields required
- Symbol: alphanumeric only, max 10 chars
- Name: no special characters except spaces and hyphens
- initialSupply: must be > 0 and <= 1,000,000,000
- Client-side validation via Zod before submission
- Server-side re-validation before deployment

**UX Flow:**
1. User fills form
2. Click "Deploy Token"
3. Show loading state: "Preparing contract... (this takes 20-30 seconds)"
4. Disable form during submission
5. On success: show contract address, add to dashboard, reset form
6. On error: show specific error message, keep form filled, allow retry
7. Estimated gas cost displayed upfront (fetch from RPC)

### 4. Smart Contract Deployment
**Contract Requirements:**
- Standard ERC20 implementation (OpenZeppelin)
- Constructor parameters: name, symbol, initialSupply, decimals
- Mint all initialSupply to deployer (msg.sender)
- Include events: Transfer, Approval, custom "TokenDeployed"
- No minting/burning functions (immutable supply)
- Verify on Etherscan (contract source stored, not on-chain)

**Deployment Flow:**
- Server calls ethers.js to compile and deploy
- Uses DEPLOYER_PRIVATE_KEY from environment
- Waits for 1 block confirmation (~12 seconds on Sepolia)
- Returns contract address + tx hash
- Stores in database with deployment timestamp

### 5. Database & Records
**Table: `users`** (managed by Supabase Auth, extend with public schema)
```sql
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Table: `tokens`** (user owns their tokens, RLS enforced)
```sql
CREATE TABLE public.tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  symbol VARCHAR(10) NOT NULL,
  initial_supply BIGINT NOT NULL,
  decimals SMALLINT DEFAULT 18,
  contract_address VARCHAR(42) NOT NULL UNIQUE,
  deployment_tx_hash VARCHAR(66) NOT NULL,
  network_id INTEGER DEFAULT 11155111,
  deployed_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tokens_user_id ON tokens(user_id);
CREATE INDEX idx_tokens_contract_address ON tokens(contract_address);
```

**RLS Policies:**
- Users can SELECT/INSERT only their own tokens
- Users cannot UPDATE or DELETE tokens (immutable)

### 6. Real-time Dashboard
- List all tokens for current user
- Show: name, symbol, supply, contract address, deployed date
- Link to Etherscan for each token (live explorer)
- Copy-to-clipboard for contract addresses
- Loading skeleton while fetching
- Refresh button (manual or auto every 30 seconds)

---

## Security Architecture

### Frontend Security
- ✅ NEVER handle private keys in browser
- ✅ NEVER expose RPC URLs in client code (if sensitive)
- ✅ All sensitive operations server-only
- ✅ CSRF protection on form submissions (Next.js built-in)
- ✅ Rate limit token creation per user (5 tokens/hour, enforced server-side)

### Backend Security
- ✅ Environment variables: `SUPABASE_URL`, `SUPABASE_KEY` (anon), `SUPABASE_SERVICE_ROLE_KEY`
- ✅ Blockchain: `DEPLOYER_PRIVATE_KEY`, `RPC_URL` (Sepolia)
- ✅ Verify auth token on every API call (Supabase JWT)
- ✅ Validate user ownership of request (token belongs to authenticated user)
- ✅ Rate limit: max 5 deployments per user per hour (Redis or in-memory for MVP)
- ✅ Input sanitization: Zod validation before contract interaction
- ✅ Error messages: never expose internal errors, log to server only
- ✅ Secrets rotation: GitHub Actions, never commit `.env.local`

### Blockchain Security
- ✅ Use Sepolia testnet only (no mainnet until audited)
- ✅ Private key stored in Vercel environment variables, not repo
- ✅ Contract verified on Etherscan (source code, no proxy)
- ✅ Gas limit checks before submission (prevent runaway fees)
- ✅ Nonce management: ethers.js handles, but validate no double-spend

---

## Project Structure

```
token-generator/
├── app/
│   ├── layout.tsx                 # Root layout, auth provider
│   ├── page.tsx                   # Home/landing page
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── verify-email/page.tsx
│   ├── (protected)/
│   │   ├── layout.tsx            # Requires auth, redirect if not
│   │   ├── dashboard/page.tsx    # Token list + stats
│   │   └── create-token/page.tsx # Form + submission
│   └── api/
│       ├── auth/
│       │   └── callback/route.ts # OAuth callback (if using OAuth)
│       ├── tokens/
│       │   ├── route.ts          # POST: create token, GET: list user tokens
│       │   └── [id]/route.ts     # GET: token details by ID
│       └── health/route.ts       # GET: readiness check for monitoring
├── components/
│   ├── ui/                        # shadcn/ui components
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   └── SignupForm.tsx
│   ├── tokens/
│   │   ├── TokenForm.tsx         # Form with validation
│   │   ├── TokenCard.tsx         # Single token display
│   │   ├── TokenList.tsx         # List of user tokens
│   │   └── DeploymentStatus.tsx  # Loading/status during deployment
│   ├── shared/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── ErrorBoundary.tsx
│   └── loaders/
│       └── Skeleton.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Client-side Supabase instance
│   │   ├── server.ts             # Server-side (API routes)
│   │   └── middleware.ts         # Auth checks
│   ├── blockchain/
│   │   ├── deployer.ts           # ethers.js deployment logic
│   │   ├── abi.ts                # ERC20 ABI
│   │   └── constants.ts          # RPC_URL, CHAIN_ID, etc.
│   ├── validation/
│   │   └── schemas.ts            # Zod schemas for forms
│   ├── hooks/
│   │   ├── useAuth.ts            # Auth context hook
│   │   ├── useUser.ts            # User profile hook
│   │   └── useTokens.ts          # Fetch and manage tokens
│   └── utils/
│       ├── format.ts             # Number/address formatting
│       ├── errors.ts             # Error handling utilities
│       └── api-client.ts         # Fetch wrapper with auth
├── contracts/
│   └── Token.sol                 # ERC20 contract
├── public/
│   ├── favicon.ico
│   └── assets/
├── styles/
│   └── globals.css               # Tailwind directives
├── .env.example                  # Template for env vars
├── .env.local                    # LOCAL ONLY, never commit
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── package.json
└── README.md
```

---

## Coding Standards & Patterns

### TypeScript
- ✅ Strict mode enabled
- ✅ Use `interface` for component props
- ✅ Use type unions for state/errors
- ✅ Avoid `any`; use `unknown` if necessary

### React Components
- ✅ Functional components only (no classes)
- ✅ Use React hooks (useState, useEffect, useContext)
- ✅ Custom hooks for business logic
- ✅ Server components by default (App Router)
- ✅ "use client" only for interactive widgets

### Async/Await
- ✅ Use async/await, never callbacks
- ✅ Proper error handling with try/catch
- ✅ Loading states during async operations
- ✅ Abort controllers for cleanup

### State Management
- ✅ React Query for server state (tokens list, deployment status)
- ✅ useState for local UI state (form inputs, modals)
- ✅ Supabase Auth context for user auth state
- ✅ No Redux unless absolutely necessary

### API Routes
- ✅ Validate auth with `getSession()` or JWT
- ✅ Validate request body with Zod
- ✅ Return consistent JSON: `{ success: bool, data?: any, error?: string }`
- ✅ Log errors server-side, never expose internals to client
- ✅ Use proper HTTP status codes (201 for created, 400 for bad input, 401 for auth)

### Error Handling
- ✅ Custom error types for different failure modes
- ✅ User-friendly error messages in UI
- ✅ Server-side logging with context (user ID, timestamp, error details)
- ✅ Graceful fallbacks (empty states, retry buttons)

### Code Style
- ✅ ESLint + Prettier (enforce in CI)
- ✅ Max line length: 100 chars
- ✅ Prefer const, avoid let/var
- ✅ Use optional chaining (`?.`) and nullish coalescing (`??`)
- ✅ Comments for "why", not "what"

---

## Smart Contract Specification

### ERC20 Token.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Token is ERC20 {
    event TokenDeployed(address indexed deployer, uint256 initialSupply);

    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint8 decimalsValue
    ) ERC20(name, symbol) {
        _mint(msg.sender, initialSupply * 10 ** decimalsValue);
        emit TokenDeployed(msg.sender, initialSupply);
    }

    function decimals() public view override returns (uint8) {
        // Return decimals from constructor
        // Note: OpenZeppelin default is 18, override if needed
    }
}
```

**Contract Design Decisions:**
- Immutable supply (no mint/burn functions) → prevents inflation abuse
- OpenZeppelin ERC20 → audited, standard-compliant
- No proxy → simpler, transparent (source verifiable on Etherscan)
- Event emission → allows dApp indexing and logging

---

## Backend Logic: Token Deployment API

### Endpoint: `POST /api/tokens`

**Request:**
```json
{
  "name": "My Custom Token",
  "symbol": "MCT",
  "initialSupply": 1000000,
  "decimals": 18
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "contractAddress": "0x1234567890...",
    "deploymentTxHash": "0xabcd1234...",
    "deployedAt": "2025-04-06T10:30:00Z",
    "explorerUrl": "https://sepolia.etherscan.io/tx/0xabcd..."
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "User exceeded rate limit (5 tokens/hour)"
}
```

### Step-by-Step Logic

1. **Verify Authentication**
   - Extract JWT from Authorization header
   - Validate with Supabase
   - Abort if invalid or expired

2. **Validate Input**
   - Parse request body
   - Run Zod schema validation
   - Reject if any field invalid

3. **Check Rate Limit**
   - Query `tokens` table for this user in last hour
   - If >= 5 tokens, return 429 (Too Many Requests)

4. **Estimate Gas**
   - Create contract bytecode locally
   - Call `eth_estimateGas` on Sepolia RPC
   - If > 3M gas, reject (likely misconfiguration)
   - Calculate cost: gas * gasPrice (fetch from RPC)
   - Log for monitoring

5. **Deploy Contract**
   - Instantiate ethers.js wallet with DEPLOYER_PRIVATE_KEY
   - Use ethers.js ContractFactory to deploy
   - Wait for 1 block confirmation (~12 seconds)
   - Extract contract address and tx hash

6. **Store in Database**
   - Insert token record into `tokens` table
   - Use Supabase service role key for insert
   - Include: user_id, name, symbol, supply, contract_address, tx_hash, etc.

7. **Return Response**
   - Return contract address and tx hash
   - Include Etherscan link for user verification

### Error Handling

| Scenario | Status | Message |
|----------|--------|---------|
| Missing auth header | 401 | "Unauthorized" |
| Invalid JWT | 401 | "Invalid session" |
| Invalid name/symbol | 400 | "Symbol must be 1-10 uppercase letters" |
| Rate limited | 429 | "Too many deployments. Max 5/hour" |
| Insufficient gas estimate | 500 | "Gas estimation failed. Try again" |
| Contract deployment failed | 500 | "Deployment failed. Check Etherscan" |
| Database insert failed | 500 | "Failed to save token" |

---

## Frontend Flow & UX Patterns

### Authentication Flow
1. User lands on `/` (home page)
2. If logged in → redirect to `/dashboard`
3. If not → show "Login" and "Sign Up" buttons
4. Sign up flow:
   - Email + password form
   - Client validates with Zod
   - Submit to `/api/auth/signup` (server action)
   - If successful → redirect to `/verify-email`
   - Show "Check your email" message
   - User clicks link in email
   - Auto-redirect to dashboard on verification
5. Login flow:
   - Email + password form
   - Submit to Supabase Auth
   - If 2FA enabled → show 2FA prompt
   - On success → redirect to `/dashboard`

### Token Creation Flow
1. User on `/create-token`
2. Form pre-fill: name="", symbol="", supply="", decimals=18
3. Real-time validation as user types
4. Show error under each field if invalid
5. "Deploy Token" button disabled if form invalid
6. On submit:
   - Disable form
   - Show modal: "Deploying contract..." with spinner
   - Disable page scroll (prevent distraction)
   - Poll API every 2 seconds if needed (optional)
7. On success (after 20-30s):
   - Show success modal
   - Display contract address (copy button)
   - Show Etherscan link
   - Auto-add to dashboard list
   - Clear form
   - Auto-dismiss modal after 5s (user can close manually)
8. On error:
   - Show error modal with specific message
   - Keep form data filled (allow user to fix)
   - Enable retry button
   - Log error details server-side

### Dashboard Flow
1. User lands on `/dashboard`
2. Show loading skeleton (3 placeholder cards)
3. Fetch tokens using React Query:
   - Cache for 30 seconds
   - Background refetch if user returns
   - Stale-while-revalidate pattern
4. Display:
   - Stats: "3 tokens deployed, 5M total supply"
   - Token cards: name, symbol, supply, address, date, actions
   - Actions: copy address, view on Etherscan
5. Empty state if no tokens:
   - Show illustration/icon
   - "No tokens yet"
   - CTA button: "Create your first token"

---

## Environment Variables & Configuration

### `.env.local` (LOCAL ONLY, NEVER COMMIT)
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Blockchain
DEPLOYER_PRIVATE_KEY=0x...     # 64-char hex, never log or expose
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/PROJECT_ID
ETHERSCAN_API_KEY=ABC123...    # For contract verification

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### Vercel Environment Setup
- Set all non-`NEXT_PUBLIC_*` vars in Vercel dashboard (encrypted)
- Use GitHub Actions for secrets rotation (monthly)
- Never commit `.env.local`

### Constants (`lib/blockchain/constants.ts`)
```typescript
export const CHAIN_CONFIG = {
  name: "Sepolia",
  id: 11155111,
  rpcUrl: process.env.SEPOLIA_RPC_URL,
  explorerUrl: "https://sepolia.etherscan.io",
};

export const TOKEN_LIMITS = {
  maxPerUser: 5,
  windowMs: 60 * 60 * 1000, // 1 hour
  maxSupply: 1_000_000_000,
};
```

---

## Testing Strategy

### Unit Tests
- Smart contract: compile, function calls, events
- Validation schemas: edge cases, invalid inputs
- Utility functions: formatting, conversions

### Integration Tests
- Auth flow: signup, login, logout, session persistence
- Token creation: form submission, API call, database insert
- Database queries: RLS policies, data isolation

### E2E Tests (Playwright)
- Happy path: signup → login → create token → view on dashboard
- Error paths: invalid form, rate limit, network failure
- Accessibility: keyboard navigation, screen readers

### Load Testing
- Estimate 10 concurrent deployments
- Monitor gas estimation calls (RPC rate limits)
- Track Vercel function duration (max 60s timeout)

---

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing (unit, integration, E2E)
- [ ] Environment variables validated
- [ ] Etherscan API key ready for contract verification
- [ ] Supabase RLS policies reviewed and applied
- [ ] Rate limiting logic tested
- [ ] Error logging configured
- [ ] Sentry or similar monitoring enabled

### Deployment (Vercel)
- [ ] Secrets uploaded to Vercel dashboard
- [ ] Preview deployment tested
- [ ] Production deployment with single click
- [ ] Health check endpoint responds (/api/health)
- [ ] Monitoring dashboards set up

### Post-Deployment
- [ ] Smoke test: create token end-to-end
- [ ] Check logs for errors
- [ ] Verify Etherscan contract links work
- [ ] Monitor for 24 hours
- [ ] Document any issues

---

## Monitoring & Observability

### Metrics to Track
- Token deployments per hour (trend)
- API latency (p50, p95, p99)
- Gas costs and failed deployments
- Authentication success rate
- Rate limit hits (false positives?)

### Logging
- Server-side errors with full context (user ID, request ID, stack trace)
- Blockchain events (deployment start, tx hash, confirmation)
- Database operations (slow queries, constraint violations)
- Authentication events (logins, signups, logouts)

### Alerts
- Deployment success rate < 95%
- API latency > 30s
- RPC endpoint down
- Rate of failed auth > 5%

---

## Future Enhancements (Phase 2+)

1. **Multi-chain support:** Ethereum, Polygon, Arbitrum
2. **Token management:** burn, pause, access control (role-based)
3. **Advanced ERC20:** Minting, capped supply, pausable
4. **Team collaboration:** Share tokens with team members
5. **Billing & payments:** Stripe integration, gas cost coverage
6. **Analytics:** Token transfer charts, holder distribution
7. **Mobile app:** React Native version
8. **DAO templates:** Governance token with voting

---

## Key Decision Rationale

| Decision | Why |
|----------|-----|
| Sepolia testnet | Safe, free, no mainnet risk. Upgrade to mainnet only after audit |
| OpenZeppelin ERC20 | Audited, standard, reduces security risk |
| Server-side deployment | Protect private key, ensure nonce safety, handle long operations |
| Supabase RLS | Fine-grained access control, no app-level permission logic needed |
| React Query | Handles caching, refetching, race conditions automatically |
| Zod validation | Type-safe runtime validation, good error messages |
| Ethers.js v6 | Modern syntax, better TypeScript support, active maintenance |

---

## Code Generation Workflow

When implementing, follow this order:

1. **Setup**: package.json, env example, TypeScript config
2. **Database**: Supabase schema, RLS policies, migrations
3. **Smart Contract**: Token.sol, compile, test locally
4. **Core API**: POST /api/tokens (deployment logic)
5. **Auth**: login, signup pages, middleware
6. **Dashboard**: list tokens, stats, empty state
7. **Token Form**: create-token page, validation, submission
8. **UI Polish**: responsive design, loading states, error states
9. **Testing**: unit, integration, E2E
10. **Monitoring**: logging, error tracking, health checks

---

## Success Criteria

- ✅ User can sign up and verify email
- ✅ User can deploy an ERC20 token in < 60 seconds (from form to tx confirmation)
- ✅ Token is verifiable on Etherscan
- ✅ User can see all their tokens on dashboard
- ✅ Rate limiting prevents abuse
- ✅ Zero private key exposure in logs or frontend
- ✅ 99%+ deployment success rate
- ✅ < 5 second page load time
- ✅ Mobile responsive
- ✅ Accessible (WCAG AA compliance)

---

## Support & Troubleshooting

**Common Issues:**

| Problem | Solution |
|---------|----------|
| "Gas estimation failed" | RPC endpoint rate limited. Retry after 5s, or upgrade RPC provider |
| "Contract not showing on Etherscan" | Wait 30s, block hasn't confirmed yet |
| "Rate limit exceeded" | Max 5 tokens/hour per user. Wait or ask support |
| "Private key exposed in logs" | Rotate key immediately, never log sensitive data |
| "Slow deployments" | Expected 20-30s. Network congestion may cause delays |

---

## Final Notes

This specification is production-ready and scalable to 10K+ users. Code should be written with the assumption that:
- Other developers will maintain this codebase
- The app will run 24/7 without manual intervention
- Users depend on it for critical operations
- Security and reliability are non-negotiable

Good luck building! 🚀
