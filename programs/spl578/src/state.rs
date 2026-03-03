use anchor_lang::prelude::*;

// ── Constants ──────────────────────────────────────────────────────────────────
pub const MAX_NAME_LEN: usize = 64;
pub const MAX_DESC_LEN: usize = 256;
pub const MAX_URI_LEN: usize = 256;
pub const MAX_JURISDICTION_LEN: usize = 16;
pub const MAX_TAGS: usize = 8;
pub const MAX_TAG_LEN: usize = 32;

// ── AgentType ──────────────────────────────────────────────────────────────────
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum AgentType {
    Assistant,
    Oracle,
    Trader,
    Moderator,
    Custom,
}

// ── AgentState PDA ─────────────────────────────────────────────────────────────
// Seeds: ["agent_state", mint.key()]
#[account]
pub struct AgentState {
    pub mint: Pubkey,                  // 32
    pub creator: Pubkey,               // 32
    pub agent_type: AgentType,         // 1
    pub name: String,                  // 4 + MAX_NAME_LEN
    pub description: String,           // 4 + MAX_DESC_LEN
    pub backend_uri: String,           // 4 + MAX_URI_LEN
    pub logic_program: Option<Pubkey>, // 1 + 32
    pub state_hash: [u8; 32],         // 32
    pub evolution_count: u64,          // 8
    pub created_at: i64,               // 8
    pub last_evolved_at: i64,          // 8
    pub retired: bool,                 // 1
    pub jurisdiction: String,          // 4 + MAX_JURISDICTION_LEN
    pub kyc_level: u8,                 // 1
    pub tags: Vec<String>,            // 4 + MAX_TAGS * (4 + MAX_TAG_LEN)
    pub bump: u8,                      // 1
}

impl AgentState {
    // 8 (discriminator) + fields
    pub const SPACE: usize = 8
        + 32                                          // mint
        + 32                                          // creator
        + 1                                           // agent_type
        + (4 + MAX_NAME_LEN)                          // name
        + (4 + MAX_DESC_LEN)                          // description
        + (4 + MAX_URI_LEN)                           // backend_uri
        + (1 + 32)                                    // logic_program
        + 32                                          // state_hash
        + 8                                           // evolution_count
        + 8                                           // created_at
        + 8                                           // last_evolved_at
        + 1                                           // retired
        + (4 + MAX_JURISDICTION_LEN)                  // jurisdiction
        + 1                                           // kyc_level
        + (4 + MAX_TAGS * (4 + MAX_TAG_LEN))          // tags
        + 1;                                          // bump
}

// ── EvolutionLog PDA ───────────────────────────────────────────────────────────
// Seeds: ["evolution", mint.key(), index.to_le_bytes()]
#[account]
pub struct EvolutionLog {
    pub mint: Pubkey,             // 32
    pub index: u64,               // 8
    pub previous_hash: [u8; 32],  // 32
    pub new_hash: [u8; 32],       // 32
    pub timestamp: i64,           // 8
    pub bump: u8,                 // 1
}

impl EvolutionLog {
    pub const SPACE: usize = 8 + 32 + 8 + 32 + 32 + 8 + 1; // 121
}

// ── AgentRegistry PDA (singleton) ──────────────────────────────────────────────
// Seeds: ["registry"]
#[account]
pub struct AgentRegistry {
    pub authority: Pubkey,          // 32
    pub total_agents: u64,          // 8
    pub mint_fee_lamports: u64,     // 8
    pub treasury: Pubkey,           // 32
    pub bump: u8,                   // 1
}

impl AgentRegistry {
    pub const SPACE: usize = 8 + 32 + 8 + 8 + 32 + 1; // 89
}

// ── AgentEntry PDA ─────────────────────────────────────────────────────────────
// Seeds: ["agent_entry", registry.key(), index.to_le_bytes()]
#[account]
pub struct AgentEntry {
    pub token_id: u64,           // 8
    pub mint: Pubkey,            // 32
    pub agent_state: Pubkey,     // 32
    pub creator: Pubkey,         // 32
    pub agent_type: AgentType,   // 1
    pub name: String,            // 4 + MAX_NAME_LEN
    pub backend_uri: String,     // 4 + MAX_URI_LEN
    pub verified: bool,          // 1
    pub registered_at: i64,      // 8
    pub bump: u8,                // 1
}

impl AgentEntry {
    pub const SPACE: usize = 8
        + 8                           // token_id
        + 32                          // mint
        + 32                          // agent_state
        + 32                          // creator
        + 1                           // agent_type
        + (4 + MAX_NAME_LEN)          // name
        + (4 + MAX_URI_LEN)           // backend_uri
        + 1                           // verified
        + 8                           // registered_at
        + 1;                          // bump
}
