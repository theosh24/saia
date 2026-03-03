import { PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";

export enum AgentType {
  Assistant = 0,
  Oracle = 1,
  Trader = 2,
  Moderator = 3,
  Custom = 4,
}

export interface AgentState {
  mint: PublicKey;
  creator: PublicKey;
  agentType: AgentType;
  name: string;
  description: string;
  backendUri: string;
  logicProgram: PublicKey | null;
  stateHash: number[];
  evolutionCount: anchor.BN;
  createdAt: anchor.BN;
  lastEvolvedAt: anchor.BN;
  retired: boolean;
  jurisdiction: string;
  kycLevel: number;
  tags: string[];
  bump: number;
}

export interface EvolutionLog {
  mint: PublicKey;
  index: anchor.BN;
  previousHash: number[];
  newHash: number[];
  timestamp: anchor.BN;
  bump: number;
}

export interface AgentRegistry {
  authority: PublicKey;
  totalAgents: anchor.BN;
  mintFeeLamports: anchor.BN;
  treasury: PublicKey;
  bump: number;
}

export interface AgentEntry {
  tokenId: anchor.BN;
  mint: PublicKey;
  agentState: PublicKey;
  creator: PublicKey;
  agentType: AgentType;
  name: string;
  backendUri: string;
  verified: boolean;
  registeredAt: anchor.BN;
  bump: number;
}

export interface LaunchAgentArgs {
  name: string;
  agentType: Record<string, Record<string, never>>;
  description: string;
  backendUri: string;
  logicProgram: PublicKey | null;
  jurisdiction: string;
  kycLevel: number;
  tags: string[];
  uri: string;
}
