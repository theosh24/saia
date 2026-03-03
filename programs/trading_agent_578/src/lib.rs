use anchor_lang::prelude::*;
use anchor_lang::solana_program::sysvar::instructions as sysvar_instructions;

pub mod state;
pub mod errors;

use state::*;
use errors::TradingError;

declare_id!("B5erFWbiHfswsDSFq5bxxjPAjMTQcgcFSXXvAPsXa9Bm");

#[program]
pub mod trading_agent_578 {
    use super::*;

    pub fn initialize_journal(
        ctx: Context<InitializeJournal>,
        backend_signer: Pubkey,
    ) -> Result<()> {
        let journal = &mut ctx.accounts.trade_journal;
        journal.mint = ctx.accounts.mint.key();
        journal.backend_signer = backend_signer;
        journal.trade_count = 0;
        journal.bump = ctx.bumps.trade_journal;
        Ok(())
    }

    pub fn execute_agent_action(
        ctx: Context<RecordTrade>,
        action_data: Vec<u8>,
    ) -> Result<()> {
        // Decode action_data: trade_id(32) + token_in(32) + token_out(32) + amount_in(8) + expected_out(8) + timestamp(8) + signature(64) = 184 bytes
        require!(action_data.len() == 184, TradingError::InvalidData);

        let mut trade_id = [0u8; 32];
        trade_id.copy_from_slice(&action_data[0..32]);
        let token_in = Pubkey::try_from(&action_data[32..64])
            .map_err(|_| TradingError::InvalidData)?;
        let token_out = Pubkey::try_from(&action_data[64..96])
            .map_err(|_| TradingError::InvalidData)?;
        let amount_in = u64::from_le_bytes(action_data[96..104].try_into().unwrap());
        let expected_out = u64::from_le_bytes(action_data[104..112].try_into().unwrap());
        let timestamp = i64::from_le_bytes(action_data[112..120].try_into().unwrap());
        let mut signature = [0u8; 64];
        signature.copy_from_slice(&action_data[120..184]);

        // Verify ed25519 signature via instruction sysvar introspection
        let ix_sysvar = &ctx.accounts.instruction_sysvar;
        let current_ix_index = sysvar_instructions::load_current_index_checked(ix_sysvar)?;
        require!(current_ix_index > 0, TradingError::Ed25519InstructionMissing);

        let ed25519_ix = sysvar_instructions::load_instruction_at_checked(
            (current_ix_index - 1) as usize,
            ix_sysvar,
        )?;

        require!(
            ed25519_ix.program_id == solana_program::ed25519_program::id(),
            TradingError::Ed25519InstructionMissing
        );

        // Verify the pubkey matches backend_signer
        require!(ed25519_ix.data.len() >= 16 + 64 + 32, TradingError::InvalidData);
        let pubkey_in_ix = &ed25519_ix.data[16 + 64..16 + 64 + 32];
        let journal = &ctx.accounts.trade_journal;
        let signer_bytes = journal.backend_signer.to_bytes();
        require!(
            pubkey_in_ix == signer_bytes.as_ref(),
            TradingError::UnauthorizedSigner
        );

        // Create trade entry
        let trade_entry = &mut ctx.accounts.trade_entry;
        trade_entry.trade_id = trade_id;
        trade_entry.mint = journal.mint;
        trade_entry.token_in = token_in;
        trade_entry.token_out = token_out;
        trade_entry.amount_in = amount_in;
        trade_entry.expected_out = expected_out;
        trade_entry.timestamp = timestamp;
        trade_entry.executed = false;
        trade_entry.signature = signature;
        trade_entry.bump = ctx.bumps.trade_entry;

        // Increment trade count
        let journal = &mut ctx.accounts.trade_journal;
        journal.trade_count = journal
            .trade_count
            .checked_add(1)
            .ok_or(TradingError::Overflow)?;

        Ok(())
    }

    pub fn mark_executed(ctx: Context<MarkExecuted>) -> Result<()> {
        let trade_entry = &mut ctx.accounts.trade_entry;
        require!(!trade_entry.executed, TradingError::AlreadyExecuted);
        trade_entry.executed = true;
        Ok(())
    }
}

// ── Accounts ───────────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct InitializeJournal<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: the NFA mint pubkey
    pub mint: AccountInfo<'info>,

    #[account(
        init,
        payer = payer,
        space = TradeJournal::SPACE,
        seeds = [b"trade_journal", mint.key().as_ref()],
        bump,
    )]
    pub trade_journal: Account<'info, TradeJournal>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(action_data: Vec<u8>)]
pub struct RecordTrade<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: the NFA mint pubkey
    pub mint: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [b"trade_journal", mint.key().as_ref()],
        bump = trade_journal.bump,
    )]
    pub trade_journal: Account<'info, TradeJournal>,

    #[account(
        init,
        payer = payer,
        space = TradeEntry::SPACE,
        seeds = [
            b"trade",
            mint.key().as_ref(),
            trade_journal.trade_count.to_le_bytes().as_ref(),
        ],
        bump,
    )]
    pub trade_entry: Account<'info, TradeEntry>,

    /// CHECK: Instructions sysvar for ed25519 verification
    #[account(address = sysvar_instructions::ID)]
    pub instruction_sysvar: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MarkExecuted<'info> {
    pub owner: Signer<'info>,

    /// CHECK: the NFA mint
    pub mint: AccountInfo<'info>,

    #[account(
        seeds = [b"trade_journal", mint.key().as_ref()],
        bump = trade_journal.bump,
    )]
    pub trade_journal: Account<'info, TradeJournal>,

    #[account(mut)]
    pub trade_entry: Account<'info, TradeEntry>,
}
