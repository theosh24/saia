# SPL578 Devnet Full Stack Deployment

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deploy all 4 Anchor programs to Solana devnet, initialize on-chain state, deploy backend to Railway, and deploy frontend to Vercel.

**Architecture:** 4 Anchor programs deployed to devnet with Metaplex Core integration. Express backend on Railway reads on-chain data and provides JWT auth. React+Three.js frontend on Vercel connects to backend via API and to Solana via wallet adapters.

**Tech Stack:** Anchor 0.30.1, Solana CLI 1.18, Metaplex Core, Express/TypeScript, React/Vite, Railway, Vercel

---

### Task 1: Install Rust and Solana CLI in WSL2

**Context:** Windows doesn't support Anchor natively. All build/deploy commands run in WSL2.

**Step 1: Open WSL2 terminal**

Run (from Windows):
```bash
wsl
```

**Step 2: Install Rust via rustup**

Run:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source "$HOME/.cargo/env"
```
Expected: `rustc --version` returns `>= 1.75.0`

**Step 3: Install Solana CLI v1.18**

Run:
```bash
sh -c "$(curl -sSfL https://release.anza.xyz/v1.18.26/install)"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
echo 'export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"' >> ~/.bashrc
```
Expected: `solana --version` returns `solana-cli 1.18.26`

**Step 4: Install Anchor CLI v0.30.1**

Run:
```bash
cargo install --git https://github.com/coral-xyz/anchor avm --force
avm install 0.30.1
avm use 0.30.1
```
Expected: `anchor --version` returns `anchor-cli 0.30.1`

**Step 5: Verify all tools**

Run:
```bash
rustc --version && solana --version && anchor --version
```
Expected:
```
rustc 1.XX.X (...)
solana-cli 1.18.26 (...)
anchor-cli 0.30.1
```

---

### Task 2: Configure Solana for Devnet and Fund Wallet

**Step 1: Set Solana to devnet**

Run:
```bash
solana config set --url devnet
```
Expected: `RPC URL: https://api.devnet.solana.com`

**Step 2: Create deployer wallet (if no existing wallet)**

Run:
```bash
solana-keygen new --outfile ~/.config/solana/id.json
```
Expected: Generates keypair, shows public key. **Save the seed phrase.**

If wallet already exists, skip this step. Check with:
```bash
solana address
```

**Step 3: Airdrop devnet SOL**

Run (repeat 3 times, waiting 30s between each):
```bash
solana airdrop 5
```
Expected: Each returns `5 SOL`. Total ~15 SOL needed for 4 program deploys.

If airdrop fails (rate limit), use https://faucet.solana.com manually.

**Step 4: Verify balance**

Run:
```bash
solana balance
```
Expected: `>= 10 SOL` (minimum for deploying 4 programs)

---

### Task 3: Build Anchor Programs

**Context:** Build in WSL2. The project is at the Windows path, accessible via `/mnt/c/Users/victo/PROJETS/spl578` in WSL.

**Step 1: Navigate to project**

Run:
```bash
cd /mnt/c/Users/victo/PROJETS/spl578
```

**Step 2: Install JS dependencies (needed for IDL generation)**

Run:
```bash
yarn install
```
Expected: `Done` with no errors.

**Step 3: First build (generates keypairs)**

Run:
```bash
anchor build
```
Expected: Compiles all 4 programs. Generates keypair files in `target/deploy/`. May take 3-5 minutes. Warnings about placeholder IDs are normal.

**Step 4: Sync real program IDs**

Run:
```bash
anchor keys sync
```
Expected: Updates `declare_id!()` in all 4 `lib.rs` files AND `Anchor.toml` with real program IDs from `target/deploy/` keypairs.

**Step 5: Record the real program IDs**

Run:
```bash
anchor keys list
```
Expected output (example — your IDs will differ):
```
spl578: AbC123...
oracle_agent_578: DeF456...
trading_agent_578: GhI789...
assistant_agent_578: JkL012...
```
**IMPORTANT: Save these 4 IDs. You need them for env files later.**

