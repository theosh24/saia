use anchor_lang::prelude::*;
use crate::state::AgentState;
use crate::errors::SPL578Error;
use crate::events::AgentRetired;

#[derive(Accounts)]
pub struct RetireAgent<'info> {
    pub owner: Signer<'info>,

    /// CHECK: Metaplex Core asset — owner verified from on-chain data
    pub asset: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [b"agent_state", agent_state.mint.as_ref()],
        bump = agent_state.bump,
        constraint = agent_state.mint == asset.key() @ SPL578Error::InvalidAsset,
    )]
    pub agent_state: Account<'info, AgentState>,
}

pub fn handler(ctx: Context<RetireAgent>) -> Result<()> {
    // Verify NFT ownership
    let asset_data = ctx.accounts.asset.try_borrow_data()?;
    require!(asset_data.len() >= 33, SPL578Error::InvalidAsset);
    let owner_bytes = &asset_data[1..33];
    let asset_owner = Pubkey::try_from(owner_bytes).map_err(|_| SPL578Error::InvalidAsset)?;
    require!(asset_owner == ctx.accounts.owner.key(), SPL578Error::NotOwner);

    let agent_state = &mut ctx.accounts.agent_state;
    require!(!agent_state.retired, SPL578Error::AgentRetired);

    agent_state.retired = true;

    let clock = Clock::get()?;
    emit!(AgentRetired {
        mint: agent_state.mint,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
