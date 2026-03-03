# SPL578 — Build Plan for Claude Code

> **Project:** Vector578 on Solana — SPL-578 Non-Fungible Agent (NFA) Launchpad  
> **Standard:** SPL-578 (Solana-native adaptation of BAP-578)  
> **Stack:** Rust · Anchor 0.30 · Metaplex Core · TypeScript · Node.js (Express) · Solana Mainnet-Beta / Devnet

---

## Pourquoi Solana change tout vs EVM

Avant de coder, il faut internaliser les différences d'architecture :

| Concept EVM | Équivalent Solana | Impact |
|---|---|---|
| `mapping(id => struct)` | **PDA** (Program Derived Address) — compte dérivé déterministement | Chaque agent = 1 compte PDA distinct |
| `contract` avec storage | **Program stateless** + comptes séparés | Le program ne stocke rien, tout est dans des accounts |
| `msg.sender` | `ctx.accounts.signer.key()` | Signature ed25519, pas ECDSA |
| `logicAddress` (delegatecall) | **CPI** (Cross-Program Invocation) | Appel direct entre programs Anchor |
| ERC-721 | **Metaplex Core NFT** (Asset account) | Standard NFT Solana, compatible wallets/marketplaces |
| `emit Event()` | `emit!(EventStruct { .. })` via Anchor | Loggés dans les transaction logs |
| `address` | `Pubkey` (32 bytes) | Ed25519 |
| Wei / gwei | Lamports (1 SOL = 1e9 lamports) | Rent pour les comptes |
| `bytes32` hash | `[u8; 32]` | Identique |
| Factory deploy | **Anchor `init` + seeds** | Pas de déploiement de bytecode à runtime |

> **Clé de tout :** En Solana, on ne déploie pas un nouveau contrat par agent. On crée des **comptes PDA** rattachés à un seul Program. L'agent "existe" via son account, pas son adresse de contrat.

---

## Architecture SPL-578

```
SPL578 Program (Anchor)
│
├── AgentMint Account     ← Metaplex Core NFT (ownership, transfer, marketplace)
├── AgentState PDA        ← seeds: ["agent_state", mint_pubkey]
│   ├── agent_type
│   ├── name / description
│   ├── backend_uri
│   ├── state_hash [u8;32]
│   ├── evolution_count u64
│   ├── logic_program Option<Pubkey>
│   ├── jurisdiction / kyc_level / tags
│   └── retired bool
├── EvolutionLog PDA      ← seeds: ["evolution", mint_pubkey, index_u64]
│   ├── state_hash [u8;32]
│   └── timestamp i64
└── AgentRegistry PDA     ← seeds: ["registry", factory_pubkey]
    └── Vec<AgentEntry>   (ou entries paginées via sous-PDAs)
```

---

## Deliverable 1 — `README.md`

Créer `README.md` à la racine. Sections :

- **SPL-578 — What is it?** Fork de BAP-578 adapté à Solana. NFTs = Metaplex Core Assets + PDAs d'état agent.
- **Différences avec ERC-578** — Table comparative EVM vs Solana
- **Core Concepts :**
  - `NFA` — Non-Fungible Agent : un Metaplex Core NFT dont la clé publique sert de seed à son PDA d'état
  - `AgentState PDA` — Compte dérivé qui stocke tout l'état mutable de l'agent
  - `EvolutionLog` — PDAs indexés qui forment l'historique d'évolution vérifiable
  - `LogicProgram` — Program Solana (Anchor) implémentant le trait `AgentLogic` via CPI
  - `BackendURI` — Endpoint HTTPS du serveur de l'agent off-chain
  - `AgentRegistry` — PDA global listant tous les agents du launchpad
- **Lifecycle :** `launch_agent` → `evolve` → `execute_action` (CPI) → `transfer NFT` → `retire`
- **Interfaces** — Toutes les instructions Anchor avec leurs comptes
- **Launchpad** — Comment Vector578 factory crée les agents
- **Chat API** — Flow d'auth par possession du NFT (signature ed25519)
- **Deployment addresses** — Table Devnet / Mainnet-Beta

