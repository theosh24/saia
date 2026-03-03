use anchor_lang::prelude::*;

#[error_code]
pub enum SPL578Error {
    #[msg("Not the NFT owner")]
    NotOwner,
    #[msg("Agent is retired")]
    AgentRetired,
    #[msg("No logic program set")]
    NoLogicProgram,
    #[msg("Invalid proof")]
    InvalidProof,
    #[msg("String too long")]
    StringTooLong,
    #[msg("Too many tags")]
    TooManyTags,
    #[msg("Insufficient fee")]
    InsufficientFee,
    #[msg("URI must be HTTPS or empty")]
    InvalidURI,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Agent already verified")]
    AlreadyVerified,
    #[msg("Invalid asset")]
    InvalidAsset,
    #[msg("Arithmetic overflow")]
    Overflow,
}
