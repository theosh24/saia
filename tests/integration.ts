import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  ComputeBudgetProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { expect } from "chai";
import {
  deriveRegistryPDA,
  deriveAgentStatePDA,
  deriveAgentEntryPDA,
  deriveEvolutionLogPDA,
  airdrop,
  newKeypair,
  MPL_CORE_PROGRAM_ID,
} from "./helpers";

describe("integration — full agent lifecycle", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Spl578 as Program;
  const authority = provider.wallet as anchor.Wallet;
  const treasury = newKeypair();

  let registryPDA: PublicKey;
  let agentMint: Keypair;
  let agentStatePDA: PublicKey;

  before(async () => {
    await airdrop(provider.connection, treasury.publicKey);
    [registryPDA] = deriveRegistryPDA(program.programId);
  });

  it("full lifecycle: init → launch → evolve → upgrade logic → set URI → retire", async () => {
    // 1. Initialize registry
    try {
      await program.methods
        .initializeRegistry({
          mintFeeLamports: new anchor.BN(0),
          treasury: treasury.publicKey,
        })
        .accounts({
          authority: authority.publicKey,
          registry: registryPDA,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    } catch (_) {
      // May already be initialized from other test suites
    }

    // 2. Launch agent
    agentMint = newKeypair();
    [agentStatePDA] = deriveAgentStatePDA(agentMint.publicKey, program.programId);

    const registry = await program.account.agentRegistry.fetch(registryPDA);
    const currentIndex = registry.totalAgents.toNumber();
    const [agentEntryPDA] = deriveAgentEntryPDA(registryPDA, currentIndex, program.programId);

    await program.methods
      .launchAgent({
        name: "Lifecycle Agent",
        agentType: { trader: {} },
        description: "Integration test agent",
        backendUri: "https://test.example.com",
        logicProgram: null,
        jurisdiction: "EU",
        kycLevel: 2,
        tags: ["test", "integration"],
        uri: "https://arweave.net/test.json",
      })
      .accounts({
        payer: authority.publicKey,
        asset: agentMint.publicKey,
        registry: registryPDA,
        agentState: agentStatePDA,
        agentEntry: agentEntryPDA,
        treasury: treasury.publicKey,
        mplCoreProgram: MPL_CORE_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([agentMint])
      .preInstructions([
        ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
      ])
      .rpc();

    let agentState = await program.account.agentState.fetch(agentStatePDA);
    expect(agentState.name).to.equal("Lifecycle Agent");
    expect(agentState.retired).to.be.false;

    // 3. Evolve agent
    const stateHash1 = Buffer.alloc(32);
    stateHash1.fill(0x11);

    const [evoLog0] = deriveEvolutionLogPDA(agentMint.publicKey, 0, program.programId);
    await program.methods
      .evolve({
        newStateHash: Array.from(stateHash1),
        proof: Buffer.from([]),
      })
      .accounts({
        owner: authority.publicKey,
        asset: agentMint.publicKey,
        agentState: agentStatePDA,
        evolutionLog: evoLog0,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    agentState = await program.account.agentState.fetch(agentStatePDA);
    expect(agentState.evolutionCount.toNumber()).to.equal(1);

    // 4. Second evolution
    const stateHash2 = Buffer.alloc(32);
    stateHash2.fill(0x22);

    const [evoLog1] = deriveEvolutionLogPDA(agentMint.publicKey, 1, program.programId);
    await program.methods
      .evolve({
        newStateHash: Array.from(stateHash2),
        proof: Buffer.from([]),
      })
      .accounts({
        owner: authority.publicKey,
        asset: agentMint.publicKey,
        agentState: agentStatePDA,
        evolutionLog: evoLog1,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    // Verify evolution chain
    const log0 = await program.account.evolutionLog.fetch(evoLog0);
    const log1 = await program.account.evolutionLog.fetch(evoLog1);
    expect(Buffer.from(log0.newHash)).to.deep.equal(stateHash1);
    expect(Buffer.from(log1.previousHash)).to.deep.equal(stateHash1);
    expect(Buffer.from(log1.newHash)).to.deep.equal(stateHash2);

    // 5. Upgrade logic
    const logicProgramId = newKeypair().publicKey;
    await program.methods
      .upgradeLogic({
        newLogicProgram: logicProgramId,
      })
      .accounts({
        owner: authority.publicKey,
        asset: agentMint.publicKey,
        agentState: agentStatePDA,
      })
      .rpc();

    agentState = await program.account.agentState.fetch(agentStatePDA);
    expect(agentState.logicProgram.toBase58()).to.equal(logicProgramId.toBase58());

    // 6. Set backend URI
    await program.methods
      .setBackendUri({
        uri: "https://updated-backend.example.com/v2",
      })
      .accounts({
        owner: authority.publicKey,
        asset: agentMint.publicKey,
        agentState: agentStatePDA,
      })
      .rpc();

    agentState = await program.account.agentState.fetch(agentStatePDA);
    expect(agentState.backendUri).to.equal("https://updated-backend.example.com/v2");

    // 7. Retire agent
    await program.methods
      .retireAgent()
      .accounts({
        owner: authority.publicKey,
        asset: agentMint.publicKey,
        agentState: agentStatePDA,
      })
      .rpc();

    agentState = await program.account.agentState.fetch(agentStatePDA);
    expect(agentState.retired).to.be.true;

    // 8. Verify retired agent cannot evolve
    const stateHash3 = Buffer.alloc(32);
    stateHash3.fill(0x33);
    const [evoLog2] = deriveEvolutionLogPDA(agentMint.publicKey, 2, program.programId);

    try {
      await program.methods
        .evolve({
          newStateHash: Array.from(stateHash3),
          proof: Buffer.from([]),
        })
        .accounts({
          owner: authority.publicKey,
          asset: agentMint.publicKey,
          agentState: agentStatePDA,
          evolutionLog: evoLog2,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      expect.fail("Should have thrown — agent is retired");
    } catch (err: any) {
      expect(err.toString()).to.contain("AgentRetired");
    }
  });
});
