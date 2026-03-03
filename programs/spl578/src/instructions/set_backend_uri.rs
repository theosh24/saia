use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::SPL578Error;
use crate::events::BackendURIUpdated;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct SetBackendURIArgs {
    pub uri: String,
}

#[derive(Accounts)]
pub struct SetBackendURI<'info> {
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

pub fn handler(ctx: Context<SetBackendURI>, args: SetBackendURIArgs) -> Result<()> {
    // Verify NFT ownership
    let asset_data = ctx.accounts.asset.try_borrow_data()?;
    require!(asset_data.len() >= 33, SPL578Error::InvalidAsset);
    let owner_bytes = &asset_data[1..33];
    let asset_owner = Pubkey::try_from(owner_bytes).map_err(|_| SPL578Error::InvalidAsset)?;
    require!(asset_owner == ctx.accounts.owner.key(), SPL578Error::NotOwner);

    // Validate URI
    require!(args.uri.len() <= MAX_URI_LEN, SPL578Error::StringTooLong);
    if !args.uri.is_empty() {
        require!(args.uri.starts_with("https://"), SPL578Error::InvalidURI);
    }

    let agent_state = &mut ctx.accounts.agent_state;
    require!(!agent_state.retired, SPL578Error::AgentRetired);

    agent_state.backend_uri = args.uri.clone();

    emit!(BackendURIUpdated {
        mint: agent_state.mint,
        uri: args.uri,
    });

    Ok(())
}
