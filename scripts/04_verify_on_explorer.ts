import * as anchor from "@coral-xyz/anchor";

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const programs = [
    { name: "spl578", program: anchor.workspace.Spl578 },
    { name: "oracle_agent_578", program: anchor.workspace.OracleAgent578 },
    { name: "trading_agent_578", program: anchor.workspace.TradingAgent578 },
    { name: "assistant_agent_578", program: anchor.workspace.AssistantAgent578 },
  ];

  console.log("=== SPL-578 Program Verification ===\n");

  for (const { name, program } of programs) {
    const programId = program.programId.toBase58();
    console.log(`${name}:`);
    console.log(`  Program ID: ${programId}`);
    console.log(`  Explorer:   https://explorer.solana.com/address/${programId}?cluster=devnet`);
    console.log(`  SolanaFM:   https://solana.fm/address/${programId}?cluster=devnet-alpha`);
    console.log();
  }

  console.log("To upload IDLs, run:");
  for (const { name, program } of programs) {
    console.log(`  anchor idl init --filepath target/idl/${name}.json ${program.programId.toBase58()} --provider.cluster devnet`);
  }
}

main().catch(console.error);
