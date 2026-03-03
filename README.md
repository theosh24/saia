# SPL-578 — Non-Fungible Agent (NFA) Launchpad

**Vector578** is a Solana-native Non-Fungible Agent (NFA) launchpad built on SPL-578, the Solana adaptation of BAP-578. Each AI agent is represented by a Metaplex Core NFT with on-chain state managed via PDAs.

## EVM vs Solana

| Concept EVM | Solana Equivalent | Impact |
|---|---|---|
| `mapping(id => struct)` | **PDA** (Program Derived Address) | Each agent = 1 PDA account |
| `contract` with storage | **Stateless program** + accounts | Program stores nothing; state is in accounts |
| `msg.sender` | `ctx.accounts.signer.key()` | ed25519 signatures (not ECDSA) |
| `logicAddress` (delegatecall) | **CPI** (Cross-Program Invocation) | Direct calls between Anchor programs |
| ERC-721 | **Metaplex Core NFT** | Standard NFT, compatible with wallets and marketplaces |
| `emit Event()` | `emit!(EventStruct { .. })` | Logged in transaction logs |
| Wei / gwei | Lamports (1 SOL = 1e9 lamports) | Rent for accounts |
| Factory deploy | **Anchor `init` + seeds** | No bytecode deployment at runtime |

## Core Concepts

### NFA — Non-Fungible Agent
A Metaplex Core NFT whose public key serves as the seed for its state PDA. Ownership is verified at instruction time directly from the Metaplex Core asset account.

### AgentState PDA
Seeds: `["agent_state", mint.key()]`

Stores all mutable agent state: name, description, backend URI, logic program, state hash, evolution count, compliance fields, and retirement status.

### EvolutionLog
Seeds: `["evolution", mint.key(), index.to_le_bytes()]`

Indexed PDAs forming a verifiable evolution history chain. Each log records the previous hash, new hash, and timestamp.

### LogicProgram
An Anchor program implementing the `execute_agent_action` CPI interface. The core program delegates execution via CPI, passing action data and remaining accounts.

### BackendURI
HTTPS endpoint for the agent's off-chain backend. Used by the API server to proxy chat requests to the agent creator's infrastructure.

### AgentRegistry
Seeds: `["registry"]` (singleton)

Global registry listing all launched agents. Contains authority, mint fee, treasury, and total agent count. Individual agents are indexed via AgentEntry PDAs.

## Lifecycle

```
launch_agent → evolve → execute_action (CPI) → transfer NFT → retire
```

1. **launch_agent** — Pay mint fee, create Metaplex Core NFT, init AgentState and AgentEntry PDAs
2. **evolve** — Owner submits new state hash, creating an EvolutionLog entry
3. **execute_action** — CPI to the agent's logic program with arbitrary action data
4. **upgrade_logic** — Owner updates the CPI target program
5. **set_backend_uri** — Owner sets/updates the HTTPS backend endpoint
6. **retire_agent** — Owner permanently retires the agent (irreversible)

## Instructions

### initialize_registry

| Account | Type | Description |
|---|---|---|
| authority | Signer, mut | Registry admin |
| registry | PDA, init | `["registry"]` |
| system_program | Program | System Program |

**Args:** `mint_fee_lamports: u64`, `treasury: Pubkey`

### launch_agent

| Account | Type | Description |
|---|---|---|
| payer | Signer, mut | Pays fee + rent |
| asset | Signer, mut | New NFT keypair |
| registry | PDA, mut | `["registry"]` |
| agent_state | PDA, init | `["agent_state", asset]` |
| agent_entry | PDA, init | `["agent_entry", registry, index]` |
| treasury | mut | Fee recipient |
| mpl_core_program | Program | Metaplex Core |
| system_program | Program | System Program |

**Args:** `name`, `agent_type`, `description`, `backend_uri`, `logic_program`, `jurisdiction`, `kyc_level`, `tags`, `uri`

### evolve

| Account | Type | Description |
|---|---|---|
| owner | Signer, mut | NFT owner |
| asset | Read | Metaplex Core asset |
| agent_state | PDA, mut | `["agent_state", mint]` |
| evolution_log | PDA, init | `["evolution", mint, count]` |
| system_program | Program | System Program |

**Args:** `new_state_hash: [u8;32]`, `proof: Vec<u8>`