---

## Deliverable 2 — SPL-578 Program Principal

### Workspace Cargo

```
vector578/
├── Anchor.toml
├── Cargo.toml (workspace)
├── programs/
│   ├── spl578/                 ← Program principal
│   ├── oracle_agent_578/       ← Agent Oracle
│   ├── trading_agent_578/      ← Agent Trader
│   └── assistant_agent_578/    ← Agent Assistant
└── tests/
```

### File: `programs/spl578/src/lib.rs`

#### State accounts

```rust
// AgentState — PDA seeds: ["agent_state", mint.key()]
#[account]
pub struct AgentState {
    pub mint: Pubkey,                    // Metaplex Core NFT mint
    pub creator: Pubkey,
    pub agent_type: AgentType,           // enum u8
    pub name: String,                    // max 64 chars
    pub description: String,             // max 256 chars
    pub backend_uri: String,             // max 256 chars, HTTPS endpoint
    pub logic_program: Option<Pubkey>,   // CPI target program
    pub state_hash: [u8; 32],            // keccak256 / sha256 of state JSON
    pub evolution_count: u64,
    pub created_at: i64,
    pub last_evolved_at: i64,
    pub retired: bool,
    // Compliance
    pub jurisdiction: String,            // max 16 chars
    pub kyc_level: u8,                   // 0 = none, 1 = basic, 2 = full
    pub tags: Vec<String>,               // max 8 tags, max 32 chars each
    pub bump: u8,
}

// EvolutionLog — PDA seeds: ["evolution", mint.key(), index.to_le_bytes()]
#[account]
pub struct EvolutionLog {
    pub mint: Pubkey,
    pub index: u64,
    pub previous_hash: [u8; 32],
    pub new_hash: [u8; 32],
    pub timestamp: i64,
    pub bump: u8,
}

// AgentRegistry — PDA seeds: ["registry"]  (singleton)
#[account]
pub struct AgentRegistry {
    pub authority: Pubkey,
    pub total_agents: u64,
    pub mint_fee_lamports: u64,
    pub treasury: Pubkey,
    pub bump: u8,
}

// AgentEntry — PDA seeds: ["agent_entry", registry.key(), index.to_le_bytes()]
#[account]
pub struct AgentEntry {
    pub token_id: u64,           // sequential index
    pub mint: Pubkey,
    pub agent_state: Pubkey,
    pub creator: Pubkey,
    pub agent_type: AgentType,
    pub name: String,
    pub backend_uri: String,
    pub verified: bool,
    pub registered_at: i64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum AgentType {
    Assistant = 0,
    Oracle    = 1,
    Trader    = 2,
    Moderator = 3,
    Custom    = 4,
}
```

#### Instructions (= fonctions du program)

**`launch_agent`**
```rust
// Accounts:
// - signer (payer, owner du futur NFT)
// - registry PDA (mutable)
// - agent_state PDA (init, seeds: ["agent_state", mint])
// - agent_entry PDA (init, seeds: ["agent_entry", registry, index])
// - mint (Metaplex Core Asset, init via CPI vers mpl_core)
// - mpl_core_program
// - system_program
//
// Params: LaunchAgentArgs { name, agent_type, description, backend_uri,
//                           logic_program, jurisdiction, kyc_level, tags }
//
// Logic:
// 1. Transfer mint_fee_lamports du signer vers treasury
// 2. CPI mpl_core::create_asset() → crée le NFT Metaplex Core
// 3. Init AgentState PDA avec les métadonnées
// 4. Init AgentEntry PDA et incrémenter registry.total_agents
// 5. Emit AgentLaunched { mint, creator, agent_type, name, timestamp }
```

