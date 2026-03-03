import { useState } from 'react';
import { Fingerprint, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { createAgent } from '@/services/api';

// SAIA token gate — will be enforced at launch
const SAIA_REQUIRED = 100_000;
const SAIA_LAUNCH_SOON = true; // flip to false once token is live

const AGENT_TYPES = [
  { label: 'Assistant', value: 'Assistant' },
  { label: 'Oracle', value: 'Oracle' },
  { label: 'Trader', value: 'Trader' },
  { label: 'DeFi', value: 'DeFi' },
  { label: 'Analytics', value: 'Analytics' },
];

export default function IssueId() {
  const { publicKey, connected } = useWallet();
  const { setVisible } = useWalletModal();

  const [name, setName] = useState('');
  const [agentType, setAgentType] = useState('Assistant');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ id: string; slug: string; name: string } | null>(null);

  const handleCreate = async () => {
    if (!publicKey) {
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
      const agent = await createAgent({
        name: name.trim(),
        category: agentType,
        description: description.trim() || `${agentType} agent on SAIA578`,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        wallet: publicKey.toBase58(),
      });

      setResult({ id: agent.id, slug: agent.slug || agent.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name: agent.name });
    } catch (err: any) {
      setError(err.message || 'Failed to create agent');
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
            <p className="text-xs text-muted-foreground">Register an AI agent on SAIA578</p>
          </div>
        </div>

        {result ? (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-3 text-neon-green">
              <CheckCircle className="w-6 h-6" />
              <span className="font-display text-lg font-bold">Agent Created!</span>
            </div>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Agent Name:</span>
                <p className="font-mono text-xs text-primary">{result.name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Agent ID:</span>
                <p className="font-mono text-xs text-primary break-all">{result.id}</p>
              </div>
            </div>
            <Link
              to={`/agents/${result.slug}`}
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-primary/15 text-primary border border-primary/20 text-sm font-medium hover:bg-primary/25 transition-colors"
            >
              View Agent Profile
              <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              onClick={() => { setResult(null); setName(''); setDescription(''); setTags(''); }}
              className="block mt-2 px-4 py-2 rounded-lg text-sm font-medium glass-panel text-muted-foreground hover:text-foreground transition-colors"
            >
              Create Another Agent
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
              onClick={handleCreate}
              disabled={loading || SAIA_LAUNCH_SOON}
              className="mt-6 w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : SAIA_LAUNCH_SOON ? (
                <>
                  Requires {SAIA_REQUIRED.toLocaleString()} SAIA
                </>
              ) : !connected ? (
                <>
                  Connect Wallet
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  Create Agent
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <p className="mt-3 text-[11px] text-muted-foreground text-center">
              {SAIA_LAUNCH_SOON
                ? `Agent creation opens at SAIA token launch — hold ${SAIA_REQUIRED.toLocaleString()}+ SAIA to access`
                : 'Free · No transaction required · Registered on SAIA578'}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
