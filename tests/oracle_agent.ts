import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  ComputeBudgetProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
} from "@solana/web3.js";
import { expect } from "chai";
import * as nacl from "tweetnacl";
import {
  deriveOracleDataPDA,
  derivePriceEntryPDA,
  airdrop,
  newKeypair,
} from "./helpers";

describe("oracle_agent_578", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.OracleAgent578 as Program;
  const payer = provider.wallet as anchor.Wallet;

  // Simulate an NFA mint (in real test this would be a Metaplex Core asset)
  const mintKeypair = newKeypair();
  const mint = mintKeypair.publicKey;

  // Backend signer keypair (ed25519)
  const backendSigner = nacl.sign.keyPair();
  const backendSignerPubkey = new PublicKey(backendSigner.publicKey);

  let oracleDataPDA: PublicKey;

  before(async () => {
    [oracleDataPDA] = deriveOracleDataPDA(mint, program.programId);
  });

  it("initializes oracle data", async () => {
    await program.methods
      .initializeOracle(backendSignerPubkey)
      .accounts({
        payer: payer.publicKey,
        mint: mint,
        oracleData: oracleDataPDA,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const oracle = await program.account.oracleData.fetch(oracleDataPDA);
    expect(oracle.mint.toBase58()).to.equal(mint.toBase58());
    expect(oracle.authorizedSigner.toBase58()).to.equal(backendSignerPubkey.toBase58());
    expect(oracle.priceCount.toNumber()).to.equal(0);
  });

  it("attests price with valid ed25519 signature", async () => {
    const token = newKeypair().publicKey;
    const priceUsdCents = 12345n; // $123.45
    const timestamp = BigInt(Math.floor(Date.now() / 1000));

    // Build the message to sign: token(32) + price(8) + timestamp(8)
    const message = Buffer.alloc(48);
    token.toBuffer().copy(message, 0);
    message.writeBigUInt64LE(priceUsdCents, 32);
    message.writeBigInt64LE(timestamp, 40);

    // Sign with backend keypair
    const signature = nacl.sign.detached(message, backendSigner.secretKey);

    // Build action_data: token(32) + price(8) + timestamp(8) + signature(64) = 112
    const actionData = Buffer.alloc(112);
    token.toBuffer().copy(actionData, 0);
    actionData.writeBigUInt64LE(priceUsdCents, 32);
    actionData.writeBigInt64LE(timestamp, 40);
    Buffer.from(signature).copy(actionData, 48);

    // Build ed25519 verify instruction
    const ed25519Ix = buildEd25519Instruction(
      backendSigner.publicKey,
      message,
      signature
    );

    const [priceEntryPDA] = derivePriceEntryPDA(mint, token, program.programId);

    await program.methods
      .executeAgentAction(Buffer.from(actionData))
      .accounts({
        payer: payer.publicKey,
        mint: mint,
        oracleData: oracleDataPDA,
        tokenKey: token,
        priceEntry: priceEntryPDA,
        instructionSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
        systemProgram: SystemProgram.programId,
      })
      .preInstructions([ed25519Ix])
      .rpc();

    const priceEntry = await program.account.priceEntry.fetch(priceEntryPDA);
    expect(priceEntry.priceUsdCents.toNumber()).to.equal(Number(priceUsdCents));
    expect(priceEntry.token.toBase58()).to.equal(token.toBase58());
  });

  it("rejects invalid signature", async () => {
    const token = newKeypair().publicKey;

    // Build with wrong signer
    const wrongSigner = nacl.sign.keyPair();
    const message = Buffer.alloc(48);
    token.toBuffer().copy(message, 0);
    message.writeBigUInt64LE(100n, 32);
    message.writeBigInt64LE(BigInt(Math.floor(Date.now() / 1000)), 40);

    const signature = nacl.sign.detached(message, wrongSigner.secretKey);

    const actionData = Buffer.alloc(112);
    token.toBuffer().copy(actionData, 0);
    actionData.writeBigUInt64LE(100n, 32);
    actionData.writeBigInt64LE(BigInt(Math.floor(Date.now() / 1000)), 40);
    Buffer.from(signature).copy(actionData, 48);

    const ed25519Ix = buildEd25519Instruction(
      wrongSigner.publicKey,
      message,
      signature
    );

    const [priceEntryPDA] = derivePriceEntryPDA(mint, token, program.programId);

    try {
      await program.methods
        .executeAgentAction(Buffer.from(actionData))
        .accounts({
          payer: payer.publicKey,
          mint: mint,
          oracleData: oracleDataPDA,
          tokenKey: token,
          priceEntry: priceEntryPDA,
          instructionSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
          systemProgram: SystemProgram.programId,
        })
        .preInstructions([ed25519Ix])
        .rpc();
      expect.fail("Should have thrown");
    } catch (err: any) {
      expect(err.toString()).to.contain("UnauthorizedSigner");
    }
  });
});

// ── Ed25519 instruction builder ─────────────────────────────────────────────

function buildEd25519Instruction(
  publicKey: Uint8Array,
  message: Buffer,
  signature: Uint8Array
): TransactionInstruction {
  const ED25519_PROGRAM_ID = new PublicKey(
    "Ed25519SigVerify111111111111111111111111111"
  );

  // Layout: num_signatures(1) + padding(1) + offsets(14) + signature(64) + pubkey(32) + message(N)
  const headerSize = 2; // num_signatures + padding
  const offsetsSize = 14; // 7 x u16
  const dataOffset = headerSize + offsetsSize;
  const sigOffset = dataOffset;
  const pubkeyOffset = sigOffset + 64;
  const msgOffset = pubkeyOffset + 32;

  const data = Buffer.alloc(msgOffset + message.length);

  // Header
  data.writeUInt8(1, 0); // num_signatures
  data.writeUInt8(0, 1); // padding

  // Offsets
  data.writeUInt16LE(sigOffset, 2);      // signature_offset
  data.writeUInt16LE(0xFFFF, 4);         // signature_instruction_index (u16::MAX = same tx)
  data.writeUInt16LE(pubkeyOffset, 6);   // public_key_offset
  data.writeUInt16LE(0xFFFF, 8);         // public_key_instruction_index
  data.writeUInt16LE(msgOffset, 10);     // message_data_offset
  data.writeUInt16LE(message.length, 12); // message_data_size
  data.writeUInt16LE(0xFFFF, 14);        // message_instruction_index

  // Data
  Buffer.from(signature).copy(data, sigOffset);
  Buffer.from(publicKey).copy(data, pubkeyOffset);
  message.copy(data, msgOffset);

  return new TransactionInstruction({
    keys: [],
    programId: ED25519_PROGRAM_ID,
    data,
  });
}
