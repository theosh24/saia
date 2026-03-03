use anchor_lang::prelude::*;
use crate::state::AgentState;
use crate::errors::SPL578Error;
use crate::events::LogicUpgraded;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct UpgradeLogicArgs {
    pub new_logic_program: Option<Pubkey>,
}

#[derive(Accounts)]
pub struct UpgradeLogic<'info> {
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

pub fn handler(ctx: Context<UpgradeLogic>, args: UpgradeLogicArgs) -> Result<()> {
    // Verify NFT ownership
    let asset_data = ctx.accounts.asset.try_borrow_data()?;
    require!(asset_data.len() >= 33, SPL578Error::InvalidAsset);
    let owner_bytes = &asset_data[1..33];
    let asset_owner = Pubkey::try_from(owner_bytes).map_err(|_| SPL578Error::InvalidAsset)?;
    require!(asset_owner == ctx.accounts.owner.key(), SPL578Error::NotOwner);

    let agent_state = &mut ctx.accounts.agent_state;
    require!(!agent_state.retired, SPL578Error::AgentRetired);

    let old_logic = agent_state.logic_program;
    agent_state.logic_program = args.new_logic_program;

    emit!(LogicUpgraded {
        mint: agent_state.mint,
        old_logic,
        new_logic: args.new_logic_program,
    });

    Ok(())
}
