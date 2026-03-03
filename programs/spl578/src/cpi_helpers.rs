use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::Instruction;
use anchor_lang::solana_program::hash::hash;

/// Anchor instruction discriminator for "execute_agent_action"
/// = sha256("global:execute_agent_action")[..8]
pub fn execute_agent_action_discriminator() -> [u8; 8] {
    let preimage = b"global:execute_agent_action";
    let full_hash = hash(preimage);
    let mut disc = [0u8; 8];
    disc.copy_from_slice(&full_hash.to_bytes()[..8]);
    disc
}

/// Build a CPI instruction to call `execute_agent_action` on a logic program.
pub fn build_execute_action_cpi(
    logic_program_id: &Pubkey,
    accounts: Vec<AccountMeta>,
    action_data: Vec<u8>,
) -> Instruction {
    let mut data = execute_agent_action_discriminator().to_vec();
    // Borsh-encode the Vec<u8> parameter: u32 length prefix + bytes
    let len = action_data.len() as u32;
    data.extend_from_slice(&len.to_le_bytes());
    data.extend_from_slice(&action_data);

    Instruction {
        program_id: *logic_program_id,
        accounts,
        data,
    }
}
