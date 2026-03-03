import * as anchor from "@coral-xyz/anchor";
import {
  Connection,
  PublicKey,
  Keypair,
  SystemProgram,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import {
  deriveRegistryPDA,
  deriveAgentStatePDA,
  deriveEvolutionLogPDA,
  deriveAgentEntryPDA,
} from "./pda";
import { MPL_CORE_PROGRAM_ID } from "./constants";
import type {
  AgentState,
  AgentEntry,
  EvolutionLog,
  AgentRegistry,
  LaunchAgentArgs,
} from "./types";

export * from "./types";
export * from "./pda";
export * from "./constants";
export * from "./utils";

export class SPL578Client {
  constructor(
    public readonly connection: Connection,
    public readonly program: anchor.Program,
    public readonly programId: PublicKey = program.programId
  ) {}

  // ── PDA derivation ──────────────────────────────────────────────────────

  deriveRegistryPDA(): [PublicKey, number] {
    return deriveRegistryPDA(this.programId);
  }

  deriveAgentStatePDA(mint: PublicKey): [PublicKey, number] {
    return deriveAgentStatePDA(mint, this.programId);
  }

  deriveEvolutionLogPDA(
    mint: PublicKey,
    index: number
  ): [PublicKey, number] {
    return deriveEvolutionLogPDA(mint, index, this.programId);
  }

  deriveAgentEntryPDA(
    registry: PublicKey,
    index: number
  ): [PublicKey, number] {
    return deriveAgentEntryPDA(registry, index, this.programId);
  }

  // ── Read methods ────────────────────────────────────────────────────────

  async getRegistry(): Promise<AgentRegistry> {
    const [registryPDA] = this.deriveRegistryPDA();
    return (await this.program.account.agentRegistry.fetch(
      registryPDA
    )) as unknown as AgentRegistry;
  }

  async getAgentState(mint: PublicKey): Promise<AgentState> {
    const [pda] = this.deriveAgentStatePDA(mint);
    return (await this.program.account.agentState.fetch(
      pda
    )) as unknown as AgentState;
  }

  async getAgentEntry(index: number): Promise<AgentEntry> {
    const [registryPDA] = this.deriveRegistryPDA();
    const [pda] = this.deriveAgentEntryPDA(registryPDA, index);
    return (await this.program.account.agentEntry.fetch(
      pda
    )) as unknown as AgentEntry;
  }

  async getEvolutionHistory(mint: PublicKey): Promise<EvolutionLog[]> {
    const agentState = await this.getAgentState(mint);
    const count = agentState.evolutionCount.toNumber();
    const logs: EvolutionLog[] = [];

    for (let i = 0; i < count; i++) {
      const [pda] = this.deriveEvolutionLogPDA(mint, i);
      const log = (await this.program.account.evolutionLog.fetch(
        pda
      )) as unknown as EvolutionLog;
      logs.push(log);
    }

    return logs;
  }

  async getAllAgents(
    offset: number = 0,
    limit: number = 20
  ): Promise<AgentEntry[]> {
    const registry = await this.getRegistry();
    const total = registry.totalAgents.toNumber();
    const end = Math.min(offset + limit, total);
    const entries: AgentEntry[] = [];
    const [registryPDA] = this.deriveRegistryPDA();

    for (let i = offset; i < end; i++) {
      const [pda] = this.deriveAgentEntryPDA(registryPDA, i);
      const entry = (await this.program.account.agentEntry.fetch(
        pda
      )) as unknown as AgentEntry;
      entries.push(entry);
    }

    return entries;
  }

  async isOwner(mint: PublicKey, wallet: PublicKey): Promise<boolean> {
    // Fetch the Metaplex Core asset and check the owner field
    const assetInfo = await this.connection.getAccountInfo(mint);
    if (!assetInfo || assetInfo.data.length < 33) return false;

    // Metaplex Core BaseAssetV1 layout: key(1) + owner(32)
    const ownerBytes = assetInfo.data.subarray(1, 33);
    const assetOwner = new PublicKey(ownerBytes);
    return assetOwner.equals(wallet);
  }

  // ── Write methods ───────────────────────────────────────────────────────

  async launchAgent(
    args: LaunchAgentArgs,
    payer: Keypair
  ): Promise<{ mint: PublicKey; tx: string }> {
    const asset = Keypair.generate();
    const [registryPDA] = this.deriveRegistryPDA();
    const registry = await this.getRegistry();
    const currentIndex = registry.totalAgents.toNumber();

    const [agentStatePDA] = this.deriveAgentStatePDA(asset.publicKey);
    const [agentEntryPDA] = this.deriveAgentEntryPDA(
      registryPDA,
      currentIndex
    );

    const tx = await this.program.methods
      .launchAgent(args)
      .accounts({
        payer: payer.publicKey,
        asset: asset.publicKey,
        registry: registryPDA,
        agentState: agentStatePDA,
        agentEntry: agentEntryPDA,
        treasury: registry.treasury,
        mplCoreProgram: MPL_CORE_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([payer, asset])
      .preInstructions([
        ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
      ])
      .rpc();

    return { mint: asset.publicKey, tx };
  }

  async evolveAgent(
    mint: PublicKey,
    newStateHash: Uint8Array,
    owner: Keypair
  ): Promise<string> {
    const [agentStatePDA] = this.deriveAgentStatePDA(mint);
    const agentState = await this.getAgentState(mint);
    const evolutionIndex = agentState.evolutionCount.toNumber();
    const [evolutionLogPDA] = this.deriveEvolutionLogPDA(
      mint,
      evolutionIndex
    );

    return await this.program.methods
      .evolve({
        newStateHash: Array.from(newStateHash),
        proof: Buffer.from([]),
      })
      .accounts({
        owner: owner.publicKey,
        asset: mint,
        agentState: agentStatePDA,
        evolutionLog: evolutionLogPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([owner])
      .rpc();
  }

  async executeAction(
    mint: PublicKey,
    actionData: Buffer,
    caller: Keypair,
    remainingAccounts?: anchor.web3.AccountMeta[]
  ): Promise<string> {
    const [agentStatePDA] = this.deriveAgentStatePDA(mint);
    const agentState = await this.getAgentState(mint);

    if (!agentState.logicProgram) {
      throw new Error("No logic program set for this agent");
    }

    return await this.program.methods
      .executeAction({ actionData: Buffer.from(actionData) })
      .accounts({
        caller: caller.publicKey,
        asset: mint,
        agentState: agentStatePDA,
        logicProgram: agentState.logicProgram,
      })
      .signers([caller])
      .remainingAccounts(remainingAccounts || [])
      .rpc();
  }

  async upgradeLogic(
    mint: PublicKey,
    newLogic: PublicKey | null,
    owner: Keypair
  ): Promise<string> {
    const [agentStatePDA] = this.deriveAgentStatePDA(mint);

    return await this.program.methods
      .upgradeLogic({ newLogicProgram: newLogic })
      .accounts({
        owner: owner.publicKey,
        asset: mint,
        agentState: agentStatePDA,
      })
      .signers([owner])
      .rpc();
  }

  async setBackendUri(
    mint: PublicKey,
    uri: string,
    owner: Keypair
  ): Promise<string> {
    const [agentStatePDA] = this.deriveAgentStatePDA(mint);

    return await this.program.methods
      .setBackendUri({ uri })
      .accounts({
        owner: owner.publicKey,
        asset: mint,
        agentState: agentStatePDA,
      })
      .signers([owner])
      .rpc();
  }

  async retireAgent(mint: PublicKey, owner: Keypair): Promise<string> {
    const [agentStatePDA] = this.deriveAgentStatePDA(mint);

    return await this.program.methods
      .retireAgent()
      .accounts({
        owner: owner.publicKey,
        asset: mint,
        agentState: agentStatePDA,
      })
      .signers([owner])
      .rpc();
  }
}
