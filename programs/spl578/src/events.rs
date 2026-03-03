use anchor_lang::prelude::*;

#[event]
pub struct AgentLaunched {
    pub mint: Pubkey,
    pub creator: Pubkey,
    pub agent_type: u8,
    pub name: String,
    pub timestamp: i64,
}

#[event]
pub struct AgentEvolved {
    pub mint: Pubkey,
    pub previous_hash: [u8; 32],
    pub new_hash: [u8; 32],
    pub count: u64,
}

#[event]
pub struct LogicUpgraded {
    pub mint: Pubkey,
    pub old_logic: Option<Pubkey>,
    pub new_logic: Option<Pubkey>,
}

#[event]
pub struct BackendURIUpdated {
    pub mint: Pubkey,
    pub uri: String,
}

#[event]
pub struct ActionExecuted {
    pub mint: Pubkey,
    pub caller: Pubkey,
    pub data_hash: [u8; 32],
}

#[event]
pub struct AgentRetired {
    pub mint: Pubkey,
    pub timestamp: i64,
}
