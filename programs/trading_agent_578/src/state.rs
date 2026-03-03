use anchor_lang::prelude::*;

/// Per-agent trade journal metadata
/// Seeds: ["trade_journal", mint]
#[account]
pub struct TradeJournal {
    pub mint: Pubkey,              // 32
    pub backend_signer: Pubkey,    // 32
    pub trade_count: u64,          // 8
    pub bump: u8,                  // 1
}

impl TradeJournal {
    pub const SPACE: usize = 8 + 32 + 32 + 8 + 1; // 81
}

/// Individual trade entry PDA
/// Seeds: ["trade", mint, trade_count.to_le_bytes()]
#[account]
pub struct TradeEntry {
    pub trade_id: [u8; 32],        // 32
    pub mint: Pubkey,              // 32
    pub token_in: Pubkey,          // 32
    pub token_out: Pubkey,         // 32
    pub amount_in: u64,            // 8
    pub expected_out: u64,         // 8
    pub timestamp: i64,            // 8
    pub executed: bool,            // 1
    pub signature: [u8; 64],       // 64
    pub bump: u8,                  // 1
}

impl TradeEntry {
    pub const SPACE: usize = 8 + 32 + 32 + 32 + 32 + 8 + 8 + 8 + 1 + 64 + 1; // 226
}
