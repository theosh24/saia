# SPL578 Devnet Deployment Design

**Date:** 2026-03-03
**Scope:** Full stack deployment — 4 Anchor programs + Backend (Railway) + Frontend (Vercel)

## Architecture Overview

```
[Vercel - Frontend]  <-->  [Railway - Backend]  <-->  [Solana Devnet - 4 Programs]
   React + Three.js          Express + JWT             spl578, oracle, trading, assistant
   Port: auto (Vercel)       Port: auto (Railway)      Metaplex Core NFAs
```

## Phase 1: WSL2 Toolchain Setup

**Goal:** Install Rust, Solana CLI, and Anchor CLI in WSL2.

1. Install Rust via rustup (stable, >= 1.75)
2. Install Solana CLI v1.18.x
3. Install Anchor CLI v0.30.1
4. Configure Solana for devnet: `solana config set --url devnet`
5. Create or import devnet wallet: `solana-keygen new`
6. Airdrop SOL: `solana airdrop 5` (repeat ~3 times, need ~15 SOL for 4 program deploys)

## Phase 2: Build & Deploy Programs

**Goal:** Compile, assign real program IDs, and deploy all 4 programs to devnet.

1. `anchor build` — generates binaries + IDLs
2. `anchor keys sync` — extracts real program IDs, updates lib.rs + Anchor.toml
3. `anchor build` — rebuild with correct IDs embedded
4. `anchor deploy --provider.cluster devnet` — deploy all 4 programs
5. `anchor keys list` — record the real program IDs
6. Verify on Solana Explorer

**Programs:**
- `spl578` — Core NFA launchpad (registry, agents, evolution)
- `oracle_agent_578` — Oracle price feeds with ed25519 sig verification
- `trading_agent_578` — Trade journal with session management
- `assistant_agent_578` — Session store for assistant agents

## Phase 3: Initialize On-Chain State

**Goal:** Create registry, demo agents, and seed oracle data.

1. **Script 02** — Initialize AgentRegistry PDA
   - Mint fee: 0.01 SOL
   - Authority = deployer wallet
2. **Script 03** — Create 3 demo agents
   - Alpha Oracle (oracle), Sigma Trader (trader), Echo Assistant (assistant)
   - Each creates Metaplex Core asset + AgentState + AgentEntry PDAs
3. **Script 05** — Seed oracle prices
   - 5 tokens: SOL ($150), USDC ($1), RAY ($1.80), BONK ($0.01), JTO ($2.50)
   - Uses ed25519 signature verification
4. **Script 04** — Verify on Explorer (links + IDL upload commands)

## Phase 4: Deploy Backend to Railway

**Goal:** Deploy Express backend with real program IDs.

1. Push repo to GitHub (already connected)
2. Connect Railway to GitHub repo
3. Configure Railway:
   - Root directory: `backend/`
   - Build command: `npm run build`
   - Start command: `npm run start`
4. Set environment variables:
   - `SOLANA_RPC_URL=https://api.devnet.solana.com`
   - `SPL578_PROGRAM_ID=<real ID from phase 2>`
   - `REGISTRY_PDA=<real PDA from phase 3>`
   - `JWT_SECRET=<secure random string>`
   - `BACKEND_KEYPAIR_PATH=./backend-wallet.json`
   - `ALLOWED_ORIGINS=<vercel URL>`
   - `PORT=3001`
5. Generate and upload backend-wallet.json (or use Railway secrets)
6. Verify health endpoint: `GET /health`

## Phase 5: Deploy Frontend to Vercel

**Goal:** Deploy React frontend pointing to Railway backend.

1. Connect Vercel to GitHub repo
2. Configure Vercel:
   - Root directory: `frontend/`
   - Build command: `npm run build`
   - Output directory: `dist/`
   - Framework preset: Vite
3. Set environment variables:
   - `VITE_API_URL=<Railway backend URL>`
   - `VITE_SOLANA_RPC=https://api.devnet.solana.com`
4. Update Railway `ALLOWED_ORIGINS` with Vercel URL
5. Deploy and verify

## Phase 6: Validation

1. Open Vercel URL in browser
2. Connect Phantom wallet (switch to devnet)
3. Verify 3D city renders
4. Verify agent list loads (from backend → on-chain or seed data)
5. Test wallet auth flow (sign message → JWT)
6. Check Explorer links for all 4 programs
7. Verify oracle prices are readable

## Environment Variables Summary

| Variable | Backend | Frontend |
|----------|---------|----------|
| SOLANA_RPC_URL | devnet | - |
| VITE_SOLANA_RPC | - | devnet |
| SPL578_PROGRAM_ID | real ID | - |
| REGISTRY_PDA | real PDA | - |
| JWT_SECRET | random | - |
| VITE_API_URL | - | Railway URL |
| ALLOWED_ORIGINS | Vercel URL | - |
| PORT | 3001 | - |

## Risks & Mitigations

- **Airdrop limits:** Devnet faucet limits to 5 SOL per request. May need multiple airdrops or use faucet website.
- **Program size:** Large programs may exceed deploy buffer. Use `--max-len` if needed.
- **Metaplex Core on devnet:** Already handled via test validator clone config. On devnet the program exists natively.
- **Backend wallet:** Need to securely generate and store keypair for Railway. Consider using env var for base64-encoded keypair instead of file.