**Step 6: Rebuild with correct IDs embedded**

Run:
```bash
anchor build
```
Expected: Clean compile. Programs now have their real IDs baked in.

---

### Task 4: Deploy Programs to Devnet

**Step 1: Deploy all 4 programs**

Run:
```bash
anchor deploy --provider.cluster devnet
```
Expected: Deploys each program. Shows `Program Id: <real-id>` for each. Takes 1-2 minutes per program.

If a deploy fails with "insufficient funds", airdrop more SOL and retry.

If a deploy fails with "program too large", use:
```bash
solana program deploy target/deploy/spl578.so --program-id target/deploy/spl578-keypair.json --max-len 200000
```

**Step 2: Verify deployment**

Run:
```bash
anchor keys list
solana program show <spl578-program-id>
solana program show <oracle-program-id>
solana program show <trading-program-id>
solana program show <assistant-program-id>
```
Expected: Each shows `Program Id`, `Owner: BPFLoaderUpgradeab1e...`, `Executable: true`

---

### Task 5: Update All Config Files with Real Program IDs

**Context:** After `anchor keys sync`, the lib.rs and Anchor.toml are already updated. But the SDK constants, backend .env, and root .env.example still have placeholder IDs. Do this step from Windows (Claude Code).

**Files to update:**

**Step 1: Update `sdk/src/constants.ts`**

File: `C:\Users\victo\PROJETS\spl578\sdk\src\constants.ts`

Replace all 4 placeholder program IDs with real ones from `anchor keys list`:
```typescript
export const SPL578_PROGRAM_ID = new PublicKey("<REAL_SPL578_ID>");
export const ORACLE_PROGRAM_ID = new PublicKey("<REAL_ORACLE_ID>");
export const TRADING_PROGRAM_ID = new PublicKey("<REAL_TRADING_ID>");
export const ASSISTANT_PROGRAM_ID = new PublicKey("<REAL_ASSISTANT_ID>");
```

**Step 2: Update `backend/.env`**

File: `C:\Users\victo\PROJETS\spl578\backend\.env`

```
SPL578_PROGRAM_ID=<REAL_SPL578_ID>
```

(REGISTRY_PDA will be filled in Task 6 after initialization.)

**Step 3: Update root `.env.example`**

File: `C:\Users\victo\PROJETS\spl578\.env.example`

Fill in all 4 program IDs for documentation:
```
SPL578_PROGRAM_ID=<REAL_SPL578_ID>
ORACLE_PROGRAM_ID=<REAL_ORACLE_ID>
TRADING_PROGRAM_ID=<REAL_TRADING_ID>
ASSISTANT_PROGRAM_ID=<REAL_ASSISTANT_ID>
```

---

### Task 6: Initialize On-Chain Registry

**Context:** Run from WSL2 in the project directory.

**Step 1: Run the registry initialization script**

Run:
```bash
cd /mnt/c/Users/victo/PROJETS/spl578
npx ts-node --esm scripts/02_initialize_registry.ts
```

If `ts-node` doesn't work with Anchor workspace, use:
```bash
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
ANCHOR_WALLET=~/.config/solana/id.json \
npx ts-node scripts/02_initialize_registry.ts
```

Expected output:
```
Initializing AgentRegistry...
  Authority: <your-wallet>
  Treasury: <your-wallet>
  Mint fee: 0.01 SOL
  Registry PDA: <REGISTRY_PDA_ADDRESS>

Registry initialized! TX: <tx-hash>
```

**IMPORTANT: Save the Registry PDA address.**

**Step 2: Update backend .env with Registry PDA**

File: `C:\Users\victo\PROJETS\spl578\backend\.env`

```
REGISTRY_PDA=<REAL_REGISTRY_PDA>
```

---

### Task 7: Create Demo Agents

**Step 1: Run the demo agent creation script**

Run (WSL2):
```bash
cd /mnt/c/Users/victo/PROJETS/spl578
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
ANCHOR_WALLET=~/.config/solana/id.json \
npx ts-node scripts/03_create_demo_agents.ts
```

