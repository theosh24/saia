import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Wallet, LogOut } from 'lucide-react';

export default function WalletButton() {
  const { publicKey, disconnect, connected } = useWallet();
  const { setVisible } = useWalletModal();

  if (connected && publicKey) {
    const address = publicKey.toBase58();
    const short = `${address.slice(0, 4)}…${address.slice(-4)}`;

    return (
      <div className="flex items-center gap-2">
        <button
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg glass-panel text-foreground border-primary/30 hover:border-primary/50 transition-all"
        >
          <Wallet className="w-4 h-4 text-primary" />
          {short}
        </button>
        <button
          onClick={() => disconnect()}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
          title="Disconnect"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setVisible(true)}
      className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90 transition-opacity"
    >
      <Wallet className="w-4 h-4" />
      Connect Wallet
    </button>
  );
}
