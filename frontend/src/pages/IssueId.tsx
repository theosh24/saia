import { Fingerprint, ArrowRight } from 'lucide-react';

export default function IssueId() {
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
            <p className="text-xs text-muted-foreground">Mint an SPL-578 compliant agent NFT on Solana</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-medium mb-1.5">Agent Name</label>
            <input
              placeholder="e.g. Sentinel Alpha"
              className="w-full px-4 py-3 rounded-xl glass-panel text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-body"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-medium mb-1.5">Agent Role</label>
            <input
              placeholder="e.g. Security Auditor"
              className="w-full px-4 py-3 rounded-xl glass-panel text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-body"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-medium mb-1.5">Description</label>
            <textarea
              rows={3}
              placeholder="Describe your agent's capabilities…"
              className="w-full px-4 py-3 rounded-xl glass-panel text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-body resize-none"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-medium mb-1.5">Owner Wallet</label>
            <input
              placeholder="Solana wallet address"
              className="w-full px-4 py-3 rounded-xl glass-panel text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-body"
            />
          </div>
        </div>

        <button className="mt-6 w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity">
          Mint Agent ID
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