**`evolve`**
```rust
// Accounts:
// - owner (signer, doit être owner du NFT)
// - mint (Metaplex Core Asset, read — pour vérifier ownership)
// - agent_state PDA (mutable)
// - evolution_log PDA (init, seeds: ["evolution", mint, evolution_count])
// - system_program
//
// Params: EvolveArgs { new_state_hash: [u8;32], proof: Vec<u8> }
//
// Logic:
// 1. Vérifier owner == mpl_core asset.owner via CPI fetch_asset
// 2. Vérifier !agent_state.retired
// 3. Init EvolutionLog avec previous_hash + new_hash + timestamp
// 4. Mettre à jour agent_state.state_hash, evolution_count, last_evolved_at
// 5. Emit AgentEvolved { mint, previous_hash, new_hash, evolution_count }
```

**`execute_action`**
```rust
// Accounts:
// - caller (signer)
// - mint
// - agent_state PDA (mutable si l'action modifie l'état)
// - logic_program (le program CPI target, Option)
// - remaining_accounts: comptes requis par le logic_program
//
// Params: ExecuteActionArgs { action_data: Vec<u8> }
//
// Logic:
// 1. Si agent_state.logic_program est Some(prog) → CPI vers prog::execute_action()
// 2. Sinon → retourner Err(SPL578Error::NoLogicProgram)
// 3. Emit ActionExecuted { mint, caller, action_data_hash }
```

**`upgrade_logic`**
```rust
// Accounts: owner (signer), mint, agent_state PDA (mutable)
// Params: UpgradeLogicArgs { new_logic_program: Option<Pubkey> }
// Logic: vérifier owner, mettre à jour logic_program, emit LogicUpgraded
```

**`set_backend_uri`**
```rust
// Accounts: owner (signer), mint, agent_state PDA (mutable)  
// Params: SetBackendURIArgs { uri: String }
// Logic: vérifier owner, mettre à jour backend_uri, emit BackendURIUpdated
```

**`retire_agent`**
```rust
// Accounts: owner (signer), mint, agent_state PDA (mutable)
// Logic: vérifier owner, set retired = true, emit AgentRetired
```

**`verify_agent`** (admin only)
```rust
// Accounts: authority (signer == registry.authority), agent_entry PDA (mutable)
// Logic: set agent_entry.verified = true
```

**`update_registry_config`** (admin)
```rust
// Params: UpdateRegistryArgs { mint_fee_lamports, treasury }
```

#### Errors
```rust
#[error_code]
pub enum SPL578Error {
    #[msg("Not the NFT owner")]       NotOwner,
    #[msg("Agent is retired")]        AgentRetired,
    #[msg("No logic program set")]    NoLogicProgram,
    #[msg("Invalid proof")]           InvalidProof,
    #[msg("String too long")]         StringTooLong,
    #[msg("Too many tags")]           TooManyTags,
    #[msg("Insufficient fee")]        InsufficientFee,
    #[msg("URI must be HTTPS")]       InvalidURI,
}
```

#### Events
```rust
#[event] pub struct AgentLaunched   { pub mint: Pubkey, pub creator: Pubkey, pub agent_type: u8, pub name: String, pub timestamp: i64 }
#[event] pub struct AgentEvolved    { pub mint: Pubkey, pub previous_hash: [u8;32], pub new_hash: [u8;32], pub count: u64 }
#[event] pub struct LogicUpgraded   { pub mint: Pubkey, pub old_logic: Option<Pubkey>, pub new_logic: Option<Pubkey> }
#[event] pub struct BackendURIUpdated { pub mint: Pubkey, pub uri: String }
#[event] pub struct ActionExecuted  { pub mint: Pubkey, pub caller: Pubkey, pub data_hash: [u8;32] }
#[event] pub struct AgentRetired    { pub mint: Pubkey, pub timestamp: i64 }
```

---

## Deliverable 3 — Logic Trait Interface

### File: `programs/spl578/src/logic_interface.rs`

Définir le format CPI attendu par `execute_action`. Chaque logic program doit exposer cette instruction :

