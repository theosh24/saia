import { useState, useEffect } from 'react';
import saiaLogo from '@/assets/saia-logo.png';

export default function LoadingScreen({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setVisible(false);
            setTimeout(onComplete, 400);
          }, 300);
          return 100;
        }
        return p + Math.random() * 8 + 2;
      });
    }, 80);
    return () => clearInterval(interval);
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background transition-opacity duration-500"
      style={{ opacity: progress >= 100 ? 0 : 1 }}
    >
      <div className="flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <img src={saiaLogo} alt="SAIA" className="w-14 h-14 object-contain" />
          <span className="font-display text-2xl tracking-[0.2em] text-foreground">SAIA</span>
        </div>

        <p className="font-mono text-xs text-muted-foreground tracking-widest">
          INITIALIZING PROTOCOL
        </p>

        {/* Progress */}
        <div className="w-48 md:w-64">
          <div className="h-[2px] bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-150 ease-out"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <span className="block mt-2 font-mono text-xs text-muted-foreground text-center">
            {Math.min(Math.floor(progress), 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}
