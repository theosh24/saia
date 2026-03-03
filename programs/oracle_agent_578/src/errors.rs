use anchor_lang::prelude::*;

#[error_code]
pub enum OracleError {
    #[msg("Invalid ed25519 signature")]
    InvalidSignature,
    #[msg("Unauthorized signer")]
    UnauthorizedSigner,
    #[msg("Ed25519 instruction not found")]
    Ed25519InstructionMissing,
    #[msg("Invalid ed25519 instruction data")]
    InvalidEd25519Data,
    #[msg("Arithmetic overflow")]
    Overflow,
}