```rust
// Instruction discriminator attendu: "execute_agent_action"
// Comptes minimum requis par le CPI:
// 0: agent_state PDA (mutable)
// 1: caller (signer ou read-only)
// 2: mint (read-only)
// ...remaining accounts libres

// Retour: Vec<u8> (sérialisé Borsh)
// Le program principal ne décode pas le retour — il est loggé

// Chaque logic program DOIT aussi exposer:
// "validate_state" (mint: Pubkey, state_hash: [u8;32], proof: Vec<u8>) -> bool
```

Créer `programs/spl578/src/cpi_helpers.rs` avec les fonctions utilitaires CPI.

---

## Deliverable 4 — 3 Agent Programs

### Agent 1: `programs/oracle_agent_578/`

**Type:** ORACLE  
**Rôle:** Atteste des prix signés on-chain. Implémente le CPI `execute_agent_action`.

State PDA propre : `["oracle_data", mint]`
```rust
#[account]
pub struct OracleData {
    pub mint: Pubkey,
    pub authorized_signer: Pubkey,    // clé du backend qui signe les prix
    pub prices: Vec<PriceAttestation>, // max 100
    pub bump: u8,
}
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PriceAttestation {
    pub token: Pubkey,
    pub price_usd_cents: u64,         // price * 100 pour éviter les floats
    pub timestamp: i64,
    pub signature: [u8; 64],          // ed25519 sig du backend
}
```

Instructions :
- `initialize_oracle(authorized_signer)` — init OracleData PDA
- `execute_agent_action(action_data)` — décode `(token, price, timestamp, signature)`, vérifie sig ed25519 via `solana_program::ed25519_program`, push `PriceAttestation`, recalcule `state_hash`, émet `PriceAttested`
- `latest_price(token)` — view (off-chain via RPC getAccountInfo)

### Agent 2: `programs/trading_agent_578/`

**Type:** TRADER  
**Rôle:** Journal d'intents de trades signés par le backend. Couche d'audit vérifiable.

State PDA : `["trade_journal", mint]`
```rust
#[account]
pub struct TradeJournal {
    pub mint: Pubkey,
    pub backend_signer: Pubkey,
    pub trades: Vec<TradeIntent>,     // max 200
    pub bump: u8,
}
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct TradeIntent {
    pub trade_id: [u8; 32],
    pub token_in: Pubkey,
    pub token_out: Pubkey,
    pub amount_in: u64,               // en lamports ou unités SPL
    pub expected_out: u64,
    pub timestamp: i64,
    pub executed: bool,
    pub signature: [u8; 64],
}
```

Instructions :
- `initialize_journal(backend_signer)`
- `execute_agent_action(action_data)` — décode TradeIntent, vérifie sig backend, push trade, recalcule state_hash
- `mark_executed(trade_id)` — marque un trade comme exécuté (appelé après swap effectif)

> Note: ce program **ne fait pas de swaps** — c'est un journal d'intentions. Le swap réel peut être fait via Jupiter CPI dans une instruction séparée si besoin.

### Agent 3: `programs/assistant_agent_578/`

**Type:** ASSISTANT  
**Rôle:** Log de sessions de conversation. Stocke les hashes de sessions pour auditabilité.

State PDA : `["session_store", mint]`
```rust
#[account]
pub struct SessionStore {
    pub mint: Pubkey,
    pub owner: Pubkey,
    pub sessions: Vec<SessionEntry>,  // max 500
    pub bump: u8,
}
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct SessionEntry {
    pub session_hash: [u8; 32],
    pub summary_hash: [u8; 32],       // sha256 du résumé (le texte est off-chain)
    pub timestamp: i64,
}
```

Instructions :
- `initialize_store()`
- `execute_agent_action(action_data)` — décode `(session_hash, summary_hash)`, vérifie que caller est owner du NFT, push session, recalcule state_hash
- `session_count()` — via RPC
- `session_at(index)` — via RPC

---

## Deliverable 5 — Client SDK TypeScript

### File: `sdk/src/index.ts`

SDK TypeScript pour interagir avec le program depuis le frontend ou le backend.

