use anchor_lang::prelude::*;

/// Per-agent session store metadata
/// Seeds: ["session_store", mint]
#[account]
pub struct SessionStore {
    pub mint: Pubkey,          // 32
    pub owner: Pubkey,         // 32 — NFT owner at init time (for convenience, re-checked at action time)
    pub session_count: u64,    // 8
    pub bump: u8,              // 1
}

impl SessionStore {
    pub const SPACE: usize = 8 + 32 + 32 + 8 + 1; // 81
}

/// Individual session entry PDA
/// Seeds: ["session", mint, session_count.to_le_bytes()]
#[account]
pub struct SessionEntry {
    pub mint: Pubkey,             // 32
    pub session_hash: [u8; 32],   // 32
    pub summary_hash: [u8; 32],   // 32
    pub timestamp: i64,           // 8
    pub bump: u8,                 // 1
}

impl SessionEntry {
    pub const SPACE: usize = 8 + 32 + 32 + 32 + 8 + 1; // 113
}
