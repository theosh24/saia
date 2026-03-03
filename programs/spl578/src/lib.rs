use anchor_lang::prelude::*;

pub mod state;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod cpi_helpers;

use instructions::*;

declare_id!("4xctWwmCg1JakNF1asQi8zpz3tB8DM3c58SMVPfByjW1");

#[program]
pub mod spl578 {
    use super::*;

    pub fn initialize_registry(
        ctx: Context<InitializeRegistry>,
        args: InitializeRegistryArgs,
    ) -> Result<()> {
        instructions::initialize_registry::handler(ctx, args)
    }

    pub fn launch_agent(ctx: Context<LaunchAgent>, args: LaunchAgentArgs) -> Result<()> {
        instructions::launch_agent::handler(ctx, args)
    }

    pub fn evolve(ctx: Context<Evolve>, args: EvolveArgs) -> Result<()> {
        instructions::evolve::handler(ctx, args)
    }

    pub fn execute_action<'info>(
        ctx: Context<'_, '_, 'info, 'info, ExecuteAction<'info>>,
        args: ExecuteActionArgs,
    ) -> Result<()> {
        instructions::execute_action::handler(ctx, args)
    }

    pub fn upgrade_logic(ctx: Context<UpgradeLogic>, args: UpgradeLogicArgs) -> Result<()> {
        instructions::upgrade_logic::handler(ctx, args)
    }

    pub fn set_backend_uri(ctx: Context<SetBackendURI>, args: SetBackendURIArgs) -> Result<()> {
        instructions::set_backend_uri::handler(ctx, args)
    }

    pub fn retire_agent(ctx: Context<RetireAgent>) -> Result<()> {
        instructions::retire_agent::handler(ctx)
    }

    pub fn verify_agent(ctx: Context<VerifyAgent>) -> Result<()> {
        instructions::admin::handler_verify_agent(ctx)
    }

    pub fn update_registry_config(
        ctx: Context<UpdateRegistryConfig>,
        args: UpdateRegistryArgs,
    ) -> Result<()> {
        instructions::admin::handler_update_registry(ctx, args)
    }
}