```typescript
// Classes principales:
class SPL578Client {
    constructor(connection: Connection, program: Program<SPL578>)

    // Launch
    async launchAgent(args: LaunchAgentArgs, payer: Keypair): Promise<{ mint: PublicKey, tx: string }>

    // Read
    async getAgentState(mint: PublicKey): Promise<AgentState>
    async getAgentEntry(index: number): Promise<AgentEntry>
    async getEvolutionHistory(mint: PublicKey): Promise<EvolutionLog[]>
    async getAllAgents(offset: number, limit: number): Promise<AgentEntry[]>

    // Write
    async evolveAgent(mint: PublicKey, newStateHash: Uint8Array, owner: Keypair): Promise<string>
    async setBackendURI(mint: PublicKey, uri: string, owner: Keypair): Promise<string>
    async upgradeLogic(mint: PublicKey, newLogic: PublicKey | null, owner: Keypair): Promise<string>
    async retireAgent(mint: PublicKey, owner: Keypair): Promise<string>

    // Utils
    deriveAgentStatePDA(mint: PublicKey): [PublicKey, number]
    deriveEvolutionLogPDA(mint: PublicKey, index: number): [PublicKey, number]
    deriveAgentEntryPDA(index: number): [PublicKey, number]

    // Ownership check (pour le backend)
    async isOwner(mint: PublicKey, wallet: PublicKey): Promise<boolean>
    // Fetche le Metaplex Core asset et compare asset.owner
}
```

Exporter aussi les types Borsh/Anchor générés automatiquement via `anchor build`.

---

## Deliverable 6 — Backend API (Gated Agent Chat)

### Stack
- Node.js + Express + TypeScript
- `@coral-xyz/anchor` + `@solana/web3.js` pour les reads on-chain
- `@metaplex-foundation/mpl-core` pour vérifier ownership Metaplex Core
- `tweetnacl` pour vérification signature ed25519 côté serveur
- `jsonwebtoken` pour les JWT
- CORS configuré pour le domaine frontend

### Auth Flow (NFA Gating — Solana)

```
1. Client appelle POST /auth/verify-ownership
   Body: {
     wallet: "BASE58_PUBKEY",
     mint: "BASE58_MINT",
     message: "vector578:verify:{wallet}:{mint}:{timestamp}",
     signature: "BASE58_SIG"   ← ed25519 signature via wallet.signMessage()
   }

2. Backend:
   a. Décoder signature base58 → Uint8Array
   b. Vérifier sig avec nacl.sign.detached.verify(message, signature, wallet_pubkey)
   c. Fetch Metaplex Core asset account via RPC
   d. Vérifier asset.owner === wallet
   e. Vérifier agent_state.retired === false
   f. Émettre JWT signé: { wallet, mint, exp: now+3600 }

3. Client utilise JWT comme Bearer sur /chat

4. Middleware nfaGate:
   a. Vérifier JWT
   b. Re-check asset.owner toutes les 10 min (cache Redis-like en mémoire)
   c. Injecter { mint, agentState } dans req.context
```

> **Différence vs EVM :** La signature est ed25519 (pas ECDSA/secp256k1). `nacl.sign.detached.verify` suffit, pas besoin d'ethers `recoverAddress`.

### Routes

**`POST /auth/verify-ownership`**
```json
Request:
{
  "wallet": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "mint": "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin",
  "message": "vector578:verify:7xKX...:9xQe...:1717000000",
  "signature": "BASE58_SIG"
}
Response:
{
  "token": "<JWT>",
  "expiresIn": 3600,
  "agentType": "ORACLE",
  "agentName": "My Oracle Agent"
}
```

**`GET /agents?type=ORACLE&page=0&limit=20`**
```json
Response: {
  "agents": [
    {
      "mint": "9xQe...",
      "name": "Alpha Oracle",
      "agentType": "ORACLE",
      "backendURI": "https://...",
      "evolutionCount": 42,
      "verified": true,
      "tags": ["defi", "price-feed"]
    }
  ],
  "total": 156
}
// Lit depuis les AgentEntry PDAs via getProgramAccounts avec memcmp filter
```

