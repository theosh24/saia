use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke;
use anchor_lang::solana_program::instruction::AccountMeta;
use crate::state::AgentState;
use crate::errors::SPL578Error;
use crate::events::ActionExecuted;
use crate::cpi_helpers::build_execute_action_cpi;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct ExecuteActionArgs {
    pub action_data: Vec<u8>,
}

#[derive(Accounts)]
pub struct ExecuteAction<'info> {
    pub caller: Signer<'info>,

    /// CHECK: Metaplex Core asset
    pub asset: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [b"agent_state", agent_state.mint.as_ref()],
        bump = agent_state.bump,
        constraint = agent_state.mint == asset.key() @ SPL578Error::InvalidAsset,
    )]
    pub agent_state: Account<'info, AgentState>,

    /// CHECK: The logic program to CPI into — validated against agent_state.logic_program
    pub logic_program: AccountInfo<'info>,
}

pub fn handler<'info>(
    ctx: Context<'_, '_, 'info, 'info, ExecuteAction<'info>>,
    args: ExecuteActionArgs,
) -> Result<()> {
    let agent_state = &ctx.accounts.agent_state;

    // Verify logic program is set and matches
    let expected_logic = agent_state
        .logic_program
        .ok_or(SPL578Error::NoLogicProgram)?;
    require!(
        ctx.accounts.logic_program.key() == expected_logic,
        SPL578Error::Unauthorized
    );
    require!(!agent_state.retired, SPL578Error::AgentRetired);

    // Build CPI accounts: agent_state, caller, asset, + remaining_accounts
    let mut cpi_accounts = vec![
        AccountMeta::new(ctx.accounts.agent_state.key(), false),
        AccountMeta::new_readonly(ctx.accounts.caller.key(), true),
        AccountMeta::new_readonly(ctx.accounts.asset.key(), false),
    ];
    for acc in ctx.remaining_accounts {
        if acc.is_writable {
            cpi_accounts.push(AccountMeta::new(*acc.key, acc.is_signer));
        } else {
            cpi_accounts.push(AccountMeta::new_readonly(*acc.key, acc.is_signer));
        }
    }

    let ix = build_execute_action_cpi(
        &expected_logic,
        cpi_accounts,
        args.action_data.clone(),
    );

    // Collect all account infos for invoke
    let mut account_infos = vec![
        ctx.accounts.agent_state.to_account_info(),
        ctx.accounts.caller.to_account_info(),
        ctx.accounts.asset.to_account_info(),
    ];
    for acc in ctx.remaining_accounts {
        account_infos.push(acc.clone());
    }
    account_infos.push(ctx.accounts.logic_program.to_account_info());

    invoke(&ix, &account_infos)?;

    // Compute action data hash for event
    let data_hash = anchor_lang::solana_program::hash::hash(&args.action_data);
    emit!(ActionExecuted {
        mint: agent_state.mint,
        caller: ctx.accounts.caller.key(),
        data_hash: data_hash.to_bytes(),
    });

    Ok(())
}