Expected output:
```
Creating demo agents...
  Registry: <registry-pda>
  Current total agents: 0

--- Creating agent 1: Alpha Oracle ---
  Mint: <mint1>
  TX: <tx1>

--- Creating agent 2: Sigma Trader ---
  Mint: <mint2>
  TX: <tx2>

--- Creating agent 3: Echo Assistant ---
  Mint: <mint3>
  TX: <tx3>

Done! Total agents: 3
```

---

### Task 8: Seed Oracle Prices

**Step 1: Run the oracle seeding script**

Run (WSL2):
```bash
cd /mnt/c/Users/victo/PROJETS/spl578
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
ANCHOR_WALLET=~/.config/solana/id.json \
npx ts-node scripts/05_seed_oracle_prices.ts
```

Expected output:
```
=== Seeding Oracle Prices ===
Attesting SOL: $150
Attesting USDC: $1
Attesting RAY: $1.80
Attesting BONK: $0.01
Attesting JTO: $2.50
Done! All 5 test prices seeded.
```

---

### Task 9: Verify On-Chain Deployment

**Step 1: Run verification script**

Run (WSL2):
```bash
cd /mnt/c/Users/victo/PROJETS/spl578
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
ANCHOR_WALLET=~/.config/solana/id.json \
npx ts-node scripts/04_verify_on_explorer.ts
```

Expected: Prints Explorer + SolanaFM links for all 4 programs.

**Step 2: Open one Explorer link in browser**

Verify the program shows as "Executable" with correct data on Solana Explorer (devnet).

---

### Task 10: Modify Backend to Support Env-Based Keypair (Railway Compatibility)

**Context:** Railway has no persistent filesystem, so `backend-wallet.json` file won't work. We need the backend to support reading the keypair from an environment variable as a base64-encoded JSON array.

**File:** `C:\Users\victo\PROJETS\spl578\backend\src\services\solana.ts`

**Step 1: Modify `getBackendKeypair()` to support env var**

Replace the current `getBackendKeypair` function:

```typescript
export function getBackendKeypair(): Keypair {
  // Prefer env var (for Railway/cloud), fall back to file (for local dev)
  if (process.env.BACKEND_KEYPAIR_BASE64) {
    const decoded = Buffer.from(process.env.BACKEND_KEYPAIR_BASE64, "base64");
    const secretKey = JSON.parse(decoded.toString());
    return Keypair.fromSecretKey(Uint8Array.from(secretKey));
  }
  const keypairPath = process.env.BACKEND_KEYPAIR_PATH || "./backend-wallet.json";
  const secretKey = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(secretKey));
}
```

**Step 2: Generate backend wallet keypair**

Run (WSL2):
```bash
solana-keygen new --outfile /tmp/backend-wallet.json --no-bip39-passphrase
```

**Step 3: Create base64 version for Railway**

Run:
```bash
cat /tmp/backend-wallet.json | base64 -w 0
```
**Save this base64 string** — you'll paste it as `BACKEND_KEYPAIR_BASE64` env var in Railway.

**Step 4: Copy keypair file for local dev**

Run:
```bash
cp /tmp/backend-wallet.json /mnt/c/Users/victo/PROJETS/spl578/backend/backend-wallet.json
```

**Step 5: Verify backend builds locally**

Run (Windows):
```bash
cd C:\Users\victo\PROJETS\spl578\backend
npm run build
```
Expected: `tsc` compiles with no errors, `dist/` directory created.

---

### Task 11: Commit and Push to GitHub

**Step 1: Review all changes**

Run:
```bash
git status
git diff
```

**Step 2: Stage and commit**

```bash
git add -A
git commit -m "feat: devnet deployment — real program IDs + Railway keypair support"
```

**Step 3: Push to GitHub**

```bash
git push origin main
```

(Or your default branch name.)

---

### Task 12: Deploy Backend to Railway

**Context:** Railway is connected to your GitHub repo.

**Step 1: Create Railway project (via CLI or dashboard)**

Option A — CLI:
```bash
npm install -g @railway/cli
railway login
railway init
```