**`GET /agents/:mint`**
```json
Response: {
  "mint": "9xQe...",
  "agentState": { ... },
  "evolutionHistory": [ { "hash": "...", "timestamp": 1717... } ]
}
```

**`POST /chat`** _(Bearer JWT requis)_
```json
Request:  { "mint": "9xQe...", "message": "Hello agent", "sessionId": "uuid" }
Response: { "reply": "...", "sessionHash": "BASE58_HASH", "latency_ms": 230 }
```

Logic `agentRouter.ts` :
- Lit `agentState.backendURI` depuis le cache ou RPC
- Si `backendURI` non vide → proxy la requête vers l'endpoint du dev avec headers d'auth
- Sinon → handler LLM Vector578 par défaut
- Réponse inclut `sessionHash` = sha256 du contenu de session

**`POST /chat/log-session`** _(Bearer JWT requis)_
```json
Request: { "mint": "9xQe...", "sessionHash": "BASE58", "summaryHash": "BASE58" }
// Construit et soumet une transaction Anchor:
// assistant_agent_578::execute_agent_action({ session_hash, summary_hash })
// Signe avec le backend keypair (payer des frais)
// Retourne: { "txSignature": "5x7K..." }
```

### Fichiers backend
```
backend/
├── src/
│   ├── index.ts
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── agents.ts
│   │   └── chat.ts
│   ├── middleware/
│   │   ├── nfaGate.ts          ← vérifie JWT + ownership Metaplex Core
│   │   └── rateLimiter.ts
│   ├── services/
│   │   ├── solana.ts           ← connection RPC, program client Anchor
│   │   ├── metaplex.ts         ← fetch asset owner via mpl-core
│   │   ├── agentRouter.ts      ← proxy backendURI ou LLM fallback
│   │   └── sessionLogger.ts    ← submit tx log-session on-chain
│   ├── cache/
│   │   └── ownershipCache.ts   ← Map<mint, {owner, expiry}> en mémoire
│   └── types/index.ts
├── .env.example
└── package.json
```

### Variables d'environnement
```
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SPL578_PROGRAM_ID=...
REGISTRY_PDA=...
JWT_SECRET=...
BACKEND_KEYPAIR_PATH=./backend-wallet.json   # paie les frais log-session
ALLOWED_ORIGINS=https://vector578.xyz
RATE_LIMIT_PER_WALLET=100
OWNERSHIP_CACHE_TTL=600
```

---

## Deliverable 7 — Tests

### `tests/spl578.ts` (Anchor + Mocha)
```typescript
describe("spl578 program", () => {
  it("initializes registry")
  it("launches an agent with correct PDAs")
  it("refuses launch with insufficient fee")
  it("evolves agent state")
  it("refuses evolve by non-owner")
  it("refuses evolve on retired agent")
  it("upgrades logic program")
  it("sets backend URI")
  it("retires agent")
  it("verifies agent (admin)")
  it("paginates agent entries")
})

describe("oracle_agent_578", () => {
  it("initializes oracle data")
  it("attests price with valid signature")
  it("rejects invalid signature")
  it("updates state hash after attestation")
})

describe("trading_agent_578", () => {
  it("logs trade intent")
  it("marks trade as executed")
  it("rejects duplicate trade_id")
})

describe("assistant_agent_578", () => {
  it("logs session hash")
  it("rejects log by non-owner")
  it("accumulates session count")
})
```

---

## Anchor.toml

```toml
[features]
seeds = true
skip-lint = false

[programs.localnet]
spl578             = "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"
oracle_agent_578   = "..."
trading_agent_578  = "..."
assistant_agent_578 = "..."

[programs.devnet]
# addresses après premier deploy

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "Devnet"
wallet = "~/.config/solana/id.json"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
```

---

## Deploy Scripts

