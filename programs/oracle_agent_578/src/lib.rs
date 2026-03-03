use anchor_lang::prelude::*;
use anchor_lang::solana_program::sysvar::instructions as sysvar_instructions;

pub mod state;
pub mod errors;

use state::*;
use errors::OracleError;

declare_id!("52o4JJkQnK4JAdQW2cFSM8PJJr23GXLgZiC76pPPS231");

#[program]
pub mod oracle_agent_578 {
    use super::*;

    pub fn initialize_oracle(
        ctx: Context<InitializeOracle>,
        authorized_signer: Pubkey,
    ) -> Result<()> {
        let oracle = &mut ctx.accounts.oracle_data;
        oracle.mint = ctx.accounts.mint.key();
        oracle.authorized_signer = authorized_signer;
        oracle.price_count = 0;
        oracle.bump = ctx.bumps.oracle_data;
        Ok(())
    }

    pub fn execute_agent_action(
        ctx: Context<AttestPrice>,
        action_data: Vec<u8>,
    ) -> Result<()> {
        // Decode action_data: token(32) + price_usd_cents(8) + timestamp(8) + signature(64) = 112 bytes
        require!(action_data.len() == 112, OracleError::InvalidEd25519Data);

        let token = Pubkey::try_from(&action_data[0..32])
            .map_err(|_| OracleError::InvalidEd25519Data)?;
        let price_usd_cents = u64::from_le_bytes(
            action_data[32..40].try_into().unwrap()
        );
        let timestamp = i64::from_le_bytes(
            action_data[40..48].try_into().unwrap()
        );
        let mut signature = [0u8; 64];
        signature.copy_from_slice(&action_data[48..112]);

        // Verify ed25519 signature via instruction sysvar introspection
        // The ed25519 verify instruction must be placed BEFORE this instruction in the transaction
        let ix_sysvar = &ctx.accounts.instruction_sysvar;
        let current_ix_index = sysvar_instructions::load_current_index_checked(ix_sysvar)?;
        require!(current_ix_index > 0, OracleError::Ed25519InstructionMissing);

        let ed25519_ix = sysvar_instructions::load_instruction_at_checked(
            (current_ix_index - 1) as usize,
            ix_sysvar,
        )?;

        // Verify it's an ed25519 program instruction
        require!(
            ed25519_ix.program_id == solana_program::ed25519_program::id(),
            OracleError::Ed25519InstructionMissing
        );

        // Verify the ed25519 instruction data contains our signer's public key
        // Ed25519 instruction format: num_signatures(1) + padding(1) + [sig_offset(2) + sig_ix(2) + pubkey_offset(2) + pubkey_ix(2) + msg_offset(2) + msg_size(2) + msg_ix(2)]
        // Then the actual data: signature(64) + pubkey(32) + message(N)
        require!(ed25519_ix.data.len() >= 16 + 64 + 32, OracleError::InvalidEd25519Data);

        let oracle = &ctx.accounts.oracle_data;

        // The pubkey in the ed25519 instruction should match the authorized signer
        // Standard layout: after 16 byte header, signature(64), then pubkey(32)
        let pubkey_in_ix = &ed25519_ix.data[16 + 64..16 + 64 + 32];
        let authorized_bytes = oracle.authorized_signer.to_bytes();
        require!(
            pubkey_in_ix == authorized_bytes.as_ref(),
            OracleError::UnauthorizedSigner
        );

        // Update or create price entry
        let price_entry = &mut ctx.accounts.price_entry;
        price_entry.mint = oracle.mint;
        price_entry.token = token;
        price_entry.price_usd_cents = price_usd_cents;
        price_entry.timestamp = timestamp;
        price_entry.signature = signature;
        price_entry.bump = ctx.bumps.price_entry;

        // Increment price count
        let oracle = &mut ctx.accounts.oracle_data;
        oracle.price_count = oracle.price_count.checked_add(1).ok_or(OracleError::Overflow)?;

        Ok(())
    }
}

// ── Accounts ───────────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct InitializeOracle<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: the NFA mint pubkey
    pub mint: AccountInfo<'info>,

    #[account(
        init,
        payer = payer,
        space = OracleData::SPACE,
        seeds = [b"oracle_data", mint.key().as_ref()],
        bump,
    )]
    pub oracle_data: Account<'info, OracleData>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(action_data: Vec<u8>)]
pub struct AttestPrice<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: the NFA mint pubkey
    pub mint: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [b"oracle_data", mint.key().as_ref()],
        bump = oracle_data.bump,
    )]
    pub oracle_data: Account<'info, OracleData>,

    /// The token pubkey is extracted from action_data at runtime,
    /// but we need a deterministic seed. We use the token pubkey from remaining_accounts[0].
    /// CHECK: token account for PDA derivation
    pub token_key: AccountInfo<'info>,

    #[account(
        init_if_needed,
        payer = payer,
        space = PriceEntry::SPACE,
        seeds = [b"price", mint.key().as_ref(), token_key.key().as_ref()],
        bump,
    )]
    pub price_entry: Account<'info, PriceEntry>,

    /// CHECK: Instructions sysvar for ed25519 verification
    #[account(address = sysvar_instructions::ID)]
    pub instruction_sysvar: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}