Option B — Dashboard: Go to https://railway.app/dashboard → New Project → Deploy from GitHub Repo → select `spl578`.

**Step 2: Configure Railway service**

In Railway dashboard for this service:
- **Root directory:** `backend`
- **Build command:** `npm run build`
- **Start command:** `npm run start`

**Step 3: Set environment variables in Railway**

```
SOLANA_RPC_URL=https://api.devnet.solana.com
SPL578_PROGRAM_ID=<REAL_SPL578_ID>
REGISTRY_PDA=<REAL_REGISTRY_PDA>
JWT_SECRET=<generate a random 64-char string>
BACKEND_KEYPAIR_BASE64=<base64 string from Task 10 Step 3>
ALLOWED_ORIGINS=https://<your-vercel-url>.vercel.app
RATE_LIMIT_PER_WALLET=100
OWNERSHIP_CACHE_TTL=600
PORT=3001
```

To generate JWT_SECRET:
```bash
openssl rand -hex 32
```

**Step 4: Deploy and verify**

Railway auto-deploys on push. Wait for build to complete.

Test the health endpoint:
```bash
curl https://<railway-url>/health
```
Expected: `{"status":"ok","timestamp":"..."}`

**IMPORTANT: Note your Railway URL (e.g. `https://spl578-backend-production-xxxx.up.railway.app`). You need it for the frontend.**

---

### Task 13: Deploy Frontend to Vercel

**Step 1: Connect Vercel to GitHub repo**

Go to https://vercel.com/dashboard → New Project → Import `spl578` repo.

**Step 2: Configure Vercel project**

- **Root directory:** `frontend`
- **Framework preset:** Vite
- **Build command:** `npm run build`
- **Output directory:** `dist`

**Step 3: Set environment variables in Vercel**

```
VITE_API_URL=https://<railway-url>
VITE_SOLANA_RPC=https://api.devnet.solana.com
```

**Step 4: Deploy**

Vercel auto-deploys. Wait for build to complete.

**Step 5: Update Railway CORS**

Go back to Railway and update the `ALLOWED_ORIGINS` env var:
```
ALLOWED_ORIGINS=https://<your-app>.vercel.app,http://localhost:8080
```
Railway will auto-redeploy.

---

### Task 14: End-to-End Validation

**Step 1: Open Vercel URL in browser**

Expected: The Three.js cyberpunk city loads with agent buildings.

**Step 2: Connect Phantom wallet**

- Open Phantom → Settings → Developer Settings → Change network to Devnet
- Connect wallet on the site
Expected: Wallet connects, address shows in UI.

**Step 3: Verify agents load**

Expected: Agent list shows data (either from on-chain registry or seed data fallback).

**Step 4: Check backend health**

Run:
```bash
curl https://<railway-url>/health
```
Expected: `{"status":"ok",...}`

**Step 5: Check agents API**

Run:
```bash
curl https://<railway-url>/agents
```
Expected: JSON array of agents (seed data or on-chain).

**Step 6: Verify programs on Explorer**

Open each program URL from Task 9 verification output. Confirm they show as deployed and executable.

---

## Quick Reference: Files Modified

| File | Change |
|------|--------|
| `programs/*/src/lib.rs` | Real program IDs (via `anchor keys sync`) |
| `Anchor.toml` | Real program IDs (via `anchor keys sync`) |
| `sdk/src/constants.ts` | Real program IDs |
| `backend/.env` | Real program ID + Registry PDA |
| `backend/src/services/solana.ts` | Added `BACKEND_KEYPAIR_BASE64` support |
| `frontend/.env` | `VITE_API_URL` → Railway URL |
| `.env.example` | Documented real program IDs |

## Quick Reference: Services

| Service | URL |
|---------|-----|
| Frontend | `https://<app>.vercel.app` |
| Backend | `https://<app>.up.railway.app` |
| Solana Devnet | `https://api.devnet.solana.com` |
| Explorer | `https://explorer.solana.com/address/<program-id>?cluster=devnet` |
