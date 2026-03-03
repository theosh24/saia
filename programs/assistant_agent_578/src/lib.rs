use anchor_lang::prelude::*;

pub mod state;
pub mod errors;

use state::*;
use errors::AssistantError;

declare_id!("4nLSom9qXEFtippj3cCzXZmV3kWB1Sh3kLuaTPzNKB4B");

#[program]
pub mod assistant_agent_578 {
    use super::*;

    pub fn initialize_store(ctx: Context<InitializeStore>) -> Result<()> {
        let store = &mut ctx.accounts.session_store;
        store.mint = ctx.accounts.mint.key();
        store.owner = ctx.accounts.owner.key();
        store.session_count = 0;
        store.bump = ctx.bumps.session_store;
        Ok(())
    }

    pub fn execute_agent_action(
        ctx: Context<LogSession>,
        action_data: Vec<u8>,
    ) -> Result<()> {
        // Decode action_data: session_hash(32) + summary_hash(32) = 64 bytes
        require!(action_data.len() == 64, AssistantError::InvalidData);

        // Verify caller is NFT owner by reading Metaplex Core asset
        let asset_data = ctx.accounts.asset.try_borrow_data()?;
        require!(asset_data.len() >= 33, AssistantError::InvalidAsset);
        let owner_bytes = &asset_data[1..33];
        let asset_owner = Pubkey::try_from(owner_bytes)
            .map_err(|_| AssistantError::InvalidAsset)?;
        require!(
            asset_owner == ctx.accounts.caller.key(),
            AssistantError::NotOwner
        );

        let mut session_hash = [0u8; 32];
        session_hash.copy_from_slice(&action_data[0..32]);
        let mut summary_hash = [0u8; 32];
        summary_hash.copy_from_slice(&action_data[32..64]);

        let clock = Clock::get()?;

        let session_entry = &mut ctx.accounts.session_entry;
        session_entry.mint = ctx.accounts.mint.key();
        session_entry.session_hash = session_hash;
        session_entry.summary_hash = summary_hash;
        session_entry.timestamp = clock.unix_timestamp;
        session_entry.bump = ctx.bumps.session_entry;

        let store = &mut ctx.accounts.session_store;
        store.session_count = store
            .session_count
            .checked_add(1)
            .ok_or(AssistantError::Overflow)?;

        Ok(())
    }
}

// ── Accounts ───────────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct InitializeStore<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    /// CHECK: the NFA mint pubkey
    pub mint: AccountInfo<'info>,

    /// CHECK: Metaplex Core asset — owner verified from on-chain data
    pub asset: AccountInfo<'info>,

    #[account(
        init,
        payer = owner,
        space = SessionStore::SPACE,
        seeds = [b"session_store", mint.key().as_ref()],
        bump,
    )]
    pub session_store: Account<'info, SessionStore>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(action_data: Vec<u8>)]
pub struct LogSession<'info> {
    #[account(mut)]
    pub caller: Signer<'info>,

    /// CHECK: the NFA mint pubkey
    pub mint: AccountInfo<'info>,

    /// CHECK: Metaplex Core asset — owner verified in handler
    pub asset: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [b"session_store", mint.key().as_ref()],
        bump = session_store.bump,
    )]
    pub session_store: Account<'info, SessionStore>,

    #[account(
        init,
        payer = caller,
        space = SessionEntry::SPACE,
        seeds = [
            b"session",
            mint.key().as_ref(),
            session_store.session_count.to_le_bytes().as_ref(),
        ],
        bump,
    )]
    pub session_entry: Account<'info, SessionEntry>,

    pub system_program: Program<'info, System>,
}
