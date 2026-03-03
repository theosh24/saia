use anchor_lang::prelude::*;

/// Per-agent oracle metadata
/// Seeds: ["oracle_data", mint]
#[account]
pub struct OracleData {
    pub mint: Pubkey,               // 32
    pub authorized_signer: Pubkey,  // 32 — backend ed25519 key that signs prices
    pub price_count: u64,           // 8
    pub bump: u8,                   // 1
}

impl OracleData {
    pub const SPACE: usize = 8 + 32 + 32 + 8 + 1; // 81
}

/// Individual price attestation PDA
/// Seeds: ["price", mint, token_pubkey]
#[account]
pub struct PriceEntry {
    pub mint: Pubkey,              // 32 — the NFA mint
    pub token: Pubkey,             // 32 — the token being priced
    pub price_usd_cents: u64,      // 8  — price * 100
    pub timestamp: i64,            // 8
    pub signature: [u8; 64],       // 64 — ed25519 sig from backend
    pub bump: u8,                  // 1
}

impl PriceEntry {
    pub const SPACE: usize = 8 + 32 + 32 + 8 + 8 + 64 + 1; // 153
}
