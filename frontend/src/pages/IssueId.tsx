import { useState } from 'react';
import { Fingerprint, ArrowRight, Loader2, CheckCircle, ExternalLink } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  Keypair,
  ComputeBudgetProgram,
} from '@solana/web3.js';
const PROGRAM_ID = new PublicKey('4xctWwmCg1JakNF1asQi8zpz3tB8DM3c58SMVPfByjW1');
const MPL_CORE_PROGRAM_ID = new PublicKey('CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d');
const RPC_URL = import.meta.env.VITE_SOLANA_RPC || 'https://api.devnet.solana.com';

const AGENT_TYPES = [
  { label: 'Assistant', value: 0 },
  { label: 'Oracle', value: 1 },
  { label: 'Trader', value: 2 },
  { label: 'Moderator', value: 3 },
  { label: 'Custom', value: 4 },
];

async function anchorDiscriminator(ixName: string): Promise<Uint8Array> {
  const data = new TextEncoder().encode(`global:${ixName}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hashBuffer).subarray(0, 8);
}

function writeString(bufs: Uint8Array[], s: string) {
  const strBuf = new TextEncoder().encode(s);
  const lenBuf = new Uint8Array(4);
  new DataView(lenBuf.buffer).setUint32(0, strBuf.length, true);
  bufs.push(lenBuf, strBuf);
}

function writeU8(bufs: Uint8Array[], v: number) {
  bufs.push(new Uint8Array([v]));
}

function writeU64LE(bufs: Uint8Array[], v: bigint) {
  const buf = new Uint8Array(8);
  new DataView(buf.buffer).setBigUint64(0, v, true);
  bufs.push(buf);
}

function writeVecString(bufs: Uint8Array[], arr: string[]) {
  const lenBuf = new Uint8Array(4);
  new DataView(lenBuf.buffer).setUint32(0, arr.length, true);
  bufs.push(lenBuf);
  for (const s of arr) writeString(bufs, s);
}

function u64ToLeBytes(n: number | bigint): Uint8Array {
  const buf = new Uint8Array(8);
  new DataView(buf.buffer).setBigUint64(0, BigInt(n), true);
  return buf;
}

function concatBytes(arrays: Uint8Array[]): Uint8Array {
  const totalLen = arrays.reduce((acc, a) => acc + a.length, 0);
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const a of arrays) {
    result.set(a, offset);
    offset += a.length;
  }
  return result;
}

export default function IssueId() {
  const { publicKey, signTransaction, connected } = useWallet();
  const { setVisible } = useWalletModal();

  const [name, setName] = useState('');
  const [agentType, setAgentType] = useState(0);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ mint: string; tx: string } | null>(null);

  const handleMint = async () => {
    if (!publicKey || !signTransaction) {
      setVisible(true);
      return;
    }
    if (!name.trim()) {
      setError('Agent name is required');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const connection = new Connection(RPC_URL, 'confirmed');
      const asset = Keypair.generate();

      // Derive PDAs
      const [registryPDA] = PublicKey.findProgramAddressSync(
        [new TextEncoder().encode('registry')],
        PROGRAM_ID
      );

      // Read registry for current total_agents and treasury
      const registryAccount = await connection.getAccountInfo(registryPDA);
      if (!registryAccount) {
        throw new Error('Registry not initialized on devnet');
      }

      const currentIndex = Number(new DataView(registryAccount.data.buffer, registryAccount.data.byteOffset).getBigUint64(40, true));
      const treasuryBytes = registryAccount.data.subarray(56, 88);
      const treasury = new PublicKey(treasuryBytes);

      const [agentStatePDA] = PublicKey.findProgramAddressSync(
        [new TextEncoder().encode('agent_state'), asset.publicKey.toBuffer()],
        PROGRAM_ID
      );
      const [agentEntryPDA] = PublicKey.findProgramAddressSync(
        [
          new TextEncoder().encode('agent_entry'),
          registryPDA.toBuffer(),
          u64ToLeBytes(currentIndex),
        ],
        PROGRAM_ID
      );

      // Build instruction data
      const disc = await anchorDiscriminator('launch_agent');
      const bufs: Uint8Array[] = [disc];

      // LaunchAgentArgs: name, agent_type, description, backend_uri, logic_program, jurisdiction, kyc_level, tags, uri
      writeString(bufs, name.trim());
      writeU8(bufs, agentType);
      writeString(bufs, description.trim() || `${AGENT_TYPES[agentType].label} agent on SAIA578`);
      writeString(bufs, ''); // backend_uri (empty for now)
      writeU8(bufs, 0); // logic_program = None
      writeString(bufs, 'US'); // jurisdiction
      writeU8(bufs, 0); // kyc_level
      const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
      writeVecString(bufs, tagList);
      writeString(bufs, `https://arweave.net/saia-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`); // uri

      const data = concatBytes(bufs);

      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: asset.publicKey, isSigner: true, isWritable: true },
          { pubkey: registryPDA, isSigner: false, isWritable: true },
          { pubkey: agentStatePDA, isSigner: false, isWritable: true },
          { pubkey: agentEntryPDA, isSigner: false, isWritable: true },
          { pubkey: treasury, isSigner: false, isWritable: true },
          { pubkey: MPL_CORE_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: Buffer.from(data),
      });

      const tx = new Transaction();
      tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }));
      tx.add(ix);
      tx.feePayer = publicKey;

      const { blockhash } = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = blockhash;

      // Partially sign with asset keypair (the NFT mint account)
      tx.partialSign(asset);

      // User signs with wallet
      const signedTx = await signTransaction(tx);

      // Send
      const rawTx = signedTx.serialize();
      const sig = await connection.sendRawTransaction(rawTx, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      await connection.confirmTransaction(sig, 'confirmed');

      setResult({ mint: asset.publicKey.toBase58(), tx: sig });
    } catch (err: any) {
      console.error('Mint error:', err);
      setError(err.message || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[800px] mx-auto px-4 py-10 animate-fade-in pointer-events-auto">
      <h2 className="font-display text-xl md:text-2xl font-bold text-foreground mb-6">Issue Agent ID</h2>

      <div className="glass-panel rounded-xl p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 border border-border flex items-center justify-center">
            <Fingerprint className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Create Non-Fungible Agent Identity</p>
            <p className="text-xs text-muted-foreground">Mint an SPL-578 compliant agent NFT on Solana devnet</p>
          </div>
        </div>

        {result ? (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-3 text-neon-green">
              <CheckCircle className="w-6 h-6" />
              <span className="font-display text-lg font-bold">Agent Minted!</span>
            </div>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Mint Address:</span>
                <p className="font-mono text-xs text-primary break-all">{result.mint}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Transaction:</span>
                <a
                  href={`https://explorer.solana.com/tx/${result.tx}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-primary hover:underline font-mono break-all"
                >
                  {result.tx.slice(0, 32)}...
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>
            </div>
            <button
              onClick={() => { setResult(null); setName(''); setDescription(''); setTags(''); }}
              className="mt-4 px-4 py-2 rounded-lg text-sm font-medium glass-panel text-muted-foreground hover:text-foreground transition-colors"
            >
              Mint Another Agent
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-medium mb-1.5">Agent Name *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sentinel Alpha"
                  className="w-full px-4 py-3 rounded-xl glass-panel text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-body"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-medium mb-1.5">Agent Type</label>
                <div className="flex flex-wrap gap-2">
                  {AGENT_TYPES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setAgentType(t.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        agentType === t.value
                          ? 'bg-primary/20 text-primary border border-primary/30'
                          : 'glass-panel text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-medium mb-1.5">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Describe your agent's capabilities..."
                  className="w-full px-4 py-3 rounded-xl glass-panel text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-body resize-none"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-medium mb-1.5">Tags (comma-separated)</label>
                <input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="e.g. defi, oracle, trading"
                  className="w-full px-4 py-3 rounded-xl glass-panel text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-body"
                />
              </div>
              {connected && publicKey && (
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-medium mb-1.5">Owner Wallet</label>
                  <p className="font-mono text-xs text-primary/70 px-4 py-3 rounded-xl glass-panel">{publicKey.toBase58()}</p>
                </div>
              )}
            </div>

            {error && (
              <p className="mt-3 text-xs text-red-400">{error}</p>
            )}

            <button
              onClick={handleMint}
              disabled={loading}
              className="mt-6 w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Minting...
                </>
              ) : !connected ? (
                <>
                  Connect Wallet
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  Mint Agent ID
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <p className="mt-3 text-[11px] text-muted-foreground text-center">
              Mint fee: 0.01 SOL · Network: Devnet
            </p>
          </>
        )}
      </div>
    </div>
  );
}
