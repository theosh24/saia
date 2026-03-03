import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  SYSVAR_INSTRUCTIONS_PUBKEY,
} from "@solana/web3.js";
import { expect } from "chai";
import * as nacl from "tweetnacl";
import {
  deriveTradeJournalPDA,
  deriveTradeEntryPDA,
  airdrop,
  newKeypair,
} from "./helpers";

describe("trading_agent_578", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.TradingAgent578 as Program;
  const payer = provider.wallet as anchor.Wallet;

  const mintKeypair = newKeypair();
  const mint = mintKeypair.publicKey;

  const backendSigner = nacl.sign.keyPair();
  const backendSignerPubkey = new PublicKey(backendSigner.publicKey);

  let journalPDA: PublicKey;

  before(async () => {
    [journalPDA] = deriveTradeJournalPDA(mint, program.programId);
  });

  it("initializes trade journal", async () => {
    await program.methods
      .initializeJournal(backendSignerPubkey)
      .accounts({
        payer: payer.publicKey,
        mint: mint,
        tradeJournal: journalPDA,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const journal = await program.account.tradeJournal.fetch(journalPDA);
    expect(journal.mint.toBase58()).to.equal(mint.toBase58());
    expect(journal.tradeCount.toNumber()).to.equal(0);
  });

  it("logs trade intent", async () => {
    const tokenIn = newKeypair().publicKey;
    const tokenOut = newKeypair().publicKey;
    const tradeId = Buffer.alloc(32);
    tradeId.fill(0x01);

    const amountIn = 1000000n;
    const expectedOut = 950000n;
    const timestamp = BigInt(Math.floor(Date.now() / 1000));

    // Build message for signing
    const message = Buffer.alloc(120);
    tradeId.copy(message, 0);
    tokenIn.toBuffer().copy(message, 32);
    tokenOut.toBuffer().copy(message, 64);
    message.writeBigUInt64LE(amountIn, 96);
    message.writeBigUInt64LE(expectedOut, 104);
    message.writeBigInt64LE(timestamp, 112);

    const signature = nacl.sign.detached(message, backendSigner.secretKey);

    // Build action_data: trade_id(32) + token_in(32) + token_out(32) + amount_in(8) + expected_out(8) + timestamp(8) + signature(64) = 184
    const actionData = Buffer.alloc(184);
    tradeId.copy(actionData, 0);
    tokenIn.toBuffer().copy(actionData, 32);
    tokenOut.toBuffer().copy(actionData, 64);
    actionData.writeBigUInt64LE(amountIn, 96);
    actionData.writeBigUInt64LE(expectedOut, 104);
    actionData.writeBigInt64LE(timestamp, 112);
    Buffer.from(signature).copy(actionData, 120);

    const ed25519Ix = buildEd25519Instruction(
      backendSigner.publicKey,
      message,
      signature
    );

    const [tradeEntryPDA] = deriveTradeEntryPDA(mint, 0, program.programId);

    await program.methods
      .executeAgentAction(Buffer.from(actionData))
      .accounts({
        payer: payer.publicKey,
        mint: mint,
        tradeJournal: journalPDA,
        tradeEntry: tradeEntryPDA,
        instructionSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
        systemProgram: SystemProgram.programId,
      })
      .preInstructions([ed25519Ix])
      .rpc();

    const entry = await program.account.tradeEntry.fetch(tradeEntryPDA);
    expect(entry.amountIn.toNumber()).to.equal(Number(amountIn));
    expect(entry.executed).to.be.false;

    const journal = await program.account.tradeJournal.fetch(journalPDA);
    expect(journal.tradeCount.toNumber()).to.equal(1);
  });

  it("marks trade as executed", async () => {
    const [tradeEntryPDA] = deriveTradeEntryPDA(mint, 0, program.programId);

    await program.methods
      .markExecuted()
      .accounts({
        owner: payer.publicKey,
        mint: mint,
        tradeJournal: journalPDA,
        tradeEntry: tradeEntryPDA,
      })
      .rpc();

    const entry = await program.account.tradeEntry.fetch(tradeEntryPDA);
    expect(entry.executed).to.be.true;
  });

  it("rejects double execution", async () => {
    const [tradeEntryPDA] = deriveTradeEntryPDA(mint, 0, program.programId);

    try {
      await program.methods
        .markExecuted()
        .accounts({
          owner: payer.publicKey,
          mint: mint,
          tradeJournal: journalPDA,
          tradeEntry: tradeEntryPDA,
        })
        .rpc();
      expect.fail("Should have thrown");
    } catch (err: any) {
      expect(err.toString()).to.contain("AlreadyExecuted");
    }
  });
});

// ── Ed25519 instruction builder (same as oracle test) ───────────────────────

function buildEd25519Instruction(
  publicKey: Uint8Array,
  message: Buffer,
  signature: Uint8Array
): TransactionInstruction {
  const ED25519_PROGRAM_ID = new PublicKey(
    "Ed25519SigVerify111111111111111111111111111"
  );

  const headerSize = 2;
  const offsetsSize = 14;
  const dataOffset = headerSize + offsetsSize;
  const sigOffset = dataOffset;
  const pubkeyOffset = sigOffset + 64;
  const msgOffset = pubkeyOffset + 32;

  const data = Buffer.alloc(msgOffset + message.length);

  data.writeUInt8(1, 0);
  data.writeUInt8(0, 1);
  data.writeUInt16LE(sigOffset, 2);
  data.writeUInt16LE(0xFFFF, 4);
  data.writeUInt16LE(pubkeyOffset, 6);
  data.writeUInt16LE(0xFFFF, 8);
  data.writeUInt16LE(msgOffset, 10);
  data.writeUInt16LE(message.length, 12);
  data.writeUInt16LE(0xFFFF, 14);

  Buffer.from(signature).copy(data, sigOffset);
  Buffer.from(publicKey).copy(data, pubkeyOffset);
  message.copy(data, msgOffset);

  return new TransactionInstruction({
    keys: [],
    programId: ED25519_PROGRAM_ID,
    data,
  });
}
