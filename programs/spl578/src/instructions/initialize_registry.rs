use anchor_lang::prelude::*;
use crate::state::AgentRegistry;

#[derive(Accounts)]
pub struct InitializeRegistry<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = AgentRegistry::SPACE,
        seeds = [b"registry"],
        bump,
    )]
    pub registry: Account<'info, AgentRegistry>,

    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitializeRegistryArgs {
    pub mint_fee_lamports: u64,
    pub treasury: Pubkey,
}

pub fn handler(ctx: Context<InitializeRegistry>, args: InitializeRegistryArgs) -> Result<()> {
    let registry = &mut ctx.accounts.registry;
    registry.authority = ctx.accounts.authority.key();
    registry.total_agents = 0;
    registry.mint_fee_lamports = args.mint_fee_lamports;
    registry.treasury = args.treasury;
    registry.bump = ctx.bumps.registry;
    Ok(())
}