```
scripts/
├── 01_deploy_programs.sh         ← anchor build && anchor deploy (4 programs)
├── 02_initialize_registry.ts     ← init AgentRegistry PDA + config
├── 03_create_demo_agents.ts      ← 3 agents démo (1 par type)
├── 04_verify_on_explorer.ts      ← links Anchor IDL sur SolanaFM/Anchor.so
└── 05_seed_oracle_prices.ts      ← pousse 5 prix de test sur l'OracleAgent
```

---

## Repo Structure Final

```
vector578-solana/
├── programs/
│   ├── spl578/
│   │   ├── src/
│   │   │   ├── lib.rs
│   │   │   ├── state.rs           ← tous les #[account] structs
│   │   │   ├── instructions/
│   │   │   │   ├── launch_agent.rs
│   │   │   │   ├── evolve.rs
│   │   │   │   ├── execute_action.rs
│   │   │   │   ├── upgrade_logic.rs
│   │   │   │   ├── set_backend_uri.rs
│   │   │   │   ├── retire_agent.rs
│   │   │   │   └── admin.rs
│   │   │   ├── errors.rs
│   │   │   ├── events.rs
│   │   │   └── cpi_helpers.rs
│   │   └── Cargo.toml
│   ├── oracle_agent_578/src/
│   ├── trading_agent_578/src/
│   └── assistant_agent_578/src/
├── sdk/
│   └── src/index.ts              ← Client TypeScript
├── backend/
│   └── src/ ...
├── tests/
│   └── *.ts
├── scripts/
│   └── ...
├── Anchor.toml
├── Cargo.toml
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

---

## Ordre d'implémentation pour Claude Code

1. **Setup workspace** — `Anchor.toml`, `Cargo.toml`, `package.json`, dépendances (`anchor-lang`, `mpl-core`, `@coral-xyz/anchor`, `@solana/web3.js`)
2. **spl578 program** — `state.rs` → `errors.rs` → `events.rs` → instructions dans l'ordre: `launch_agent`, `evolve`, `execute_action`, `upgrade_logic`, `set_backend_uri`, `retire_agent`, `admin.rs`
3. **3 agent programs** — `oracle_agent_578` → `trading_agent_578` → `assistant_agent_578`
4. **Tests** — `anchor test` doit passer à 100%
5. **SDK TypeScript** — `sdk/src/index.ts` avec `SPL578Client`
6. **Deploy scripts** — `01` à `05` dans l'ordre, target Devnet d'abord
7. **Backend API** — Express + auth ed25519 + NFA gate + chat router
8. **README.md** — Documentation ERC-578 adaptée Solana

---

## Pièges Solana à éviter (notes pour Claude Code)

**Rent :** Chaque PDA init coûte du rent (lamports pour maintenir le compte). Calculer l'espace avec `8 + borsh_size` et ajouter une marge. Utiliser `Rent::get()?.minimum_balance(space)`.

**Taille des Vec :** Solana impose une taille fixe à l'init. Définir des constantes max et allouer l'espace au moment du `init`. Si un Vec peut grandir, utiliser `realloc` (Anchor 0.30 supporte `#[account(realloc = ..., realloc::payer = ..., realloc::zero = false)]`).

**Ownership Metaplex Core :** Utiliser `mpl_core::fetch_asset` via CPI pour lire l'owner actuel, pas stocker l'owner dans AgentState (il peut changer via transfer NFT sans passer par notre program).

**ed25519 signature verification :** Utiliser `solana_program::ed25519_program` + `sysvar::instructions` pour vérifier les signatures du backend dans `execute_action`. Ne pas le faire en pur Rust dans le program (trop de compute units).

**PDAs avec index u64 :** Convertir en little-endian bytes pour les seeds : `index.to_le_bytes()`.

**Compte size pour String :** `4 + max_len` bytes (le u32 length prefix de Borsh).

**getProgramAccounts filters :** Pour paginer les AgentEntry, utiliser des filtres `memcmp` sur le champ `agent_type` offset par le discriminator (8 bytes) + offset du champ dans la struct.
