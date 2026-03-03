import { PublicKey } from "@solana/web3.js";

// Program IDs — update these after `anchor keys sync`
export const SPL578_PROGRAM_ID = new PublicKey(
  "4xctWwmCg1JakNF1asQi8zpz3tB8DM3c58SMVPfByjW1"
);

export const ORACLE_PROGRAM_ID = new PublicKey(
  "52o4JJkQnK4JAdQW2cFSM8PJJr23GXLgZiC76pPPS231"
);

export const TRADING_PROGRAM_ID = new PublicKey(
  "B5erFWbiHfswsDSFq5bxxjPAjMTQcgcFSXXvAPsXa9Bm"
);

export const ASSISTANT_PROGRAM_ID = new PublicKey(
  "4nLSom9qXEFtippj3cCzXZmV3kWB1Sh3kLuaTPzNKB4B"
);

export const MPL_CORE_PROGRAM_ID = new PublicKey(
  "CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d"
);

// Seed prefixes
export const SEED_REGISTRY = "registry";
export const SEED_AGENT_STATE = "agent_state";
export const SEED_EVOLUTION = "evolution";
export const SEED_AGENT_ENTRY = "agent_entry";
export const SEED_ORACLE_DATA = "oracle_data";
export const SEED_PRICE = "price";
export const SEED_TRADE_JOURNAL = "trade_journal";
export const SEED_TRADE = "trade";
export const SEED_SESSION_STORE = "session_store";
export const SEED_SESSION = "session";
