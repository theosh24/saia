use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::SPL578Error;

// ── VerifyAgent ────────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct VerifyAgent<'info> {
    pub authority: Signer<'info>,

    #[account(
        seeds = [b"registry"],
        bump = registry.bump,
        constraint = registry.authority == authority.key() @ SPL578Error::Unauthorized,
    )]
    pub registry: Account<'info, AgentRegistry>,

    #[account(mut)]
    pub agent_entry: Account<'info, AgentEntry>,
}

pub fn handler_verify_agent(ctx: Context<VerifyAgent>) -> Result<()> {
    let entry = &mut ctx.accounts.agent_entry;
    require!(!entry.verified, SPL578Error::AlreadyVerified);
    entry.verified = true;
    Ok(())
}

// ── UpdateRegistryConfig ───────────────────────────────────────────────────────

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct UpdateRegistryArgs {
    pub mint_fee_lamports: Option<u64>,
    pub treasury: Option<Pubkey>,
}

#[derive(Accounts)]
pub struct UpdateRegistryConfig<'info> {
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"registry"],
        bump = registry.bump,
        constraint = registry.authority == authority.key() @ SPL578Error::Unauthorized,
    )]
    pub registry: Account<'info, AgentRegistry>,
}

pub fn handler_update_registry(
    ctx: Context<UpdateRegistryConfig>,
    args: UpdateRegistryArgs,
) -> Result<()> {
    let registry = &mut ctx.accounts.registry;
    if let Some(fee) = args.mint_fee_lamports {
        registry.mint_fee_lamports = fee;
    }
    if let Some(treasury) = args.treasury {
        registry.treasury = treasury;
    }
    Ok(())
}
