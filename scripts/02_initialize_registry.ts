import * as anchor from "@coral-xyz/anchor";
import {
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Keypair,
} from "@solana/web3.js";
import { deriveRegistryPDA } from "../sdk/src/pda";

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Spl578;
  const authority = provider.wallet as anchor.Wallet;

  // Configuration
  const MINT_FEE = 0.01 * LAMPORTS_PER_SOL; // 0.01 SOL
  const treasury = authority.publicKey; // Use authority as treasury for now

  const [registryPDA] = deriveRegistryPDA(program.programId);

  console.log("Initializing AgentRegistry...");
  console.log("  Authority:", authority.publicKey.toBase58());
  console.log("  Treasury:", treasury.toBase58());
  console.log("  Mint fee:", MINT_FEE / LAMPORTS_PER_SOL, "SOL");
  console.log("  Registry PDA:", registryPDA.toBase58());

  try {
    const tx = await program.methods
      .initializeRegistry({
        mintFeeLamports: new anchor.BN(MINT_FEE),
        treasury,
      })
      .accounts({
        authority: authority.publicKey,
        registry: registryPDA,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("\nRegistry initialized! TX:", tx);

    const registry = await program.account.agentRegistry.fetch(registryPDA);
    console.log("\nRegistry state:");
    console.log("  Authority:", registry.authority.toBase58());
    console.log("  Total agents:", registry.totalAgents.toNumber());
    console.log("  Mint fee:", registry.mintFeeLamports.toNumber() / LAMPORTS_PER_SOL, "SOL");
  } catch (err: any) {
    if (err.toString().includes("already in use")) {
      console.log("Registry already initialized.");
    } else {
      throw err;
    }
  }
}

main().catch(console.error);
