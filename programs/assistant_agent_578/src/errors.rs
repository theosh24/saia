use anchor_lang::prelude::*;

#[error_code]
pub enum AssistantError {
    #[msg("Not the NFT owner")]
    NotOwner,
    #[msg("Invalid action data")]
    InvalidData,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Invalid asset")]
    InvalidAsset,
}
