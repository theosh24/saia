import * as anchor from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  SYSVAR_INSTRUCTIONS_PUBKEY,
} from "@solana/web3.js";
import * as nacl from "tweetnacl";
import {
  deriveOracleDataPDA,
  derivePriceEntryPDA,
} from "../sdk/src/pda";
import { buildEd25519VerifyInstruction } from "../sdk/src/utils";

// Test tokens to price
const TOKENS = [
  { symbol: "SOL", pubkey: new PublicKey("So11111111111111111111111111111111111111112"), price: 15000 },   // $150.00
  { symbol: "USDC", pubkey: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"), price: 100 }, // $1.00
  { symbol: "RAY", pubkey: new PublicKey("4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R"), price: 180 },  // $1.80
  { symbol: "BONK", pubkey: Keypair.generate().publicKey, price: 1 },                                       // $0.01
  { symbol: "JTO", pubkey: Keypair.generate().publicKey, price: 250 },                                      // $2.50
];

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const oracleProgram = anchor.workspace.OracleAgent578;
  const payer = provider.wallet as anchor.Wallet;

  // Generate a backend signer for testing
  const backendSigner = nacl.sign.keyPair();
  const backendSignerPubkey = new PublicKey(backendSigner.publicKey);

  // Use a dummy mint for demo (in production, use the actual NFA mint)
  const mint = Keypair.generate().publicKey;
  const [oracleDataPDA] = deriveOracleDataPDA(mint, oracleProgram.programId);

  console.log("=== Seeding Oracle Prices ===\n");
  console.log("Mint:", mint.toBase58());
  console.log("Backend signer:", backendSignerPubkey.toBase58());

  // Initialize oracle
  console.log("\nInitializing oracle...");
  await oracleProgram.methods
    .initializeOracle(backendSignerPubkey)
    .accounts({
      payer: payer.publicKey,
      mint,
      oracleData: oracleDataPDA,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("Oracle initialized!\n");

  // Seed prices
  for (const token of TOKENS) {
    const timestamp = BigInt(Math.floor(Date.now() / 1000));

    // Build message: token(32) + price(8) + timestamp(8)
    const message = Buffer.alloc(48);
    token.pubkey.toBuffer().copy(message, 0);
    message.writeBigUInt64LE(BigInt(token.price), 32);
    message.writeBigInt64LE(timestamp, 40);

    const signature = nacl.sign.detached(message, backendSigner.secretKey);

    // Build action_data: token(32) + price(8) + timestamp(8) + signature(64)
    const actionData = Buffer.alloc(112);
    token.pubkey.toBuffer().copy(actionData, 0);
    actionData.writeBigUInt64LE(BigInt(token.price), 32);
    actionData.writeBigInt64LE(timestamp, 40);
    Buffer.from(signature).copy(actionData, 48);

    const ed25519Ix = buildEd25519VerifyInstruction(
      backendSigner.publicKey,
      message,
      signature
    );

    const [priceEntryPDA] = derivePriceEntryPDA(
      mint,
      token.pubkey,
      oracleProgram.programId
    );

    console.log(`Attesting ${token.symbol}: $${token.price / 100}`);

    await oracleProgram.methods
      .executeAgentAction(Buffer.from(actionData))
      .accounts({
        payer: payer.publicKey,
        mint,
        oracleData: oracleDataPDA,
        tokenKey: token.pubkey,
        priceEntry: priceEntryPDA,
        instructionSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
        systemProgram: SystemProgram.programId,
      })
      .preInstructions([ed25519Ix])
      .rpc();

    console.log(`  PriceEntry: ${priceEntryPDA.toBase58()}`);
  }

  console.log("\nDone! All 5 test prices seeded.");
}

main().catch(console.error);
