use anchor_lang::prelude::*;

#[error_code]
pub enum TradingError {
    #[msg("Invalid ed25519 signature")]
    InvalidSignature,
    #[msg("Unauthorized signer")]
    UnauthorizedSigner,
    #[msg("Ed25519 instruction not found")]
    Ed25519InstructionMissing,
    #[msg("Invalid instruction data")]
    InvalidData,
    #[msg("Trade already executed")]
    AlreadyExecuted,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Not the journal owner")]
    NotOwner,
}
