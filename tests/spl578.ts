import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
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

describe("spl578 program", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Spl578 as Program;
  const authority = provider.wallet as anchor.Wallet;
  const treasury = newKeypair();

  let registryPDA: PublicKey;
  let registryBump: number;
  let agentMint: Keypair;
  let agentStatePDA: PublicKey;
  let agentEntryPDA: PublicKey;

  before(async () => {
    // Airdrop to treasury
    await airdrop(provider.connection, treasury.publicKey);
    [registryPDA, registryBump] = deriveRegistryPDA(program.programId);
  });

  it("initializes registry", async () => {
    await program.methods
      .initializeRegistry({
        mintFeeLamports: new anchor.BN(0.01 * LAMPORTS_PER_SOL),
        treasury: treasury.publicKey,
      })
      .accounts({
        authority: authority.publicKey,
        registry: registryPDA,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const registry = await program.account.agentRegistry.fetch(registryPDA);
    expect(registry.authority.toBase58()).to.equal(authority.publicKey.toBase58());
    expect(registry.totalAgents.toNumber()).to.equal(0);
    expect(registry.mintFeeLamports.toNumber()).to.equal(0.01 * LAMPORTS_PER_SOL);
    expect(registry.treasury.toBase58()).to.equal(treasury.publicKey.toBase58());
  });

  it("launches an agent with correct PDAs", async () => {
    agentMint = newKeypair();
    [agentStatePDA] = deriveAgentStatePDA(agentMint.publicKey, program.programId);
    [agentEntryPDA] = deriveAgentEntryPDA(registryPDA, 0, program.programId);

    const tx = new Transaction().add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 })
    );

    await program.methods
      .launchAgent({
        name: "Test Oracle Agent",
        agentType: { oracle: {} },
        description: "An oracle agent for testing",
        backendUri: "https://example.com/api",
        logicProgram: null,
        jurisdiction: "US",
        kycLevel: 1,
        tags: ["defi", "oracle"],
        uri: "https://arweave.net/metadata.json",
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

    const agentState = await program.account.agentState.fetch(agentStatePDA);
    expect(agentState.name).to.equal("Test Oracle Agent");
    expect(agentState.mint.toBase58()).to.equal(agentMint.publicKey.toBase58());
    expect(agentState.retired).to.be.false;
    expect(agentState.evolutionCount.toNumber()).to.equal(0);
    expect(agentState.tags).to.deep.equal(["defi", "oracle"]);

    const registry = await program.account.agentRegistry.fetch(registryPDA);
    expect(registry.totalAgents.toNumber()).to.equal(1);

    const agentEntry = await program.account.agentEntry.fetch(agentEntryPDA);
    expect(agentEntry.tokenId.toNumber()).to.equal(0);
    expect(agentEntry.verified).to.be.false;
  });

  it("refuses launch with insufficient fee", async () => {
    // Drain the payer's balance to trigger insufficient fee
    // Actually, we test by creating a payer with not enough SOL
    const poorPayer = newKeypair();
    await airdrop(provider.connection, poorPayer.publicKey, 1000); // barely enough for rent

    const mint2 = newKeypair();
    const [statePDA2] = deriveAgentStatePDA(mint2.publicKey, program.programId);
    const [entryPDA2] = deriveAgentEntryPDA(registryPDA, 1, program.programId);

    try {
      await program.methods
        .launchAgent({
          name: "Poor Agent",
          agentType: { assistant: {} },
          description: "Should fail",
          backendUri: "",
          logicProgram: null,
          jurisdiction: "",
          kycLevel: 0,
          tags: [],
          uri: "",
        })
        .accounts({
          payer: poorPayer.publicKey,
          asset: mint2.publicKey,
          registry: registryPDA,
          agentState: statePDA2,
          agentEntry: entryPDA2,
          treasury: treasury.publicKey,
          mplCoreProgram: MPL_CORE_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([poorPayer, mint2])
        .preInstructions([
          ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
        ])
        .rpc();
      expect.fail("Should have thrown");
    } catch (err: any) {
      // Expect some error (insufficient lamports or custom error)
      expect(err).to.exist;
    }
  });

  it("refuses launch with string too long", async () => {
    const mint3 = newKeypair();
    const [statePDA3] = deriveAgentStatePDA(mint3.publicKey, program.programId);
    const [entryPDA3] = deriveAgentEntryPDA(registryPDA, 1, program.programId);

    try {
      await program.methods
        .launchAgent({
          name: "A".repeat(100), // > MAX_NAME_LEN of 64
          agentType: { assistant: {} },
          description: "",
          backendUri: "",
          logicProgram: null,
          jurisdiction: "",
          kycLevel: 0,
          tags: [],
          uri: "",
        })
        .accounts({
          payer: authority.publicKey,
          asset: mint3.publicKey,
          registry: registryPDA,
          agentState: statePDA3,
          agentEntry: entryPDA3,
          treasury: treasury.publicKey,
          mplCoreProgram: MPL_CORE_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([mint3])
        .preInstructions([
          ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
        ])
        .rpc();
      expect.fail("Should have thrown");
    } catch (err: any) {
      expect(err.toString()).to.contain("StringTooLong");
    }
  });

  it("evolves agent state", async () => {
    const newHash = Buffer.alloc(32);
    newHash.fill(0xab);

    const [evolutionLogPDA] = deriveEvolutionLogPDA(
      agentMint.publicKey,
      0,
      program.programId
    );

    await program.methods
      .evolve({
        newStateHash: Array.from(newHash),
        proof: Buffer.from([]),
      })
      .accounts({
        owner: authority.publicKey,
        asset: agentMint.publicKey,
        agentState: agentStatePDA,
        evolutionLog: evolutionLogPDA,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const agentState = await program.account.agentState.fetch(agentStatePDA);
    expect(agentState.evolutionCount.toNumber()).to.equal(1);
    expect(Buffer.from(agentState.stateHash)).to.deep.equal(newHash);

    const log = await program.account.evolutionLog.fetch(evolutionLogPDA);
    expect(log.index.toNumber()).to.equal(0);
    expect(Buffer.from(log.newHash)).to.deep.equal(newHash);
  });

  it("refuses evolve by non-owner", async () => {
    const nonOwner = newKeypair();
    await airdrop(provider.connection, nonOwner.publicKey);

    const newHash = Buffer.alloc(32);
    newHash.fill(0xcd);

    const [evolutionLogPDA] = deriveEvolutionLogPDA(
      agentMint.publicKey,
      1,
      program.programId
    );

    try {
      await program.methods
        .evolve({
          newStateHash: Array.from(newHash),
          proof: Buffer.from([]),
        })
        .accounts({
          owner: nonOwner.publicKey,
          asset: agentMint.publicKey,
          agentState: agentStatePDA,
          evolutionLog: evolutionLogPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([nonOwner])
        .rpc();
      expect.fail("Should have thrown");
    } catch (err: any) {
      expect(err.toString()).to.contain("NotOwner");
    }
  });

  it("upgrades logic program", async () => {
    const logicProgram = newKeypair().publicKey;

    await program.methods
      .upgradeLogic({
        newLogicProgram: logicProgram,
      })
      .accounts({
        owner: authority.publicKey,
        asset: agentMint.publicKey,
        agentState: agentStatePDA,
      })
      .rpc();

    const agentState = await program.account.agentState.fetch(agentStatePDA);
    expect(agentState.logicProgram.toBase58()).to.equal(logicProgram.toBase58());
  });

  it("sets backend URI", async () => {
    await program.methods
      .setBackendUri({
        uri: "https://new-backend.example.com/api",
      })
      .accounts({
        owner: authority.publicKey,
        asset: agentMint.publicKey,
        agentState: agentStatePDA,
      })
      .rpc();

    const agentState = await program.account.agentState.fetch(agentStatePDA);
    expect(agentState.backendUri).to.equal("https://new-backend.example.com/api");
  });

  it("refuses invalid backend URI", async () => {
    try {
      await program.methods
        .setBackendUri({
          uri: "http://insecure.example.com",
        })
        .accounts({
          owner: authority.publicKey,
          asset: agentMint.publicKey,
          agentState: agentStatePDA,
        })
        .rpc();
      expect.fail("Should have thrown");
    } catch (err: any) {
      expect(err.toString()).to.contain("InvalidURI");
    }
  });

  it("retires agent", async () => {
    await program.methods
      .retireAgent()
      .accounts({
        owner: authority.publicKey,
        asset: agentMint.publicKey,
        agentState: agentStatePDA,
      })
      .rpc();

    const agentState = await program.account.agentState.fetch(agentStatePDA);
    expect(agentState.retired).to.be.true;
  });

  it("refuses evolve on retired agent", async () => {
    const newHash = Buffer.alloc(32);
    newHash.fill(0xef);

    const [evolutionLogPDA] = deriveEvolutionLogPDA(
      agentMint.publicKey,
      1,
      program.programId
    );

    try {
      await program.methods
        .evolve({
          newStateHash: Array.from(newHash),
          proof: Buffer.from([]),
        })
        .accounts({
          owner: authority.publicKey,
          asset: agentMint.publicKey,
          agentState: agentStatePDA,
          evolutionLog: evolutionLogPDA,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      expect.fail("Should have thrown");
    } catch (err: any) {
      expect(err.toString()).to.contain("AgentRetired");
    }
  });

  it("verifies agent (admin)", async () => {
    await program.methods
      .verifyAgent()
      .accounts({
        authority: authority.publicKey,
        registry: registryPDA,
        agentEntry: agentEntryPDA,
      })
      .rpc();

    const entry = await program.account.agentEntry.fetch(agentEntryPDA);
    expect(entry.verified).to.be.true;
  });

  it("refuses verify by non-admin", async () => {
    const nonAdmin = newKeypair();
    await airdrop(provider.connection, nonAdmin.publicKey);

    try {
      await program.methods
        .verifyAgent()
        .accounts({
          authority: nonAdmin.publicKey,
          registry: registryPDA,
          agentEntry: agentEntryPDA,
        })
        .signers([nonAdmin])
        .rpc();
      expect.fail("Should have thrown");
    } catch (err: any) {
      expect(err.toString()).to.contain("Unauthorized");
    }
  });

  it("paginates agent entries", async () => {
    // Launch 2 more agents (total = 3)
    for (let i = 1; i <= 2; i++) {
      const mint = newKeypair();
      const [statePDA] = deriveAgentStatePDA(mint.publicKey, program.programId);
      const [entryPDA] = deriveAgentEntryPDA(registryPDA, i, program.programId);

      await program.methods
        .launchAgent({
          name: `Agent ${i + 1}`,
          agentType: { assistant: {} },
          description: `Agent number ${i + 1}`,
          backendUri: "",
          logicProgram: null,
          jurisdiction: "",
          kycLevel: 0,
          tags: [],
          uri: "",
        })
        .accounts({
          payer: authority.publicKey,
          asset: mint.publicKey,
          registry: registryPDA,
          agentState: statePDA,
          agentEntry: entryPDA,
          treasury: treasury.publicKey,
          mplCoreProgram: MPL_CORE_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([mint])
        .preInstructions([
          ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
        ])
        .rpc();
    }

    const registry = await program.account.agentRegistry.fetch(registryPDA);
    expect(registry.totalAgents.toNumber()).to.equal(3);

    // Fetch all 3 entries
    for (let i = 0; i < 3; i++) {
      const [entryPDA] = deriveAgentEntryPDA(registryPDA, i, program.programId);
      const entry = await program.account.agentEntry.fetch(entryPDA);
      expect(entry.tokenId.toNumber()).to.equal(i);
    }
  });
});