### execute_action

| Account | Type | Description |
|---|---|---|
| caller | Signer | Action initiator |
| asset | Read | Metaplex Core asset |
| agent_state | PDA, mut | `["agent_state", mint]` |
| logic_program | Read | CPI target |

**Args:** `action_data: Vec<u8>`

### upgrade_logic / set_backend_uri / retire_agent / verify_agent / update_registry_config

Owner-gated or admin-gated instructions. See source code for full account layouts.

## Agent Programs

### Oracle Agent (`oracle_agent_578`)
Price oracle with ed25519-signed attestations. Uses instruction sysvar introspection for signature verification.
- **OracleData PDA:** `["oracle_data", mint]`
- **PriceEntry PDA:** `["price", mint, token_pubkey]`

### Trading Agent (`trading_agent_578`)
Verifiable trade intent journal. Records trade intents with backend signatures.
- **TradeJournal PDA:** `["trade_journal", mint]`
- **TradeEntry PDA:** `["trade", mint, index]`

### Assistant Agent (`assistant_agent_578`)
On-chain session logging for AI conversations.
- **SessionStore PDA:** `["session_store", mint]`
- **SessionEntry PDA:** `["session", mint, index]`

## SDK Usage

```typescript
import { SPL578Client } from "@vector578/sdk";

const client = new SPL578Client(connection, program);

// Launch an agent
const { mint, tx } = await client.launchAgent({
  name: "My Oracle",
  agentType: { oracle: {} },
  description: "Price feed oracle",
  backendUri: "https://my-oracle.example.com/api",
  logicProgram: null,
  jurisdiction: "US",
  kycLevel: 0,
  tags: ["oracle", "defi"],
  uri: "https://arweave.net/metadata.json",
}, payerKeypair);

// Read agent state
const state = await client.getAgentState(mint);

// Evolve
await client.evolveAgent(mint, newStateHash, ownerKeypair);

// Check ownership
const isOwner = await client.isOwner(mint, walletPubkey);
```

## Backend API

### Auth Flow (ed25519)
1. Client signs message with `wallet.signMessage()` → ed25519 signature
2. `POST /auth/verify-ownership` — backend verifies sig with `nacl.sign.detached.verify`, checks Metaplex Core ownership, issues JWT
3. JWT used as Bearer token for `/chat` endpoints

### Endpoints
- `POST /auth/verify-ownership` — Authenticate via NFA ownership
- `GET /agents?type=ORACLE&page=0&limit=20` — List agents
- `GET /agents/:mint` — Get agent details
- `POST /chat` — Send message to agent (JWT required)
- `POST /chat/log-session` — Log session on-chain (JWT required)

## Deployment

```bash
# 1. Build and deploy programs
cd scripts && bash 01_deploy_programs.sh

# 2. Initialize registry
npx ts-node scripts/02_initialize_registry.ts

# 3. Create demo agents
npx ts-node scripts/03_create_demo_agents.ts

# 4. Start backend
cd backend && npm install && npm run dev
```

## Dev Setup

### Prerequisites
- Rust 1.75+
- Solana CLI 1.18.x
- Anchor CLI 0.30.1
- Node.js 18.x or 20.x LTS

### Build
```bash
# Install dependencies
yarn install
cd backend && npm install && cd ..
cd sdk && npm install && cd ..

# Build Anchor programs (use WSL2 on Windows)
anchor build
anchor keys sync
anchor build

# Run tests
anchor test
```

### Environment Variables
Copy `.env.example` to `.env` and fill in:
- `SOLANA_RPC_URL` — Solana RPC endpoint
- `SPL578_PROGRAM_ID` — Deployed program ID
- `JWT_SECRET` — Secret for JWT signing
- `BACKEND_KEYPAIR_PATH` — Path to backend wallet keypair

## Project Structure

```
spl578/
├── programs/
│   ├── spl578/                    Core NFA program
│   ├── oracle_agent_578/          Oracle agent
│   ├── trading_agent_578/         Trading agent
│   └── assistant_agent_578/       Assistant agent
├── sdk/src/                       TypeScript SDK
├── backend/src/                   Express API server
├── tests/                         Anchor test suite
├── scripts/                       Deploy & setup scripts
├── Anchor.toml
├── Cargo.toml
└── package.json
```
