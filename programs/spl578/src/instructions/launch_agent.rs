use anchor_lang::prelude::*;
use anchor_lang::system_program;
use mpl_core::instructions::CreateV2CpiBuilder;
use crate::state::*;
use crate::errors::SPL578Error;
use crate::events::AgentLaunched;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct LaunchAgentArgs {
    pub name: String,
    pub agent_type: AgentType,
    pub description: String,
    pub backend_uri: String,
    pub logic_program: Option<Pubkey>,
    pub jurisdiction: String,
    pub kyc_level: u8,
    pub tags: Vec<String>,
    pub uri: String, // Metaplex Core metadata URI
}

#[derive(Accounts)]
#[instruction(args: LaunchAgentArgs)]
pub struct LaunchAgent<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// The new NFT asset keypair — must be a signer
    #[account(mut)]
    pub asset: Signer<'info>,

    #[account(
        mut,
        seeds = [b"registry"],
        bump = registry.bump,
    )]
    pub registry: Account<'info, AgentRegistry>,

    #[account(
        init,
        payer = payer,
        space = AgentState::SPACE,
        seeds = [b"agent_state", asset.key().as_ref()],
        bump,
    )]
    pub agent_state: Account<'info, AgentState>,

    #[account(
        init,
        payer = payer,
        space = AgentEntry::SPACE,
        seeds = [
            b"agent_entry",
            registry.key().as_ref(),
            registry.total_agents.to_le_bytes().as_ref(),
        ],
        bump,
    )]
    pub agent_entry: Account<'info, AgentEntry>,

    /// CHECK: treasury to receive mint fee, validated against registry
    #[account(
        mut,
        constraint = treasury.key() == registry.treasury @ SPL578Error::Unauthorized,
    )]
    pub treasury: AccountInfo<'info>,

    /// CHECK: Metaplex Core program
    #[account(address = mpl_core::ID)]
    pub mpl_core_program: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<LaunchAgent>, args: LaunchAgentArgs) -> Result<()> {
    // Validate string lengths
    require!(args.name.len() <= MAX_NAME_LEN, SPL578Error::StringTooLong);
    require!(args.description.len() <= MAX_DESC_LEN, SPL578Error::StringTooLong);
    require!(args.backend_uri.len() <= MAX_URI_LEN, SPL578Error::StringTooLong);
    require!(args.jurisdiction.len() <= MAX_JURISDICTION_LEN, SPL578Error::StringTooLong);
    require!(args.tags.len() <= MAX_TAGS, SPL578Error::TooManyTags);
    for tag in &args.tags {
        require!(tag.len() <= MAX_TAG_LEN, SPL578Error::StringTooLong);
    }

    // Validate backend_uri
    if !args.backend_uri.is_empty() {
        require!(args.backend_uri.starts_with("https://"), SPL578Error::InvalidURI);
    }

    // 1. Transfer mint fee to treasury
    let fee = ctx.accounts.registry.mint_fee_lamports;
    if fee > 0 {
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.payer.to_account_info(),
                    to: ctx.accounts.treasury.to_account_info(),
                },
            ),
            fee,
        )?;
    }

    // 2. CPI to Metaplex Core — create the NFT asset
    CreateV2CpiBuilder::new(&ctx.accounts.mpl_core_program)
        .asset(&ctx.accounts.asset)
        .payer(&ctx.accounts.payer)
        .system_program(&ctx.accounts.system_program)
        .name(args.name.clone())
        .uri(args.uri)
        .invoke()?;

    // 3. Init AgentState PDA
    let clock = Clock::get()?;
    let agent_state = &mut ctx.accounts.agent_state;
    agent_state.mint = ctx.accounts.asset.key();
    agent_state.creator = ctx.accounts.payer.key();
    agent_state.agent_type = args.agent_type;
    agent_state.name = args.name.clone();
    agent_state.description = args.description;
    agent_state.backend_uri = args.backend_uri;
    agent_state.logic_program = args.logic_program;
    agent_state.state_hash = [0u8; 32];
    agent_state.evolution_count = 0;
    agent_state.created_at = clock.unix_timestamp;
    agent_state.last_evolved_at = clock.unix_timestamp;
    agent_state.retired = false;
    agent_state.jurisdiction = args.jurisdiction;
    agent_state.kyc_level = args.kyc_level;
    agent_state.tags = args.tags;
    agent_state.bump = ctx.bumps.agent_state;

    // 4. Init AgentEntry PDA and increment total_agents
    let agent_state_key = agent_state.key();
    let backend_uri_copy = agent_state.backend_uri.clone();
    let registry = &mut ctx.accounts.registry;
    let agent_entry = &mut ctx.accounts.agent_entry;
    agent_entry.token_id = registry.total_agents;
    agent_entry.mint = ctx.accounts.asset.key();
    agent_entry.agent_state = agent_state_key;
    agent_entry.creator = ctx.accounts.payer.key();
    agent_entry.agent_type = args.agent_type;
    agent_entry.name = args.name.clone();
    agent_entry.backend_uri = backend_uri_copy;
    agent_entry.verified = false;
    agent_entry.registered_at = clock.unix_timestamp;
    agent_entry.bump = ctx.bumps.agent_entry;

    registry.total_agents = registry
        .total_agents
        .checked_add(1)
        .ok_or(SPL578Error::Overflow)?;

    // 5. Emit event
    emit!(AgentLaunched {
        mint: ctx.accounts.asset.key(),
        creator: ctx.accounts.payer.key(),
        agent_type: args.agent_type as u8,
        name: args.name,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
