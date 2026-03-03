import { useState } from 'react';

export default function CyberpunkHUD() {
  const [showControls, setShowControls] = useState(false);

  return (
    <div className="fixed inset-0 z-30 pointer-events-none">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 md:p-6">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse-neon" />
          <h2 className="font-display text-xs md:text-sm tracking-[0.25em] text-primary text-glow-cyan">
            CYBER<span className="text-secondary">FOLIO</span>
          </h2>
        </div>
        <div className="font-mono text-[10px] text-muted-foreground">
          <span className="text-primary">SYS</span> // ONLINE
        </div>
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
        <div className="flex items-end justify-between">
          {/* Nav hints */}
          <div className="font-mono text-[10px] text-muted-foreground space-y-1">
            <p><span className="text-primary">SCROLL</span> — Zoom</p>
            <p><span className="text-primary">DRAG</span> — Orbit</p>
            <p><span className="text-primary">HOVER</span> — Inspect</p>
          </div>

          {/* Controls toggle */}
          <button
            className="pointer-events-auto font-mono text-[10px] px-3 py-1.5 border border-primary/30 text-primary
                       bg-background/50 backdrop-blur-sm hover:bg-primary/10 hover:border-primary/60 transition-all"
            onClick={() => setShowControls(!showControls)}
          >
            [{showControls ? 'HIDE' : 'SHOW'}] ABOUT
          </button>
        </div>
      </div>

      {/* About panel */}
      {showControls && (
        <div className="absolute bottom-16 right-4 md:right-6 w-72 pointer-events-auto animate-cyber-slide-up">
          <div className="p-4 bg-background/90 backdrop-blur-md border border-primary/30 rounded border-glow-cyan">
            <h3 className="font-display text-xs tracking-[0.2em] text-primary mb-3 text-glow-cyan">
              // ABOUT
            </h3>
            <p className="font-body text-xs text-foreground/80 leading-relaxed mb-3">
              Welcome to the Cyberpunk Portfolio — an immersive 3D experience. 
              Navigate the neon-lit cityscape to discover projects. 
              Each glowing marker represents a creation waiting to be explored.
            </p>
            <div className="flex gap-2 flex-wrap">
              {['React', 'Three.js', 'TypeScript', 'R3F'].map((t) => (
                <span key={t} className="text-[9px] font-mono px-1.5 py-0.5 bg-muted text-primary border border-primary/20 rounded-sm">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Corner decorations */}
      <div className="absolute top-0 left-0 w-16 h-16 border-l-2 border-t-2 border-primary/20 m-2" />
      <div className="absolute top-0 right-0 w-16 h-16 border-r-2 border-t-2 border-primary/20 m-2" />
      <div className="absolute bottom-0 left-0 w-16 h-16 border-l-2 border-b-2 border-primary/20 m-2" />
      <div className="absolute bottom-0 right-0 w-16 h-16 border-r-2 border-b-2 border-primary/20 m-2" />

      {/* Scanline overlay */}
      <div className="absolute inset-0 cyber-scanline opacity-30 pointer-events-none" />
    </div>
  );
}
