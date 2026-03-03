use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::SPL578Error;
use crate::events::AgentEvolved;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct EvolveArgs {
    pub new_state_hash: [u8; 32],
    pub proof: Vec<u8>,
}

#[derive(Accounts)]
#[instruction(args: EvolveArgs)]
pub struct Evolve<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    /// CHECK: Metaplex Core asset — we deserialize manually to check owner
    pub asset: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [b"agent_state", agent_state.mint.as_ref()],
        bump = agent_state.bump,
        constraint = agent_state.mint == asset.key() @ SPL578Error::InvalidAsset,
    )]
    pub agent_state: Account<'info, AgentState>,

    #[account(
        init,
        payer = owner,
        space = EvolutionLog::SPACE,
        seeds = [
            b"evolution",
            agent_state.mint.as_ref(),
            agent_state.evolution_count.to_le_bytes().as_ref(),
        ],
        bump,
    )]
    pub evolution_log: Account<'info, EvolutionLog>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Evolve>, args: EvolveArgs) -> Result<()> {
    // Verify NFT ownership by reading the Metaplex Core asset account
    // The owner field in a Metaplex Core BaseAssetV1 is at offset 33 (1 key + 0 discriminator variant)
    // Layout: Key(1) + UpdateAuthority(33) + Owner(32) + ...
    // Actually, mpl_core::accounts::BaseAssetV1 uses:
    //   key: Key (1 byte)
    //   owner: Pubkey (32 bytes) — at offset 1
    let asset_data = ctx.accounts.asset.try_borrow_data()?;
    require!(asset_data.len() >= 33, SPL578Error::InvalidAsset);
    // Metaplex Core BaseAssetV1 layout: key(1) + owner(32)
    let owner_bytes = &asset_data[1..33];
    let asset_owner = Pubkey::try_from(owner_bytes).map_err(|_| SPL578Error::InvalidAsset)?;
    require!(asset_owner == ctx.accounts.owner.key(), SPL578Error::NotOwner);

    let agent_state = &mut ctx.accounts.agent_state;
    require!(!agent_state.retired, SPL578Error::AgentRetired);

    let clock = Clock::get()?;
    let previous_hash = agent_state.state_hash;

    // Init EvolutionLog
    let evolution_log = &mut ctx.accounts.evolution_log;
    evolution_log.mint = agent_state.mint;
    evolution_log.index = agent_state.evolution_count;
    evolution_log.previous_hash = previous_hash;
    evolution_log.new_hash = args.new_state_hash;
    evolution_log.timestamp = clock.unix_timestamp;
    evolution_log.bump = ctx.bumps.evolution_log;

    // Update AgentState
    agent_state.state_hash = args.new_state_hash;
    agent_state.evolution_count = agent_state
        .evolution_count
        .checked_add(1)
        .ok_or(SPL578Error::Overflow)?;
    agent_state.last_evolved_at = clock.unix_timestamp;

    emit!(AgentEvolved {
        mint: agent_state.mint,
        previous_hash,
        new_hash: args.new_state_hash,
        count: agent_state.evolution_count,
    });

    Ok(())
}
